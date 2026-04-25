// Round3SpinScreen.tsx — 3 spins, question per spin, accumulate or lose
import { type FC, useEffect, useRef, useState } from "react";
import { R1_QUESTIONS, shuffle, type Question } from "../../types/gametypes.ts";
import { useSoundFX } from "../../hooks/Usesoundfx.ts";
import wheelImg from "../../assets/wheel.png";
import pointerImg from "../../assets/pointer.png";
import '../../styles/Round3SpinScreen.css';

interface Segment {
    label: string;
    points: number;
    multiplier?: number;
}

const SEGMENTS: Segment[] = [
    { label: "★★★",   points: 0    },
    { label: "750",   points: 750  },
    { label: "1,500", points: 1500 },
    { label: "500",   points: 500  },
    { label: "1,000", points: 1000 },
    { label: "750",   points: 750  },
    { label: "2,500", points: 2500 },
    { label: "250",   points: 250  },
    { label: "500",   points: 500  },
    { label: "1,000", points: 1000 },
    { label: "1,500", points: 1500 },
    { label: "2,000", points: 2000 },
    { label: "1,000", points: 250 },
    { label: "250",   points: 1000  },
    { label: "1,000", points: 750 },
    { label: "750",   points: 1000  },
    { label: "1,000", points: 2000 },
    { label: "2,000", points: 500 },
    { label: "500",   points: 1000  },
    { label: "1,000", points: 500 },
];

const TOTAL      = SEGMENTS.length;
const SLICE      = 360 / TOTAL;
const STAR_INDEX = 0;
const START_DEG  = 0;
const MAX_SPINS  = 3;

function snapToCenter(rotDeg: number): number {
    return Math.round(rotDeg / SLICE) * SLICE;
}

function calcFinalRotation(currentRot: number, targetIndex: number): number {
    const fullSpins  = (Math.floor(Math.random() * 5) + 7) * 360;
    const targetCenter = -(targetIndex * SLICE);
    const targetMod  = ((targetCenter % 360) + 360) % 360;
    const currentMod = ((currentRot   % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    if (delta < SLICE * 2) delta += 360;
    return currentRot + fullSpins + delta;
}

function segmentAtTop(rotDeg: number): number {
    const norm = ((rotDeg % 360) + 360) % 360;
    return (TOTAL - Math.round(norm / SLICE) % TOTAL) % TOTAL;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti: FC = () => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const ctx    = canvas.getContext("2d")!;

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const colors = ["#FFD700","#FF6B6B","#6BCB77","#4D96FF","#FF9F1C","#fff","#c77dff"];
        const pieces = Array.from({ length: 160 }, () => ({
            x:  Math.random() * window.innerWidth,
            y: -20 - Math.random() * 300,
            w:  5 + Math.random() * 9,
            h:  9 + Math.random() * 14,
            r:  Math.random() * Math.PI * 2,
            dr: (Math.random() - 0.5) * 0.12,
            dx: (Math.random() - 0.5) * 2.5,
            dy: 2.5 + Math.random() * 4.5,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));

        let id: number;
        let active = true;

        const draw = () => {
            if (!active) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;
                p.r += p.dr;
                // Recycle pieces that fall off the bottom
                if (p.y > canvas.height + 20) {
                    p.y = -20 - Math.random() * 100;
                    p.x = Math.random() * canvas.width;
                }
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 0.9;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            id = requestAnimationFrame(draw);
        };
        id = requestAnimationFrame(draw);

        return () => {
            active = false;
            cancelAnimationFrame(id);
            window.removeEventListener("resize", resize);
        };
    }, []);
    return <canvas ref={ref} className="spin-confetti" />;
};

// ─── Bulb ring ────────────────────────────────────────────────────────────────
const BulbRing: FC<{ spinning: boolean }> = ({ spinning }) => {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), spinning ? 80 : 400);
        return () => clearInterval(id);
    }, [spinning]);
    const count = 24, radius = 260, cx = 260, cy = 260;
    return (
        <svg viewBox="0 0 520 520" className="spin-bulb-ring-svg">
            {Array.from({ length: count }, (_, i) => {
                const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);
                const on = spinning ? (i + tick) % 2 === 0 : (i + tick) % 4 < 2;
                const color = on ? ["#FFD700","#FF6B6B","#6BCB77","#4D96FF"][i % 4] : "#222";
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r={7} fill={color}
                                style={{ filter: on ? `drop-shadow(0 0 6px ${color})` : "none", transition: "fill 0.1s, filter 0.1s" }} />
                        <circle cx={x} cy={y} r={3} fill={on ? "#fff" : "#444"} />
                    </g>
                );
            })}
        </svg>
    );
};

