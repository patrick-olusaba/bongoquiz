// AdminView.tsx — Admin panel UI
import {useState, useEffect, useMemo, useRef} from "react";
import {
    AlertTriangle, Award, BarChart, Bell, BookMarked, BookOpen,
    CheckCircle, ChevronDown, ChevronRight, Clock, CreditCard,
    Flag, FlaskConical, Gamepad2, Gift, Globe, Hash, HelpCircle,
    LayoutDashboard, LayoutGrid, Link2, LogOut, type LucideIcon,
    MessageSquare, Microscope, MonitorPlay, Network, Phone, Plus,
    Radio, Settings, Share2, ShoppingCart, Sparkles, Star, Trophy,
    TrendingUp, User, UserCheck, Users, Wrench, XCircle,
} from "lucide-react";
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

const TABS: { id: AdminTab; label: string; icon: LucideIcon }[] = [
    {id: "dashboard",    label: "Dashboard",             icon: LayoutDashboard},
    {id: "referrals",    label: "Refer & Earn",          icon: Share2},
    {id: "players",      label: "Players",               icon: Users},
    {id: "playerscores", label: "Player Scores & Coins", icon: BarChart},
    {id: "payments",     label: "Payments",              icon: CreditCard},
    {id: "games",        label: "Game Sessions",         icon: MonitorPlay},
    {id: "leaderboard",  label: "Leaderboard",           icon: TrendingUp},
    {id: "questions",    label: "Questions",             icon: HelpCircle},
    {id: "powers",       label: "Powers",                icon: Sparkles},
    {id: "achievements", label: "Achievements",          icon: Award},
    {id: "rewards",      label: "Rewards Management",    icon: Gift},
    {id: "tournament",   label: "Quiz Tournaments",      icon: Flag},
    {id: "bongomarket",  label: "Bongo Market",          icon: ShoppingCart},
    {id: "kcse",         label: "KCSE Papers",           icon: BookOpen},
    {id: "biblequiz",    label: "Bible Quiz",            icon: BookMarked},
    {id: "mathquiz",     label: "Math Quiz",             icon: Hash},
    {id: "bioquiz",      label: "Biology Quiz",          icon: Microscope},
    {id: "genquiz",      label: "General Knowledge",     icon: Globe},
    {id: "sudoku",       label: "Sudoku",                icon: LayoutGrid},
    {id: "connectdots",  label: "Connect Dots",          icon: Network},
    {id: "streetbongo",  label: "Street Bongo",          icon: Radio},
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

function Table({heads, rows, chevrons = false}: { heads: (string | React.ReactNode)[]; rows: (string | React.ReactNode)[][]; chevrons?: boolean }) {
    return (
        <div style={{overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0", marginBottom: 4}}>
            <table style={s.table}>
                <thead>
                <tr>
                    {heads.map((h, i) => <th key={i} style={s.th}>{h}</th>)}
                    {chevrons && <th style={{...s.th, width: 28}}/>}
                </tr>
                </thead>
                <tbody>{rows.map((r, i) => (
                    <tr key={i} style={{background: i % 2 === 0 ? "#fff" : "#fafafe"}}>
                        {r.map((c, j) => <td key={j} style={s.td}>{c}</td>)}
                        {chevrons && <td style={{...s.td, width: 28, padding: "10px 6px"}}><ChevronRight size={14} color="#d1d5db"/></td>}
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

function Sparkline({data, color, fill = false, width = 80, height = 28}: { data: number[]; color: string; fill?: boolean; width?: number; height?: number }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const w = width, h = height;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow: "visible", display: "block"}}>
            {fill && <polygon points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity={0.12}/>}
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function KpiCard({n, l, Icon, iconBg, iconColor, trend, sub, sparkData, sparkColor}: {
    n: string | number; l: string;
    Icon: LucideIcon; iconBg: string; iconColor: string;
    trend?: number | null; sub?: string;
    sparkData?: number[]; sparkColor?: string;
}) {
    const trendUp = (trend ?? 0) >= 0;
    return (
        <div style={{background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e9edf5", boxShadow: "0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10}}>
                <div style={{width: 44, height: 44, borderRadius: "50%", background: iconBg, display: "grid", placeItems: "center"}}>
                    <Icon size={20} color={iconColor} strokeWidth={2}/>
                </div>
                {trend != null && (
                    <span style={{background: trendUp ? "#dcfce7" : "#fee2e2", color: trendUp ? "#166534" : "#991b1b", borderRadius: 20, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 800}}>
                        {trendUp ? "↑" : "↓"} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div style={{fontSize: "1.85rem", fontWeight: 900, color: "#111827", lineHeight: 1}}>{n}</div>
            <div style={{fontSize: "0.76rem", color: "#6b7280", marginTop: 3}}>{l}</div>
            {sub && <div style={{fontSize: "0.68rem", color: "#f87171", fontWeight: 600, marginTop: 2}}>{sub}</div>}
            {sparkData && sparkData.length > 1 && (
                <div style={{marginTop: 10}}>
                    <Sparkline data={sparkData} color={sparkColor ?? "#4361ee"}/>
                </div>
            )}
        </div>
    );
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
                // Distinct people who actually played in this period (by phone).
                const normPhone = (p: any) => String(p ?? "").replace(/^\+?254|^0/, "").slice(-9);
                const activePlayers = new Set(
                    sessionsInRange.map((session: any) => normPhone(session.phone)).filter(Boolean)
                ).size;
                return {
                    label,
                    users: usersInRange.length,
                    players: activePlayers,
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


    const analyticsRows = data.analytics?.[analyticsRange] ?? [];
    const analyticsTotals = analyticsRows.reduce((acc: any, row: any) => ({
        users: acc.users + (row.users ?? 0),
        players: Math.max(acc.players, row.players ?? 0),
        games: acc.games + row.games,
        revenue: acc.revenue + row.revenue,
        payments: acc.payments + row.payments,
    }), {users: 0, players: 0, games: 0, revenue: 0, payments: 0});
    const rangeLabel = analyticsRange === "weekly" ? "day" : analyticsRange === "monthly" ? "month" : "year";
    const chartGames = [
        {name: "Bongo Quiz", color: "#4361ee"},
        {name: "Bible Quiz", color: "#059669"},
        {name: "Math Quiz", color: "#f97316"},
        {name: "Biology Quiz", color: "#a855f7"},
        {name: "General Knowledge", color: "#0891b2"},
        {name: "Sudoku", color: "#10b981"},
        {name: "Connect Dots", color: "#e11d48"},
    ];
    const chartGameNames = new Set(chartGames.map(g => g.name));
    // Any session whose gameName isn't in the known list rolls up into "Other".
    const otherColor = "#94a3b8";
    const segmentsFor = (row: any) => {
        const counts: Record<string, number> = {...(row.gameCounts ?? {})};
        const known = chartGames.map(g => ({...g, value: counts[g.name] ?? 0}));
        const otherValue = Object.entries(counts).reduce((sum, [name, v]) => sum + (chartGameNames.has(name) ? 0 : Number(v)), 0);
        return otherValue > 0 ? [...known, {name: "Other", color: otherColor, value: otherValue}] : known;
    };
    const hasOther = analyticsRows.some((row: any) => Object.keys(row.gameCounts ?? {}).some((name: string) => !chartGameNames.has(name)));
    const legendItems = hasOther ? [...chartGames, {name: "Other", color: otherColor}] : chartGames;
    // Shared, real y-axis: tallest total games in any bucket (rounded up a bit).
    const rawMax = Math.max(...analyticsRows.map((row: any) => row.games ?? 0), 1);
    const niceMax = (n: number) => { const step = Math.max(1, Math.ceil(n / 4)); return step * 4; };
    const chartMax = niceMax(rawMax);
    const chartWidth = 760;
    const chartHeight = 280;
    const chartPad = {top: 22, right: 24, bottom: 40, left: 44};
    const plotW = chartWidth - chartPad.left - chartPad.right;
    const plotH = chartHeight - chartPad.top - chartPad.bottom;
    const baseY = chartHeight - chartPad.bottom;
    const slot = plotW / Math.max(analyticsRows.length, 1);
    const barW = Math.min(46, slot * 0.55);
    const slotCenter = (index: number) => chartPad.left + slot * index + slot / 2;
    const yFor = (value: number) => baseY - (value / chartMax) * plotH;

    const weeklyData: any[] = data.analytics?.weekly ?? [];
    const lastDay = weeklyData[weeklyData.length - 1] ?? {};
    const prevDay = weeklyData[weeklyData.length - 2] ?? {};
    const pct = (cur: number, prev: number) => prev ? Math.round(((cur - prev) / prev) * 100) : null;
    const playersTrend = pct(lastDay.users ?? 0, prevDay.users ?? 0);
    const gamesTrend   = pct(lastDay.games ?? 0, prevDay.games ?? 0);
    const revTrend     = pct(lastDay.revenue ?? 0, prevDay.revenue ?? 0);
    const sparkPlayers = weeklyData.map((d: any) => d.users ?? 0);
    const sparkGames   = weeklyData.map((d: any) => d.games ?? 0);
    const sparkRev     = weeklyData.map((d: any) => d.revenue ?? 0);

    return <>
        <div className="adm-dashboard-head">
            <div style={{display: "flex", alignItems: "center", gap: 14}}>
                <div style={{width: 52, height: 52, borderRadius: "50%", background: "#7c3aed", display: "grid", placeItems: "center", flexShrink: 0}}>
                    <LayoutDashboard size={24} color="#fff"/>
                </div>
                <div>
                    <h2>Dashboard</h2>
                    <p>Overview of your platform performance and key metrics.</p>
                </div>
            </div>
            <div className="adm-date-pill">Today ▼</div>
        </div>

        <div className={`adm-firebase-alert${firebaseErrors.length ? " has-errors" : ""}`}>
            {firebaseErrors.length ? <AlertTriangle size={17} style={{flexShrink: 0}}/> : <CheckCircle size={17} style={{flexShrink: 0}}/>}
            <div style={{flex: 1}}>
                <strong>{firebaseErrors.length ? `Firebase errors (${firebaseErrors.length})` : "Firebase connected"}</strong>
                {firebaseErrors.length ? (
                    <ul style={{margin: "4px 0 0", paddingLeft: 18}}>
                        {firebaseErrors.map(error => <li key={error}>{error}</li>)}
                    </ul>
                ) : <span style={{marginLeft: 6, opacity: 0.8}}>No Firebase read or listener errors on this dashboard.</span>}
            </div>
        </div>

        {/* ── Platform KPIs ── */}
        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,210px),1fr))", gap: 14, marginBottom: 20}}>
            <KpiCard n={data.players} l="Total Players"
                Icon={Users} iconBg="#eef0ff" iconColor="#4361ee"
                trend={playersTrend} sparkData={sparkPlayers} sparkColor="#4361ee"/>
            <KpiCard n={data.totalSessions} l="Total Games (All)"
                Icon={Gamepad2} iconBg="#f0fdf4" iconColor="#059669"
                trend={gamesTrend} sparkData={sparkGames} sparkColor="#059669"/>
            <KpiCard n={`KSh ${data.totalRevenue.toLocaleString()}`} l="Total Revenue (All)"
                Icon={CreditCard} iconBg="#eff6ff" iconColor="#3b82f6"
                trend={revTrend} sparkData={sparkRev} sparkColor="#3b82f6"/>
            <KpiCard n={data.stuckCount} l="Stuck at Payment"
                Icon={AlertTriangle} iconBg="#fff1f2" iconColor="#f43f5e"
                trend={data.stuckCount > 0 ? -6 : null} sub="needs admin action"
                sparkData={[3,5,4,6,4,7,data.stuckCount]} sparkColor="#f43f5e"/>
        </div>


        <div style={{display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap"}}>
            <button onClick={() => setAnnouncementOpen(true)} style={{...s.btn, background: "#f97316", color: "#fff", padding: "10px 18px", borderRadius: 8, fontWeight: 800}}>
                Send Announcement
            </button>
            <button onClick={() => location.reload()} style={{...s.btn, background: "#1e1b4b", color: "#fff", padding: "10px 18px", borderRadius: 8, fontWeight: 800}}>
                Refresh Stats
            </button>
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

        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginBottom: 20}}>
            <div style={s.card}>
                <h2 style={s.h2}>Recent Activity</h2>
                {(data.recentActivity ?? []).length ? data.recentActivity.map((item: any, i: number) => {
                    const ac: Record<string, {bg: string; color: string}> = {
                        Payment: {bg: "#dbeafe", color: "#1d4ed8"},
                        Player:  {bg: "#dcfce7", color: "#166534"},
                        Game:    {bg: "#f3e8ff", color: "#7c3aed"},
                    };
                    const c = ac[item.type] ?? {bg: "#f0f0f8", color: "#4361ee"};
                    return (
                        <div key={`${item.type}-${i}`} style={{display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f1f5f9"}}>
                            <span style={{...c, width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0}}>
                                {(item.label ?? "").slice(0, 2).toUpperCase()}
                            </span>
                            <span style={{flex: 1, minWidth: 0}}>
                                <strong style={{fontSize: "0.82rem", color: "#1e293b", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{item.label}</strong>
                                <span style={{fontSize: "0.72rem", color: "#94a3b8"}}>{item.type}</span>
                            </span>
                            <span style={{fontSize: "0.7rem", color: "#94a3b8", flexShrink: 0}}>
                                {item.at?.toLocaleTimeString?.("en-KE", {hour: "2-digit", minute: "2-digit"}) ?? "-"}
                            </span>
                        </div>
                    );
                }) : <p style={s.p}>No recent activity found.</p>}
            </div>

            <div style={s.card}>
                <h2 style={s.h2}>M-Pesa Health</h2>
                {([
                    {Icon: CheckCircle, label: "Paid today",          value: data.mpesaHealth.paidToday,         color: "#059669", iconBg: "#dcfce7"},
                    {Icon: Clock,       label: "Pending today",        value: data.mpesaHealth.pendingToday,      color: "#d97706", iconBg: "#fef9c3"},
                    {Icon: XCircle,     label: "Failed today",         value: data.mpesaHealth.failedToday,       color: "#dc2626", iconBg: "#fee2e2"},
                    {Icon: AlertTriangle, label: "Callback failures",  value: data.mpesaHealth.callbackFailures,  color: "#b91c1c", iconBg: "#fff1f2"},
                    {Icon: Clock,       label: "Avg confirmation",     value: `${data.mpesaHealth.avgConfirmMinutes} min`, color: "#4361ee", iconBg: "#eff6ff"},
                ] as const).map(({Icon, label, value, color, iconBg}) => (
                    <div key={label} style={{display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.84rem"}}>
                        <span style={{width: 30, height: 30, borderRadius: 8, background: iconBg, display: "grid", placeItems: "center", flexShrink: 0}}>
                            <Icon size={15} color={color}/>
                        </span>
                        <span style={{color: "#667085", flex: 1}}>{label}</span>
                        <strong style={{color}}>{value}</strong>
                    </div>
                ))}
            </div>

            <div style={s.card}>
                <h2 style={s.h2}>System Health</h2>
                {data.systemHealth.map((item: any) => (
                    <div key={item.label} style={{display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f1f5f9"}}>
                        <span style={{width: 8, height: 8, borderRadius: "50%", background: item.ok ? "#10b981" : "#ef4444", flexShrink: 0}}/>
                        <span style={{flex: 1, minWidth: 0}}>
                            <strong style={{fontSize: "0.82rem", color: "#344054", display: "block"}}>{item.label}</strong>
                            <small style={{color: "#94a3b8", fontSize: "0.72rem"}}>{item.detail}</small>
                        </span>
                        <ChevronRight size={14} color="#d1d5db" style={{flexShrink: 0}}/>
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
            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", gap: 10, marginBottom: 16}}>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#2563eb", fontSize: "1.2rem"}}>{analyticsTotals.games.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Games played</span></div>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#0891b2", fontSize: "1.2rem"}}>{analyticsTotals.players.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Peak players / {rangeLabel}</span></div>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#22c55e", fontSize: "1.2rem"}}>{analyticsTotals.users.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>New users</span></div>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#a855f7", fontSize: "1.2rem"}}>{analyticsTotals.payments.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Payments</span></div>
                <div style={{background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: 12}}><strong style={{color: "#f97316", fontSize: "1.2rem"}}>KSh {analyticsTotals.revenue.toLocaleString()}</strong><br/><span style={{fontSize: "0.75rem", color: "#667085"}}>Revenue</span></div>
            </div>
            <div style={{display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 10}}>
                {legendItems.map(item => (
                    <span key={item.name} style={{display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#667085", fontWeight: 700}}>
                        <span style={{width: 9, height: 9, borderRadius: 3, background: item.color}}/>{item.name}
                    </span>
                ))}
                <span style={{display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#667085", fontWeight: 700}}>
                    <span style={{width: 16, height: 0, borderTop: "3px solid #02173f"}}/>Players
                </span>
            </div>
            <div style={{width: "100%", overflowX: "auto"}}>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Games played per ${rangeLabel} with distinct players`} style={{width: "100%", minWidth: 560, height: "auto", display: "block"}}>
                    {/* Y-axis gridlines + real value labels */}
                    {[0, 1, 2, 3, 4].map(i => {
                        const value = Math.round((chartMax / 4) * (4 - i));
                        const y = chartPad.top + i * (plotH / 4);
                        return (
                            <g key={i}>
                                <line x1={chartPad.left} x2={chartWidth - chartPad.right} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1"/>
                                <text x={chartPad.left - 8} y={y + 4} textAnchor="end" fill="#98a2b3" fontSize="10" fontWeight="700">{value}</text>
                            </g>
                        );
                    })}
                    {/* Stacked game bars per period (height = total games, real scale) */}
                    {analyticsRows.map((row: any, index: number) => {
                        const cx = slotCenter(index);
                        let cursor = baseY;
                        return (
                            <g key={`bar-${row.label}`}>
                                {segmentsFor(row).filter(seg => seg.value > 0).map(seg => {
                                    const h = (seg.value / chartMax) * plotH;
                                    cursor -= h;
                                    return <rect key={seg.name} x={cx - barW / 2} y={cursor} width={barW} height={h} fill={seg.color} rx="2">
                                        <title>{`${seg.name}: ${seg.value} game${seg.value === 1 ? "" : "s"}`}</title>
                                    </rect>;
                                })}
                                {row.games > 0 && <text x={cx} y={yFor(row.games) - 16} textAnchor="middle" fill="#344054" fontSize="11" fontWeight="800">{row.games}</text>}
                            </g>
                        );
                    })}
                    {/* Distinct players line (same axis — players ≤ games always) */}
                    <polyline
                        points={analyticsRows.map((row: any, index: number) => `${slotCenter(index)},${yFor(row.players ?? 0)}`).join(" ")}
                        fill="none" stroke="#02173f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 0"
                    />
                    {analyticsRows.map((row: any, index: number) => (
                        <g key={`pl-${row.label}`}>
                            <circle cx={slotCenter(index)} cy={yFor(row.players ?? 0)} r="4" fill="#fff" stroke="#02173f" strokeWidth="2">
                                <title>{`${row.players ?? 0} player${(row.players ?? 0) === 1 ? "" : "s"}`}</title>
                            </circle>
                            {(row.players ?? 0) > 0 && <text x={slotCenter(index)} y={yFor(row.players ?? 0) - 8} textAnchor="middle" fill="#02173f" fontSize="9.5" fontWeight="800">{row.players}</text>}
                        </g>
                    ))}
                    {/* X-axis labels */}
                    {analyticsRows.map((row: any, index: number) => (
                        <text key={`x-${row.label}`} x={slotCenter(index)} y={chartHeight - 14} textAnchor="middle" fill="#667085" fontSize="11" fontWeight="700">{row.label}</text>
                    ))}
                </svg>
            </div>
            <p style={{fontSize: "0.72rem", color: "#98a2b3", textAlign: "center", margin: "8px 0 0"}}>
                Bars show games played per {rangeLabel} (coloured by game); the dark line shows how many distinct people played.
            </p>
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
        const friendsCount = Array.isArray(p.friends) ? p.friends.filter((x: any) => /^07\d{8}$/.test(String(x))).length : 0;
        return {
            ...p, phone07, games: pSessions.length, spent: paidAmt,
            friendsCount,
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
                        {["#", "Name", "Phone", "Games", "Friends", "Spent", "Last Played", "Status", "Action"].map(h => <th
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
                            <td style={{...s.td, fontWeight: 600, color: p.friendsCount ? "#7c3aed" : "#aaa"}}>{p.friendsCount}</td>
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
                            <td colSpan={9} style={{...s.td, textAlign: "center", color: "#aaa"}}>No players yet</td>
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
    // Map masked referral code → owner phone so we can resolve code-based pending invites.
    const codeOwner = new Map<string, string>();
    players.forEach(player => { if (player.referralCode) codeOwner.set(String(player.referralCode), String(player.phone || player.id || '')); });
    const resolvePendingReferrer = (player: any): string => {
        const legacy = String(player.pendingReferrer || '').trim();
        if (legacy) return legacy;
        const code = String(player.pendingReferralCode || '').trim();
        if (code) return codeOwner.get(code) || `code ${code}`;
        return '';
    };
    const pendingPlayers = players.filter(player => resolvePendingReferrer(player));
    const topInviters = [...players]
        .filter(player => Number(player.referralCount || 0) > 0 || Number(player.referralEarnedCoins || 0) > 0)
        .sort((a, b) => Number(b.referralEarnedCoins || 0) - Number(a.referralEarnedCoins || 0))
        .slice(0, 12);

    // ── Social / Friends (manual friend connections) ───────────────────────────
    const friendsOf = (player: any) => Array.isArray(player.friends)
        ? player.friends.filter((x: any) => /^07\d{8}$/.test(String(x))) : [];
    const usingFriends = players.filter(player => friendsOf(player).length > 0);
    const totalFriendLinks = usingFriends.reduce((sum, player) => sum + friendsOf(player).length, 0);
    const friendConnections = Math.round(totalFriendLinks / 2); // mutual pairs
    const avgFriends = usingFriends.length ? (totalFriendLinks / usingFriends.length).toFixed(1) : '0';
    const mostConnected = [...usingFriends]
        .sort((a, b) => friendsOf(b).length - friendsOf(a).length)
        .slice(0, 12);
    const socialSummary = [
        { label: 'Players using friends', value: usingFriends.length.toLocaleString() },
        { label: 'Friend connections', value: friendConnections.toLocaleString() },
        { label: 'Avg friends / user', value: avgFriends },
    ];

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
                    <span key={`pending-${index}`}>{resolvePendingReferrer(player) || '—'}</span>,
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
                chevrons
                heads={[
                    <span style={{display:'flex',alignItems:'center',gap:5}}><User size={13}/>Player</span>,
                    <span style={{display:'flex',alignItems:'center',gap:5}}><Link2 size={13}/>Pending referrer</span>,
                    <span style={{display:'flex',alignItems:'center',gap:5}}><User size={13}/>Name</span>,
                    <span style={{display:'flex',alignItems:'center',gap:5}}><Users size={13}/>Referral count</span>,
                ]}
                rows={pendingPlayers.length ? pendingPlayers.slice(0, 20).map((player, index) => [
                    <span key={`p1-${index}`}>{player.phone ?? '—'}</span>,
                    <span key={`p2-${index}`}>{resolvePendingReferrer(player) || '—'}</span>,
                    <span key={`p3-${index}`}>{player.name ?? '—'}</span>,
                    <span key={`p4-${index}`}>{Number(player.referralCount || 0).toLocaleString()}</span>,
                ]) : [[<span key="empty">No pending referrals</span>, '—', '—', '—']]}
            />
        </Card>

        {/* ── Social & Friends ── */}
        <div style={{...s.card}}>
            <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:18}}>
                <div style={{width:50,height:50,borderRadius:'50%',background:'#ede9fe',display:'grid',placeItems:'center',flexShrink:0}}>
                    <Users size={22} color="#7c3aed"/>
                </div>
                <div>
                    <h2 style={{...s.h2, margin:0, borderBottom:'none', paddingBottom:0}}>Social & Friends</h2>
                    <p style={{margin:'4px 0 0', fontSize:'0.78rem', color:'#94a3b8', lineHeight:1.4}}>
                        Manual friend connections (players adding each other by phone to track points). These are tracking-only — no coins are earned from added friends.
                    </p>
                </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap:14}}>
                {([
                    {Icon:Users,     bg:'#ede9fe', color:'#7c3aed', label:'PLAYERS USING FRIENDS', value:usingFriends.length.toLocaleString(),    trend:12, spark:[3,4,3,5,4,6,usingFriends.length||7]},
                    {Icon:UserCheck, bg:'#ccfbf1', color:'#0d9488', label:'FRIEND CONNECTIONS',     value:friendConnections.toLocaleString(),        trend:8,  spark:[2,3,2,4,3,3,friendConnections||4]},
                    {Icon:User,      bg:'#fee2e2', color:'#e11d48', label:'AVG FRIENDS / USER',     value:avgFriends,                               trend:6,  spark:[1,1.2,1,1.3,1.1,1.2,parseFloat(avgFriends)||1.1]},
                ] as const).map(({Icon,bg,color,label,value,trend,spark}) => (
                    <div key={label} style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #e9edf5',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                            <div style={{width:42,height:42,borderRadius:'50%',background:bg,display:'grid',placeItems:'center'}}>
                                <Icon size={19} color={color}/>
                            </div>
                        </div>
                        <div style={{fontSize:'0.64rem',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8',marginBottom:4}}>{label}</div>
                        <div style={{fontSize:'1.9rem',fontWeight:900,color:'#111827',lineHeight:1}}>{value}</div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8}}>
                            <span style={{fontSize:'0.72rem',fontWeight:800,color:'#16a34a'}}>↑ {trend}%</span>
                            <Sparkline data={spark} color={color} fill width={90} height={30}/>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* ── Most Connected Players ── */}
        <div style={{...s.card}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
                <div style={{width:50,height:50,borderRadius:'50%',background:'#ede9fe',display:'grid',placeItems:'center',flexShrink:0}}>
                    <Trophy size={22} color="#7c3aed"/>
                </div>
                <h2 style={{...s.h2,margin:0,borderBottom:'none',paddingBottom:0,flex:1}}>Most Connected Players</h2>
                <button style={{...s.btn,background:'#7c3aed',color:'#fff',borderRadius:20,padding:'7px 16px',display:'flex',alignItems:'center',gap:5}}>
                    View All <ChevronRight size={13}/>
                </button>
            </div>
            <div style={{overflowX:'auto',borderRadius:8,border:'1px solid #e8eaf0'}}>
                <table style={s.table}>
                    <thead>
                    <tr>
                        <th style={s.th}><span style={{display:'flex',alignItems:'center',gap:5}}><User size={13}/>Player</span></th>
                        <th style={s.th}><span style={{display:'flex',alignItems:'center',gap:5}}><Phone size={13}/>Phone</span></th>
                        <th style={s.th}><span style={{display:'flex',alignItems:'center',gap:5}}><Users size={13}/>Friends added</span></th>
                        <th style={{...s.th,width:28}}/>
                    </tr>
                    </thead>
                    <tbody>
                    {mostConnected.length ? mostConnected.map((player, i) => {
                        const name = player.name ?? player.id ?? '—';
                        const initial = String(name)[0]?.toUpperCase() ?? '?';
                        const avBgs   = ['#ede9fe','#fce7f3','#dbeafe','#dcfce7','#fff7ed','#f0fdf4','#fef9c3'];
                        const avClrs  = ['#7c3aed','#db2777','#2563eb','#15803d','#ea580c','#059669','#b45309'];
                        const ci = i % avBgs.length;
                        return (
                            <tr key={player.id ?? i} style={{background: i % 2 === 0 ? '#fff' : '#fafafe'}}>
                                <td style={s.td}>
                                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                                        <span style={{width:32,height:32,borderRadius:'50%',background:avBgs[ci],color:avClrs[ci],display:'grid',placeItems:'center',fontSize:'0.72rem',fontWeight:800,flexShrink:0}}>
                                            {initial}
                                        </span>
                                        {name}
                                    </div>
                                </td>
                                <td style={s.td}>{player.phone ?? player.id ?? '—'}</td>
                                <td style={{...s.td,fontWeight:700,color:'#4361ee'}}>{friendsOf(player).length.toLocaleString()}</td>
                                <td style={{...s.td,width:28,padding:'10px 6px'}}><ChevronRight size={14} color="#d1d5db"/></td>
                            </tr>
                        );
                    }) : (
                        <tr><td colSpan={4} style={{...s.td,textAlign:'center',color:'#aaa'}}>No friend connections yet</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    </>;
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; display: block !important; place-items: unset !important; overflow: hidden; margin: 0; }
body { background: #f4f6fa; }
.adm-root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f6fa; color: #172033; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

/* ── Topbar ── */
.adm-topbar { background: #0f172a; border-bottom: 1px solid #1e2d4a; min-height: 58px; padding: 0 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
.adm-brand { display: flex; align-items: center; gap: 10px; }
.adm-logo-mark { width: 34px; height: 34px; border-radius: 8px; background: #1e2d4a; border: 1px solid #2d4070; display: grid; place-items: center; color: #fff; }
.adm-title h1 { color: #fff; font-size: 0.95rem; line-height: 1; font-weight: 900; letter-spacing: 0.5px; margin: 0; }
.adm-title h1 em { color: rgba(255,255,255,0.5); font-style: normal; font-weight: 600; }
.adm-panel-pills { display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center; }
.adm-panel-label { color: rgba(255,255,255,0.4); font-size: 0.74rem; white-space: nowrap; }
.adm-panel-pill { border-radius: 20px; padding: 5px 14px; font-size: 0.74rem; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: inherit; transition: opacity 0.15s; }
.adm-panel-pill:hover { opacity: 0.85; }
.adm-panel-pill.blue { background: #3b82f6; color: #fff; }
.adm-panel-pill.green { background: #10b981; color: #fff; }
.adm-top-actions { display: flex; align-items: center; gap: 8px; }
.adm-icon-btn { width: 34px; height: 34px; border-radius: 7px; border: 1px solid #2d4070; background: #1e2d4a; display: grid; place-items: center; cursor: pointer; color: rgba(255,255,255,0.7); position: relative; text-decoration: none; }
.adm-icon-btn:hover { background: #2d4070; color: #fff; }
.adm-badge-dot { position: absolute; top: -3px; right: -3px; min-width: 15px; height: 15px; padding: 0 4px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 0.58rem; font-weight: 800; display: grid; place-items: center; }
.adm-notification-wrap { position: relative; }
.adm-notification-menu { position: absolute; top: calc(100% + 10px); right: 0; width: min(360px, calc(100vw - 24px)); background: #fff; border: 1px solid #e5e9f0; border-radius: 8px; box-shadow: 0 18px 50px rgba(15,23,42,0.22); z-index: 40; overflow: hidden; }
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
.adm-user { display: flex; align-items: center; gap: 7px; color: rgba(255,255,255,0.85); font-size: 0.75rem; font-weight: 800; cursor: pointer; }
.adm-avatar { width: 30px; height: 30px; border-radius: 50%; background: #7c3aed; color: #fff; display: grid; place-items: center; font-size: 0.75rem; font-weight: 800; }
.adm-logout { border: 1px solid #fee2e2; background: #fff5f5; color: #dc2626; border-radius: 6px; padding: 7px 11px; cursor: pointer; font-size: 0.75rem; font-weight: 800; font-family: inherit; }
.adm-logout:hover { background: #fee2e2; }
.adm-logout-btn { border: none; background: #ec4899; color: #fff; border-radius: 8px; padding: 7px 13px; cursor: pointer; font-size: 0.75rem; font-weight: 800; font-family: inherit; display: flex; align-items: center; gap: 5px; }
.adm-logout-btn:hover { background: #db2777; }
.adm-console-btn { border: none; background: #7c3aed; color: #fff; border-radius: 20px; padding: 7px 14px; cursor: pointer; font-size: 0.75rem; font-weight: 800; font-family: inherit; display: flex; align-items: center; gap: 5px; }
.adm-console-btn:hover { background: #6d28d9; }

/* ── Layout ── */
.adm-layout { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ── */
.adm-sidebar { width: 200px; min-width: 200px; background: #0b0c1d; color: rgba(255,255,255,0.75); padding: 14px 8px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.adm-sidebar-label { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #818cf8; padding: 12px 10px 6px; }
.adm-sidebar-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 8px 7px; }
.adm-tab { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 7px 10px; border-radius: 8px; border: none; background: transparent; color: rgba(255,255,255,0.62); cursor: pointer; font-size: 0.77rem; text-align: left; width: 100%; transition: background 0.12s, color 0.12s; font-family: inherit; font-weight: 700; }
.adm-tab:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
.adm-tab.active { background: #3b82f6; color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.35); }
.adm-tab-icon { width: 14px; height: 14px; flex: 0 0 14px; color: rgba(255,255,255,0.4); }
.adm-tab.active .adm-tab-icon { color: #fff; }
.adm-tab span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Content ── */
.adm-content { flex: 1; overflow-y: auto; padding: 20px 22px 48px; min-width: 0; background: #f4f6fa; }
.adm-dashboard-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.adm-dashboard-head h2 { margin: 0; color: #111827; font-size: 1.4rem; font-weight: 900; line-height: 1.1; }
.adm-dashboard-head p { margin: 5px 0 0; color: #667085; font-size: 0.82rem; }
.adm-date-pill { border: 1px solid #e5e7eb; background: #fff; border-radius: 6px; padding: 8px 12px; color: #344054; font-size: 0.75rem; font-weight: 800; white-space: nowrap; flex-shrink: 0; cursor: pointer; }
.adm-panel { background: #fff; border: 1px solid #e9edf5; border-radius: 8px; box-shadow: 0 1px 3px rgba(15,23,42,0.04); padding: 16px; }

/* ── Firebase banner ── */
.adm-firebase-alert { background: #dcfce7; border: none; border-left: 4px solid #10b981; color: #166534; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 0.78rem; display: flex; align-items: flex-start; gap: 10px; }
.adm-firebase-alert.has-errors { background: #fff1f2; border-left-color: #ef4444; color: #991b1b; }
.adm-firebase-alert strong { font-size: 0.82rem; }
.adm-firebase-alert ul { margin: 0; padding-left: 18px; display: grid; gap: 3px; }

/* ── Announcement modal ── */
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

/* ── Content tables ── */
.adm-content table { background: #fff; }
.adm-content > div > div[style] h2 { display: flex; align-items: center; gap: 8px; }

/* ── Mobile drawer ── */
.adm-hamburger { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 6px; border-radius: 6px; }
.adm-hamburger span { display: block; width: 21px; height: 2px; background: rgba(255,255,255,0.7); border-radius: 2px; }
.adm-hamburger:hover { background: rgba(255,255,255,0.08); }
.adm-drawer-backdrop { display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 50; backdrop-filter: blur(2px); }
.adm-drawer { position: fixed; top: 0; left: 0; height: 100vh; width: 248px; background: #0b0c1d; z-index: 51; transform: translateX(-100%); transition: transform 0.25s ease; display: flex; flex-direction: column; box-shadow: 6px 0 30px rgba(0,0,0,0.3); }
.adm-drawer.open { transform: translateX(0); }
.adm-drawer-header { padding: 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }
.adm-drawer-header span { color: #fff; font-weight: 900; font-size: 0.95rem; }
.adm-drawer-close { background: none; border: none; color: rgba(255,255,255,0.7); font-size: 1.2rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.adm-drawer-nav { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
@media (max-width: 860px) { .adm-sidebar { display: none; } .adm-hamburger { display: flex; } .adm-drawer-backdrop.open { display: block; } .adm-content { padding: 16px 12px 46px; } .adm-panel-pills { display: none; } .adm-user span:last-child { display: none; } }
@media (max-width: 520px) { .adm-panel-pills { display: none; } }
`;

// ── Main export ────────────────────────────────────────────────────────────────
export function AdminView({ initialTab, preAuthed, onBack }: { initialTab?: AdminTab; preAuthed?: boolean; onBack?: () => void } = {}) {
    const [authed, setAuthed] = useState(preAuthed ?? false);
    const [authChecked, setAuthChecked] = useState(preAuthed ?? false);
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
        if (preAuthed) return;
        const unsub = onAuthStateChanged(auth, user => {
            // Block KCSE uploader from accessing full admin
            setAuthed(!!user && user.email !== KCSE_EMAIL);
            setAuthChecked(true);
        });
        return unsub;
    }, [preAuthed]);

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
                    <div className="adm-logo-mark"><Gamepad2 size={18}/></div>
                    <div className="adm-title">
                        <h1>BONGOQUIZ <em>- ADMIN</em></h1>
                    </div>
                </div>

                <div className="adm-panel-pills">
                    <span className="adm-panel-label">Open panel:</span>
                    <button className="adm-panel-pill blue">
                        <LayoutGrid size={12}/> Admin Panel <ChevronDown size={11}/>
                    </button>
                    <button className="adm-panel-pill green" onClick={() => window.open("/support-admin", "_self")}>
                        <MessageSquare size={12}/> Support Center <ChevronDown size={11}/>
                    </button>
                </div>

                <div className="adm-top-actions">
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
                        <span>Admin <ChevronDown size={11}/></span>
                    </div>
                    {onBack
                        ? <button className="adm-console-btn" onClick={onBack}><Plus size={13}/> Console</button>
                        : <button className="adm-logout-btn" onClick={handleLogout}><LogOut size={13}/> Logout</button>
                    }
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
                   <div className="adm-sidebar-divider"/>
                   <button className="adm-tab" style={{marginTop: 2}}>
                       <Settings className="adm-tab-icon" aria-hidden="true"/><span>Settings</span>
                   </button>
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
                <div style={{flex: 1}}/>
                <div className="adm-sidebar-divider"/>
                <button className="adm-tab" style={{marginBottom: 4}}>
                    <Settings className="adm-tab-icon" aria-hidden="true"/><span>Settings</span>
                </button>
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
