// AdminQuestions.tsx — fully functional Questions manager with add/edit modal
import { useState } from "react";

export type Question = {
    id: number;
    round: "r1" | "r2" | "r3";
    category: string;
    question: string;
    options: [string, string, string, string];
    correct: 0 | 1 | 2 | 3;
    active: boolean;
};

const SEED: Question[] = [
    { id: 1, round: "r1", category: "Geography",  question: "What is the capital of Kenya?",           options: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],          correct: 0, active: true },
    { id: 2, round: "r2", category: "Literature", question: "Who wrote 'Things Fall Apart'?",          options: ["Wole Soyinka", "Chinua Achebe", "Ngugi wa Thiong'o", "Ben Okri"], correct: 1, active: true },
    { id: 3, round: "r1", category: "History",    question: "What year did Kenya gain independence?",  options: ["1960", "1961", "1962", "1963"],                    correct: 3, active: true },
    { id: 4, round: "r3", category: "Science",    question: "What planet is closest to the Sun?",     options: ["Venus", "Earth", "Mercury", "Mars"],               correct: 2, active: true },
];

const BLANK: Omit<Question, "id"> = {
    round: "r1", category: "", question: "",
    options: ["", "", "", ""], correct: 0, active: true,
};

const s: Record<string, React.CSSProperties> = {
    card:   { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2:     { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    p:      { lineHeight: 1.75, color: "#444", fontSize: "0.9rem", margin: "0 0 10px" },
    table:  { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" },
    th:     { background: "#f5f5ff", color: "#4361ee", padding: "10px 14px", textAlign: "left" as const, borderBottom: "2px solid #e0e0f0", fontWeight: 600, whiteSpace: "nowrap" as const },
    td:     { padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const },
    btn:    { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" },
    input:  { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const },
    label:  { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#555", marginBottom: 5 },
    row:    { marginBottom: 14 },
    overlay:{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
    modal:  { background: "#fff", borderRadius: 12, padding: "28px 28px 24px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" },
    mh2:    { color: "#1a1a2e", fontSize: "1rem", fontWeight: 700, marginBottom: 20 },
    optRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
    radio:  { accentColor: "#4361ee", width: 16, height: 16, cursor: "pointer", flexShrink: 0 },
};

function StatusBadge({ active }: { active: boolean }) {
    return <span style={{ background: active ? "#dcfce7" : "#f0f0f0", color: active ? "#166534" : "#555", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>
        {active ? "active" : "inactive"}
    </span>;
}

type ModalProps = { q: Omit<Question, "id"> & { id?: number }; onSave: (q: Question) => void; onClose: () => void; nextId: number; };

function QuestionModal({ q, onSave, onClose, nextId }: ModalProps) {
    const [form, setForm] = useState<Omit<Question, "id"> & { id?: number }>({ ...q, options: [...q.options] as [string,string,string,string] });

    const setOpt = (i: number, v: string) => {
        const opts = [...form.options] as [string,string,string,string];
        opts[i] = v;
        setForm(f => ({ ...f, options: opts }));
    };

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...form, id: form.id ?? nextId } as Question);
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                <div style={s.mh2}>{form.id ? "Edit Question" : "Add Question"}</div>
                <form onSubmit={save}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={s.label}>Round</label>
                            <select style={{ ...s.input }} value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value as Question["round"] }))}>
                                <option value="r1">Round 1</option>
                                <option value="r2">Round 2</option>
                                <option value="r3">Round 3</option>
                            </select>
                        </div>
                        <div>
                            <label style={s.label}>Category</label>
                            <input style={s.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Geography" required />
                        </div>
                    </div>

                    <div style={s.row}>
                        <label style={s.label}>Question</label>
                        <textarea style={{ ...s.input, minHeight: 72, resize: "vertical" as const }} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Enter question text…" required />
                    </div>

                    <div style={s.row}>
                        <label style={{ ...s.label, marginBottom: 10 }}>Answer Options <span style={{ color: "#888", fontWeight: 400 }}>(select the correct one)</span></label>
                        {(["A","B","C","D"] as const).map((letter, i) => (
                            <div key={i} style={s.optRow}>
                                <input type="radio" style={s.radio} name="correct" checked={form.correct === i} onChange={() => setForm(f => ({ ...f, correct: i as 0|1|2|3 }))} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: form.correct === i ? "#4361ee" : "#aaa", width: 20, flexShrink: 0 }}>{letter}</span>
                                <input style={{ ...s.input, borderColor: form.correct === i ? "#4361ee" : "#ddd" }}
                                    value={form.options[i]}
                                    onChange={e => setOpt(i, e.target.value)}
                                    placeholder={`Option ${letter}`}
                                    required />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                        <input type="checkbox" id="active-chk" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ accentColor: "#4361ee" }} />
                        <label htmlFor="active-chk" style={{ fontSize: "0.85rem", color: "#444", cursor: "pointer" }}>Active (visible in game)</label>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button type="button" onClick={onClose} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                        <button type="submit" style={{ ...s.btn, background: "#4361ee", color: "#fff", padding: "8px 20px" }}>Save Question</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── CSV Upload Modal ──────────────────────────────────────────────────────────
function CsvUploadModal({ onImport, onClose, nextId }: { onImport: (qs: Question[]) => void; onClose: () => void; nextId: number }) {
    const [preview, setPreview] = useState<Question[]>([]);
    const [error,   setError]   = useState("");

    const parseCSV = (text: string) => {
        setError(""); setPreview([]);
        const lines = text.trim().split("\n").filter(l => l.trim());
        // skip header row if present
        const dataLines = lines[0].toLowerCase().startsWith("round") ? lines.slice(1) : lines;
        const parsed: Question[] = [];
        const errs: string[] = [];

        dataLines.forEach((line, i) => {
            // handle quoted fields
            const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g, "").trim()) ?? line.split(",").map(c => c.trim());
            if (cols.length < 8) { errs.push(`Row ${i + 1}: needs 8 columns`); return; }
            const [roundRaw, category, question, a, b, c, d, correctRaw] = cols;
            const round = roundRaw.toLowerCase().replace(/\s/g, "") as Question["round"];
            if (!["r1","r2","r3"].includes(round)) { errs.push(`Row ${i + 1}: round must be r1/r2/r3, got "${roundRaw}"`); return; }
            const correctMap: Record<string, 0|1|2|3> = { a: 0, b: 1, c: 2, d: 3 };
            const correct = correctMap[correctRaw.toLowerCase()];
            if (correct === undefined) { errs.push(`Row ${i + 1}: correct must be A/B/C/D, got "${correctRaw}"`); return; }
            parsed.push({ id: nextId + parsed.length, round, category, question, options: [a, b, c, d], correct, active: true });
        });

        if (errs.length) { setError(errs.join("\n")); return; }
        setPreview(parsed);
    };

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => parseCSV(ev.target?.result as string);
        reader.readAsText(file);
    };

    const roundLabel = (r: string) => r === "r1" ? "Round 1" : r === "r2" ? "Round 2" : "Round 3";

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ ...s.modal, maxWidth: 640 }}>
                <div style={s.mh2}>📂 Import Questions via CSV</div>

                <div style={{ background: "#f5f5ff", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: "0.82rem", color: "#444", lineHeight: 1.7 }}>
                    <strong>Expected columns (no header required):</strong><br />
                    <code>round, category, question, optionA, optionB, optionC, optionD, correct</code><br />
                    <span style={{ color: "#888" }}>round = r1 / r2 / r3 &nbsp;·&nbsp; correct = A / B / C / D</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <input type="file" accept=".csv,text/csv" onChange={onFile}
                        style={{ fontSize: "0.85rem", fontFamily: "inherit" }} />
                </div>

                {error && (
                    <pre style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", color: "#991b1b", fontSize: "0.78rem", marginBottom: 14, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>
                        {error}
                    </pre>
                )}

                {preview.length > 0 && (
                    <>
                        <div style={{ marginBottom: 10, fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
                            ✅ {preview.length} question{preview.length !== 1 ? "s" : ""} ready to import
                            &nbsp;·&nbsp; R1: {preview.filter(q => q.round === "r1").length}
                            &nbsp;·&nbsp; R2: {preview.filter(q => q.round === "r2").length}
                            &nbsp;·&nbsp; R3: {preview.filter(q => q.round === "r3").length}
                        </div>
                        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0", maxHeight: 260, overflowY: "auto", marginBottom: 16 }}>
                            <table style={s.table}>
                                <thead><tr>{["Round","Category","Question","Correct"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {preview.map((q, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                            <td style={s.td}>{roundLabel(q.round)}</td>
                                            <td style={s.td}>{q.category}</td>
                                            <td style={{ ...s.td, maxWidth: 260 }}>{q.question}</td>
                                            <td style={{ ...s.td, fontWeight: 700, color: "#4361ee" }}>
                                                {["A","B","C","D"][q.correct]}. {q.options[q.correct]}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                    <button disabled={preview.length === 0} onClick={() => { onImport(preview); onClose(); }}
                        style={{ ...s.btn, background: preview.length > 0 ? "#4361ee" : "#ccc", color: "#fff", padding: "8px 20px", cursor: preview.length > 0 ? "pointer" : "not-allowed" }}>
                        Import {preview.length > 0 ? `${preview.length} Questions` : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AdminQuestions() {
    const [round,      setRound]      = useState<"r1"|"r2"|"r3">("r1");
    const [qs,         setQs]         = useState<Question[]>(SEED);
    const [editing,    setEditing]    = useState<Question | null>(null);
    const [adding,     setAdding]     = useState(false);
    const [csvOpen,    setCsvOpen]    = useState(false);

    const filtered = qs.filter(q => q.round === round);
    const nextId   = Math.max(0, ...qs.map(q => q.id)) + 1;

    const save = (q: Question) => {
        setQs(prev => prev.some(x => x.id === q.id) ? prev.map(x => x.id === q.id ? q : x) : [...prev, q]);
        setEditing(null);
        setAdding(false);
    };

    const importCSV = (imported: Question[]) => {
        setQs(prev => {
            let id = Math.max(0, ...prev.map(q => q.id)) + 1;
            return [...prev, ...imported.map(q => ({ ...q, id: id++ }))];
        });
    };

    const del = (id: number) => { if (confirm("Delete this question?")) setQs(prev => prev.filter(q => q.id !== id)); };

    return (
        <>
        {(editing || adding) && (
            <QuestionModal
                q={editing ?? { ...BLANK, round }}
                onSave={save}
                onClose={() => { setEditing(null); setAdding(false); }}
                nextId={nextId}
            />
        )}
        {csvOpen && <CsvUploadModal onImport={importCSV} onClose={() => setCsvOpen(false)} nextId={nextId} />}

        <div style={s.card}>
            <h2 style={s.h2}>Questions</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {(["r1","r2","r3"] as const).map(r => (
                    <button key={r} onClick={() => setRound(r)}
                        style={{ ...s.btn, background: round === r ? "#4361ee" : "#f0f0f8", color: round === r ? "#fff" : "#444" }}>
                        {r === "r1" ? "Round 1" : r === "r2" ? "Round 2" : "Round 3"}
                    </button>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button onClick={() => setCsvOpen(true)} style={{ ...s.btn, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>📂 Import CSV</button>
                    <button onClick={() => setAdding(true)} style={{ ...s.btn, background: "#4361ee", color: "#fff" }}>+ Add Question</button>
                </div>
            </div>

            {filtered.length === 0
                ? <p style={{ ...s.p, color: "#aaa", textAlign: "center", padding: "30px 0" }}>No questions for this round yet. Click "+ Add Question" to start.</p>
                : (
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                {["#", "Question", "Options (A/B/C/D)", "Correct", "Category", "Status", "Actions"].map(h => (
                                    <th key={h} style={s.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((q, i) => (
                                <tr key={q.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                    <td style={s.td}>{q.id}</td>
                                    <td style={{ ...s.td, maxWidth: 220 }}>{q.question}</td>
                                    <td style={{ ...s.td, fontSize: "0.78rem", color: "#555" }}>
                                        {q.options.map((o, j) => (
                                            <div key={j} style={{ color: j === q.correct ? "#166534" : undefined, fontWeight: j === q.correct ? 700 : undefined }}>
                                                {["A","B","C","D"][j]}. {o}
                                            </div>
                                        ))}
                                    </td>
                                    <td style={{ ...s.td, fontWeight: 700, color: "#4361ee" }}>{["A","B","C","D"][q.correct]}</td>
                                    <td style={s.td}>{q.category}</td>
                                    <td style={s.td}><StatusBadge active={q.active} /></td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => setEditing(q)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>Edit</button>
                                            <button onClick={() => del(q.id)}     style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        <div style={s.card}>
            <h2 style={s.h2}>API Endpoints</h2>
            <p style={s.p}><code>GET /api/questions/:round</code> · <code>POST /api/admin/questions</code> · <code>PUT /api/admin/questions/:id</code> · <code>DELETE /api/admin/questions/:id</code></p>
        </div>
        </>
    );
}
