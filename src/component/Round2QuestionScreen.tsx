// Round2QuestionScreen.tsx
import { type FC, useRef, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { R2_QUESTIONS, CATEGORY_META, shuffle, type Category } from "../types/gametypes.ts";
import '../styles/style.css';

interface Props {
    power: PrizeItem;
    category: Category;
    r1Score: number;
    onComplete: (correct: number, total: number) => void;
}

const POINTS_PER_Q = 1000;

export const Round2QuestionScreen: FC<Props> = ({ power, category, r1Score, onComplete }) => {
    const [questions] = useState(() => shuffle(R2_QUESTIONS[category] ?? []).slice(0, 5));
    const [index,    setIndex]    = useState(0);
    const [answered, setAnswered] = useState<number | null>(null);
    const [swapUsed, setSwapUsed] = useState(false);
    const [secondChancePending, setSecondChancePending] = useState(false);
    const correctRef = useRef(0);

    const advance = (c: number) => {
        const next = index + 1;
        if (next >= questions.length) onComplete(c, questions.length);
        else setIndex(next);
    };

    const handleAnswer = (idx: number) => {
        if (answered !== null) return;
        const q = questions[index];
        const isCorrect = idx === q.answer;

        if (!isCorrect && power.name === "Second Chance" && !secondChancePending) {
            setAnswered(idx);
            setSecondChancePending(true);
            setTimeout(() => { setAnswered(null); setSecondChancePending(false); }, 900);
            return;
        }

        setAnswered(idx);
        if (isCorrect) correctRef.current += 1;

        setTimeout(() => { setAnswered(null); advance(correctRef.current); }, 900);
    };

    const q = questions[index];
    if (!q) return null;
    const cm = CATEGORY_META[category];
    const currentR2Score = correctRef.current * POINTS_PER_Q;

    return (
        <div className="game-root">
            <div className="game-card">
                <div className="game-header-row">
                    <span className="game-badge" style={{ color: cm.color, borderColor: `${cm.color}55`, background: `${cm.color}18` }}>
                        {cm.icon} {category}
                    </span>
                    <span className="game-score-badge">🏆 {r1Score + currentR2Score}</span>
                </div>

                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", marginBottom: 14 }}>
                    Question {index + 1} / {questions.length} · {POINTS_PER_Q} pts each
                </p>

                {secondChancePending && (
                    <div className="game-banner game-banner--success">
                        🔄 Wrong — Second Chance lets you try once more!
                    </div>
                )}

                <div className="game-question">{q.q}</div>

                {q.options.map((opt, i) => {
                    const cls = answered === null ? "game-option"
                        : i === q.answer ? "game-option game-option--correct"
                            : i === answered ? "game-option game-option--wrong"
                                : "game-option game-option--disabled";
                    return (
                        <button key={i} className={cls} disabled={answered !== null} onClick={() => handleAnswer(i)}>
                            {["A","B","C","D"][i]}. {opt}
                        </button>
                    );
                })}

                <div className="game-power-row">
                    {power.name === "Question Swap" && !swapUsed && (
                        <button className="game-power-btn game-power-btn--swap"
                                onClick={() => { setSwapUsed(true); advance(correctRef.current); }}>
                            🔀 Skip this question
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};