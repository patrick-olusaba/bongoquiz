// LeaderboardScreen.tsx
import { type FC, useEffect, useState } from "react";
import '../styles/Leaderboardscreen.css';

interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    badge: string;
    isCurrentPlayer?: boolean;
}

// Dummy data — replace with API call when backend is ready
const DUMMY_LEADERS: LeaderboardEntry[] = [
    { rank: 1,  name: "NairobiNinja",    score: 45000, badge: "👑" },
    { rank: 2,  name: "SavannaScholar",  score: 40000, badge: "🥈" },
    { rank: 3,  name: "KilimanjaroKid",  score: 35000, badge: "🥉" },
    { rank: 4,  name: "MombasaMaster",   score: 30000, badge: "⭐" },
    { rank: 5,  name: "SerengtiSage",    score: 25000, badge: "⭐" },
    { rank: 6,  name: "RiftValleyRex",   score: 20000, badge: "⭐" },
    { rank: 7,  name: "LakeVictoriaVip", score: 15000, badge: "⭐" },
    { rank: 8,  name: "NakuruNerd",      score: 13000, badge: "⭐" },
    { rank: 9,  name: "AberdareAce",     score: 12000, badge: "⭐" },
    { rank: 10, name: "TsavoTrivia",     score: 10000, badge: "⭐" },
];

interface Props {
    playerScore: number;
    playerName?: string;
    onPlayAgain: () => void;
    onClose: () => void;
}

export const LeaderboardScreen: FC<Props> = ({ playerScore, playerName = "You", onPlayAgain, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [highlightRow, setHighlightRow] = useState(-1);

    // Build list — inject player at correct rank
    const entries: LeaderboardEntry[] = (() => {
        const playerRank = DUMMY_LEADERS.filter(e => e.score > playerScore).length + 1;
        const list = DUMMY_LEADERS.map(e => ({ ...e }));
        const playerEntry: LeaderboardEntry = {
            rank: playerRank,
            name: playerName,
            score: playerScore,
            badge: playerRank <= 3 ? ["👑","🥈","🥉"][playerRank - 1] : "⭐",
            isCurrentPlayer: true,
        };
        // Insert player and re-sort
        list.push(playerEntry);
        list.sort((a, b) => b.score - a.score);
        list.forEach((e, i) => { e.rank = i + 1; });
        return list.slice(0, 10);
    })();

    useEffect(() => {
        const t1 = setTimeout(() => setVisible(true), 50);
        const t2 = setTimeout(() => {
            const idx = entries.findIndex(e => e.isCurrentPlayer);
            if (idx !== -1) setHighlightRow(idx);
        }, 800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    const podium = entries.slice(0, 3);

    return (
        <div className={`lb-root ${visible ? "lb-root--visible" : ""}`}>
            {/* Background particles */}
            <div className="lb-particles">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="lb-particle" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 4}s`,
                        animationDuration: `${3 + Math.random() * 4}s`,
                        width: `${4 + Math.random() * 6}px`,
                        height: `${4 + Math.random() * 6}px`,
                    }} />
                ))}
            </div>

            <div className="lb-panel">
                {/* Header */}
                <div className="lb-header">
                    <div className="lb-trophy">🏆</div>
                    <h2 className="lb-title">Leaderboard</h2>
                    <p className="lb-subtitle">Top players this season</p>
                    <div className="lb-live-badge">
                        <span className="lb-live-dot" />
                        LIVE
                    </div>
                </div>

                {/* Podium top 3 */}
                <div className="lb-podium">
                    {/* 2nd place */}
                    <div className="lb-podium-slot lb-podium-slot--2">
                        <div className="lb-podium-avatar lb-podium-avatar--2">
                            {podium[1]?.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="lb-podium-name">{podium[1]?.name}</div>
                        <div className="lb-podium-score">{podium[1]?.score.toLocaleString()}</div>
                        <div className="lb-podium-block lb-podium-block--2">2nd</div>
                    </div>
                    {/* 1st place */}
                    <div className="lb-podium-slot lb-podium-slot--1">
                        <div className="lb-podium-crown">👑</div>
                        <div className="lb-podium-avatar lb-podium-avatar--1">
                            {podium[0]?.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="lb-podium-name">{podium[0]?.name}</div>
                        <div className="lb-podium-score">{podium[0]?.score.toLocaleString()}</div>
                        <div className="lb-podium-block lb-podium-block--1">1st</div>
                    </div>
                    {/* 3rd place */}
                    <div className="lb-podium-slot lb-podium-slot--3">
                        <div className="lb-podium-avatar lb-podium-avatar--3">
                            {podium[2]?.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="lb-podium-name">{podium[2]?.name}</div>
                        <div className="lb-podium-score">{podium[2]?.score.toLocaleString()}</div>
                        <div className="lb-podium-block lb-podium-block--3">3rd</div>
                    </div>
                </div>

                {/* Full table */}
                <div className="lb-table">
                    {entries.map((entry, i) => (
                        <div
                            key={entry.rank}
                            className={`lb-row
                                ${entry.isCurrentPlayer ? "lb-row--player" : ""}
                                ${i === highlightRow ? "lb-row--highlight" : ""}
                                ${entry.rank <= 3 ? "lb-row--top3" : ""}
                            `}
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <div className="lb-row-rank">
                                {entry.rank <= 3
                                    ? ["🥇","🥈","🥉"][entry.rank - 1]
                                    : <span className="lb-row-rank-num">{entry.rank}</span>
                                }
                            </div>
                            <div className="lb-row-avatar">
                                {entry.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="lb-row-name">
                                {entry.name}
                                {entry.isCurrentPlayer && <span className="lb-you-tag">YOU</span>}
                            </div>
                            <div className="lb-row-score">
                                {entry.score.toLocaleString()}
                                <span className="lb-row-pts">pts</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="lb-actions">
                    <button className="lb-btn lb-btn--play" onClick={onPlayAgain}>
                        🔄 Play Again
                    </button>
                    <button className="lb-btn lb-btn--close" onClick={onClose}>
                        🏠 Home
                    </button>
                </div>

                <p className="lb-disclaimer">* Leaderboard data is for display purposes · Live data coming soon</p>
            </div>
        </div>
    );
};