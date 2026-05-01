// AdminView.tsx — Admin panel UI
import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "../../firebase.ts";
import { AdminLogin, KCSE_EMAIL } from "./AdminLogin.tsx";
import { AdminQuestions } from "./AdminQuestions.tsx";
import { AdminPowers }    from "./AdminPowers.tsx";
import { AdminKCSE }      from "./AdminKCSE.tsx";
import { AdminBibleQuiz } from "./AdminBibleQuiz.tsx";
import { AdminMathQuiz }  from "./AdminMathQuiz.tsx";
import { AdminBioQuiz }   from "./AdminBioQuiz.tsx";
import { AdminGenQuiz }   from "./AdminGenQuiz.tsx";

type AdminTab = "dashboard" | "players" | "payments" | "games" | "leaderboard" | "questions" | "powers" | "achievements" | "kcse" | "biblequiz" | "mathquiz" | "bioquiz" | "genquiz";

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
    { id: "biblequiz",   label: "✝️ Bible Quiz"      },
    { id: "mathquiz",    label: "➗ Math Quiz"       },
    { id: "bioquiz",     label: "🧬 Biology Quiz"    },
    { id: "genquiz",     label: "🌍 General Knowledge" },
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
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        const weekStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime() / 1000;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;

        const buildGameStats = (sessions: any[], payments: any[]) => {
            const paid    = payments.filter(p => p.status === "paid");
            const pending = payments.filter(p => p.status === "pending");
            const failed  = payments.filter(p => p.status === "failed");
            const rev = (list: any[]) => list.reduce((a, p) => a + (p.amount ?? 0), 0);
            const dailyRev: Record<string, number> = {};
            const dailyGames: Record<string, number> = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" });
                dailyRev[key] = 0; dailyGames[key] = 0;
            }
            paid.forEach(p => { const d = p.createdAt?.toDate?.(); if (!d) return; const k = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" }); if (k in dailyRev) dailyRev[k] += p.amount ?? 0; });
            sessions.forEach(s => { const d = s.playedAt?.toDate?.(); if (!d) return; const k = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" }); if (k in dailyGames) dailyGames[k]++; });
            return {
                sessions: sessions.length,
                sessionsToday: sessions.filter(s => (s.playedAt?.seconds ?? 0) >= todayStart).length,
                sessionsWeek:  sessions.filter(s => (s.playedAt?.seconds ?? 0) >= weekStart).length,
                avgScore: sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.score ?? s.total ?? 0), 0) / sessions.length) : 0,
                revenueTotal: rev(paid),
                revenueToday: rev(paid.filter(p => (p.createdAt?.seconds ?? 0) >= todayStart)),
                revenueWeek:  rev(paid.filter(p => (p.createdAt?.seconds ?? 0) >= weekStart)),
                revenueMonth: rev(paid.filter(p => (p.createdAt?.seconds ?? 0) >= monthStart)),
                paid: paid.length, pending: pending.length, failed: failed.length,
                successRate: payments.length ? Math.round((paid.length / payments.length) * 100) : 0,
                dailyRev, dailyGames,
            };
        };

        const snap = (r: PromiseSettledResult<any>) => r.status === "fulfilled" ? r.value.docs : [];
        Promise.allSettled([
            getDocs(collection(db, "players")),
            getDocs(collection(db, "gameSessions")),
            getDocs(collection(db, "payments")),
            getDocs(collection(db, "leaderboard")),
            getDocs(collection(db, "grantedSessions")),
            getDocs(collection(db, "bibleQuizSessions")),
            getDocs(query(collection(db, "payments"), where("game", "==", "BIBLEQUIZ"))),
            getDocs(collection(db, "mathQuizSessions")),
            getDocs(query(collection(db, "payments"), where("game", "==", "MATHQUIZ"))),
            getDocs(collection(db, "bioQuizSessions")),
            getDocs(query(collection(db, "payments"), where("game", "==", "BIOQUIZ"))),
            getDocs(collection(db, "genQuizSessions")),
            getDocs(query(collection(db, "payments"), where("game", "==", "GENQUIZ"))),
        ]).then(([playersR, sessR, payR, lbR, grantR, bqSessR, bqPayR, mqSessR, mqPayR, bioSessR, bioPayR, genSessR, genPayR]) => {
            const bongoSessions  = snap(sessR).map((d: any) => d.data());
            const bongoPayments  = snap(payR).map((d: any) => d.data());
            const bibleSessions  = snap(bqSessR).map((d: any) => d.data());
            const biblePayments  = snap(bqPayR).map((d: any) => d.data());
            const mathSessions   = snap(mqSessR).map((d: any) => d.data());
            const mathPayments   = snap(mqPayR).map((d: any) => d.data());
            const bioSessions    = snap(bioSessR).map((d: any) => d.data());
            const bioPayments    = snap(bioPayR).map((d: any) => d.data());
            const genSessions    = snap(genSessR).map((d: any) => d.data());
            const genPayments    = snap(genPayR).map((d: any) => d.data());
            const leaders        = snap(lbR).map((d: any) => ({ id: d.id, ...d.data() }));
            const playersSize    = playersR.status === "fulfilled" ? playersR.value.size : 0;
            const grantSize      = grantR.status === "fulfilled" ? grantR.value.size : 0;

            // Power usage
            const powerCount: Record<string, number> = {};
            bongoSessions.forEach(s => { if (s.power) powerCount[s.power] = (powerCount[s.power] ?? 0) + 1; });
            const topPowers = Object.entries(powerCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Top players deduped
            const byPhone = new Map<string, any>();
            leaders.forEach((p: any) => { const ph = p.phone || p.id; const ex = byPhone.get(ph); if (!ex || (p.score ?? 0) > (ex.score ?? 0)) byPhone.set(ph, p); });
            const topPlayers = Array.from(byPhone.values()).sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10);

            // All revenue combined
            const allPaid = [...bongoPayments, ...biblePayments, ...mathPayments, ...bioPayments, ...genPayments].filter(p => p.status === "paid");
            const totalRevenue = allPaid.reduce((a, p) => a + (p.amount ?? 0), 0);
            const totalSessions = bongoSessions.length + bibleSessions.length + mathSessions.length + bioSessions.length + genSessions.length;

            setData({
                players: playersSize,
                stuckCount: grantSize,
                totalRevenue, totalSessions,
                topPowers, topPlayers,
                bongo: buildGameStats(bongoSessions, bongoPayments),
                bible: buildGameStats(bibleSessions, biblePayments),
                math:  buildGameStats(mathSessions,  mathPayments),
                bio:   buildGameStats(bioSessions,   bioPayments),
                gen:   buildGameStats(genSessions,   genPayments),
            });
        }).catch(() => {});
    }, []);

    if (!data) return <div style={s.card}><p style={s.p}>Loading analytics…</p></div>;

    const Bar = ({ val, max, color }: { val: number; max: number; color: string }) => (
        <div style={{ background: "#f0f0f8", borderRadius: 4, height: 8, flex: 1 }}>
            <div style={{ background: color, borderRadius: 4, height: 8, width: `${Math.round((val / Math.max(max, 1)) * 100)}%`, transition: "width 0.6s" }} />
        </div>
    );

    const StatBox = ({ n, l, color, sub }: { n: string | number; l: string; color?: string; sub?: string }) => (
        <div style={{ ...s.stat, flex: "1 1 130px" }}>
            <div style={{ ...s.statN, color: color ?? "#4361ee" }}>{n}</div>
            <div style={s.statL}>{l}</div>
            {sub && <div style={{ fontSize: "0.7rem", color: "#aaa", marginTop: 2 }}>{sub}</div>}
        </div>
    );

    const GameCard = ({ label, icon, color, g }: { label: string; icon: string; color: string; g: any }) => {
        const maxRev   = Math.max(...Object.values(g.dailyRev as Record<string, number>), 1);
        const maxGames = Math.max(...Object.values(g.dailyGames as Record<string, number>), 1);
        return (
            <div style={{ ...s.card, borderTop: `3px solid ${color}` }}>
                <h2 style={{ ...s.h2, color }}>{icon} {label}</h2>
                {/* Mini KPIs */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                    {[
                        { l: "Sessions",    v: g.sessions,                              c: color },
                        { l: "Today",       v: g.sessionsToday,                         c: "#666" },
                        { l: "Revenue",     v: `KSh ${g.revenueTotal.toLocaleString()}`,c: "#059669" },
                        { l: "This Week",   v: `KSh ${g.revenueWeek.toLocaleString()}`, c: "#0891b2" },
                        { l: "Avg Score",   v: g.avgScore.toLocaleString(),             c: "#d97706" },
                        { l: "Success Rate",v: `${g.successRate}%`,                     c: g.successRate >= 70 ? "#059669" : "#dc2626" },
                    ].map(({ l, v, c }) => (
                        <div key={l} style={{ background: "#f8f9ff", borderRadius: 8, padding: "10px 14px", flex: "1 1 90px", border: "1px solid #eef0ff" }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: c }}>{v}</div>
                            <div style={{ fontSize: "0.7rem", color: "#888", marginTop: 2 }}>{l}</div>
                        </div>
                    ))}
                </div>
                {/* Payment breakdown */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888", marginBottom: 8 }}>PAYMENTS</div>
                    {[{ l: "Paid", v: g.paid, c: "#059669" }, { l: "Pending", v: g.pending, c: "#d97706" }, { l: "Failed", v: g.failed, c: "#dc2626" }].map(({ l, v, c }) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: "0.75rem", color: "#666", minWidth: 52 }}>{l}</span>
                            <Bar val={v} max={g.paid + g.pending + g.failed || 1} color={c} />
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: c, minWidth: 24, textAlign: "right" }}>{v}</span>
                        </div>
                    ))}
                </div>
                {/* Revenue last 7 days */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888", marginBottom: 8 }}>REVENUE — LAST 7 DAYS</div>
                    {Object.entries(g.dailyRev).map(([day, val]) => (
                        <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: "0.72rem", color: "#666", minWidth: 60 }}>{day}</span>
                            <Bar val={val as number} max={maxRev} color={color} />
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color, minWidth: 52, textAlign: "right" }}>KSh {(val as number).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
                {/* Games last 7 days */}
                <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888", marginBottom: 8 }}>GAMES — LAST 7 DAYS</div>
                    {Object.entries(g.dailyGames).map(([day, val]) => (
                        <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: "0.72rem", color: "#666", minWidth: 60 }}>{day}</span>
                            <Bar val={val as number} max={maxGames} color={color} />
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color, minWidth: 20, textAlign: "right" }}>{val as number}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return <>
        {/* ── Platform KPIs ── */}
        <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#aaa", marginBottom: 10 }}>Platform Overview</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <StatBox n={data.players}                                  l="Total Players"      color="#4361ee" />
                <StatBox n={data.totalSessions}                            l="Total Games (All)"  color="#7c3aed" />
                <StatBox n={`KSh ${data.totalRevenue.toLocaleString()}`}   l="Total Revenue (All)"color="#059669" />
                <StatBox n={data.stuckCount}                               l="Stuck at Payment"   color={data.stuckCount > 0 ? "#dc2626" : "#059669"} sub="needs admin action" />
            </div>
        </div>

        {/* ── Per-game analytics ── */}
        <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#aaa", marginBottom: 10 }}>Per-Game Analytics</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 20 }}>
            <GameCard label="Bongo Quiz"    icon="🎯" color="#4361ee" g={data.bongo} />
            <GameCard label="Bible Quiz"    icon="✝️" color="#059669" g={data.bible} />
            <GameCard label="Math Quiz"     icon="➗" color="#d97706" g={data.math}  />
            <GameCard label="Biology Quiz"    icon="🧬" color="#7c3aed" g={data.bio}   />
            <GameCard label="General Knowledge" icon="🌍" color="#0891b2" g={data.gen} />
        </div>

        {/* ── Shared leaderboard + powers ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div style={s.card}>
                <h2 style={s.h2}>⚡ Most Used Powers (Bongo Quiz)</h2>
                {data.topPowers.length ? data.topPowers.map(([name, count]: [string, number]) => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: "0.78rem", color: "#666", minWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <Bar val={count} max={data.topPowers[0][1]} color="#4361ee" />
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#4361ee", minWidth: 24, textAlign: "right" }}>{count}</span>
                    </div>
                )) : <p style={s.p}>No data yet</p>}
            </div>
            <div style={s.card}>
                <h2 style={s.h2}>🏆 Top 10 Players (Bongo Quiz)</h2>
                {data.topPlayers.length ? data.topPlayers.map((p: any, i: number) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: "1rem", minWidth: 24 }}>{["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"][i]}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1a1a2e" }}>{p.name ?? "—"}</div>
                            <div style={{ fontSize: "0.72rem", color: "#aaa" }}>{(p.phone ?? "").replace(/^254/, "0").slice(0, 3) + "*******"}</div>
                        </div>
                        <span style={{ fontWeight: 700, color: "#4361ee", fontSize: "0.88rem" }}>{(p.score ?? 0).toLocaleString()} pts</span>
                    </div>
                )) : <p style={s.p}>No data yet</p>}
            </div>
        </div>
    </>;
}

// ── Players ────────────────────────────────────────────────────────────────────
function Players() {
    const [search,   setSearch]   = useState("");
    const [players,  setPlayers]  = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [banned,   setBanned]   = useState<Set<string>>(new Set());
    const [page,     setPage]     = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        Promise.all([
            getDocs(collection(db, "players")).catch(() => null),
            getDocs(collection(db, "gameSessions")).catch(() => null),
            getDocs(collection(db, "payments")).catch(() => null),
            getDocs(collection(db, "bannedPlayers")).catch(() => null),
        ]).then(([pSnap, sSnap, paySnap, banSnap]) => {
            if (pSnap)   setPlayers(pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0)));
            if (sSnap)   setSessions(sSnap.docs.map(d => d.data()));
            if (paySnap) setPayments(paySnap.docs.map(d => d.data()));
            if (banSnap) setBanned(new Set(banSnap.docs.map(d => d.id)));
        });
    }, []);

    const norm = (p: string) => String(p ?? "").replace(/^\+?254|^0/, "").slice(-9);

    const enriched = players.map(p => {
        const pNorm      = norm(p.phone);
        const phone07    = pNorm ? "0" + pNorm : (p.phone ?? "");
        const pSessions  = sessions.filter(s => norm(s.phone) === pNorm);
        const paidAmt    = payments.filter(pay => norm(pay.phone) === pNorm && pay.status === "paid")
                                   .reduce((a, pay) => a + (pay.amount ?? 0), 0);
        const lastSess   = [...pSessions].sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))[0];
        return { ...p, phone07, games: pSessions.length, spent: paidAmt,
            lastPlayed: lastSess?.playedAt?.toDate?.() ?? null,
            isBanned: banned.has(phone07) || banned.has(p.phone ?? "") };
    });

    const toggleBan = async (p: any) => {
        if (!confirm(`${p.isBanned ? "Unban" : "Ban"} ${p.name ?? p.phone}?`)) return;
        if (p.isBanned) {
            await deleteDoc(doc(db, "bannedPlayers", p.phone07)).catch(() => {});
            setBanned(prev => { const n = new Set(prev); n.delete(p.phone07); return n; });
        } else {
            await setDoc(doc(db, "bannedPlayers", p.phone07), { phone: p.phone07, bannedAt: new Date() }).catch(() => {});
            setBanned(prev => new Set([...prev, p.phone07]));
        }
    };

    const filtered   = enriched.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return <>
        <Card title="Players">
            <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
                <input style={{ ...s.input, maxWidth: 260 }} placeholder="Search by name or phone…"
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                <span style={{ fontSize: "0.8rem", color: "#888", marginLeft: "auto" }}>
                    {filtered.length} player{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                <table style={s.table}>
                    <thead><tr>
                        {["#","Name","Phone","Games","Spent","Last Played","Status","Action"].map(h => <th key={h} style={s.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {paginated.length ? paginated.map((p, i) => (
                            <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                <td style={{ ...s.td, color: "#aaa", fontSize: "0.78rem" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                <td style={s.td}>{p.name ?? "—"}</td>
                                <td style={s.td}>{p.phone ?? "—"}</td>
                                <td style={{ ...s.td, fontWeight: 600 }}>{p.games}</td>
                                <td style={{ ...s.td, color: "#059669", fontWeight: 600 }}>KSh {p.spent.toLocaleString()}</td>
                                <td style={{ ...s.td, fontSize: "0.78rem" }}>{p.lastPlayed?.toLocaleDateString('en-GB') ?? "—"}</td>
                                <td style={s.td}>
                                    <span style={{ background: p.isBanned ? "#fee2e2" : "#dcfce7", color: p.isBanned ? "#991b1b" : "#166534", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>
                                        {p.isBanned ? "banned" : "active"}
                                    </span>
                                </td>
                                <td style={s.td}>
                                    <button onClick={() => toggleBan(p)}
                                        style={{ ...s.btn, background: p.isBanned ? "#dcfce7" : "#fee2e2", color: p.isBanned ? "#166534" : "#991b1b" }}>
                                        {p.isBanned ? "Unban" : "Ban"}
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No players yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
                    <button style={{ ...s.btn, background: "#f0f0f8", color: "#444" }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span style={{ fontSize: "0.85rem", color: "#555", padding: "6px 8px" }}>Page {page} of {totalPages}</span>
                    <button style={{ ...s.btn, background: "#f0f0f8", color: "#444" }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
            )}
        </Card>
    </>;
}

// ── Payments ───────────────────────────────────────────────────────────────────
function Payments() {
    const [rows,   setRows]   = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [page,   setPage]   = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        getDocs(collection(db, "payments"))
            .then(snap => setRows(snap.docs.map(d => ({ _id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))))
            .catch(() => {});
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
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const counts: Record<string, number> = { all: rows.length };
    rows.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });

    return <>
        <Card title="Payments">
            {/* Summary */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {[
                    { l: "Total Payments", v: rows.length },
                    { l: "Paid",           v: counts.paid    ?? 0, color: "#166534" },
                    { l: "Pending",        v: counts.pending ?? 0, color: "#92400e" },
                    { l: "Failed",         v: counts.failed  ?? 0, color: "#9f1239" },
                    { l: "Total Revenue",  v: `KSh ${totalPaid.toLocaleString()}`, color: "#4361ee" },
                ].map(({ l, v, color }) => (
                    <div key={l} style={{ ...s.stat, minWidth: 110, flex: "1 1 110px" }}>
                        <div style={{ ...s.statN, color: color ?? "#1a1a2e" }}>{v}</div>
                        <div style={s.statL}>{l}</div>
                    </div>
                ))}
            </div>

            {/* Search + filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <input style={{ ...s.input, maxWidth: 260 }} placeholder="Search phone, name, receipt…"
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["all", "paid", "pending", "failed"].map(f => (
                        <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                            style={{ ...s.btn, background: filter === f ? "#4361ee" : "#f0f0f8", color: filter === f ? "#fff" : "#444" }}>
                            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: 8 }}>
                Showing {paginated.length} of {filtered.length} records
            </div>

            <Table
                heads={["#", "Name", "Phone", "Amount (KES)", "Trigger", "Status", "Trans ID", "Receipt", "Date"]}
                rows={paginated.length ? paginated.map((r, i) => [
                    (page - 1) * PAGE_SIZE + i + 1,
                    r.name    ?? "—",
                    r.phone   ?? "—",
                    r.amount  != null ? `KSh ${r.amount}` : "—",
                    r.game ? `${r.game} / ${r.trigger ?? "—"}` : (r.trigger ?? r.round ?? "—"),
                    <StatusBadge status={r.status ?? "pending"} />,
                    r.trans_id ?? r.checkoutRequestId ?? "—",
                    r.receipt  ?? r.trans_id ?? "—",
                    r.createdAt?.toDate?.()?.toLocaleString('en-GB') ?? "—",
                ]) : [["—", "No payments found", "", "", "", "", "", "", ""]]}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                    <button style={{ ...s.btn, background: "#f0f0f8", color: "#444" }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                        .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                            acc.push(p); return acc;
                        }, [])
                        .map((p, i) => p === "…"
                            ? <span key={`e${i}`} style={{ padding: "6px 4px", color: "#aaa" }}>…</span>
                            : <button key={p} onClick={() => setPage(p as number)}
                                style={{ ...s.btn, background: page === p ? "#4361ee" : "#f0f0f8", color: page === p ? "#fff" : "#444", minWidth: 34 }}>{p}</button>
                        )}
                    <button style={{ ...s.btn, background: "#f0f0f8", color: "#444" }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
            )}
        </Card>
    </>;
}

// ── Game Sessions ──────────────────────────────────────────────────────────────
function GameSessions() {
    const [rows,     setRows]     = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [search,   setSearch]   = useState("");
    const [tab,      setTab]      = useState<"sessions" | "stuck">("sessions");
    const [granting, setGranting] = useState<string | null>(null);
    const [page,     setPage]     = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        getDocs(collection(db, "gameSessions"))
            .then(snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
            .catch(() => {});
        getDocs(collection(db, "payments"))
            .then(snap => setPayments(snap.docs.map(d => ({ _id: d.id, ...d.data() }))))
            .catch(() => {});
        getDocs(collection(db, "dismissedPayments"))
            .then(snap => setDismissed(new Set(snap.docs.map(d => d.id))))
            .catch(() => {});
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
            await setDoc(doc(db, "grantedSessions", phone07), {
                phone: phone07, name: p.name ?? "", grantedAt: new Date(),
                grantedBy: "admin", paymentId: p._id,
            });
            // Remove from stuck list optimistically
            setPayments(prev => prev.filter(x => x._id !== p._id));
        } catch (e) {
            alert("Failed to grant session: " + e);
        }
        setGranting(null);
    };

    const filtered   = rows.filter(r => {
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
        seen.add(key); return true;
    });
    const totalPages = Math.max(1, Math.ceil(deduped.length / PAGE_SIZE));
    const paginated  = deduped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return <>
        <Card title="Game Sessions">
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={() => setTab("sessions")}
                    style={{ ...s.btn, background: tab === "sessions" ? "#4361ee" : "#f0f0f8", color: tab === "sessions" ? "#fff" : "#444" }}>
                    🎮 All Sessions ({rows.length})
                </button>
                <button onClick={() => setTab("stuck")}
                    style={{ ...s.btn, background: tab === "stuck" ? "#e53e3e" : "#f0f0f8", color: tab === "stuck" ? "#fff" : "#444" }}>
                    ⚠️ Stuck at Payment ({stuckPlayers.length})
                </button>
            </div>

            {tab === "stuck" ? (<>
                <div style={{ ...s.warn, marginBottom: 12 }}>
                    These players paid but never started a game session. Click <strong>Grant Session</strong> to restore their access.
                </div>
                <Table
                    heads={["Name", "Phone", "Amount", "Paid At", "Action"]}
                    rows={stuckPlayers.length ? stuckPlayers.map(p => [
                        p.name  ?? "—",
                        (p.phone ?? "—").replace(/^254/, "0"),
                        p.amount != null ? `KSh ${p.amount}` : "—",
                        p.createdAt?.toDate?.()?.toLocaleString('en-GB') ?? "—",
                        <div style={{ display: "flex", gap: 6 }}>
                            <button
                                disabled={granting === (p.phone ?? "").replace(/^254/, "0")}
                                onClick={() => grantSession(p)}
                                style={{ ...s.btn, background: "#22c55e", color: "#fff", opacity: granting ? 0.6 : 1 }}>
                                {granting === (p.phone ?? "").replace(/^254/, "0") ? "Granting…" : "✓ Grant Session"}
                            </button>
                            <button
                                onClick={() => {
                                    setDoc(doc(db, "dismissedPayments", p._id), { dismissedAt: new Date() }).catch(() => {});
                                    setDismissed(prev => new Set([...prev, p._id]));
                                }}
                                style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>
                                Already Granted
                            </button>
                        </div>
                    ]) : [["No stuck players 🎉", "", "", "", ""]]}
                />
            </>) : (<>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: "0.85rem", color: "#666" }}>
                        Total: <strong>{deduped.length}</strong> session{deduped.length !== 1 ? "s" : ""}
                    </span>
                    <input type="text" placeholder="Search by name or phone..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        style={{ ...s.input, width: "auto", minWidth: 220 }} />
                </div>
                <Table
                    heads={["Player", "Phone", "Power Used", "R1", "R2", "R3", "Total", "Date"]}
                    rows={paginated.length ? paginated.map(r => [
                        r.name ?? "—", r.phone ?? "—", r.power ?? "—",
                        (r.r1Score ?? 0).toLocaleString(),
                        (r.r2Score ?? 0).toLocaleString(),
                        (r.r3Bonus ?? 0).toLocaleString(),
                        (r.total   ?? 0).toLocaleString(),
                        r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "—",
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
            </>)}
        </Card>
    </>;
}

// ── Leaderboard ────────────────────────────────────────────────────────────────
function AdminLeaderboard() {
    const [rows,   setRows]   = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [page,   setPage]   = useState(1);
    const PAGE_SIZE = 20;
    const NEW_THRESHOLD_DAYS = 3; // badge players who joined leaderboard within last 3 days

    useEffect(() => {
        const toKey = (p: string) => String(p).replace(/^0/, "254");

        const sqlFetch = fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard")
            .then(r => r.json())
            .catch(() => []); // Fallback for HTTPS mixed content blocking
        const fbFetch = getDocs(collection(db, "leaderboard"))
            .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []);

        Promise.all([sqlFetch, fbFetch]).then(([sqlRaw, fbRaw]) => {
            const byPhone = new Map<string, any>();

            (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
                const phone = toKey(String(d.msisdn ?? ""));
                const score = d.score ?? 0;
                const phone07 = phone.replace(/^254/, "0");
                const existing = byPhone.get(phone);
                if (!existing || score > existing.score)
                    byPhone.set(phone, { phone: phone07, name: phone07.slice(0, 3) + "*******", score, playedAt: null });
            });

            (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
                const phone = toKey(d.phone || d.id || "");
                const score = d.score ?? 0;
                const phone07 = phone.replace(/^254/, "0");
                const existing = byPhone.get(phone);
                const name = d.name && !/^\d/.test(d.name) ? d.name : existing?.name;
                if (!existing || score > existing.score)
                    byPhone.set(phone, { phone: phone07, name: name ?? phone07, score, playedAt: d.playedAt ?? null });
                else if (existing && name)
                    byPhone.set(phone, { ...existing, name });
            });

            const sorted = Array.from(byPhone.values())
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .map((d, i) => ({ ...d, rank: i + 1 }));
            setRows(sorted);
        }).catch(() => {});
    }, []);

    const exportCSV = () => {
        const header = "Rank,Name,Phone,Score,Date";
        const csv = rows.map(r => [
            r.rank, r.name ?? "", r.phone ?? "",
            r.score ?? 0,
            r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "",
        ].join(",")).join("\n");
        const blob = new Blob([header + "\n" + csv], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = "leaderboard.csv"; a.click();
    };

    const cutoff = Date.now() - NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    const isNew  = (r: any) => (r.playedAt?.toDate?.()?.getTime() ?? 0) > cutoff;

    const filtered   = rows.filter(r => !search ||
        (r.name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.phone ?? "").includes(search)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return <>
        <Card title="Leaderboard">
            <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <input type="text" placeholder="Search by name or phone..."
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    style={{ ...s.input, maxWidth: 260 }} />
                <span style={{ fontSize: "0.8rem", color: "#888" }}>{filtered.length} player{filtered.length !== 1 ? "s" : ""}</span>
                <button onClick={exportCSV} style={{ ...s.btn, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", marginLeft: "auto" }}>
                    📥 Export CSV
                </button>
            </div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                <table style={s.table}>
                    <thead><tr>
                        {["Rank","Player","Phone","Score","Date","Status"].map(h => <th key={h} style={s.th}>{h === "Status" ? "" : h}</th>)}
                    </tr></thead>
                    <tbody>
                        {paginated.length ? paginated.map((r, i) => (
                            <tr key={r.phone ?? i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                <td style={{ ...s.td, fontWeight: 700 }}>{r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank-1] : r.rank}</td>
                                <td style={s.td}>
                                    {r.name ?? "—"}
                                    {isNew(r) && <span style={{ marginLeft: 6, background: "#fef9c3", color: "#854d0e", fontSize: "0.68rem", fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>NEW</span>}
                                </td>
                                <td style={s.td}>{r.phone ?? "—"}</td>
                                <td style={{ ...s.td, fontWeight: 700, color: "#4361ee" }}>{(r.score ?? 0).toLocaleString()}</td>
                                <td style={{ ...s.td, fontSize: "0.78rem" }}>{r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "—"}</td>
                                <td style={s.td}>
                                    {isNew(r) && <span style={{ background: "#dcfce7", color: "#166534", fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>🆕 Recent</span>}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No entries found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
                    <button style={{ ...s.btn, background: "#f0f0f8", color: "#444" }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span style={{ fontSize: "0.85rem", color: "#555", padding: "6px 8px" }}>Page {page} of {totalPages}</span>
                    <button style={{ ...s.btn, background: "#f0f0f8", color: "#444" }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f0f2f8;
  color: #1a1a2e;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Topbar ── */
.adm-topbar {
  background: linear-gradient(135deg, #0f0c29 0%, #1a1a2e 60%, #24243e 100%);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.4);
  min-height: 58px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.adm-topbar h1 {
  color: #ffd200;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.3px;
}
.adm-topbar a { color: #8899aa; font-size: 0.8rem; text-decoration: none; transition: color 0.15s; }
.adm-topbar a:hover { color: #fff; }

/* ── Layout ── */
.adm-layout { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ── */
.adm-sidebar {
  width: 220px; min-width: 220px;
  background: #fff;
  border-right: 1px solid #e4e6f0;
  padding: 16px 10px 20px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 2px;
  flex-shrink: 0;
}
.adm-sidebar-label {
  font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.4px; color: #b0b8cc; padding: 10px 10px 6px;
}
.adm-sidebar-divider {
  height: 1px; background: #f0f2f8; margin: 8px 6px;
}
.adm-tab {
  display: flex; align-items: center; gap: 9px; padding: 9px 12px;
  border-radius: 8px; border: none; background: transparent; color: #5a6480;
  cursor: pointer; font-size: 0.84rem; text-align: left; width: 100%;
  transition: all 0.15s; font-family: inherit; font-weight: 500;
}
.adm-tab:hover { background: #f4f5fb; color: #1a1a2e; }
.adm-tab.active {
  background: linear-gradient(135deg, #eef0ff 0%, #e8ecff 100%);
  color: #4361ee; font-weight: 700;
  box-shadow: inset 3px 0 0 #4361ee;
}
.adm-tab.active .adm-dot { background: #4361ee; box-shadow: 0 0 6px rgba(67,97,238,0.5); }
.adm-dot { width: 7px; height: 7px; border-radius: 50%; background: #d8dce8; flex-shrink: 0; transition: all 0.15s; }

/* ── Content ── */
.adm-content { flex: 1; overflow-y: auto; padding: 28px 28px 60px; min-width: 0; }

/* ── Cards ── */
.adm-content > div > div[style] h2 {
  display: flex; align-items: center; gap: 8px;
}

/* ── Mobile ── */
.adm-hamburger {
  display: none; background: none; border: none; cursor: pointer;
  flex-direction: column; gap: 5px; padding: 6px; border-radius: 6px;
}
.adm-hamburger span { display: block; width: 22px; height: 2px; background: #ffd200; border-radius: 2px; }
.adm-hamburger:hover { background: rgba(255,255,255,0.08); }

.adm-drawer-backdrop {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 50;
  backdrop-filter: blur(2px);
}
.adm-drawer {
  position: fixed; top: 0; left: 0; height: 100vh; width: 240px;
  background: #fff; z-index: 51; transform: translateX(-100%);
  transition: transform 0.25s ease; display: flex; flex-direction: column;
  box-shadow: 6px 0 30px rgba(0,0,0,0.25);
}
.adm-drawer.open { transform: translateX(0); }
.adm-drawer-header {
  background: linear-gradient(135deg, #0f0c29 0%, #1a1a2e 100%);
  padding: 16px 16px 14px; display: flex; align-items: center; justify-content: space-between;
}
.adm-drawer-header span { color: #ffd200; font-weight: 800; font-size: 0.95rem; }
.adm-drawer-close { background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.adm-drawer-close:hover { color: #fff; }
.adm-drawer-nav { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }

@media (max-width: 720px) {
  .adm-sidebar        { display: none; }
  .adm-hamburger      { display: flex; }
  .adm-drawer-backdrop.open { display: block; }
  .adm-content        { padding: 16px 14px 60px; }
}
`;

// ── Main export ────────────────────────────────────────────────────────────────
export function AdminView({ initialTab }: { initialTab?: AdminTab } = {}) {
    const [authed, setAuthed] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [tab, setTab] = useState<AdminTab>(initialTab ?? "dashboard");
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
                        style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,100,100,0.3)", background: "rgba(255,80,80,0.12)", color: "#ff8080", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
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
                    <div className="adm-sidebar-label">Bongo Quiz</div>
                    {TABS.filter(t => ["dashboard","players","payments","games","leaderboard","questions","powers","achievements"].includes(t.id)).map(t => (
                        <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                            <span className="adm-dot" />{t.label}
                        </button>
                    ))}
                    <div className="adm-sidebar-divider" />
                    <div className="adm-sidebar-label">Other Games</div>
                    {TABS.filter(t => ["kcse","biblequiz","mathquiz","bioquiz","genquiz"].includes(t.id)).map(t => (
                        <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                            <span className="adm-dot" />{t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="adm-layout">
                <nav className="adm-sidebar">
                    <div className="adm-sidebar-label">Bongo Quiz</div>
                    {TABS.filter(t => ["dashboard","players","payments","games","leaderboard","questions","powers","achievements"].includes(t.id)).map(t => (
                        <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                            <span className="adm-dot" />{t.label}
                        </button>
                    ))}
                    <div className="adm-sidebar-divider" />
                    <div className="adm-sidebar-label">Other Games</div>
                    {TABS.filter(t => ["kcse","biblequiz","mathquiz","bioquiz","genquiz"].includes(t.id)).map(t => (
                        <button key={t.id} className={`adm-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                            <span className="adm-dot" />{t.label}
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
                    {tab === "biblequiz"    && <AdminBibleQuiz />}
                    {tab === "mathquiz"     && <AdminMathQuiz />}
                    {tab === "bioquiz"      && <AdminBioQuiz />}
                    {tab === "genquiz"      && <AdminGenQuiz />}
                </main>
            </div>
        </div>
        </>
    );
}
