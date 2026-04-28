// GameHistory.tsx - Shows past game sessions for the current user
import { type FC, useEffect, useState } from "react";
import { getFirestore, collection, query, where, limit, getDocs } from "firebase/firestore";
import "../../styles/SessionSummary.css";

interface HistoryEntry {
    id: string;
    name: string;
    power: string;
    r1Score: number;
    r2Score: number;
    r3Bonus: number;
    total: number;
    playedAt: Date;
}

interface Props {
    onClose: () => void;
}

export const GameHistory: FC<Props> = ({ onClose }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const phone = localStorage.getItem("bongo_player_phone") ?? "";
        console.log("GameHistory: phone =", phone);
        
        if (!phone) { 
            setError("No phone number found. Please set your profile.");
            setLoading(false); 
            return; 
        }

        const db = getFirestore();
        
        // Try without orderBy first (in case index is missing)
        getDocs(
            query(
                collection(db, "gameSessions"),
                where("phone", "==", phone),
                limit(20)
            )
        ).then(snap => {
            console.log("GameHistory: found", snap.size, "sessions");
            const entries = snap.docs.map(d => {
                console.log("Session:", d.id, d.data());
                return {
                    id: d.id,
                    name: d.data().name ?? "Player",
                    power: d.data().power ?? "",
                    r1Score: d.data().r1Score ?? 0,
                    r2Score: d.data().r2Score ?? 0,
                    r3Bonus: d.data().r3Bonus ?? 0,
                    total: d.data().total ?? 0,
                    playedAt: d.data().playedAt?.toDate?.() ?? new Date(0),
                };
            });
            // Sort in memory
            entries.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
            setHistory(entries);
        }).catch(e => {
            console.error("GameHistory error:", e);
            setError("Failed to load history. " + e.message);
        }).finally(() => setLoading(false));
    }, []);

    const formatDate = (d: Date) => {
        if (!d || d.getTime() === 0) return "—";
        return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="session-summary-overlay" onClick={onClose}>
            <div className="session-summary-card" onClick={e => e.stopPropagation()}>
                <div className="session-summary-header">
                    <h2>📜 Game History</h2>
                    <button className="session-summary-close" onClick={onClose}>✕</button>
                </div>

                <div className="session-summary-content">
                    {loading && <p className="history-loading">Loading...</p>}

                    {!loading && error && (
                        <p className="history-empty" style={{ color: "#ff6b6b" }}>{error}</p>
                    )}

                    {!loading && !error && history.length === 0 && (
                        <div className="history-empty">
                            <p>No games found for {localStorage.getItem("bongo_player_phone") || "your phone"}.</p>
                            <p style={{ fontSize: "0.85rem", color: "#888", marginTop: 8 }}>
                                Play a complete game to see it here!
                            </p>
                        </div>
                    )}

                    {history.map((entry, i) => (
                        <div key={entry.id} className="history-entry">
                            <div className="history-rank">#{i + 1}</div>
                            <div className="history-info">
                                <div className="history-date">{formatDate(entry.playedAt)}</div>
                                <div className="history-power">🎁 {entry.power || "No power"}</div>
                                <div className="history-breakdown">
                                    <span>⚡ {entry.r1Score.toLocaleString()}</span>
                                    <span>🗂️ {entry.r2Score.toLocaleString()}</span>
                                    <span>🎡 {entry.r3Bonus.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="history-total">{entry.total.toLocaleString()}<span>pts</span></div>
                        </div>
                    ))}
                </div>

                <button className="session-summary-btn" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};
