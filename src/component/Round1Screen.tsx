// Round1Screen.tsx
import { type FC, useEffect, useRef, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { R1_QUESTIONS, shuffle, type Question } from "../types/gametypes.ts";
import { useSoundFX } from "../hooks/Usesoundfx.ts";
import '../styles/game.css';

interface Props {
    power: PrizeItem;
    onComplete: (rawScore: number, correct: number, total: number, timeLeft: number, maxStreak: number) => void;
}

const POINTS_CORRECT = 100;
const POINTS_WRONG   = -50;   // penalty for wrong answer
const POINTS_PASS    = -50;   // penalty for passing

export const Round1Screen: FC<Props> = ({ power, onComplete }) => {
    const { play } = useSoundFX();

    const hasBonusTime    = power.name === "Bonus Time";
    const hasTimeTax      = power.name === "Time Tax";
    const hasFreezeFrame  = power.name === "Freeze Frame";
    const hasNoPenalty    = power.name === "No Penalty";
    const hasSecondChance = power.name === "Second Chance";
    const hasQuestionSwap = power.name === "Question Swap";
    const hasBorrowedBrain= power.name === "Borrowed Brain";

    const baseTime = hasBonusTime ? 105 : hasTimeTax ? 55 : 75;
    const swapLimit = 3;

    const [questions]   = useState<Question[]>(() => shuffle(R1_QUESTIONS));
    const [index,       setIndex]       = useState(0);
    const [score,       setScore]       = useState(0);
    const [correct,     setCorrect]     = useState(0);
    const [wrong,       setWrong]       = useState(0);
    const [passed,      setPassed]      = useState(0);
    const [answered,    setAnswered]    = useState<number | null>(null);
    const [timer,       setTimer]       = useState(baseTime);
    const [frozen,      setFrozen]      = useState(false);
    const [freezeUsed,  setFreezeUsed]  = useState(false);
    const [swapsLeft,   setSwapsLeft]   = useState(swapLimit);
    const [streak,      setStreak]      = useState(0);
    const [streakFlash, setStreakFlash] = useState(false);
    const [comboFlash,  setComboFlash]  = useState(false);
    const [scPending,   setScPending]   = useState(false);
    const [scUsed,      setScUsed]      = useState(false);
    const [eliminated,  setEliminated]  = useState<number[]>([]);
    const [brainUsed,   setBrainUsed]   = useState(false);

    const doneRef      = useRef(false);
    const maxStreakRef  = useRef(0);
    const timeLeftRef  = useRef(baseTime);
    const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
    const scoreRef     = useRef(0);
    const correctRef   = useRef(0);
    const totalRef     = useRef(0);  // questions attempted
    const streakRef    = useRef(0);

    const finishRound = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        clearInterval(timerRef.current!);
        onComplete(scoreRef.current, correctRef.current, totalRef.current, timeLeftRef.current, maxStreakRef.current);
    };

    useEffect(() => {
        if (frozen) return;
        timerRef.current = setInterval(() => {
            setTimer(t => {
                const next = t - 1;
                timeLeftRef.current = next;
                if (next > 0) {
                    if (next <= 5)       play("tick_urgent");
                    else if (next <= 10) play("tick");
                }
                if (next <= 0) { play("timeout"); finishRound(); return 0; }
                return next;
            });
        }, 1000);
        return () => clearInterval(timerRef.current!);
    }, [frozen]); // eslint-disable-line react-hooks/exhaustive-deps

    const nextQuestion = () => {
        const next = index + 1;
        if (next >= questions.length) { finishRound(); return; }
        setIndex(next);
        setEliminated([]);
        setBrainUsed(false);
    };

    const handleAnswer = (idx: number) => {
        if (answered !== null || doneRef.current) return;
        const q = questions[index];
        const isCorrect = idx === q.answer;

        if (!isCorrect && hasSecondChance && !scUsed && !scPending) {
            play("wrong");
            setAnswered(idx);
            setScPending(true);
            setTimeout(() => { setAnswered(null); setScPending(false); setScUsed(true); }, 800);
            return;
        }

        setAnswered(idx);
        totalRef.current += 1;

        if (isCorrect) {
            play("correct");
            scoreRef.current   += POINTS_CORRECT;
            correctRef.current += 1;
            streakRef.current  += 1;
            if (streakRef.current > maxStreakRef.current) maxStreakRef.current = streakRef.current;
            setScore(scoreRef.current);
            setCorrect(correctRef.current);
            setStreak(streakRef.current);
            if (streakRef.current >= 3) {
                play("streak");
                setStreakFlash(true);
                setTimeout(() => setStreakFlash(false), 600);
            }
            if (streakRef.current > 0 && streakRef.current % 5 === 0) {
                play("combo");
                setComboFlash(true);
                setTimeout(() => setComboFlash(false), 900);
            }
        } else {
            play("wrong");
            if (!hasNoPenalty) {
                scoreRef.current += POINTS_WRONG;
                setScore(scoreRef.current);
                setWrong(w => w + 1);
                streakRef.current = 0;
                setStreak(0);
            }
        }

        setScUsed(false);
        setTimeout(() => { setAnswered(null); nextQuestion(); }, 700);
    };

    const handlePass = () => {
        if (answered !== null || doneRef.current) return;
        if (!hasNoPenalty) {
            scoreRef.current += POINTS_PASS;
            setScore(scoreRef.current);
        }
        totalRef.current += 1;
        streakRef.current = 0;
        setStreak(0);
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

    const handleSwap = () => {
        if (swapsLeft <= 0 || answered !== null || doneRef.current) return;
        setSwapsLeft(s => s - 1);
        if (!hasNoPenalty) { scoreRef.current += POINTS_PASS; setScore(scoreRef.current); }
        totalRef.current += 1;
        streakRef.current = 0;
        setStreak(0);
        nextQuestion();
    };

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

    const pct = (timer / baseTime) * 100;
    const timerColor = pct > 50 ? "#38ef7d" : pct > 25 ? "#ff9800" : "#e52d27";
    const q = questions[index];
    if (!q) return null;

    return (
        <div className="game-root">
            {comboFlash && <div className="r1-combo-flash">🔥 {streakRef.current} IN A ROW!</div>}
            <div className="game-card">
                <div className="game-header-row">
                    <span className="game-badge">⚡ Round 1 — Quickfire</span>
                    <span className="game-score-badge">🏆 {score}</span>
                </div>

                <div className="game-timer-row">
                    <span>Q {index + 1} · {correct} ✓ · {wrong} ✗ · {passed} passed</span>
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
                {scPending && (
                    <div className="game-banner game-banner--success">
                        🔄 Wrong — <strong>Second Chance</strong>! Try once more.
                    </div>
                )}
                {hasNoPenalty && (
                    <div className="game-banner game-banner--success">
                        🛡️ <strong>No Penalty</strong> — no deductions for wrong answers or passes!
                    </div>
                )}

                <div className="game-question" style={{ height: 100, minHeight: 100, maxHeight: 100, overflow: 'hidden', flexShrink: 0 }}><p>{q.q}</p></div>

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
                                data-label={["A","B","C","D"][i]}
                                style={{ animation: `optionIn 0.25s ease ${i * 0.06}s both`, ...(isElim ? { opacity: 0.3, textDecoration: "line-through" } : {}) }}
                                onClick={() => handleAnswer(i)}>
                            {opt}
                        </button>
                    );
                })}

                {answered !== null && answered !== q.answer && !scPending && (
                    <div className="r1-correct-hint">
                        ✅ Correct: <strong>{["A","B","C","D"][q.answer]}. {q.options[q.answer]}</strong>
                    </div>
                )}

                <div className="game-power-row">
                    <button className="game-power-btn game-power-btn--pass"
                            disabled={answered !== null} onClick={handlePass}>
                        ⏭ Pass {!hasNoPenalty && <span style={{ opacity: 0.7, fontSize: "0.8em" }}>({POINTS_PASS})</span>}
                    </button>
                    {hasFreezeFrame && !freezeUsed && (
                        <button className="game-power-btn game-power-btn--freeze" onClick={handleFreeze}>❄️ Freeze (15s)</button>
                    )}
                    {hasQuestionSwap && swapsLeft > 0 && (
                        <button className="game-power-btn game-power-btn--swap"
                                disabled={answered !== null} onClick={handleSwap}>🔀 Swap ({swapsLeft})</button>
                    )}
                    {hasBorrowedBrain && !brainUsed && (
                        <button className="game-power-btn game-power-btn--hint"
                                disabled={answered !== null} onClick={handleBrain}>🧠 Hint</button>
                    )}
                </div>

                <p className="game-power-note">
                    ✓ +{POINTS_CORRECT} · ✗ {POINTS_WRONG} · Pass {POINTS_PASS} · 75s round
                    {hasBonusTime && <> · <strong>+30s Bonus Time</strong></>}
                    {hasTimeTax   && <> · <strong>Time Tax: −20s</strong></>}
                </p>
            </div>
        </div>
    );
};