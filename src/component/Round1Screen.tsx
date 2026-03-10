// Round1Screen.tsx
import { type FC, useEffect, useRef, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { R1_QUESTIONS, shuffle, type Question } from "../types/gametypes.ts";
import '../styles/game.css';

interface Props {
    power: PrizeItem;
    onComplete: (rawScore: number, correct: number, total: number, timeLeft: number, maxStreak: number) => void;
}

const POINTS_PER_Q = 100;

export const Round1Screen: FC<Props> = ({ power, onComplete }) => {
    // ── Power flags ──────────────────────────────────────────────────────────
    const hasBonusTime    = power.name === "Bonus Time";
    const hasTimeTax      = power.name === "Time Tax";
    const hasFreezeFrame  = power.name === "Freeze Frame";
    const hasNoPenalty    = power.name === "No Penalty";
    const hasSecondChance = power.name === "Second Chance";
    const hasQuestionSwap = power.name === "Question Swap";
    const hasBorrowedBrain= power.name === "Borrowed Brain";

    const baseTime = hasBonusTime ? 120 : hasTimeTax ? 70 : 90;
    const swapLimit = 3; // R1 gets 3 swaps

    // ── State ────────────────────────────────────────────────────────────────
    const [questions]   = useState<Question[]>(() => shuffle(R1_QUESTIONS));
    const [index,       setIndex]       = useState(0);
    const [score,       setScore]       = useState(0);
    const [correct,     setCorrect]     = useState(0);
    const [passed,      setPassed]      = useState(0);
    const [answered,    setAnswered]    = useState<number | null>(null);
    const [timer,       setTimer]       = useState(baseTime);
    const [frozen,      setFrozen]      = useState(false);
    const [freezeUsed,  setFreezeUsed]  = useState(false);
    const [swapsLeft,   setSwapsLeft]   = useState(swapLimit);
    const [streak,      setStreak]      = useState(0);
    const [streakFlash, setStreakFlash] = useState(false);
    const [comboFlash,  setComboFlash]  = useState(false);
    // Second chance: show "wrong — try again" state
    const [scPending,   setScPending]   = useState(false);
    const [scUsed,      setScUsed]      = useState(false);
    // Borrowed Brain: which wrong options are eliminated
    const [eliminated,  setEliminated]  = useState<number[]>([]);
    const [brainUsed,   setBrainUsed]   = useState(false);

    // ── Refs (avoid stale closures in timer callback) ────────────────────────
    const doneRef      = useRef(false);
    const maxStreakRef  = useRef(0);
    const timeLeftRef  = useRef(baseTime);
    const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
    const scoreRef     = useRef(0);
    const correctRef   = useRef(0);
    const indexRef     = useRef(0);
    const streakRef    = useRef(0);

    // ── Finish ───────────────────────────────────────────────────────────────
    const finishRound = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        clearInterval(timerRef.current!);
        onComplete(scoreRef.current, correctRef.current, indexRef.current, timeLeftRef.current, maxStreakRef.current);
    };

    // ── Timer ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (frozen) return;
        timerRef.current = setInterval(() => {
            setTimer(t => {
                const next = t - 1;
                timeLeftRef.current = next;
                if (next <= 0) { finishRound(); return 0; }
                return next;
            });
        }, 1000);
        return () => clearInterval(timerRef.current!);
    }, [frozen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Navigation ───────────────────────────────────────────────────────────
    const nextQuestion = () => {
        const next = index + 1;
        if (next >= questions.length) { finishRound(); return; }
        indexRef.current = next;
        setIndex(next);
        setEliminated([]);   // reset brain elimination per question
        setBrainUsed(false);
    };

    // ── Answer ───────────────────────────────────────────────────────────────
    const handleAnswer = (idx: number) => {
        if (answered !== null || doneRef.current) return;
        const q = questions[index];
        const isCorrect = idx === q.answer;

        // Second Chance: first wrong answer → show feedback, allow retry once
        if (!isCorrect && hasSecondChance && !scUsed && !scPending) {
            setAnswered(idx);
            setScPending(true);
            setTimeout(() => {
                setAnswered(null);
                setScPending(false);
                setScUsed(true);
            }, 800);
            return;
        }

        setAnswered(idx);

        if (isCorrect) {
            scoreRef.current   += POINTS_PER_Q;
            correctRef.current += 1;
            streakRef.current  += 1;
            if (streakRef.current > maxStreakRef.current) maxStreakRef.current = streakRef.current;
            setScore(scoreRef.current);
            setCorrect(correctRef.current);
            setStreak(streakRef.current);
            if (streakRef.current >= 3) {
                setStreakFlash(true);
                setTimeout(() => setStreakFlash(false), 600);
            }
            if (streakRef.current > 0 && streakRef.current % 5 === 0) {
                setComboFlash(true);
                setTimeout(() => setComboFlash(false), 900);
            }
        } else {
            // No Penalty: wrong answer doesn't break streak
            if (!hasNoPenalty) {
                streakRef.current = 0;
                setStreak(0);
            }
        }

        setScUsed(false);
        setTimeout(() => { setAnswered(null); nextQuestion(); }, 700);
    };

    // ── Pass ─────────────────────────────────────────────────────────────────
    const handlePass = () => {
        if (answered !== null || doneRef.current) return;
        streakRef.current = 0;
        setStreak(0);
        setPassed(p => p + 1);
        nextQuestion();
    };

    // ── Freeze Frame ─────────────────────────────────────────────────────────
    const handleFreeze = () => {
        if (freezeUsed) return;
        setFreezeUsed(true);
        setFrozen(true);
        clearInterval(timerRef.current!);
        setTimeout(() => setFrozen(false), 15000);
    };

    // ── Question Swap ────────────────────────────────────────────────────────
    const handleSwap = () => {
        if (swapsLeft <= 0 || answered !== null || doneRef.current) return;
        setSwapsLeft(s => s - 1);
        streakRef.current = 0;
        setStreak(0);
        nextQuestion();
    };

    // ── Borrowed Brain: eliminate 2 wrong options ────────────────────────────
    const handleBrain = () => {
        if (brainUsed || answered !== null) return;
        const q = questions[index];
        const wrongs = q.options
            .map((_, i) => i)
            .filter(i => i !== q.answer);
        // pick 2 random wrong options to eliminate
        const toElim: number[] = [];
        while (toElim.length < 2 && wrongs.length > 0) {
            const pick = wrongs.splice(Math.floor(Math.random() * wrongs.length), 1)[0];
            toElim.push(pick);
        }
        setEliminated(toElim);
        setBrainUsed(true);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    const pct = (timer / baseTime) * 100;
    const timerColor = pct > 50 ? "#38ef7d" : pct > 25 ? "#ff9800" : "#e52d27";
    const q = questions[index];
    if (!q) return null;

    return (
        <div className="game-root">
            {comboFlash && (
                <div className="r1-combo-flash">🔥 {streakRef.current} IN A ROW!</div>
            )}
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

                {streak >= 3 && (
                    <div className={`r1-streak-bar ${streakFlash ? "r1-streak-bar--flash" : ""}`}>
                        🔥 {streak} answer streak!
                    </div>
                )}

                {/* Active power banners */}
                {scPending && (
                    <div className="game-banner game-banner--success">
                        🔄 Wrong — <strong>Second Chance</strong>! Try once more.
                    </div>
                )}
                {hasNoPenalty && (
                    <div className="game-banner game-banner--success">
                        🛡️ <strong>No Penalty</strong> — wrong answers won't break your streak!
                    </div>
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
                        <button
                            key={i} className={cls}
                            disabled={answered !== null || isElim}
                            onClick={() => handleAnswer(i)}
                            style={isElim ? { opacity: 0.3, textDecoration: "line-through" } : undefined}
                        >
                            {["A","B","C","D"][i]}. {opt}
                        </button>
                    );
                })}

                {answered !== null && answered !== q.answer && !scPending && (
                    <div className="r1-correct-hint">
                        ✅ Correct answer: <strong>{["A","B","C","D"][q.answer]}. {q.options[q.answer]}</strong>
                    </div>
                )}

                <div className="game-power-row">
                    <button
                        className="game-power-btn game-power-btn--pass"
                        disabled={answered !== null}
                        onClick={handlePass}
                    >
                        ⏭ Pass
                    </button>

                    {hasFreezeFrame && !freezeUsed && (
                        <button className="game-power-btn game-power-btn--freeze" onClick={handleFreeze}>
                            ❄️ Freeze (15s)
                        </button>
                    )}

                    {hasQuestionSwap && swapsLeft > 0 && (
                        <button className="game-power-btn game-power-btn--swap"
                                disabled={answered !== null}
                                onClick={handleSwap}>
                            🔀 Swap ({swapsLeft})
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
                    Each correct answer = {POINTS_PER_Q} pts · Round ends when time runs out
                    {hasBonusTime  && <> · <strong>+30s Bonus Time active</strong></>}
                    {hasTimeTax    && <> · <strong>Time Tax: −20s</strong></>}
                </p>
            </div>
        </div>
    );
};