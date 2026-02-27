// HomeScreen.tsx
import { type FC, useEffect, useRef } from "react";
import logoBg from "../assets/logo.png";
import mainLogo from "../assets/background.png"
import '../styles/HomeScreen.css';

interface Props {
    onStart: () => void;
}

export const HomeScreen: FC<Props> = ({ onStart }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        let animId: number;

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener("resize", resize);

        const stars = Array.from({ length: 120 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.8 + 0.3,
            speed: Math.random() * 0.4 + 0.1,
            opacity: Math.random() * 0.7 + 0.3,
            twinkle: Math.random() * Math.PI * 2,
        }));

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.twinkle += 0.02;
                s.y += s.speed;
                if (s.y > canvas.height) { s.y = -4; s.x = Math.random() * canvas.width; }
                const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
    }, []);

    const rounds = [
        { num: "01", label: "Quickfire",  icon: "⚡",  desc: "2 mins · 100 pts per answer · streak bonuses", color: "#7B61FF", glow: "drop-shadow(0 0 12px rgba(123,97,255,0.6))"  },
        { num: "02", label: "Categories", icon: "🗂️", desc: "Pick your topic · 5 questions · powers apply",  color: "#FF6B6B", glow: "drop-shadow(0 0 12px rgba(255,107,107,0.6))" },
        { num: "03", label: "Spin & Win", icon: "🎡",  desc: "Spin the wheel · answer to claim your bonus",  color: "#FFD93D", glow: "drop-shadow(0 0 12px rgba(255,217,61,0.6))"  },
    ];

    return (
        <div className="home-root">
            <canvas ref={canvasRef} className="home-canvas" />

            <img src={logoBg} alt="Bongo Quiz Background" className="home-logo-bg" />

            <div className="home-orbs">
                <div className="home-orb1" />
                <div className="home-orb2" />
                <div className="home-orb3" />
            </div>

            <div className="home-scanline-wrap">
                <div className="home-scanline" />
            </div>

            <div className="home-content">
                <div className="home-badge">
                    <span className="home-badge-dot" />
                    <span className="home-badge-text">Live Trivia · Season 1</span>
                </div>

                <div className="home-title-wrap">
                    <img src={mainLogo} alt="Bongo Quiz" className="home-title-image" />
                </div>

                <p className="home-subtitle">
                    3 explosive rounds of trivia · hidden powers · a spinning prize wheel
                </p>

                <div className="home-rounds">
                    {rounds.map(r => (
                        <div key={r.num} className="home-round-card">
                            <div className="home-round-num">ROUND {r.num}</div>
                            <div className="home-round-icon" style={{ filter: r.glow }}>{r.icon}</div>
                            <div className="home-round-label" style={{ color: r.color }}>{r.label}</div>
                            <div className="home-round-divider" style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }} />
                            <div className="home-round-desc">{r.desc}</div>
                        </div>
                    ))}
                </div>

                <div className="home-cta-wrap">
                    <button className="home-btn" onClick={onStart}>
                        <span className="home-btn-shine" />
                        🎯 &nbsp;PLAY NOW
                    </button>
                </div>

                <p className="home-hint">Test Your Self</p>
            </div>
        </div>
    );
};
