import React, { useState, useEffect } from 'react';
import { Timer, Trophy, Star, Menu, X, HelpCircle, User, ScrollText } from 'lucide-react';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
import type { LeaderboardEntry } from '../types';
import { EditProfileModal } from '../../BiologyQuiz/components/EditProfileModal';
import { BrowseGames } from '../../game/BrowseGames';

interface Props {
  onStartGame: (name: string, phone: string) => void;
  playerName: string;
  setPlayerName: (n: string) => void;
  playerPhone: string;
  setPlayerPhone: (p: string) => void;
  leaderboard: LeaderboardEntry[];
}

const colors = ['#4ade80','#22d3ee','#facc15','#f472b6','#a78bfa'];
const symbols = ['+','−','×','÷','=','%','²','√','π','∑','!','≠','∞','≤'];

export const LandingPage: React.FC<Props> = ({ onStartGame, playerName, setPlayerName, playerPhone, setPlayerPhone, leaderboard }) => {
  const [isEditing, setIsEditing]       = useState(false);
  const [isMenuOpen, setIsMenuOpen]     = useState(false);
  const [showLb, setShowLb]             = useState(false);
  const [showHtp, setShowHtp]           = useState(false);
  const [showHistory, setShowHistory]         = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [ripples, setRipples]           = useState<{id:number,x:number,y:number}[]>([]);

  const phone254 = playerPhone ? playerPhone.replace(/^0/, '254') : '';
  const myEntry = leaderboard.find((d: any) => String(d.msisdn) === phone254 || String(d.msisdn) === playerPhone || d.phone === playerPhone);
  const totalPoints = myEntry?.score ?? 0;
  const personalBest = parseInt(localStorage.getItem('math_best_score') ?? '0');

  useEffect(() => {
    const h = () => setShowLb(true);
    window.addEventListener('show-leaderboard', h);
    return () => window.removeEventListener('show-leaderboard', h);
  }, []);

  const addRipple = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now();
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 900);
  };

  const handlePlay = () => {
    if (playerName && playerPhone) onStartGame(playerName, playerPhone);
    else setIsEditing(true);
  };

  const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  const initials = (n: string) => (n || '??').slice(0, 2).toUpperCase();

  return (
    <div onClick={addRipple} style={{ position: 'relative', zIndex: 1, minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Trebuchet MS','Segoe UI',sans-serif", background: '#060412', color: '#fff', overflowX: 'hidden' }}>

      <style>{`
        @keyframes lp-drift{0%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-35px) rotate(180deg)}100%{transform:translateY(12px) rotate(360deg)}}
        @keyframes lp-orbit{from{transform:rotate(0deg) translateX(var(--r)) rotate(0deg)}to{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)}}
        @keyframes lp-ring{0%{transform:scale(0.6);opacity:0.5}100%{transform:scale(2.8);opacity:0}}
        @keyframes lp-ripple{0%{transform:scale(0);opacity:0.6}100%{transform:scale(4);opacity:0}}
        @keyframes lp-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes lp-glow{0%,100%{box-shadow:0 0 30px rgba(74,222,128,0.3)}50%{box-shadow:0 0 70px rgba(74,222,128,0.7),0 0 120px rgba(74,222,128,0.2)}}
        @keyframes lp-bgshift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      `}</style>

      {/* Animated gradient bg */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'linear-gradient(135deg,#060412,#0a0a1a,#060d06,#060412,#0d0620)', backgroundSize: '400% 400%', animation: 'lp-bgshift 8s ease infinite' }} />

      {/* Drifting symbols */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {symbols.map((s, i) => (
          <span key={i} style={{ position: 'absolute', fontWeight: 900, userSelect: 'none', fontSize: `${2+(i%4)*1.5}rem`, color: colors[i%colors.length], opacity: 0.1+(i%3)*0.04, left: `${(i*7+3)%92}%`, top: `${(i*11+5)%88}%`, animation: `lp-drift ${4+i%5}s ease-in-out ${i*0.3}s infinite` }}>{s}</span>
        ))}
        {/* Orbiting dots */}
        <div style={{ position: 'absolute', left: '50%', top: '35%' }}>
          {[80,120,160].map((r,i) => (
            <div key={i} style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: colors[i], boxShadow: `0 0 8px ${colors[i]}`, opacity: 0.3, animation: `lp-orbit ${5+i*2}s linear ${i*0.8}s infinite`, transformOrigin: '0 0', ['--r' as any]: `${r}px` }} />
          ))}
        </div>
        {/* Pulse rings */}
        {[0,1,2].map(i => (
          <div key={i} style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(74,222,128,0.15)', left: 'calc(50% - 150px)', top: '20%', animation: `lp-ring 3s ease-out ${i}s infinite` }} />
        ))}
      </div>

      {/* Click ripples */}
      {ripples.map(r => (
        <div key={r.id} style={{ position: 'fixed', width: 120, height: 120, borderRadius: '50%', border: '2px solid rgba(74,222,128,0.6)', left: r.x-60, top: r.y-60, pointerEvents: 'none', zIndex: 1, animation: 'lp-ripple 0.9s ease-out forwards' }} />
      ))}


      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem 0.5rem' }}>
        {/* MathQuiz Logo + coins */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4ade80,#22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#000', boxShadow: '0 0 12px rgba(74,222,128,0.5)' }}>∑</div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#4ade80', letterSpacing: 1 }}>Math</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#facc15', letterSpacing: 3, textTransform: 'uppercase' }}>Quiz</div>
            </div>
          </div>
          {playerPhone && /^07\d{8}$/.test(playerPhone) && totalPoints > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ fontSize: '0.9rem' }}>🪙</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffd200' }}>{totalPoints.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {personalBest > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ fontSize: '0.9rem' }}>🏆</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffd200' }}>{personalBest.toLocaleString()}</span>
            </div>
          )}
          <button onClick={() => setIsMenuOpen(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 10px', color: '#fff', cursor: 'pointer' }}>
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 600, padding: '0 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '5px 16px', marginBottom: '1rem', marginTop: '0.5rem' }}>
          <Star size={12} style={{ color: '#facc15', fill: '#facc15' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: 4 }}>Math Challenge</span>
          <Star size={12} style={{ color: '#facc15', fill: '#facc15' }} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: 'clamp(4rem,18vw,7rem)', fontWeight: 900, lineHeight: 1, letterSpacing: -2, WebkitTextStroke: '2px #4ade80', color: 'transparent', filter: 'drop-shadow(0 0 20px rgba(74,222,128,0.5))' }}>MATH</div>
          <div style={{ fontSize: 'clamp(3rem,14vw,5.5rem)', fontWeight: 900, lineHeight: 1, letterSpacing: 4, color: '#facc15', filter: 'drop-shadow(0 0 15px rgba(250,204,21,0.5))' }}>BONGO</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 8 }}>Quiz · Compete · Win</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%', margin: '1.25rem 0' }}>
          {[
            { icon: <Timer size={16} />, label: '60s', sub: 'Per Round', color: '#22d3ee', border: 'rgba(34,211,238,0.2)', bg: 'rgba(34,211,238,0.05)' },
            { icon: <Trophy size={16} />, label: '+100', sub: 'Per Correct', color: '#4ade80', border: 'rgba(74,222,128,0.2)', bg: 'rgba(74,222,128,0.05)' },
            { icon: <Star size={16} />, label: 'KES 20', sub: 'Entry Fee', color: '#facc15', border: 'rgba(250,204,21,0.2)', bg: 'rgba(250,204,21,0.05)' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: s.color }}>{s.label}</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{s.sub}</span>
            </div>
          ))}
        </div>

        {/* Player card */}
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#4ade80,#22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: '#000' }}>{initials(playerName)}</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{playerName || 'Set your name'}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{playerPhone || 'Set your phone'}</div>
            </div>
          </div>
          <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <User size={12} /> Edit
          </button>
        </div>

        {/* Play button */}
        <button onClick={handlePlay} style={{ width: '100%', padding: '1.1rem', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: '1.1rem', letterSpacing: 3, textTransform: 'uppercase', color: '#000', cursor: 'pointer', marginBottom: '0.75rem', background: 'linear-gradient(135deg,#4ade80,#22d3ee)', animation: 'lp-glow 2s ease-in-out infinite' }}>
           PLAY NOW
        </button>

        {/* Browse games */}
        <div style={{ width: '100%', marginBottom: '2rem' }}>
          <BrowseGames exclude="Math Quiz" />
        </div>
      </div>

      {/* Slide-out menu */}
      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setIsMenuOpen(false)}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 260, background: '#0a0518', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsMenuOpen(false)} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            {[
              { icon: <HelpCircle size={16} />, label: 'How to Play', action: () => { setShowHtp(true); setIsMenuOpen(false); } },
              // { icon: <Trophy size={16} />, label: 'Leaderboard', action: () => { setShowLb(true); setIsMenuOpen(false); } },
              { icon: <User size={16} />, label: 'Edit Profile', action: () => { setIsEditing(true); setIsMenuOpen(false); } },
              { icon: <ScrollText size={16} />, label: 'Game History', action: () => {
                setIsMenuOpen(false);
                setShowHistory(true);
                setHistorySessions([]);
                // resolve phone from all possible sources
                const phone = playerPhone
                  || localStorage.getItem('bongo_player_phone')
                  || localStorage.getItem('math_player_phone')
                  || '';
                if (!phone) return;
                // normalise to 07XXXXXXXX (the format the function saves)
                const phone07 = phone.startsWith('254') ? '0' + phone.slice(3) : phone;
                setHistoryLoading(true);
                getDocs(query(collection(getFirestore(), 'mathQuizSessions'), where('phone', '==', phone07), limit(20)))
                  .then(snap => setHistorySessions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
                  .catch(() => setHistorySessions([]))
                  .finally(() => setHistoryLoading(false));
              }},
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.75rem 1rem', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* How to Play */}
      {showHtp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowHtp(false)}>
          <div style={{ background: '#0a0518', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#4ade80', fontWeight: 900, margin: 0 }}>🧮 How to Play</h3>
              <button onClick={() => setShowHtp(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {[
              { step: '01', title: 'Pay Entry Fee', desc: 'Pay KES 20 via M-Pesa to enter a session.', color: '#f43f5e' },
              { step: '02', title: 'Answer Fast', desc: '60 seconds. +100 correct, −50 wrong or skip.', color: '#4ade80' },
              { step: '03', title: 'Math Questions', desc: 'Arithmetic, algebra, geometry & more.', color: '#22d3ee' },
              { step: '04', title: 'Scoring Rules', desc: 'Time runs out = game over. Highest score wins.', color: '#facc15' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 12, marginBottom: '1rem', background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: '0.75rem 1rem' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 900, color: s.color, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>STEP {s.step}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{s.desc}</div>
                </div>
              </div>
            ))}
            <button onClick={handlePlay} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg,#4ade80,#22d3ee)', border: 'none', borderRadius: 50, color: '#000', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.5rem' }}>Start Playing Now</button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {showLb && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowLb(false)}>
          <div style={{ background: '#0a0518', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '1.5rem', width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#4ade80', fontWeight: 900, margin: 0 }}>🏆 Leaderboard</h3>
              <button onClick={() => setShowLb(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {sorted.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: i<3?'rgba(74,222,128,0.04)':'rgba(255,255,255,0.02)', border: i<3?'1px solid rgba(74,222,128,0.1)':'1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
                <span style={{ width: 22, textAlign: 'center', fontSize: i<3?'0.9rem':'0.7rem', color: i<3?undefined:'rgba(255,255,255,0.3)' }}>{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>{initials(e.name)}</div>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#4ade80' }}>{e.score.toLocaleString()}<span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>pts</span></span>
              </div>
            ))}
            {!sorted.length && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No players yet</p>}
          </div>
        </div>
      )}

      {/* Edit profile */}
      {isEditing && (
        <EditProfileModal
          isOpen={isEditing}
          currentName={playerName}
          currentPhone={playerPhone}
          onSave={(name, phone) => { setPlayerName(name); setPlayerPhone(phone); setIsEditing(false); }}
          onClose={() => setIsEditing(false)}
        />
      )}

      {/* Game History */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowHistory(false)}>
          <div style={{ background: '#0a0518', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '1.5rem', width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#4ade80', fontWeight: 900, margin: 0 }}>📜 Game History</h3>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {historyLoading ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading...</p>
            ) : historySessions.length > 0 ? (
              historySessions.map((s: any) => (
                <div key={s.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80' }}>{s.score || 0} pts</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                      {s.playedAt ? new Date(s.playedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {s.total || 0} questions · {s.correct || 0} correct
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No game history found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
