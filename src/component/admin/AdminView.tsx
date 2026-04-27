// AdminView.tsx — Admin panel UI
import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "../../firebase.ts";
import { AdminLogin, KCSE_EMAIL } from "./AdminLogin.tsx";
import { AdminQuestions } from "./AdminQuestions.tsx";
import { AdminPowers }    from "./AdminPowers.tsx";
import { AdminKCSE }      from "./AdminKCSE.tsx";

type AdminTab = "dashboard" | "players" | "payments" | "games" | "leaderboard" | "questions" | "powers" | "achievements" | "kcse";

const TABS: { id: AdminTab; label: string }[] = [
    { id: "dashboard",   label: "📊 Dashboard"      },
    { id: "players",     label: "👥 Players"         },
    { id: "payments",    label: "💳 Payments"        },
    { id: "games",       label: "🎮 Game Sessions"   },
    { id: "leaderboard", label: "🏆 Leaderboard"     },
    { id: "questions",   label: "❓ Questions"       },
    { id: "powers",      label: "⚡ Powers"          },
    { id: "achievements",label: "🏅 Achievements"    },
    { id: "kcse",        label: "📄 KCSE Papers"     },
];

const s: Record<string, React.CSSProperties> = {
    card:   { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2:     { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    h3:     { color: "#4361ee", fontSize: "0.9rem", fontWeight: 600, marginTop: 0, marginBottom: 10 },
    p:      { lineHeight: 1.75, color: "#444", fontSize: "0.9rem", margin: "0 0 10px" },
    table:  { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" },
    th:     { background: "#f5f5ff", color: "#4361ee", padding: "10px 14px", textAlign: "left" as const, borderBottom: "2px solid #e0e0f0", fontWeight: 600, whiteSpace: "nowrap" as const },
    td:     { padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const },
    note:   { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", color: "#166534", fontSize: "0.85rem", marginBottom: 12 },
    warn:   { background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", color: "#9f1239", fontSize: "0.85rem", marginBottom: 12 },
    stat:   { background: "#fff", borderRadius: 10, padding: "18px 20px", border: "1px solid #e8eaf0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flex: 1, minWidth: 140 },
    statN:  { fontSize: "1.8rem", fontWeight: 800, color: "#4361ee", lineHeight: 1 },
    statL:  { fontSize: "0.78rem", color: "#888", marginTop: 4 },
    btn:    { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" },
    input:  { padding: "7px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", width: "100%" },
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return <div style={s.card}><h2 style={s.h2}>{title}</h2>{children}</div>;
}

function Table({ heads, rows }: { heads: string[]; rows: (string | React.ReactNode)[][] }) {
    return (
        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0", marginBottom: 4 }}>
            <table style={s.table}>
                <thead><tr>{heads.map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                        {r.map((c, j) => <td key={j} style={s.td}>{c}</td>)}
                    </tr>
                ))}</tbody>
            </table>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; color: string }> = {
        paid:    { bg: "#dcfce7", color: "#166534" },
        pending: { bg: "#fef9c3", color: "#854d0e" },
        failed:  { bg: "#fee2e2", color: "#991b1b" },
        active:  { bg: "#dbeafe", color: "#1e40af" },
        banned:  { bg: "#fee2e2", color: "#991b1b" },
    };
    const c = colors[status] ?? { bg: "#f0f0f0", color: "#555" };
    return <span style={{ ...c, padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>{status}</span>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function Dashboard() {
    const [stats, setStats] = useState({ players: 0, gamesPlayed: 0, avgScore: 0, revenueToday: 0, revenueWeek: 0, paymentSuccessRate: 0 });

    useEffect(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();

        Promise.all([
            getDocs(collection(db, "players")),
            getDocs(collection(db, "gameSessions")),
            getDocs(collection(db, "payments")),
        ]).then(([playersSnap, sessSnap, paySnap]) => {
            const sessions = sessSnap.docs.map(d => d.data());
            const payments = paySnap.docs.map(d => d.data());

            const uniquePlayers = playersSnap.size;
            const gamesPlayed   = sessions.length;
            const avgScore      = gamesPlayed ? Math.round(sessions.reduce((a, s) => a + (s.total ?? 0), 0) / gamesPlayed) : 0;

            const paid = payments.filter(p => p.status === "paid");
            const revenueToday = paid
                .filter(p => p.createdAt?.toDate?.()?.getTime?.() >= todayStart)
                .reduce((a, p) => a + (p.amount ?? 0), 0);
            const revenueWeek = paid
                .filter(p => p.createdAt?.toDate?.()?.getTime?.() >= weekStart)
                .reduce((a, p) => a + (p.amount ?? 0), 0);
            const paymentSuccessRate = payments.length
                ? Math.round((paid.length / payments.length) * 100) : 0;

            setStats({ players: uniquePlayers, gamesPlayed, avgScore, revenueToday, revenueWeek, paymentSuccessRate });
        }).catch(() => {});
    }, []);

    const rows = [
        { n: stats.players.toLocaleString(),                  l: "Total Players"          },
        { n: `KES ${stats.revenueToday.toLocaleString()}`,    l: "Revenue Today"           },
        { n: `KES ${stats.revenueWeek.toLocaleString()}`,     l: "Revenue This Week"       },
        { n: stats.gamesPlayed.toLocaleString(),              l: "Games Played"            },
        { n: stats.avgScore.toLocaleString(),                 l: "Avg Score"               },
        { n: `${stats.paymentSuccessRate}%`,                  l: "Payment Success Rate"    },
    ];

    return <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
            {rows.map(st => (
                <div key={st.l} style={s.stat}>
                    <div style={s.statN}>{st.n}</div>
                    <div style={s.statL}>{st.l}</div>
                </div>
            ))}
        </div>
    </>;
}

// ── Players ────────────────────────────────────────────────────────────────────
function Players() {
    const [search, setSearch] = useState("");
    const [players, setPlayers] = useState<any[]>([]);

    useEffect(() => {
        getDocs(collection(db, "players"))
            .then(snap => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))))
            .catch(() => {});
    }, []);

    const filtered = players.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
    );

    return <>
        <Card title="Players">
            <input style={{ ...s.input, marginBottom: 14 }} placeholder="Search by name or phone…"
                value={search} onChange={e => setSearch(e.target.value)} />
            <Table
                heads={["Name", "Phone", "Joined"]}
                rows={filtered.length ? filtered.map(p => [
                    p.name ?? "—", p.phone ?? "—",
                    p.updatedAt?.toDate?.()?.toLocaleDateString?.() ?? "—",
                ]) : [["No players yet", "", ""]]}
            />
        </Card>
    </>;
}

// ── Payments ───────────────────────────────────────────────────────────────────
function Payments() {
    const [rows, setRows] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        getDocs(collection(db, "payments"))
            .then(snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))))
            .catch(() => {});
    }, []);

    const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);

    return <>
        <Card title="Payments">
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {["all", "paid", "pending", "failed"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{ ...s.btn, background: filter === f ? "#4361ee" : "#f0f0f8", color: filter === f ? "#fff" : "#444" }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>
            <Table
                heads={["Checkout ID", "Phone", "Amount (KES)", "Round", "Status", "M-Pesa Receipt", "Date"]}
                rows={filtered.length ? filtered.map(r => [
                    r.checkoutId ?? "—", r.phone ?? "—", r.amount ?? "—", r.round ?? "—",
                    <StatusBadge status={r.status ?? "pending"} />,
                    r.receipt ?? "—",
                    r.createdAt?.toDate?.()?.toLocaleString?.() ?? "—",
                ]) : [["No payments yet", "", "", "", "", "", ""]]}
            />
        </Card>
    </>;
}

// ── Game Sessions ──────────────────────────────────────────────────────────────
function GameSessions() {
    const [rows,   setRows]   = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [page,   setPage]   = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        getDocs(collection(db, "gameSessions"))
            .then(snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
            .catch(() => {});
    }, []);

    const filtered   = rows.filter(r => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (r.name ?? "").toLowerCase().includes(term) || (r.phone ?? "").includes(term);
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return <>
        <Card title="Game Sessions">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    Total: <strong>{filtered.length}</strong> session{filtered.length !== 1 ? "s" : ""}
                </span>
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    style={{ ...s.input, width: "auto", minWidth: 220 }}
                />
            </div>
            <Table
                heads={["Player", "Phone", "Power Used", "R1", "R2", "R3", "Total", "Date"]}
                rows={paginated.length ? paginated.map(r => [
                    r.name ?? "—", r.phone ?? "—", r.power ?? "—",
                    (r.r1Score ?? 0).toLocaleString(),
                    (r.r2Score ?? 0).toLocaleString(),
                    (r.r3Bonus ?? 0).toLocaleString(),
                    (r.total   ?? 0).toLocaleString(),
                    r.playedAt?.toDate?.()?.toLocaleString?.() ?? "—",
                ]) : [["No sessions found", "", "", "", "", "", "", ""]]}
            />
            {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: "0.82rem", color: "#888" }}>Page {page} of {totalPages}</span>
                    <button style={{ ...s.btn, background: page === 1 ? "#eee" : "#4361ee", color: page === 1 ? "#aaa" : "#fff" }}
                        disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <button style={{ ...s.btn, background: page === totalPages ? "#eee" : "#4361ee", color: page === totalPages ? "#aaa" : "#fff" }}
                        disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
            )}
        </Card>
    </>;
}

