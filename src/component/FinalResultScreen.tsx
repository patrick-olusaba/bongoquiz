// FinalResultScreen.tsx
import { type FC, useEffect, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import type { WheelSegment } from "../types/gametypes.ts";
import { checkAchievements, unlockAchievements, type Achievement } from "../utils/achievements.ts";
import { recordPlayToday } from "../utils/streakDays.ts";
import '../styles/style.css';
import '../styles/FinalResultScreen.css';

interface Props {
    power:       PrizeItem;
    r1Score:     number;
    r2Score:     number;
    r3Bonus:     number;
    segment:     WheelSegment | null;
    total:       number;
    playerName:  string;
    r1TimeLeft:  number;
    r2Correct:   number;
    r2Total:     number;
    maxStreak:   number;
    onPlayAgain: () => void;
}

export const FinalResultScreen: FC<Props> = ({
                                                 power, r1Score, r2Score, r3Bonus, segment, total,
                                                 playerName, r1TimeLeft, r2Correct, r2Total, maxStreak, onPlayAgain
                                             }) => {
    const [isNewBest,    setIsNewBest]    = useState(false);
    const [prevBest,     setPrevBest]     = useState(0);
    const [copied,       setCopied]       = useState(false);
    const [newBadges,    setNewBadges]    = useState<Achievement[]>([]);
    const [showBadgeIdx, setShowBadgeIdx] = useState(0);

    useEffect(() => {
        // Personal best
        const prev = parseInt(localStorage.getItem("bongo_best_score") ?? "0");
        setPrevBest(prev);
        if (total > prev) {
            setIsNewBest(true);
            localStorage.setItem("bongo_best_score", String(total));
        }

        // Only show badges earned THIS session
        const ids    = checkAchievements({ total, r2Correct, r2Total, r1TimeLeft, r1Score, maxStreak });
        const earned = unlockAchievements(ids);
        setNewBadges(earned);

        if (earned.length > 0) {
            earned.forEach((_, i) => {
                setTimeout(() => setShowBadgeIdx(i), i * 2200);
            });
        }

        recordPlayToday();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const handleShare = () => {
        const text = `🎯 I scored ${total.toLocaleString()} pts on Bongo Quiz as "${playerName}"!\n${rating}\nCan you beat me? 🏆`;
        if (navigator.share) {
            navigator.share({ title: "Bongo Quiz", text }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    return (
        <div className="fr-root">
            {/* New personal best banner */}
            {isNewBest && (
                <div className="fr-new-best-banner">
                    🏆 NEW PERSONAL BEST! {prevBest > 0 ? `(was ${prevBest.toLocaleString()})` : "First score saved!"}
                </div>
            )}

            {/* Achievement toast — slides in for each new badge */}
            {newBadges.length > 0 && showBadgeIdx < newBadges.length && (
                <div className="fr-badge-toast" key={showBadgeIdx}>
                    <span className="fr-badge-toast-emoji">{newBadges[showBadgeIdx].emoji}</span>
                    <div>
                        <div className="fr-badge-toast-title">Badge Unlocked!</div>
                        <div className="fr-badge-toast-name">{newBadges[showBadgeIdx].name}</div>
                    </div>
                </div>
            )}

            <div className="fr-card">
                <div className="fr-trophy">{isNewBest ? "🥇" : "🏆"}</div>
                <h1 className="fr-title">Game Over!</h1>

                <p className="fr-power-line">
                    Power: <img src={power.img} alt="" className="fr-power-img" />
                    <strong>{power.name}</strong>
                </p>

                <div className="fr-breakdown">
                    {[
                        { l: "⚡ Round 1", v: r1Score, c: "#ffd200" },
                        { l: "🗂️ Round 2", v: r2Score, c: "#4d96ff" },
                        { l: r3Label,      v: r3Bonus, c: "#38ef7d" },
                    ].map(s => (
                        <div key={s.l} className="fr-breakdown-cell" style={{ borderColor: `${s.c}44` }}>
                            <div className="fr-breakdown-label">{s.l}</div>
                            <div className="fr-breakdown-value" style={{ color: s.c }}>
                                {isMultiplier && s.l === r3Label
                                    ? (segment?.label === "×3" ? "×3" : "×2")
                                    : s.v.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="fr-total-box">
                    <div className="fr-total-label">FINAL SCORE</div>
                    <div className="fr-total-value">{total.toLocaleString()}</div>
                    <div className="fr-rating">{rating}</div>
                </div>

                {/* Only badges earned this game */}
                {newBadges.length > 0 && (
                    <div className="fr-badges-row">
                        <div className="fr-badges-title">🏅 Badges Earned This Game</div>
                        <div className="fr-badges-list">
                            {newBadges.map((b, i) => (
                                <div
                                    key={b.id}
                                    className="fr-badge-chip"
                                    style={{ animationDelay: `${i * 150}ms` }}
                                >
                                    <span className="fr-badge-chip-emoji">{b.emoji}</span>
                                    <span className="fr-badge-chip-name">{b.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="fr-actions">
                    <button className="fr-btn fr-btn--play"  onClick={onPlayAgain}>🔄 Play Again</button>
                    <button className="fr-btn fr-btn--share" onClick={handleShare}>
                        {copied ? "✅ Copied!" : "📤 Share"}
                    </button>
                </div>
            </div>
        </div>
    );
};