// Round2CategoryScreen.tsx
import type { FC } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { CATEGORIES, CATEGORY_META, type Category } from "../types/gametypes.ts";
import '../styles/game.css';

interface Props {
    power: PrizeItem;
    onSelect: (category: Category) => void;
}

export const Round2CategoryScreen: FC<Props> = ({ power, onSelect }) => (
    <div className="game-root">
        <div className="game-card">
            <span className="game-badge">Round 2 — Categories</span>
            <h2 className="game-result-title" style={{ marginTop: 12 }}>🗂️ Choose Your Category</h2>
            <p className="game-result-sub" style={{ marginBottom: 24 }}>
                5 questions · 150 pts each · Power <strong style={{ color: "#ffd200" }}>{power.name}</strong> applies
            </p>
            <div className="game-category-grid">
                {CATEGORIES.map(cat => {
                    const m = CATEGORY_META[cat];
                    return (
                        <div
                            key={cat}
                            className="game-category-card"
                            onClick={() => onSelect(cat)}
                            style={{ background: `${m.color}18`, borderColor: `${m.color}44` }}
                        >
                            <div className="game-category-icon">{m.icon}</div>
                            <div className="game-category-label" style={{ color: m.color }}>{cat}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);
