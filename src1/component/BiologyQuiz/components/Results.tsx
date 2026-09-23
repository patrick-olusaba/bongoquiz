import React from 'react';
import type { LeaderboardEntry } from '../types';

interface Props {
  score: number;
  correctCount: number;
  wrongCount: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  leaderboard: LeaderboardEntry[];
  playerName: string;
}

export const Results: React.FC<Props> = ({ score, correctCount, wrongCount, onPlayAgain, onBackToMenu, leaderboard, playerName }) => {
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  const playerRank = sorted.findIndex(e => e.name === playerName) + 1;
  const podium = sorted.slice(0, 3);

  const initials = (name: string) => (name || '??').slice(0, 2).toUpperCase();

  return (
    <div style={{
      minHeight: '100svh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: "'Trebuchet MS','Segoe UI',sans-serif", boxSizing: 'border-box',
      background: 'radial-gradient(ellipse at 50% 0%, #003320 0%, #001a0e 45%, #000 100%)',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))',
        border: '1px solid rgba(0,220,100,0.2)', borderRadius: 28, padding: '24px 20px 20px',
        backdropFilter: 'blur(20px)', boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,220,100,0.1)',
        animation: 'bioLbIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2.4rem', animation: 'bioTrophyBounce 2s ease-in-out infinite' }}>🏆</div>
          <h2 style={{
            fontSize: '1.7rem', fontWeight: 900, margin: '4px 0 2px',
            background: 'linear-gradient(90deg,#00DC64,#4ade80,#fbbf24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Leaderboard</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: '0 0 6px', letterSpacing: 1, textTransform: 'uppercase' }}>
            Top Biology Quiz Players
          </p>
          {/* Score display */}
          <div style={{ margin: '8px 0 4px' }}>
            <div style={{ fontSize: 'clamp(2.8rem,12vw,4rem)', fontWeight: 900, color: '#00DC64', lineHeight: 1, textShadow: '0 0 40px rgba(0,220,100,0.6)', letterSpacing: -1 }}>
              {score.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(0,220,100,0.6)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>points</div>
            <div style={{ display: 'inline-flex', gap: 10, background: 'rgba(0,220,100,0.06)', border: '1px solid rgba(0,220,100,0.2)', borderRadius: 20, padding: '4px 14px', fontSize: '0.78rem' }}>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>✅ {correctCount} correct</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ color: '#fca5a5', fontWeight: 700 }}>❌ {wrongCount} wrong</span>
              {playerRank > 0 && <><span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span><span style={{ color: '#fbbf24', fontWeight: 800 }}>#{playerRank}</span></>}
            </div>
          </div>
        </div>

        {/* Podium */}
        {sorted.length >= 1 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 14, height: 140 }}>
            {/* 2nd */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, animation: 'bioLbPodiumIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
              {podium[1] && <>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#C0C0C0,#808080)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', marginBottom: 3, border: '2px solid rgba(255,255,255,0.2)' }}>{initials(podium[1].name)}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 2, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podium[1].name}</div>
                <div style={{ fontSize: '0.64rem', fontWeight: 900, color: '#00DC64', marginBottom: 3 }}>{podium[1].score.toLocaleString()}</div>
                <div style={{ width: '100%', height: 38, borderRadius: '8px 8px 0 0', background: 'linear-gradient(180deg,rgba(192,192,192,0.2),rgba(192,192,192,0.05))', border: '1px solid rgba(192,192,192,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>2nd</div>
              </>}
            </div>
            {/* 1st */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, animation: 'bioLbPodiumIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
              {podium[0] && <>
                <div style={{ fontSize: '1rem', marginBottom: 2 }}>👑</div>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#00DC64,#00a84a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: 3, border: '2px solid rgba(0,220,100,0.4)', boxShadow: '0 0 16px rgba(0,220,100,0.5)' }}>{initials(podium[0].name)}</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podium[0].name}</div>
                <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#00DC64', marginBottom: 3 }}>{podium[0].score.toLocaleString()}</div>
                <div style={{ width: '100%', height: 52, borderRadius: '8px 8px 0 0', background: 'linear-gradient(180deg,rgba(0,220,100,0.25),rgba(0,220,100,0.08))', border: '1px solid rgba(0,220,100,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>1st</div>
              </>}
            </div>
            {/* 3rd */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, animation: 'bioLbPodiumIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' }}>
              {podium[2] && <>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#CD7F32,#8B4513)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', marginBottom: 3, border: '2px solid rgba(255,255,255,0.2)' }}>{initials(podium[2].name)}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 2, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podium[2].name}</div>
                <div style={{ fontSize: '0.64rem', fontWeight: 900, color: '#00DC64', marginBottom: 3 }}>{podium[2].score.toLocaleString()}</div>
                <div style={{ width: '100%', height: 26, borderRadius: '8px 8px 0 0', background: 'linear-gradient(180deg,rgba(205,127,50,0.2),rgba(205,127,50,0.05))', border: '1px solid rgba(205,127,50,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>3rd</div>
              </>}
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
          {sorted.map((entry, i) => {
            const isPlayer = entry.name === playerName;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                background: isPlayer ? 'linear-gradient(90deg,rgba(0,220,100,0.15),rgba(74,222,128,0.08))' : i < 3 ? 'rgba(0,220,100,0.04)' : 'rgba(255,255,255,0.03)',
                border: isPlayer ? '1px solid rgba(0,220,100,0.4)' : i < 3 ? '1px solid rgba(0,220,100,0.12)' : '1px solid rgba(255,255,255,0.06)',
                animation: `bioLbRowIn 0.4s ease ${i * 0.05}s both`,
              }}>
                <div style={{ width: 26, textAlign: 'center', fontSize: i < 3 ? '1rem' : '0.75rem', fontWeight: 700, color: i < 3 ? undefined : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </div>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,220,100,0.5),rgba(74,222,128,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, color: '#fff', flexShrink: 0, border: '1px solid rgba(0,220,100,0.3)' }}>
                  {initials(entry.name)}
                </div>
                <div style={{ flex: 1, fontSize: '0.84rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {entry.name}
                  {isPlayer && <span style={{ fontSize: '0.58rem', fontWeight: 900, color: '#00DC64', background: 'rgba(0,220,100,0.2)', border: '1px solid rgba(0,220,100,0.4)', borderRadius: 6, padding: '1px 6px', letterSpacing: 1, flexShrink: 0 }}>YOU</span>}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#00DC64', flexShrink: 0 }}>
                  {entry.score.toLocaleString()}<span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginLeft: 3 }}>pts</span>
                </div>
              </div>
            );
          })}
          {!sorted.length && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', padding: '16px 0' }}>No players yet</p>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onPlayAgain} style={{ flex: 1, border: 'none', borderRadius: 50, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 800, padding: '12px 16px', background: 'linear-gradient(135deg,#00DC64,#00a84a)', color: '#fff', boxShadow: '0 4px 20px rgba(0,220,100,0.4)', transition: 'transform 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            🔄 Play Again
          </button>
          <button onClick={onBackToMenu} style={{ flex: 1, borderRadius: 50, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 800, padding: '12px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', transition: 'transform 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            🏠 Home
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bioLbIn { from{transform:translateY(40px) scale(0.96);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        @keyframes bioTrophyBounce { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-6px) rotate(3deg)} }
        @keyframes bioLbPodiumIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes bioLbRowIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
};
