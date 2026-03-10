// Round2QuestionScreen.tsx
import { type FC, useEffect, useRef, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { R2_QUESTIONS, CATEGORY_META, shuffle, type Category } from "../types/gametypes.ts";
import '../styles/game.css';

interface Props {
    power:    PrizeItem;
    category: Category;
    r1Score:  number;
    onComplete: (correct: number, total: number) => void;
}

const BASE_TIME_PER_Q = 15;

export const Round2QuestionScreen: FC<Props> = ({ power, category, r1Score, onComplete }) => {
    // ── Power flags ──────────────────────────────────────────────────────────
    const hasBonusTime    = power.name === "Bonus Time";
    const hasTimeTax      = power.name === "Time Tax";
    const hasFreezeFrame  = power.name === "Freeze Frame";
    const hasNoPenalty    = power.name === "No Penalty";
    const hasSecondChance = power.name === "Second Chance";
    const hasQuestionSwap = power.name === "Question Swap";
    const hasBorrowedBrain= power.name === "Borrowed Brain";
    const hasDoublePoints = power.name === "Double Points";

    // Time per question adjusted by power
    const TIME_PER_Q = hasBonusTime ? 25 : hasTimeTax ? 10 : BASE_TIME_PER_Q;
    const POINTS_PER_Q = hasDoublePoints ? 2000 : 1000;
    const swapLimit = 2; // R2 gets 2 swaps

    // ── State ────────────────────────────────────────────────────────────────
    const [questions]   = useState(() => shuffle(R2_QUESTIONS[category] ?? []).slice(0, 5));
    const [index,       setIndex]       = useState(0);
    const [answered,    setAnswered]    = useState<number | null>(null);
    const [swapsLeft,   setSwapsLeft]   = useState(swapLimit);
    const [freezeUsed,  setFreezeUsed]  = useState(false);
    const [freezeActive,setFreezeActive]= useState(false);
    const [scPending,   setScPending]   = useState(false);
    const [scUsed,      setScUsed]      = useState(false);
    const [eliminated,  setEliminated]  = useState<number[]>([]);
    const [brainUsed,   setBrainUsed]   = useState(false);
    const [timeLeft,    setTimeLeft]    = useState(TIME_PER_Q);

    const correctRef = useRef(0);
    const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const lockedRef  = useRef(false);

    // ── Advance ──────────────────────────────────────────────────────────────
    const advance = (c: number) => {
        lockedRef.current = false;
        clearInterval(timerRef.current!);
        const next = index + 1;
        if (next >= questions.length) {
            onComplete(c, questions.length);
        } else {
            setIndex(next);
            setTimeLeft(TIME_PER_Q);
            setAnswered(null);
            setScUsed(false);
            setEliminated([]);
            setBrainUsed(false);
        }
    };

    // ── Per-question countdown ───────────────────────────────────────────────
    useEffect(() => {
        if (freezeActive) return; // paused
        lockedRef.current = false;
        setTimeLeft(TIME_PER_Q);
        clearInterval(timerRef.current!);
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current!);
                    if (!lockedRef.current) {
                        lockedRef.current = true;
                        setAnswered(-1);
                        setTimeout(() => advance(correctRef.current), 900);
                    }
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current!);
    }, [index, freezeActive]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Answer ───────────────────────────────────────────────────────────────
    const handleAnswer = (idx: number) => {
        if (answered !== null || lockedRef.current) return;
        lockedRef.current = true;
        clearInterval(timerRef.current!);
        const q = questions[index];
        const isCorrect = idx === q.answer;

        // No Penalty: wrong answer still advances but doesn't count as wrong
        if (!isCorrect && hasNoPenalty) {
            setAnswered(idx);
            // Show "no penalty" feedback — treated as neutral, not correct
            setTimeout(() => advance(correctRef.current), 900);
            return;
        }

        // Second Chance: first wrong → retry once
        if (!isCorrect && hasSecondChance && !scUsed && !scPending) {
            lockedRef.current = false;
            setAnswered(idx);
            setScPending(true);
            setTimeout(() => {
                setAnswered(null);
                setScPending(false);
                setScUsed(true);
                // restart timer with remaining time or half
                setTimeLeft(t => Math.max(5, Math.floor(t / 2)));
                lockedRef.current = false;
            }, 800);
            return;
        }

        setAnswered(idx);
        if (isCorrect) correctRef.current += 1;
        setTimeout(() => advance(correctRef.current), 900);
    };

    // ── Freeze Frame: pause timer once ───────────────────────────────────────
    const handleFreeze = () => {
        if (freezeUsed || answered !== null) return;
        setFreezeUsed(true);
        setFreezeActive(true);
        clearInterval(timerRef.current!);
        setTimeout(() => setFreezeActive(false), 8000);
    };

    // ── Question Swap ────────────────────────────────────────────────────────
    const handleSwap = () => {
        if (swapsLeft <= 0 || answered !== null || lockedRef.current) return;
        lockedRef.current = true;
        setSwapsLeft(s => s - 1);
        clearInterval(timerRef.current!);
        advance(correctRef.current);
    };

    // ── Borrowed Brain ───────────────────────────────────────────────────────
    const handleBrain = () => {
        if (brainUsed || answered !== null) return;
        const q = questions[index];
        const wrongs = q.options.map((_, i) => i).filter(i => i !== q.answer);
        const toElim: number[] = [];
        while (toElim.length < 2 && wrongs.length > 0)
            toElim.push(wrongs.splice(Math.floor(Math.random() * wrongs.length), 1)[0]);
        setEliminated(toElim);
        setBrainUsed(true);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    const q = questions[index];
    if (!q) return null;
    const cm = CATEGORY_META[category];
    const currentR2Score = correctRef.current * POINTS_PER_Q;
    const timePct = (timeLeft / TIME_PER_Q) * 100;
    const timeColor = timePct > 50 ? "#38ef7d" : timePct > 25 ? "#ff9800" : "#e52d27";

    return (
        <div className="game-root">
            <div className="game-card">
                <div className="game-header-row">
                    <span className="game-badge" style={{ color: cm.color, borderColor: `${cm.color}55`, background: `${cm.color}18` }}>
                        {cm.icon} {category}
                    </span>
                    <span className="game-score-badge">🏆 {r1Score + currentR2Score}</span>
                </div>

                <div className="game-timer-row">
                    <span>Question {index + 1} / {questions.length} · {POINTS_PER_Q.toLocaleString()} pts each</span>
                    <span style={{ color: freezeActive ? "#4dd0e1" : timeColor, fontWeight: 700, fontSize: "0.95rem" }}>
                        {freezeActive ? "❄️ Frozen!" : `⏱ ${timeLeft}s`}
                    </span>
                </div>
                <div className="game-timer-track">
                    <div className="game-timer-bar" style={{ width: `${timePct}%`, background: freezeActive ? "#4dd0e1" : timeColor, transition: "width 1s linear, background 0.3s" }} />
                </div>

                {/* Active power banners */}
                {scPending && (
                    <div className="game-banner game-banner--success">
                        🔄 Wrong — <strong>Second Chance</strong>! Try once more.
                    </div>
                )}
                {freezeActive && (
                    <div className="game-banner game-banner--success">
                        ❄️ <strong>Freeze Frame</strong> — timer paused for 8s!
                    </div>
                )}
                {hasNoPenalty && (
                    <div className="game-banner game-banner--success">
                        🛡️ <strong>No Penalty</strong> active — wrong answers won't cost points.
                    </div>
                )}
                {answered === -1 && (
                    <div className="game-banner game-banner--danger">⏰ Time's up!</div>
                )}

                <div className="game-question">
                    <p>{q.q}</p>
                </div>

                {q.options.map((opt, i) => {
                    const isElim = eliminated.includes(i);
                    let cls = isElim ? "game-option game-option--disabled" : "game-option";
                    if (answered !== null) {
                        if (i === q.answer)      cls = "game-option game-option--correct";
                        else if (i === answered) cls = "game-option game-option--wrong";
                        else                     cls = "game-option game-option--disabled";
                    }
                    return (
                        <button key={i} className={cls}
                                disabled={answered !== null || isElim}
                                onClick={() => handleAnswer(i)}
                                style={isElim ? { opacity: 0.3, textDecoration: "line-through" } : undefined}>
                            {["A","B","C","D"][i]}. {opt}
                        </button>
                    );
                })}

                {answered !== null && answered !== q.answer && answered !== -1 && !scPending && (
                    <div className="r1-correct-hint">
                        ✅ Correct: <strong>{["A","B","C","D"][q.answer]}. {q.options[q.answer]}</strong>
                    </div>
                )}

                <div className="game-power-row">
                    {hasQuestionSwap && swapsLeft > 0 && (
                        <button className="game-power-btn game-power-btn--swap"
                                disabled={answered !== null}
                                onClick={handleSwap}>
                            🔀 Skip ({swapsLeft})
                        </button>
                    )}
                    {hasFreezeFrame && !freezeUsed && (
                        <button className="game-power-btn game-power-btn--freeze"
                                disabled={answered !== null}
                                onClick={handleFreeze}>
                            ❄️ Freeze (8s)
                        </button>
                    )}
                    {hasBorrowedBrain && !brainUsed && (
                        <button className="game-power-btn game-power-btn--hint"
                                disabled={answered !== null}
                                onClick={handleBrain}>
                            🧠 Hint
                        </button>
                    )}
                </div>

                <p className="game-power-note">
                    Power: <strong>{power.name}</strong>
                    {hasBonusTime  && <> · +10s per question</>}
                    {hasTimeTax    && <> · −5s per question</>}
                </p>
            </div>
        </div>
    );
};