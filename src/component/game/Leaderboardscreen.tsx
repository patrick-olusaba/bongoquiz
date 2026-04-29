// LeaderboardScreen.tsx
import { type FC, useEffect, useState, useRef } from "react";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
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
        // Score is already saved by saveGameSession cloud function — no client write needed

        // Fetch from both sources and merge
        const sqlFetch = fetch("http://142.93.47.187:2027/api/lifetime-leaderboard")
            .then(r => r.json())
            .catch(() => []); // Fallback for HTTPS mixed content blocking

        const fbFetch = getDocs(collection(db, "leaderboard"))
            .then(snap => snap.docs.map(d => ({ ...d.data(), id: d.id })))
            .catch(() => []);

        Promise.all([sqlFetch, fbFetch]).then(([sqlRaw, fbRaw]) => {
            const byPhone = new Map<string, { name: string; phone: string; score: number }>();
            // Normalize all phones to 254... as the canonical map key
            const toKey = (p: string) => String(p).replace(/^0/, "254");

            // SQL data — msisdn is 254..., no name — mask as player label
            (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
                const phone = toKey(String(d.msisdn ?? ""));
                const score = d.score ?? 0;
                const phone07 = phone.replace(/^254/, "0");
                const maskedName = phone07.slice(0, 3) + "*******";
                const existing = byPhone.get(phone);
                if (!existing || score > existing.score)
                    byPhone.set(phone, { name: maskedName, phone, score });
            });

            // Firebase data — may have name, phone stored as 07... or 254...
            // Firebase name takes priority over masked SQL name
            (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
                const phone = toKey(d.phone || d.id || "");
                const score = d.score ?? 0;
                const existing = byPhone.get(phone);
                const name = d.name && !/^\d/.test(d.name) ? d.name : existing?.name ?? d.name;
                if (!existing || score > existing.score)
                    byPhone.set(phone, { name, phone, score });
                else if (existing && name && !/^\d/.test(name))
                    byPhone.set(phone, { ...existing, name }); // update name even if score not higher
            });

            // Sync merged results back to Firebase (upsert highest score per phone)
            byPhone.forEach(({ name, phone, score }) => {
                const phone07 = phone.replace(/^254/, "0");
                setDoc(doc(db, "leaderboard", phone07), { name, phone: phone07, score, updatedAt: serverTimestamp() }, { merge: true })
                    .catch(() => {});
            });

            const sorted = Array.from(byPhone.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((d, i) => ({
                    rank: i + 1,
                    name: d.name,
                    phone: d.phone,
                    score: d.score,
                    badge: i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐",
                }));
            setDbLeaders(sorted);
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
                            ? entry.phone.replace(/^254/, "0").slice(0, 3) + "*******"
                            : "";
                        const showPhone = maskedPhone && !/^\d{3}\*+$/.test(entry.name);
                        
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
                                    {showPhone && <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 2 }}>{maskedPhone}</div>}
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