// ─── Question panel shown after each spin ─────────────────────────────────────
interface QuestionPanelProps {
    question:   Question;
    spinPts:    number;
    onCorrect:  () => void;
    onWrong:    () => void;
}

const QuestionPanel: FC<QuestionPanelProps> = ({ question, spinPts, onCorrect, onWrong }) => {
    const { play } = useSoundFX();
    const [answered, setAnswered] = useState<number | null>(null);
    const [timer,    setTimer]    = useState(15);
    const doneRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const resolve = (correct: boolean) => {
        if (doneRef.current) return;
        doneRef.current = true;
        clearInterval(timerRef.current!);
        setTimeout(() => correct ? onCorrect() : onWrong(), 900);
    };

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimer(t => {
                const next = t - 1;
                if (next <= 5 && next > 0) play("tick_urgent");
                if (next <= 0) { play("timeout"); resolve(false); return 0; }
                return next;
            });
        }, 1000);
        return () => clearInterval(timerRef.current!);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAnswer = (idx: number) => {
        if (answered !== null || doneRef.current) return;
        setAnswered(idx);
        const correct = idx === question.answer;
        correct ? play("correct") : play("wrong");
        resolve(correct);
    };

    const pct = (timer / 15) * 100;
    const timerColor = pct > 50 ? "#38ef7d" : pct > 25 ? "#ff9800" : "#e52d27";

    return (
        <div className="spin-question-panel">
            <div className="spin-question-pts-badge">
                Answer correctly to bank <strong style={{ color: "#ffd200" }}>{spinPts.toLocaleString()} pts</strong>
            </div>

            <div className="game-timer-row" style={{ margin: "8px 0 4px" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>Answer fast!</span>
                <span style={{ color: timerColor, fontWeight: 700 }}>⏱ {timer}s</span>
            </div>
            <div className="game-timer-track">
                <div className="game-timer-bar" style={{ width: `${pct}%`, background: timerColor }} />
            </div>

            <div className="game-question" style={{ height: 100, minHeight: 100, maxHeight: 100, overflow: 'hidden', flexShrink: 0 }}><p>{question.q}</p></div>

            {question.options.map((opt, i) => {
                let cls = "game-option";
                if (answered !== null) {
                    if (i === question.answer)   cls = "game-option game-option--correct";
                    else if (i === answered)     cls = "game-option game-option--wrong";
                    else                         cls = "game-option game-option--disabled";
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

            {answered !== null && answered !== question.answer && (
                <div className="r1-correct-hint">
                    ✅ Correct: <strong>{["A","B","C","D"][question.answer]}. {question.options[question.answer]}</strong>
                </div>
            )}
        </div>
    );
};

// ─── Decision panel: stop or risk next spin ───────────────────────────────────
interface DecisionProps {
    spinNum:    number;    // which spin just completed (1 or 2)
    banked:     number;   // total pts banked so far
    onStop:     () => void;
    onContinue: () => void;
}

const DecisionPanel: FC<DecisionProps> = ({ spinNum, banked, onStop, onContinue }) => (
    <div className="spin-decision-panel">
        <div className="spin-decision-title">🎯 Spin {spinNum} Complete!</div>
        <div className="spin-decision-banked">
            You have <span style={{ color: "#ffd200", fontWeight: 800 }}>{banked.toLocaleString()} pts</span> banked
        </div>
        <p className="spin-decision-sub">Do you want to risk it for Spin {spinNum + 1}?</p>
        <div className="spin-decision-btns">
            <button className="spin-decision-btn spin-decision-btn--stop" onClick={onStop}>
                🛑 Stop &amp; Keep {banked.toLocaleString()} pts
            </button>
            <button className="spin-decision-btn spin-decision-btn--risk" onClick={onContinue}>
                🎰 Risk It — Spin {spinNum + 1}
            </button>
        </div>
        <p className="spin-decision-warn">⚠️ Wrong answer = lose ALL Round 3 points</p>
    </div>
);

// ─── Lost panel ───────────────────────────────────────────────────────────────
const LostPanel: FC<{ onDone: () => void }> = ({ onDone }) => {
    useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className="spin-decision-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>💥</div>
            <div className="spin-decision-title" style={{ color: "#e52d27" }}>Wrong Answer!</div>
            <p className="spin-decision-sub">All Round 3 points lost. Better luck next time!</p>
        </div>
    );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
type Phase = "spin" | "question" | "decide" | "lost" | "done";

interface Props { currentScore: number; onComplete: (r3Score: number) => void; }

export const Round3SpinScreen: FC<Props> = ({ currentScore, onComplete }) => {
    const { play, stop } = useSoundFX();

    // One shuffled question pool — draw one per spin
    const [questions]    = useState<Question[]>(() => shuffle(R1_QUESTIONS));
    const questionRef    = useRef(0); // index into questions

    const rotRef         = useRef(START_DEG);
    const angleRef       = useRef(START_DEG * Math.PI / 180);
    const animFrameRef   = useRef(0);
    const canvasRef      = useRef<HTMLCanvasElement>(null);
    const imgRef         = useRef<HTMLImageElement | null>(null);

    const [phase,        setPhase]        = useState<Phase>("spin");
    const [spinning,     setSpinning]     = useState(false);
    const [spinNum,      setSpinNum]      = useState(1);          // 1, 2, 3
    const [spinPts,      setSpinPts]      = useState(0);          // pts from current spin
    const [banked,       setBanked]       = useState(0);          // accumulated correct pts
    const [showConfetti, setShowConfetti] = useState(false);
    const [currentSeg,   setCurrentSeg]  = useState<Segment | null>(null);

    const drawFrame = (angleRad: number) => {
        const canvas = canvasRef.current;
        const img    = imgRef.current;
        if (!canvas || !img) return;
        const ctx = canvas.getContext("2d")!;
        const S   = 800;
        ctx.clearRect(0, 0, S, S);
        ctx.save();
        ctx.beginPath();
        ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(S / 2, S / 2);
        ctx.rotate(angleRad);
        ctx.drawImage(img, -S / 2, -S / 2, S, S);
        ctx.restore();
    };

    useEffect(() => {
        const img = new Image();
        img.src = wheelImg;
        img.onload = () => { imgRef.current = img; drawFrame(angleRef.current); };
    }, []);

    useEffect(() => {
        if (phase === "spin") {
            drawFrame(angleRef.current);
        }
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => {
        cancelAnimationFrame(animFrameRef.current);
        stop("spin");
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const doSpin = () => {
        if (spinning) return;

        let target = Math.floor(Math.random() * TOTAL);
        while (target === STAR_INDEX) target = Math.floor(Math.random() * TOTAL);

        const finalRotDeg  = calcFinalRotation(rotRef.current, target);
        const snappedFinal = snapToCenter(finalRotDeg);
        const startDeg     = rotRef.current;
        const deltaDeg     = snappedFinal - startDeg;

        setSpinning(true);
        play("spin", 1, true);

        const duration  = 5000;
        const startTime = performance.now();

        const animate = (now: number) => {
            const p     = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            const curDeg = startDeg + deltaDeg * eased;
            angleRef.current = curDeg * Math.PI / 180;
            drawFrame(angleRef.current);

            if (p < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
            } else {
                rotRef.current   = snappedFinal;
                angleRef.current = snappedFinal * Math.PI / 180;
                drawFrame(angleRef.current);
                stop("spin");

                const idx = segmentAtTop(snappedFinal);
                const seg = SEGMENTS[idx];
                // Resolve multiplier against current total score + banked so far
                const pts = seg.multiplier
                    ? (currentScore + banked) * seg.multiplier
                    : seg.points;

                setCurrentSeg(seg);
                setSpinPts(pts);
                setSpinning(false);
                setPhase("question");
            }
        };
        animFrameRef.current = requestAnimationFrame(animate);
    };

    const handleCorrect = () => {
        const newBanked = banked + spinPts;
        setBanked(newBanked);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);

        if (spinNum >= MAX_SPINS) {
            // All 3 spins done — keep everything
            setPhase("done");
            setTimeout(() => onComplete(newBanked), 1500);
        } else {
            setPhase("decide");
        }
    };

    const handleWrong = () => {
        setPhase("lost");
    };

    const handleStop = () => {
        onComplete(banked);
    };

    const handleContinue = () => {
        questionRef.current += 1;
        setSpinNum(n => n + 1);
        setPhase("spin");
    };

    const handleLostDone = () => {
        onComplete(0);
    };

    const currentQuestion = questions[questionRef.current] ?? questions[0];

    return (
        <div className="spin-root">
            {showConfetti && <Confetti />}

            <div className="spin-spotlights">
                <div className="spin-spotlight spin-spotlight-1" />
                <div className="spin-spotlight spin-spotlight-2" />
                <div className="spin-spotlight spin-spotlight-3" />
            </div>
            <div className="spin-stage-glow" />

            <div className="spin-content">
                <div className="spin-header">
                    <div className="spin-badge">
                        <span className="spin-badge-dot" />
                        <span className="spin-badge-text">Round 3 · Risk Spins · Spin {spinNum}/{MAX_SPINS}</span>
                    </div>
                    <h2 className="spin-title">Spin the Wheel!</h2>
                    <p className="spin-subtitle">
                        {phase === "spin"     && `Spin ${spinNum} — answer correctly to bank points`}
                        {phase === "question" && `🎯 ${(currentSeg?.label ?? "")} up for grabs — answer now!`}
                        {phase === "decide"   && "Stop safely or risk another spin?"}
                        {phase === "lost"     && "Round 3 points lost!"}
                        {phase === "done"     && "All 3 spins complete — well done!"}
                    </p>
                </div>

                <div className="spin-score-pill">
                    <span className="spin-score-label">Score so far</span>
                    <span className="spin-score-value">{currentScore.toLocaleString()}</span>
                    {banked > 0 && (
                        <span className="spin-score-label" style={{ marginLeft: 12 }}>
                            + <span style={{ color: "#38ef7d", fontWeight: 700 }}>{banked.toLocaleString()}</span> banked
                        </span>
                    )}
                </div>

                {/* Wheel — always mounted, hidden during question/decide/lost/done */}
                <div className="spin-wheel-wrap" style={{ display: phase === "spin" ? undefined : "none" }}>
                    <div className={`spin-glow-ring${spinning ? " is-spinning" : ""}`} />
                    <div className="spin-bulb-ring-wrap">
                        <BulbRing spinning={spinning} />
                        <div className="spin-inner">
                            <img src={pointerImg} alt="pointer" className="spin-pointer" />
                            <canvas ref={canvasRef} width={800} height={800}
                                    className={`spin-wheel-canvas${spinning ? " is-spinning" : ""}`} />
                        </div>
                    </div>
                </div>

                {/* Phase panels below the wheel */}
                <div className="spin-action">
                    {phase === "spin" && !spinning && (
                        <div className="spin-btn-wrap">
                            <button className="spin-btn" onClick={doSpin}>
                                <span className="spin-btn-shine" />
                                🎡 SPIN {spinNum}
                            </button>
                        </div>
                    )}

                    {phase === "spin" && spinning && (
                        <div className="spin-spinning-state">
                            <div className="spin-spinning-text">Spinning…</div>
                            <div className="spin-dots">
                                <div className="spin-dot" />
                                <div className="spin-dot" />
                                <div className="spin-dot" />
                            </div>
                        </div>
                    )}

                    {phase === "question" && currentQuestion && (
                        <QuestionPanel
                            question={currentQuestion}
                            spinPts={spinPts}
                            onCorrect={handleCorrect}
                            onWrong={handleWrong}
                        />
                    )}

                    {phase === "decide" && (
                        <DecisionPanel
                            spinNum={spinNum}
                            banked={banked}
                            onStop={handleStop}
                            onContinue={handleContinue}
                        />
                    )}

                    {phase === "lost" && (
                        <LostPanel onDone={handleLostDone} />
                    )}

                    {phase === "done" && (
                        <div className="spin-decision-panel" style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🏆</div>
                            <div className="spin-decision-title" style={{ color: "#38ef7d" }}>All Spins Complete!</div>
                            <div className="spin-decision-banked">
                                You earned <span style={{ color: "#ffd200", fontWeight: 800 }}>{banked.toLocaleString()} pts</span> in Round 3!
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
