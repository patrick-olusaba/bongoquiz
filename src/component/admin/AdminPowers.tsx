// AdminPowers.tsx — Powers manager with images, edit & add
import { useState, useRef } from "react";

import BonusTime            from "../../assets/Items/BonusTime.png";
import TimeTax              from "../../assets/Items/TimeTax.png";
import FreezeFrame          from "../../assets/Items/FreezeFrame.png";
import NoPenalty            from "../../assets/Items/nopenalty.png";
import SecondChance         from "../../assets/Items/secondchance.png";
import QuestionSwap         from "../../assets/Items/questionswap.png";
import BorrowedBrain        from "../../assets/Items/BorrowedBrain.png";
import DoublePoints         from "../../assets/Items/DoublePoints2.png";
import DoubleOrNothing      from "../../assets/Items/DoubleorNothing.png";
import PointGamble          from "../../assets/Items/PointGamble.png";
import PointChanceBrain     from "../../assets/Items/pointChanceBrain.png";
import Insurance            from "../../assets/Items/insurance.png";
import MirrorEffect         from "../../assets/Items/MirrorEffect.png";
import StealAPoint          from "../../assets/Items/StealAPoint.png";
import SwapFate             from "../../assets/Items/SwapFate.png";
import SuddenDeath          from "../../assets/Items/SuddenDeathDisqualified.png";
import Disqualified         from "../../assets/Items/Disqualified.png";

type Power = {
    id: number;
    name: string;
    img: string;           // data URL (uploaded) or imported asset URL
    roundEffect: string;
    scoreModifier: string;
    active: boolean;
};

const SEED: Power[] = [
    { id:  1, name: "Bonus Time",               img: BonusTime,        roundEffect: "+30s R1 / +15s R2",         scoreModifier: "None",                              active: true },
    { id:  2, name: "Time Tax",                 img: TimeTax,          roundEffect: "−20s R1 / −12s R2",         scoreModifier: "None",                              active: true },
    { id:  3, name: "Freeze Frame",             img: FreezeFrame,      roundEffect: "Pause 15s R1 / 10s R2",     scoreModifier: "None",                              active: true },
    { id:  4, name: "No Penalty",               img: NoPenalty,        roundEffect: "Wrong = 0 pts",             scoreModifier: "None",                              active: true },
    { id:  5, name: "Second Chance",            img: SecondChance,     roundEffect: "1 retry on wrong",          scoreModifier: "None",                              active: true },
    { id:  6, name: "Question Swap",            img: QuestionSwap,     roundEffect: "Skip 3 R1 / 2 R2",         scoreModifier: "None",                              active: true },
    { id:  7, name: "Borrowed Brain",           img: BorrowedBrain,    roundEffect: "Eliminate 2 options",       scoreModifier: "None",                              active: true },
    { id:  8, name: "Double Points",            img: DoublePoints,     roundEffect: "R2 correct ×2",             scoreModifier: "R1 score ×2",                       active: true },
    { id:  9, name: "Double Or Nothing",        img: DoubleOrNothing,  roundEffect: "None",                      scoreModifier: "All correct → ×2, any wrong → 0",   active: true },
    { id: 10, name: "Point Gamble",             img: PointGamble,      roundEffect: "None",                      scoreModifier: "50%: ×2 or ÷2",                     active: true },
    { id: 11, name: "Point Chance Brain",       img: PointChanceBrain, roundEffect: "None",                      scoreModifier: "50%: ×2 or unchanged",              active: true },
    { id: 12, name: "Insurance",                img: Insurance,        roundEffect: "None",                      scoreModifier: "Floor: 500 (R1), 1000 (R2)",        active: true },
    { id: 13, name: "Mirror Effect",            img: MirrorEffect,     roundEffect: "None",                      scoreModifier: "Score ×1.5",                        active: true },
    { id: 14, name: "Steal A Point",            img: StealAPoint,      roundEffect: "None",                      scoreModifier: "+200 (R1), +500 (R2)",              active: true },
    { id: 15, name: "Swap Fate",                img: SwapFate,         roundEffect: "None",                      scoreModifier: "Score ×1.25",                       active: true },
    { id: 16, name: "Sudden Death Disqualified",img: SuddenDeath,      roundEffect: "None",                      scoreModifier: "Any wrong → ÷2 (R1), → 0 (R2)",    active: true },
    { id: 17, name: "Disqualified",             img: Disqualified,     roundEffect: "None",                      scoreModifier: "Final score = 0",                   active: true },
];

const BLANK: Omit<Power, "id"> = { name: "", img: "", roundEffect: "", scoreModifier: "", active: true };

