// AdminMathQuiz.tsx — Math Quiz admin: questions, payments, sessions, leaderboard
import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase.ts";

interface BQQuestion {
    id?: string;
    question: string;
    options: string[];
    answer: number; // index of correct option
    category?: string;
    active: boolean;
}

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
const badge = (ok: boolean): React.CSSProperties => ({ padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700, background: ok ? "#dcfce7" : "#fee2e2", color: ok ? "#166534" : "#991b1b" });

// ── Parse CSV text into questions ─────────────────────────────────────────────
// Expected format: question,optionA,optionB,optionC,optionD,correct(A-D),category
function parseCSV(text: string): BQQuestion[] {
    return text.split("\n")
        .map(l => l.trim()).filter(l => l && !l.startsWith("#"))
        .map(line => {
            const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
            if (cols.length < 6) return null;
            const raw = cols[5].toUpperCase();
            const answerIdx = ["A","B","C","D"].includes(raw) ? raw.charCodeAt(0) - 65 : parseInt(cols[5]);
            if (isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) return null;
            return {
                question: cols[0],
                options:  [cols[1], cols[2], cols[3], cols[4]],
                answer:   answerIdx,
                category: cols[6] ?? "",
                active:   true,
            } as BQQuestion;
        }).filter(Boolean) as BQQuestion[];
}

// ── Add/Edit Question Modal ───────────────────────────────────────────────────
function QuestionModal({ q, onSave, onClose }: { q: BQQuestion | null; onSave: (q: BQQuestion) => void; onClose: () => void }) {
    const blank: BQQuestion = { question: "", options: ["", "", "", ""], answer: 0, category: "", active: true };
    const [form, setForm] = useState<BQQuestion>(q ?? blank);

    const setOpt = (i: number, v: string) => setForm(f => { const o = [...f.options]; o[i] = v; return { ...f, options: o }; });

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
                <h3 style={{ margin: "0 0 20px", color: "#1a1a2e" }}>{q ? "Edit Question" : "Add Question"}</h3>
                <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
                    <div style={s.row}>
                        <label style={s.label}>Question</label>
                        <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} value={form.question}
                            onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required />
                    </div>
                    {form.options.map((opt, i) => (
                        <div key={i} style={s.row}>
                            <label style={s.label}>
                                Option {String.fromCharCode(65 + i)}
                                <input type="radio" name="correct" checked={form.answer === i}
                                    onChange={() => setForm(f => ({ ...f, answer: i }))}
                                    style={{ marginLeft: 8 }} /> Correct
                            </label>
                            <input style={s.input} value={opt} onChange={e => setOpt(i, e.target.value)} required />
                        </div>
                    ))}
                    <div style={s.row}>
                        <label style={s.label}>Category (optional)</label>
                        <input style={s.input} value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                        <label style={{ fontSize: "0.85rem" }}>Active</label>
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button type="button" onClick={onClose} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                        <button type="submit" style={{ ...s.btn, background: "#4361ee", color: "#fff", padding: "8px 20px" }}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
            onClick={e => e.target === e.currentTarget && onCancel()}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 400 }}>
                <h3 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>Confirm Action</h3>
                <p style={{ margin: "0 0 24px", color: "#555", lineHeight: 1.5 }}>{message}</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={onCancel} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                    <button onClick={onConfirm} style={{ ...s.btn, background: "#dc2626", color: "#fff" }}>OK</button>
                </div>
            </div>
        </div>
    );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
