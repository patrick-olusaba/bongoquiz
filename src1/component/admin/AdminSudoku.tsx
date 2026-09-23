// AdminSudoku.tsx — Sudoku admin: payments, sessions, leaderboard
import { useState, useEffect } from "react";
import { collection, getDocs, doc, query, where, setDoc } from "firebase/firestore";
import { db } from "../../firebase.ts";

const s: Record<string, React.CSSProperties> = {
    card:   { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2:     { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    table:  { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" },
    th:     { background: "#f5f5ff", color: "#4361ee", padding: "10px 14px", textAlign: "left" as const, borderBottom: "2px solid #e0e0f0", fontWeight: 600 },
    td:     { padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const },
    btn:    { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" },
    input:  { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const },
    label:  { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#555", marginBottom: 4 },
    row:    { marginBottom: 12 },
};

const PAGE_SIZE = 20;

function Pagination({ total, page, setPage }: { total: number; page: number; setPage: (p: number) => void }) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return null;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button onClick={() => setPage(page - 1)} disabled={page === 0}
                style={{ ...s.btn, background: "#f0f0f8", color: "#444", opacity: page === 0 ? 0.4 : 1 }}>‹ Prev</button>
            {Array.from({ length: pages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                    style={{ ...s.btn, minWidth: 32, background: page === i ? "#4361ee" : "#f0f0f8", color: page === i ? "#fff" : "#444" }}>
                    {i + 1}
                </button>
            ))}
            <button onClick={() => setPage(page + 1)} disabled={page === pages - 1}
                style={{ ...s.btn, background: "#f0f0f8", color: "#444", opacity: page === pages - 1 ? 0.4 : 1 }}>Next ›</button>
        </div>
    );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────
function SudokuPayments() {
    const [rows,   setRows]   = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [page,   setPage]   = useState(0);

    useEffect(() => {
        Promise.all([
            getDocs(collection(db, "sudokuPayments")),
            getDocs(query(collection(db, "payments"), where("game", "==", "SUDOKU"))),
        ]).then(([snap1, snap2]) => {
            const all = [
                ...snap1.docs.map(d => ({ _id: d.id, ...d.data() })),
                ...snap2.docs.map(d => ({ _id: d.id, ...d.data() })),
            ].sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setRows(all);
        }).catch(() => {});
    }, []);

    const counts: Record<string, number> = { all: rows.length };
    rows.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    const totalPaid = rows.filter(r => r.status === "paid").reduce((a, r) => a + (r.amount ?? 0), 0);

    const filtered = rows.filter(r => {
        const matchF = filter === "all" || r.status === filter;
        const term = search.toLowerCase();
        const matchS = !term || (r.phone ?? "").includes(term) || (r.name ?? "").toLowerCase().includes(term);
        return matchF && matchS;
    });

    const StatusBadge = ({ status }: { status: string }) => {
        const c: Record<string, { bg: string; color: string }> = {
            paid:    { bg: "#dcfce7", color: "#166534" },
            pending: { bg: "#fef9c3", color: "#854d0e" },
            failed:  { bg: "#fee2e2", color: "#991b1b" },
        };
        const col = c[status] ?? { bg: "#f0f0f0", color: "#555" };
        return <span style={{ ...col, padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>{status}</span>;
    };

    return (
        <div style={s.card}>
            <h2 style={s.h2}>Payments</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {[{ l: "Total", v: rows.length }, { l: "Paid", v: counts.paid ?? 0, color: "#059669" }, { l: "Pending", v: counts.pending ?? 0, color: "#d97706" }, { l: "Revenue", v: `KSh ${totalPaid.toLocaleString()}`, color: "#4361ee" }]
                    .map(({ l, v, color }) => (
                        <div key={l} style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", border: "1px solid #e8eaf0", flex: "1 1 100px" }}>
                            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: color ?? "#1a1a2e" }}>{v}</div>
                            <div style={{ fontSize: "0.75rem", color: "#888" }}>{l}</div>
                        </div>
                    ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <input style={{ ...s.input, maxWidth: 220 }} placeholder="Search phone or name…" value={search} onChange={e => setSearch(e.target.value)} />
                {["all", "paid", "pending", "failed"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{ ...s.btn, background: filter === f ? "#4361ee" : "#f0f0f8", color: filter === f ? "#fff" : "#444" }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
                    </button>
                ))}
            </div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                <table style={s.table}>
                    <thead><tr>{["#", "Name", "Phone", "Amount", "Status", "Trans ID", "Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                        {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((r, i) => (
                            <tr key={r._id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                <td style={s.td}>{page * PAGE_SIZE + i + 1}</td>
                                <td style={s.td}>{r.name ?? "—"}</td>
                                <td style={s.td}>{r.phone ?? "—"}</td>
                                <td style={s.td}>{r.amount != null ? `KSh ${r.amount}` : "—"}</td>
                                <td style={s.td}><StatusBadge status={r.status ?? "pending"} /></td>
                                <td style={s.td}>{r.trans_id ?? "—"}</td>
                                <td style={s.td}>{r.createdAt?.toDate?.()?.toLocaleString('en-GB') ?? "—"}</td>
                            </tr>
                        ))}
                        {!filtered.length && <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No payments</td></tr>}
                    </tbody>
                </table>
            </div>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
        </div>
    );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function SudokuSessions() {
    const [rows, setRows] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"sessions" | "stuck">("sessions");
    const [granting, setGranting] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    useEffect(() => {
        getDocs(collection(db, "sudokuSessions"))
            .then(snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
            .catch(() => {});
        getDocs(query(collection(db, "payments"), where("game", "==", "SUDOKU")))
            .then(snap => setPayments(snap.docs.map(d => ({ _id: d.id, ...d.data() }))))
            .catch(() => {});
        getDocs(collection(db, "dismissedSudokuPayments"))
            .then(snap => setDismissed(new Set(snap.docs.map(d => d.id))))
            .catch(() => {});
    }, []);

    const stuckPlayers = payments.filter(p => {
        if (p.status !== "paid") return false;
        if (dismissed.has(p._id)) return false;
        const paidAt: Date = p.createdAt?.toDate?.() ?? new Date(0);
        // const phone07 = (p.phone ?? "").replace(/^254|^/, "0").replace(/^00/, "0"); // simple normalizer
        // Actual normalizer for phone search
        const norm = (ph: string) => String(ph).replace(/^\+?254|^0/, "").slice(-9);
        const pNorm = norm(p.phone);
        return !rows.some(s => norm(s.phone) === pNorm && (s.playedAt?.toDate?.() ?? new Date(0)) > paidAt);
    });

    const grantSession = async (p: any) => {
        const phone07 = (p.phone ?? "").replace(/^254/, "0");
        setGranting(phone07);
        try {
            await setDoc(doc(db, "grantedSudokuSessions", phone07), {
                phone: phone07, name: p.name ?? "", grantedAt: new Date(), grantedBy: "admin", paymentId: p._id,
            });
            setPayments(prev => prev.filter(x => x._id !== p._id));
        } catch (e) { alert("Failed to grant session: " + e); }
        setGranting(null);
    };

    const filtered = rows.filter(r => !search ||
        (r.name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.phone ?? "").includes(search));

    return (
        <div style={s.card}>
            <h2 style={s.h2}>Game Sessions <span style={{ color: "#aaa", fontWeight: 400, fontSize: "0.85rem" }}>({rows.length})</span></h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setTab("sessions")}
                    style={{ ...s.btn, background: tab === "sessions" ? "#4361ee" : "#f0f0f8", color: tab === "sessions" ? "#fff" : "#444" }}>
                    🎮 All Sessions ({rows.length})
                </button>
                <button onClick={() => setTab("stuck")}
                    style={{ ...s.btn, background: tab === "stuck" ? "#dc2626" : "#f0f0f8", color: tab === "stuck" ? "#fff" : "#444" }}>
                    ⚠️ Stuck at Payment ({stuckPlayers.length})
                </button>
            </div>

            {tab === "stuck" ? (<>
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#9f1239", fontSize: "0.85rem" }}>
                    These players paid but never started a game session. Click <strong>Grant Session</strong> to restore their access.
                </div>
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                    <table style={s.table}>
                        <thead><tr>{["Name", "Phone", "Amount", "Paid At", "Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {stuckPlayers.length ? stuckPlayers.map(p => (
                                <tr key={p._id}>
                                    <td style={s.td}>{p.name ?? "—"}</td>
                                    <td style={s.td}>{(p.phone ?? "—").replace(/^254/, "0")}</td>
                                    <td style={s.td}>{p.amount != null ? `KSh ${p.amount}` : "—"}</td>
                                    <td style={s.td}>{p.createdAt?.toDate?.()?.toLocaleString("en-GB") ?? "—"}</td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button disabled={granting === (p.phone ?? "").replace(/^254/, "0")} onClick={() => grantSession(p)}
                                                style={{ ...s.btn, background: "#22c55e", color: "#fff" }}>
                                                {granting === (p.phone ?? "").replace(/^254/, "0") ? "Granting…" : "✓ Grant Session"}
                                            </button>
                                            <button onClick={() => {
                                                setDoc(doc(db, "dismissedSudokuPayments", p._id), { dismissedAt: new Date() }).catch(() => {});
                                                setDismissed(prev => new Set([...prev, p._id]));
                                            }} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Already Granted</button>
                                        </div>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No stuck players 🎉</td></tr>}
                        </tbody>
                    </table>
                </div>
            </>) : (<>
                <input style={{ ...s.input, maxWidth: 240, marginBottom: 14 }} placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                    <table style={s.table}>
                        <thead><tr>{["#", "Name", "Phone", "Score", "Difficulty", "Stage", "Hints", "Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                    <td style={s.td}>{page * PAGE_SIZE + i + 1}</td>
                                    <td style={s.td}>{r.name ?? "—"}</td>
                                    <td style={s.td}>{r.phone ?? "—"}</td>
                                    <td style={s.td}><strong>{(r.score ?? 0).toLocaleString()}</strong></td>
                                    <td style={s.td}>{r.difficulty ?? "—"}</td>
                                    <td style={s.td}>{r.stage ?? "—"}</td>
                                    <td style={s.td}>{r.hintsUsed ?? 0}</td>
                                    <td style={s.td}>{r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "—"}</td>
                                </tr>
                            ))}
                            {!filtered.length && <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No sessions</td></tr>}
                        </tbody>
                    </table>
                </div>
                <Pagination total={filtered.length} page={page} setPage={setPage} />
            </>)}
        </div>
    );
}

// ── Leaderboard Tab ───────────────────────────────────────────────────────────
function SudokuLeaderboard() {
    const [rows, setRows] = useState<any[]>([]);
    const [page, setPage] = useState(0);

    useEffect(() => {
        getDocs(collection(db, "sudokuLeaderboard"))
            .then(snap => setRows(snap.docs.map(d => ({ ...d.data(), id: d.id }))
                .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))))
            .catch(() => {});
    }, []);

    return (
        <div style={s.card}>
            <h2 style={s.h2}>Leaderboard <span style={{ color: "#aaa", fontWeight: 400, fontSize: "0.85rem" }}>({rows.length} players)</span></h2>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                <table style={s.table}>
                    <thead><tr>{["Rank", "Name", "Phone", "Score", "Last Played"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                        {rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((r, i) => {
                            const rank = page * PAGE_SIZE + i;
                            return (
                                <tr key={r.id || i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                    <td style={s.td}>{["🥇","🥈","🥉"][rank] ?? rank + 1}</td>
                                    <td style={s.td}><strong>{r.name ?? "—"}</strong></td>
                                    <td style={s.td}>{(r.phone ?? "").slice(0, 4) + "****"}</td>
                                    <td style={s.td}><strong style={{ color: "#4361ee" }}>{(r.score ?? 0).toLocaleString()} pts</strong></td>
                                    <td style={s.td}>{r.playedAt?.toDate?.()?.toLocaleDateString('en-GB') ?? "—"}</td>
                                </tr>
                            );
                        })}
                        {!rows.length && <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No data yet</td></tr>}
                    </tbody>
                </table>
            </div>
            <Pagination total={rows.length} page={page} setPage={setPage} />
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────
type SudokuTab = "payments" | "sessions" | "leaderboard";

export function AdminSudoku() {
    const [tab, setTab] = useState<SudokuTab>("payments");

    const tabs: { id: SudokuTab; label: string }[] = [
        { id: "payments",    label: "💳 Payments"    },
        { id: "sessions",    label: "🎮 Sessions"    },
        { id: "leaderboard", label: "🏆 Leaderboard" },
    ];

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit",
                            background: tab === t.id ? "#4361ee" : "#f0f0f8", color: tab === t.id ? "#fff" : "#444" }}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === "payments"    && <SudokuPayments />}
            {tab === "sessions"    && <SudokuSessions />}
            {tab === "leaderboard" && <SudokuLeaderboard />}
        </div>
    );
}
