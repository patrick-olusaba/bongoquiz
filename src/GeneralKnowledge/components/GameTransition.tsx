// GameTransition.tsx — cinematic full-screen reveal between home and questions
import { type FC, useEffect, useRef, useState } from "react";
import "../style/gametransition.css";

interface Props {
  onDone: () => void;
}

interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  opacity: number;
  rotation: number;
}

const CONFETTI_COLORS = ["#00e5ff", "#a78bfa", "#06d6a0", "#ffd700", "#ff6b6b", "#ffffff"];

export const GameTransition: FC<Props> = ({ onDone }) => {
  const [phase,      setPhase]      = useState<"slam" | "shockwave" | "hold" | "exit">("slam");
  const [showNumber, setShowNumber] = useState(false);
  const [showTitle,  setShowTitle]  = useState(false);
  const [showSub,    setShowSub]    = useState(false);
  const [showShock,  setShowShock]  = useState(false);

  const rafRef    = useRef<ReturnType<typeof requestAnimationFrame>>(0);
  const partRef   = useRef<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streakWidths = useRef(
    Array.from({ length: 16 }, () => `${30 + Math.floor(Math.random() * 50)}%`)
  ).current;

  // ── Confetti particles ──────────────────────────────────────────────────
  useEffect(() => {
    partRef.current = Array.from({ length: 80 }, (_, i) => {
      const angle = (i / 80) * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      return {
        id: i,
        x: 50, y: 50,
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
      partRef.current = partRef.current
        .map(p => ({
          ...p,
          x:        p.x + p.vx * 0.6,
          y:        p.y + p.vy * 0.6,
          vy:       p.vy + 0.25,
          opacity:  p.opacity - 0.012,
          rotation: p.rotation + p.vx * 2,
        }))
        .filter(p => p.opacity > 0);

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

  // ── Phase timeline ──────────────────────────────────────────────────────
  useEffect(() => {
    const timers = [
      setTimeout(() => setShowNumber(true),    80),
      setTimeout(() => setShowShock(true),    200),
      setTimeout(() => setPhase("shockwave"), 200),
      setTimeout(() => setShowTitle(true),    420),
      setTimeout(() => setShowSub(true),      680),
      setTimeout(() => setPhase("hold"),      720),
      setTimeout(() => setPhase("exit"),     2500),
      setTimeout(() => onDone(),             3100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`gt-root gt-root--${phase}`}>
      <canvas ref={canvasRef} className="gt-canvas" />
      <div className="gt-spotlight" />

      {showShock && <div className="gt-shockwave" />}
      {showShock && <div className="gt-shockwave gt-shockwave--2" />}

      <div className="gt-scanlines" />

      {/* Speed streaks */}
      <div className="gt-streaks">
        {streakWidths.map((w, i) => (
          <div
            key={i}
            className="gt-streak"
            style={{ top: `${(i / 16) * 100}%`, animationDelay: `${i * 40}ms`, width: w }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="gt-content">
        {/* Big icon slam */}
        <div className={`gt-icon ${showNumber ? "gt-icon--in" : ""}`}>🧠</div>

        {/* Title */}
        <h1 className={`gt-title ${showTitle ? "gt-title--in" : ""}`}>
          {["G","E","N","E","R","A","L"," ","K","N","O","W","L","E","D","G","E"].map((ch, i) => (
            <span key={i} className="gt-title-char" style={{ animationDelay: `${i * 35}ms` }}>
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </h1>

        {showTitle && <div className="gt-divider" />}

        <p className={`gt-subtitle ${showSub ? "gt-subtitle--in" : ""}`}>
          Get ready — your quiz starts now!
        </p>

        {showSub && (
          <div className="gt-bar-wrap">
            <div className="gt-bar" />
          </div>
        )}
      </div>

      {/* HUD corner brackets */}
      <div className="gt-hud gt-hud--tl" />
      <div className="gt-hud gt-hud--tr" />
      <div className="gt-hud gt-hud--bl" />
      <div className="gt-hud gt-hud--br" />

      {/* Glitch bars */}
      <div className="gt-glitch-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="gt-glitch-bar"
            style={{ animationDelay: `${i * 120}ms`, top: `${10 + i * 14}%` }}
          />
        ))}
      </div>

      {/* Pulse rings */}
      {showShock && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="gt-pulse-ring" style={{ animationDelay: `${i * 180}ms` }} />
      ))}

      {/* Lens flares */}
      {showTitle && <div className="gt-flare gt-flare--main" />}
      {showTitle && <div className="gt-flare gt-flare--small" />}
      {showTitle && <div className="gt-flare gt-flare--streak" />}

      {/* Perspective grid */}
      <div className="gt-grid" />
      <div className="gt-vignette" />
    </div>
  );
};
