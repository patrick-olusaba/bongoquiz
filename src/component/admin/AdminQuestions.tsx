// AdminQuestions.tsx — Firestore-backed questions manager
import { useState, useEffect } from "react";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch
} from "firebase/firestore";
import { db } from "../../firebase.ts";
import { clearQuestionsCache } from "../../hooks/useQuestions.ts";

const API = "http://143.244.158.85:3535";

function toApiShape(q: Omit<Question, "id">) {
    return {
        round: q.round, category: q.category, active: q.active,
        questionText: q.question,
        optionA: q.options[0], optionB: q.options[1],
        optionC: q.options[2], optionD: q.options[3],
        correctIndex: q.correct,
    };
}

export type Question = {
    id?: string;          // Firestore doc id
    round: "r1" | "r2" | "r3";
    category: string;
    question: string;
    options: [string, string, string, string];
    correct: 0 | 1 | 2 | 3;
    active: boolean;
};

const BLANK: Omit<Question, "id"> = {
    round: "r1", category: "", question: "",
    options: ["", "", "", ""], correct: 0, active: true,
};

const s: Record<string, React.CSSProperties> = {
    card:    { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2:      { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    p:       { lineHeight: 1.75, color: "#444", fontSize: "0.9rem", margin: "0 0 10px" },
    table:   { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" },
    th:      { background: "#f5f5ff", color: "#4361ee", padding: "10px 14px", textAlign: "left" as const, borderBottom: "2px solid #e0e0f0", fontWeight: 600, whiteSpace: "nowrap" as const },
    td:      { padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const },
    btn:     { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" },
    input:   { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const },
    label:   { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#555", marginBottom: 5 },
    row:     { marginBottom: 14 },
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
    modal:   { background: "#fff", borderRadius: 12, padding: "28px 28px 24px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" },
    mh2:     { color: "#1a1a2e", fontSize: "1rem", fontWeight: 700, marginBottom: 20 },
    optRow:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
    radio:   { accentColor: "#4361ee", width: 16, height: 16, cursor: "pointer", flexShrink: 0 },
};

function StatusBadge({ active }: { active: boolean }) {
    return <span style={{ background: active ? "#dcfce7" : "#f0f0f0", color: active ? "#166534" : "#555", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>
        {active ? "active" : "inactive"}
    </span>;
}

// ── Add/Edit Modal ─────────────────────────────────────────────────────────────
function QuestionModal({ q, onSave, onClose }: { q: Question; onSave: (q: Question) => Promise<void>; onClose: () => void }) {
    const [form, setForm] = useState<Question>({ ...q, options: [...q.options] as [string,string,string,string] });
    const [saving, setSaving] = useState(false);

    const setOpt = (i: number, v: string) => {
        const opts = [...form.options] as [string,string,string,string];
        opts[i] = v;
        setForm(f => ({ ...f, options: opts }));
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                <div style={s.mh2}>{form.id ? "Edit Question" : "Add Question"}</div>
                <form onSubmit={save}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={s.label}>Round</label>
                            <select style={s.input} value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value as Question["round"] }))}>
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
                        <textarea style={{ ...s.input, minHeight: 72, resize: "vertical" as const }} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required />
                    </div>

                    <div style={s.row}>
                        <label style={{ ...s.label, marginBottom: 10 }}>Options <span style={{ color: "#888", fontWeight: 400 }}>(select correct)</span></label>
                        {(["A","B","C","D"] as const).map((letter, i) => (
                            <div key={i} style={s.optRow}>
                                <input type="radio" style={s.radio} name="correct" checked={form.correct === i} onChange={() => setForm(f => ({ ...f, correct: i as 0|1|2|3 }))} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: form.correct === i ? "#4361ee" : "#aaa", width: 20, flexShrink: 0 }}>{letter}</span>
                                <input style={{ ...s.input, borderColor: form.correct === i ? "#4361ee" : "#ddd" }}
                                    value={form.options[i]} onChange={e => setOpt(i, e.target.value)}
                                    placeholder={`Option ${letter}`} required />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                        <input type="checkbox" id="active-chk" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ accentColor: "#4361ee" }} />
                        <label htmlFor="active-chk" style={{ fontSize: "0.85rem", color: "#444", cursor: "pointer" }}>Active (visible in game)</label>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button type="button" onClick={onClose} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...s.btn, background: "#4361ee", color: "#fff", padding: "8px 20px" }}>
                            {saving ? "Saving…" : "Save Question"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Paste Import Modal ─────────────────────────────────────────────────────────
function PasteModal({ defaultRound, onImport, onClose }: { defaultRound: "r1"|"r2"|"r3"; onImport: (qs: Omit<Question,"id">[]) => Promise<void>; onClose: () => void }) {
    const [text,    setText]    = useState("");
    const [round,   setRound]   = useState<"r1"|"r2"|"r3">(defaultRound);
    const [preview, setPreview] = useState<Omit<Question,"id">[]>([]);
    const [error,   setError]   = useState("");
    const [saving,  setSaving]  = useState(false);

    const parse = (raw: string, r: "r1"|"r2"|"r3") => {
        setError(""); setPreview([]);
        // Split into blocks by numbered question (1. / 2. etc)
        const blocks = raw.trim().split(/\n(?=\d+\.\s)/).filter(b => b.trim());
        const parsed: Omit<Question,"id">[] = [];
        const errs: string[] = [];

        blocks.forEach((block, i) => {
            const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
            // Extract category from first line: "1. (Geography)" or "1."
            const headerMatch = lines[0].match(/^\d+\.\s*(?:\(([^)]+)\))?/);
            const category = headerMatch?.[1] ?? "";
            // Question text: line after header (skip header line itself if it has no question text)
            let qLine = lines[0].replace(/^\d+\.\s*(\([^)]+\))?/, "").trim();
            let lineIdx = 1;
            if (!qLine) { qLine = lines[lineIdx] ?? ""; lineIdx++; }

            // Options: lines starting with A. B. C. D.
            const opts: string[] = [];
            let correct = -1;
            for (; lineIdx < lines.length; lineIdx++) {
                const l = lines[lineIdx];
                const optMatch = l.match(/^([A-D])[.)]\s*(.+)/);
                if (optMatch) { opts.push(optMatch[2].trim()); continue; }
                // Answer line: "✅ Answer: C. Noah" or "Answer: C"
                const ansMatch = l.match(/answer[:\s]+([A-D])/i);
                if (ansMatch) { correct = "ABCD".indexOf(ansMatch[1].toUpperCase()); }
            }

            if (!qLine)        { errs.push(`Block ${i+1}: missing question text`); return; }
            if (opts.length !== 4) { errs.push(`Block ${i+1}: need exactly 4 options (A-D), found ${opts.length}`); return; }
            if (correct === -1)    { errs.push(`Block ${i+1}: missing answer line`); return; }

            parsed.push({ round: r, category, question: qLine, options: opts as [string,string,string,string], correct: correct as 0|1|2|3, active: true });
        });

        if (errs.length) { setError(errs.join("\n")); return; }
        setPreview(parsed);
    };

    const doImport = async () => {
        setSaving(true);
        await onImport(preview);
        setSaving(false);
        onClose();
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ ...s.modal, maxWidth: 660 }}>
                <div style={s.mh2}>📋 Paste Questions</div>

                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {(["r1","r2","r3"] as const).map(r => (
                        <button key={r} onClick={() => { setRound(r); if (text) parse(text, r); }}
                            style={{ ...s.btn, background: round === r ? "#4361ee" : "#f0f0f8", color: round === r ? "#fff" : "#444" }}>
                            {r === "r1" ? "Round 1" : r === "r2" ? "Round 2" : "Round 3"}
                        </button>
                    ))}
                </div>

                <textarea
                    style={{ ...s.input, minHeight: 260, resize: "vertical", fontFamily: "monospace", fontSize: "0.82rem", marginBottom: 12 }}
                    placeholder={`1. (Geography)\n\nWhat is the capital of Kenya?\nA. Mombasa\nB. Kisumu\nC. Nairobi\nD. Nakuru\n\n✅ Answer: C. Nairobi\n\n2. (CRE)\n\nWho built the ark?\nA. Abraham\nB. Moses\nC. Noah\nD. David\n\n✅ Answer: C. Noah`}
                    value={text}
                    onChange={e => { setText(e.target.value); parse(e.target.value, round); }}
                />

                {error && <pre style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", color: "#991b1b", fontSize: "0.78rem", marginBottom: 12, whiteSpace: "pre-wrap", maxHeight: 100, overflowY: "auto" }}>{error}</pre>}

                {preview.length > 0 && (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
                        ✅ {preview.length} question{preview.length > 1 ? "s" : ""} parsed successfully
                        {preview.some(q => !q.category) && <span style={{ color: "#854d0e", fontWeight: 400 }}> · some missing category — will be saved as empty</span>}
                    </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                    <button disabled={preview.length === 0 || saving} onClick={doImport}
                        style={{ ...s.btn, background: preview.length > 0 ? "#4361ee" : "#ccc", color: "#fff", padding: "8px 20px" }}>
                        {saving ? "Saving…" : `Save ${preview.length > 0 ? preview.length + " Question" + (preview.length > 1 ? "s" : "") : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
function CsvUploadModal({ onImport, onClose }: { onImport: (qs: Omit<Question,"id">[]) => Promise<void>; onClose: () => void }) {
    const [preview, setPreview] = useState<Omit<Question,"id">[]>([]);
    const [error,   setError]   = useState("");
    const [saving,  setSaving]  = useState(false);

    const parseCSV = (text: string) => {
        setError(""); setPreview([]);
        const lines = text.trim().split("\n").filter(l => l.trim());
        const dataLines = lines[0].toLowerCase().startsWith("round") ? lines.slice(1) : lines;
        const parsed: Omit<Question,"id">[] = [];
        const errs: string[] = [];

        dataLines.forEach((line, i) => {
            const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g,"").trim()) ?? line.split(",").map(c => c.trim());
            if (cols.length < 8) { errs.push(`Row ${i+1}: needs 8 columns`); return; }
            const [roundRaw, category, question, a, b, c, d, correctRaw] = cols;
            const round = roundRaw.toLowerCase().replace(/\s/g,"") as Question["round"];
            if (!["r1","r2","r3"].includes(round)) { errs.push(`Row ${i+1}: round must be r1/r2/r3`); return; }
            const correct = ({ a:0, b:1, c:2, d:3 } as Record<string,number>)[correctRaw.toLowerCase()];
            if (correct === undefined) { errs.push(`Row ${i+1}: correct must be A/B/C/D`); return; }
            parsed.push({ round, category, question, options: [a,b,c,d], correct: correct as 0|1|2|3, active: true });
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

    const doImport = async () => {
        setSaving(true);
        await onImport(preview);
        setSaving(false);
        onClose();
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ ...s.modal, maxWidth: 640 }}>
                <div style={s.mh2}>📂 Import Questions via CSV</div>
                <div style={{ background: "#f5f5ff", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: "0.82rem", color: "#444", lineHeight: 1.7 }}>
                    <strong>Columns:</strong> <code>round, category, question, optionA, optionB, optionC, optionD, correct</code><br />
                    <span style={{ color: "#888" }}>round = r1/r2/r3 · correct = A/B/C/D</span>
                </div>
                <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize: "0.85rem", fontFamily: "inherit", marginBottom: 16 }} />

                {error && <pre style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", color: "#991b1b", fontSize: "0.78rem", marginBottom: 14, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>{error}</pre>}

                {preview.length > 0 && (
                    <div style={{ marginBottom: 12, fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
                        ✅ {preview.length} questions ready — R1: {preview.filter(q=>q.round==="r1").length} · R2: {preview.filter(q=>q.round==="r2").length} · R3: {preview.filter(q=>q.round==="r3").length}
                    </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                    <button disabled={preview.length === 0 || saving} onClick={doImport}
                        style={{ ...s.btn, background: preview.length > 0 ? "#4361ee" : "#ccc", color: "#fff", padding: "8px 20px" }}>
                        {saving ? "Importing…" : `Import ${preview.length > 0 ? preview.length + " Questions" : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AdminQuestions() {
    const [round,    setRound]    = useState<"r1"|"r2"|"r3">("r1");
    const [tab,      setTab]      = useState<"questions"|"duplicates"|"categories">("questions");
    const [qs,       setQs]       = useState<Question[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [editing,  setEditing]  = useState<Question | null>(null);
    const [adding,   setAdding]   = useState(false);
    const [preview,  setPreview]  = useState<Question | null>(null);
    const [csvOpen,  setCsvOpen]  = useState(false);
    const [pasteOpen,setPasteOpen]= useState(false);
    const [search,   setSearch]   = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [page,     setPage]     = useState(1);
    const PAGE_SIZE = 20;

    const load = async () => {
        setLoading(true);
        const snap = await getDocs(collection(db, "questions"));
        setQs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
        setLoading(false);
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { setPage(1); setSelected(new Set()); }, [round, search]);

    const duplicateGroups: Question[][] = (() => {
        const groups = new Map<string, Question[]>();
        qs.forEach(q => {
            const key = q.question.trim().toLowerCase().replace(/\s+/g, " ");
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(q);
        });
        return Array.from(groups.values()).filter(g => g.length > 1);
    })();

    // Category counts across all rounds
    const categoryCounts: { category: string; r1: number; r2: number; r3: number; total: number }[] = (() => {
        const map = new Map<string, { r1: number; r2: number; r3: number }>();
        qs.forEach(q => {
            const cat = q.category || "(no category)";
            if (!map.has(cat)) map.set(cat, { r1: 0, r2: 0, r3: 0 });
            map.get(cat)![q.round]++;
        });
        return Array.from(map.entries())
            .map(([category, counts]) => ({ category, ...counts, total: counts.r1 + counts.r2 + counts.r3 }))
            .sort((a, b) => b.total - a.total);
    })();

    const isDuplicate = (q: Question, existing: Question[]) =>
        existing.some(e => e.id !== q.id && e.question.trim().toLowerCase() === q.question.trim().toLowerCase());

    const save = async (q: Question) => {
        if (isDuplicate(q, qs)) { alert("A question with this text already exists."); return; }
        const { id, ...data } = q;
        if (id) {
            await updateDoc(doc(db, "questions", id), data);
            fetch(`${API}/api/admin/questions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toApiShape(data)) }).catch(() => {});
        } else {
            await addDoc(collection(db, "questions"), data);
            fetch(`${API}/api/admin/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toApiShape(data)) }).catch(() => {});
        }
        setEditing(null); setAdding(false);
        await load();
    };

    const del = async (id: string) => {
        if (!confirm("Delete this question?")) return;
        await deleteDoc(doc(db, "questions", id));
        fetch(`${API}/api/admin/questions/${id}`, { method: "DELETE" }).catch(() => {});
        setQs(prev => prev.filter(q => q.id !== id));
    };

    const bulkDelete = async () => {
        if (!confirm(`Delete ${selected.size} question${selected.size > 1 ? "s" : ""}?`)) return;
        const batch = writeBatch(db);
        selected.forEach(id => batch.delete(doc(db, "questions", id)));
        await batch.commit();
        setQs(prev => prev.filter(q => !selected.has(q.id!)));
        setSelected(new Set());
    };

    const bulkSetActive = async (active: boolean) => {
        const batch = writeBatch(db);
        selected.forEach(id => batch.update(doc(db, "questions", id), { active }));
        await batch.commit();
        setQs(prev => prev.map(q => selected.has(q.id!) ? { ...q, active } : q));
        setSelected(new Set());
    };

    const exportCSV = () => {
        const header = "round,category,question,optionA,optionB,optionC,optionD,correct,active";
        const csv = qs.map(q => [
            q.round, q.category, `"${q.question.replace(/"/g, '""')}"`,
            ...q.options.map(o => `"${o.replace(/"/g, '""')}"`),
            ["A","B","C","D"][q.correct], q.active,
        ].join(",")).join("\n");
        const blob = new Blob([header + "\n" + csv], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = "questions.csv"; a.click();
    };

    const importCSV = async (rows: Omit<Question,"id">[]) => {
        const existingTexts = new Set(qs.map(q => q.question.trim().toLowerCase()));
        const unique = rows.filter(q => !existingTexts.has(q.question.trim().toLowerCase()));
        const dupes  = rows.length - unique.length;
        if (dupes > 0) alert(`Skipped ${dupes} duplicate question${dupes > 1 ? "s" : ""}.`);
        if (unique.length === 0) return;
        const batch = writeBatch(db);
        unique.forEach(q => batch.set(doc(collection(db, "questions")), q));
        await batch.commit();
        fetch(`${API}/api/admin/questions/bulk-import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questions: unique.map(toApiShape) }) }).catch(() => {});
        await load();
    };

    // Search across all rounds if search is active, otherwise filter by round
    const filtered = (search
        ? qs.filter(q => q.question.toLowerCase().includes(search.toLowerCase()) || q.category.toLowerCase().includes(search.toLowerCase()))
        : qs.filter(q => q.round === round)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const allPageSelected = paginated.length > 0 && paginated.every(q => selected.has(q.id!));
    const togglePageSelect = () => {
        if (allPageSelected) setSelected(prev => { const n = new Set(prev); paginated.forEach(q => n.delete(q.id!)); return n; });
        else setSelected(prev => { const n = new Set(prev); paginated.forEach(q => n.add(q.id!)); return n; });
    };

    return (
        <>
        {(editing || adding) && <QuestionModal q={editing ?? { ...BLANK, round }} onSave={save} onClose={() => { setEditing(null); setAdding(false); }} />}
        {csvOpen    && <CsvUploadModal onImport={importCSV} onClose={() => setCsvOpen(false)} />}
        {pasteOpen  && <PasteModal defaultRound={round} onImport={importCSV} onClose={() => setPasteOpen(false)} />}

        {/* Preview modal */}
        {preview && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
                onClick={e => e.target === e.currentTarget && setPreview(null)}>
                <div style={{ background: "#1a1a2e", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, color: "#fff" }}>
                    <div style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: 12 }}>{preview.round.toUpperCase()} · {preview.category}</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 20, lineHeight: 1.5 }}>{preview.question}</div>
                    {preview.options.map((o, i) => (
                        <div key={i} style={{ background: i === preview.correct ? "#22c55e" : "rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: "0.9rem", fontWeight: i === preview.correct ? 700 : 400 }}>
                            {["A","B","C","D"][i]}. {o}
                        </div>
                    ))}
                    <button onClick={() => setPreview(null)} style={{ ...s.btn, background: "#4361ee", color: "#fff", marginTop: 16, width: "100%" }}>Close Preview</button>
                </div>
            </div>
        )}

        <div style={s.card}>
            <h2 style={s.h2}>Questions <span style={{ color: "#aaa", fontWeight: 400, fontSize: "0.85rem" }}>({qs.length} total)</span></h2>

            {/* Top-level tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <button onClick={() => setTab("questions")}
                    style={{ ...s.btn, background: tab === "questions" ? "#4361ee" : "#f0f0f8", color: tab === "questions" ? "#fff" : "#444" }}>
                    ❓ All Questions
                </button>
                <button onClick={() => setTab("duplicates")}
                    style={{ ...s.btn, background: tab === "duplicates" ? "#dc2626" : "#f0f0f8", color: tab === "duplicates" ? "#fff" : "#444" }}>
                    ⚠️ Duplicates {duplicateGroups.length > 0 && `(${duplicateGroups.reduce((a, g) => a + g.length - 1, 0)} extra)`}
                </button>
                <button onClick={() => setTab("categories")}
                    style={{ ...s.btn, background: tab === "categories" ? "#7c3aed" : "#f0f0f8", color: tab === "categories" ? "#fff" : "#444" }}>
                    📊 Categories ({categoryCounts.length})
                </button>
            </div>

            {tab === "categories" ? (
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                    <table style={s.table}>
                        <thead><tr>{["Category","R1","R2","R3","Total"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {categoryCounts.map((c, i) => (
                                <tr key={c.category} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                    <td style={s.td}>{c.category}</td>
                                    <td style={{ ...s.td, color: c.r1 < 3 ? "#dc2626" : "#166534", fontWeight: 600 }}>{c.r1}</td>
                                    <td style={{ ...s.td, color: c.r2 < 3 ? "#dc2626" : "#166534", fontWeight: 600 }}>{c.r2}</td>
                                    <td style={{ ...s.td, color: c.r3 < 3 ? "#dc2626" : "#166534", fontWeight: 600 }}>{c.r3}</td>
                                    <td style={{ ...s.td, fontWeight: 700 }}>{c.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ padding: "8px 14px", fontSize: "0.75rem", color: "#dc2626" }}>🔴 Red = fewer than 3 questions in that round for this category</div>
                </div>
            ) : tab === "duplicates" ? (
                loading ? <p style={{ ...s.p, color: "#aaa", textAlign: "center", padding: "30px 0" }}>Loading…</p>
                : duplicateGroups.length === 0 ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "20px", textAlign: "center", color: "#166534", fontWeight: 600 }}>✅ No duplicate questions found!</div>
                ) : <>
                    <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#9f1239", fontSize: "0.85rem" }}>
                        Found <strong>{duplicateGroups.length}</strong> group{duplicateGroups.length > 1 ? "s" : ""} of duplicate questions.
                    </div>
                    {duplicateGroups.map((group, gi) => (
                        <div key={gi} style={{ border: "1px solid #fecdd3", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
                            <div style={{ background: "#fff1f2", padding: "8px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#9f1239" }}>
                                Group {gi + 1} — {group.length} duplicates · {group[0].round.toUpperCase()} · {group[0].category || "—"}
                            </div>
                            <table style={s.table}>
                                <thead><tr>{["Question","Options","Correct","Round","Status","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {group.map((q, i) => (
                                        <tr key={q.id} style={{ background: i === 0 ? "#f0fdf4" : "#fff" }}>
                                            <td style={{ ...s.td, maxWidth: 220 }}>
                                                {i === 0 && <span style={{ fontSize: "0.7rem", background: "#dcfce7", color: "#166534", borderRadius: 4, padding: "1px 6px", fontWeight: 700, marginRight: 6 }}>KEEP</span>}
                                                {q.question}
                                            </td>
                                            <td style={{ ...s.td, fontSize: "0.78rem" }}>{q.options.map((o, j) => <div key={j} style={{ color: j === q.correct ? "#166534" : undefined, fontWeight: j === q.correct ? 700 : undefined }}>{["A","B","C","D"][j]}. {o}</div>)}</td>
                                            <td style={{ ...s.td, fontWeight: 700, color: "#4361ee" }}>{["A","B","C","D"][q.correct]}</td>
                                            <td style={s.td}>{q.round.toUpperCase()}</td>
                                            <td style={s.td}><StatusBadge active={q.active} /></td>
                                            <td style={s.td}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button onClick={() => setEditing(q)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>Edit</button>
                                                    {i !== 0 && <button onClick={() => del(q.id!)} style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Delete</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </>
            ) : (
                <>
                {/* Search + round tabs + toolbar */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...s.input, maxWidth: 260 }} placeholder="Search all rounds…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {!search && (["r1","r2","r3"] as const).map(r => (
                        <button key={r} onClick={() => setRound(r)}
                            style={{ ...s.btn, background: round === r ? "#4361ee" : "#f0f0f8", color: round === r ? "#fff" : "#444" }}>
                            {r === "r1" ? `R1 (${qs.filter(q=>q.round==="r1").length})` : r === "r2" ? `R2 (${qs.filter(q=>q.round==="r2").length})` : `R3 (${qs.filter(q=>q.round==="r3").length})`}
                        </button>
                    ))}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={exportCSV} style={{ ...s.btn, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>📥 Export CSV</button>
                        <button onClick={() => { clearQuestionsCache(); alert("Cache cleared."); }} style={{ ...s.btn, background: "#f0f0f8", color: "#666", border: "1px solid #ddd" }}>🔄 Cache</button>
                        <button onClick={() => setPasteOpen(true)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" }}>📋 Paste</button>
                        <button onClick={() => setCsvOpen(true)}   style={{ ...s.btn, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>📂 CSV</button>
                        <button onClick={() => setAdding(true)}    style={{ ...s.btn, background: "#4361ee", color: "#fff" }}>+ Add</button>
                    </div>
                </div>

                {/* Bulk actions bar */}
                {selected.size > 0 && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f0f0ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "8px 14px", marginBottom: 10 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#4361ee" }}>{selected.size} selected</span>
                        <button onClick={() => bulkSetActive(true)}  style={{ ...s.btn, background: "#dcfce7", color: "#166534" }}>✓ Activate</button>
                        <button onClick={() => bulkSetActive(false)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>✗ Deactivate</button>
                        <button onClick={bulkDelete}                 style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>🗑 Delete</button>
                        <button onClick={() => setSelected(new Set())} style={{ ...s.btn, background: "#f0f0f8", color: "#666" }}>Clear</button>
                    </div>
                )}

                {loading ? (
                    <p style={{ ...s.p, color: "#aaa", textAlign: "center", padding: "30px 0" }}>Loading…</p>
                ) : filtered.length === 0 ? (
                    <p style={{ ...s.p, color: "#aaa", textAlign: "center", padding: "30px 0" }}>No questions found.</p>
                ) : (
                    <>
                    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    <th style={s.th}><input type="checkbox" checked={allPageSelected} onChange={togglePageSelect} /></th>
                                    {["#","Question","Options","Correct","Category","Status","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((q, i) => (
                                    <tr key={q.id} style={{ background: selected.has(q.id!) ? "#eef0ff" : i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                        <td style={s.td}><input type="checkbox" checked={selected.has(q.id!)} onChange={() => setSelected(prev => { const n = new Set(prev); n.has(q.id!) ? n.delete(q.id!) : n.add(q.id!); return n; })} /></td>
                                        <td style={{ ...s.td, color: "#aaa", fontSize: "0.78rem", width: 40 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                        <td style={{ ...s.td, maxWidth: 220 }}>
                                            {q.question}
                                            {search && <span style={{ marginLeft: 6, fontSize: "0.7rem", background: "#f0f0ff", color: "#4361ee", borderRadius: 4, padding: "1px 5px" }}>{q.round.toUpperCase()}</span>}
                                        </td>
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
                                                <button onClick={() => setPreview(q)} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>👁</button>
                                                <button onClick={() => setEditing(q)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>Edit</button>
                                                <button onClick={() => del(q.id!)}    style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Del</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                style={{ ...s.btn, background: page === 1 ? "#f0f0f8" : "#4361ee", color: page === 1 ? "#aaa" : "#fff" }}>← Prev</button>
                            <span style={{ fontSize: "0.85rem", color: "#555" }}>Page {page} of {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                style={{ ...s.btn, background: page === totalPages ? "#f0f0f8" : "#4361ee", color: page === totalPages ? "#aaa" : "#fff" }}>Next →</button>
                        </div>
                    )}
                    </>
                )}
                </>
            )}
        </div>
        </>
    );
}

    const load = async () => {
        setLoading(true);
        const snap = await getDocs(collection(db, "questions"));
        setQs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
        setLoading(false);
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { setPage(1); }, [round]);

    // Find duplicate groups: questions with identical normalised text
    const duplicateGroups: Question[][] = (() => {
        const groups = new Map<string, Question[]>();
        qs.forEach(q => {
            const key = q.question.trim().toLowerCase().replace(/\s+/g, " ");
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(q);
        });
        return Array.from(groups.values()).filter(g => g.length > 1);
    })();

    const isDuplicate = (q: Question, existing: Question[]) =>
        existing.some(e => e.id !== q.id && e.question.trim().toLowerCase() === q.question.trim().toLowerCase());

    const save = async (q: Question) => {
        if (isDuplicate(q, qs)) { alert("A question with this text already exists."); return; }
        const { id, ...data } = q;
        if (id) {
            await updateDoc(doc(db, "questions", id), data);
            fetch(`${API}/api/admin/questions/${id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(toApiShape(data)),
            }).catch(() => {});
        } else {
            await addDoc(collection(db, "questions"), data);
            fetch(`${API}/api/admin/questions`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(toApiShape(data)),
            }).catch(() => {});
        }
        setEditing(null); setAdding(false);
        await load();
    };

    const del = async (id: string) => {
        if (!confirm("Delete this question?")) return;
        await deleteDoc(doc(db, "questions", id));
        fetch(`${API}/api/admin/questions/${id}`, { method: "DELETE" }).catch(() => {});
        setQs(prev => prev.filter(q => q.id !== id));
    };

    const importCSV = async (rows: Omit<Question,"id">[]) => {
        const existingTexts = new Set(qs.map(q => q.question.trim().toLowerCase()));
        const unique = rows.filter(q => !existingTexts.has(q.question.trim().toLowerCase()));
        const dupes  = rows.length - unique.length;
        if (dupes > 0) alert(`Skipped ${dupes} duplicate question${dupes > 1 ? "s" : ""}.`);
        if (unique.length === 0) return;
        const batch = writeBatch(db);
        unique.forEach(q => batch.set(doc(collection(db, "questions")), q));
        await batch.commit();
        fetch(`${API}/api/admin/questions/bulk-import`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questions: unique.map(toApiShape) }),
        }).catch(() => {});
        await load();
    };

    const filtered  = qs.filter(q => q.round === round);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <>
        {(editing || adding) && (
            <QuestionModal
                q={editing ?? { ...BLANK, round }}
                onSave={save}
                onClose={() => { setEditing(null); setAdding(false); }}
            />
        )}
        {csvOpen   && <CsvUploadModal onImport={importCSV} onClose={() => setCsvOpen(false)} />}
        {pasteOpen && <PasteModal defaultRound={round} onImport={importCSV} onClose={() => setPasteOpen(false)} />}

        <div style={s.card}>
            <h2 style={s.h2}>Questions <span style={{ color: "#aaa", fontWeight: 400, fontSize: "0.85rem" }}>({qs.length} total)</span></h2>

            {/* Top-level tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={() => setTab("questions")}
                    style={{ ...s.btn, background: tab === "questions" ? "#4361ee" : "#f0f0f8", color: tab === "questions" ? "#fff" : "#444" }}>
                    ❓ All Questions
                </button>
                <button onClick={() => setTab("duplicates")}
                    style={{ ...s.btn, background: tab === "duplicates" ? "#dc2626" : "#f0f0f8", color: tab === "duplicates" ? "#fff" : "#444" }}>
                    ⚠️ Duplicate Questions {duplicateGroups.length > 0 && `(${duplicateGroups.reduce((a, g) => a + g.length - 1, 0)} extra)`}
                </button>
            </div>

            {tab === "duplicates" ? (
                loading ? (
                    <p style={{ ...s.p, color: "#aaa", textAlign: "center", padding: "30px 0" }}>Loading…</p>
                ) : duplicateGroups.length === 0 ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "20px", textAlign: "center", color: "#166534", fontWeight: 600 }}>
                        ✅ No duplicate questions found!
                    </div>
                ) : (
                    <>
                    <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#9f1239", fontSize: "0.85rem" }}>
                        Found <strong>{duplicateGroups.length}</strong> group{duplicateGroups.length > 1 ? "s" : ""} of duplicate questions. Keep one and delete or edit the rest.
                    </div>
                    {duplicateGroups.map((group, gi) => (
                        <div key={gi} style={{ border: "1px solid #fecdd3", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
                            <div style={{ background: "#fff1f2", padding: "8px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#9f1239" }}>
                                Group {gi + 1} — {group.length} duplicates · Round: {group[0].round.toUpperCase()} · Category: {group[0].category || "—"}
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={s.table}>
                                    <thead>
                                        <tr>{["Question","Options","Correct","Round","Status","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {group.map((q, i) => (
                                            <tr key={q.id} style={{ background: i === 0 ? "#f0fdf4" : "#fff" }}>
                                                <td style={{ ...s.td, maxWidth: 220 }}>
                                                    {i === 0 && <span style={{ fontSize: "0.7rem", background: "#dcfce7", color: "#166534", borderRadius: 4, padding: "1px 6px", fontWeight: 700, marginRight: 6 }}>KEEP</span>}
                                                    {q.question}
                                                </td>
                                                <td style={{ ...s.td, fontSize: "0.78rem", color: "#555" }}>
                                                    {q.options.map((o, j) => (
                                                        <div key={j} style={{ color: j === q.correct ? "#166534" : undefined, fontWeight: j === q.correct ? 700 : undefined }}>
                                                            {["A","B","C","D"][j]}. {o}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td style={{ ...s.td, fontWeight: 700, color: "#4361ee" }}>{["A","B","C","D"][q.correct]}</td>
                                                <td style={s.td}>{q.round.toUpperCase()}</td>
                                                <td style={s.td}><StatusBadge active={q.active} /></td>
                                                <td style={s.td}>
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <button onClick={() => setEditing(q)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }}>Edit</button>
                                                        {i !== 0 && (
                                                            <button onClick={() => del(q.id!)} style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Delete</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    </>
                )
            ) : (
                <>
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    {(["r1","r2","r3"] as const).map(r => (
                        <button key={r} onClick={() => setRound(r)}
                            style={{ ...s.btn, background: round === r ? "#4361ee" : "#f0f0f8", color: round === r ? "#fff" : "#444" }}>
                            {r === "r1" ? `Round 1 (${qs.filter(q=>q.round==="r1").length})` : r === "r2" ? `Round 2 (${qs.filter(q=>q.round==="r2").length})` : `Round 3 (${qs.filter(q=>q.round==="r3").length})`}
                        </button>
                    ))}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button onClick={() => { clearQuestionsCache(); alert("Question cache cleared. Players will get fresh questions on next game."); }}
                            style={{ ...s.btn, background: "#f0f0f8", color: "#666", border: "1px solid #ddd" }}>🔄 Clear Cache</button>
                        <button onClick={() => setPasteOpen(true)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" }}>📋 Paste</button>
                        <button onClick={() => setCsvOpen(true)}   style={{ ...s.btn, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>📂 Import CSV</button>
                        <button onClick={() => setAdding(true)}  style={{ ...s.btn, background: "#4361ee", color: "#fff" }}>+ Add Question</button>
                    </div>
                </div>

                {loading ? (
                    <p style={{ ...s.p, color: "#aaa", textAlign: "center", padding: "30px 0" }}>Loading…</p>
                ) : filtered.length === 0 ? (
                    <p style={{ ...s.p, color: "#aaa", textAlign: "center", padding: "30px 0" }}>No questions for this round yet.</p>
                ) : (
                    <>
                    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e8eaf0" }}>
                        <table style={s.table}>
                            <thead>
                                <tr>{["#","Question","Options","Correct","Category","Status","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {paginated.map((q, i) => (
                                    <tr key={q.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                        <td style={{ ...s.td, color: "#aaa", fontSize: "0.78rem", width: 40 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
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
                                                <button onClick={() => del(q.id!)}    style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                style={{ ...s.btn, background: page === 1 ? "#f0f0f8" : "#4361ee", color: page === 1 ? "#aaa" : "#fff" }}>← Prev</button>
                            <span style={{ fontSize: "0.85rem", color: "#555" }}>Page {page} of {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                style={{ ...s.btn, background: page === totalPages ? "#f0f0f8" : "#4361ee", color: page === totalPages ? "#aaa" : "#fff" }}>Next →</button>
                        </div>
                    )}
                    </>
                )}
                </>
            )}
        </div>
        </>
    );
}