// ── Leaderboard ────────────────────────────────────────────────────────────────
function AdminLeaderboard() {
    const [rows, setRows] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        getDocs(collection(db, "leaderboard"))
            .then(snap => {
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Group by phone and keep only highest score per phone
                const byPhone = new Map<string, any>();
                all.forEach(entry => {
                    const phone = entry.phone || entry.id;
                    const existing = byPhone.get(phone);
                    if (!existing || (entry.score ?? 0) > (existing.score ?? 0)) {
                        byPhone.set(phone, entry);
                    }
                });
                
                const sorted = Array.from(byPhone.values())
                    .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
                    .slice(0, 50)
                    .map((d, i) => ({ ...d, rank: i + 1 }));
                setRows(sorted);
            })
            .catch(() => {});
    }, []);

    const filtered = rows.filter(r => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (r.name ?? "").toLowerCase().includes(term) || 
               (r.phone ?? "").includes(term);
    });

    return <>
        <Card title="Leaderboard">
            <div style={{ marginBottom: 16 }}>
                <input 
                    type="text" 
                    placeholder="Search by name or phone..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={s.input}
                />
            </div>
            <Table
                heads={["Rank", "Player", "Phone", "Score", "Date"]}
                rows={filtered.length ? filtered.map(r => [
                    String(r.rank), r.name ?? "—", r.phone ?? "—",
                    (r.score ?? 0).toLocaleString(),
                    r.playedAt?.toDate?.()?.toLocaleString?.() ?? "—",
                ]) : [["No entries found", "", "", "", ""]]}
            />
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
        ["🔥 Hot Streak",    "Play 7 days in a row",          "342"],
        ["💎 High Roller",   "Score over 50,000 in one game", "87"],
        ["⚡ Speed Demon",   "Finish R1 with 30s+ remaining", "214"],
        ["🎯 Perfect Round", "Answer all R2 questions right", "56"],
        ["🏆 Champion",      "Reach #1 on leaderboard",       "12"],
        ["🌟 First Win",     "Complete your first game",      "1,284"],
    ];
    return <>
        <Card title="Achievements">
            <div style={{ marginBottom: 14, textAlign: "right" as const }}>
                <button style={{ ...s.btn, background: "#4361ee", color: "#fff" }}>+ Add Badge</button>
            </div>
            <Table
                heads={["Badge", "Condition", "Unlocked By (players)", "Actions"]}
                rows={badges.map(b => [
                    b[0], b[1], b[2],
                    <button style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>Edit</button>
                ])}
            />
        </Card>
        <Card title="API Endpoints">
            <p style={s.p}><code>GET /api/player/achievements</code> · <code>POST /api/player/achievements</code></p>
        </Card>
    </>;
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; display: block !important; place-items: unset !important; overflow: hidden; }

