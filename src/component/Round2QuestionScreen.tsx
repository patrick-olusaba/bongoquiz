// Round2QuestionScreen.tsx — 40s total timer, random mixed categories, +500/−250
import { type FC, useEffect, useRef, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { R2_QUESTIONS, CATEGORIES, CATEGORY_META, shuffle, type Category } from "../types/gametypes.ts";
import { useSoundFX } from "../hooks/Usesoundfx.ts";
import '../styles/game.css';

interface Props {
    power:   PrizeItem;
    r1Score: number;
    onComplete: (rawScore: number, correct: number, total: number) => void;
}

const POINTS_CORRECT = 500;
const POINTS_WRONG   = -250;
const POINTS_PASS    = -250;
const TOTAL_TIME     = 40;

// Mix ALL category questions into one pool and shuffle
function buildQuestionPool() {
    const all: { q: string; options: string[]; answer: number; category: Category }[] = [];
    for (const cat of CATEGORIES) {
        for (const q of (R2_QUESTIONS[cat] ?? [])) {
            all.push({ ...q, category: cat });
        }
    }
    return shuffle(all);
}

export const Round2QuestionScreen: FC<Props> = ({ power, r1Score, onComplete }) => {
    const { play } = useSoundFX();

    const hasNoPenalty    = power.name === "No Penalty";
    const hasSecondChance = power.name === "Second Chance";
    const hasBorrowedBrain= power.name === "Borrowed Brain";
    const hasQuestionSwap = power.name === "Question Swap";
    const hasFreezeFrame  = power.name === "Freeze Frame";
    const hasDoublePoints = power.name === "Double Points";
    const hasBonusTime    = power.name === "Bonus Time";
    const hasTimeTax      = power.name === "Time Tax";

    const baseTime   = hasBonusTime ? 55 : hasTimeTax ? 28 : TOTAL_TIME;
    const ptsCorrect = hasDoublePoints ? POINTS_CORRECT * 2 : POINTS_CORRECT;
    const ptsWrong   = hasNoPenalty ? 0 : POINTS_WRONG;
    const ptsPass    = hasNoPenalty ? 0 : POINTS_PASS;
    const swapLimit  = 2;

    const [questions]    = useState(() => buildQuestionPool());
    const [index,        setIndex]        = useState(0);
    const [score,        setScore]        = useState(0);
    const [correct,      setCorrect]      = useState(0);
    const [total,        setTotal]        = useState(0);
    const [answered,     setAnswered]     = useState<number | null>(null);
    const [timer,        setTimer]        = useState(baseTime);
    const [frozen,       setFrozen]       = useState(false);
    const [freezeUsed,   setFreezeUsed]   = useState(false);
    const [swapsLeft,    setSwapsLeft]    = useState(swapLimit);
    const [scPending,    setScPending]    = useState(false);
    const [scUsed,       setScUsed]       = useState(false);
    const [eliminated,   setEliminated]   = useState<number[]>([]);
    const [brainUsed,    setBrainUsed]    = useState(false);

    const doneRef    = useRef(false);
    const scoreRef   = useRef(0);
    const correctRef = useRef(0);
    const totalRef   = useRef(0);
    const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

    const finishRound = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        clearInterval(timerRef.current!);
        onComplete(scoreRef.current, correctRef.current, totalRef.current);
    };

    // Single countdown for entire round (like R1)
    useEffect(() => {
        if (frozen) return;
        timerRef.current = setInterval(() => {
            setTimer(t => {
                const next = t - 1;
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
        setAnswered(null);
        setEliminated([]);
        setBrainUsed(false);
        setScUsed(false);
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
        setTotal(totalRef.current);

        if (isCorrect) {
            play("correct");
            scoreRef.current   += ptsCorrect;
            correctRef.current += 1;
            setScore(scoreRef.current);
            setCorrect(correctRef.current);
        } else {
            play("wrong");
            scoreRef.current += ptsWrong;
            setScore(scoreRef.current);
        }

        setTimeout(() => nextQuestion(), 700);
    };

    const handlePass = () => {
        if (answered !== null || doneRef.current) return;
        scoreRef.current += ptsPass;
        totalRef.current += 1;
        setScore(scoreRef.current);
        setTotal(totalRef.current);
        nextQuestion();
    };

    const handleFreeze = () => {
        if (freezeUsed) return;
        setFreezeUsed(true);
        setFrozen(true);
        clearInterval(timerRef.current!);
        setTimeout(() => setFrozen(false), 10000);
    };

    const handleSwap = () => {
        if (swapsLeft <= 0 || answered !== null || doneRef.current) return;
        setSwapsLeft(s => s - 1);
        scoreRef.current += ptsPass;
        totalRef.current += 1;
        setScore(scoreRef.current);
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

    const q = questions[index];
    if (!q) return null;

    const pct = (timer / baseTime) * 100;
    const timerColor = pct > 50 ? "#38ef7d" : pct > 25 ? "#ff9800" : "#e52d27";
    const cm = CATEGORY_META[q.category];

    return (
        <div className="game-root">
            <div className="game-card">
                <div className="game-header-row">
                    <span className="game-badge" style={{ color: cm.color, borderColor: `${cm.color}55`, background: `${cm.color}18` }}>
                        {cm.icon} {q.category}
                    </span>
                    <span className="game-score-badge">🏆 {r1Score + score}</span>
                </div>

                <div className="game-timer-row">
                    <span>Q {index + 1} · {correct} ✓ · {total - correct} ✗</span>
                    <span style={{ color: frozen ? "#4dd0e1" : timerColor, fontWeight: 700, fontSize: "0.95rem" }}>
                        {frozen ? "❄️ Frozen!" : `⏱ ${timer}s`}
                    </span>
                </div>
                <div className="game-timer-track">
                    <div className="game-timer-bar" style={{ width: `${pct}%`, background: timerColor }} />
                </div>

                {scPending && (
                    <div className="game-banner game-banner--success">
                        🔄 Wrong — <strong>Second Chance</strong>! Try once more.
                    </div>
                )}
                {freezeUsed && frozen && (
                    <div className="game-banner game-banner--success">
                        ❄️ <strong>Freeze Frame</strong> — timer paused for 10s!
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
                        <button className="game-power-btn game-power-btn--freeze"
                                disabled={answered !== null} onClick={handleFreeze}>❄️ Freeze (10s)</button>
                    )}
                    {hasQuestionSwap && swapsLeft > 0 && (
                        <button className="game-power-btn game-power-btn--swap"
                                disabled={answered !== null} onClick={handleSwap}>🔀 Skip ({swapsLeft})</button>
                    )}
                    {hasBorrowedBrain && !brainUsed && (
                        <button className="game-power-btn game-power-btn--hint"
                                disabled={answered !== null} onClick={handleBrain}>🧠 Hint</button>
                    )}
                </div>

                <p className="game-power-note">
                    ✓ +{ptsCorrect} · ✗ {ptsWrong} · Pass {ptsPass} · 40s round
                </p>
            </div>
        </div>
    );
};