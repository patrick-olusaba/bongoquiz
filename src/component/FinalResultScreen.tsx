// FinalResultScreen.tsx
import type { FC } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import type { WheelSegment } from "../types/gametypes.ts";
import '../styles/style.css';

interface Props {
    power:       PrizeItem;
    r1Score:     number;
    r2Score:     number;
    r3Bonus:     number;
    segment:     WheelSegment | null;
    total:       number;
    onPlayAgain: () => void;
}

export const FinalResultScreen: FC<Props> = ({ power, r1Score, r2Score, r3Bonus, segment, total, onPlayAgain }) => {
    const rating =
        total >= 20000 ? "🌟 Legendary! You're a Bongo champion!"
        : total >= 8000  ? "🔥 Amazing score — absolutely crushing it!"
        : total >= 3000  ? "🎉 Great score — well done!"
        : total >= 1000  ? "👍 Decent effort — try again!"
        : "📚 Keep practising, you'll do better!";

    const isMultiplier = segment?.label === "×3" || segment?.label === "Double Up";

    const r3Label = (() => {
        if (!segment) return "🎡 Wheel Bonus";
        if (segment.label === "×3")        return "🎡 ×3 Multiplier";
        if (segment.label === "Double Up") return "🎡 Double Up";
        if (segment.label === "★★★")       return "🎡 No Bonus";
        return `🎡 ${segment.label}`;
    })();

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.12)", padding: "40px", maxWidth: "560px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", textAlign: "center" }}>
                <div style={{ fontSize: "4rem", marginBottom: 6 }}>🏆</div>
                <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, background: "linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 6 }}>
                    Game Over!
                </h1>

                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginBottom: 20 }}>
                    Power used:{" "}
                    <strong style={{ color: "#ffd200" }}>
                        <img src={power.img} alt="" style={{ width: 20, height: 20, objectFit: "contain", verticalAlign: "middle", marginRight: 4 }} />
                        {power.name}
                    </strong>
                </p>

                {/* Per-round breakdown */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
                    {[
                        { l: "⚡ Round 1", v: r1Score, c: "#ffd200" },
                        { l: "🗂️ Round 2", v: r2Score, c: "#4d96ff" },
                        { l: r3Label,      v: isMultiplier && r3Bonus > 0 ? "×" : r3Bonus, c: "#38ef7d" },
                    ].map(s => (
                        <div key={s.l} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 10px", border: `1px solid ${s.c}44` }}>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginBottom: 4 }}>{s.l}</div>
                            <div style={{ fontWeight: 900, fontSize: "1.6rem", color: s.c }}>
                                {isMultiplier && s.l === r3Label
                                    ? (segment?.label === "×3" ? "×3" : "×2")
                                    : s.v}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div style={{ background: "rgba(255,215,0,0.08)", border: "2px solid rgba(255,215,0,0.3)", borderRadius: 20, padding: 20, marginBottom: 28 }}>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>FINAL SCORE</div>
                    <div style={{ fontSize: "clamp(3rem,8vw,4.5rem)", fontWeight: 900, color: "#ffd200", textShadow: "0 0 30px rgba(255,210,0,0.5)", lineHeight: 1 }}>
                        {total.toLocaleString()}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginTop: 6 }}>{rating}</div>
                </div>

                <button onClick={onPlayAgain} style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: "50px", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "1.1rem", fontWeight: 800, padding: "14px 40px", boxShadow: "0 4px 20px rgba(102,126,234,0.4)", transition: "all 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                >🔄 Play Again</button>
            </div>
        </div>
    );
};
