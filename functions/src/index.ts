import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as http from "http";

admin.initializeApp();
const db = admin.firestore();

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

type GameTimerName =
    | "bongo"
    | "bible"
    | "math"
    | "biology"
    | "generalKnowledge"
    | "sudoku";

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
    const validGames: GameTimerName[] = ["bongo", "bible", "math", "biology", "generalKnowledge", "sudoku"];
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

interface SaveSessionData {
    name: string;
    phone: string;
    power: string;
    r1Score: number;
    r2Score: number;
    r3Bonus: number;
}

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

        await db.collection("bibleQuizSessions").add({
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

        await db.collection("mathQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });

        const lbRef  = db.collection("mathQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
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
        await db.collection("bioQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        const lbRef = db.collection("bioQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
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

        await db.collection("genQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });

        const lbRef = db.collection("genQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
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
//
// // ─────────────────────────────────────────────────────────────────────────────
// // SUDOKU BACKEND
// // ─────────────────────────────────────────────────────────────────────────────
//
// export const sudokuDeposit = functions.https.onRequest(async (req, res) => {
//     res.set("Access-Control-Allow-Origin", "*");
//     res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
//     res.set("Access-Control-Allow-Headers", "Content-Type");
//     if (req.method === "OPTIONS") { res.status(204).send(""); return; }
//     if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }
//
//     try {
//         const body = req.body;
//
//         if (body.trans_id) {
//             if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
//             const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
//             const existing = await db.collection("sudokuPayments")
//                 .where("phone", "==", phone).where("status", "==", "pending")
//                 .orderBy("createdAt", "desc").limit(1).get();
//             if (!existing.empty) {
//                 await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
//             } else {
//                 await db.collection("sudokuPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
//             }
//             res.status(200).json({ success: true }); return;
//         }
//
//         const { name, phone, amount } = body;
//         if (typeof name !== "string" || !name.trim())               { res.status(400).json({ error: "Invalid name" });   return; }
//         if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
//         if (typeof amount !== "number" || amount <= 0)              { res.status(400).json({ error: "Invalid amount" }); return; }
//
//         const trigger = "R1R2";
//         const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
//         const result = await new Promise<any>((resolve, reject) => {
//             const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
//             const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
//             request.on("error", reject); request.write(payload); request.end();
//         });
//
//         const docRef = await db.collection("sudokuPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
//         res.status(200).json({ success: true, paymentId: docRef.id, result });
//     } catch (error) {
//         console.error("sudokuDeposit error:", error);
//         res.status(500).json({ error: "Internal error" });
//     }
// });
//
// interface SudokuScoreData { name: string; phone: string; score: number; difficulty: string; stage: number; hintsUsed: number; }
//
// export const saveSudokuScore = functions.https.onCall(
//     async (data: SudokuScoreData) => {
//         if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
//         if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
//         if (typeof data.score !== "number" || data.score < 0)                throw new functions.https.HttpsError("invalid-argument", "Invalid score");
//
//         const name   = data.name.trim().slice(0, 20);
//         const msisdn = data.phone.replace(/^0/, "254");
//
//         const payload = JSON.stringify({ msisdn, score: data.score });
//         await new Promise<void>((resolve) => {
//             const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
//             const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
//             req.on("error", () => resolve()); req.write(payload); req.end();
//         });
//
//         await db.collection("sudokuSessions").add({
//             name, phone: data.phone, score: data.score,
//             difficulty: data.difficulty, stage: data.stage, hintsUsed: data.hintsUsed,
//             playedAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//
//         const lbRef = db.collection("sudokuLeaderboard").doc(data.phone);
//         const lbSnap = await lbRef.get();
//         if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
//             await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
//         }
//         return { success: true };
//     }
// );
//
// // Sudoku puzzle generator helpers (server-side)
// function _shuffle<T>(arr: T[]): T[] {
//     for (let i = arr.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [arr[i], arr[j]] = [arr[j], arr[i]];
//     }
//     return arr;
// }
//
// function _isValid(board: (number | null)[][], r: number, c: number, num: number): boolean {
//     for (let i = 0; i < 9; i++) {
//         if (board[r][i] === num || board[i][c] === num) return false;
//     }
//     const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
//     for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
//         if (board[br + i][bc + j] === num) return false;
//     }
//     return true;
// }
//
// function _fill(board: (number | null)[][]): boolean {
//     for (let r = 0; r < 9; r++) {
//         for (let c = 0; c < 9; c++) {
//             if (board[r][c] === null) {
//                 for (const num of _shuffle([1,2,3,4,5,6,7,8,9])) {
//                     if (_isValid(board, r, c, num)) {
//                         board[r][c] = num;
//                         if (_fill(board)) return true;
//                         board[r][c] = null;
//                     }
//                 }
//                 return false;
//             }
//         }
//     }
//     return true;
// }
//
// function _generatePuzzle(clues: number): { puzzle: (number|null)[][], solution: number[][] } {
//     const solution: (number|null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
//     _fill(solution);
//     const puzzle = solution.map(row => [...row]) as (number|null)[][];
//     const cells = _shuffle(Array.from({ length: 81 }, (_, i) => i));
//     let removed = 0;
//     for (const idx of cells) {
//         if (removed >= 81 - clues) break;
//         puzzle[Math.floor(idx / 9)][idx % 9] = null;
//         removed++;
//     }
//     return { puzzle, solution: solution as number[][] };
// }
//
// export const generateSudokuPuzzle = functions.https.onCall(
//     async (data: { difficulty: string }) => {
//         const cluesMap: Record<string, number> = { Easy: 36, Medium: 30, Hard: 24 };
//         const clues = cluesMap[data.difficulty] ?? 30;
//         return _generatePuzzle(clues);
//     }
// );

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

        await db.collection("sudokuSessions").add({
            name, phone: data.phone, score: data.score,
            difficulty: data.difficulty, stage: data.stage, hintsUsed: data.hintsUsed,
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const lbRef = db.collection("sudokuLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        return { success: true };
    }
);

// ── Sudoku puzzle generator (server-side) ────────────────────────────────────
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
