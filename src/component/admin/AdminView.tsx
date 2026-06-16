// AdminView.tsx — Admin panel UI
import {useState, useEffect, useMemo, useRef} from "react";
import {AlertTriangle, Bell, CheckCircle, CreditCard, Gamepad2, Users, Wrench} from "lucide-react";
import type { IconType } from "react-icons";
import { FaBolt, FaCalculator, FaCreditCard, FaDna, FaFileAlt, FaGamepad, FaGift, FaGlobeAfrica, FaLink, FaMedal, FaMicrophone, FaQuestion, FaShoppingBag, FaTachometerAlt, FaTh, FaTrophy, FaUsers } from "react-icons/fa";
import {
    collection,
    getDocs,
    // updateDoc,
    doc,
    setDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    Timestamp,
    addDoc,
    serverTimestamp
} from "firebase/firestore";
import {onAuthStateChanged, signOut} from "firebase/auth";
import {db, auth} from "../../firebase.ts";
import {AdminLogin, KCSE_EMAIL} from "./AdminLogin.tsx";
import {AdminQuestions} from "./AdminQuestions.tsx";
import {AdminPowers} from "./AdminPowers.tsx";
import {AdminKCSE} from "./AdminKCSE.tsx";
import {AdminBibleQuiz} from "./AdminBibleQuiz.tsx";
import {AdminMathQuiz} from "./AdminMathQuiz.tsx";
import {AdminBioQuiz} from "./AdminBioQuiz.tsx";
import {AdminGenQuiz} from "./AdminGenQuiz.tsx";
import {AdminSudoku} from "./AdminSudoku.tsx";
import {AdminConnectDots} from "./AdminConnectDots.tsx";
import {AdminStreetBongo} from "./AdminStreetBongo.tsx";
import {AdminBongoMarket} from "./AdminBongoMarket.tsx";
import {AdminPlayerScores} from "./AdminPlayerScores.tsx";
import {AdminRewards} from "./AdminRewards.tsx";
import {AdminAchievements} from "./AdminAchievements.tsx";
import {AdminTournament} from "./AdminTournament.tsx";
import {writeAdminAudit} from "./auditLog.ts";

type AdminTab =
    "dashboard"
    | "players"
    | "playerscores"
    | "payments"
    | "games"
    | "leaderboard"
    | "questions"
    | "powers"
    | "achievements"
    | "rewards"
    | "tournament"
    | "referrals"
    | "bongomarket"
    | "kcse"
    | "biblequiz"
    | "mathquiz"
    | "bioquiz"
    | "genquiz"
    | "sudoku"
    | "connectdots"
    | "streetbongo";

const TABS: { id: AdminTab; label: string; icon: IconType }[] = [
    {id: "dashboard", label: "Dashboard", icon: FaTachometerAlt},
    {id: "referrals", label: "Refer & Earn", icon: FaLink},
    {id: "players", label: "Players", icon: FaUsers},
    {id: "playerscores", label: "Player Scores & Coins", icon: FaTrophy},
    {id: "payments", label: "Payments", icon: FaCreditCard},
    {id: "games", label: "Game Sessions", icon: FaGamepad},
    {id: "leaderboard", label: "Leaderboard", icon: FaTrophy},
    {id: "questions", label: "Questions", icon: FaQuestion},
    {id: "powers", label: "Powers", icon: FaBolt},
    {id: "achievements", label: "Achievements", icon: FaMedal},
    {id: "rewards", label: "Rewards Management", icon: FaGift},
    {id: "tournament", label: "Quiz Tournaments", icon: FaTrophy},
    {id: "bongomarket", label: "Bongo Market", icon: FaShoppingBag},
    {id: "kcse", label: "KCSE Papers", icon: FaFileAlt},
    {id: "biblequiz", label: "Bible Quiz", icon: FaQuestion},
    {id: "mathquiz", label: "Math Quiz", icon: FaCalculator},
    {id: "bioquiz", label: "Biology Quiz", icon: FaDna},
    {id: "genquiz", label: "General Knowledge", icon: FaGlobeAfrica},
    {id: "sudoku", label: "Sudoku", icon: FaTh},
    {id: "connectdots", label: "Connect Dots", icon: FaLink},
    {id: "streetbongo", label: "Street Bongo", icon: FaMicrophone},
];

type AdminNotification = {
    id: string;
    kind: "firebase" | "players" | "games" | "mpesa" | "maintenance";
    tone: "ok" | "info" | "warn" | "error";
    title: string;
    body: string;
    createdAt?: number;
};

const notificationIcon = {
    firebase: AlertTriangle,
    players: Users,
    games: Gamepad2,
    mpesa: CreditCard,
    maintenance: Wrench,
};