function BQQuestions() {
    const [questions, setQuestions] = useState<BQQuestion[]>([]);
    const [editing,   setEditing]   = useState<BQQuestion | null>(null);
    const [adding,    setAdding]    = useState(false);
    const [search,    setSearch]    = useState("");
    const [qTab,      setQTab]      = useState<"all"|"duplicates">("all");
    const [importing, setImporting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
    const [msg,       setMsg]       = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getDocs(collection(db, "genQuizQuestions"))
            .then(snap => setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as BQQuestion))
                .sort((a, b) => a.question.localeCompare(b.question))))
            .catch(() => {});
    }, []);

    const dupGroups: BQQuestion[][] = (() => {
        const map = new Map<string, BQQuestion[]>();
        questions.forEach(q => {
            const key = q.question.trim().toLowerCase().replace(/\s+/g, " ");
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(q);
        });
        return Array.from(map.values()).filter(g => g.length > 1);
    })();

    const save = async (q: BQQuestion) => {
        if (q.id) {
            const { id, ...data } = q;
            await import("firebase/firestore").then(({ updateDoc, doc: fDoc }) =>
                updateDoc(fDoc(db, "genQuizQuestions", id!), data));
            setQuestions(prev => prev.map(x => x.id === id ? q : x));
        } else {
            const ref = await addDoc(collection(db, "genQuizQuestions"), q);
            setQuestions(prev => [...prev, { ...q, id: ref.id }]);
        }
        setEditing(null); setAdding(false);
    };

    const del = async (id: string) => {
        await deleteDoc(doc(db, "genQuizQuestions", id));
        setQuestions(prev => prev.filter(q => q.id !== id));
        setDeleteQuestionId(null);
    };

    const showDeleteConfirm = (id: string) => {
        setDeleteQuestionId(id);
    };

    const deleteAllQuestions = async () => {
        const batch = writeBatch(db);
        questions.forEach(q => batch.delete(doc(db, "genQuizQuestions", q.id!)));
        await batch.commit();
        setQuestions([]);
        setShowConfirm(false);
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true); setMsg("");
        try {
            const text = await file.text();
            const parsed = parseCSV(text);
            if (!parsed.length) { setMsg("No valid questions found. Check CSV format."); setImporting(false); return; }
            const batch = writeBatch(db);
            parsed.forEach(q => batch.set(doc(collection(db, "genQuizQuestions")), q));
            await batch.commit();
            const snap = await getDocs(collection(db, "genQuizQuestions"));
            setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as BQQuestion)));
            setMsg(`✅ Imported ${parsed.length} questions`);
        } catch (err) {
            setMsg("Import failed: " + err);
        }
        setImporting(false);
        e.target.value = "";
    };

    const filtered = questions.filter(q =>
        !search || q.question.toLowerCase().includes(search.toLowerCase()) || (q.category ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const extraCount = dupGroups.reduce((a, g) => a + g.length - 1, 0);

    return <>
        {(editing || adding) && <QuestionModal q={editing} onSave={save} onClose={() => { setEditing(null); setAdding(false); }} />}
        {showConfirm && <ConfirmModal 
            message={`Delete ALL ${questions.length} questions? This cannot be undone.`}
            onConfirm={deleteAllQuestions}
            onCancel={() => setShowConfirm(false)}
        />}
        {deleteQuestionId && <ConfirmModal 
            message="Delete this question? This cannot be undone."
            onConfirm={() => del(deleteQuestionId)}
            onCancel={() => setDeleteQuestionId(null)}
        />}
        <div style={s.card}>
            <h2 style={s.h2}>Questions <span style={{ color: "#aaa", fontWeight: 400, fontSize: "0.85rem" }}>({questions.length} total)</span></h2>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setQTab("all")}
                    style={{ ...s.btn, background: qTab === "all" ? "#4361ee" : "#f0f0f8", color: qTab === "all" ? "#fff" : "#444" }}>
                    ❓ All Questions
                </button>
                <button onClick={() => setQTab("duplicates")}
                    style={{ ...s.btn, background: qTab === "duplicates" ? "#dc2626" : "#f0f0f8", color: qTab === "duplicates" ? "#fff" : "#444" }}>
                    ⚠️ Duplicates {extraCount > 0 && `(${extraCount} extra)`}
                </button>
            </div>

            {qTab === "duplicates" ? (
                dupGroups.length === 0 ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "20px", textAlign: "center", color: "#166534", fontWeight: 600 }}>
                        ✅ No duplicate questions found!
                    </div>
                ) : <>
                    <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#9f1239", fontSize: "0.85rem" }}>
                        Found <strong>{dupGroups.length}</strong> group{dupGroups.length > 1 ? "s" : ""} of duplicates. Keep one and delete or edit the rest.
                    </div>
                    {dupGroups.map((group, gi) => (
                        <div key={gi} style={{ border: "1px solid #fecdd3", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
                            <div style={{ background: "#fff1f2", padding: "8px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#9f1239" }}>
                                Group {gi + 1} — {group.length} duplicates
                            </div>
                            <table style={s.table}>
                                <thead><tr>{["Question","Options","Correct","Category","Status","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {group.map((q, i) => (
                                        <tr key={q.id} style={{ background: i === 0 ? "#f0fdf4" : "#fff" }}>
                                            <td style={{ ...s.td, maxWidth: 240 }}>
                                                {i === 0 && <span style={{ fontSize: "0.7rem", background: "#dcfce7", color: "#166534", borderRadius: 4, padding: "1px 6px", fontWeight: 700, marginRight: 6 }}>KEEP</span>}
                                                {q.question}
                                            </td>
                                            <td style={s.td}>{q.options.map((o, oi) => <div key={oi} style={{ fontSize: "0.78rem", color: oi === q.answer ? "#059669" : "#555" }}>{String.fromCharCode(65+oi)}. {o}</div>)}</td>
                                            <td style={s.td}><strong style={{ color: "#059669" }}>{String.fromCharCode(65 + q.answer)}</strong></td>
                                            <td style={s.td}>{q.category || "—"}</td>
                                            <td style={s.td}><span style={badge(q.active)}>{q.active ? "active" : "inactive"}</span></td>
                                            <td style={s.td}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button onClick={() => setEditing(q)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>Edit</button>
                                                    {i !== 0 && <button onClick={() => showDeleteConfirm(q.id!)} style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Delete</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </>
            ) : <>
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...s.input, maxWidth: 240 }} placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)} />
                    <button onClick={() => setAdding(true)} style={{ ...s.btn, background: "#4361ee", color: "#fff" }}>+ Add Question</button>
                    <button onClick={() => fileRef.current?.click()} disabled={importing}
                        style={{ ...s.btn, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                        {importing ? "Importing…" : "📥 Import CSV"}
                    </button>
                    <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
                    <a href="data:text/plain,question,optionA,optionB,optionC,optionD,correct(A-D),category%0AWhat is the capital of Kenya?,Nairobi,Mombasa,Kisumu,Nakuru,A,Geography"
                        download="gen_quiz_template.csv"
                        style={{ ...s.btn, background: "#f0f0f8", color: "#444", textDecoration: "none", display: "inline-block" }}>
                        📄 CSV Template
                    </a>
                    {questions.length > 0 && (
                        <button onClick={() => setShowConfirm(true)} style={{ ...s.btn, background: "#dc2626", color: "#fff" }}>
                            🗑️ Delete All Questions
                        </button>
                    )}
                </div>
                {msg && <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6, background: msg.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: msg.startsWith("✅") ? "#166534" : "#991b1b", fontSize: "0.85rem" }}>{msg}</div>}
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                    <table style={s.table}>
                        <thead><tr>{["#", "Question", "Options", "Correct", "Category", "Status", "Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.map((q, i) => (
                                <tr key={q.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                    <td style={s.td}>{i + 1}</td>
                                    <td style={{ ...s.td, maxWidth: 260 }}>{q.question}</td>
                                    <td style={s.td}>{q.options.map((o, oi) => <div key={oi} style={{ fontSize: "0.78rem", color: oi === q.answer ? "#059669" : "#555" }}>{String.fromCharCode(65+oi)}. {o}</div>)}</td>
                                    <td style={s.td}><strong style={{ color: "#059669" }}>{String.fromCharCode(65 + q.answer)}</strong></td>
                                    <td style={s.td}>{q.category || "—"}</td>
                                    <td style={s.td}><span style={badge(q.active)}>{q.active ? "active" : "inactive"}</span></td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => setEditing(q)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>Edit</button>
                                            <button onClick={() => showDeleteConfirm(q.id!)} style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Del</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!filtered.length && <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No questions yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </>}
        </div>
    </>;
}
// ── Payments Tab ──────────────────────────────────────────────────────────────
function BQPayments() {
    const [rows,   setRows]   = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        getDocs(collection(db, "genQuizPayments"))
            .then(snap => setRows(snap.docs.map(d => ({ _id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))))
            .catch(() => {});
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
                        {filtered.map((r, i) => (
                            <tr key={r._id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                <td style={s.td}>{i + 1}</td>
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
        </div>
    );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function BQSessions() {
    const [rows, setRows] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        getDocs(collection(db, "genQuizSessions"))
            .then(snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
            .catch(() => {});
    }, []);

    const filtered = rows.filter(r => !search ||
        (r.name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.phone ?? "").includes(search));

    return (
        <div style={s.card}>
            <h2 style={s.h2}>Game Sessions <span style={{ color: "#aaa", fontWeight: 400, fontSize: "0.85rem" }}>({rows.length})</span></h2>
            <input style={{ ...s.input, maxWidth: 240, marginBottom: 14 }} placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                <table style={s.table}>
                    <thead><tr>{["#", "Name", "Phone", "Score", "Correct", "Wrong", "Passed", "Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                        {filtered.map((r, i) => (
                            <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                <td style={s.td}>{i + 1}</td>
                                <td style={s.td}>{r.name ?? "—"}</td>
                                <td style={s.td}>{r.phone ?? "—"}</td>
                                <td style={s.td}><strong>{(r.score ?? 0).toLocaleString()}</strong></td>
                                <td style={s.td}>{r.correct ?? 0}</td>
                                <td style={s.td}>{r.wrong ?? 0}</td>
                                <td style={s.td}>{r.passed ?? 0}</td>
                                <td style={s.td}>{r.playedAt?.toDate?.()?.toLocaleString('en-GB') ?? "—"}</td>
                            </tr>
                        ))}
                        {!filtered.length && <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No sessions</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Leaderboard Tab ───────────────────────────────────────────────────────────
function BQLeaderboard() {
    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        getDocs(collection(db, "genQuizLeaderboard"))
            .then(snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
                        {rows.map((r, i) => (
                            <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                <td style={s.td}>{["🥇","🥈","🥉"][i] ?? i + 1}</td>
                                <td style={s.td}><strong>{r.name ?? "—"}</strong></td>
                                <td style={s.td}>{(r.phone ?? "").slice(0, 4) + "****"}</td>
                                <td style={s.td}><strong style={{ color: "#4361ee" }}>{(r.score ?? 0).toLocaleString()} pts</strong></td>
                                <td style={s.td}>{r.playedAt?.toDate?.()?.toLocaleDateString('en-GB') ?? "—"}</td>
                            </tr>
                        ))}
                        {!rows.length && <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No data yet</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────
type BQTab = "questions" | "payments" | "sessions" | "leaderboard";

export function AdminGenQuiz() {
    const [tab, setTab] = useState<BQTab>("questions");

    const tabs: { id: BQTab; label: string }[] = [
        { id: "questions",   label: "❓ Questions"   },
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
            {tab === "questions"   && <BQQuestions />}
            {tab === "payments"    && <BQPayments />}
            {tab === "sessions"    && <BQSessions />}
            {tab === "leaderboard" && <BQLeaderboard />}
        </div>
    );
}