const s: Record<string, React.CSSProperties> = {
    card:    { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2:      { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    p:       { lineHeight: 1.75, color: "#444", fontSize: "0.9rem", margin: "0 0 10px" },
    btn:     { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" },
    input:   { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const },
    label:   { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#555", marginBottom: 5 },
    row:     { marginBottom: 14 },
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
    modal:   { background: "#fff", borderRadius: 12, padding: "28px 28px 24px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" },
    mh2:     { color: "#1a1a2e", fontSize: "1rem", fontWeight: 700, marginBottom: 20 },
    grid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 },
    pcard:   { background: "#fafafe", borderRadius: 10, border: "1px solid #e8eaf0", padding: 16, display: "flex", flexDirection: "column" as const, gap: 10 },
    img:     { width: "100%", height: 120, objectFit: "contain" as const, borderRadius: 8, background: "#f0f0f8" },
    pname:   { fontWeight: 700, fontSize: "0.88rem", color: "#1a1a2e" },
    peff:    { fontSize: "0.78rem", color: "#666", lineHeight: 1.5 },
};

type ModalProps = { power: Power | null; onSave: (p: Power) => void; onClose: () => void; nextId: number; };

function PowerModal({ power, onSave, onClose, nextId }: ModalProps) {
    const [form, setForm] = useState<Omit<Power, "id"> & { id?: number }>(power ?? BLANK);
    const fileRef = useRef<HTMLInputElement>(null);

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setForm(f => ({ ...f, img: ev.target?.result as string }));
        reader.readAsDataURL(file);
    };

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...form, id: form.id ?? nextId } as Power);
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                <div style={s.mh2}>{power ? "Edit Power" : "Add Power"}</div>
                <form onSubmit={save}>
                    <div style={s.row}>
                        <label style={s.label}>Power Name</label>
                        <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bonus Time" required />
                    </div>

                    <div style={s.row}>
                        <label style={s.label}>Image</label>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            {form.img
                                ? <img src={form.img} style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 8, background: "#f0f0f8", border: "1px solid #e8eaf0" }} />
                                : <div style={{ width: 72, height: 72, borderRadius: 8, background: "#f0f0f8", border: "1px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "#aaa" }}>No image</div>
                            }
                            <div>
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    style={{ ...s.btn, background: "#f0f0f8", color: "#444", marginBottom: 6, display: "block" }}>
                                    📁 Upload Image
                                </button>
                                <div style={{ fontSize: "0.72rem", color: "#aaa" }}>PNG / JPG recommended</div>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
                            </div>
                        </div>
                    </div>

                    <div style={s.row}>
                        <label style={s.label}>In-Round Effect</label>
                        <input style={s.input} value={form.roundEffect} onChange={e => setForm(f => ({ ...f, roundEffect: e.target.value }))} placeholder="e.g. +30s R1 / +15s R2" required />
                    </div>

                    <div style={s.row}>
                        <label style={s.label}>Score Modifier</label>
                        <input style={s.input} value={form.scoreModifier} onChange={e => setForm(f => ({ ...f, scoreModifier: e.target.value }))} placeholder="e.g. Score ×1.5 or None" required />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                        <input type="checkbox" id="pw-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ accentColor: "#4361ee" }} />
                        <label htmlFor="pw-active" style={{ fontSize: "0.85rem", color: "#444", cursor: "pointer" }}>Active (available in game)</label>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button type="button" onClick={onClose} style={{ ...s.btn, background: "#f0f0f8", color: "#444" }}>Cancel</button>
                        <button type="submit" style={{ ...s.btn, background: "#4361ee", color: "#fff", padding: "8px 20px" }}>Save Power</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function AdminPowers() {
    const [powers,  setPowers]  = useState<Power[]>(SEED);
    const [editing, setEditing] = useState<Power | null>(null);
    const [adding,  setAdding]  = useState(false);

    const nextId = Math.max(0, ...powers.map(p => p.id)) + 1;

    const save = (p: Power) => {
        setPowers(prev => prev.some(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]);
        setEditing(null);
        setAdding(false);
    };

    const del = (id: number) => { if (confirm("Delete this power?")) setPowers(prev => prev.filter(p => p.id !== id)); };

    return (
        <>
        {(editing || adding) && (
            <PowerModal power={editing} onSave={save} onClose={() => { setEditing(null); setAdding(false); }} nextId={nextId} />
        )}

        <div style={s.card}>
            <h2 style={s.h2}>Powers <span style={{ color: "#aaa", fontWeight: 400, fontSize: "0.85rem" }}>({powers.length} total)</span></h2>
            <div style={{ marginBottom: 16, textAlign: "right" as const }}>
                <button onClick={() => setAdding(true)} style={{ ...s.btn, background: "#4361ee", color: "#fff" }}>+ Add Power</button>
            </div>

            <div style={s.grid}>
                {powers.map(p => (
                    <div key={p.id} style={{ ...s.pcard, opacity: p.active ? 1 : 0.5 }}>
                        <img src={p.img} style={s.img} alt={p.name} />
                        <div style={s.pname}>{p.name}</div>
                        <div style={s.peff}>
                            <span style={{ color: "#4361ee", fontWeight: 600 }}>Effect:</span> {p.roundEffect}<br />
                            <span style={{ color: "#4361ee", fontWeight: 600 }}>Modifier:</span> {p.scoreModifier}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                            <span style={{ background: p.active ? "#dcfce7" : "#f0f0f0", color: p.active ? "#166534" : "#555", padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700 }}>
                                {p.active ? "active" : "inactive"}
                            </span>
                            <button onClick={() => setEditing(p)} style={{ ...s.btn, background: "#fef9c3", color: "#854d0e", marginLeft: "auto" }}>Edit</button>
                            <button onClick={() => del(p.id)}     style={{ ...s.btn, background: "#fee2e2", color: "#991b1b" }}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        </>
    );
}
