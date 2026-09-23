// Round3QuestionScreen.tsx
import { type FC, useState } from "react";
import { R3_QUESTIONS, shuffle, type WheelSegment } from "../../types/gametypes.ts";
import '../../styles/game.css';

interface Props {
    segment:      WheelSegment;
    currentScore: number;
    onComplete:   (earnedBonus: number) => void;
}

export const Round3QuestionScreen: FC<Props> = ({ segment, currentScore, onComplete }) => {
    const [question] = useState(() => shuffle(R3_QUESTIONS)[0]);
    const [answered, setAnswered] = useState<number | null>(null);

    const isMultiplier = segment.label === "×3" || segment.label === "Double Up";
    const isBonusSpin  = segment.label === "+ Bonus Spin" || segment.label === "★★★";

    const prizeDesc = (() => {
        if (segment.label === "×3")        return `Triple your total score! (${currentScore.toLocaleString()} × 3 = ${(currentScore * 3).toLocaleString()} pts)`;
        if (segment.label === "Double Up") return `Double your total score! (${currentScore.toLocaleString()} × 2 = ${(currentScore * 2).toLocaleString()} pts)`;
        if (isBonusSpin)                   return `No points this time — better luck next spin!`;
        return `+${segment.label} points added to your final score!`;
    })();

    const handleAnswer = (idx: number) => {
        if (answered !== null) return;
        setAnswered(idx);
        const correct = idx === question.answer;
        let bonus = 0;
        if (correct) {
            if (segment.label === "×3")          bonus = currentScore * 3;
            else if (segment.label === "Double Up") bonus = currentScore * 2;
            else bonus = segment.points;
        }
        setTimeout(() => onComplete(correct ? bonus : 0), 1200);
    };

    const prizeClass = isMultiplier ? "game-banner game-banner--danger" : isBonusSpin ? "game-banner" : "game-banner game-banner--r3-prize";

    return (
        <div className="game-root">
            <div className="game-card">
                {/* Header */}
                <div className="game-header-row">
                    <span className="game-badge">🎡 Bonus Question</span>
                    <span className="game-score-badge" style={{ fontSize: "1rem", borderWidth: 2 }}>
                        🏆 {segment.label}
                    </span>
                </div>

                {/* Prize description */}
                <div className={prizeClass}>
                    {isMultiplier ? "🔥 " : isBonusSpin ? "💫 " : "💰 "}{prizeDesc}
                </div>

                <p className="game-power-note">Answer correctly to claim it!</p>

                {/* Question */}
                <div className="game-question" style={{ height: 100, minHeight: 100, maxHeight: 100, overflow: 'hidden', flexShrink: 0 }}>
                    <p>{question.q}</p>
                </div>

                {/* Options */}
                {question.options.map((opt, i) => {
                    let cls = "game-option";
                    if (answered !== null) {
                        if (i === question.answer) cls += " game-option--correct";
                        else if (i === answered)   cls += " game-option--wrong";
                        else                       cls += " game-option--disabled";
                    }
                    return (
                        <button key={i} className={cls}
                                disabled={answered !== null}
                                data-label={["A","B","C","D"][i]}
                                onClick={() => handleAnswer(i)}>
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