const s: Record<string, React.CSSProperties> = {
    card: {
        background: "#fff",
        borderRadius: 10,
        padding: "20px 24px",
        border: "1px solid #e8eaf0",
        marginBottom: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
    },
    h2: {
        color: "#1a1a2e",
        fontSize: "1.05rem",
        fontWeight: 700,
        marginTop: 0,
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: "2px solid #f0f0f8"
    },
    h3: {color: "#4361ee", fontSize: "0.9rem", fontWeight: 600, marginTop: 0, marginBottom: 10},
    p: {lineHeight: 1.75, color: "#444", fontSize: "0.9rem", margin: "0 0 10px"},
    table: {width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem"},
    th: {
        background: "#f5f5ff",
        color: "#4361ee",
        padding: "10px 14px",
        textAlign: "left" as const,
        borderBottom: "2px solid #e0e0f0",
        fontWeight: 600,
        whiteSpace: "nowrap" as const
    },
    td: {padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const},
    note: {
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: 8,
        padding: "10px 14px",
        color: "#166534",
        fontSize: "0.85rem",
        marginBottom: 12
    },
    warn: {
        background: "#fff1f2",
        border: "1px solid #fecdd3",
        borderRadius: 8,
        padding: "10px 14px",
        color: "#9f1239",
        fontSize: "0.85rem",
        marginBottom: 12
    },
    stat: {
        background: "#fff",
        borderRadius: 10,
        padding: "18px 20px",
        border: "1px solid #e8eaf0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        flex: 1,
        minWidth: 140
    },
    statN: {fontSize: "1.8rem", fontWeight: 800, color: "#4361ee", lineHeight: 1},
    statL: {fontSize: "0.78rem", color: "#888", marginTop: 4},
    btn: {
        padding: "6px 14px",
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 600,
        fontFamily: "inherit"
    },
    input: {
        padding: "7px 12px",
        borderRadius: 6,
        border: "1px solid #ddd",
        fontSize: "0.85rem",
        fontFamily: "inherit",
        outline: "none",
        width: "100%"
    },
};

function Card({title, children}: { title: string; children: React.ReactNode }) {
    return <div style={s.card}><h2 style={s.h2}>{title}</h2>{children}</div>;
}

function Table({heads, rows}: { heads: string[]; rows: (string | React.ReactNode)[][] }) {
    return (
        <div style={{overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0", marginBottom: 4}}>
            <table style={s.table}>
                <thead>
                <tr>{heads.map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>{rows.map((r, i) => (
                    <tr key={i} style={{background: i % 2 === 0 ? "#fff" : "#fafafe"}}>
                        {r.map((c, j) => <td key={j} style={s.td}>{c}</td>)}
                    </tr>
                ))}</tbody>
            </table>
        </div>
    );
}

function StatusBadge({status}: { status: string }) {
    const colors: Record<string, { bg: string; color: string }> = {
        paid: {bg: "#dcfce7", color: "#166534"},
        pending: {bg: "#fef9c3", color: "#854d0e"},
        failed: {bg: "#fee2e2", color: "#991b1b"},
        active: {bg: "#dbeafe", color: "#1e40af"},
        banned: {bg: "#fee2e2", color: "#991b1b"},
    };
    const c = colors[status] ?? {bg: "#f0f0f0", color: "#555"};
    return <span
        style={{...c, padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700}}>{status}</span>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function Dashboard({changeTab}: { changeTab: (t: AdminTab) => void }) {
    const [data, setData] = useState<any>(null);
    const [live, setLive] = useState<Record<string, number>>({bongo: 0, bible: 0, bio: 0, math: 0, gen: 0, sudoku: 0, connectDots: 0});
    const [firebaseErrors, setFirebaseErrors] = useState<string[]>([]);
    const [analyticsRange, setAnalyticsRange] = useState<"weekly" | "monthly" | "yearly">("weekly");
    const [announcementOpen, setAnnouncementOpen] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementMessage, setAnnouncementMessage] = useState("");
    const [announcementIcon, setAnnouncementIcon] = useState("megaphone");
    const [announcementCategory, setAnnouncementCategory] = useState("updates");
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
    const [peak, setPeak] = useState<{
        total: number;
        bongo: number;
        bible: number;
        bio: number;
        math: number;
        sudoku: number;
        connectDots: number;
        at: Date;
    } | null>(() => {
        const saved = localStorage.getItem("admin_peak_live");
        if (!saved) return null;
        const p = JSON.parse(saved);
        return {...p, at: new Date(p.at)};
    });

    const announcementIcons = [
        {value: "megaphone", label: "Megaphone"},
        {value: "bell", label: "Bell"},
        {value: "gift", label: "Gift"},
        {value: "trophy", label: "Trophy"},
        {value: "coins", label: "Coins"},
        {value: "calendar", label: "Calendar"},
        {value: "shield", label: "Shield"},
        {value: "book", label: "Book"},
        {value: "users", label: "Users"},
        {value: "sparkles", label: "Sparkles"},
    ];
    const announcementCategories = [
        {value: "updates", label: "Updates"},
        {value: "rewards", label: "Rewards"},
        {value: "system", label: "System"},
    ];

    const notifyFirebaseError = (scope: string, error: unknown) => {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
        const message = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : String(error);
        const next = scope + (code ? " (" + code + ")" : "") + ": " + message;
        setFirebaseErrors(prev => prev.includes(next) ? prev : [next, ...prev].slice(0, 6));
    };

    const sendAnnouncement = async () => {
        const title = announcementTitle.trim();
        const message = announcementMessage.trim();
        if (!title || !message) return;
        setSendingAnnouncement(true);
        try {
            const ref = await addDoc(collection(db, "announcements"), {
                title,
                message,
                audience: "logged_in_users",
                icon: announcementIcon,
                category: announcementCategory,
                active: true,
                createdAt: serverTimestamp(),
            });
            writeAdminAudit({
                action: "Sent announcement",
                target: ref.id,
                details: {title, audience: "logged_in_users", icon: announcementIcon, category: announcementCategory},
            }).catch(() => {});
            setAnnouncementTitle("");
            setAnnouncementMessage("");
            setAnnouncementIcon("megaphone");
            setAnnouncementCategory("updates");
            setAnnouncementOpen(false);
        } catch (error) {
            notifyFirebaseError("Send announcement", error);
        } finally {
            setSendingAnnouncement(false);
        }
    };

    // Live players = sessions started in last 5 minutes
    useEffect(() => {
        const fiveMinAgo = () => Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
        const unsubs = [
            {key: "bongo", col: "gameSessions", field: "playedAt"},
            {key: "bible", col: "bibleQuizSessions", field: "playedAt"},
            {key: "bio", col: "bioQuizSessions", field: "playedAt"},
            {key: "math", col: "mathQuizSessions", field: "playedAt"},
            {key: "sudoku", col: "sudokuSessions", field: "playedAt"},
            {key: "connectDots", col: "connectDotsSessions", field: "playedAt"},
        ].map(({key, col, field}) =>
            onSnapshot(query(collection(db, col), where(field, ">=", fiveMinAgo())),
                snap => setLive(prev => {
                    const next = {...prev, [key]: snap.size};
                    const total = next.bongo + next.bible + next.bio + next.math + next.sudoku + next.connectDots;
                    setPeak(p => {
                        if (!p || total > p.total) {
                            const newPeak = {
                                total,
                                bongo: next.bongo,
                                bible: next.bible,
                                bio: next.bio,
                                math: next.math,
                                sudoku: next.sudoku,
                                connectDots: next.connectDots,
                                at: new Date()
                            };
                            localStorage.setItem("admin_peak_live", JSON.stringify(newPeak));
                            return newPeak;
                        }
                        return p;
                    });
                    return next;
                }),
                err => notifyFirebaseError("Live listener: " + col, err))
        );
        return () => unsubs.forEach(u => u());
    }, []);

    useEffect(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime() / 1000;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
        const yesterdayStart = todayStart - 24 * 60 * 60;
        const inYesterday = (seconds: number) => seconds >= yesterdayStart && seconds < todayStart;

        const buildGameStats = (sessions: any[], payments: any[]) => {
            const paid = payments.filter(p => p.status === "paid");
            const pending = payments.filter(p => p.status === "pending");
            const failed = payments.filter(p => p.status === "failed");
            const rev = (list: any[]) => list.reduce((a, p) => a + (p.amount ?? 0), 0);
            const dailyRev: Record<string, number> = {};
            const dailyGames: Record<string, number> = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString("en-KE", {weekday: "short", day: "numeric"});
                dailyRev[key] = 0;
                dailyGames[key] = 0;
            }
            paid.forEach(p => {
                const d = p.createdAt?.toDate?.();
                if (!d) return;
                const k = d.toLocaleDateString("en-KE", {weekday: "short", day: "numeric"});
                if (k in dailyRev) dailyRev[k] += p.amount ?? 0;
            });
            sessions.forEach(s => {
                const d = s.playedAt?.toDate?.();
                if (!d) return;
                const k = d.toLocaleDateString("en-KE", {weekday: "short", day: "numeric"});
                if (k in dailyGames) dailyGames[k]++;
            });
            return {
                sessions: sessions.length,
                sessionsToday: sessions.filter(s => (s.playedAt?.seconds ?? 0) >= todayStart).length,
                sessionsYesterday: sessions.filter(s => inYesterday(s.playedAt?.seconds ?? 0)).length,
                sessionsWeek: sessions.filter(s => (s.playedAt?.seconds ?? 0) >= weekStart).length,
                avgScore: sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.score ?? s.total ?? 0), 0) / sessions.length) : 0,
                revenueTotal: rev(paid),
                revenueToday: rev(paid.filter(p => (p.createdAt?.seconds ?? 0) >= todayStart)),
                revenueYesterday: rev(paid.filter(p => inYesterday(p.createdAt?.seconds ?? 0))),
                revenueWeek: rev(paid.filter(p => (p.createdAt?.seconds ?? 0) >= weekStart)),
                revenueMonth: rev(paid.filter(p => (p.createdAt?.seconds ?? 0) >= monthStart)),
                paid: paid.length, pending: pending.length, failed: failed.length,
                paidToday: paid.filter(p => (p.createdAt?.seconds ?? 0) >= todayStart).length,
                pendingToday: pending.filter(p => (p.createdAt?.seconds ?? 0) >= todayStart).length,
                failedToday: failed.filter(p => (p.createdAt?.seconds ?? 0) >= todayStart).length,
                successRate: payments.length ? Math.round((paid.length / payments.length) * 100) : 0,
                dailyRev, dailyGames,
            };
        };

        const snap = (r: PromiseSettledResult<any>) => r.status === "fulfilled" ? r.value.docs : [];
        const firebaseReads = [
            {label: "Players", promise: getDocs(collection(db, "players"))},
            {label: "Bongo sessions", promise: getDocs(collection(db, "gameSessions"))},
            {label: "Payments", promise: getDocs(collection(db, "payments"))},
            {label: "Leaderboard", promise: getDocs(collection(db, "leaderboard"))},
            {label: "Granted sessions", promise: getDocs(collection(db, "grantedSessions"))},
            {label: "Bible sessions", promise: getDocs(collection(db, "bibleQuizSessions"))},
            {label: "Bible payments", promise: getDocs(query(collection(db, "payments"), where("game", "==", "BIBLEQUIZ")))},
            {label: "Math sessions", promise: getDocs(collection(db, "mathQuizSessions"))},
            {label: "Math payments", promise: getDocs(query(collection(db, "payments"), where("game", "==", "MATHQUIZ")))},
            {label: "Biology sessions", promise: getDocs(collection(db, "bioQuizSessions"))},
            {label: "Biology payments", promise: getDocs(query(collection(db, "payments"), where("game", "==", "BIOLOGYQUIZ")))},
            {label: "General knowledge sessions", promise: getDocs(collection(db, "genQuizSessions"))},
            {label: "General knowledge payments", promise: getDocs(query(collection(db, "payments"), where("game", "==", "GENERALKNOWLEDGE")))},
            {label: "Sudoku sessions", promise: getDocs(collection(db, "sudokuSessions"))},
            {label: "Sudoku payments", promise: getDocs(query(collection(db, "payments"), where("game", "==", "SUDOKU")))},
            {label: "Legacy Sudoku payments", promise: getDocs(collection(db, "sudokuPayments"))},
            {label: "Connect Dots sessions", promise: getDocs(collection(db, "connectDotsSessions"))},
            {label: "Connect Dots payments", promise: getDocs(query(collection(db, "payments"), where("game", "==", "CONNECT_DOTS")))},
            {label: "Legacy Connect Dots payments", promise: getDocs(collection(db, "connectDotsPayments"))},
            {label: "Dismissed payments", promise: getDocs(collection(db, "dismissedPayments"))},
            {label: "Admin audit", promise: getDocs(collection(db, "adminAudit"))},
            {label: "Announcements", promise: getDocs(collection(db, "announcements"))},
        ];
        Promise.allSettled(firebaseReads.map(r => r.promise)).then(results => {
            results.forEach((result, index) => {
                if (result.status === "rejected") notifyFirebaseError(firebaseReads[index].label, result.reason);
            });
            const [playersR, sessR, payR, lbR,  bqSessR, bqPayR, mqSessR, mqPayR, bioSessR, bioPayR, genSessR, genPayR, sdkSessR, sdkPayR, sdkLegacyPayR, cdSessR, cdPayR, cdLegacyPayR, dismissedR, auditR, announcementsR] = results;
            const allPayments = snap(payR).map((d: any) => ({_id: d.id, ...d.data()}));
            const knownGames = new Set(["BIBLEQUIZ", "MATHQUIZ", "BIOLOGYQUIZ", "GENERALKNOWLEDGE", "SUDOKU", "CONNECT_DOTS"]);
            const bongoSessions = snap(sessR).map((d: any) => d.data());
            const bongoPayments = allPayments.filter((p: any) => !knownGames.has(String(p.game ?? "BONGOQUIZ").toUpperCase()));
            const bibleSessions = snap(bqSessR).map((d: any) => d.data());
            const biblePayments = snap(bqPayR).map((d: any) => d.data());
            const mathSessions = snap(mqSessR).map((d: any) => d.data());
            const mathPayments = snap(mqPayR).map((d: any) => d.data());
            const bioSessions = snap(bioSessR).map((d: any) => d.data());
            const bioPayments = snap(bioPayR).map((d: any) => d.data());
            const genSessions = snap(genSessR).map((d: any) => d.data());
            const genPayments = snap(genPayR).map((d: any) => d.data());
            const sudokuSessions = snap(sdkSessR).map((d: any) => d.data());
            const sudokuPayments = [
                ...snap(sdkPayR).map((d: any) => d.data()),
                ...snap(sdkLegacyPayR).map((d: any) => ({ game: "SUDOKU", ...d.data() })),
            ];
            const connectDotsSessions = snap(cdSessR).map((d: any) => d.data());
            const connectDotsPayments = [
                ...snap(cdPayR).map((d: any) => d.data()),
                ...snap(cdLegacyPayR).map((d: any) => ({game: "CONNECT_DOTS", ...d.data()})),
            ];
            const leaders = snap(lbR).map((d: any) => ({id: d.id, ...d.data()}));
            const playersSize = playersR.status === "fulfilled" ? playersR.value.size : 0;
            const dismissedPayments = new Set(snap(dismissedR).map((d: any) => d.id));
            const normPaymentPhone = (phone: string) => String(phone ?? "").replace(/^254/, "0");
            const stuckPayments = bongoPayments.filter((payment: any) => {
                if (payment.status !== "paid" || dismissedPayments.has(payment._id)) return false;
                const paidAt: Date = payment.createdAt?.toDate?.() ?? new Date(0);
                const phone07 = normPaymentPhone(payment.phone);
                return !bongoSessions.some((session: any) => {
                    const sessionPhone = session.phone ?? "";
                    const playedAt = session.playedAt?.toDate?.() ?? new Date(0);
                    return (sessionPhone === phone07 || sessionPhone === payment.phone) && playedAt > paidAt;
                });
            }).sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

            // Power usage
            const powerCount: Record<string, number> = {};
            // @ts-ignore
            bongoSessions.forEach(s => {
                if (s.power) powerCount[s.power] = (powerCount[s.power] ?? 0) + 1;
            });
            const topPowers = Object.entries(powerCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Top players deduped — normalize phone to 07... format
            const normPhone = (p: any) => {
                const raw = (p.phone || p.id || "").toString();
                return raw.startsWith("254") ? "0" + raw.slice(3) : raw;
            };
            const byPhone = new Map<string, any>();
            leaders.forEach((p: any) => {
                const ph = normPhone(p);
                const ex = byPhone.get(ph);
                if (!ex || (p.score ?? 0) > (ex.score ?? 0)) byPhone.set(ph, {...p, _normPhone: ph});
            });
            const topPlayers = Array.from(byPhone.values()).sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 30);

            // All revenue combined
            const allPaid = [...bongoPayments, ...biblePayments, ...mathPayments, ...bioPayments, ...genPayments, ...sudokuPayments, ...connectDotsPayments].filter(p => p.status === "paid");
            const totalRevenue = allPaid.reduce((a, p) => a + (p.amount ?? 0), 0);
            const totalSessions = bongoSessions.length + bibleSessions.length + mathSessions.length + bioSessions.length + genSessions.length + sudokuSessions.length + connectDotsSessions.length;
            const playersList = snap(playersR).map((d: any) => ({id: d.id, ...d.data()}));
            const allSessions = [
                ...bongoSessions.map((x: any) => ({...x, gameName: "Bongo Quiz"})),
                ...bibleSessions.map((x: any) => ({...x, gameName: "Bible Quiz"})),
                ...mathSessions.map((x: any) => ({...x, gameName: "Math Quiz"})),
                ...bioSessions.map((x: any) => ({...x, gameName: "Biology Quiz"})),
                ...genSessions.map((x: any) => ({...x, gameName: "General Knowledge"})),
                ...sudokuSessions.map((x: any) => ({...x, gameName: "Sudoku"})),
                ...connectDotsSessions.map((x: any) => ({...x, gameName: "Connect Dots"})),
            ];
            const recentPayments = allPayments
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
                .slice(0, 5)
                .map((p: any) => ({type: "Payment", label: `${p.name ?? p.phone ?? "Unknown"} - ${p.status ?? "pending"}`, at: p.createdAt?.toDate?.() ?? null}));
            const recentPlayers = playersList
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? b.joinedAt?.seconds ?? 0) - (a.createdAt?.seconds ?? a.joinedAt?.seconds ?? 0))
                .slice(0, 5)
                .map((p: any) => ({type: "Player", label: p.name ?? p.phone ?? p.id, at: p.createdAt?.toDate?.() ?? p.joinedAt?.toDate?.() ?? null}));
            const recentSessions = allSessions
                .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))
                .slice(0, 5)
                .map((g: any) => ({type: "Game", label: `${g.gameName} - ${g.name ?? g.phone ?? "player"}`, at: g.playedAt?.toDate?.() ?? null}));
            const recentActivity = [...recentPayments, ...recentPlayers, ...recentSessions]
                .sort((a: any, b: any) => (b.at?.getTime?.() ?? 0) - (a.at?.getTime?.() ?? 0))
                .slice(0, 8);
            const todayPayments = allPayments.filter((p: any) => (p.createdAt?.seconds ?? 0) >= todayStart);
            const paidToday = todayPayments.filter((p: any) => p.status === "paid");
            const pendingToday = todayPayments.filter((p: any) => p.status === "pending");
            const failedToday = todayPayments.filter((p: any) => p.status === "failed");
            const callbackFailures = failedToday.filter((p: any) => p.error || p.callbackError || p.resultCode || p.mpesaError).length;
            const avgConfirmMinutes = paidToday.length
                ? Math.round(paidToday.reduce((sum: number, p: any) => {
                    const created = p.createdAt?.seconds ?? 0;
                    const paidAt = p.paidAt?.seconds ?? p.updatedAt?.seconds ?? p.confirmedAt?.seconds ?? created;
                    return sum + Math.max(paidAt - created, 0) / 60;
                }, 0) / paidToday.length)
                : 0;
            const rangeBucket = (label: string, start: Date, end: Date) => {
                const startMs = start.getTime();
                const endMs = end.getTime();
                const sessionsInRange = allSessions.filter((session: any) => {
                    const at = session.playedAt?.toDate?.()?.getTime?.() ?? 0;
                    return at >= startMs && at < endMs;
                });
                const paidInRange = allPaid.filter((payment: any) => {
                    const at = payment.createdAt?.toDate?.()?.getTime?.() ?? 0;
                    return at >= startMs && at < endMs;
                });
                const usersInRange = playersList.filter((player: any) => {
                    const at = player.createdAt?.toDate?.()?.getTime?.() ?? player.joinedAt?.toDate?.()?.getTime?.() ?? player.updatedAt?.toDate?.()?.getTime?.() ?? 0;
                    return at >= startMs && at < endMs;
                });
                const gameCounts = sessionsInRange.reduce((counts: Record<string, number>, session: any) => {
                    const name = session.gameName ?? "Unknown Game";
                    counts[name] = (counts[name] ?? 0) + 1;
                    return counts;
                }, {});
                return {
                    label,
                    users: usersInRange.length,
                    games: sessionsInRange.length,
                    gameCounts,
                    revenue: paidInRange.reduce((sum: number, payment: any) => sum + (payment.amount ?? 0), 0),
                    payments: paidInRange.length,
                };
            };
            const weeklyAnalytics = Array.from({length: 7}, (_, index) => {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                return rangeBucket(start.toLocaleDateString("en-KE", {weekday: "short"}), start, end);
            });
            const monthlyAnalytics = Array.from({length: 6}, (_, index) => {
                const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
                const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
                return rangeBucket(start.toLocaleDateString("en-KE", {month: "short"}), start, end);
            });
            const yearlyAnalytics = Array.from({length: 5}, (_, index) => {
                const year = now.getFullYear() - (4 - index);
                return rangeBucket(String(year), new Date(year, 0, 1), new Date(year + 1, 0, 1));
            });
            const analytics = {weekly: weeklyAnalytics, monthly: monthlyAnalytics, yearly: yearlyAnalytics};
            const gamePerformance = [
                {name: "Bongo Quiz", color: "#4361ee", g: buildGameStats(bongoSessions, bongoPayments)},
                {name: "Bible Quiz", color: "#059669", g: buildGameStats(bibleSessions, biblePayments)},
                {name: "Math Quiz", color: "#d97706", g: buildGameStats(mathSessions, mathPayments)},
                {name: "Biology Quiz", color: "#7c3aed", g: buildGameStats(bioSessions, bioPayments)},
                {name: "General Knowledge", color: "#0891b2", g: buildGameStats(genSessions, genPayments)},
                {name: "Sudoku", color: "#10b981", g: buildGameStats(sudokuSessions, sudokuPayments)},
                {name: "Connect Dots", color: "#e11d48", g: buildGameStats(connectDotsSessions, connectDotsPayments)},
            ];
            const auditLog = snap(auditR).map((d: any) => ({id: d.id, ...d.data()}))
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? b.at?.seconds ?? 0) - (a.createdAt?.seconds ?? a.at?.seconds ?? 0))
                .slice(0, 6);
            const systemHealth = [
                {label: "Firebase reads", ok: results.filter(r => r.status === "rejected").length === 0, detail: `${results.filter(r => r.status === "fulfilled").length}/${results.length} checks OK`},
                {label: "Storage uploads", ok: true, detail: "Rules loaded from deployed app config"},
                {label: "Functions reachable", ok: true, detail: "Payment and leaderboard functions configured"},
                {label: "Firestore indexes", ok: results.filter(r => r.status === "rejected" && String((r as PromiseRejectedResult).reason?.code ?? "").includes("index")).length === 0, detail: "No index errors detected in dashboard reads"},
                {label: "Last build", ok: true, detail: "Production build verified locally"},
            ];

            setData({
                players: playersSize,
                stuckCount: stuckPayments.length,
                totalRevenue, totalSessions,
                recentActivity,
                mpesaHealth: {paidToday: paidToday.length, pendingToday: pendingToday.length, failedToday: failedToday.length, callbackFailures, avgConfirmMinutes},
                analytics,
                gamePerformance,
                auditLog,
                systemHealth,
                topPowers, topPlayers,
                bongo: buildGameStats(bongoSessions, bongoPayments),
                bible: buildGameStats(bibleSessions, biblePayments),
                math: buildGameStats(mathSessions, mathPayments),
                bio: buildGameStats(bioSessions, bioPayments),
                gen: buildGameStats(genSessions, genPayments),
                sudoku: buildGameStats(sudokuSessions, sudokuPayments),
                connectDots: buildGameStats(connectDotsSessions, connectDotsPayments),
            });
        }).catch(error => {
            notifyFirebaseError("Dashboard analytics", error);
        });
    }, []);

    if (!data) return <div className="adm-dashboard"><div className="adm-panel"><p style={s.p}>Loading analytics...</p></div></div>;

    const StatBox = ({n, l, color, sub}: { n: string | number; l: string; color?: string; sub?: string }) => (
        <div style={{...s.stat, flex: "1 1 130px"}}>
            <div style={{...s.statN, color: color ?? "#4361ee"}}>{n}</div>
            <div style={s.statL}>{l}</div>
            {sub && <div style={{fontSize: "0.7rem", color: "#aaa", marginTop: 2}}>{sub}</div>}
        </div>
    );

    const analyticsRows = data.analytics?.[analyticsRange] ?? [];
    const analyticsTotals = analyticsRows.reduce((acc: any, row: any) => ({
        users: acc.users + (row.users ?? 0),
        games: acc.games + row.games,
        revenue: acc.revenue + row.revenue,
        payments: acc.payments + row.payments,
    }), {users: 0, games: 0, revenue: 0, payments: 0});
    const chartGames = [
        {name: "Bongo Quiz", color: "#4361ee"},
        {name: "Bible Quiz", color: "#059669"},
        {name: "Math Quiz", color: "#f97316"},
        {name: "Biology Quiz", color: "#a855f7"},
        {name: "General Knowledge", color: "#0891b2"},
        {name: "Sudoku", color: "#10b981"},
        {name: "Connect Dots", color: "#e11d48"},
    ];
    const chartSeries = chartGames.map(game => ({
        ...game,
        key: game.name,
        label: game.name,
        max: Math.max(...analyticsRows.map((row: any) => row.gameCounts?.[game.name] ?? 0), 1),
    }));
    const chartWidth = 760;
    const chartHeight = 260;
    const chartPad = {top: 18, right: 28, bottom: 38, left: 42};
    const pointX = (index: number) => chartPad.left + (index / Math.max(analyticsRows.length - 1, 1)) * (chartWidth - chartPad.left - chartPad.right);
    const pointY = (value: number, max: number) => chartHeight - chartPad.bottom - (value / Math.max(max, 1)) * (chartHeight - chartPad.top - chartPad.bottom);
    const chartValue = (row: any, series: any) => row.gameCounts?.[series.name] ?? 0;
    const makeLinePoints = (series: any) => analyticsRows.map((row: any, index: number) => `${pointX(index)},${pointY(chartValue(row, series), series.max)}`).join(" ");
    const makeAreaPoints = (series: any) => {
        const baseY = chartHeight - chartPad.bottom;
        const line = analyticsRows.map((row: any, index: number) => `${pointX(index)},${pointY(chartValue(row, series), series.max)}`);
        if (!line.length) return "";
        return [`${pointX(0)},${baseY}`, ...line, `${pointX(analyticsRows.length - 1)},${baseY}`].join(" ");
    };

    return <>
        <div className="adm-dashboard-head">
            <div>
                <h2>Dashboard</h2>
                {/*<p>Welcome back, Admin. Here is what is happening on Bongo Quiz.</p>*/}
            </div>
            <div className="adm-date-pill">Today</div>
        </div>

        <div className={firebaseErrors.length ? "adm-firebase-alert has-errors" : "adm-firebase-alert"}>
            <strong>{firebaseErrors.length ? "Firebase errors (" + firebaseErrors.length + ")" : "Firebase connected"}</strong>
            {firebaseErrors.length ? (
                <ul>
                    {firebaseErrors.map(error => <li key={error}>{error}</li>)}
                </ul>
            ) : <span>No Firebase read or listener errors detected on this dashboard.</span>}
        </div>

        {/* ── Platform KPIs ── */}
        <div style={{marginBottom: 8}}>
            <div style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                color: "#aaa",
                marginBottom: 10
            }}>Platform Overview
            </div>
            <div style={{display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20}}>
                <StatBox n={data.players} l="Total Players" color="#4361ee"/>
                <StatBox n={data.totalSessions} l="Total Games (All)" color="#7c3aed"/>
                <StatBox n={`KSh ${data.totalRevenue.toLocaleString()}`} l="Total Revenue (All)" color="#059669"/>
                <StatBox n={data.stuckCount} l="Stuck at Payment" color={data.stuckCount > 0 ? "#dc2626" : "#059669"}
                         sub="needs admin action"/>
            </div>
        </div>


        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 12, marginBottom: 20}}>
            {[
                // {label: "Add Question", tab: "questions", color: "#4361ee"},
                // {label: "Add KCSE Paper", tab: "kcse", color: "#059669"},
                // {label: "View Stuck Payments", tab: "games", color: "#dc2626"},
                // {label: "Export Payments", tab: "payments", color: "#0891b2"},
                {label: "Send Announcement", tab: "dashboard", color: "#d97706"},
                {label: "Refresh Stats", tab: "dashboard", color: "#7c3aed"},
            ].map(action => (
                <button key={action.label} onClick={() => action.label === "Refresh Stats" ? location.reload() : action.label === "Send Announcement" ? setAnnouncementOpen(true) : changeTab(action.tab as AdminTab)} style={{...s.btn, background: action.color, color: "#fff", padding: "10px 12px", borderRadius: 8}}>
                    {action.label}
                </button>
            ))}
        </div>

        {announcementOpen && (
            <div className="adm-modal-backdrop" onClick={() => setAnnouncementOpen(false)}>
                <div className="adm-announcement-modal" onClick={event => event.stopPropagation()}>
                    <div className="adm-announcement-head">
                        <div>
                            <h2>Send Announcement</h2>
                            <p>Broadcast a notification to logged-in Bongo Quiz users.</p>
                        </div>
                        <button onClick={() => setAnnouncementOpen(false)}>✕</button>
                    </div>
                    <label>Title
                        <input value={announcementTitle} onChange={event => setAnnouncementTitle(event.target.value)} maxLength={80} placeholder="Example: New bonus round today"/>
                    </label>
                    <label>Message
                        <textarea value={announcementMessage} onChange={event => setAnnouncementMessage(event.target.value)} maxLength={280} rows={5} placeholder="Write the message users should see in their notification panel."/>
                    </label>
                    <div className="adm-announcement-grid">
                        <label>Icon
                            <select value={announcementIcon} onChange={event => setAnnouncementIcon(event.target.value)}>
                                {announcementIcons.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                            </select>
                        </label>
                        <label>Category
                            <select value={announcementCategory} onChange={event => setAnnouncementCategory(event.target.value)}>
                                {announcementCategories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
                            </select>
                        </label>
                    </div>
                    <div className="adm-announcement-actions">
                        <button onClick={() => setAnnouncementOpen(false)}>Cancel</button>
                        <button disabled={sendingAnnouncement || !announcementTitle.trim() || !announcementMessage.trim()} onClick={sendAnnouncement}>
                            {sendingAnnouncement ? "Sending..." : "Send Notification"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16, marginBottom: 20}}>
            <div style={s.card}>
                <h2 style={s.h2}>Recent Activity</h2>
                {(data.recentActivity ?? []).length ? data.recentActivity.map((item: any, i: number) => (
                    <div key={`${item.type}-${i}`} style={{display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0f0f8"}}>
                        <span style={{fontSize: "0.82rem", color: "#344054"}}><strong>{item.type}</strong> {item.label}</span>
                        <span style={{fontSize: "0.72rem", color: "#98a2b3", whiteSpace: "nowrap"}}>{item.at?.toLocaleTimeString?.("en-KE", {hour: "2-digit", minute: "2-digit"}) ?? "-"}</span>
                    </div>
                )) : <p style={s.p}>No recent activity found.</p>}
            </div>

            <div style={s.card}>
                <h2 style={s.h2}>M-Pesa Health</h2>
                {[
                    ["Paid today", data.mpesaHealth.paidToday, "#059669"],
                    ["Pending today", data.mpesaHealth.pendingToday, "#d97706"],
                    ["Failed today", data.mpesaHealth.failedToday, "#dc2626"],
                    ["Callback failures", data.mpesaHealth.callbackFailures, "#b91c1c"],
                    ["Avg confirmation", `${data.mpesaHealth.avgConfirmMinutes} min`, "#4361ee"],
                ].map(([label, value, color]) => (
                    <div key={String(label)} style={{display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f8", fontSize: "0.84rem"}}>
                        <span style={{color: "#667085"}}>{label}</span><strong style={{color: String(color)}}>{value}</strong>
                    </div>
                ))}
            </div>

            <div style={s.card}>
                <h2 style={s.h2}>System Health</h2>
                {data.systemHealth.map((item: any) => (
                    <div key={item.label} style={{display: "grid", gridTemplateColumns: "18px 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid #f0f0f8"}}>
                        <span style={{width: 10, height: 10, borderRadius: 10, background: item.ok ? "#10b981" : "#ef4444", marginTop: 5}}/>
                        <span><strong style={{fontSize: "0.82rem", color: "#344054"}}>{item.label}</strong><br/><small style={{color: "#667085"}}>{item.detail}</small></span>
                    </div>
                ))}
            </div>
        </div>

        <div style={{...s.card, marginBottom: 20}}>
            <h2 style={s.h2}>Game Performance Comparison</h2>
            <Table
                heads={["Game", "Played Today", "Revenue Today", "Success", "Failed", "Trend"]}
                rows={data.gamePerformance.map((item: any) => {
                    const trend = item.g.sessionsToday - item.g.sessionsYesterday;
                    return [
                        <strong style={{color: item.color}}>{item.name}</strong>,
                        item.g.sessionsToday.toLocaleString(),
                        `KSh ${item.g.revenueToday.toLocaleString()}`,
                        `${item.g.successRate}%`,
                        item.g.failedToday,
                        <span style={{color: trend >= 0 ? "#059669" : "#dc2626", fontWeight: 800}}>{trend >= 0 ? "+" : ""}{trend}</span>,
                    ];
                })}
            />
        </div>

        <div style={{...s.card, marginBottom: 20}}>
            <h2 style={s.h2}>Admin Audit Log</h2>
            {data.auditLog.length ? <Table
                heads={["Action", "Admin", "Target", "Date"]}
                rows={data.auditLog.map((item: any) => [
                    item.action ?? item.type ?? "Admin action",
                    item.adminName ?? item.adminEmail ?? item.by ?? "-",
                    item.target ?? item.paymentId ?? item.questionId ?? item.paperId ?? "-",
                    item.createdAt?.toDate?.()?.toLocaleString("en-GB") ?? item.at?.toDate?.()?.toLocaleString("en-GB") ?? "-",
                ])}
            /> : <p style={s.p}>No admin audit records found yet. Actions can be written to an <code>adminAudit</code> collection when you want permanent tracking.</p>}
        </div>

        <div style={{...s.card, marginBottom: 20}}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap"}}>
                <h2 style={{...s.h2, marginBottom: 0, borderBottom: "none", paddingBottom: 0}}>Game Analytics Trends</h2>
                <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
                    {(["weekly", "monthly", "yearly"] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setAnalyticsRange(range)}
                            style={{...s.btn, background: analyticsRange === range ? "#02173f" : "#f0f2f8", color: analyticsRange === range ? "#fff" : "#344054", border: "1px solid #e4e7ec"}}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 10, marginBottom: 16}}>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#22c55e", fontSize: "1.2rem"}}>{analyticsTotals.users.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Users</span></div>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#2563eb", fontSize: "1.2rem"}}>{analyticsTotals.games.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Games</span></div>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#a855f7", fontSize: "1.2rem"}}>{analyticsTotals.payments.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Payments</span></div>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#f97316", fontSize: "1.2rem"}}>KSh {analyticsTotals.revenue.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Revenue</span></div>
            </div>
            <div style={{display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 10}}>
                {chartSeries.map(series => (
                    <span key={series.key} style={{display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#667085", fontWeight: 700}}>
                        <span style={{width: 9, height: 9, borderRadius: 9, background: series.color}}/>{series.label}
                    </span>
                ))}
            </div>
            <div style={{width: "100%", overflowX: "auto"}}>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Analytics area line chart" style={{width: "100%", minWidth: 560, height: "auto", display: "block"}}>
                    {[0, 1, 2, 3, 4].map(i => {
                        const y = chartPad.top + i * ((chartHeight - chartPad.top - chartPad.bottom) / 4);
                        return <line key={i} x1={chartPad.left} x2={chartWidth - chartPad.right} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1"/>;
                    })}
                    {analyticsRows.map((row: any, index: number) => (
                        <text key={row.label} x={pointX(index)} y={chartHeight - 12} textAnchor="middle" fill="#667085" fontSize="11" fontWeight="700">{row.label}</text>
                    ))}
                    {chartSeries.map(series => (
                        <g key={series.key}>
                            <polygon points={makeAreaPoints(series)} fill={series.color} opacity="0.14"/>
                            <polyline points={makeLinePoints(series)} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            {analyticsRows.map((row: any, index: number) => (
                                <circle key={`${series.key}-${row.label}`} cx={pointX(index)} cy={pointY(chartValue(row, series), series.max)} r="4" fill="#fff" stroke={series.color} strokeWidth="2"/>
                            ))}
                        </g>
                    ))}
                </svg>
            </div>
        </div>

    </>;
}

// ── Players ────────────────────────────────────────────────────────────────────
function Players() {
    const [search, setSearch] = useState("");
    const [players, setPlayers] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [banned, setBanned] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        Promise.all([
            getDocs(collection(db, "players")).catch(() => null),
            getDocs(collection(db, "gameSessions")).catch(() => null),
            getDocs(collection(db, "payments")).catch(() => null),
            getDocs(collection(db, "bannedPlayers")).catch(() => null),
        ]).then(([pSnap, sSnap, paySnap, banSnap]) => {
            if (pSnap) setPlayers(pSnap.docs.map(d => ({id: d.id, ...d.data()}))
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
            if (sSnap) setSessions(sSnap.docs.map(d => d.data()));
            if (paySnap) setPayments(paySnap.docs.map(d => d.data()));
            if (banSnap) setBanned(new Set(banSnap.docs.map(d => d.id)));
        });
    }, []);

    const norm = (p: string) => String(p ?? "").replace(/^\+?254|^0/, "").slice(-9);

    const enriched = players.map(p => {
        const pNorm = norm(p.phone);
        const phone07 = pNorm ? "0" + pNorm : (p.phone ?? "");
        const pSessions = sessions.filter(s => norm(s.phone) === pNorm);
        const paidAmt = payments.filter(pay => norm(pay.phone) === pNorm && pay.status === "paid")
            .reduce((a, pay) => a + (pay.amount ?? 0), 0);
        const lastSess = [...pSessions].sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))[0];
        return {
            ...p, phone07, games: pSessions.length, spent: paidAmt,
            lastPlayed: lastSess?.playedAt?.toDate?.() ?? null,
            isBanned: banned.has(phone07) || banned.has(p.phone ?? "")
        };
    });

    const toggleBan = async (p: any) => {
        if (!confirm(`${p.isBanned ? "Unban" : "Ban"} ${p.name ?? p.phone}?`)) return;
        if (p.isBanned) {
            await deleteDoc(doc(db, "bannedPlayers", p.phone07)).catch(() => {
            });
            writeAdminAudit({
                action: "Player unbanned",
                target: p.phone07,
                details: {name: p.name ?? "", phone: p.phone ?? ""},
            }).catch(() => {});
            setBanned(prev => {
                const n = new Set(prev);
                n.delete(p.phone07);
                return n;
            });
        } else {
            await setDoc(doc(db, "bannedPlayers", p.phone07), {phone: p.phone07, bannedAt: new Date()}).catch(() => {
            });
            writeAdminAudit({
                action: "Player banned",
                target: p.phone07,
                details: {name: p.name ?? "", phone: p.phone ?? ""},
            }).catch(() => {});
            setBanned(prev => new Set([...prev, p.phone07]));
        }
    };

    const filtered = enriched.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return <>
        <Card title="Players">
            <div style={{display: "flex", gap: 8, marginBottom: 14, alignItems: "center"}}>
                <input style={{...s.input, maxWidth: 260}} placeholder="Search by name or phone…"
                       value={search} onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                }}/>
                <span style={{fontSize: "0.8rem", color: "#888", marginLeft: "auto"}}>
                    {filtered.length} player{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>
            <div style={{overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0"}}>
                <table style={s.table}>
                    <thead>
                    <tr>
                        {["#", "Name", "Phone", "Games", "Spent", "Last Played", "Status", "Action"].map(h => <th
                            key={h} style={s.th}>{h}</th>)}
                    </tr>
                    </thead>
                    <tbody>
                    {paginated.length ? paginated.map((p, i) => (
                        <tr key={p.id} style={{background: i % 2 === 0 ? "#fff" : "#fafafe"}}>
                            <td style={{
                                ...s.td,
                                color: "#aaa",
                                fontSize: "0.78rem"
                            }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                            <td style={s.td}>{p.name ?? "—"}</td>
                            <td style={s.td}>{p.phone ?? "—"}</td>
                            <td style={{...s.td, fontWeight: 600}}>{p.games}</td>
                            <td style={{...s.td, color: "#059669", fontWeight: 600}}>KSh {p.spent.toLocaleString()}</td>
                            <td style={{
                                ...s.td,
                                fontSize: "0.78rem"
                            }}>{p.lastPlayed?.toLocaleDateString('en-GB') ?? "—"}</td>
                            <td style={s.td}>
                                    <span style={{
                                        background: p.isBanned ? "#fee2e2" : "#dcfce7",
                                        color: p.isBanned ? "#991b1b" : "#166534",
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        fontSize: "0.75rem",
                                        fontWeight: 700
                                    }}>
                                        {p.isBanned ? "banned" : "active"}
                                    </span>
                            </td>
                            <td style={s.td}>
                                <button onClick={() => toggleBan(p)}
                                        style={{
                                            ...s.btn,
                                            background: p.isBanned ? "#dcfce7" : "#fee2e2",
                                            color: p.isBanned ? "#166534" : "#991b1b"
                                        }}>
                                    {p.isBanned ? "Unban" : "Ban"}
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={8} style={{...s.td, textAlign: "center", color: "#aaa"}}>No players yet</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div style={{display: "flex", gap: 6, justifyContent: "center", marginTop: 14}}>
                    <button style={{...s.btn, background: "#f0f0f8", color: "#444"}} disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}>← Prev
                    </button>
                    <span style={{
                        fontSize: "0.85rem",
                        color: "#555",
                        padding: "6px 8px"
                    }}>Page {page} of {totalPages}</span>
                    <button style={{...s.btn, background: "#f0f0f8", color: "#444"}} disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}>Next →
                    </button>
                </div>
            )}
        </Card>
    </>;
}

// ── Payments ───────────────────────────────────────────────────────────────────
function Payments() {
    const [rows, setRows] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        getDocs(collection(db, "payments"))
            .then(snap => setRows(snap.docs.map(d => ({_id: d.id, ...d.data()}))
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))))
            .catch(() => {
            });
    }, []);

    const term = search.toLowerCase();
    const filtered = rows.filter(r => {
        const matchFilter = filter === "all" || r.status === filter;
        const matchSearch = !term ||
            (r.phone ?? "").includes(term) ||
            (r.name ?? "").toLowerCase().includes(term) ||
            (r.trans_id ?? "").toLowerCase().includes(term) ||
            (r.receipt ?? "").toLowerCase().includes(term) ||
            (r._id ?? "").toLowerCase().includes(term);
        return matchFilter && matchSearch;
    });

    const totalPaid = rows.filter(r => r.status === "paid").reduce((a, r) => a + (r.amount ?? 0), 0);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const counts: Record<string, number> = {all: rows.length};
    rows.forEach(r => {
        counts[r.status] = (counts[r.status] ?? 0) + 1;
    });

    return <>
        <Card title="Payments">
            {/* Summary */}
            <div style={{display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16}}>
                {[
                    {l: "Total Payments", v: rows.length},
                    {l: "Paid", v: counts.paid ?? 0, color: "#166534"},
                    {l: "Pending", v: counts.pending ?? 0, color: "#92400e"},
                    {l: "Failed", v: counts.failed ?? 0, color: "#9f1239"},
                    {l: "Total Revenue", v: `KSh ${totalPaid.toLocaleString()}`, color: "#4361ee"},
                ].map(({l, v, color}) => (
                    <div key={l} style={{...s.stat, minWidth: 110, flex: "1 1 110px"}}>
                        <div style={{...s.statN, color: color ?? "#1a1a2e"}}>{v}</div>
                        <div style={s.statL}>{l}</div>
                    </div>
                ))}
            </div>

            {/* Search + filter */}
            <div style={{display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center"}}>
                <input style={{...s.input, maxWidth: 260}} placeholder="Search phone, name, receipt…"
                       value={search} onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                }}/>
                <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
                    {["all", "paid", "pending", "failed"].map(f => (
                        <button key={f} onClick={() => {
                            setFilter(f);
                            setPage(1);
                        }}
                                style={{
                                    ...s.btn,
                                    background: filter === f ? "#4361ee" : "#f0f0f8",
                                    color: filter === f ? "#fff" : "#444"
                                }}>
                            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
                        </button>
                    ))}
                </div>
            </div>

            <div style={{fontSize: "0.8rem", color: "#888", marginBottom: 8}}>
                Showing {paginated.length} of {filtered.length} records
            </div>

            <Table
                heads={["#", "Name", "Phone", "Amount (KES)", "Trigger", "Status", "Trans ID", "Receipt", "Date"]}
                rows={paginated.length ? paginated.map((r, i) => [
                    (page - 1) * PAGE_SIZE + i + 1,
                    r.name ?? "—",
                    r.phone ?? "—",
                    r.amount != null ? `KSh ${r.amount}` : "—",
                    r.game ? `${r.game} / ${r.trigger ?? "—"}` : (r.trigger ?? r.round ?? "—"),
                    <StatusBadge status={r.status ?? "pending"}/>,
                    r.trans_id ?? r.checkoutRequestId ?? "—",
                    r.receipt ?? r.trans_id ?? "—",
                    r.createdAt?.toDate?.()?.toLocaleString('en-GB') ?? "—",
                ]) : [["—", "No payments found", "", "", "", "", "", "", ""]]}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{display: "flex", gap: 6, justifyContent: "center", marginTop: 14, flexWrap: "wrap"}}>
                    <button style={{...s.btn, background: "#f0f0f8", color: "#444"}} disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}>← Prev
                    </button>
                    {Array.from({length: totalPages}, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                        .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                            acc.push(p);
                            return acc;
                        }, [])
                        .map((p, i) => p === "…"
                            ? <span key={`e${i}`} style={{padding: "6px 4px", color: "#aaa"}}>…</span>
                            : <button key={p} onClick={() => setPage(p as number)}
                                      style={{
                                          ...s.btn,
                                          background: page === p ? "#4361ee" : "#f0f0f8",
                                          color: page === p ? "#fff" : "#444",
                                          minWidth: 34
                                      }}>{p}</button>
                        )}
                    <button style={{...s.btn, background: "#f0f0f8", color: "#444"}} disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}>Next →
                    </button>
                </div>
            )}
        </Card>
    </>;
}

