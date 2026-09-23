// AdminAchievements.tsx — Badge and Achievement Management
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.ts";
import { writeAdminAudit } from "./auditLog.ts";

export type Badge = {
    id?: string;
    name: string;
    description: string;
    requirement: string;
    icon: string;
    unlockedCount?: number;
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

const BLANK_BADGE: Omit<Badge, "id"> = {
    name: "",
    description: "",
    requirement: "",
    icon: "🏆",
};

export function AdminAchievements() {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalBadge, setModalBadge] = useState<Badge | null>(null);

    useEffect(() => {
        getDocs(collection(db, "badges"))
            .then(snap => {
                setBadges(snap.docs.map(d => ({ id: d.id, ...d.data() } as Badge)));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load badges:", err);
                setError("Missing or insufficient permissions. Please ensure Firestore rules are deployed.");
                setLoading(false);
            });
    }, []);

    const saveBadge = async (b: Badge) => {
        try {
            if (b.id) {
                const { id, ...data } = b;
                await updateDoc(doc(db, "badges", id), data);
                setBadges(prev => prev.map(item => item.id === id ? b : item));
                await writeAdminAudit({ action: "Badge updated", target: b.name, details: b });
            } else {
                const docRef = await addDoc(collection(db, "badges"), b);
                setBadges(prev => [...prev, { ...b, id: docRef.id }]);
                await writeAdminAudit({ action: "Badge created", target: b.name, details: b });
            }
            setModalBadge(null);
        } catch (err) {
            alert("Error saving badge: " + err);
        }
    };

    const deleteBadge = async (id: string, name: string) => {
        if (!confirm(`Delete badge "${name}"?`)) return;
        await deleteDoc(doc(db, "badges", id));
        setBadges(prev => prev.filter(b => b.id !== id));
        await writeAdminAudit({ action: "Badge deleted", target: name });
    };

    if (loading) return <p>Loading badges...</p>;
    if (error) return <div style={{ color: "#dc2626", padding: 20, background: "#fee2e2", borderRadius: 8, border: "1px solid #fecdd3" }}>
        <strong>Error:</strong> {error}
        <p style={{ marginTop: 10, fontSize: "0.85rem" }}>Run <code>firebase deploy --only firestore:rules</code> to fix this.</p>
    </div>;

    return (
        <>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ ...s.h2, marginBottom: 0, borderBottom: "none" }}>Badge & Achievement Management</h2>
                <button style={{ ...s.btn, background: "#4361ee", color: "#fff" }} onClick={() => setModalBadge(BLANK_BADGE as Badge)}>+ Add Badge</button>
            </div>

            <div style={s.card}>
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={s.th}>Badge</th>
                            <th style={s.th}>Requirement</th>
                            <th style={s.th}>Unlocked By</th>
                            <th style={s.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {badges.map(b => (
                            <tr key={b.id}>
                                <td style={s.td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <span style={{ fontSize: "1.5rem" }}>{b.icon}</span>
                                        <div>
                                            <strong>{b.name}</strong><br />
                                            <small style={{ color: "#666" }}>{b.description}</small>
                                        </div>
                                    </div>
                                </td>
                                <td style={s.td}>{b.requirement}</td>
                                <td style={s.td}>{b.unlockedCount || 0} players</td>
                                <td style={s.td}>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button style={{ ...s.btn, background: "#fef9c3", color: "#854d0e" }} onClick={() => setModalBadge(b)}>Edit</button>
                                        <button style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }} onClick={() => deleteBadge(b.id!, b.name)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalBadge && (
                <BadgeModal
                    badge={modalBadge}
                    onSave={saveBadge}
                    onClose={() => setModalBadge(null)}
                />
            )}
        </>
    );
}

function BadgeModal({ badge, onSave, onClose }: { badge: Badge, onSave: (b: Badge) => Promise<void>, onClose: () => void }) {
    const [form, setForm] = useState<Badge>(badge);
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
                <h3 style={s.mh2}>{form.id ? "Edit Badge" : "Add New Badge"}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={s.row}>
                        <label style={s.label}>Badge Name</label>
                        <input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Hot Streak" />
                    </div>
                    <div style={s.row}>
                        <label style={s.label}>Description</label>
                        <input style={s.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="e.g. Play 7 days in a row" />
                    </div>
                    <div style={s.row}>
                        <label style={s.label}>Unlock Requirement (internal note)</label>
                        <input style={s.input} value={form.requirement} onChange={e => setForm({ ...form, requirement: e.target.value })} required placeholder="e.g. streak >= 7" />
                    </div>
                    <div style={s.row}>
                        <label style={s.label}>Icon (Emoji)</label>
                        <input style={s.input} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} required placeholder="e.g. 🔥" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                        <button type="button" style={{ ...s.btn, background: "#f1f5f9", color: "#475569" }} onClick={onClose}>Cancel</button>
                        <button type="submit" style={{ ...s.btn, background: "#4361ee", color: "#fff" }} disabled={saving}>{saving ? "Saving..." : "Save Badge"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
