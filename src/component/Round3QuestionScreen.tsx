// Round3QuestionScreen.tsx
import { type FC, useState } from "react";
import { R3_QUESTIONS, shuffle, type WheelSegment } from "../types/gametypes.ts";
import '../styles/style.css';

interface Props {
    segment:      WheelSegment;
    currentScore: number;   // r1 + r2 combined, needed for multiplier segments
    onComplete:   (earnedBonus: number) => void;
}

export const Round3QuestionScreen: FC<Props> = ({ segment, currentScore, onComplete }) => {
    const [question] = useState(() => shuffle(R3_QUESTIONS)[0]);
    const [answered, setAnswered] = useState<number | null>(null);

    // Work out what the prize is worth
    const isMultiplier = segment.label === "×3" || segment.label === "Double Up";
    const isBonusSpin  = segment.label === "+ Bonus Spin" || segment.label === "★★★";

    const prizeDesc = (() => {
        if (segment.label === "×3")          return `Triple your total score! (${currentScore.toLocaleString()} × 3 = ${(currentScore * 3).toLocaleString()} pts)`;
        if (segment.label === "Double Up")   return `Double your total score! (${currentScore.toLocaleString()} × 2 = ${(currentScore * 2).toLocaleString()} pts)`;
        if (isBonusSpin)                     return `No points this time — better luck next spin!`;
        return `+${segment.label} points added to your final score!`;
    })();

    const handleAnswer = (idx: number) => {
        if (answered !== null) return;
        setAnswered(idx);
        const correct = idx === question.answer;

        let bonus = 0;
        if (correct) {
            if (segment.label === "×3")        bonus = currentScore * 3;        // replaces total later
            else if (segment.label === "Double Up") bonus = currentScore * 2;   // replaces total later
            else bonus = segment.points;
        }

        setTimeout(() => onComplete(correct ? bonus : 0), 1200);
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center",
            justifyContent: "center", padding: "20px",
            fontFamily: "'Segoe UI', sans-serif",
        }}>
            <div style={{
                background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)",
                borderRadius: "24px", border: "1px solid rgba(255,255,255,0.12)",
                padding: "36px", maxWidth: "680px", width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{
                        display: "inline-block", background: "rgba(255,215,0,0.1)",
                        border: "1px solid rgba(255,215,0,0.35)", borderRadius: "20px",
                        padding: "4px 14px", fontSize: "0.82rem", color: "#ffd200",
                    }}>🎡 Bonus Question</span>
                    <span style={{
                        display: "inline-block",
                        background: "rgba(255,215,0,0.15)",
                        border: "2px solid rgba(255,215,0,0.6)",
                        borderRadius: "20px", padding: "4px 16px",
                        fontSize: "1rem", color: "#FFD700",
                        fontWeight: 900, letterSpacing: 0.5,
                    }}>🏆 {segment.label}</span>
                </div>

                {/* Prize description */}
                <div style={{
                    background: isMultiplier
                        ? "rgba(255,107,107,0.1)"
                        : isBonusSpin
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,215,0,0.08)",
                    border: `1px solid ${isMultiplier ? "rgba(255,107,107,0.35)" : isBonusSpin ? "rgba(255,255,255,0.1)" : "rgba(255,215,0,0.3)"}`,
                    borderRadius: "12px", padding: "12px 16px",
                    marginBottom: 18, fontSize: "0.92rem",
                    color: isMultiplier ? "#ff9999" : isBonusSpin ? "rgba(255,255,255,0.4)" : "#FFD700",
                    lineHeight: 1.5,
                }}>
                    {isMultiplier ? "🔥 " : isBonusSpin ? "💫 " : "💰 "}{prizeDesc}
                </div>

                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", marginBottom: 16 }}>
                    Answer correctly to claim it!
                </p>

                {/* Question */}
                <div style={{
                    background: "rgba(255,255,255,0.07)", borderRadius: "14px",
                    padding: "20px", marginBottom: "18px", fontSize: "1.1rem",
                    fontWeight: 600, lineHeight: 1.5, color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}>{question.q}</div>

                {/* Options */}
                {question.options.map((opt, i) => {
                    const state = answered === null ? "default"
                        : i === question.answer ? "correct"
                        : i === answered ? "wrong" : "default";
                    return (
                        <button key={i} disabled={answered !== null} onClick={() => handleAnswer(i)} style={{
                            width: "100%", textAlign: "left", fontFamily: "inherit",
                            background: state === "correct" ? "rgba(56,239,125,0.2)" : state === "wrong" ? "rgba(229,45,39,0.2)" : "rgba(255,255,255,0.07)",
                            border: `2px solid ${state === "correct" ? "#38ef7d" : state === "wrong" ? "#e52d27" : "rgba(255,255,255,0.15)"}`,
                            borderRadius: "12px", padding: "13px 20px", color: "#fff",
                            fontSize: "0.98rem", cursor: state === "default" ? "pointer" : "default",
                            marginBottom: "10px", fontWeight: 500, transition: "all 0.15s",
                        }}>
                            {["A","B","C","D"][i]}. {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
