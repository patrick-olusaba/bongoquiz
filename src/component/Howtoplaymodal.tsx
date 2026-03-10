// HowToPlayModal.tsx
import { type FC } from "react";
import '../styles/HowToPlayModal.css';

interface Props { onClose: () => void; }

const POWERS = [
    { name: "Bonus Time",      desc: "Adds 30 extra seconds to Round 1 timer",          emoji: "⏰" },
    { name: "Double Points",   desc: "Doubles all points earned in Round 1",             emoji: "×2" },
    { name: "Double Or Nothing", desc: "All Round 2 points × 2 if perfect, else 0",     emoji: "🎲" },
    { name: "Freeze Frame",    desc: "Pause the Round 1 timer for 15 seconds once",      emoji: "❄️" },
    { name: "Insurance",       desc: "Guarantees 500pts even on 0 correct in Round 2",   emoji: "🛡️" },
    { name: "No Penalty",      desc: "Wrong answers in Round 2 don't count against you", emoji: "🚫" },
    { name: "Point Gamble",    desc: "50/50 chance to double or halve your Round 2 pts", emoji: "🎰" },
    { name: "Question Swap",   desc: "Skip one question in Round 2 for free",            emoji: "🔀" },
    { name: "Second Chance",   desc: "Get one free retry on a wrong answer in Round 2",  emoji: "🔄" },
];

export const HowToPlayModal: FC<Props> = ({ onClose }) => (
    <div className="htp-overlay" onClick={onClose}>
        <div className="htp-modal" onClick={e => e.stopPropagation()}>
            <button className="htp-close" onClick={onClose}>✕</button>
            <h2 className="htp-title">🎮 How to Play</h2>

            <div className="htp-rounds">
                <div className="htp-round htp-round--1">
                    <div className="htp-round-icon">⚡</div>
                    <div>
                        <strong>Round 1 — Quickfire</strong>
                        <p>Answer as many questions as possible in 90 seconds. Each correct answer = 100 pts. Pass freely.</p>
                    </div>
                </div>
                <div className="htp-round htp-round--2">
                    <div className="htp-round-icon">🗂️</div>
                    <div>
                        <strong>Round 2 — Categories</strong>
                        <p>Pick a topic. Answer 5 questions in 15s each. Each correct = 1,000 pts.</p>
                    </div>
                </div>
                <div className="htp-round htp-round--3">
                    <div className="htp-round-icon">🎡</div>
                    <div>
                        <strong>Round 3 — Spin &amp; Win</strong>
                        <p>Spin the wheel for a bonus. Land on a multiplier to boost your entire score!</p>
                    </div>
                </div>
            </div>

            <h3 className="htp-section-title">⚡ Power Boxes</h3>
            <div className="htp-powers">
                {POWERS.map(p => (
                    <div key={p.name} className="htp-power-row">
                        <span className="htp-power-emoji">{p.emoji}</span>
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