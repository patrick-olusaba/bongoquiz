import { type FC, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase.ts";
import "../style/leaderboard.css";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
}

interface Props {
  playerScore: number;
  playerName?: string;
  onPlayAgain: () => void;
  onClose: () => void;
}

const LeaderboardScreen: FC<Props> = ({ playerScore, playerName = "You", onPlayAgain, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const sqlFetch = fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard")
      .then(r => r.json()).catch(() => []);
    const fbFetch  = getDocs(collection(db, "bibleQuizLeaderboard"))
      .then(snap => snap.docs.map(d => ({ ...d.data(), id: d.id }))).catch(() => []);

    Promise.all([sqlFetch, fbFetch]).then(([sqlRaw, fbRaw]) => {
      const byPhone = new Map<string, { name: string; score: number }>();
      const toKey = (p: string) => String(p).replace(/^0/, "254");
      const playerPhone254 = toKey(localStorage.getItem("bongo_player_phone") ?? "");

      (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
        const phone = toKey(String(d.msisdn ?? ""));
        const score = d.score ?? 0;
        const masked = phone.replace(/^254/, "0").slice(0, 3) + "*******";
        if (!byPhone.has(phone) || score > byPhone.get(phone)!.score)
          byPhone.set(phone, { name: masked, score });
      });

      (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
        const phone = toKey(d.phone || d.id || "");
        const score = d.score ?? 0;
        const existing = byPhone.get(phone);
        const name = d.name && !/^\d/.test(d.name) ? d.name : existing?.name ?? d.name;
        if (!existing || score > existing.score) byPhone.set(phone, { name, score });
        else if (existing && name && !/^\d/.test(name)) byPhone.set(phone, { ...existing, name });
      });

      const sorted = Array.from(byPhone.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 30)
        .map(([phone, e], i) => ({ rank: i + 1, name: e.name, score: e.score,
          isCurrentPlayer: !!playerPhone254 && phone === playerPhone254 }));
      setEntries(sorted);
    });

    setTimeout(() => setVisible(true), 50);
  }, [playerScore, playerName]);

  const podium = entries.slice(0, 3);

  return (
    <div className={`lb-root${visible ? " lb-root--visible" : ""}`}>
      <div className="lb-panel">
        {/* Header */}
        <div className="lb-header">
          <div className="lb-trophy">🏆</div>
          <h2 className="lb-title">Leaderboard</h2>
          <p className="lb-subtitle">Top Bible Quiz players</p>
          <div className="lb-live-badge"><span className="lb-live-dot" />LIVE</div>
        </div>

        {/* Podium */}
        <div className="lb-podium">
          <div className="lb-podium-slot lb-podium-slot--2">
            <div className="lb-podium-avatar lb-podium-avatar--2">{podium[1]?.name.slice(0,2).toUpperCase()}</div>
            <div className="lb-podium-name">{podium[1]?.name}</div>
            <div className="lb-podium-score">{podium[1]?.score.toLocaleString()}</div>
            <div className="lb-podium-block lb-podium-block--2">2nd</div>
          </div>
          <div className="lb-podium-slot lb-podium-slot--1">
            <div className="lb-podium-crown">👑</div>
            <div className="lb-podium-avatar lb-podium-avatar--1">{podium[0]?.name.slice(0,2).toUpperCase()}</div>
            <div className="lb-podium-name">{podium[0]?.name}</div>
            <div className="lb-podium-score">{podium[0]?.score.toLocaleString()}</div>
            <div className="lb-podium-block lb-podium-block--1">1st</div>
          </div>
          <div className="lb-podium-slot lb-podium-slot--3">
            <div className="lb-podium-avatar lb-podium-avatar--3">{podium[2]?.name.slice(0,2).toUpperCase()}</div>
            <div className="lb-podium-name">{podium[2]?.name}</div>
            <div className="lb-podium-score">{podium[2]?.score.toLocaleString()}</div>
            <div className="lb-podium-block lb-podium-block--3">3rd</div>
          </div>
        </div>

        {/* Table */}
        <div className="lb-table">
          {entries.map((entry, i) => (
            <div
              key={entry.rank}
              className={`lb-row${entry.isCurrentPlayer ? " lb-row--player" : ""}${entry.rank <= 3 ? " lb-row--top3" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="lb-row-rank">
                {entry.rank <= 3
                  ? ["🥇","🥈","🥉"][entry.rank - 1]
                  : <span className="lb-row-rank-num">{entry.rank}</span>}
              </div>
              <div className="lb-row-avatar">{entry.name.slice(0,2).toUpperCase()}</div>
              <div className="lb-row-name">
                {entry.name}
                {entry.isCurrentPlayer && <span className="lb-you-tag">YOU</span>}
              </div>
              <div className="lb-row-score">{entry.score.toLocaleString()}<span className="lb-row-pts">pts</span></div>
            </div>
          ))}
        </div>

        <div className="lb-actions">
          <button className="lb-btn lb-btn--play" onClick={onPlayAgain}>🔄 Play Again</button>
          <button className="lb-btn lb-btn--close" onClick={onClose}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardScreen;
