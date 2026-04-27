// LeaderboardScreen.tsx
import { type FC, useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.ts";
import '../../styles/Leaderboardscreen.css';

interface LeaderboardEntry {
    rank: number;
    name: string;
    phone?: string;
    score: number;
    badge: string;
    isCurrentPlayer?: boolean;
}

interface Props {
    playerScore: number;
    playerName?: string;
    onPlayAgain: () => void;
    onClose: () => void;
}

export const LeaderboardScreen: FC<Props> = ({ playerScore, playerName = "You", onPlayAgain, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [highlightRow, setHighlightRow] = useState(-1);
    const [dbLeaders, setDbLeaders] = useState<LeaderboardEntry[]>([]);
    const savedRef = useRef(false);

    useEffect(() => {
        // Save this player's score first
        if (!savedRef.current) {
            savedRef.current = true;
            const phone = localStorage.getItem("bongo_player_phone") ?? "";
            const leaderboardKey = `lb_${phone}_${playerScore}`;
            const lastSaved = sessionStorage.getItem("last_leaderboard_saved");
            
            if (lastSaved !== leaderboardKey && phone) {
                sessionStorage.setItem("last_leaderboard_saved", leaderboardKey);
                addDoc(collection(db, "leaderboard"), {
                    name: playerName, phone, score: playerScore, playedAt: serverTimestamp(),
                }).catch(() => {});
            }
        }
        
        // Fetch from company API first, fall back to Firebase
        fetch("http://143.244.158.85:3535/api/leaderboard/public/top10")
            .then(r => r.json())
            .then(json => {
                const apiData: any[] = json.data ?? [];
                if (apiData.length > 0) {
                    setDbLeaders(apiData.map((d, i) => ({
                        rank: d.rank ?? i + 1,
                        name: d.playerName ?? d.name,
                        phone: d.phone ?? "",
                        score: d.score,
                        badge: i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐",
                    })));
                    return;
                }
                throw new Error("empty");
            })
            .catch(() => {
                // Fallback: Firebase
                getDocs(collection(db, "leaderboard")).then(snap => {
                    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    const byPhone = new Map<string, any>();
                    all.forEach(entry => {
                        const phone = entry.phone || entry.id;
                        const existing = byPhone.get(phone);
                        if (!existing || (entry.score ?? 0) > (existing.score ?? 0)) byPhone.set(phone, entry);
                    });
                    const sorted = Array.from(byPhone.values())
                        .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
                        .slice(0, 10)
                        .map((d, i) => ({
                            rank: i + 1,
                            name: d.name as string,
                            phone: d.phone as string,
                            score: d.score as number,
                            badge: i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐",
                        }));
                    setDbLeaders(sorted);
                }).catch(() => {});
            });
    }, [playerScore, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

    // Mark current player in the fetched list
    const entries: LeaderboardEntry[] = dbLeaders.map(e => ({
        ...e,
        isCurrentPlayer: e.name === playerName && e.score === playerScore,
    }));

    useEffect(() => {
        const t1 = setTimeout(() => setVisible(true), 50);
        const t2 = setTimeout(() => {
            const idx = entries.findIndex(e => e.isCurrentPlayer);
            if (idx !== -1) setHighlightRow(idx);
        }, 800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [dbLeaders]); // re-run once data loads

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
                    {entries.map((entry, i) => {
                        const maskedPhone = entry.phone 
                            ? entry.phone.slice(0, 4) + "******" 
                            : "";
                        
                        return (
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
                                    {maskedPhone && <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 2 }}>{maskedPhone}</div>}
                                </div>
                                <div className="lb-row-score">
                                    {entry.score.toLocaleString()}
                                    <span className="lb-row-pts">pts</span>
                                </div>
                            </div>
                        );
                    })}
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