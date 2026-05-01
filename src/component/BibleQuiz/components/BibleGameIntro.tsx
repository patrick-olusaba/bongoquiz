import { type FC, useEffect, useRef, useState } from "react";
import transitionSfx from "../../../assets/sounds/transition.mp3";

interface Props { onDone: () => void; }

const BibleGameIntro: FC<Props> = ({ onDone }) => {
    const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
    const [showCross, setShowCross]   = useState(false);
    const [showTitle, setShowTitle]   = useState(false);
    const [showSub,   setShowSub]     = useState(false);
    const [showRays,  setShowRays]    = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Play transition sound
        const audio = new Audio(transitionSfx);
        audio.volume = 0.8;
        audio.play().catch(() => {});
        audioRef.current = audio;

        const timers = [
            setTimeout(() => setShowRays(true),   50),
            setTimeout(() => setShowCross(true),  150),
            setTimeout(() => setShowTitle(true),  380),
            setTimeout(() => setShowSub(true),    620),
            setTimeout(() => setPhase("hold"),    700),
            setTimeout(() => setPhase("out"),    2300),
            setTimeout(() => onDone(),           2900),
        ];
        return () => {
            timers.forEach(clearTimeout);
            audioRef.current?.pause();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "radial-gradient(ellipse at 50% 40%, #2a0060 0%, #0a0020 55%, #000 100%)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            opacity: phase === "out" ? 0 : 1,
            transition: phase === "out" ? "opacity 0.6s ease" : "none",
        }}>
            {/* Light rays */}
            {showRays && (
                <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} style={{
                            position: "absolute", top: "50%", left: "50%",
                            width: 3, height: "70vh",
                            background: "linear-gradient(to bottom, rgba(255,215,0,0.35), transparent)",
                            transformOrigin: "top center",
                            transform: `rotate(${i * 30}deg) translateX(-50%)`,
                            animation: "rayExpand 0.6s ease-out forwards",
                            animationDelay: `${i * 30}ms`,
                        }} />
                    ))}
                </div>
            )}

            {/* Shockwave rings */}
            {showCross && [0, 180, 360].map(delay => (
                <div key={delay} style={{
                    position: "absolute", width: 10, height: 10, borderRadius: "50%",
                    border: "2px solid rgba(255,215,0,0.6)",
                    animation: "shockRing 1s ease-out forwards",
                    animationDelay: `${delay}ms`,
                }} />
            ))}

            {/* Cross icon */}
            <div style={{
                fontSize: "4rem", lineHeight: 1,
                filter: "drop-shadow(0 0 24px rgba(255,215,0,0.9))",
                transform: showCross ? "scale(1) translateY(0)" : "scale(3) translateY(-40px)",
                opacity: showCross ? 1 : 0,
                transition: "transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.25s",
                marginBottom: 16,
            }}>✝️</div>

            {/* Title */}
            <h1 style={{
                color: "#FFD700", fontSize: "clamp(2rem,8vw,3.5rem)", fontWeight: 900,
                margin: "0 0 8px", textAlign: "center", letterSpacing: 4,
                textShadow: "0 0 40px rgba(255,215,0,0.8), 0 4px 0 rgba(0,0,0,0.5)",
                transform: showTitle ? "scale(1) translateY(0)" : "scale(0.4) translateY(30px)",
                opacity: showTitle ? 1 : 0,
                transition: "transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s",
            }}>BIBLE QUIZ</h1>

            {/* Subtitle */}
            <p style={{
                color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", fontWeight: 600,
                letterSpacing: 3, textTransform: "uppercase", margin: 0,
                opacity: showSub ? 1 : 0,
                transform: showSub ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.4s, transform 0.4s",
            }}>Test Your Scripture Knowledge</p>

            {/* Progress bar */}
            {showSub && (
                <div style={{
                    marginTop: 32, width: "min(240px,60vw)", height: 3,
                    background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden",
                }}>
                    <div style={{
                        height: "100%", borderRadius: 4,
                        background: "linear-gradient(90deg,#FFD700,#fff)",
                        animation: "barFill 1.6s linear forwards",
                    }} />
                </div>
            )}

            <style>{`
                @keyframes rayExpand {
                    from { opacity: 0; transform: rotate(var(--r,0deg)) translateX(-50%) scaleY(0); }
                    to   { opacity: 1; transform: rotate(var(--r,0deg)) translateX(-50%) scaleY(1); }
                }
                @keyframes shockRing {
                    from { transform: scale(1); opacity: 0.8; }
                    to   { transform: scale(40); opacity: 0; }
                }
                @keyframes barFill {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default BibleGameIntro;
