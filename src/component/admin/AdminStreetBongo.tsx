import {useEffect, useMemo, useState} from "react";
import {addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc} from "firebase/firestore";
import {getDownloadURL, ref, uploadBytes} from "firebase/storage";
import {db, storage} from "../../firebase";
import {
    DEFAULT_STREET_BONGO_QUESTIONS,
    STREET_BONGO_CATEGORIES,
    StreetBongoCategory,
    StreetBongoQuestion,
} from "../StreetBongo/streetBongoQuestions";

const s: Record<string, React.CSSProperties> = {
    card: {background: "#fff", borderRadius: 10, padding: "18px 20px", border: "1px solid #e8eaf0", marginBottom: 16},
    h2: {margin: "0 0 12px", color: "#1a1a2e", fontSize: "1rem", borderBottom: "2px solid #f0f0f8", paddingBottom: 8},
    p: {margin: "0 0 10px", color: "#4b5563", lineHeight: 1.65, fontSize: "0.88rem"},
    input: {width: "100%", border: "1px solid #d8dce8", borderRadius: 8, padding: "9px 11px", font: "inherit", fontSize: "0.85rem"},
    btn: {border: 0, borderRadius: 8, padding: "8px 13px", cursor: "pointer", font: "inherit", fontWeight: 800, fontSize: "0.8rem"},
};

const categories = STREET_BONGO_CATEGORIES.filter(c => c.id !== "random") as Array<{
    id: Exclude<StreetBongoCategory, "random">;
    label: string;
    icon: string;
    description: string;
}>;

type CategoryId = Exclude<StreetBongoCategory, "random">;
type ManagedQuestion = StreetBongoQuestion & {docId: string; source?: string};

const emptyForm = {
    category: "general" as CategoryId,
    prompt: "",
    answer: "",
    visual: "",
    visualImageUrl: "",
};

