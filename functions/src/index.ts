import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as http from "http";

admin.initializeApp();
const db = admin.firestore();
const DAILY_BONUS_POINTS = [10, 15, 20, 25, 30, 40, 50];
// Shared tournament question bank — keyed by quizType, reused across tournaments.
const TOURNAMENT_QUESTION_BANK = "tournamentQuestionBank";

const COIN_LEADERBOARDS = {
    bongo: "leaderboard",
    bible: "bibleQuizLeaderboard",
    math: "mathQuizLeaderboard",
    biology: "bioQuizLeaderboard",
    general: "genQuizLeaderboard",
    sudoku: "sudokuLeaderboard",
    connectDots: "connectDotsLeaderboard",
} as const;

const COIN_SESSION_COLLECTIONS = [
    { collection: "gameSessions", scoreField: "total" },
    { collection: "bibleQuizSessions", scoreField: "score" },
    { collection: "mathQuizSessions", scoreField: "score" },
    { collection: "bioQuizSessions", scoreField: "score" },
    { collection: "genQuizSessions", scoreField: "score" },
    { collection: "sudokuSessions", scoreField: "score" },
    { collection: "connectDotsSessions", scoreField: "score" },
] as const;

function sessionCoinPoints(collectionName: string, data: FirebaseFirestore.DocumentData): number {
    if (typeof data.pointsEarned === "number") return Math.max(0, data.pointsEarned);
    if (collectionName === "sudokuSessions") {
        const points = data.difficulty === "Hard" ? 400 : data.difficulty === "Medium" ? 200 : 100;
        return Math.max(0, points);
    }
    if (collectionName === "connectDotsSessions") return Math.max(100 - Math.max(0, Number(data.hintsUsed || 0)) * 25, 0);
    const config = COIN_SESSION_COLLECTIONS.find(item => item.collection === collectionName);
    return Math.max(0, Number(data[config?.scoreField || "score"] || 0));
}

const scoreToBongoCoins = (score: number) => Math.max(Math.floor(Math.max(score, 0) / 250), 0);

