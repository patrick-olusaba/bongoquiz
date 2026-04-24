// AdminView.tsx — Admin panel UI (frontend shell, no real API calls yet)
import { useState } from "react";
import { AdminLogin }     from "./AdminLogin.tsx";
import { AdminQuestions } from "./AdminQuestions.tsx";
import { AdminPowers }    from "./AdminPowers.tsx";

type AdminTab = "dashboard" | "players" | "payments" | "games" | "leaderboard" | "questions" | "powers" | "achievements";

const TABS: { id: AdminTab; label: string }[] = [
    { id: "dashboard",   label: "📊 Dashboard"      },
    { id: "players",     label: "👥 Players"         },
    { id: "payments",    label: "💳 Payments"        },
    { id: "games",       label: "🎮 Game Sessions"   },
    { id: "leaderboard", label: "🏆 Leaderboard"     },
    { id: "questions",   label: "❓ Questions"       },
    { id: "powers",      label: "⚡ Powers"          },
    { id: "achievements",label: "🏅 Achievements"    },
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
    const stats = [
        { n: "1,284", l: "Total Players" },
        { n: "KES 38,420", l: "Revenue Today" },
        { n: "KES 214,800", l: "Revenue This Week" },
        { n: "3,921", l: "Games Played" },
        { n: "12,450", l: "Avg Score" },
        { n: "87%", l: "Payment Success Rate" },
    ];
    return <>
        <div style={{ note: s.note } as any}>
            <div style={s.note}>🟡 This is a frontend shell. Connect to <code>/api/admin/*</code> endpoints to load real data.</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
            {stats.map(st => (
                <div key={st.l} style={s.stat}>
                    <div style={s.statN}>{st.n}</div>
                    <div style={s.statL}>{st.l}</div>
                </div>
            ))}
        </div>
        <Card title="Revenue Breakdown">
            <Table
                heads={["Metric", "Query"]}
                rows={[
                    ["Today's revenue",  "SUM(amount) WHERE status='paid' AND paid_at >= today"],
                    ["This week",        "SUM(amount) WHERE status='paid' AND paid_at >= week_start"],
                    ["Per round split",  "GROUP BY round — R1R2 vs R3 revenue"],
                    ["Failed payments",  "COUNT WHERE status='failed' — drop-off rate"],
                ]}
            />
        </Card>
        <Card title="Admin Auth Note">
            <p style={s.p}>All <code>/api/admin/*</code> routes require a JWT with <code>role: "admin"</code>. Admin accounts are managed in a separate <code>admins</code> table with hashed passwords.</p>
        </Card>
    </>;
}

// ── Players ────────────────────────────────────────────────────────────────────
type Player = { name: string; phone: string; games: string; best: string; streak: string; joined: string; status: "active" | "banned"; };

function Players() {
    const [search, setSearch] = useState("");
    const [players, setPlayers] = useState<Player[]>([
        { name: "Jane Doe",     phone: "0712 345 678", games: "24", best: "42,500", streak: "7",  joined: "2026-01-10", status: "active" },
        { name: "John Kamau",   phone: "0723 456 789", games: "18", best: "38,200", streak: "3",  joined: "2026-02-14", status: "active" },
        { name: "Amina Wanjiru",phone: "0734 567 890", games: "5",  best: "12,100", streak: "1",  joined: "2026-04-01", status: "banned" },
        { name: "Brian Otieno", phone: "0745 678 901", games: "31", best: "55,000", streak: "12", joined: "2025-12-20", status: "active" },
    ]);

    const toggle = (phone: string) =>
        setPlayers(prev => prev.map(p => p.phone === phone ? { ...p, status: p.status === "banned" ? "active" : "banned" } : p));

    const filtered = players.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
    );

    return <>
        <Card title="Players">
            <div style={{ marginBottom: 14 }}>
                <input style={s.input} placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Table
                heads={["Name", "Phone", "Games", "Best Score", "Streak", "Joined", "Status", "Actions"]}
                rows={filtered.map(p => [
                    p.name, p.phone, p.games, p.best, `${p.streak} days`, p.joined,
                    <StatusBadge status={p.status} />,
                    <button
                        onClick={() => toggle(p.phone)}
                        style={{ ...s.btn, background: p.status === "banned" ? "#dcfce7" : "#fee2e2", color: p.status === "banned" ? "#166534" : "#991b1b" }}>
                        {p.status === "banned" ? "Unban" : "Ban"}
                    </button>
                ])}
            />
        </Card>
        <Card title="API Endpoints">
            <p style={s.p}><code>GET /api/admin/players</code> — list all players</p>
        </Card>
    </>;
}

// ── Payments ───────────────────────────────────────────────────────────────────
function Payments() {
    const [filter, setFilter] = useState("all");
    const all = [
        ["ws_CO_001", "0712 345 678", "20",  "r1r2", "paid",    "QKA123XYZ", "2026-04-24 09:12"],
        ["ws_CO_002", "0723 456 789", "10",  "r3",   "paid",    "QKB456ABC", "2026-04-24 09:45"],
        ["ws_CO_003", "0734 567 890", "20",  "r1r2", "failed",  "—",         "2026-04-24 10:01"],
        ["ws_CO_004", "0745 678 901", "20",  "r1r2", "pending", "—",         "2026-04-24 10:28"],
    ];
    const rows = filter === "all" ? all : all.filter(r => r[4] === filter);

    return <>
        <Card title="Payments">
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {["all", "paid", "pending", "failed"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{ ...s.btn, background: filter === f ? "#4361ee" : "#f0f0f8", color: filter === f ? "#fff" : "#444" }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
                <button style={{ ...s.btn, background: "#ffd200", color: "#000", marginLeft: "auto" }}>⬇️ Export CSV</button>
            </div>
            <Table
                heads={["Checkout ID", "Phone", "Amount (KES)", "Round", "Status", "M-Pesa Receipt", "Date"]}
                rows={rows.map(r => [...r.slice(0, 4), <StatusBadge status={r[4]} />, r[5], r[6]])}
            />
        </Card>
        <Card title="API Endpoints">
            <p style={s.p}><code>GET /api/admin/payments</code> — all transactions (supports <code>?status=paid</code> filter)</p>
        </Card>
    </>;
}

// ── Game Sessions ──────────────────────────────────────────────────────────────
function GameSessions() {
    const rows = [
        ["Jane Doe",     "Double Points",       "8,200", "12,500", "25,000", "45,700", "2026-04-24 09:15"],
        ["John Kamau",   "No Penalty",          "6,100", "9,800",  "15,000", "30,900", "2026-04-24 09:50"],
        ["Brian Otieno", "Mirror Effect",       "9,500", "14,000", "7,500",  "31,000", "2026-04-24 10:05"],
    ];
    return <>
        <Card title="Game Sessions">
            <Table
                heads={["Player", "Power Used", "R1 Score", "R2 Score", "R3 Bonus", "Total", "Date"]}
                rows={rows}
            />
        </Card>
        <Card title="API Endpoints">
            <p style={s.p}><code>GET /api/admin/games</code> — all game sessions (supports <code>?date=today</code> filter)</p>
        </Card>
    </>;
}

// ── Leaderboard ────────────────────────────────────────────────────────────────
function AdminLeaderboard() {
    const [period, setPeriod] = useState("all");
    const rows = [
        ["1", "Brian Otieno", "55,000", "2026-04-20"],
        ["2", "Jane Doe",     "45,700", "2026-04-24"],
        ["3", "John Kamau",   "38,200", "2026-04-18"],
    ];
    return <>
        <Card title="Leaderboard">
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["all", "today", "week"].map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                        style={{ ...s.btn, background: period === p ? "#4361ee" : "#f0f0f8", color: period === p ? "#fff" : "#444" }}>
                        {p === "all" ? "All Time" : p === "today" ? "Today" : "This Week"}
                    </button>
                ))}
                <button style={{ ...s.btn, background: "#fee2e2", color: "#991b1b", marginLeft: "auto" }}>🗑 Reset</button>
            </div>
            <Table
                heads={["Rank", "Player", "Score", "Date"]}
                rows={rows}
            />
        </Card>
        <Card title="API Endpoints">
            <p style={s.p}><code>GET /api/leaderboard?period=today|week</code></p>
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

.adm-mobile-tabs {
  display: none;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  padding: 8px 12px;
  gap: 6px;
  overflow-x: auto;
  flex-shrink: 0;
}
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

.adm-mob-tab {
  padding: 6px 12px; border-radius: 20px; border: 1px solid #0f3460;
  background: transparent; color: #aaa; cursor: pointer; font-size: 0.78rem;
  white-space: nowrap; font-family: inherit; flex-shrink: 0;
}
.adm-mob-tab.active { background: #ffd200; color: #000; border-color: #ffd200; font-weight: 700; }

.adm-content { flex: 1; overflow-y: auto; padding: 28px 28px 60px; min-width: 0; }

@media (max-width: 720px) {
  .adm-sidebar      { display: none; }
  .adm-mobile-tabs  { display: flex; }
  .adm-content      { padding: 16px 14px 60px; }
}
`;

// ── Main export ────────────────────────────────────────────────────────────────
export function AdminView() {
    const [authed, setAuthed] = useState(() => sessionStorage.getItem("adm_auth") === "1");
    const [tab, setTab] = useState<AdminTab>("dashboard");
    const changeTab = (t: AdminTab) => { setTab(t); document.getElementById("adm-content")?.scrollTo({ top: 0 }); };

    if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

    return (
        <>
        <style>{CSS}</style>
        <div className="adm-root">
            <header className="adm-topbar">
                <h1>🛠️ Bongo Quiz — Admin Panel</h1>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <a href="#/">← Back to Game</a>
                    <button onClick={() => { sessionStorage.removeItem("adm_auth"); setAuthed(false); }}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" }}>
                        Logout
                    </button>
                </div>
            </header>

            <div className="adm-mobile-tabs">
                {TABS.map(t => (
                    <button key={t.id} className={`adm-mob-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                        {t.label}
                    </button>
                ))}
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
                </main>
            </div>
        </div>
        </>
    );
}
