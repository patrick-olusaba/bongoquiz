import { FC, useState } from 'react';
import logoBg from '../../assets/logo.png';

export const QuizTopBar: FC = () => {
    const playerName = localStorage.getItem('bongo_player_name') ?? 'Player';
    const totalPoints = parseInt(localStorage.getItem('bongo_total_points') ?? '0');
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'calc(10px + env(safe-area-inset-top)) 16px 10px',
            background: 'rgba(10,0,40,0.85)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a href="/"><img src={logoBg} alt="Bongo Quiz" style={{ height: 40, width: 'auto' }} /></a>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 100, padding: '5px 12px',
                }}>
                    <span style={{ fontSize: '1rem' }}>🪙</span>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>{totalPoints.toLocaleString()}</span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7B61FF, #FF6B6B)',
                    border: '2px solid #a855f7', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1rem',
                }}>{playerName.charAt(0).toUpperCase()}</div>
                <button onClick={() => setMenuOpen(o => !o)} style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 5,
                }}>
                    {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: 18, height: 2, background: 'rgba(255,255,255,0.85)', borderRadius: 2 }} />)}
                </button>
            </div>
            {menuOpen && (
                <div style={{
                    position: 'fixed', top: 60, right: 16, background: 'rgba(15,0,53,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '8px 0',
                    minWidth: 180, zIndex: 200, backdropFilter: 'blur(20px)',
                }}>
                    <a href="/" style={{ display: 'block', padding: '12px 18px', color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}>🏠 Home</a>
                    <a href="/bible-quiz" style={{ display: 'block', padding: '12px 18px', color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}>📖 Bible Quiz</a>
                    <a href="/biology-quiz" style={{ display: 'block', padding: '12px 18px', color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}>🔬 Biology Quiz</a>
                </div>
            )}
        </div>
    );
};
