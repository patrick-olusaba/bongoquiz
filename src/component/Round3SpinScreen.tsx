// Round3SpinScreen.tsx
import { type FC, useEffect, useRef, useState } from "react";
import type { WheelSegment } from "../types/gametypes.ts";
import wheelImg from "../assets/bongo.png";
import '../styles/Round3SpinScreen.css';

interface Segment {
    label: string;
    points: number;
    multiplier?: number;
    special?: string;
}

const SEGMENTS: Segment[] = [
    { label: "250",              points: 250   },
    { label: "★★★",              points: 0     },
    { label: "3,000",            points: 3000  },
    { label: "×3",               points: 0, multiplier: 3 },
    { label: "7,500",            points: 7500  },
    { label: "2,000",            points: 2000  },
    { label: "250",              points: 250   },
    { label: "25,000",           points: 25000 },
    { label: "1,000",            points: 1000  },
    { label: "500",              points: 500   },
    { label: "+Bonus Free Spin", points: 0, special: "bonus_spin" },
    { label: "15,000",           points: 15000 },
    { label: "2,500",            points: 2500  },
    { label: "250",              points: 250   },
    { label: "Double Up",        points: 0, multiplier: 2 },
    { label: "500",              points: 500   },
    { label: "5,000",            points: 5000  },
    { label: "500",              points: 500   },
    { label: "10,000",           points: 10000 },
    { label: "1,000",            points: 1000  },
];

const TOTAL      = SEGMENTS.length;
const SLICE      = 360 / TOTAL;
const STAR_INDEX = 1;

const START_DEG = -(STAR_INDEX * SLICE + SLICE / 2);

