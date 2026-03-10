// Round2CategoryScreen.tsx
import type { FC } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { CATEGORIES, CATEGORY_META, type Category } from "../types/gametypes.ts";
import stageBg from "../assets/BACK.png";
import '../styles/game.css';

interface Props {
    power: PrizeItem;
    onSelect: (category: Category) => void;
}

// Mirror the R2 scoring so the subtitle is always accurate
function r2PtsLabel(power: PrizeItem): string {
    if (power.name === "Double Points")      return "2,000 pts each";
    if (power.name === "Double Or Nothing")  return "All correct → ×2, any wrong → 0";
    if (power.name === "Point Gamble")       return "50/50 — ×2 or ÷2 at round end";
    if (power.name === "Point Chance Brain") return "50% chance to double your score";
    if (power.name === "Disqualified")       return "Score will be 0 this round";
    if (power.name === "Insurance")          return "1,000 pts each · floor at 1,000 pts";
    if (power.name === "Mirror Effect")      return "1,000 pts each · ×1.5 at round end";
    if (power.name === "Sudden Death Disqualified") return "Any wrong answer → round score = 0";
    if (power.name === "Swap Fate")          return "1,000 pts each · ×1.25 at round end";
    if (power.name === "Steal A Point")      return "1,000 pts each · +500 bonus pts";
    return "1,000 pts each";
}

export const Round2CategoryScreen: FC<Props> = ({ power, onSelect }) => (
    <div className="game-root" style={{ background: "none" }}>
        <div style={{
            position: "fixed", inset: 0,
            backgroundImage: `url(${stageBg})`,
            backgroundSize: "cover", backgroundPosition: "center", zIndex: 0,
        }} />
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,10,0.45)", zIndex: 1, pointerEvents: "none",
        }} />

        <div className="game-card game-card--center" style={{ position: "relative", zIndex: 2 }}>
            <span className="game-badge">Round 2 — Categories</span>
            <h2 className="game-result-title" style={{ marginTop: 12 }}>🗂️ Choose Your Category</h2>
            <p className="game-result-sub" style={{ marginBottom: 24 }}>
                5 questions · {r2PtsLabel(power)} · Power <strong style={{ color: "#ffd200" }}>{power.name}</strong> applies
            </p>
            <div className="game-category-grid">
                {CATEGORIES.map(cat => {
                    const m = CATEGORY_META[cat];
                    return (
                        <div key={cat} className="game-category-card"
                             onClick={() => onSelect(cat)}
                             style={{ background: `${m.color}28`, borderColor: `${m.color}70` }}>
                            <div className="game-category-icon">{m.icon}</div>
                            <div className="game-category-label" style={{ color: m.color }}>{cat}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);