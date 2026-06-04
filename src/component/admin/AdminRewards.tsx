// AdminRewards.tsx — Quest and Rewards Management
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.ts";
import { writeAdminAudit } from "./auditLog.ts";

export type Quest = {
    id?: string;
    title: string;
    description: string;
    targetType: "daily_games" | "total_games" | "new_user";
    targetCount: number;
    rewardPoints: number;
    active: boolean;
    icon: string;
};

const BLANK_QUEST: Omit<Quest, "id"> = {
    title: "",
    description: "",
    targetType: "daily_games",
    targetCount: 5,
    rewardPoints: 100,
    active: true,
    icon: "gamepad",
};

const s: Record<string, React.CSSProperties> = {
    card: { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2: { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" },
    th: { background: "#f5f5ff", color: "#4361ee", padding: "10px 14px", textAlign: "left" as const, borderBottom: "2px solid #e0e0f0", fontWeight: 600, whiteSpace: "nowrap" as const },
    td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const },
    btn: { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" },
    input: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const },
    label: { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#555", marginBottom: 5 },
    row: { marginBottom: 14 },
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
    modal: { background: "#fff", borderRadius: 12, padding: "28px 28px 24px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" },
    mh2: { color: "#1a1a2e", fontSize: "1rem", fontWeight: 700, marginBottom: 20 },
};

export function AdminRewards() {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalQuest, setModalQuest] = useState<Quest | null>(null);

    useEffect(() => {
        getDocs(collection(db, "quests"))
            .then(snap => {
                setQuests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load quests:", err);
                setError("Missing or insufficient permissions. Please ensure Firestore rules are deployed.");
                setLoading(false);
            });
    }, []);

    const saveQuest = async (q: Quest) => {
        try {
            if (q.id) {
                const { id, ...data } = q;
                await updateDoc(doc(db, "quests", id), data);
                setQuests(prev => prev.map(item => item.id === id ? q : item));
                await writeAdminAudit({ action: "Quest updated", target: q.title, details: q });
            } else {
                const docRef = await addDoc(collection(db, "quests"), q);
                setQuests(prev => [...prev, { ...q, id: docRef.id }]);
                await writeAdminAudit({ action: "Quest created", target: q.title, details: q });
            }
            setModalQuest(null);
        } catch (err) {
            alert("Error saving quest: " + err);
        }
    };

    const deleteQuest = async (id: string, title: string) => {
        if (!confirm(`Delete quest "${title}"?`)) return;
        await deleteDoc(doc(db, "quests", id));
        setQuests(prev => prev.filter(q => q.id !== id));
        await writeAdminAudit({ action: "Quest deleted", target: title });
    };

    if (loading) return <p>Loading quests...</p>;
    if (error) return <div style={{ color: "#dc2626", padding: 20, background: "#fee2e2", borderRadius: 8, border: "1px solid #fecdd3" }}>
        <strong>Error:</strong> {error}
        <p style={{ marginTop: 10, fontSize: "0.85rem" }}>Run <code>firebase deploy --only firestore:rules</code> to fix this.</p>
    </div>;

    return (
        <>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ ...s.h2, marginBottom: 0, borderBottom: "none" }}>Quest Management</h2>
                <button style={{ ...s.btn, background: "#4361ee", color: "#fff" }} onClick={() => setModalQuest(BLANK_QUEST as Quest)}>+ Add Quest</button>
            </div>

            <div style={s.card}>
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={s.th}>Title</th>
                            <th style={s.th}>Type</th>
                            <th style={s.th}>Target</th>
                            <th style={s.th}>Reward</th>
                            <th style={s.th}>Status</th>
                            <th style={s.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quests.map(q => (
                            <tr key={q.id}>
                                <td style={s.td}><strong>{q.title}</strong><br /><small style={{ color: "#666" }}>{q.description}</small></td>
                                <td style={s.td}>{q.targetType.replace("_", " ")}</td>
                                <td style={s.td}>{q.targetCount}</td>
                                <td style={s.td}>{q.rewardPoints} pts</td>
                                <td style={s.td}>
                                    <span style={{
                                        background: q.active ? "#dcfce7" : "#f1f5f9",
                                        color: q.active ? "#166534" : "#64748b",
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        fontSize: "0.72rem",
                                        fontWeight: 700
                                    }}>{q.active ? "Active" : "Inactive"}</span>
                                </td>
                                <td style={s.td}>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button style={{ ...s.btn, background: "#f0f2f8", color: "#344054" }} onClick={() => setModalQuest(q)}>Edit</button>
                                        <button style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }} onClick={() => deleteQuest(q.id!, q.title)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalQuest && (
                <QuestModal
                    quest={modalQuest}
                    onSave={saveQuest}
                    onClose={() => setModalQuest(null)}
                />
            )}
        </>
    );
}

function QuestModal({ quest, onSave, onClose }: { quest: Quest, onSave: (q: Quest) => Promise<void>, onClose: () => void }) {
    const [form, setForm] = useState<Quest>(quest);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                <h3 style={s.mh2}>{form.id ? "Edit Quest" : "Add New Quest"}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={s.row}>
                        <label style={s.label}>Title</label>
                        <input style={s.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Play 5 games today" />
                    </div>
                    <div style={s.row}>
                        <label style={s.label}>Description</label>
                        <textarea style={{ ...s.input, minHeight: 60 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Complete any 5 quiz sessions to earn a bonus." />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={s.label}>Target Type</label>
                            <select style={s.input} value={form.targetType} onChange={e => setForm({ ...form, targetType: e.target.value as any })}>
                                <option value="daily_games">Games played today</option>
                                <option value="total_games">Total games played</option>
                                <option value="new_user">New user bonus</option>
                            </select>
                        </div>
                        <div>
                            <label style={s.label}>Icon</label>
                            <select style={s.input} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>
                                <option value="gamepad">Gamepad</option>
                                <option value="sparkles">Sparkles</option>
                                <option value="gift">Gift</option>
                                <option value="coins">Coins</option>
                                <option value="youtube">YouTube</option>
                                <option value="facebook">Facebook</option>
                                <option value="instagram">Instagram</option>
                                <option value="clock">Clock</option>
                                <option value="bell">Bell</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={s.label}>Target Count</label>
                            <input type="number" style={s.input} value={form.targetCount} onChange={e => setForm({ ...form, targetCount: parseInt(e.target.value) })} required />
                        </div>
                        <div>
                            <label style={s.label}>Reward Points</label>
                            <input type="number" style={s.input} value={form.rewardPoints} onChange={e => setForm({ ...form, rewardPoints: parseInt(e.target.value) })} required />
                        </div>
                    </div>
                    <div style={s.row}>
                        <label style={s.label}>Status</label>
                        <select style={s.input} value={form.active ? "yes" : "no"} onChange={e => setForm({ ...form, active: e.target.value === "yes" })}>
                            <option value="yes">Active</option>
                            <option value="no">Inactive</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                        <button type="button" style={{ ...s.btn, background: "#f1f5f9", color: "#475569" }} onClick={onClose}>Cancel</button>
                        <button type="submit" style={{ ...s.btn, background: "#4361ee", color: "#fff" }} disabled={saving}>{saving ? "Saving..." : "Save Quest"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