.adm-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f4f5fb;
  color: #1a1a2e;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.adm-topbar {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  min-height: 56px;
  flex-shrink: 0;
}
.adm-topbar h1 { color: #ffd200; font-size: 1.1rem; font-weight: 800; }
.adm-topbar a  { color: #aaa; font-size: 0.8rem; text-decoration: none; }
.adm-topbar a:hover { color: #fff; }

.adm-layout { display: flex; flex: 1; overflow: hidden; }
.adm-sidebar {
  width: 210px; min-width: 210px;
  background: #fff;
  border-right: 1px solid #e8eaf0;
  padding: 20px 12px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 3px;
  flex-shrink: 0;
}
.adm-sidebar-label {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.2px; color: #aaa; padding: 0 10px 10px;
}
.adm-tab {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  border-radius: 8px; border: none; background: transparent; color: #666;
  cursor: pointer; font-size: 0.85rem; text-align: left; width: 100%;
  transition: all 0.15s; font-family: inherit;
}
.adm-tab:hover { background: #f4f5fb; color: #1a1a2e; }
.adm-tab.active { background: #eef0ff; color: #4361ee; font-weight: 600; }
.adm-tab.active .adm-dot { background: #4361ee; }
.adm-dot { width: 6px; height: 6px; border-radius: 50%; background: #ddd; flex-shrink: 0; }

.adm-content { flex: 1; overflow-y: auto; padding: 28px 28px 60px; min-width: 0; }

/* Mobile hamburger drawer */
.adm-hamburger {
  display: none; background: none; border: none; cursor: pointer;
  flex-direction: column; gap: 5px; padding: 6px; border-radius: 6px;
}
.adm-hamburger span { display: block; width: 22px; height: 2px; background: #ffd200; border-radius: 2px; }
.adm-hamburger:hover { background: rgba(255,255,255,0.08); }

.adm-drawer-backdrop {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50;
}
.adm-drawer {
  position: fixed; top: 0; left: 0; height: 100vh; width: 240px;
  background: #fff; z-index: 51; transform: translateX(-100%);
  transition: transform 0.25s ease; display: flex; flex-direction: column;
  box-shadow: 4px 0 20px rgba(0,0,0,0.2);
}
.adm-drawer.open { transform: translateX(0); }
.adm-drawer-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 16px 16px 14px; display: flex; align-items: center; justify-content: space-between;
}
.adm-drawer-header span { color: #ffd200; font-weight: 800; font-size: 0.95rem; }
.adm-drawer-close {
  background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer; padding: 2px 6px; border-radius: 4px;
}
.adm-drawer-close:hover { color: #fff; }
.adm-drawer-nav { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 3px; }

@media (max-width: 720px) {
  .adm-sidebar        { display: none; }
  .adm-mobile-tabs    { display: none; }
  .adm-hamburger      { display: flex; }
  .adm-drawer-backdrop.open { display: block; }
  .adm-content        { padding: 16px 14px 60px; }
}
`;

// ── Main export ────────────────────────────────────────────────────────────────
export function AdminView() {
    const [authed, setAuthed] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [tab, setTab] = useState<AdminTab>("dashboard");
    const [drawerOpen, setDrawerOpen] = useState(false);

    const changeTab = (t: AdminTab) => {
        setTab(t);
        setDrawerOpen(false);
        document.getElementById("adm-content")?.scrollTo({ top: 0 });
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, user => {
            // Block KCSE uploader from accessing full admin
            setAuthed(!!user && user.email !== KCSE_EMAIL);
            setAuthChecked(true);
        });
        return unsub;
    }, []);

    const handleLogout = () => signOut(auth);

    if (!authChecked) return null;
    if (!authed) return <AdminLogin onLogin={() => {}} />;

    return (
        <>
        <style>{CSS}</style>
        <div className="adm-root">
            <header className="adm-topbar">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="adm-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
                        <span/><span/><span/>
                    </button>
                    <h1>🛠️ Bongo Quiz — Admin Panel</h1>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <a href="#/">← Back to Game</a>
                    <button onClick={handleLogout}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" }}>
                        Logout
                    </button>
                </div>
            </header>

            {/* Mobile drawer */}
            <div className={`adm-drawer-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />
            <div className={`adm-drawer${drawerOpen ? " open" : ""}`}>
                <div className="adm-drawer-header">
                    <span>🛠️ Admin Menu</span>
                    <button className="adm-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
                </div>
                <div className="adm-drawer-nav">
                    {TABS.map(t => (
                        <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                            <span className="adm-dot" />{t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="adm-layout">
                <nav className="adm-sidebar">
                    <div className="adm-sidebar-label">Admin Navigation</div>
                    {TABS.map(t => (
                        <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                            <span className="adm-dot" />
                            {t.label}
                        </button>
                    ))}
                </nav>

                <main className="adm-content" id="adm-content">
                    {tab === "dashboard"    && <Dashboard />}
                    {tab === "players"      && <Players />}
                    {tab === "payments"     && <Payments />}
                    {tab === "games"        && <GameSessions />}
                    {tab === "leaderboard"  && <AdminLeaderboard />}
                    {tab === "questions"    && <AdminQuestions />}
                    {tab === "powers"       && <AdminPowers />}
                    {tab === "achievements" && <Achievements />}
                    {tab === "kcse"         && <AdminKCSE />}
                </main>
            </div>
        </div>
        </>
    );
}
