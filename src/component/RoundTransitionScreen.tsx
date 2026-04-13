// RoundTransitionScreen.tsx — cinematic full-screen round reveal
import { type FC, useEffect, useRef, useState } from "react";
import { useSoundFX } from "../hooks/Usesoundfx.ts";
import '../styles/RoundTransitionScreen.css';

interface Props {
    roundNum:   number;
    title:      string;
    subtitle?:  string;
    icon:       string;
    color:      string;
    onDone:     () => void;
}

interface Particle {
    id: number; x: number; y: number;
    vx: number; vy: number;
    size: number; color: string; opacity: number; rotation: number;
}

const CONFETTI_COLORS = ["#FFD700","#FF6B6B","#6BCB77","#4D96FF","#FF6BFF","#ffffff"];
const ROUND_THEME: Record<number, string> = { 1: "rt-theme--r1", 2: "rt-theme--r2", 3: "rt-theme--r3" };

export const RoundTransitionScreen: FC<Props> = ({ roundNum, title, subtitle, icon, onDone }) => {
    const { play } = useSoundFX();

    const [phase,      setPhase]      = useState<"slam"|"shockwave"|"hold"|"exit">("slam");
    const [showNumber, setShowNumber] = useState(false);
    const [showTitle,  setShowTitle]  = useState(false);
    const [showSub,    setShowSub]    = useState(false);
    const [showShock,  setShowShock]  = useState(false);
    const rafRef    = useRef<ReturnType<typeof requestAnimationFrame>>(0);
    const partRef   = useRef<Particle[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const themeClass = ROUND_THEME[roundNum] ?? "rt-theme--r1";

    // Play transition sound on mount
    useEffect(() => { play("transition"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Particles
    useEffect(() => {
        partRef.current = Array.from({ length: 80 }, (_, i) => {
            const angle = (i / 80) * Math.PI * 2;
            const speed = 4 + Math.random() * 10;
            return {
                id: i, x: 50, y: 50,
                vx: Math.cos(angle) * speed * (0.5 + Math.random()),
                vy: Math.sin(angle) * speed * (0.5 + Math.random()) - 3,
                size: 4 + Math.random() * 8,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                opacity: 1,
                rotation: Math.random() * 360,
            };
        });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            partRef.current = partRef.current.map(p => ({
                ...p,
                x:        p.x + p.vx * 0.6,
                y:        p.y + p.vy * 0.6,
                vy:       p.vy + 0.25,
                opacity:  p.opacity - 0.012,
                rotation: p.rotation + p.vx * 2,
            })).filter(p => p.opacity > 0);

            partRef.current.forEach(p => {
                const px = (p.x / 100) * canvas.width;
                const py = (p.y / 100) * canvas.height;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle   = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
                ctx.restore();
            });

            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    // Phase timeline
    useEffect(() => {
        const timers = [
            setTimeout(() => setShowNumber(true),   80),
            setTimeout(() => setShowShock(true),   200),
            setTimeout(() => setPhase("shockwave"), 200),
            setTimeout(() => setShowTitle(true),   400),
            setTimeout(() => setShowSub(true),     650),
            setTimeout(() => setPhase("hold"),     700),
            setTimeout(() => setPhase("exit"),    2400),
            setTimeout(() => onDone(),            3000),
        ];
        return () => timers.forEach(clearTimeout);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const streakWidths = useRef(
        Array.from({ length: 16 }, () => `${30 + Math.floor(Math.random() * 50)}%`)
    ).current;

    return (
        <div className={`rt-root rt-root--${phase} ${themeClass}`}>
            <canvas ref={canvasRef} className="rt-canvas" />
            <div className="rt-spotlight" />

            {showShock && <div className="rt-shockwave" />}
            {showShock && <div className="rt-shockwave rt-shockwave--2" />}

            <div className="rt-scanlines" />

            <div className="rt-streaks">
                {streakWidths.map((w, i) => (
                    <div key={i} className="rt-streak"
                         style={{ top: `${(i / 16) * 100}%`, animationDelay: `${i * 40}ms`, width: w }} />
                ))}
            </div>

            <div className="rt-content">
                <div className={`rt-round-number ${showNumber ? "rt-round-number--in" : ""}`}>
                    {roundNum}
                </div>
                <div className={`rt-round-label ${showNumber ? "rt-round-label--in" : ""}`}>
                    ROUND
                </div>
                <div className={`rt-icon ${showTitle ? "rt-icon--in" : ""}`}>
                    {icon}
                </div>
                <h1 className={`rt-title ${showTitle ? "rt-title--in" : ""}`}>
                    {title.split("").map((ch, i) => (
                        <span key={i} className="rt-title-char" style={{ animationDelay: `${i * 40}ms` }}>
                            {ch === " " ? "\u00A0" : ch}
                        </span>
                    ))}
                </h1>
                {showTitle && <div className="rt-divider" />}
                {subtitle && (
                    <p className={`rt-subtitle ${showSub ? "rt-subtitle--in" : ""}`}>{subtitle}</p>
                )}
                {showSub && <div className="rt-bar-wrap"><div className="rt-bar" /></div>}
            </div>

            <div className="rt-hud rt-hud--tl" />
            <div className="rt-hud rt-hud--tr" />
            <div className="rt-hud rt-hud--bl" />
            <div className="rt-hud rt-hud--br" />

            <div className="rt-glitch-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rt-glitch-bar"
                         style={{ animationDelay: `${i * 120}ms`, top: `${10 + i * 14}%` }} />
                ))}
            </div>

            {showShock && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rt-pulse-ring"
                     style={{ animationDelay: `${i * 180}ms` }} />
            ))}

            {showTitle && <div className="rt-flare rt-flare--main" />}
            {showTitle && <div className="rt-flare rt-flare--small" />}
            {showTitle && <div className="rt-flare rt-flare--streak" />}

            <div className="rt-grid" />
            <div className="rt-vignette" />
        </div>
    );
};