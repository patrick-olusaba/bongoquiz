// Round2CategoryScreen.tsx
import type { FC } from "react";
import type { PrizeItem } from "../../types/bongotypes.ts";
import { CATEGORIES, CATEGORY_META, type Category } from "../../types/gametypes.ts";
import { useSoundFX } from "../../hooks/Usesoundfx.ts";
import stageBg from "../../assets/BACK.png";
import categoryFrame from "../../assets/category-frame.jpeg";
import '../../styles/Round2categoryscreen.css';

interface Props {
    power: PrizeItem;
    onSelect: (category: Category) => void;
}

const TILE: Record<string, { fill: string; glow: string; border: string }> = {
    "Sport":             { fill: "#0a3a6e", glow: "#4d96ff",  border: "#4d96ff"  },
    "Religion":          { fill: "#3a1a5e", glow: "#b47aff",  border: "#b47aff"  },
    "Food":              { fill: "#5e1a1a", glow: "#ff6b6b",  border: "#ff6b6b"  },
    "Kenyan History":    { fill: "#004d2e", glow: "#38ef7d",  border: "#38ef7d"  },
    "Entertainment":     { fill: "#5e3a00", glow: "#ffd200",  border: "#ffd200"  },
    "Science":           { fill: "#004d4d", glow: "#4dd0e1",  border: "#4dd0e1"  },
    "Geography":         { fill: "#1a3a00", glow: "#6bcb77",  border: "#6bcb77"  },
    "General Knowledge": { fill: "#3a1a3a", glow: "#ff9f1c",  border: "#ff9f1c"  },
};

function r2PtsLabel(power: PrizeItem): string {
    if (power.name === "Double Points")             return "2,000 pts each";
    if (power.name === "Double Or Nothing")         return "All correct → ×2, any wrong → 0";
    if (power.name === "Point Gamble")              return "50/50 — ×2 or ÷2 at round end";
    if (power.name === "Point Chance Brain")        return "50% chance to double your score";
    if (power.name === "Disqualified")              return "Score will be 0 this round";
    if (power.name === "Insurance")                 return "1,000 pts each · floor at 1,000";
    if (power.name === "Mirror Effect")             return "1,000 pts each · ×1.5 at round end";
    if (power.name === "Sudden Death Disqualified") return "Any wrong answer → round score = 0";
    if (power.name === "Swap Fate")                 return "1,000 pts each · ×1.25 at round end";
    if (power.name === "Steal A Point")             return "1,000 pts each · +500 bonus";
    return "1,000 pts each";
}

export const Round2CategoryScreen: FC<Props> = ({ power, onSelect }) => {
    const { play } = useSoundFX();

    return (
        <div className="r2cat-root">
            <img src={stageBg} alt="" className="r2cat-bg" />
            <div className="r2cat-dim" />

            <div className="r2cat-board fade-in">
                <div style={{ textAlign: "center" }}>
                    <span className="r2cat-badge">Round 2 — Categories</span>
                    <p className="r2cat-title">Choose Your Category</p>
                    <p className="r2cat-sub">
                        5 questions · {r2PtsLabel(power)} · Power <span>{power.name}</span>
                    </p>
                </div>

                <div className="r2cat-wrap">
                    <img src={categoryFrame} alt="" className="r2cat-frame" />
                    <div className="r2cat-inner">
                        <div className="r2cat-grid">
                            {CATEGORIES.map(cat => {
                                const meta = CATEGORY_META[cat];
                                const ts   = TILE[cat] ?? { fill: meta.color + "33", glow: meta.color, border: meta.color };
                                return (
                                    <div
                                        key={cat}
                                        className="r2cat-tile"
                                        onClick={() => { play("category"); onSelect(cat); }}
                                        style={{
                                            background: ts.fill,
                                            border:    `2px solid ${ts.border}99`,
                                            boxShadow: `0 0 28px ${ts.glow}55, inset 0 0 20px rgba(255,255,255,0.05)`,
                                        }}
                                    >
                                        <div className="r2cat-shine" />
                                        <div className="r2cat-ring" style={{ border: `1px solid ${ts.border}55` }} />
                                        <span className="r2cat-icon">{meta.icon}</span>
                                        <span className="r2cat-label" style={{ textShadow: `0 0 24px ${ts.glow}cc, 0 2px 10px rgba(0,0,0,0.9)` }}>
                                            {cat}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};