export function AdminStreetBongo() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | CategoryId>("overview");
    const activeCategory = activeTab === "overview" ? "general" : activeTab;
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [draggingImage, setDraggingImage] = useState(false);
    const [uploading, setUploading] = useState(false);

    const setSelectedImage = (file: File | null) => {
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : form.visualImageUrl);
    };

    const resetForm = (category = activeCategory) => {
        setEditingId(null);
        setForm({...emptyForm, category});
        setImageFile(null);
        setImagePreview("");
    };

    const load = async () => {
        const [sessionSnap, questionSnap] = await Promise.all([
            getDocs(collection(db, "streetBongoSessions")).catch(() => null),
            getDocs(collection(db, "streetBongoQuestions")).catch(() => null),
        ]);

        if (sessionSnap) setSessions(sessionSnap.docs.map(d => ({id: d.id, ...d.data()})));
        if (!questionSnap) return;

        if (questionSnap.empty) {
            await Promise.all(DEFAULT_STREET_BONGO_QUESTIONS.map(q =>
                setDoc(doc(db, "streetBongoQuestions", q.id), {...q, source: "default", createdAt: serverTimestamp()})
            ));
            const seeded = await getDocs(collection(db, "streetBongoQuestions"));
            setQuestions(seeded.docs.map(d => ({docId: d.id, ...(d.data() as StreetBongoQuestion & {source?: string})})));
            return;
        }

        setQuestions(questionSnap.docs.map(d => ({docId: d.id, ...(d.data() as StreetBongoQuestion & {source?: string})})));
    };

    useEffect(() => { load(); }, []);

    const stats = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaySeconds = todayStart.getTime() / 1000;
        const today = sessions.filter(session => (session.playedAt?.seconds ?? 0) >= todaySeconds);
        const winners = today.filter(session => session.won).length;
        const losers = today.length - winners;
        const meals = today.reduce((sum, session) => sum + Number(session.mealsGiven ?? (session.won ? 1 : 0)), 0);
        const missed: Record<string, number> = {};
        const byCategory: Record<string, {total: number; wrong: number}> = {};

        today.forEach(session => {
            const key = String(session.categoryLabel ?? session.category ?? "Unknown");
            byCategory[key] = byCategory[key] ?? {total: 0, wrong: 0};
            byCategory[key].total += 1;
            (session.answers ?? []).forEach((answer: any) => {
                if (answer.result === "wrong") {
                    byCategory[key].wrong += 1;
                    const prompt = String(answer.prompt ?? "Unknown question");
                    missed[prompt] = (missed[prompt] ?? 0) + 1;
                }
            });
        });

        const hardestCategory = Object.entries(byCategory)
            .sort((a, b) => (b[1].wrong / Math.max(b[1].total, 1)) - (a[1].wrong / Math.max(a[1].total, 1)))[0]?.[0] ?? "No data yet";
        const mostMissedQuestion = Object.entries(missed).sort((a, b) => b[1] - a[1])[0];

        return {
            contestants: today.length,
            winners,
            losers,
            meals,
            hardestCategory,
            mostMissed: mostMissedQuestion ? `${mostMissedQuestion[0]} (${mostMissedQuestion[1]})` : "No misses yet",
        };
    }, [sessions]);

    const uploadImage = async () => {
        if (!imageFile) return form.visualImageUrl;
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const imageRef = ref(storage, "streetBongoImages/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext);
        await uploadBytes(imageRef, imageFile, {contentType: imageFile.type});
        return getDownloadURL(imageRef);
    };

    const saveQuestion = async () => {
        if (!form.prompt.trim() || !form.answer.trim()) return;

        setUploading(true);
        try {
            const visualImageUrl = await uploadImage();
            const data = {
                id: editingId ?? `custom-${Date.now()}`,
                category: form.category,
                prompt: form.prompt.trim(),
                options: [],
                answer: form.answer.trim(),
                visual: form.visual.trim() || null,
                visualImageUrl: visualImageUrl || null,
                source: editingId ? (questions.find(q => q.docId === editingId)?.source ?? "admin") : "admin",
                updatedAt: serverTimestamp(),
            };

            if (editingId) {
                await updateDoc(doc(db, "streetBongoQuestions", editingId), data);
            } else {
                await addDoc(collection(db, "streetBongoQuestions"), {...data, createdAt: serverTimestamp()});
            }

            resetForm(form.category);
            await load();
        } finally {
            setUploading(false);
        }
    };

    const editQuestion = (q: ManagedQuestion) => {
        setEditingId(q.docId);
        setActiveTab(q.category);
        setForm({
            category: q.category,
            prompt: q.prompt,
            answer: q.answer,
            visual: q.visual ?? "",
            visualImageUrl: q.visualImageUrl ?? "",
        });
        setImageFile(null);
        setImagePreview(q.visualImageUrl ?? "");
        document.getElementById("street-question-form")?.scrollIntoView({behavior: "smooth", block: "start"});
    };

    const deleteQuestion = async (id: string) => {
        if (!window.confirm("Delete this Street Bongo question?")) return;
        await deleteDoc(doc(db, "streetBongoQuestions", id));
        if (editingId === id) resetForm();
        await load();
    };

    const filteredQuestions = questions.filter(q => q.category === activeCategory);
    const activeLabel = categories.find(c => c.id === activeCategory)?.label ?? "Street Questions";

    return (
        <div>
            <div style={s.card}>
                <h2 style={s.h2}>Street Bongo</h2>
                <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
                    <button style={{...s.btn, background: activeTab === "overview" ? "#6d28d9" : "#f3f4f6", color: activeTab === "overview" ? "#fff" : "#374151", border: activeTab === "overview" ? "none" : "1px solid #e5e7eb"}} onClick={() => { setActiveTab("overview"); resetForm(); }}>Overview</button>
                    {categories.map(cat => {
                        const count = questions.filter(q => q.category === cat.id).length;
                        const active = activeTab === cat.id;
                        return (
                            <button key={cat.id} style={{...s.btn, background: active ? "#6d28d9" : "#f3f4f6", color: active ? "#fff" : "#374151", border: active ? "none" : "1px solid #e5e7eb"}} onClick={() => { setActiveTab(cat.id); resetForm(cat.id); }}>
                                {cat.icon} {cat.label} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>


            <div style={{display: activeTab === "overview" ? "grid" : "none", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16}}>
                {[
                    ["Contestants Today", stats.contestants],
                    ["Winners", stats.winners],
                    ["Losers", stats.losers],
                    ["Meals Given Out", stats.meals],
                ].map(([label, value]) => (
                    <div key={label} style={s.card}>
                        <strong style={{fontSize: "1.7rem", color: "#4361ee"}}>{value}</strong>
                        <div style={{fontSize: "0.78rem", color: "#6b7280", marginTop: 4}}>{label}</div>
                    </div>
                ))}
            </div>

            <div style={{...s.card, display: activeTab === "overview" ? "block" : "none"}}>
                <h2 style={s.h2}>Street Bongo Analytics</h2>
                <p style={s.p}><strong>Most difficult category:</strong> {stats.hardestCategory}</p>
                <p style={s.p}><strong>Most missed question:</strong> {stats.mostMissed}</p>
                <p style={s.p}><strong>Route:</strong> <code>/street-bongo</code></p>
            </div>

            {/*<div style={{...s.card, display: activeTab === "overview" ? "block" : "none"}}>*/}
            {/*    <h2 style={s.h2}>Host Help</h2>*/}
            {/*    <p style={s.p}>Street Bongo is a host-controlled 2 out of 3 challenge. The host chooses a category, reads each question, taps Show Answer when needed, then marks Correct or Wrong.</p>*/}
            {/*    <p style={s.p}>A contestant wins when they get at least 2 correct after all 3 questions. Winner sessions count as one Chicken Meal + Soda given out.</p>*/}
            {/*    <p style={s.p}>Use Random Mix for public shoots where you want category variety and more suspense.</p>*/}
            {/*</div>*/}

            <div id="street-question-form" style={{...s.card, display: activeTab === "overview" ? "none" : "block"}}>
                <h2 style={s.h2}>{editingId ? `Edit ${activeLabel} Question` : `Add ${activeLabel} Question`}</h2>
                <div style={{display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr", gap: 10}}>
                    <select style={s.input} value={form.category} onChange={e => setForm({...form, category: e.target.value as CategoryId})}>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                    <input style={s.input} value={form.visual} placeholder="Visual label, optional" onChange={e => setForm({...form, visual: e.target.value})}/>
                    <label
                        style={{
                            ...s.input,
                            gridColumn: "1 / -1",
                            display: "grid",
                            placeItems: "center",
                            gap: 10,
                            minHeight: 156,
                            cursor: "pointer",
                            background: draggingImage ? "#eef2ff" : "#f8fafc",
                            borderStyle: "dashed",
                            borderColor: draggingImage ? "#6d28d9" : "#cbd5e1",
                            textAlign: "center",
                        }}
                        onDragOver={e => {
                            e.preventDefault();
                            setDraggingImage(true);
                        }}
                        onDragLeave={() => setDraggingImage(false)}
                        onDrop={e => {
                            e.preventDefault();
                            setDraggingImage(false);
                            setSelectedImage(e.dataTransfer.files?.[0] ?? null);
                        }}
                    >
                        <input type="file" accept="image/*" style={{display: "none"}} onChange={e => setSelectedImage(e.target.files?.[0] ?? null)}/>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Question visual preview" style={{maxWidth: 220, maxHeight: 120, objectFit: "contain", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff"}}/>
                        ) : (
                            <div>
                                <strong style={{color: "#374151", fontSize: "0.9rem"}}>Drag and drop image here</strong>
                                <div style={{color: "#6b7280", fontSize: "0.82rem", marginTop: 4}}>or click to browse</div>
                            </div>
                        )}
                        {imageFile && <span style={{color: "#4b5563", fontSize: "0.8rem"}}>{imageFile.name}</span>}
                    </label>
                    <textarea style={{...s.input, gridColumn: "1 / -1", minHeight: 72}} value={form.prompt} placeholder="Question" onChange={e => setForm({...form, prompt: e.target.value})}/>
                    <div style={{display: "grid", gap: 10, alignContent: "start"}}>
                        <input style={s.input} value={form.answer} placeholder="Correct answer text" onChange={e => setForm({...form, answer: e.target.value})}/>
                        <button style={{...s.btn, background: "#4361ee", color: "#fff", opacity: uploading ? 0.65 : 1}} onClick={saveQuestion} disabled={uploading}>{uploading ? "Saving..." : editingId ? "Save Changes" : "Add Question"}</button>
                        {editingId && <button style={{...s.btn, background: "#f3f4f6", color: "#374151"}} onClick={() => resetForm()}>Cancel Edit</button>}
                    </div>
                </div>
            </div>

            <div style={{...s.card, display: activeTab === "overview" ? "none" : "block"}}>
                <h2 style={s.h2}>{activeLabel} Question Bank</h2>
                <div style={{overflowX: "auto"}}>
                    <table style={{width: "100%", borderCollapse: "collapse", fontSize: "0.82rem"}}>
                        <thead><tr>{["Visual", "Question", "Answer", "Source", "Actions"].map(h => <th key={h} style={{textAlign: "left", padding: 10, background: "#f5f5ff", color: "#4361ee"}}>{h}</th>)}</tr></thead>
                        <tbody>
                        {filteredQuestions.map(q => (
                            <tr key={q.docId}>
                                <td style={{padding: 10, borderBottom: "1px solid #eef0f7"}}>{q.visualImageUrl ? <img src={q.visualImageUrl} alt="" style={{width: 54, height: 38, objectFit: "contain", background: "#f8fafc", borderRadius: 6}}/> : q.visual ?? "-"}</td>
                                <td style={{padding: 10, borderBottom: "1px solid #eef0f7", minWidth: 240}}>{q.prompt}</td>
                                <td style={{padding: 10, borderBottom: "1px solid #eef0f7"}}>{q.answer}</td>
                                <td style={{padding: 10, borderBottom: "1px solid #eef0f7"}}>{q.source === "default" ? "Default" : "Admin"}</td>
                                <td style={{padding: 10, borderBottom: "1px solid #eef0f7"}}>
                                    <div style={{display: "flex", gap: 8}}>
                                        <button style={{...s.btn, background: "#e0e7ff", color: "#3730a3"}} onClick={() => editQuestion(q)}>Edit</button>
                                        <button style={{...s.btn, background: "#fee2e2", color: "#991b1b"}} onClick={() => deleteQuestion(q.docId)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredQuestions.length === 0 && <tr><td colSpan={5} style={{padding: 18, color: "#6b7280", textAlign: "center"}}>No questions in this category yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
