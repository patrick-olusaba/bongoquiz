// Round1Screen.tsx
import { type FC, useEffect, useRef, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { R1_QUESTIONS, shuffle, type Question } from "../types/gametypes.ts";
import '../styles/style.css';

interface Props {
    power: PrizeItem;
    onComplete: (rawScore: number, correct: number, total: number) => void;
}

const POINTS_PER_Q = 100;

export const Round1Screen: FC<Props> = ({ power, onComplete }) => {
    const baseTime = power.name === "Bonus Time" ? 120 : 90;

    // Load ALL questions shuffled — round ends by time, not by question count
    const [questions] = useState<Question[]>(() => shuffle(R1_QUESTIONS));

    const [index,    setIndex]    = useState(0);
    const [score,    setScore]    = useState(0);
    const [correct,  setCorrect]  = useState(0);
    const [passed,   setPassed]   = useState(0);
    const [answered, setAnswered] = useState<number | null>(null);
    const [timer,    setTimer]    = useState(baseTime);
    const [frozen,   setFrozen]   = useState(false);
    const [freezeUsed, setFreezeUsed] = useState(false);

    const doneRef    = useRef(false);
    const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const scoreRef   = useRef(0);
    const correctRef = useRef(0);
    const indexRef   = useRef(0); // track index without stale closure

    const finishRound = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        clearInterval(timerRef.current!);
        onComplete(scoreRef.current, correctRef.current, indexRef.current);
    };

    useEffect(() => {
        if (frozen) return;
        timerRef.current = setInterval(() => {
            setTimer(t => {
                if (t <= 1) { finishRound(); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current!);
    }, [frozen]); // eslint-disable-line react-hooks/exhaustive-deps

    const nextQuestion = () => {
        const next = index + 1;
        if (next >= questions.length) {
            // Ran out of questions — finish
            finishRound();
        } else {
            indexRef.current = next;
            setIndex(next);
        }
    };

    const handleAnswer = (idx: number) => {
        if (answered !== null || doneRef.current) return;
        setAnswered(idx);
        const q = questions[index];
        const isCorrect = idx === q.answer;
        if (isCorrect) {
            scoreRef.current  += POINTS_PER_Q;
            correctRef.current += 1;
            setScore(scoreRef.current);
            setCorrect(correctRef.current);
        }
        setTimeout(() => {
            setAnswered(null);
            nextQuestion();
        }, 700);
    };

    const handlePass = () => {
        if (answered !== null || doneRef.current) return;
        setPassed(p => p + 1);
        nextQuestion();
    };

    const handleFreeze = () => {
        if (freezeUsed) return;
        setFreezeUsed(true);
        setFrozen(true);
        clearInterval(timerRef.current!);
        setTimeout(() => setFrozen(false), 15000);
    };

    const pct = (timer / baseTime) * 100;
    const timerColor = pct > 50 ? "#38ef7d" : pct > 25 ? "#ff9800" : "#e52d27";
    const q = questions[index];
    if (!q) return null;

    return (
        <div className="game-root">
            <div className="game-card">
                <div className="game-header-row">
                    <span className="game-badge">⚡ Round 1 — Quickfire</span>
                    <span className="game-score-badge">🏆 {score}</span>
                </div>

                <div className="game-timer-row">
                    <span>Q {index + 1} · {correct} correct · {passed} passed</span>
                    <span style={{ color: frozen ? "#4dd0e1" : timerColor, fontWeight: 700, fontSize: "0.95rem" }}>
                        {frozen ? "❄️ Frozen!" : `⏱ ${timer}s`}
                    </span>
                </div>
                <div className="game-timer-track">
                    <div className="game-timer-bar" style={{ width: `${pct}%`, background: timerColor }} />
                </div>

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
                    {/* Pass button — always available */}
                    <button
                        className="game-power-btn game-power-btn--pass"
                        disabled={answered !== null}
                        onClick={handlePass}
                    >
                        ⏭ Pass
                    </button>

                    {power.name === "Freeze Frame" && !freezeUsed && (
                        <button className="game-power-btn game-power-btn--freeze" onClick={handleFreeze}>
                            ❄️ Freeze (15s)
                        </button>
                    )}
                </div>

                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", textAlign: "center", marginTop: 8 }}>
                    Each correct answer = {POINTS_PER_Q} pts · Round ends when time runs out
                </p>
            </div>
        </div>
    );
};