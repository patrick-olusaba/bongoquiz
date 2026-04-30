import { type FC, useEffect, useState } from "react";
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

const DUMMY: LeaderboardEntry[] = [
  { rank: 1, name: "GraceW",   score: 1850 },
  { rank: 2, name: "FaithK",   score: 1620 },
  { rank: 3, name: "DavidM",   score: 1410 },
  { rank: 4, name: "RuthN",    score: 1200 },
  { rank: 5, name: "SolomonO", score: 980  },
  { rank: 6, name: "MaryJ",    score: 860  },
  { rank: 7, name: "PaulT",    score: 740  },
  { rank: 8, name: "EstherA",  score: 610  },
  { rank: 9, name: "JoshuaB",  score: 490  },
  { rank: 10, name: "NaomiC",  score: 350  },
];

const LeaderboardScreen: FC<Props> = ({ playerScore, playerName = "You", onPlayAgain, onClose }) => {
  const [visible, setVisible] = useState(false);

  // Merge player into list
  const entries: LeaderboardEntry[] = (() => {
    const list = DUMMY.map(e => ({ ...e, isCurrentPlayer: false }));
    const playerEntry = { rank: 0, name: playerName, score: playerScore, isCurrentPlayer: true };
    const merged = [...list, playerEntry]
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));
    return merged.slice(0, 10);
  })();

  const podium = entries.slice(0, 3);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

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
