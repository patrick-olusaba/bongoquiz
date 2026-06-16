// LeaderboardScreen.tsx
import { type FC, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.ts";
import { Bell, ChevronDown, Coins, Gift, Menu, Trophy, Wallet } from "lucide-react";
import { BrowseGames } from "./BrowseGames.tsx";
import { getBongoCoinBalance } from "../../utils/bongoWallet.ts";
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

    useEffect(() => {
        // Score is already saved by saveGameSession cloud function — no client write needed

        // Fetch from both sources and merge
        const sqlFetch = fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard")
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

            const sorted = Array.from(byPhone.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 30)
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
    const playerPhone254 = (localStorage.getItem("bongo_player_phone") ?? "").replace(/^0/, "254");
    const entries: LeaderboardEntry[] = dbLeaders.map(e => ({
        ...e,
        isCurrentPlayer: !!playerPhone254 && e.phone === playerPhone254,
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
    const rankRows = entries.slice(3, 10);
    const balance = useMemo(() => getBongoCoinBalance(), []);
    const podiumOrder = [podium[1], podium[0], podium[2]];
    const podiumMeta = [
        { place: "2nd", cls: "second", rank: 2 },
        { place: "1st", cls: "first", rank: 1 },
        { place: "3rd", cls: "third", rank: 3 },
    ];

    return (
        <div className={`lb-root lb-page ${visible ? "lb-root--visible" : ""}`}>
            <div className="lb-particles">
                {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="lb-particle" style={{
                        left: `36.25309837696273%`,
                        animationDelay: `3.1296407923685408s`,
                        animationDuration: `3.66115557928269s`,
                        width: `6.738549569296059px`,
                        height: `6.140285736750638px`,
                    }} />
                ))}
            </div>

            <header className="lb-topbar">
                <div className="lb-brand">BONGO<br/><span>QUIZ</span></div>
                <div className="lb-balance"><Coins size={28}/><strong>{balance.toLocaleString()}</strong></div>
                <div className="lb-top-actions">
                    <button type="button"><Wallet size={28}/><span>Wallet</span></button>
                    <button type="button"><Gift size={28}/><em>1</em><span>Rewards</span></button>
                    <button type="button"><Bell size={28}/><span>Alerts</span></button>
                    <button type="button"><Menu size={30}/><span>Menu</span></button>
                </div>
            </header>

            <main className="lb-content">
                <section className="lb-page-head">
                    <div className="lb-head-copy">
                        <div className="lb-head-icon"><Trophy size={42}/></div>
                        <div>
                            <h1>Leaderboard</h1>
                            <p>Top players this season</p>
                        </div>
                    </div>
                    <button type="button" className="lb-season-btn">Season 1 <ChevronDown size={18}/></button>
                </section>

                <section className="lb-podium-cards" aria-label="Top players">
                    {podiumOrder.map((entry, index) => {
                        const meta = podiumMeta[index];
                        return (
                            <article key={meta.place} className={`lb-podium-card ${meta.cls}`}>
                                <div className="lb-place-badge">{meta.rank}</div>
                                {meta.rank === 1 && <div className="lb-card-crown">👑</div>}
                                <div className="lb-card-avatar">{entry?.name.slice(0, 2).toUpperCase() || "--"}</div>
                                <strong>{entry?.name || "Player"}</strong>
                                <span><Coins size={19}/>{(entry?.score ?? 0).toLocaleString()}</span>
                                <b>{meta.place}</b>
                            </article>
                        );
                    })}
                </section>

                <section className="lb-board-card">
                    <div className="lb-tabs"><button type="button" className="active">🌐 Global</button><button type="button">👥 Friends</button></div>
                    <div className="lb-board-table">
                        <div className="lb-board-header"><span>Rank</span><span>Player</span><span>Points</span><span>Trend</span></div>
                        {rankRows.map((entry, i) => {
                            const trend = ["↑ 2", "↓ 1", "—", "↑ 3", "↓ 2", "—", "↑ 1"][i] || "—";
                            const maskedPhone = entry.phone ? entry.phone.replace(/^254/, "0").slice(0, 3) + "*******" : "";
                            return (
                                <div key={entry.rank} className={`lb-board-row ${entry.isCurrentPlayer ? "is-player" : ""}`}>
                                    <span className="lb-board-rank">{entry.rank}</span>
                                    <span className="lb-board-player"><i>{entry.name.slice(0, 2).toUpperCase()}</i><b>{entry.name}</b>{maskedPhone && <small>{maskedPhone}</small>}</span>
                                    <span className="lb-board-points">{entry.score.toLocaleString()}</span>
                                    <span className={`lb-board-trend ${trend.includes("↓") ? "down" : trend.includes("↑") ? "up" : ""}`}>{trend}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="lb-more-games"><BrowseGames exclude="Bongo Quiz" /></section>
            </main>
        </div>
    );
};