function calcFinalRotation(currentRot: number, targetIndex: number): number {
    const fullSpins = (Math.floor(Math.random() * 5) + 7) * 360;
    const targetMod  = ((-targetIndex * SLICE) % 360 + 360) % 360;
    const currentMod = ((currentRot    % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    if (delta < 36) delta += 360;
    return currentRot + fullSpins + delta;
}

function segmentAtTop(rotDeg: number): number {
    const norm = ((rotDeg % 360) + 360) % 360;
    const idx  = Math.round(norm / SLICE) % TOTAL;
    return (TOTAL - idx) % TOTAL;
}

function toWheelSegment(seg: Segment, currentScore: number): WheelSegment {
    let pts = seg.points;
    if (seg.multiplier)               pts = currentScore * seg.multiplier;
    if (seg.special === "bonus_spin") pts = 0;
    return { label: seg.label, points: pts, color: "#ffd200" };
}

function getResultDesc(seg: Segment, currentScore: number): string {
    if (seg.multiplier === 3)         return `Your score × 3 = ${(currentScore * 3).toLocaleString()} pts!`;
    if (seg.multiplier === 2)         return `Your score × 2 = ${(currentScore * 2).toLocaleString()} pts!`;
    if (seg.special === "bonus_spin") return "Bonus Free Spin — answer correctly for a free spin!";
    if (seg.label === "★★★")          return "No points this time — better luck!";
    return `+${seg.label} points added to your score!`;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti: FC = () => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        const pieces = Array.from({ length: 140 }, () => ({
            x:  Math.random() * canvas.width,
            y: -20 - Math.random() * 200,
            w:  6 + Math.random() * 10,
            h: 10 + Math.random() * 16,
            r:  Math.random() * Math.PI * 2,
            dr: (Math.random() - 0.5) * 0.15,
            dx: (Math.random() - 0.5) * 3,
            dy:  3 + Math.random() * 5,
            color: ["#FFD700","#FF6B6B","#6BCB77","#4D96FF","#FF9F1C","#fff"][Math.floor(Math.random() * 6)],
        }));
        let id: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.x += p.dx; p.y += p.dy; p.r += p.dr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            if (pieces.some(p => p.y < canvas.height)) id = requestAnimationFrame(draw);
        };
        id = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(id);
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
        // viewBox ensures the fixed coordinates (cx/cy/radius based on 520×520)
        // scale correctly when the SVG is sized via CSS on any screen width
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

// ─── SpinWheel ────────────────────────────────────────────────────────────────
interface SpinProps { currentScore: number; onResult: (seg: WheelSegment) => void; }

const SpinWheel: FC<SpinProps> = ({ currentScore, onResult }) => {
    const rotRef       = useRef(START_DEG);
    const angleRef     = useRef(START_DEG * Math.PI / 180);
    const animFrameRef = useRef(0);
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const imgRef       = useRef<HTMLImageElement | null>(null);

    const [transitioning, setTransitioning] = useState(false);
    const [canSpin,       setCanSpin]       = useState(true);
    const [landed,        setLanded]        = useState<Segment | null>(null);
    const [showConfetti,  setShowConfetti]  = useState(false);

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

    useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

    const spin = () => {
        if (!canSpin || transitioning) return;

        let target = Math.floor(Math.random() * TOTAL);
        while (target === STAR_INDEX) target = Math.floor(Math.random() * TOTAL);

        const finalRotDeg = calcFinalRotation(rotRef.current, target);
        const startDeg    = rotRef.current;
        const deltaDeg    = finalRotDeg - startDeg;

        setCanSpin(false);
        setTransitioning(true);
        setLanded(null);
        setShowConfetti(false);

        const duration  = 5000;
        const startTime = performance.now();

        const animate = (now: number) => {
            const p      = Math.min((now - startTime) / duration, 1);
            const eased  = 1 - Math.pow(1 - p, 4);
            const curDeg = startDeg + deltaDeg * eased;
            angleRef.current = curDeg * Math.PI / 180;
            drawFrame(angleRef.current);

            if (p < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
            } else {
                rotRef.current = finalRotDeg;
                const actualIdx = segmentAtTop(finalRotDeg);
                const seg = SEGMENTS[actualIdx];
                setTransitioning(false);
                setLanded(seg);
                setShowConfetti(true);
                onResult(toWheelSegment(seg, currentScore));
                setTimeout(() => setShowConfetti(false), 4000);
            }
        };
        animFrameRef.current = requestAnimationFrame(animate);
    };

    const isSpecial = !!(landed && (landed.multiplier || landed.special === "bonus_spin"));

    return (
        <>
            {showConfetti && <Confetti />}
            <div className="spin-wheel-wrap">
                <div className={`spin-glow-ring${transitioning ? " is-spinning" : ""}`} />
                <div className="spin-bulb-ring-wrap">
                    <BulbRing spinning={transitioning} />
                    <div className="spin-inner">
                        <div className="spin-pointer" />
                        <canvas
                            ref={canvasRef}
                            width={800}
                            height={800}
                            className={`spin-wheel-canvas${transitioning ? " is-spinning" : ""}`}
                        />
                    </div>
                </div>
                <div className="spin-action">
                    {canSpin && !transitioning && !landed && (
                        <div className="spin-btn-wrap">
                            <button className="spin-btn" onClick={spin}>
                                <span className="spin-btn-shine" />
                                🎡 SPIN
                            </button>
                        </div>
                    )}
                    {transitioning && (
                        <div className="spin-spinning-state">
                            <div className="spin-spinning-text">Spinning…</div>
                            <div className="spin-dots">
                                <div className="spin-dot" />
                                <div className="spin-dot" />
                                <div className="spin-dot" />
                            </div>
                        </div>
                    )}
                    {landed && !transitioning && (
                        <div className={`spin-result-card ${isSpecial ? "is-special" : "is-normal"}`}>
                            <div className="spin-result-label">
                                {isSpecial ? "🔥" : "🎉"} {landed.label}
                            </div>
                            <div className="spin-result-divider" />
                            <div className="spin-result-desc">{getResultDesc(landed, currentScore)}</div>
                            <div className="spin-result-hint">Answer the next question correctly to claim it</div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
interface Props { currentScore: number; onResult: (seg: WheelSegment) => void; }

export const Round3SpinScreen: FC<Props> = ({ currentScore, onResult }) => (
    <div className="spin-root">
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
                    <span className="spin-badge-text">Round 3 · Final Bonus</span>
                </div>
                <h2 className="spin-title">Spin the Wheel!</h2>
                <p className="spin-subtitle">Starts at ★★★ · win points or a multiplier</p>
            </div>
            <div className="spin-score-pill">
                <span className="spin-score-label">Score so far</span>
                <span className="spin-score-value">{currentScore.toLocaleString()}</span>
            </div>
            <SpinWheel currentScore={currentScore} onResult={onResult} />
        </div>
    </div>
);