async function reconcilePlayerCoins(phone: string, fallbackName = "Player") {
    const [leaderboards, sessions, existingBalance] = await Promise.all([
        Promise.all(Object.values(COIN_LEADERBOARDS).map(collectionName => db.collection(collectionName).doc(phone).get())),
        Promise.all(COIN_SESSION_COLLECTIONS.map(config => db.collection(config.collection).where("phone", "==", phone).get())),
        db.collection("playerCoinBalances").doc(phone).get(),
    ]);
    // Manually-granted coins (e.g. referral rewards) live outside session math
    // and must survive reconciliation.
    const bonusCoins = Math.max(0, Number(existingBalance.data()?.bonusCoins || 0));
    const scores: Record<string, number> = {};
    let name = fallbackName;
    Object.keys(COIN_LEADERBOARDS).forEach((key, index) => {
        const data = leaderboards[index].data();
        scores[key] = Number(data?.score || 0);
        if (data?.name) name = String(data.name);
    });
    const totalHighScorePoints = Object.values(scores).reduce((sum, score) => sum + score, 0);
    let lifetimeSessionPoints = 0;
    let sessionCount = 0;
    sessions.forEach((snapshot, index) => snapshot.docs.forEach(session => {
        lifetimeSessionPoints += sessionCoinPoints(COIN_SESSION_COLLECTIONS[index].collection, session.data());
        sessionCount += 1;
    }));
    const earnedCoins = scoreToBongoCoins(lifetimeSessionPoints);
    const orders = await db.collection("bongoMarketOrders").where("phone", "==", phone).get();
    const spentCoins = orders.docs.reduce((sum, order) => order.data().status === "Cancelled" ? sum : sum + Math.max(0, Number(order.data().total || 0)), 0);
    const balanceCoins = Math.max(earnedCoins + bonusCoins - spentCoins, 0);
    await db.collection("playerCoinBalances").doc(phone).set({ phone, name, scores, totalHighScorePoints, lifetimeSessionPoints, sessionCount, earnedCoins, bonusCoins, spentCoins, balanceCoins, conversionRate: 250, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { phone, earnedCoins, bonusCoins, spentCoins, balanceCoins, lifetimeSessionPoints, sessionCount };
}


const REFERRAL_MIN_SCORE = 700;
const REFERRAL_COIN_STEP = 700;
const REFERRAL_MAX_REFERRER_COINS = 10;
const REFERRAL_WELCOME_COINS = 1;

function referralCoinsForScore(score: number): number {
    if (!Number.isFinite(score) || score < REFERRAL_MIN_SCORE) return 0;
    return Math.min(Math.floor(score / REFERRAL_COIN_STEP), REFERRAL_MAX_REFERRER_COINS);
}

async function redeemEligibleReferralForSession(params: { newUserPhone: string; score: number; game: string; sessionId: string; name?: string }) {
    const { newUserPhone, score, game, sessionId, name = "Player" } = params;
    if (!/^07\d{8}$/.test(newUserPhone)) return { redeemed: false, reason: "invalid-phone" };

    const referrerCoins = referralCoinsForScore(score);
    if (referrerCoins <= 0) return { redeemed: false, reason: "below-threshold" };

    const playerRef = db.collection("players").doc(newUserPhone);
    const redemptionRef = db.collection("referrals").doc(newUserPhone);
    let referrerPhone = "";

    const result = await db.runTransaction(async (tx) => {
        const [playerSnap, existing] = await Promise.all([tx.get(playerRef), tx.get(redemptionRef)]);
        if (existing.exists) return { redeemed: false, reason: "already-redeemed" };

        const pendingReferrer = String(playerSnap.data()?.pendingReferrer || "");
        if (!/^07\d{8}$/.test(pendingReferrer)) return { redeemed: false, reason: "no-referrer" };
        if (pendingReferrer === newUserPhone) return { redeemed: false, reason: "self-referral" };
        referrerPhone = pendingReferrer;

        tx.set(redemptionRef, {
            newUserPhone,
            referrerPhone,
            game,
            sessionId,
            score,
            formula: "floor(score / 700), capped at 10 coins",
            threshold: REFERRAL_MIN_SCORE,
            referrerCoins,
            welcomeCoins: REFERRAL_WELCOME_COINS,
            rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(db.collection("playerCoinBalances").doc(referrerPhone), {
            phone: referrerPhone,
            bonusCoins: admin.firestore.FieldValue.increment(referrerCoins),
            referralEarnedCoins: admin.firestore.FieldValue.increment(referrerCoins),
        }, { merge: true });
        tx.set(db.collection("playerCoinBalances").doc(newUserPhone), {
            phone: newUserPhone,
            name,
            bonusCoins: admin.firestore.FieldValue.increment(REFERRAL_WELCOME_COINS),
            referralWelcomeCoins: admin.firestore.FieldValue.increment(REFERRAL_WELCOME_COINS),
        }, { merge: true });
        tx.set(db.collection("players").doc(referrerPhone), {
            referralCount: admin.firestore.FieldValue.increment(1),
            referralEarnedCoins: admin.firestore.FieldValue.increment(referrerCoins),
        }, { merge: true });
        tx.update(playerRef, {
            pendingReferrer: admin.firestore.FieldValue.delete(),
            referredBy: referrerPhone,
            referralRedeemedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { redeemed: true, referrerPhone, referrerCoins, welcomeCoins: REFERRAL_WELCOME_COINS };
    });

    if (result.redeemed && referrerPhone) {
        await Promise.all([
            reconcilePlayerCoins(referrerPhone),
            reconcilePlayerCoins(newUserPhone, name),
        ]);
    }
    return result;
}

export const reconcileAllPlayerCoins = functions.https.onCall(async (data: { phone?: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Admin sign-in required");
    if (typeof data?.phone === "string" && /^0\d{9}$/.test(data.phone)) {
        await reconcilePlayerCoins(data.phone);
        return { success: true, reconciled: 1 };
    }
    const phones = new Set<string>();
    for (const collectionName of Object.values(COIN_LEADERBOARDS)) {
        const snapshot = await db.collection(collectionName).get();
        snapshot.docs.forEach(entry => { const phone = String(entry.data().phone || entry.id); if (/^0\d{9}$/.test(phone)) phones.add(phone); });
    }
    for (const config of COIN_SESSION_COLLECTIONS) {
        const snapshot = await db.collection(config.collection).get();
        snapshot.docs.forEach(entry => { const phone = String(entry.data().phone || ""); if (/^0\d{9}$/.test(phone)) phones.add(phone); });
    }
    const results = [];
    for (const phone of phones) results.push(await reconcilePlayerCoins(phone));
    return { success: true, reconciled: results.length };
});

export const onBongoMarketOrderChanged = functions.firestore
    .document("bongoMarketOrders/{orderId}")
    .onWrite(async (change) => {
        const beforePhone = String(change.before.data()?.phone || "");
        const afterPhone = String(change.after.data()?.phone || "");
        const phones = new Set([beforePhone, afterPhone]);
        for (const phone of phones) {
            if (/^0\d{9}$/.test(phone)) await reconcilePlayerCoins(phone);
        }
    });

function postScoreToSql(msisdn: string, score: number): Promise<void> {
    const payload = JSON.stringify({ msisdn, score });
    return Promise.race([
        new Promise<void>((resolve) => {
            const options = {
                hostname: "142.93.47.187", port: 2027,
                path: "/api/savewebscore", method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve());
            req.write(payload); req.end();
        }),
        new Promise<void>(resolve => setTimeout(resolve, 5000)),
    ]);
}

function nairobiDateKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
    return get("year") + "-" + get("month") + "-" + get("day");
}

function previousDateKey(dateKey: string): string {
    const [year, month, day] = dateKey.split("-").map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day));
    utc.setUTCDate(utc.getUTCDate() - 1);
    return utc.toISOString().slice(0, 10);
}

// Secret shared with the payment backend — set this in Firebase config:
// firebase functions:config:set callback.secret="YOUR_SECRET_HERE"
const CALLBACK_SECRET = (functions.config().callback?.secret ?? "") as string;

function isValidCallback(req: functions.https.Request): boolean {
    if (!CALLBACK_SECRET) return true; // not configured yet — allow (remove this once secret is set)
    return req.headers["x-callback-secret"] === CALLBACK_SECRET;
}

function sortByCreatedAtDesc(
    a: FirebaseFirestore.QueryDocumentSnapshot,
    b: FirebaseFirestore.QueryDocumentSnapshot
): number {
    const aTime = a.data().createdAt?.toMillis?.() ?? 0;
    const bTime = b.data().createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
}

function pickLatestPendingPayment(
    snap: FirebaseFirestore.QuerySnapshot,
    amount?: number
): FirebaseFirestore.DocumentReference | null {
    const docs = snap.docs
        .filter(docSnap => typeof amount !== "number" || docSnap.data().amount === amount)
        .sort(sortByCreatedAtDesc);

    return docs[0]?.ref ?? null;
}

async function updateQuestProgress(phone: string, type: "daily_games" | "total_games" | "new_user") {
    try {
        const todayKey = nairobiDateKey();
        const questsSnap = await db.collection("quests")
            .where("active", "==", true)
            .where("targetType", "==", type)
            .get();

        if (questsSnap.empty) return;

        for (const questDoc of questsSnap.docs) {
            const quest = questDoc.data();
            const questId = questDoc.id;
            const targetCount = Number(quest.targetCount || 0);

            // Doc ID depends on if it's daily or total
            const progressId = type === "daily_games"
                ? `${phone}_${questId}_${todayKey}`
                : `${phone}_${questId}`;

            const progressRef = db.collection("playerQuests").doc(progressId);

            await db.runTransaction(async tx => {
                const progressSnap = await tx.get(progressRef);
                const progressData = progressSnap.exists ? progressSnap.data() || {} : {};

                if (progressData.completed) return; // Already done

                const currentProgress = Number(progressData.progress || 0) + 1;
                const completed = currentProgress >= targetCount;

                const updateData: any = {
                    phone,
                    questId,
                    progress: currentProgress,
                    completed,
                    readyToClaim: completed,
                    claimed: false,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    title: quest.title,
                    rewardPoints: quest.rewardPoints,
                    targetType: type,
                };
                if (type === "daily_games") updateData.dateKey = todayKey;

                tx.set(progressRef, updateData, { merge: true });
            });
        }
    } catch (err) {
        console.error("Quest progress update failed", err);
    }
}

export const claimQuestReward = functions.https.onCall(async (data: { phone: string, questId: string, dateKey?: string }) => {
    const { phone, questId, dateKey } = data;
    if (!phone || !questId) throw new functions.https.HttpsError("invalid-argument", "Missing phone or questId");

    const progressId = dateKey ? `${phone}_${questId}_${dateKey}` : `${phone}_${questId}`;
    const progressRef = db.collection("playerQuests").doc(progressId);
    const playerRef = db.collection("players").doc(phone);
    const lbRef = db.collection("leaderboard").doc(phone);

    return await db.runTransaction(async tx => {
        const progressSnap = await tx.get(progressRef);
        if (!progressSnap.exists) throw new functions.https.HttpsError("not-found", "Quest progress not found");

        const progress = progressSnap.data() || {};
        if (!progress.completed || !progress.readyToClaim) throw new functions.https.HttpsError("failed-precondition", "Quest not completed yet");
        if (progress.claimed) throw new functions.https.HttpsError("already-exists", "Reward already claimed");

        const rewardPoints = Number(progress.rewardPoints || 0);

        tx.update(progressRef, {
            readyToClaim: false,
            claimed: true,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        tx.set(playerRef, {
            totalPoints: admin.firestore.FieldValue.increment(rewardPoints),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        tx.set(lbRef, {
            score: admin.firestore.FieldValue.increment(rewardPoints),
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Add announcement for the user
        const announcementRef = db.collection("announcements").doc();
        tx.set(announcementRef, {
            title: "Reward Collected!",
            message: `You successfully claimed ${rewardPoints} points for: ${progress.title}`,
            category: "rewards",
            icon: "coins",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            active: true,
            targetPhone: phone,
        });

        return { success: true, rewardPoints };
    });
});

type GameTimerName =
    | "bongo"
    | "bible"
    | "math"
    | "biology"
    | "generalKnowledge"
    | "sudoku"
    | "connectDots";

type GameTimerPhase =
    | "session"
    | "round1"
    | "round2"
    | "round3"
    | "question"
    | "payment";

interface StartGameTimerData {
    game: GameTimerName;
    phase: GameTimerPhase;
    durationSeconds?: number;
    phone?: string;
    metadata?: Record<string, unknown>;
}

interface GameTimerLookupData {
    timerId: string;
}

const DEFAULT_TIMER_SECONDS: Record<GameTimerName, Partial<Record<GameTimerPhase, number>>> = {
    bongo: { round1: 60, round2: 60, round3: 60, payment: 90 },
    bible: { session: 60, question: 30, payment: 90 },
    math: { session: 60, question: 30, payment: 90 },
    biology: { session: 60, question: 30, payment: 90 },
    generalKnowledge: { session: 60, question: 30, payment: 90 },
    sudoku: { payment: 90 },
    connectDots: { payment: 90 },
};

const MAX_TIMER_SECONDS = 60 * 60;

function getTimerDurationSeconds(data: StartGameTimerData): number {
    const configured = DEFAULT_TIMER_SECONDS[data.game]?.[data.phase] ?? 60;
    const duration = typeof data.durationSeconds === "number" ? data.durationSeconds : configured;

    if (!Number.isInteger(duration) || duration <= 0 || duration > MAX_TIMER_SECONDS) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid timer duration");
    }

    return duration;
}

function getTimerState(startedAtMs: number, durationSeconds: number, nowMs = Date.now()) {
    const endsAtMs = startedAtMs + durationSeconds * 1000;
    const remainingMs = Math.max(0, endsAtMs - nowMs);

    return {
        serverNowMs: nowMs,
        startedAtMs,
        endsAtMs,
        durationSeconds,
        remainingMs,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        expired: remainingMs <= 0,
    };
}

export const startGameTimer = functions.https.onCall(async (data: StartGameTimerData) => {
    const validGames: GameTimerName[] = ["bongo", "bible", "math", "biology", "generalKnowledge", "sudoku", "connectDots"];
    const validPhases: GameTimerPhase[] = ["session", "round1", "round2", "round3", "question", "payment"];

    if (!validGames.includes(data.game)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid game");
    }
    if (!validPhases.includes(data.phase)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid timer phase");
    }
    if (typeof data.phone === "string" && data.phone && !/^(07\d{8}|254\d{9})$/.test(data.phone)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
    }

    const durationSeconds = getTimerDurationSeconds(data);
    const startedAtMs = Date.now();
    const state = getTimerState(startedAtMs, durationSeconds, startedAtMs);
    const timerRef = await db.collection("gameTimers").add({
        game: data.game,
        phase: data.phase,
        phone: typeof data.phone === "string" ? data.phone : "",
        durationSeconds,
        startedAtMs,
        endsAtMs: state.endsAtMs,
        expired: false,
        stopped: false,
        metadata: data.metadata && typeof data.metadata === "object" ? data.metadata : {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { timerId: timerRef.id, ...state };
});

export const getGameTimer = functions.https.onCall(async (data: GameTimerLookupData) => {
    if (typeof data.timerId !== "string" || !data.timerId.trim()) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid timerId");
    }

    const timerRef = db.collection("gameTimers").doc(data.timerId);
    const timerSnap = await timerRef.get();
    if (!timerSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Timer not found");
    }

    const timer = timerSnap.data() ?? {};
    const startedAtMs = Number(timer.startedAtMs);
    const durationSeconds = Number(timer.durationSeconds);
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(durationSeconds)) {
        throw new functions.https.HttpsError("failed-precondition", "Timer data is invalid");
    }

    const state = getTimerState(startedAtMs, durationSeconds);
    if (state.expired && timer.expired !== true) {
        await timerRef.set({
            expired: true,
            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    return {
        timerId: timerSnap.id,
        game: timer.game,
        phase: timer.phase,
        stopped: timer.stopped === true,
        ...state,
    };
});

export const stopGameTimer = functions.https.onCall(async (data: GameTimerLookupData) => {
    if (typeof data.timerId !== "string" || !data.timerId.trim()) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid timerId");
    }

    const timerRef = db.collection("gameTimers").doc(data.timerId);
    const timerSnap = await timerRef.get();
    if (!timerSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Timer not found");
    }

    const timer = timerSnap.data() ?? {};
    const startedAtMs = Number(timer.startedAtMs);
    const durationSeconds = Number(timer.durationSeconds);
    const state = getTimerState(startedAtMs, durationSeconds);

    await timerRef.set({
        stopped: true,
        stoppedAt: admin.firestore.FieldValue.serverTimestamp(),
        expired: state.expired,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { timerId: timerSnap.id, ...state, stopped: true };
});


type TournamentGame = "bongo" | "bible" | "math" | "biology" | "general" | "sudoku" | "connectDots" | "generalKnowledge" | "sports" | "carLogos" | "brandLogos" | "trickQuestions" | "kenyaTrivia";

type TournamentScoreInput = {
    phone: string;
    name: string;
    game: TournamentGame;
    score: number;
    correct?: number;
    totalQuestions?: number;
    maxStreak?: number;
};

function tournamentWeekKey(date = new Date()): string {
    const local = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const day = local.getDay() || 7;
    local.setDate(local.getDate() + 4 - day);
    const yearStart = new Date(local.getFullYear(), 0, 1);
    const week = Math.ceil((((local.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return local.getFullYear() + "-W" + String(week).padStart(2, "0");
}

function tournamentWeekStartMs(date = new Date()): number {
    const local = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const day = local.getDay() || 7;
    local.setHours(0, 0, 0, 0);
    local.setDate(local.getDate() - day + 1);
    return local.getTime();
}

function tournamentPointBreakdown(input: TournamentScoreInput) {
    const quizPoints = Math.max(0, Math.round(input.score || 0));
    const perfectBonus = input.totalQuestions && input.correct === input.totalQuestions
        ? Math.round(quizPoints * 0.1) + 100
        : 0;
    const streakBonus = Math.min(Math.max(0, Math.round(input.maxStreak || 0)) * 25, 500);
    const participationBonus = quizPoints > 0 ? 50 : 0;
    return {
        quizPoints,
        perfectBonus,
        streakBonus,
        participationBonus,
        points: quizPoints + perfectBonus + streakBonus + participationBonus,
    };
}

async function addTopScorersTournamentPoints(input: TournamentScoreInput) {
    if (!/^0\d{9}$/.test(input.phone)) return;
    const settingsSnap = await db.collection("tournamentSettings").doc("topScorers").get();
    const settings = settingsSnap.data() || {};
    if (settings.active === false || settings.status === "completed") return;

    const weekKey = String(settings.weekKey || tournamentWeekKey());
    const breakdown = tournamentPointBreakdown(input);
    if (breakdown.points <= 0) return;

    const entryRef = db.collection("topScorersTournament").doc(input.phone);
    const weekEntryRef = db.collection("topScorersTournamentWeeks").doc(weekKey).collection("entries").doc(input.phone);
    const eventRef = db.collection("topScorersTournamentEvents").doc();
    const payload = {
        phone: input.phone,
        name: input.name,
        weekKey,
        points: admin.firestore.FieldValue.increment(breakdown.points),
        quizPoints: admin.firestore.FieldValue.increment(breakdown.quizPoints),
        perfectBonus: admin.firestore.FieldValue.increment(breakdown.perfectBonus),
        streakBonus: admin.firestore.FieldValue.increment(breakdown.streakBonus),
        participationBonus: admin.firestore.FieldValue.increment(breakdown.participationBonus),
        sessions: admin.firestore.FieldValue.increment(1),
        games: { [input.game]: admin.firestore.FieldValue.increment(1) },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await Promise.all([
        entryRef.set(payload, { merge: true }),
        weekEntryRef.set(payload, { merge: true }),
        eventRef.set({ ...input, ...breakdown, weekKey, createdAt: admin.firestore.FieldValue.serverTimestamp() }),
    ]);
}

async function rebuildCurrentTopScorersTournament() {
    const settingsSnap = await db.collection("tournamentSettings").doc("topScorers").get();
    const weekKey = String(settingsSnap.data()?.weekKey || tournamentWeekKey());
    const weekStartMs = tournamentWeekStartMs();
    const collections: Array<{ collection: string; game: TournamentGame; scoreField: string }> = [
        { collection: "gameSessions", game: "bongo", scoreField: "total" },
        { collection: "bibleQuizSessions", game: "bible", scoreField: "score" },
        { collection: "mathQuizSessions", game: "math", scoreField: "score" },
        { collection: "bioQuizSessions", game: "biology", scoreField: "score" },
        { collection: "genQuizSessions", game: "general", scoreField: "score" },
        { collection: "sudokuSessions", game: "sudoku", scoreField: "score" },
        { collection: "connectDotsSessions", game: "connectDots", scoreField: "score" },
    ];
    const totals = new Map<string, any>();
    for (const config of collections) {
        const snap = await db.collection(config.collection).get();
        snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            const phone = String(data.phone || "");
            if (!/^0\d{9}$/.test(phone)) return;
            const playedAtMs = data.playedAt?.toMillis?.() ?? data.createdAt?.toMillis?.() ?? 0;
            if (playedAtMs && playedAtMs < weekStartMs) return;
            const breakdown = tournamentPointBreakdown({
                phone,
                name: String(data.name || "Player"),
                game: config.game,
                score: Number(data[config.scoreField] || 0),
                correct: Number(data.correct || 0),
                totalQuestions: Number(data.total || 0),
                maxStreak: Number(data.maxStreak || 0),
            });
            const current = totals.get(phone) || { phone, name: String(data.name || "Player"), weekKey, points: 0, quizPoints: 0, perfectBonus: 0, streakBonus: 0, participationBonus: 0, sessions: 0, games: {} };
            current.name = data.name || current.name;
            current.points += breakdown.points;
            current.quizPoints += breakdown.quizPoints;
            current.perfectBonus += breakdown.perfectBonus;
            current.streakBonus += breakdown.streakBonus;
            current.participationBonus += breakdown.participationBonus;
            current.sessions += 1;
            current.games[config.game] = (current.games[config.game] || 0) + 1;
            totals.set(phone, current);
        });
    }
    const batch = db.batch();
    totals.forEach((entry, phone) => {
        batch.set(db.collection("topScorersTournament").doc(phone), { ...entry, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        batch.set(db.collection("topScorersTournamentWeeks").doc(weekKey).collection("entries").doc(phone), { ...entry, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    return { weekKey, rebuilt: totals.size };
}

export const rebuildTopScorersTournament = functions.https.onCall(async (_data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Admin sign-in required");
    return rebuildCurrentTopScorersTournament();
});

export const saveTopScorersTournamentSettings = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Admin sign-in required");
    const title = typeof data?.title === "string" && data.title.trim() ? data.title.trim().slice(0, 80) : "Weekly Top Scorers Cup";
    const subtitle = typeof data?.subtitle === "string" ? data.subtitle.trim().slice(0, 240) : "";
    const status = ["active", "scheduled", "completed"].includes(String(data?.status)) ? String(data.status) : "active";
    const entryFeeCoins = 0;
    const rewards = Array.isArray(data?.rewards) ? data.rewards.slice(0, 6).map((reward: any) => ({
        rank: String(reward?.rank || "Reward").slice(0, 40),
        title: String(reward?.title || "Reward Pack").slice(0, 60),
        items: Array.isArray(reward?.items) ? reward.items.map((item: any) => String(item).trim().slice(0, 80)).filter(Boolean).slice(0, 6) : [],
    })) : [];
    const payload: any = {
        title,
        subtitle,
        status,
        active: data?.active !== false,
        entryFeeCoins,
        rewards,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
    };
    if (typeof data?.endsAt === "string" && data.endsAt) {
        const end = new Date(data.endsAt);
        if (!Number.isNaN(end.getTime())) payload.endsAt = admin.firestore.Timestamp.fromDate(end);
    }
    await db.collection("tournamentSettings").doc("topScorers").set(payload, { merge: true });
    return { success: true };
});


type PublicTournamentGame = "generalKnowledge" | "sports" | "carLogos" | "brandLogos" | "trickQuestions" | "kenyaTrivia";

function normalizePublicTournamentGame(value: unknown): PublicTournamentGame {
    const normalized = String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
    if (normalized === "general" || normalized === "generalknowledge" || normalized === "bongo") return "generalKnowledge";
    if (normalized === "sport" || normalized === "sports") return "sports";
    if (normalized === "car" || normalized === "cars" || normalized === "carlogos") return "carLogos";
    if (normalized === "brand" || normalized === "brands" || normalized === "brandlogos") return "brandLogos";
    if (normalized === "trick" || normalized === "trickquestions") return "trickQuestions";
    if (normalized === "kenya" || normalized === "kenyatrivia") return "kenyaTrivia";
    return "generalKnowledge";
}

function isPublicTournamentGame(value: unknown): value is PublicTournamentGame {
    return value === "generalKnowledge" || value === "sports" || value === "carLogos" || value === "brandLogos" || value === "trickQuestions" || value === "kenyaTrivia";
}

function shuffleDocs<T>(items: T[]) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}

function sanitizeTournamentRewards(data: any) {
    return Array.isArray(data?.rewards) ? data.rewards.slice(0, 8).map((reward: any) => ({
        rank: String(reward?.rank || "Reward").trim().slice(0, 40),
        title: String(reward?.title || "Reward Pack").trim().slice(0, 60),
        items: Array.isArray(reward?.items) ? reward.items.map((item: any) => String(item).trim().slice(0, 90)).filter(Boolean).slice(0, 8) : [],
    })) : [];
}

function timestampFromInput(value: any): admin.firestore.Timestamp | null {
    if (value == null || value === "") return null;
    if (typeof value !== "string") throw new functions.https.HttpsError("invalid-argument", "Invalid tournament date");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new functions.https.HttpsError("invalid-argument", "Invalid tournament date");
    return admin.firestore.Timestamp.fromDate(date);
}

function tournamentIsOpen(data: FirebaseFirestore.DocumentData, now = Date.now()) {
    if (data.active === false || data.status !== "active") return false;
    const startsAt = data.startsAt?.toMillis?.() ?? 0;
    const endsAt = data.endsAt?.toMillis?.() ?? 0;
    if (startsAt && startsAt > now) return false;
    if (endsAt && endsAt < now) return false;
    return true;
}

async function addQuizTournamentPoints(input: TournamentScoreInput) {
    if (!isPublicTournamentGame(input.game) || !/^0\d{9}$/.test(input.phone)) return;
    const breakdown = tournamentPointBreakdown(input);
    if (breakdown.points <= 0) return;
    const snap = await db.collection("quizTournaments")
        .where("quizType", "==", input.game)
        .where("active", "==", true)
        .where("status", "==", "active")
        .get();
    const now = Date.now();
    const writes: Array<Promise<unknown>> = [];
    snap.docs.forEach(tournamentSnap => {
        const tournament = tournamentSnap.data();
        if (!tournamentIsOpen(tournament, now)) return;
        const entryRef = tournamentSnap.ref.collection("entries").doc(input.phone);
        const eventRef = tournamentSnap.ref.collection("events").doc();
        const entryPayload = {
            phone: input.phone,
            name: input.name,
            points: admin.firestore.FieldValue.increment(breakdown.points),
            quizPoints: admin.firestore.FieldValue.increment(breakdown.quizPoints),
            perfectBonus: admin.firestore.FieldValue.increment(breakdown.perfectBonus),
            streakBonus: admin.firestore.FieldValue.increment(breakdown.streakBonus),
            participationBonus: admin.firestore.FieldValue.increment(breakdown.participationBonus),
            sessions: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        writes.push(entryRef.set(entryPayload, { merge: true }));
        writes.push(eventRef.set({ ...input, ...breakdown, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
        writes.push(tournamentSnap.ref.set({ lastEntryAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }));
    });
    await Promise.all(writes);
}

export const saveQuizTournament = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Admin sign-in required");
    const quizType = normalizePublicTournamentGame(data?.quizType);
    const title = typeof data?.title === "string" && data.title.trim() ? data.title.trim().slice(0, 90) : "Weekly Tournament Cup";
    const subtitle = typeof data?.subtitle === "string" ? data.subtitle.trim().slice(0, 260) : "";
    const status = ["active", "scheduled", "completed"].includes(String(data?.status)) ? String(data.status) : "scheduled";
    const rewards = sanitizeTournamentRewards(data);
    const payload: any = {
        title,
        subtitle,
        quizType,
        status,
        active: data?.active !== false,
        entryFeeCoins: 0,
        durationSeconds: 80,
        dailyStartTime: typeof data?.dailyStartTime === "string" && /^\d{2}:\d{2}$/.test(data.dailyStartTime) ? data.dailyStartTime : "08:00",
        tournamentCycle: data?.tournamentCycle === "weekly" ? "weekly" : "daily",
        rewards: rewards.length ? rewards : [{ rank: "Top Players", title: "Reward Pack", items: ["Bonus Coins"] }],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
    };
    const startsAt = timestampFromInput(data?.startsAt);
    const endsAt = timestampFromInput(data?.endsAt);
    if (startsAt) payload.startsAt = startsAt;
    if (endsAt) payload.endsAt = endsAt;
    const rawId = typeof data?.id === "string" ? data.id.trim() : "";
    const ref = rawId ? db.collection("quizTournaments").doc(rawId) : db.collection("quizTournaments").doc();
    const exists = await ref.get();
    await ref.set({ ...payload, createdAt: exists.exists ? (exists.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp()) : admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { success: true, id: ref.id };
});

const fallbackTournamentQuestionCollections: Partial<Record<PublicTournamentGame, string[]>> = {
    generalKnowledge: ["generalKnowledgeQuestions", "genQuizQuestions"],
};

function fallbackTournamentQuestion(collectionName: string, id: string, data: FirebaseFirestore.DocumentData, quizType: PublicTournamentGame) {
    const question = String(data.question || data.q || "").trim();
    const options = Array.isArray(data.options) ? data.options.map((option: unknown) => String(option).trim()).filter(Boolean) : [];
    const answer = Number(data.answer ?? data.correctAnswer ?? data.correct ?? 0);
    if (!question || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
    return {
        id: collectionName + ":" + id,
        question,
        options,
        answer,
        active: data.active !== false,
        quizType,
    };
}

async function loadFallbackTournamentQuestions(quizType: PublicTournamentGame) {
    const collectionNames = fallbackTournamentQuestionCollections[quizType] || [];
    for (const collectionName of collectionNames) {
        const snap = await db.collection(collectionName).limit(100).get();
        const rows = snap.docs
            .map(questionSnap => fallbackTournamentQuestion(collectionName, questionSnap.id, questionSnap.data(), quizType))
            .filter((question): question is NonNullable<ReturnType<typeof fallbackTournamentQuestion>> => Boolean(question && question.active !== false));
        if (rows.length) return rows;
    }
    return [];
}

export const submitQuizTournamentAnswers = functions.https.onCall(async (data) => {
    const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId : "";
    const phone = typeof data?.phone === "string" ? data.phone : "";
    const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim().slice(0, 20) : "Player";
    const answers = data?.answers && typeof data.answers === "object" ? data.answers as Record<string, unknown> : {};
    if (!tournamentId) throw new functions.https.HttpsError("invalid-argument", "Tournament id required");
    if (!/^07\d{8}$/.test(phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");

    const tournamentRef = db.collection("quizTournaments").doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "Tournament not found");
    const tournament = tournamentSnap.data() || {};
    const tournamentQuizType = normalizePublicTournamentGame(tournament.quizType);
    if (!tournamentIsOpen(tournament)) throw new functions.https.HttpsError("failed-precondition", "Tournament is not open");
    if (!isPublicTournamentGame(tournamentQuizType)) throw new functions.https.HttpsError("invalid-argument", "Unsupported tournament game");

    const entryRef = tournamentRef.collection("entries").doc(phone);
    const existingEntry = await entryRef.get();
    if (existingEntry.exists) throw new functions.https.HttpsError("already-exists", "You have already played this tournament");

    const requestedIds = Array.isArray(data?.questionIds) ? data.questionIds.map((id: unknown) => String(id)).filter(Boolean).slice(0, 15) : [];
    const isBankQuestion = (q: any) => q && q.active !== false && Array.isArray(q.options) && normalizePublicTournamentGame(q.quizType) === tournamentQuizType;

    let questions: any[] = [];

    // Preferred path: score the exact bank questions the player was shown,
    // fetched directly by id (robust regardless of bank size).
    const bankIds = (requestedIds as string[]).filter((id: string) => !id.includes(":"));
    if (bankIds.length) {
        const docs = await db.getAll(...bankIds.map((id: string) => db.collection(TOURNAMENT_QUESTION_BANK).doc(id)));
        questions = docs
            .filter(d => d.exists)
            .map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter(isBankQuestion);
    }

    // Fallback path: legacy/prefixed ids or unresolved — pull from the bank (or
    // a game's question bank) and honor requested ids where possible.
    if (!questions.length) {
        const bankSnap = await db.collection(TOURNAMENT_QUESTION_BANK).where("quizType", "==", tournamentQuizType).limit(300).get();
        const bankQuestions = bankSnap.docs
            .map(questionSnap => ({ id: questionSnap.id, ...questionSnap.data() }))
            .filter((question: any) => question.active !== false && Array.isArray(question.options));
        const allQuestions = bankQuestions.length ? bankQuestions : await loadFallbackTournamentQuestions(tournamentQuizType);
        if (requestedIds.length) {
            const byId = new Map(allQuestions.map((q: any) => [q.id, q]));
            questions = requestedIds.map((id: string) => byId.get(id)).filter(Boolean) as any[];
        }
        if (!questions.length) questions = shuffleDocs(allQuestions).slice(0, 15);
    }

    if (questions.length < 1 || questions.length > 15) throw new functions.https.HttpsError("failed-precondition", "Tournament must have 1 to 15 questions");

    let correct = 0;
    const normalizedAnswers: Record<string, number | null> = {};
    questions.forEach((question: any) => {
        const answer = Number(answers[question.id]);
        const normalized = Number.isInteger(answer) ? answer : null;
        normalizedAnswers[question.id] = normalized;
        if (normalized === Number(question.answer)) correct += 1;
    });

    const totalQuestions = questions.length;
    const answered = Object.values(normalizedAnswers).filter(v => v !== null).length;
    const wrong = answered - correct;
    const score = (correct * 10) - (wrong * 2);
    const breakdown = { quizPoints: score, perfectBonus: 0, streakBonus: 0, participationBonus: 0, points: score };
    const eventRef = tournamentRef.collection("events").doc();
    await Promise.all([
        entryRef.set({
            phone,
            name,
            points: admin.firestore.FieldValue.increment(breakdown.points),
            quizPoints: admin.firestore.FieldValue.increment(breakdown.quizPoints),
            perfectBonus: admin.firestore.FieldValue.increment(breakdown.perfectBonus),
            streakBonus: admin.firestore.FieldValue.increment(breakdown.streakBonus),
            participationBonus: admin.firestore.FieldValue.increment(breakdown.participationBonus),
            sessions: admin.firestore.FieldValue.increment(1),
            correct: admin.firestore.FieldValue.increment(correct),
            wrong: admin.firestore.FieldValue.increment(wrong),
            totalQuestions: admin.firestore.FieldValue.increment(totalQuestions),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }),
        eventRef.set({ phone, name, game: tournamentQuizType, questionIds: questions.map((question: any) => question.id), answers: normalizedAnswers, correct, wrong, totalQuestions, score, ...breakdown, createdAt: admin.firestore.FieldValue.serverTimestamp() }),
        tournamentRef.set({ lastEntryAt: admin.firestore.FieldValue.serverTimestamp(), durationSeconds: 80, quizType: tournamentQuizType }, { merge: true }),
    ]);
    await updateQuestProgress(phone, "daily_games").catch(() => undefined);
    await updateQuestProgress(phone, "total_games").catch(() => undefined);
    return { success: true, score: breakdown.points, correct, wrong, total: totalQuestions };
});

export const rebuildQuizTournament = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Admin sign-in required");
    const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId : "";
    if (!tournamentId) throw new functions.https.HttpsError("invalid-argument", "Tournament id required");
    const tournamentRef = db.collection("quizTournaments").doc(tournamentId);
    const existing = await tournamentRef.collection("entries").limit(500).get();
    let batch = db.batch();
    let opCount = 0;
    for (const entry of existing.docs) {
        batch.delete(entry.ref);
        opCount += 1;
        if (opCount >= 450) { await batch.commit(); batch = db.batch(); opCount = 0; }
    }
    const events = await tournamentRef.collection("events").get();
    const totals = new Map<string, any>();
    events.docs.forEach(eventSnap => {
        const row = eventSnap.data();
        const phone = String(row.phone || "");
        if (!/^07\d{8}$/.test(phone)) return;
        const current = totals.get(phone) || { phone, name: String(row.name || "Player"), points: 0, quizPoints: 0, perfectBonus: 0, streakBonus: 0, participationBonus: 0, sessions: 0, correct: 0, totalQuestions: 0 };
        current.name = row.name || current.name;
        current.points += Number(row.points || 0);
        current.quizPoints += Number(row.quizPoints || 0);
        current.perfectBonus += Number(row.perfectBonus || 0);
        current.streakBonus += Number(row.streakBonus || 0);
        current.participationBonus += Number(row.participationBonus || 0);
        current.correct += Number(row.correct || 0);
        current.totalQuestions += Number(row.totalQuestions || 0);
        current.sessions += 1;
        totals.set(phone, current);
    });
    totals.forEach((entry, phone) => {
        batch.set(tournamentRef.collection("entries").doc(phone), { ...entry, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        opCount += 1;
        if (opCount >= 450) { /* entry counts are expected to be small; final commit handles this batch */ }
    });
    if (opCount > 0) await batch.commit();
    await tournamentRef.set({ lastRebuiltAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { success: true, rebuilt: totals.size };
});


interface SaveSessionData {
    name: string;
    phone: string;
    power: string;
    r1Score: number;
    r2Score: number;
    r3Bonus: number;
    correct?: number;
    totalQuestions?: number;
    maxStreak?: number;
}

interface ClaimDailyBonusData {
    name: string;
    phone: string;
}

export const getDailyBonusStatus = functions.https.onCall(async (data: { phone?: string }) => {
    const phone = typeof data?.phone === "string" ? data.phone : "";
    if (!/^07\d{8}$/.test(phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");

    const todayKey = nairobiDateKey();
    const [claimSnap, stateSnap] = await Promise.all([
        db.collection("dailyBonusClaims").doc(phone + "_" + todayKey).get(),
        db.collection("dailyBonusState").doc(phone).get(),
    ]);
    const state = stateSnap.data() ?? {};
    const claim = claimSnap.data() ?? {};
    return {
        claimed: claimSnap.exists,
        todayKey,
        streak: Number(claim.streak ?? state.streak ?? 1) || 1,
    };
});

export const claimDailyBonus = functions.https.onCall(async (data: ClaimDailyBonusData) => {
    if (typeof data.name !== "string" || data.name.trim().length === 0) throw new functions.https.HttpsError("invalid-argument", "Invalid name");
    if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");

    const name = data.name.trim().slice(0, 20);
    const phone = data.phone;
    const todayKey = nairobiDateKey();
    const yesterdayKey = previousDateKey(todayKey);
    const claimRef = db.collection("dailyBonusClaims").doc(phone + "_" + todayKey);
    const stateRef = db.collection("dailyBonusState").doc(phone);
    const playerRef = db.collection("players").doc(phone);
    const lbRef = db.collection("leaderboard").doc(phone);

    const result = await db.runTransaction(async tx => {
        const claimSnap = await tx.get(claimRef);
        const stateSnap = await tx.get(stateRef);
        const state = stateSnap.exists ? stateSnap.data() ?? {} : {};
        const currentTotal = Number(state.totalBonusPoints ?? 0);
        const currentStreak = Number(state.streak ?? 0);

        if (claimSnap.exists) {
            const claim = claimSnap.data() ?? {};
            const streak = Number(claim.streak ?? currentStreak ?? 1) || 1;
            const storedBonus = Number(claim.bonus ?? 0);
            const expectedBonus = DAILY_BONUS_POINTS[Math.min(streak - 1, DAILY_BONUS_POINTS.length - 1)];
            const bonusDelta = Math.max(expectedBonus - storedBonus, 0);

            if (bonusDelta > 0) {
                tx.set(claimRef, {
                    bonus: expectedBonus,
                    adjustedFromBonus: storedBonus,
                    adjustedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                tx.set(stateRef, {
                    name,
                    phone,
                    lastBonus: expectedBonus,
                    totalBonusPoints: admin.firestore.FieldValue.increment(bonusDelta),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                tx.set(playerRef, {
                    name,
                    phone,
                    totalPoints: admin.firestore.FieldValue.increment(bonusDelta),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                tx.set(lbRef, {
                    name,
                    phone,
                    score: admin.firestore.FieldValue.increment(bonusDelta),
                    dailyBonusPoints: admin.firestore.FieldValue.increment(bonusDelta),
                    playedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                return { claimed: true, bonus: bonusDelta, displayBonus: expectedBonus, streak, totalBonusPoints: currentTotal + bonusDelta, todayKey, topUp: true };
            }

            return {
                claimed: false,
                bonus: storedBonus,
                displayBonus: expectedBonus,
                streak,
                totalBonusPoints: currentTotal,
                todayKey,
                topUp: false,
            };
        }

        const streak = state.lastClaimDate === yesterdayKey ? Math.min(currentStreak + 1, 30) : 1;
        const bonus = DAILY_BONUS_POINTS[Math.min(streak - 1, DAILY_BONUS_POINTS.length - 1)];
        const nextTotal = currentTotal + bonus;

        tx.create(claimRef, {
            name,
            phone,
            bonus,
            streak,
            dateKey: todayKey,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(stateRef, {
            name,
            phone,
            streak,
            lastClaimDate: todayKey,
            lastBonus: bonus,
            totalBonusPoints: admin.firestore.FieldValue.increment(bonus),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(playerRef, {
            name,
            phone,
            totalPoints: admin.firestore.FieldValue.increment(bonus),
            dailyBonusStreak: streak,
            lastDailyBonusDate: todayKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(lbRef, {
            name,
            phone,
            score: admin.firestore.FieldValue.increment(bonus),
            dailyBonusPoints: admin.firestore.FieldValue.increment(bonus),
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return { claimed: true, bonus, displayBonus: bonus, streak, totalBonusPoints: nextTotal, todayKey, topUp: false };
    });

    if (result.claimed && result.bonus > 0) {
        const msisdn = phone.replace(/^0/, "254");
        await postScoreToSql(msisdn, result.bonus);
    }

    return result;
});

/**
 * saveGameSession — callable Cloud Function.
 * Validates inputs server-side before writing to Firestore,
 * so clients cannot write arbitrary scores directly.
 */
/**
 * consumeGrantedSession — callable. Deletes a granted session after it's been used.
 * Prevents clients from deleting other users' sessions.
 */
export const consumeGrantedSession = functions.https.onCall(
    async (data: { phone: string }) => {
        const { phone } = data;
        if (typeof phone !== "string" || !/^07\d{8}$/.test(phone))
            throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        await db.collection("grantedSessions").doc(phone).delete();
        return { success: true };
    }
);

export const saveGameSession = functions.https.onCall(
    async (data: SaveSessionData) => {
        // data is already the first argument

        // Basic validation
        if (typeof data.name   !== "string" || data.name.trim().length === 0)  throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone  !== "string" || !/^07\d{8}$/.test(data.phone))  throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.r1Score !== "number" || data.r1Score < 0)              throw new functions.https.HttpsError("invalid-argument", "Invalid r1Score");
        if (typeof data.r2Score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid r2Score");
        if (typeof data.r3Bonus !== "number" || data.r3Bonus < 0)              throw new functions.https.HttpsError("invalid-argument", "Invalid r3Bonus");

        // Sanity caps — adjust to your actual max possible scores
        const MAX_R1 = 15000, MAX_R2 = 25000, MAX_R3 = 50000;
        if (data.r1Score > MAX_R1 || data.r2Score > MAX_R2 || data.r3Bonus > MAX_R3) {
            throw new functions.https.HttpsError("invalid-argument", "Score out of range");
        }

        const total = data.r1Score + data.r2Score + data.r3Bonus;
        const name  = data.name.trim().slice(0, 20);


        // POST to SQL leaderboard server-side (non-fatal, 5s timeout)
        const msisdn = data.phone.replace(/^0/, "254");
        const sqlPayload = JSON.stringify({ msisdn, score: total });
        await Promise.race([
            new Promise<void>((resolve) => {
                const options = {
                    hostname: "142.93.47.187", port: 2027,
                    path: "/api/savewebscore", method: "POST",
                    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(sqlPayload) },
                };
                const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
                req.on("error", () => resolve());
                req.write(sqlPayload); req.end();
            }),
            new Promise<void>(resolve => setTimeout(resolve, 5000)),
        ]);

        const sessionRef = await db.collection("gameSessions").add({
            name,
            phone:   data.phone,
            power:   typeof data.power === "string" ? data.power.slice(0, 50) : "",
            r1Score: data.r1Score,
            r2Score: data.r2Score,
            r3Bonus: data.r3Bonus,
            total,
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Upsert leaderboard — keep highest score per phone
        const lbRef = db.collection("leaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < total) {
            await lbRef.set({
                name,
                phone: data.phone,
                score: total,
                playedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        await reconcilePlayerCoins(data.phone, name);
        await redeemEligibleReferralForSession({ newUserPhone: data.phone, score: total, game: "bongo", sessionId: sessionRef.id, name });
        await addTopScorersTournamentPoints({ phone: data.phone, name, game: "bongo", score: total, correct: data.correct, totalQuestions: data.totalQuestions, maxStreak: data.maxStreak });

        // Update quest progress
        await updateQuestProgress(data.phone, "daily_games");
        await updateQuestProgress(data.phone, "total_games");

        return { sessionId: sessionRef.id, total };
    }
);

/**
 * getLeaderboard — HTTP proxy so the HTTPS frontend can fetch the HTTP SQL leaderboard.
 */
export const getLeaderboard = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    try {
        const data = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/lifetime-leaderboard", method: "GET" };
            const request = http.request(options, (response) => {
                let body = "";
                response.on("data", chunk => { body += chunk; });
                response.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve([]); } });
            });
            request.on("error", reject);
            request.end();
        });
        res.status(200).json(data);
    } catch {
        res.status(200).json([]);
    }
});

interface StkPushData {
    name:    string;
    phone:   string;
    amount:  number;
    billref: string;
}

/**
 * deposit — HTTP endpoint to initiate M-Pesa STK push AND receive callback.
 */
export const deposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        // Check if this is a callback (has trans_id) or initiation request
        if (body.trans_id) {
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const { name, phone, amount, trans_id, trans_time, business_shortcode, checkoutRequestId } = body;

            // Try to find by checkoutRequestId first (no index needed), then fall back to phone+status query
            let docRef: FirebaseFirestore.DocumentReference | null = null;

            if (checkoutRequestId) {
                const byCheckout = await db.collection("payments")
                    .where("checkoutRequestId", "==", checkoutRequestId).limit(1).get();
                if (!byCheckout.empty) docRef = byCheckout.docs[0].ref;
            }

            if (!docRef) {
                const byPhone = await db.collection("payments")
                    .where("phone", "==", phone)
                    .where("status", "==", "pending")
                    .get();
                docRef = pickLatestPendingPayment(byPhone, amount);
            }

            if (docRef) {
                await docRef.update({
                    status: "paid", trans_id, trans_time, business_shortcode,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                await db.collection("payments").add({
                    name, phone, amount, status: "paid",
                    trans_id, trans_time, business_shortcode,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            res.status(200).json({ success: true, message: "Payment recorded" });
            return;
        }

        // Otherwise, this is an initiation request
        const { name, phone, amount, trigger } = body;

        if (typeof name   !== "string" || name.trim().length === 0)    { res.status(400).json({ error: "Invalid name" });    return; }
        if (typeof phone  !== "string" || !/^254\d{9}$/.test(phone))   { res.status(400).json({ error: "Invalid phone" });   return; }
        if (typeof amount !== "number" || amount <= 0)                  { res.status(400).json({ error: "Invalid amount" });  return; }
        if (typeof trigger !== "string" || trigger.trim().length === 0) { res.status(400).json({ error: "Invalid trigger" }); return; }

        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = {
                hostname: "142.93.47.187",
                port: 2610,
                path: "/ngomma/bongo/stkrequest",
                method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            };
            const request = http.request(options, (response) => {
                let body = "";
                response.on("data", (chunk) => { body += chunk; });
                response.on("end", () => {
                    try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
                });
            });
            request.on("error", reject);
            request.write(payload);
            request.end();
        });

        // Save pending payment to Firestore
        const docRef = await db.collection("payments").add({
            name: name.trim(), phone, amount, trigger,
            game: typeof body.game === "string" ? body.game : "BONGOQUIZ",
            status: "pending",
            checkoutRequestId: result?.CheckoutRequestID ?? result?.checkoutRequestId ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("Deposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface StkCallbackData {
    Body: {
        stkCallback: {
            MerchantRequestID: string;
            CheckoutRequestID: string;
            ResultCode: number;
            ResultDesc: string;
            CallbackMetadata?: {
                Item: Array<{
                    Name: string;
                    Value: string | number;
                }>;
            };
        };
    };
}

/**
 * stkCallback — HTTP endpoint for M-Pesa STK push callback.
 * Receives payment confirmation from Safaricom and stores in Firestore.
 */
export const stkCallback = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }

    try {
        const data: StkCallbackData = req.body;
        const callback = data.Body?.stkCallback;

        if (!callback) {
            res.status(400).send("Invalid callback data");
            return;
        }

        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

        let amount = 0;
        let receipt = "";
        let phone = "";
        let transactionDate = "";

        if (ResultCode === 0 && CallbackMetadata?.Item) {
            for (const item of CallbackMetadata.Item) {
                if (item.Name === "Amount")             amount          = Number(item.Value);
                if (item.Name === "MpesaReceiptNumber") receipt         = String(item.Value);
                if (item.Name === "PhoneNumber")        phone           = String(item.Value);
                if (item.Name === "TransactionDate")    transactionDate = String(item.Value);
            }
        }

        const status = ResultCode === 0 ? "paid" : "failed";
        const updatePayload: Record<string, any> = {
            status,
            receipt,
            trans_id: receipt,   // DeductionModal listens for trans_id
            resultCode: ResultCode,
            resultDesc: ResultDesc,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 1. Try by checkoutRequestId
        let matched = await db.collection("payments")
            .where("checkoutRequestId", "==", CheckoutRequestID)
            .limit(1).get();

        // 2. Fall back to phone + pending (handles null checkoutRequestId)
        if (matched.empty && phone) {
            matched = await db.collection("payments")
                .where("phone", "==", phone)
                .where("status", "==", "pending")
                .get();
        }

        if (!matched.empty) {
            const docRef = pickLatestPendingPayment(matched, amount) ?? matched.docs.sort(sortByCreatedAtDesc)[0].ref;
            await docRef.update(updatePayload);
        } else {
            await db.collection("payments").add({
                checkoutRequestId: CheckoutRequestID,
                merchantRequestId: MerchantRequestID,
                phone, amount, receipt, transactionDate,
                trans_id: receipt,
                ...updatePayload,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
        console.error("STK callback error:", error);
        res.status(500).send("Internal error");
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// BIBLE QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * bibleQuizDeposit — initiate STK push + receive payment callback for BibleQuiz.
 * Same pattern as `deposit` but writes to bibleQuizPayments collection.
 */
export const bibleQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        // Callback from payment provider
        if (body.trans_id) {
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            const existing = await db.collection("bibleQuizPayments")
                .where("phone", "==", phone)
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .limit(1).get();

            if (!existing.empty) {
                await existing.docs[0].ref.update({
                    status: "paid", trans_id, trans_time, business_shortcode,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                await db.collection("bibleQuizPayments").add({
                    name, phone, amount, trans_id, trans_time, business_shortcode,
                    status: "paid",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            res.status(200).json({ success: true });
            return;
        }

        // Initiation request
        const { name, phone, amount } = body;
        if (typeof name   !== "string" || !name.trim())              { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone  !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)               { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "BBQ";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });

        const result = await new Promise<any>((resolve, reject) => {
            const options = {
                hostname: "142.93.47.187",
                port: 2610,
                path: "/ngomma/bongo/stkrequest",
                method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            };
            const request = http.request(options, (response) => {
                let data = "";
                response.on("data", chunk => { data += chunk; });
                response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
            });
            request.on("error", reject);
            request.write(payload);
            request.end();
        });

        const docRef = await db.collection("bibleQuizPayments").add({
            name: name.trim(), phone, amount, trigger,
            status: "pending",
            checkoutRequestId: result?.CheckoutRequestID ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("bibleQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

/**
 * saveBibleQuizSession — callable. Validates and saves a completed BibleQuiz game.
 */
interface BibleQuizSessionData {
    name:   string;
    phone:  string;
    score:  number;
    correct: number;
    wrong:  number;
    passed: number;
    total:  number;
}

export const saveBibleQuizSession = functions.https.onCall(
    async (data: BibleQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");

        // POST to shared SQL leaderboard
        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = {
                hostname: "142.93.47.187", port: 2027,
                path: "/api/savewebscore", method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve()); // non-fatal
            req.write(payload); req.end();
        });

        const sessionRef = await db.collection("bibleQuizSessions").add({
            name, phone: data.phone,
            score: data.score, correct: data.correct,
            wrong: data.wrong, passed: data.passed, total: data.total,
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Upsert Firebase leaderboard — keep highest score per phone
        const lbRef  = db.collection("bibleQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        await reconcilePlayerCoins(data.phone, name);
        await redeemEligibleReferralForSession({ newUserPhone: data.phone, score: data.score, game: "bible", sessionId: sessionRef.id, name });
        await addTopScorersTournamentPoints({ phone: data.phone, name, game: "bible", score: data.score, correct: data.correct, totalQuestions: data.total });

        // Update quest progress
        await updateQuestProgress(data.phone, "daily_games");
        await updateQuestProgress(data.phone, "total_games");

        return { success: true };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// MATH QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const mathQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        if (body.trans_id) {
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const existing = await db.collection("mathQuizPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("mathQuizPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }

        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())              { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)){ res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)             { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "MQ";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });

        const docRef = await db.collection("mathQuizPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("mathQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface MathQuizSessionData { name: string; phone: string; score: number; correct: number; wrong: number; passed: number; total: number; }

export const saveMathQuizSession = functions.https.onCall(
    async (data: MathQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");

        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve());
            req.write(payload); req.end();
        });

        const sessionRef = await db.collection("mathQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });

        const lbRef  = db.collection("mathQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        await reconcilePlayerCoins(data.phone, name);
        await redeemEligibleReferralForSession({ newUserPhone: data.phone, score: data.score, game: "math", sessionId: sessionRef.id, name });
        await addTopScorersTournamentPoints({ phone: data.phone, name, game: "math", score: data.score, correct: data.correct, totalQuestions: data.total });

        // Update quest progress
        await updateQuestProgress(data.phone, "daily_games");
        await updateQuestProgress(data.phone, "total_games");

        return { success: true };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// BIOLOGY QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const bioQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;
        if (body.trans_id) {
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const existing = await db.collection("bioQuizPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("bioQuizPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }
        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())               { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)              { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "BQ";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });
        const docRef = await db.collection("bioQuizPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("bioQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface BioQuizSessionData { name: string; phone: string; score: number; correct: number; wrong: number; passed: number; total: number; }

export const saveBioQuizSession = functions.https.onCall(
    async (data: BioQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");
        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve()); req.write(payload); req.end();
        });
        const sessionRef = await db.collection("bioQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        const lbRef = db.collection("bioQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        await reconcilePlayerCoins(data.phone, name);
        await redeemEligibleReferralForSession({ newUserPhone: data.phone, score: data.score, game: "biology", sessionId: sessionRef.id, name });
        await addTopScorersTournamentPoints({ phone: data.phone, name, game: "biology", score: data.score, correct: data.correct, totalQuestions: data.total });

        // Update quest progress
        await updateQuestProgress(data.phone, "daily_games");
        await updateQuestProgress(data.phone, "total_games");

        return { success: true };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL KNOWLEDGE QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const genQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        if (body.trans_id) {
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const existing = await db.collection("genQuizPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("genQuizPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }

        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())               { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)              { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "R1R2";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });

        const docRef = await db.collection("genQuizPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("genQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface GenQuizSessionData { name: string; phone: string; score: number; correct: number; wrong: number; passed: number; total: number; }

export const saveGenQuizSession = functions.https.onCall(
    async (data: GenQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");
        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve()); req.write(payload); req.end();
        });

        const sessionRef = await db.collection("genQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });

        const lbRef = db.collection("genQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        await reconcilePlayerCoins(data.phone, name);
        await redeemEligibleReferralForSession({ newUserPhone: data.phone, score: data.score, game: "general", sessionId: sessionRef.id, name });
        await addTopScorersTournamentPoints({ phone: data.phone, name, game: "general", score: data.score, correct: data.correct, totalQuestions: data.total });

        // Update quest progress
        await updateQuestProgress(data.phone, "daily_games");
        await updateQuestProgress(data.phone, "total_games");

        return { success: true };
    }
);

/**
 * calculateScore — callable Cloud Function.
 * Applies power modifiers server-side so the logic is never exposed in the frontend.
 */
export const calculateScore = functions.https.onCall(async (data: {
    round: 1 | 2;
    rawScore: number;
    correct: number;
    total: number;
    powerName: string;
}) => {
    const { round, correct, total, powerName } = data;
    let s = typeof data.rawScore === "number" ? data.rawScore : 0;

    if (round === 1) {
        switch (powerName) {
            case "Double Points":      s *= 2; break;
            case "Point Gamble":       s = Math.random() > 0.5 ? s * 2 : Math.floor(s / 2); break;
            case "Point Chance Brain": s = Math.random() > 0.5 ? s * 2 : s; break;
            case "Insurance":          if (correct > 0) s = Math.max(s, 500); break;
            case "Mirror Effect":      s = Math.floor(s * 1.5); break;
            case "Steal A Point":      s += 200; break;
            case "Swap Fate":          s = Math.floor(s * 1.25); break;
        }
    } else if (round === 2) {
        switch (powerName) {
            case "Point Gamble":       s = Math.random() > 0.5 ? s * 2 : Math.floor(s / 2); break;
            case "Point Chance Brain": s = Math.random() > 0.5 ? s * 2 : s; break;
            case "Insurance":          if (correct > 0) s = Math.max(s, 1000); break;
            case "Mirror Effect":      s = Math.floor(s * 1.5); break;
            case "Steal A Point":      s += 500; break;
            case "Swap Fate":          s = Math.floor(s * 1.25); break;
        }
    }

    return { score: Math.round(s) };
});

// ─────────────────────────────────────────────────────────────────────────────
// SUDOKU BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const sudokuDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        if (body.trans_id) {
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            const existing = await db.collection("sudokuPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("sudokuPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }

        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())               { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)              { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "R1R2";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });

        const docRef = await db.collection("sudokuPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("sudokuDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface SudokuScoreData { name: string; phone: string; score: number; difficulty: string; stage: number; hintsUsed: number; }

export const saveSudokuScore = functions.https.onCall(
    async (data: SudokuScoreData) => {
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^0\d{9}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number" || data.score < 0)                throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");
        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve()); req.write(payload); req.end();
        });

        const pointsEarned = data.difficulty === "Hard" ? 400 : data.difficulty === "Medium" ? 200 : 100;
        const sessionRef = await db.collection("sudokuSessions").add({
            name, phone: data.phone, score: data.score, pointsEarned,
            difficulty: data.difficulty, stage: data.stage, hintsUsed: data.hintsUsed,
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const lbRef = db.collection("sudokuLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        await reconcilePlayerCoins(data.phone, name);
        await redeemEligibleReferralForSession({ newUserPhone: data.phone, score: data.score, game: "sudoku", sessionId: sessionRef.id, name });
        await addTopScorersTournamentPoints({ phone: data.phone, name, game: "sudoku", score: data.score });

        // Update quest progress
        await updateQuestProgress(data.phone, "daily_games");
        await updateQuestProgress(data.phone, "total_games");

        return { success: true };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// CONNECT DOTS BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const connectDotsDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        if (body.trans_id) {
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            const existing = await db.collection("connectDotsPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("connectDotsPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }

        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())               { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)              { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "R1R2";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });

        const docRef = await db.collection("connectDotsPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("connectDotsDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface ConnectDotsScoreData { name: string; phone: string; score: number; level: number; stage: number; hintsUsed: number; mistakes: number; }

export const saveConnectDotsScore = functions.https.onCall(
    async (data: ConnectDotsScoreData) => {
        if (typeof data.name  !== "string" || !data.name.trim())            throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^0\d{9}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number" || data.score < 0)               throw new functions.https.HttpsError("invalid-argument", "Invalid score");
        if (typeof data.level !== "number" || data.level < 1)               throw new functions.https.HttpsError("invalid-argument", "Invalid level");
        if (typeof data.stage !== "number" || data.stage < 1)               throw new functions.https.HttpsError("invalid-argument", "Invalid stage");

        const name = data.name.trim().slice(0, 20);
        const score = Math.round(data.score);
        const msisdn = data.phone.replace(/^0/, "254");
        const payload = JSON.stringify({ msisdn, score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve());
            req.write(payload); req.end();
        });

        const hintsUsed = Math.max(0, Math.round(data.hintsUsed || 0));
        const pointsEarned = Math.max(100 - hintsUsed * 25, 0);
        const sessionRef = await db.collection("connectDotsSessions").add({
            name, phone: data.phone, score, pointsEarned,
            level: Math.round(data.level), stage: Math.round(data.stage),
            hintsUsed,
            mistakes: Math.max(0, Math.round(data.mistakes || 0)),
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const lbRef = db.collection("connectDotsLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < score) {
            await lbRef.set({ name, phone: data.phone, score, level: Math.round(data.level), stage: Math.round(data.stage), playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        await reconcilePlayerCoins(data.phone, name);
        await redeemEligibleReferralForSession({ newUserPhone: data.phone, score, game: "connectDots", sessionId: sessionRef.id, name });
        await addTopScorersTournamentPoints({ phone: data.phone, name, game: "connectDots", score });

        // Update quest progress
        await updateQuestProgress(data.phone, "daily_games");
        await updateQuestProgress(data.phone, "total_games");

        return { success: true };
    }
);

export const onPlayerCreated = functions.firestore
    .document("players/{phone}")
    .onCreate(async (snap, context) => {
        const { phone } = context.params;
        await updateQuestProgress(phone, "new_user");
    });

/**
 * redeemReferral — callable fallback for clients that still hold a local referrer.
 * The normal path is server-side via saved non-tournament sessions.
 */
export const redeemReferral = functions.https.onCall(
    async (data: { newUserPhone?: string; referrerPhone?: string; score?: number; game?: string; sessionId?: string; name?: string }) => {
        const newUserPhone = String(data?.newUserPhone || "");
        const referrerPhone = String(data?.referrerPhone || "");
        const score = Number(data?.score || 0);
        if (!/^07\d{8}$/.test(newUserPhone)) throw new functions.https.HttpsError("invalid-argument", "Invalid new user phone");
        if (!/^07\d{8}$/.test(referrerPhone)) throw new functions.https.HttpsError("invalid-argument", "Invalid referrer phone");
        if (newUserPhone === referrerPhone) throw new functions.https.HttpsError("invalid-argument", "Cannot refer yourself");
        await db.collection("players").doc(newUserPhone).set({ pendingReferrer: referrerPhone }, { merge: true });
        return redeemEligibleReferralForSession({
            newUserPhone,
            score,
            game: String(data?.game || "bongo"),
            sessionId: String(data?.sessionId || "client-fallback"),
            name: String(data?.name || "Player"),
        });
    }
);

function _shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function _isValid(b: (number|null)[][], r: number, c: number, n: number): boolean {
    for (let i = 0; i < 9; i++) if (b[r][i] === n || b[i][c] === n) return false;
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (b[br+i][bc+j] === n) return false;
    return true;
}

function _fill(b: (number|null)[][]): boolean {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (b[r][c] === null) {
            for (const n of _shuffle([1,2,3,4,5,6,7,8,9])) {
                if (_isValid(b, r, c, n)) { b[r][c] = n; if (_fill(b)) return true; b[r][c] = null; }
            }
            return false;
        }
    }
    return true;
}

export const generateSudokuPuzzle = functions.https.onCall(
    async (data: { difficulty: string }) => {
        const clues: Record<string, number> = { Easy: 36, Medium: 30, Hard: 24 };
        const solution: (number|null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
        _fill(solution);
        const puzzle = solution.map(row => [...row]) as (number|null)[][];
        const cells = _shuffle(Array.from({ length: 81 }, (_, i) => i));
        let removed = 0, target = 81 - (clues[data.difficulty] ?? 30);
        for (const idx of cells) {
            if (removed >= target) break;
            puzzle[Math.floor(idx/9)][idx%9] = null;
            removed++;
        }
        return { puzzle, solution };
    }
);