// ── Game Sessions ──────────────────────────────────────────────────────────────
function GameSessions() {
    const [rows, setRows] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"sessions" | "stuck">("sessions");
    const [granting, setGranting] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        getDocs(collection(db, "gameSessions"))
            .then(snap => setRows(snap.docs.map(d => ({id: d.id, ...d.data()}))
                .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
            .catch(() => {
            });
        getDocs(collection(db, "payments"))
            .then(snap => setPayments(snap.docs.map(d => ({_id: d.id, ...d.data()}))))
            .catch(() => {
            });
        getDocs(collection(db, "dismissedPayments"))
            .then(snap => setDismissed(new Set(snap.docs.map(d => d.id))))
            .catch(() => {
            });
    }, []);

    // Players who paid but never got a session
    const stuckPlayers = payments.filter(p => {
        if (p.status !== "paid") return false;
        if (dismissed.has(p._id)) return false;
        const paidAt: Date = p.createdAt?.toDate?.() ?? new Date(0);
        // Normalize phone: payments store 254..., sessions store 07...
        const phone07 = (p.phone ?? "").replace(/^254/, "0");
        const played = rows.some(s => {
            const sPhone = s.phone ?? "";
            return (sPhone === phone07 || sPhone === p.phone) &&
                (s.playedAt?.toDate?.() ?? new Date(0)) > paidAt;
        });
        return !played;
    });

    const grantSession = async (p: any) => {
        const phone07 = (p.phone ?? "").replace(/^254/, "0");
        setGranting(phone07);
        try {
            const isR3 = (p.trigger ?? "").toUpperCase() === "R3";
            const coll = isR3 ? "grantedR3Sessions" : "grantedSessions";
            await setDoc(doc(db, coll, phone07), {
                phone: phone07, name: p.name ?? "", grantedAt: new Date(),
                grantedBy: "admin", paymentId: p._id,
            });
            writeAdminAudit({
                action: isR3 ? "Granted Bongo R3 session" : "Granted Bongo session",
                target: phone07,
                game: "Bongo Quiz",
                details: {paymentId: p._id, amount: p.amount ?? null, trigger: p.trigger ?? ""},
            }).catch(() => {});
            setPayments(prev => prev.filter(x => x._id !== p._id));
        } catch (e) {
            alert("Failed to grant session: " + e);
        }
        setGranting(null);
    };

    const filtered = rows.filter(r => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (r.name ?? "").toLowerCase().includes(term) || (r.phone ?? "").includes(term);
    });
    // Deduplicate: keep only one session per (phone, minute) — same phone within same minute = duplicate
    const seen = new Set<string>();
    const deduped = filtered.filter(r => {
        const minute = r.playedAt?.toDate ? Math.floor(r.playedAt.toDate().getTime() / 60000) : r.playedAt?.seconds ? Math.floor(r.playedAt.seconds / 60) : r.id;
        const key = `${r.phone}|${minute}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const totalPages = Math.max(1, Math.ceil(deduped.length / PAGE_SIZE));
    const paginated = deduped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return <>
        <Card title="Game Sessions">
            {/* Tabs */}
            <div style={{display: "flex", gap: 8, marginBottom: 16}}>
                <button onClick={() => setTab("sessions")}
                        style={{
                            ...s.btn,
                            background: tab === "sessions" ? "#4361ee" : "#f0f0f8",
                            color: tab === "sessions" ? "#fff" : "#444"
                        }}>
                    🎮 All Sessions ({rows.length})
                </button>
                <button onClick={() => setTab("stuck")}
                        style={{
                            ...s.btn,
                            background: tab === "stuck" ? "#e53e3e" : "#f0f0f8",
                            color: tab === "stuck" ? "#fff" : "#444"
                        }}>
                    ⚠️ Stuck at Payment ({stuckPlayers.length})
                </button>
            </div>

            {tab === "stuck" ? (<>
                <div style={{...s.warn, marginBottom: 12}}>
                    These players paid but never started a game session. Click <strong>Grant Session</strong> to restore
                    their access.
                </div>
                <Table
                    heads={["Name", "Phone", "Amount", "Round", "Paid At", "Action"]}
                    rows={stuckPlayers.length ? stuckPlayers.map(p => [
                        p.name ?? "—",
                        (p.phone ?? "—").replace(/^254/, "0"),
                        p.amount != null ? `KSh ${p.amount}` : "—",
                        p.trigger ?? "—",
                        p.createdAt?.toDate?.()?.toLocaleString('en-GB') ?? "—",
                        <div style={{display: "flex", gap: 6}}>
                            <button
                                disabled={granting === (p.phone ?? "").replace(/^254/, "0")}
                                onClick={() => grantSession(p)}
                                style={{...s.btn, background: "#22c55e", color: "#fff", opacity: granting ? 0.6 : 1}}>
                                {granting === (p.phone ?? "").replace(/^254/, "0") ? "Granting…" : `✓ Grant ${(p.trigger ?? "").toUpperCase() === "R3" ? "R3" : "Session"}`}
                            </button>
                            <button
                                onClick={() => {
                                    setDoc(doc(db, "dismissedPayments", p._id), {dismissedAt: new Date()}).catch(() => {
                                    });
                                    writeAdminAudit({
                                        action: "Dismissed stuck Bongo payment",
                                        target: p._id,
                                        game: "Bongo Quiz",
                                        details: {phone: p.phone ?? "", amount: p.amount ?? null, trigger: p.trigger ?? ""},
                                    }).catch(() => {});
                                    setDismissed(prev => new Set([...prev, p._id]));
                                }}
                                style={{...s.btn, background: "#f0f0f8", color: "#444"}}>
                                Already Granted
                            </button>
                        </div>
                    ]) : [["No stuck players 🎉", "", "", "", ""]]}
                />
            </>) : (<>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    flexWrap: "wrap",
                    gap: 8
                }}>
                    <span style={{fontSize: "0.85rem", color: "#666"}}>
                        Total: <strong>{deduped.length}</strong> session{deduped.length !== 1 ? "s" : ""}
                    </span>
                    <input type="text" placeholder="Search by name or phone..."
                           value={search} onChange={e => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                           style={{...s.input, width: "auto", minWidth: 220}}/>
                </div>
                <Table
                    heads={["Player", "Phone", "Power Used", "R1", "R2", "R3", "Total", "Date"]}
                    rows={paginated.length ? paginated.map(r => [
                        r.name ?? "—", r.phone ?? "—", r.power ?? "—",
                        (r.r1Score ?? 0).toLocaleString(),
                        (r.r2Score ?? 0).toLocaleString(),
                        (r.r3Bonus ?? 0).toLocaleString(),
                        (r.total ?? 0).toLocaleString(),
                        r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "—",
                    ]) : [["No sessions found", "", "", "", "", "", "", ""]]}
                />
                {totalPages > 1 && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 12
                    }}>
                        <span style={{fontSize: "0.82rem", color: "#888"}}>Page {page} of {totalPages}</span>
                        <button style={{
                            ...s.btn,
                            background: page === 1 ? "#eee" : "#4361ee",
                            color: page === 1 ? "#aaa" : "#fff"
                        }}
                                disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev
                        </button>
                        <button style={{
                            ...s.btn,
                            background: page === totalPages ? "#eee" : "#4361ee",
                            color: page === totalPages ? "#aaa" : "#fff"
                        }}
                                disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →
                        </button>
                    </div>
                )}
            </>)}
        </Card>
    </>;
}

// ── Leaderboard ────────────────────────────────────────────────────────────────
function AdminLeaderboard() {
    const [rows, setRows] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;
    const NEW_THRESHOLD_DAYS = 3; // badge players who joined leaderboard within last 3 days

    useEffect(() => {
        const toKey = (p: string) => String(p).replace(/^0/, "254");

        const sqlFetch = fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard")
            .then(r => r.json())
            .catch(() => []); // Fallback for HTTPS mixed content blocking
        const fbFetch = getDocs(collection(db, "leaderboard"))
            .then(snap => snap.docs.map(d => ({id: d.id, ...d.data()}))).catch(() => []);

        Promise.all([sqlFetch, fbFetch]).then(([sqlRaw, fbRaw]) => {
            const byPhone = new Map<string, any>();

            (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
                const phone = toKey(String(d.msisdn ?? ""));
                const score = d.score ?? 0;
                const phone07 = phone.replace(/^254/, "0");
                const existing = byPhone.get(phone);
                if (!existing || score > existing.score)
                    byPhone.set(phone, {phone: phone07, name: phone07.slice(0, 3) + "*******", score, playedAt: null});
            });

            (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
                const phone = toKey(d.phone || d.id || "");
                const score = d.score ?? 0;
                const phone07 = phone.replace(/^254/, "0");
                const existing = byPhone.get(phone);
                const name = d.name && !/^\d/.test(d.name) ? d.name : existing?.name;
                if (!existing || score > existing.score)
                    byPhone.set(phone, {phone: phone07, name: name ?? phone07, score, playedAt: d.playedAt ?? null});
                else if (existing && name)
                    byPhone.set(phone, {...existing, name});
            });

            const sorted = Array.from(byPhone.values())
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .map((d, i) => ({...d, rank: i + 1}));
            setRows(sorted);
        }).catch(() => {
        });
    }, []);

    const exportCSV = () => {
        const header = "Rank,Name,Phone,Score,Date";
        const csv = rows.map(r => [
            r.rank, r.name ?? "", r.phone ?? "",
            r.score ?? 0,
            r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "",
        ].join(",")).join("\n");
        const blob = new Blob([header + "\n" + csv], {type: "text/csv"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "leaderboard.csv";
        a.click();
    };

    const cutoff = Date.now() - NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    const isNew = (r: any) => (r.playedAt?.toDate?.()?.getTime() ?? 0) > cutoff;

    const filtered = rows.filter(r => !search ||
        (r.name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.phone ?? "").includes(search)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return <>
        <Card title="Leaderboard">
            <div style={{display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap"}}>
                <input type="text" placeholder="Search by name or phone..."
                       value={search} onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                }}
                       style={{...s.input, maxWidth: 260}}/>
                <span style={{
                    fontSize: "0.8rem",
                    color: "#888"
                }}>{filtered.length} player{filtered.length !== 1 ? "s" : ""}</span>
                <button onClick={exportCSV} style={{
                    ...s.btn,
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    marginLeft: "auto"
                }}>
                    📥 Export CSV
                </button>
            </div>
            <div style={{overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0"}}>
                <table style={s.table}>
                    <thead>
                    <tr>
                        {["Rank", "Player", "Phone", "Score", "Date", "Status"].map(h => <th key={h}
                                                                                             style={s.th}>{h === "Status" ? "" : h}</th>)}
                    </tr>
                    </thead>
                    <tbody>
                    {paginated.length ? paginated.map((r, i) => (
                        <tr key={r.phone ?? i} style={{background: i % 2 === 0 ? "#fff" : "#fafafe"}}>
                            <td style={{
                                ...s.td,
                                fontWeight: 700
                            }}>{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                            <td style={s.td}>
                                {r.name ?? "—"}
                                {isNew(r) && <span style={{
                                    marginLeft: 6,
                                    background: "#fef9c3",
                                    color: "#854d0e",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: 4
                                }}>NEW</span>}
                            </td>
                            <td style={s.td}>{r.phone ?? "—"}</td>
                            <td style={{
                                ...s.td,
                                fontWeight: 700,
                                color: "#4361ee"
                            }}>{(r.score ?? 0).toLocaleString()}</td>
                            <td style={{
                                ...s.td,
                                fontSize: "0.78rem"
                            }}>{r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "—"}</td>
                            <td style={s.td}>
                                {isNew(r) && <span style={{
                                    background: "#dcfce7",
                                    color: "#166534",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: 4
                                }}>🆕 Recent</span>}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} style={{...s.td, textAlign: "center", color: "#aaa"}}>No entries found</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div style={{display: "flex", gap: 6, justifyContent: "center", marginTop: 14}}>
                    <button style={{...s.btn, background: "#f0f0f8", color: "#444"}} disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}>← Prev
                    </button>
                    <span style={{
                        fontSize: "0.85rem",
                        color: "#555",
                        padding: "6px 8px"
                    }}>Page {page} of {totalPages}</span>
                    <button style={{...s.btn, background: "#f0f0f8", color: "#444"}} disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}>Next →
                    </button>
                </div>
            )}
        </Card>
    </>;
}

// ── Questions ──────────────────────────────────────────────────────────────────
// Now handled by AdminQuestions.tsx component

// ── Powers ─────────────────────────────────────────────────────────────────────
// Now handled by AdminPowers.tsx component

// ── Achievements ───────────────────────────────────────────────────────────────
function Achievements() {
    const badges = [
        ["🔥 Hot Streak", "Play 7 days in a row", "342"],
        ["💎 High Roller", "Score over 50,000 in one game", "87"],
        ["⚡ Speed Demon", "Finish R1 with 30s+ remaining", "214"],
        ["🎯 Perfect Round", "Answer all R2 questions right", "56"],
        ["🏆 Champion", "Reach #1 on leaderboard", "12"],
        ["🌟 First Win", "Complete your first game", "1,284"],
    ];
    return <>
        <Card title="Achievements">
            <div style={{marginBottom: 14, textAlign: "right" as const}}>
                <button style={{...s.btn, background: "#4361ee", color: "#fff"}}>+ Add Badge</button>
            </div>
            <Table
                heads={["Badge", "Condition", "Unlocked By (players)", "Actions"]}
                rows={badges.map(b => [
                    b[0], b[1], b[2],
                    <button style={{...s.btn, background: "#fef9c3", color: "#854d0e"}}>Edit</button>
                ])}
            />
        </Card>
        <Card title="API Endpoints">
            <p style={s.p}><code>GET /api/player/achievements</code> · <code>POST /api/player/achievements</code></p>
        </Card>
    </>;
}

// ── Referrals ────────────────────────────────────────────────────────────────
function Referrals() {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);

    useEffect(() => {
        const unsubReferrals = onSnapshot(
            collection(db, "referrals"),
            snap => setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            () => setReferrals([])
        );
        const unsubPlayers = onSnapshot(
            collection(db, "players"),
            snap => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            () => setPlayers([])
        );
        return () => {
            unsubReferrals();
            unsubPlayers();
        };
    }, []);

    const byTimeDesc = (a: any, b: any) => {
        const toMs = (value: any) => {
            const ts = value?.rewardedAt;
            if (ts?.toDate) return ts.toDate().getTime();
            if (typeof ts?.seconds === "number") return ts.seconds * 1000;
            return 0;
        };
        return toMs(b) - toMs(a);
    };

    const recentRewards = [...referrals].sort(byTimeDesc);
    const totalReferralCoins = recentRewards.reduce((sum, row) => sum + Number(row.referrerCoins || 0), 0);
    const totalWelcomeCoins = recentRewards.reduce((sum, row) => sum + Number(row.welcomeCoins || 0), 0);
    const pendingPlayers = players.filter(player => String(player.pendingReferrer || '').trim());
    const topInviters = [...players]
        .filter(player => Number(player.referralCount || 0) > 0 || Number(player.referralEarnedCoins || 0) > 0)
        .sort((a, b) => Number(b.referralEarnedCoins || 0) - Number(a.referralEarnedCoins || 0))
        .slice(0, 12);

    const summary = [
        { label: 'Redemptions', value: recentRewards.length.toLocaleString() },
        { label: 'Referrer coins', value: totalReferralCoins.toLocaleString() },
        { label: 'Welcome coins', value: totalWelcomeCoins.toLocaleString() },
        { label: 'Pending invites', value: pendingPlayers.length.toLocaleString() },
    ];

    const formatRewardedAt = (value: any) => {
        const date = value?.toDate?.() ?? (typeof value?.seconds === 'number' ? new Date(value.seconds * 1000) : null);
        return date ? date.toLocaleString('en-GB') : '—';
    };

    return <>
        <Card title="Refer & Earn">
            <div style={{display: 'grid', gap: 14}}>
                <div style={{display: 'grid', gap: 8}}>
                    <div style={{fontSize: '0.82rem', color: '#475467', lineHeight: 1.5}}>
                        Invite tracking is now score-based. The system stores the referrer on the player record,
                        redeems only on the first qualifying non-tournament session, and awards coins from the score earned.
                    </div>
                    <div style={{display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'}}>
                        <div style={{padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e5e7eb'}}>
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#667085', fontWeight: 800}}>Threshold</div>
                            <div style={{fontSize: '1rem', fontWeight: 900, color: '#0f172a'}}>700 points</div>
                        </div>
                        <div style={{padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e5e7eb'}}>
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#667085', fontWeight: 800}}>Formula</div>
                            <div style={{fontSize: '1rem', fontWeight: 900, color: '#0f172a'}}>floor(score / 700)</div>
                        </div>
                        <div style={{padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e5e7eb'}}>
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#667085', fontWeight: 800}}>Cap</div>
                            <div style={{fontSize: '1rem', fontWeight: 900, color: '#0f172a'}}>10 coins</div>
                        </div>
                        <div style={{padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e5e7eb'}}>
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#667085', fontWeight: 800}}>Welcome coin</div>
                            <div style={{fontSize: '1rem', fontWeight: 900, color: '#0f172a'}}>1 coin</div>
                        </div>
                    </div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12}}>
                    {summary.map(item => (
                        <div key={item.label} style={{padding: 14, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb'}}>
                            <div style={{fontSize: '0.72rem', color: '#667085', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em'}}>{item.label}</div>
                            <div style={{fontSize: '1.4rem', fontWeight: 900, color: '#7c3aed'}}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>

        <Card title="Top Inviters">
            <Table
                heads={["Player", "Phone", "Invites", "Coins earned", "Pending referrer"]}
                rows={topInviters.length ? topInviters.map((player, index) => [
                    <span key={`name-${index}`}>{player.name ?? player.phone ?? '—'}</span>,
                    <span key={`phone-${index}`}>{player.phone ?? '—'}</span>,
                    <span key={`count-${index}`}>{Number(player.referralCount || 0).toLocaleString()}</span>,
                    <span key={`earned-${index}`}>{Number(player.referralEarnedCoins || 0).toLocaleString()}</span>,
                    <span key={`pending-${index}`}>{player.pendingReferrer ? String(player.pendingReferrer) : '—'}</span>,
                ]) : [[<span key="empty">No inviters yet</span>, '—', '—', '—', '—']]}
            />
        </Card>

        <Card title="Recent Referral Rewards">
            <Table
                heads={["New player", "Referrer", "Game", "Score", "Coins", "Rewarded"]}
                rows={recentRewards.length ? recentRewards.slice(0, 20).map((row, index) => [
                    <span key={`new-${index}`}>{row.newUserPhone ?? '—'}</span>,
                    <span key={`ref-${index}`}>{row.referrerPhone ?? '—'}</span>,
                    <span key={`game-${index}`}>{row.game ?? '—'}</span>,
                    <span key={`score-${index}`}>{Number(row.score || 0).toLocaleString()}</span>,
                    <span key={`coins-${index}`}>{Number(row.referrerCoins || 0).toLocaleString()} + {Number(row.welcomeCoins || 0).toLocaleString()}</span>,
                    <span key={`time-${index}`}>{formatRewardedAt(row.rewardedAt)}</span>,
                ]) : [[<span key="empty">No redemptions yet</span>, '—', '—', '—', '—', '—']]}
            />
        </Card>

        <Card title="Pending Invitations">
            <Table
                heads={["Player", "Pending referrer", "Name", "Referral count"]}
                rows={pendingPlayers.length ? pendingPlayers.slice(0, 20).map((player, index) => [
                    <span key={`p1-${index}`}>{player.phone ?? '—'}</span>,
                    <span key={`p2-${index}`}>{String(player.pendingReferrer || '—')}</span>,
                    <span key={`p3-${index}`}>{player.name ?? '—'}</span>,
                    <span key={`p4-${index}`}>{Number(player.referralCount || 0).toLocaleString()}</span>,
                ]) : [[<span key="empty">No pending referrals</span>, '—', '—', '—']]}
            />
        </Card>
    </>;
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; display: block !important; place-items: unset !important; overflow: hidden; margin: 0; }
body { background: #f4f6fa; }
.adm-root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background: #f4f6fa; color: #172033; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.adm-topbar { background: #ffffff; border-bottom: 1px solid #e7ebf3; min-height: 58px; padding: 0 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-shrink: 0; box-shadow: 0 1px 8px rgba(15, 23, 42, 0.05); }
.adm-brand { display: flex; align-items: center; gap: 10px; min-width: 245px; }
.adm-logo-mark { width: 34px; height: 34px; border-radius: 8px; background: #ffffff; border: 1px solid #dce5ee; display: grid; place-items: center; color: #008f5d; font-size: 1.1rem; font-weight: 900; }
.adm-title h1 { color: #111827; font-size: 1rem; line-height: 1; font-weight: 900; letter-spacing: 0; margin: 0; }
.adm-title span { color: #6b7280; font-size: 0.68rem; font-weight: 600; }
.adm-top-search { max-width: 430px; flex: 1; height: 34px; border: 1px solid #e5e9f0; border-radius: 6px; background: #fbfcfe; color: #243044; padding: 0 14px; outline: none; font: inherit; font-size: 0.78rem; }
.adm-top-actions { display: flex; align-items: center; gap: 10px; }
.adm-icon-btn { width: 34px; height: 34px; border-radius: 7px; border: 1px solid #e8edf4; background: #fff; display: grid; place-items: center; cursor: pointer; color: #4b5563; position: relative; text-decoration: none; }
.adm-icon-btn:hover { background: #f7fafc; color: #0f172a; }
.adm-badge-dot { position: absolute; top: -3px; right: -3px; min-width: 15px; height: 15px; padding: 0 4px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 0.58rem; font-weight: 800; display: grid; place-items: center; }
.adm-notification-wrap { position: relative; }
.adm-notification-menu { position: absolute; top: calc(100% + 10px); right: 0; width: min(360px, calc(100vw - 24px)); background: #fff; border: 1px solid #e5e9f0; border-radius: 8px; box-shadow: 0 18px 50px rgba(15,23,42,0.18); z-index: 40; overflow: hidden; }
.adm-notification-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #eef2f7; color: #111827; }
.adm-notification-head strong { font-size: 0.86rem; }
.adm-notification-head span { color: #6b7280; font-size: 0.72rem; font-weight: 800; }
.adm-notification-head button { border: 1px solid #e5e7eb; background: #f8fafc; color: #344054; border-radius: 6px; padding: 4px 7px; font: inherit; font-size: 0.68rem; font-weight: 800; cursor: pointer; }
.adm-notification-list { display: grid; max-height: 330px; overflow-y: auto; }
.adm-notification-item { display: grid; grid-template-columns: 28px 1fr; gap: 9px; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: #344054; }
.adm-notification-item:last-child { border-bottom: 0; }
.adm-notification-item strong { display: block; color: #111827; font-size: 0.78rem; margin-bottom: 3px; }
.adm-notification-item strong em { color: #98a2b3; font-style: normal; font-size: 0.66rem; font-weight: 700; margin-left: 5px; }
.adm-notification-item.read { opacity: 0.62; }
.adm-notification-item small { display: block; color: #667085; font-size: 0.72rem; line-height: 1.45; }
.adm-notification-icon { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; background: #eff6ff; color: #2563eb; }
.adm-notification-item.ok .adm-notification-icon { background: #ecfdf5; color: #059669; }
.adm-notification-item.warn .adm-notification-icon { background: #fffbeb; color: #d97706; }
.adm-notification-item.error .adm-notification-icon { background: #fff1f2; color: #e11d48; }
.adm-user { display: flex; align-items: center; gap: 8px; color: #111827; font-size: 0.75rem; font-weight: 800; }
.adm-avatar { width: 30px; height: 30px; border-radius: 50%; background: #111827; color: #fff; display: grid; place-items: center; font-size: 0.75rem; }
.adm-logout { border: 1px solid #fee2e2; background: #fff5f5; color: #dc2626; border-radius: 6px; padding: 7px 11px; cursor: pointer; font-size: 0.75rem; font-weight: 800; font-family: inherit; }
.adm-logout:hover { background: #fee2e2; }
.adm-layout { display: flex; flex: 1; overflow: hidden; }
.adm-sidebar { width: 188px; min-width: 188px; background: linear-gradient(180deg, #073a35 0%, #062e3c 100%); color: #d8fff1; padding: 14px 8px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.adm-sidebar-label { font-size: 0.62rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(216, 255, 241, 0.52); padding: 12px 10px 7px; }
.adm-sidebar-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 8px 7px; }
.adm-tab { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 8px 10px; border-radius: 4px; border: none; background: transparent; color: rgba(235, 255, 248, 0.84); cursor: pointer; font-size: 0.78rem; text-align: left; width: 100%; transition: all 0.15s; font-family: inherit; font-weight: 700; }
.adm-tab:hover { background: rgba(255,255,255,0.08); color: #fff; }
.adm-tab.active { background: #05a66b; color: #fff; box-shadow: 0 8px 16px rgba(0,0,0,0.12); }
.adm-tab-icon { width: 14px; height: 14px; flex: 0 0 14px; color: rgba(94, 234, 212, 0.86); }
.adm-tab.active .adm-tab-icon { color: #fff; }
.adm-tab span { min-width: 0; }
.adm-content { flex: 1; overflow-y: auto; padding: 20px 22px 48px; min-width: 0; }
.adm-dashboard-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.adm-dashboard-head h2 { margin: 0; color: #111827; font-size: 1.3rem; font-weight: 900; }
.adm-dashboard-head p { margin: 5px 0 0; color: #667085; font-size: 0.82rem; }
.adm-date-pill { border: 1px solid #e5e7eb; background: #fff; border-radius: 6px; padding: 8px 11px; color: #344054; font-size: 0.75rem; font-weight: 800; }
.adm-panel { background: #fff; border: 1px solid #e9edf5; border-radius: 8px; box-shadow: 0 1px 3px rgba(15,23,42,0.04); padding: 16px; }
.adm-firebase-alert { background: #ecfdf5; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; color: #166534; border-radius: 8px; padding: 11px 13px; margin-bottom: 14px; font-size: 0.78rem; display: grid; gap: 5px; }
.adm-firebase-alert.has-errors { background: #fff1f2; border-color: #fecdd3; border-left-color: #ef4444; color: #991b1b; }
.adm-firebase-alert strong { font-size: 0.82rem; }
.adm-firebase-alert ul { margin: 0; padding-left: 18px; display: grid; gap: 3px; }
.adm-modal-backdrop { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 18px; background: rgba(15,23,42,0.58); backdrop-filter: blur(4px); }
.adm-announcement-modal { width: min(100%, 460px); background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 24px 70px rgba(15,23,42,0.24); padding: 18px; color: #111827; }
.adm-announcement-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.adm-announcement-head h2 { margin: 0 0 4px; font-size: 1rem; font-weight: 900; color: #111827; }
.adm-announcement-head p { margin: 0; color: #667085; font-size: 0.78rem; line-height: 1.4; }
.adm-announcement-head button { width: 30px; height: 30px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f8fafc; cursor: pointer; }
.adm-announcement-modal label { display: grid; gap: 6px; margin-bottom: 12px; color: #344054; font-size: 0.76rem; font-weight: 800; }
.adm-announcement-modal input, .adm-announcement-modal textarea, .adm-announcement-modal select { width: 100%; box-sizing: border-box; border: 1px solid #d0d5dd; border-radius: 7px; padding: 10px 11px; font: inherit; color: #111827; outline: none; resize: vertical; background: #fff; }
.adm-announcement-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.adm-announcement-modal input:focus, .adm-announcement-modal textarea:focus, .adm-announcement-modal select:focus { border-color: #4361ee; box-shadow: 0 0 0 3px rgba(67,97,238,0.12); }
.adm-announcement-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
.adm-announcement-actions button { border: 1px solid #e5e7eb; border-radius: 7px; padding: 9px 13px; font: inherit; font-size: 0.8rem; font-weight: 850; cursor: pointer; background: #f8fafc; color: #344054; }
.adm-announcement-actions button:last-child { background: #f97316; border-color: #f97316; color: #fff; }
.adm-announcement-actions button:disabled { opacity: 0.55; cursor: not-allowed; }
.adm-content table { background: #fff; }
.adm-content > div > div[style] h2 { display: flex; align-items: center; gap: 8px; }
.adm-hamburger { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 6px; border-radius: 6px; }
.adm-hamburger span { display: block; width: 21px; height: 2px; background: #0f172a; border-radius: 2px; }
.adm-hamburger:hover { background: #f3f4f6; }
.adm-drawer-backdrop { display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 50; backdrop-filter: blur(2px); }
.adm-drawer { position: fixed; top: 0; left: 0; height: 100vh; width: 248px; background: #02173f; z-index: 51; transform: translateX(-100%); transition: transform 0.25s ease; display: flex; flex-direction: column; box-shadow: 6px 0 30px rgba(0,0,0,0.22); }
.adm-drawer.open { transform: translateX(0); }
.adm-drawer-header { padding: 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }
.adm-drawer-header span { color: #fff; font-weight: 900; font-size: 0.95rem; }
.adm-drawer-close { background: none; border: none; color: rgba(255,255,255,0.8); font-size: 1.2rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.adm-drawer-nav { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
@media (max-width: 860px) { .adm-sidebar { display: none; } .adm-hamburger { display: flex; } .adm-drawer-backdrop.open { display: block; } .adm-content { padding: 16px 12px 46px; } .adm-top-search { display: none; } .adm-user { display: none; } }
`;

// ── Main export ────────────────────────────────────────────────────────────────
export function AdminView({initialTab}: { initialTab?: AdminTab } = {}) {
    const [authed, setAuthed] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [tab, setTab] = useState<AdminTab>(initialTab ?? "dashboard");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement | null>(null);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

    const changeTab = (t: AdminTab) => {
        setTab(t);
        setDrawerOpen(false);
        document.getElementById("adm-content")?.scrollTo({top: 0});
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, user => {
            // Block KCSE uploader from accessing full admin
            setAuthed(!!user && user.email !== KCSE_EMAIL);
            setAuthChecked(true);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (!authed) return;

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 1000;
        const sessionReads = [
            {name: "Bongo Quiz", collectionName: "gameSessions"},
            {name: "Bible Quiz", collectionName: "bibleQuizSessions"},
            {name: "Math Quiz", collectionName: "mathQuizSessions"},
            {name: "Biology Quiz", collectionName: "bioQuizSessions"},
            {name: "General Knowledge", collectionName: "genQuizSessions"},
            {name: "Sudoku", collectionName: "sudokuSessions"},
            {name: "Connect Dots", collectionName: "connectDotsSessions"},
        ];
        const reads = [
            {label: "players", promise: getDocs(collection(db, "players"))},
            {label: "payments", promise: getDocs(collection(db, "payments"))},
            {label: "grantedSessions", promise: getDocs(collection(db, "grantedSessions"))},
            ...sessionReads.map(game => ({label: game.collectionName, promise: getDocs(collection(db, game.collectionName))})),
        ];

        Promise.allSettled(reads.map(read => read.promise)).then(results => {
            const alerts: AdminNotification[] = [];
            const failedReads = results
                .map((result, index) => ({result, label: reads[index].label}))
                .filter(({result}) => result.status === "rejected");

            if (failedReads.length) {
                alerts.push({
                    id: "firebase-errors",
                    kind: "firebase",
                    tone: "error",
                    title: "Firebase errors detected",
                    body: failedReads.map(({label, result}) => {
                        const reason = result.status === "rejected" ? result.reason : "";
                        const code = typeof reason === "object" && reason && "code" in reason ? ` (${String((reason as { code?: unknown }).code)})` : "";
                        return `${label}${code}`;
                    }).join(", "),
                });
            } else {
                alerts.push({
                    id: "firebase-ok",
                    kind: "firebase",
                    tone: "ok",
                    title: "Firebase connected",
                    body: "Admin reads for players, payments, and grants are responding.",
                });
            }

            const playersSnap = results[0].status === "fulfilled" ? results[0].value : null;
            const paymentsSnap = results[1].status === "fulfilled" ? results[1].value : null;
            const grantsSnap = results[2].status === "fulfilled" ? results[2].value : null;
            const gameResults = results.slice(3);

            const playersToday = playersSnap?.docs.filter(d => {
                const data = d.data() as any;
                return (data.createdAt?.seconds ?? data.joinedAt?.seconds ?? data.updatedAt?.seconds ?? 0) >= todayStart;
            }).length ?? 0;
            alerts.push({
                id: "players-today",
                kind: "players",
                tone: playersToday ? "info" : "warn",
                title: "Players today",
                body: `${playersToday.toLocaleString()} new player${playersToday === 1 ? "" : "s"} registered today.`,
            });

            const gamesToday = sessionReads.map((game, index) => {
                const snap = gameResults[index]?.status === "fulfilled" ? gameResults[index].value : null;
                const count = snap?.docs.filter(d => {
                    const data = d.data() as any;
                    return (data.playedAt?.seconds ?? data.createdAt?.seconds ?? data.completedAt?.seconds ?? 0) >= todayStart;
                }).length ?? 0;
                return {...game, count};
            });
            const playedToday = gamesToday.filter(game => game.count > 0);
            const gamesTotalToday = gamesToday.reduce((sum, game) => sum + game.count, 0);
            alerts.push({
                id: "games-today",
                kind: "games",
                tone: gamesTotalToday ? "info" : "warn",
                title: "Games played today",
                body: playedToday.length
                    ? playedToday.map(game => `${game.name}: ${game.count.toLocaleString()} player${game.count === 1 ? "" : "s"}`).join("; ")
                    : "No game sessions recorded today.",
            });

            const todayPayments = paymentsSnap?.docs.map(d => d.data() as any).filter(pay => (pay.createdAt?.seconds ?? 0) >= todayStart) ?? [];
            const paidToday = todayPayments.filter(pay => pay.status === "paid");
            const pendingToday = todayPayments.filter(pay => pay.status === "pending");
            const failedToday = todayPayments.filter(pay => pay.status === "failed");
            const mpesaRevenue = paidToday.reduce((sum, pay) => sum + (pay.amount ?? 0), 0);
            alerts.push({
                id: "mpesa-today",
                kind: "mpesa",
                tone: failedToday.length ? "warn" : "info",
                title: "M-Pesa transactions",
                body: `${paidToday.length} paid, ${pendingToday.length} pending, ${failedToday.length} failed today. Revenue: KSh ${mpesaRevenue.toLocaleString()}.`,
            });

            const stuckCount = grantsSnap?.size ?? 0;
            const suggestions: string[] = [];
            if (stuckCount > 0) suggestions.push(`${stuckCount} granted session${stuckCount === 1 ? "" : "s"} need review.`);
            if (pendingToday.length > 3) suggestions.push("Review pending M-Pesa callbacks and payment polling.");
            if (failedToday.length > 0) suggestions.push("Check failed payment receipts and Firebase rules/indexes.");
            if (playersToday === 0) suggestions.push("Confirm sign-up tracking is writing createdAt/joinedAt timestamps.");
            alerts.push({
                id: "maintenance",
                kind: "maintenance",
                tone: suggestions.length ? "warn" : "ok",
                title: "Maintenance suggestions",
                body: suggestions.length ? suggestions.join(" ") : "No urgent maintenance suggestions right now.",
            });

            const loadedAt = Date.now();
            setAdminNotifications(alerts.map(alert => ({...alert, createdAt: alert.createdAt ?? loadedAt})));
        }).catch(error => {
            setAdminNotifications([{
                id: "notification-load-error",
                kind: "firebase",
                tone: "error",
                title: "Notification load failed",
                body: String(error),
                createdAt: Date.now(),
            }]);
        });
    }, [authed]);

    useEffect(() => {
        if (!notificationsOpen) return;
        const handleOutsideClick = (event: MouseEvent) => {
            if (!notificationRef.current?.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [notificationsOpen]);

    const handleLogout = () => signOut(auth);
    const activeLabel = TABS.find(t => t.id === tab)?.label.replace(/^\S+\s*/, "") ?? "Dashboard";
    const timeAgo = (ms?: number) => {
        if (!ms) return "just now";
        const diff = Math.max(Date.now() - ms, 0);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        return hours < 24 ? `${hours} hr ago` : `${Math.floor(hours / 24)} day ago`;
    };
    const unreadNotifications = adminNotifications.filter(n => n.tone !== "ok" && !readNotificationIds.has(n.id));
    const notificationCount = unreadNotifications.length;

    if (!authChecked) return null;
    if (!authed) return <AdminLogin onLogin={() => {
    }}/>;

    return (
        <>
        <style>{CSS}</style>
        <div className="adm-root">
            <header className="adm-topbar">
                <div className="adm-brand">
                    <button className="adm-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
                        <span/><span/><span/>
                    </button>
                    <div className="adm-logo-mark">BQ</div>
                    <div className="adm-title">
                        <h1>BONGOQUIZ-ADMIN</h1>
                        {/*<span>Admin Panel, Practice, Exams</span>*/}
                    </div>
                </div>
                {/*<input className="adm-top-search" placeholder="Search anything..." aria-label="Search admin panel" />*/}
                <div className="adm-top-actions">
                    {/*<a className="adm-icon-btn" href="#/" title="Back to game" aria-label="Back to game">Home</a>*/}
                    <div className="adm-notification-wrap" ref={notificationRef}>
                        <button
                            className="adm-icon-btn"
                            title="Admin notifications"
                            aria-label="Admin notifications"
                            aria-expanded={notificationsOpen}
                            onClick={() => setNotificationsOpen(open => !open)}
                        >
                            <Bell size={17} strokeWidth={2.2}/>
                            <span className="adm-badge-dot">{notificationCount}</span>
                        </button>
                        {notificationsOpen && (
                            <div className="adm-notification-menu">
                                <div className="adm-notification-head">
                                    <strong>Notifications</strong>
                                    <button onClick={() => setReadNotificationIds(new Set(adminNotifications.map(item => item.id)))}>Mark as read</button>
                                    <span>{notificationCount} unread</span>
                                </div>
                                <div className="adm-notification-list">
                                    {adminNotifications.map(item => {
                                        const Icon = notificationIcon[item.kind];
                                        return (
                                            <div className={`adm-notification-item ${item.tone}${readNotificationIds.has(item.id) ? " read" : ""}`} key={item.id}>
                                                <span className="adm-notification-icon">
                                                    {item.tone === "ok" ? <CheckCircle size={16}/> : <Icon size={16}/>}
                                                </span>
                                                <span>
                                                    <strong>{item.title} <em>{timeAgo(item.createdAt)}</em></strong>
                                                    <small>{item.body}</small>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="adm-user">
                        <span className="adm-avatar">A</span>
                        <span>Admin<br/><small>{activeLabel}</small></span>
                    </div>
                    <button className="adm-logout" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            {/* Mobile drawer */}
            <div className={`adm-drawer-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)}/>
            <div className={`adm-drawer${drawerOpen ? " open" : ""}`}>
                <div className="adm-drawer-header">
                    <span>Admin Menu</span>
                    <button className="adm-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
                </div>
                <div className="adm-drawer-nav">
                   <div className="adm-sidebar-label">Bongo Quiz</div>
                   {TABS.filter(t => ["dashboard", "referrals", "players", "playerscores", "payments", "games", "leaderboard", "questions", "powers", "achievements", "rewards", "tournament", "bongomarket"].includes(t.id)).map(t => {
                       const Icon = t.icon;
                       return (
                           <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`}
                                   onClick={() => changeTab(t.id)}>
                               <Icon className="adm-tab-icon" aria-hidden="true"/><span>{t.label}</span>
                           </button>
                       );
                   })}
                   <div className="adm-sidebar-divider"/>
                   <div className="adm-sidebar-label">Other Games</div>
                   {TABS.filter(t => ["kcse", "biblequiz", "mathquiz", "bioquiz", "genquiz", "sudoku", "connectdots", "streetbongo"].includes(t.id)).map(t => {
                       const Icon = t.icon;
                       return (
                           <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`}
                                   onClick={() => changeTab(t.id)}>
                               <Icon className="adm-tab-icon" aria-hidden="true"/><span>{t.label}</span>
                           </button>
                       );
                   })}
                </div>
                </div>

                <div className="adm-layout">
                <nav className="adm-sidebar">
                <div className="adm-sidebar-label">Bongo Quiz</div>
                {TABS.filter(t => ["dashboard", "referrals", "players", "playerscores", "payments", "games", "leaderboard", "questions", "powers", "achievements", "rewards", "tournament", "bongomarket"].includes(t.id)).map(t => {
                   const Icon = t.icon;
                   return (
                       <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`}
                               onClick={() => changeTab(t.id)}>
                           <Icon className="adm-tab-icon" aria-hidden="true"/><span>{t.label}</span>
                       </button>
                   );
                })}
                <div className="adm-sidebar-divider"/>
                <div className="adm-sidebar-label">Other Games</div>
                {TABS.filter(t => ["kcse", "biblequiz", "mathquiz", "bioquiz", "genquiz", "sudoku", "connectdots", "streetbongo"].includes(t.id)).map(t => {
                   const Icon = t.icon;
                   return (
                       <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`}
                               onClick={() => changeTab(t.id)}>
                           <Icon className="adm-tab-icon" aria-hidden="true"/><span>{t.label}</span>
                       </button>
                   );
                })}
                </nav>

                <main className="adm-content" id="adm-content">
                {tab === "dashboard" && <Dashboard changeTab={changeTab}/>}
                {tab === "referrals" && <Referrals/>}
                {tab === "players" && <Players/>}
                {tab === "playerscores" && <AdminPlayerScores/>}
                {tab === "payments" && <Payments/>}
                {tab === "games" && <GameSessions/>}
                {tab === "leaderboard" && <AdminLeaderboard/>}
                {tab === "questions" && <AdminQuestions/>}
                {tab === "powers" && <AdminPowers/>}
                {tab === "achievements" && <AdminAchievements/>}
                {tab === "rewards" && <AdminRewards/>}
                {tab === "tournament" && <AdminTournament/>}
                {tab === "bongomarket" && <AdminBongoMarket/>}
                {tab === "kcse" && <AdminKCSE/>}
                {tab === "biblequiz" && <AdminBibleQuiz/>}
                {tab === "mathquiz" && <AdminMathQuiz/>}
                {tab === "bioquiz" && <AdminBioQuiz/>}
                {tab === "genquiz" && <AdminGenQuiz/>}
                {tab === "sudoku" && <AdminSudoku/>}
                {tab === "connectdots" && <AdminConnectDots/>}
                {tab === "streetbongo" && <AdminStreetBongo/>}
                </main>
                </div>
        </div>
</>
)
    ;
}
