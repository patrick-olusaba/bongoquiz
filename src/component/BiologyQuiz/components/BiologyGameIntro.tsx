import { type FC, useEffect, useState } from "react";
import transitionSfx from "../../../assets/sounds/transition.mp3";

interface Props { onDone: () => void; }

const BiologyGameIntro: FC<Props> = ({ onDone }) => {
    const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
    const [showLogo,  setShowLogo]  = useState(false);
    const [showTitle, setShowTitle] = useState(false);
    const [showSub,   setShowSub]   = useState(false);
    const [showRays,  setShowRays]  = useState(false);

    useEffect(() => {
        const audio = new Audio(transitionSfx);
        audio.volume = 0.8;
        audio.play().catch(() => {});

        const timers = [
            setTimeout(() => setShowRays(true),   50),
            setTimeout(() => setShowLogo(true),  150),
            setTimeout(() => setShowTitle(true), 380),
            setTimeout(() => setShowSub(true),   620),
            setTimeout(() => setPhase("hold"),   700),
            setTimeout(() => setPhase("out"),   2300),
            setTimeout(() => onDone(),          2900),
        ];
        return () => {
            timers.forEach(clearTimeout);
            audio.pause();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "radial-gradient(ellipse at 50% 40%, #003320 0%, #001a0e 55%, #000 100%)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            opacity: phase === "out" ? 0 : 1,
            transition: phase === "out" ? "opacity 0.6s ease" : "none",
        }}>
            {/* Shockwave rings only - no rays */}

            {/* Shockwave rings */}
            {showLogo && [0, 180, 360].map(delay => (
                <div key={delay} style={{
                    position: "absolute", width: 10, height: 10, borderRadius: "50%",
                    border: "2px solid rgba(0,220,100,0.6)",
                    animation: "bioShockRing 1s ease-out forwards",
                    animationDelay: `${delay}ms`,
                }} />
            ))}

            {/* Orbiting DNA particles */}
            {showLogo && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                    position: "absolute",
                    width: i % 2 === 0 ? 10 : 7, height: i % 2 === 0 ? 10 : 7,
                    borderRadius: "50%",
                    background: i % 2 === 0 ? "rgba(0,220,100,0.9)" : "rgba(74,222,128,0.6)",
                    boxShadow: "0 0 10px rgba(0,220,100,0.8)",
                    animation: "bioDnaOrbit 1.6s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                    transformOrigin: `${70 + i * 8}px center`,
                }} />
            ))}

            {/* DNA emoji icon */}
            <div style={{
                fontSize: "5rem", lineHeight: 1,
                filter: "drop-shadow(0 0 30px rgba(0,220,100,0.9))",
                transform: showLogo ? "scale(1) translateY(0)" : "scale(3) translateY(-40px)",
                opacity: showLogo ? 1 : 0,
                transition: "transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.25s",
                marginBottom: 16,
            }}>🧬</div>

            {/* Title */}
            <h1 style={{
                color: "#00DC64", fontSize: "clamp(2rem,8vw,3.5rem)", fontWeight: 900,
                margin: "0 0 8px", textAlign: "center", letterSpacing: 4,
                textShadow: "0 0 40px rgba(0,220,100,0.8), 0 4px 0 rgba(0,0,0,0.5)",
                transform: showTitle ? "scale(1) translateY(0)" : "scale(0.4) translateY(30px)",
                opacity: showTitle ? 1 : 0,
                transition: "transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s",
            }}>BIOLOGY QUIZ</h1>

            {/* Subtitle */}
            <p style={{
                color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", fontWeight: 600,
                letterSpacing: 3, textTransform: "uppercase", margin: 0,
                opacity: showSub ? 1 : 0,
                transform: showSub ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.4s, transform 0.4s",
            }}>Test Your Science Knowledge</p>

            {/* Progress bar */}
            {showSub && (
                <div style={{
                    marginTop: 32, width: "min(240px,60vw)", height: 3,
                    background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden",
                }}>
                    <div style={{
                        height: "100%", borderRadius: 4,
                        background: "linear-gradient(90deg,#00DC64,#fff)",
                        animation: "bioBarFill 1.6s linear forwards",
                    }} />
                </div>
            )}

            <style>{`
                @keyframes bioShockRing {
                    from { transform: scale(1); opacity: 0.8; }
                    to   { transform: scale(40); opacity: 0; }
                }
                @keyframes bioBarFill {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
                @keyframes bioDnaOrbit {
                    0%   { transform: rotate(0deg) translateX(var(--r, 70px)) rotate(0deg); opacity: 0.9; }
                    50%  { opacity: 0.4; }
                    100% { transform: rotate(360deg) translateX(var(--r, 70px)) rotate(-360deg); opacity: 0.9; }
                }
            `}</style>
        </div>
    );
};

export default BiologyGameIntro;
