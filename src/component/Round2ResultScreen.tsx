// Round2ResultScreen.tsx
import type { FC } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { CATEGORY_META, type Category } from "../types/gametypes.ts";
import '../styles/game.css';

interface Props {
    power: PrizeItem;
    category: Category;
    r1Score: number;
    r2Score: number;
    correct: number;
    total: number;
    onContinue: () => void;
}

export const Round2ResultScreen: FC<Props> = ({ power, category, r1Score, r2Score, correct, total, onContinue }) => {
    const cm = CATEGORY_META[category];
    return (
        <div className="game-root">
            <div className="game-card game-card--center">
                <div className="game-result-icon">🗂️</div>
                <h2 className="game-result-title">Round 2 Complete!</h2>
                <p className="game-result-sub">
                    Category: <strong style={{ color: cm.color }}>{category}</strong> · {correct}/{total} correct
                </p>
                <div className="game-big-score" style={{ color: "#4d96ff" }}>+{r2Score} pts</div>

                <div className="game-score-grid">
                    {[
                        { l: "⚡ Round 1", v: r1Score,         c: "#ffd200" },
                        { l: "🗂️ Round 2", v: r2Score,         c: "#4d96ff" },
                        { l: "Total",      v: r1Score + r2Score, c: "#38ef7d" },
                    ].map(s => (
                        <div key={s.l} className="game-score-chip" style={{ border: `1px solid ${s.c}44` }}>
                            <div className="game-score-chip-label">{s.l}</div>
                            <div className="game-score-chip-value" style={{ color: s.c }}>{s.v}</div>
                        </div>
                    ))}
                </div>

                {power.name === "Double Or Nothing" && correct < total && (
                    <p className="game-modifier-note game-modifier-note--red">😬 Double or Nothing: not all correct — score reset to 0.</p>
                )}
                {power.name === "Double Or Nothing" && correct === total && (
                    <p className="game-modifier-note game-modifier-note--green">🎉 Double or Nothing: perfect — score doubled!</p>
                )}

                <button className="btn btn--green" onClick={onContinue}>🎡 Go to Round 3</button>
            </div>
        </div>
    );
};
