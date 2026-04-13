// HowToPlayModal.tsx
import { type FC } from "react";
import '../styles/Howtoplaymodal.css';

interface Props { onClose: () => void; }

const ROUNDS = [
    {
        num: "01", cls: "htp-round--1", color: "#7B61FF",
        icon: "⚡", title: "Quickfire",
        points: "+100 correct · −50 wrong · −50 pass",
        desc: "75 seconds on the clock. Answer as many questions as you can before time runs out. Build streaks for combo bonuses.",
    },
    {
        num: "02", cls: "htp-round--2", color: "#FF6B6B",
        icon: "🗂️", title: "Category Rush",
        points: "+500 correct · −250 wrong · −250 pass",
        desc: "40 seconds total. Questions are drawn from all categories randomly. Answer fast — the clock doesn't stop between questions.",
    },
    {
        num: "03", cls: "htp-round--3", color: "#FFD700",
        icon: "🎡", title: "Risk Spins",
        points: "Up to 3 spins · bank or risk",
        desc: "Spin the wheel to land a prize. Answer correctly to bank it. Choose to stop safely or risk your banked points for another spin — wrong answer loses everything.",
    },
];

const POWERS = [
    { emoji: "⏰", name: "Bonus Time",        desc: "+30s added to Round 1 timer",                    color: "#4dd0e1" },
    { emoji: "⏱️", name: "Time Tax",           desc: "−20s removed from Round 1 timer",               color: "#ff6b6b" },
    { emoji: "×2", name: "Double Points",      desc: "All Round 1 points doubled",                    color: "#ffd200" },
    { emoji: "❄️", name: "Freeze Frame",       desc: "Pause the timer once for 15s in Round 1",       color: "#4dd0e1" },
    { emoji: "🔄", name: "Second Chance",      desc: "One free retry on a wrong answer",              color: "#a29bfe" },
    { emoji: "🔀", name: "Question Swap",      desc: "Skip up to 3 questions for free",               color: "#fff" },
    { emoji: "🧠", name: "Borrowed Brain",     desc: "Eliminate 2 wrong options once per question",   color: "#a29bfe" },
    { emoji: "🛡️", name: "No Penalty",         desc: "Wrong answers & passes cost 0 points",          color: "#38ef7d" },
    { emoji: "🎲", name: "Double Or Nothing",  desc: "Perfect Round 2 → ×2 score, else → 0",         color: "#ff9f1c" },
    { emoji: "🎰", name: "Point Gamble",       desc: "50/50 chance to double or halve Round 2 pts",   color: "#ff6b6b" },
    { emoji: "🛡️", name: "Insurance",          desc: "Guarantees minimum 1,000 pts in Round 2",       color: "#38ef7d" },
    { emoji: "🪞", name: "Mirror Effect",      desc: "Round 2 score multiplied by ×1.5",              color: "#ffd200" },
    { emoji: "💀", name: "Disqualified",       desc: "Round score set to 0 — high risk!",             color: "#ff6b6b" },
];

export const HowToPlayModal: FC<Props> = ({ onClose }) => (
    <div className="htp-overlay" onClick={onClose}>
        <div className="htp-modal" onClick={e => e.stopPropagation()}>
            <button className="htp-close" onClick={onClose}>✕</button>

            <div className="htp-header">
                <div className="htp-header-icon">🎮</div>
                <h2 className="htp-title">How to Play</h2>
                <p className="htp-header-sub">3 rounds · hidden powers · spin to win</p>
            </div>

            <div className="htp-divider" />

            <h3 className="htp-section-title">The Rounds</h3>
            <div className="htp-rounds">
                {ROUNDS.map(r => (
                    <div key={r.num} className={`htp-round ${r.cls}`} style={{ borderColor: r.color }}>
                        <div className="htp-round-left">
                            <div className="htp-round-num" style={{ color: r.color }}>ROUND {r.num}</div>
                            <div className="htp-round-icon">{r.icon}</div>
                        </div>
                        <div className="htp-round-body">
                            <strong style={{ color: r.color }}>{r.title}</strong>
                            <div className="htp-round-pts">{r.points}</div>
                            <p>{r.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="htp-divider" />

            <h3 className="htp-section-title">Power Boxes</h3>
            <p className="htp-powers-intro">Pick a mystery box before Round 1. Your power affects all rounds.</p>
            <div className="htp-powers">
                {POWERS.map(p => (
                    <div key={p.name} className="htp-power-row">
                        <span className="htp-power-emoji" style={{ color: p.color }}>{p.emoji}</span>
                        <div>
                            <strong>{p.name}</strong>
                            <span>{p.desc}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
