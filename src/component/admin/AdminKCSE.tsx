// AdminKCSE.tsx — admin upload interface for KCSE past papers
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase.ts";

interface Paper {
    id: string;
    subject: string;
    year: number;
    type: "paper" | "answers";
    paperUrl: string;
    fileName: string;
    uploadedAt?: any;
}

const s: Record<string, React.CSSProperties> = {
    card:   { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2:     { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    row:    { display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 14, alignItems: "flex-end" },
    input:  { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none" },
    select: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", background: "#fff" },
    btn:    { padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, fontFamily: "inherit" },
    table:  { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" },
    th:     { background: "#f5f5ff", color: "#4361ee", padding: "10px 14px", textAlign: "left" as const, borderBottom: "2px solid #e0e0f0", fontWeight: 600 },
    td:     { padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const },
};

const SUBJECTS = [
    "Mathematics","English","Kiswahili","Biology","Chemistry","Physics",
    "History","Geography","CRE","IRE","Business Studies","Agriculture",
    "Computer Studies","Home Science","Art & Design","Music",
];

const YEARS = Array.from({ length: 15 }, (_, i) => 2024 - i);

export function AdminKCSE() {
    const [papers,   setPapers]   = useState<Paper[]>([]);
    const [subject,  setSubject]  = useState(SUBJECTS[0]);
    const [year,     setYear]     = useState(2024);
    const [type,     setType]     = useState<"paper" | "answers">("paper");
    const [file,     setFile]     = useState<File | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [err,      setErr]      = useState("");

    const load = () => {
        getDocs(collection(db, "kcsePapers"))
            .then(snap => setPapers(
                snap.docs.map(d => ({ id: d.id, ...d.data() } as Paper))
                    .sort((a, b) => b.year - a.year)
            )).catch(() => {});
    };

    useEffect(() => { load(); }, []);

    const upload = async () => {
        if (!file) return setErr("Select a PDF file.");
        setErr(""); setProgress(0);

        const path = `kcsePapers/${year}/${subject}_${type}_${year}.pdf`;
        const storageRef = ref(storage, path);
        const task = uploadBytesResumable(storageRef, file);

        task.on("state_changed",
            snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
            () => { setErr("Upload failed. Try again."); setProgress(null); },
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                await addDoc(collection(db, "kcsePapers"), {
                    subject, year, type, paperUrl: url,
                    fileName: file.name,
                    uploadedAt: serverTimestamp(),
                });
                setProgress(null); setFile(null);
                (document.getElementById("kcse-file-input") as HTMLInputElement).value = "";
                load();
            }
        );
    };

    const del = async (paper: Paper) => {
        if (!confirm(`Delete ${paper.subject} ${paper.year} (${paper.type})?`)) return;
        try {
            const storageRef = ref(storage, `kcsePapers/${paper.year}/${paper.subject}_${paper.type}_${paper.year}.pdf`);
            await deleteObject(storageRef).catch(() => {});
        } catch {}
        await deleteDoc(doc(db, "kcsePapers", paper.id));
        setPapers(prev => prev.filter(p => p.id !== paper.id));
    };

    return (
        <div>
            {/* Upload form */}
            <div style={s.card}>
                <h2 style={s.h2}>📤 Upload KCSE Paper</h2>
                <div style={s.row}>
                    <div>
                        <div style={{ fontSize: "0.78rem", color: "#888", marginBottom: 4 }}>Subject</div>
                        <select style={s.select} value={subject} onChange={e => setSubject(e.target.value)}>
                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: "0.78rem", color: "#888", marginBottom: 4 }}>Year</div>
                        <select style={s.select} value={year} onChange={e => setYear(Number(e.target.value))}>
                            {YEARS.map(y => <option key={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: "0.78rem", color: "#888", marginBottom: 4 }}>Type</div>
                        <select style={s.select} value={type} onChange={e => setType(e.target.value as "paper" | "answers")}>
                            <option value="paper">Question Paper</option>
                            <option value="answers">Marking Scheme / Answers</option>
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: "0.78rem", color: "#888", marginBottom: 4 }}>PDF File</div>
                        <input id="kcse-file-input" type="file" accept="application/pdf" style={s.input}
                            onChange={e => setFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <button style={{ ...s.btn, background: "#16a34a", color: "#fff" }}
                        onClick={upload} disabled={progress !== null}>
                        {progress !== null ? `Uploading ${progress}%…` : "⬆ Upload"}
                    </button>
                </div>
                {progress !== null && (
                    <div style={{ background: "#f0fdf4", borderRadius: 6, height: 8, overflow: "hidden" }}>
                        <div style={{ background: "#16a34a", height: "100%", width: `${progress}%`, transition: "width 0.3s" }} />
                    </div>
                )}
                {err && <div style={{ color: "#991b1b", fontSize: "0.82rem", marginTop: 8 }}>{err}</div>}
            </div>

            {/* Papers list */}
            <div style={s.card}>
                <h2 style={s.h2}>📂 Uploaded Papers ({papers.length})</h2>
                <div style={{ overflowX: "auto" }}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                {["Subject","Year","Type","File","Uploaded","Actions"].map(h =>
                                    <th key={h} style={s.th}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {papers.length === 0 ? (
                                <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No papers uploaded yet</td></tr>
                            ) : papers.map((p, i) => (
                                <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                                    <td style={s.td}>{p.subject}</td>
                                    <td style={s.td}>{p.year}</td>
                                    <td style={s.td}>
                                        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "0.75rem", fontWeight: 600,
                                            background: p.type === "answers" ? "#fff7ed" : "#dcfce7",
                                            color: p.type === "answers" ? "#ea580c" : "#16a34a" }}>
                                            {p.type === "answers" ? "Marking Scheme" : "Question Paper"}
                                        </span>
                                    </td>
                                    <td style={s.td}>
                                        <a href={p.paperUrl} target="_blank" rel="noreferrer"
                                            style={{ color: "#4361ee", fontSize: "0.8rem" }}>
                                            View PDF ↗
                                        </a>
                                    </td>
                                    <td style={s.td}>{p.uploadedAt?.toDate?.()?.toLocaleDateString?.() ?? "—"}</td>
                                    <td style={s.td}>
                                        <button style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}
                                            onClick={() => del(p)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
