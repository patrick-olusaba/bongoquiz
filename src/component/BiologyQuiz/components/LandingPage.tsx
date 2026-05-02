import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../../firebase.ts';
import { Trophy, User, Menu, X, HelpCircle, ScrollText, Link as LinkIcon, Copy, MessageCircle, Check, User as UserIcon } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import { EditProfileModal } from './EditProfileModal';
import logo from '../assets/logo2.png';
import bongoPoster from '../../../assets/gamesposter/bongoquizb.png';
import biblePoster from '../../../assets/gamesposter/Bible-IMG.png';

interface Props {
    onStartGame: (name: string, phone: string) => void;
    playerName: string;
    setPlayerName: (name: string) => void;
    playerPhone: string;
    setPlayerPhone: (phone: string) => void;
    leaderboard: LeaderboardEntry[];
}

const ModalComponent: React.FC<{ title: string, children: React.ReactNode, onClose: () => void }> = ({ title, children, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', padding: '1rem' }}
        onClick={onClose}
    >
        <motion.div
            initial={{ y: 50, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 50, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0f0a21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ color: 'white', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>{title}</h3>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', cursor: 'pointer' }}>
                    <X size={16} />
                </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                {children}
            </div>
        </motion.div>
    </motion.div>
);

export const LandingPage: React.FC<Props> = ({ onStartGame, playerName, setPlayerName, playerPhone, setPlayerPhone, leaderboard }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'none' | 'howToPlay' | 'leaderboard' | 'history' | 'share'>('none');
    const [isCopied, setIsCopied] = useState(false);
    const [historySessions, setHistorySessions] = useState<any[]>([]);

    const hasSavedDetails = Boolean(playerName && playerPhone);

    const handleStartGameClick = () => {
        if (hasSavedDetails) {
            onStartGame(playerName, playerPhone);
        } else {
            setIsEditing(true);
        }
    };

    const handleSaveProfile = (name: string, phone: string) => {
        setPlayerName(name);
        setPlayerPhone(phone);
    };

    const handleShareClick = () => {
        setIsMenuOpen(false);
        setActiveModal('share');
    };

    const handleCopyLink = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (e) {
                console.error('Fallback copy failed', e);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleWhatsAppShare = () => {
        const url = window.location.href;
        const text = encodeURIComponent('Check out this awesome biology speed quiz! Can you beat my score? ' + url);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const topPlayers = [...leaderboard].sort((a, b) => b.score - a.score);
    const playerHistory = leaderboard.filter(e => e.name === playerName && e.phone === playerPhone).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <>
            <EditProfileModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                currentName={playerName}
                currentPhone={playerPhone}
                onSave={handleSaveProfile}
                onStartGame={onStartGame}
            />

            {/* Top Nav Bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', alignItems: 'center', zIndex: 40, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img src={logo} alt="Biology Quiz Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
                </div>
                <button
                    onClick={() => setIsMenuOpen(true)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.75rem', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Slide-out Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMenuOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '50vw', maxWidth: '350px', background: '#0f0a21', height: '100%', boxSizing: 'border-box', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <img src={logo} alt="Biology Quiz Logo" style={{ height: '30px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
                                    <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem', margin: 0, marginLeft: '0.5rem' }}>Menu</h3>
                                </div>
                                <button onClick={() => setIsMenuOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', cursor: 'pointer' }}>
                                    <X size={16} />
                                </button>
                            </div>

                            <div style={{ padding: '0', flex: 1, overflowY: 'auto' }}>
                                <div className="menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('howToPlay'); }}>
                                    <div className="menu-icon help"><HelpCircle size={24} /></div>
                                    <div className="menu-text">
                                        <span>How to Play</span>
                                        <p>Learn the rules</p>
                                    </div>
                                </div>
                                <div className="menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('leaderboard'); }}>
                                    <div className="menu-icon trophy"><Trophy size={24} /></div>
                                    <div className="menu-text">
                                        <span>Leaderboard</span>
                                        <p>See top players</p>
                                    </div>
                                </div>
                                <div className="menu-item" onClick={() => { setIsMenuOpen(false); setIsEditing(true); }}>
                                    <div className="menu-icon user"><User size={24} /></div>
                                    <div className="menu-text">
                                        <span>Edit Profile</span>
                                        <p>{hasSavedDetails ? `${playerName} | ${playerPhone}` : 'Player | No phone set'}</p>
                                    </div>
                                </div>
                                <div className="menu-item" onClick={() => { setIsMenuOpen(false); setActiveModal('history');
                                    const p = localStorage.getItem('biologyPlayerPhone') ?? playerPhone;
                                    if (p) {
                                        getDocs(query(collection(db, 'bioQuizSessions'), where('phone', '==', p), limit(20)))
                                            .then(snap => setHistorySessions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
                                            .catch(() => setHistorySessions([]));
                                    }
                                }}>
                                    <div className="menu-icon history"><ScrollText size={24} /></div>
                                    <div className="menu-text">
                                        <span>Game History</span>
                                        <p>View your past sessions</p>
                                    </div>
                                </div>
                                <div className="menu-item" onClick={handleShareClick}>
                                    <div className="menu-icon share"><LinkIcon size={24} /></div>
                                    <div className="menu-text">
                                        <span>Share</span>
                                        <p>Invite friends to play</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {activeModal === 'howToPlay' && (
                    <ModalComponent key="howToPlay" title="How to Play" onClose={() => setActiveModal('none')}>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            <p style={{ marginBottom: '1rem' }}>Welcome to <strong>Bongo Bio Quiz</strong>!</p>
                            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', listStyleType: 'disc' }}>
                                <li style={{ marginBottom: '0.75rem' }}>Enter your <strong>Name</strong> and <strong>Phone Number</strong> to set your profile.</li>
                                <li style={{ marginBottom: '0.75rem' }}>Top up your account with <strong>KES 20</strong> to start the game (required for each new session).</li>
                                <li style={{ marginBottom: '0.75rem' }}>You will face a series of timed biology questions.</li>
                                <li style={{ marginBottom: '0.75rem' }}>Answer as quickly as possible to earn maximum points.</li>
                                <li style={{ marginBottom: '0.75rem' }}>If you run out of time, the question is marked wrong.</li>
                                <li>Compete with others to climb the <strong>Leaderboard</strong>!</li>
                            </ul>
                            <p>Good luck and have fun!</p>
                        </div>
                    </ModalComponent>
                )}

                {activeModal === 'leaderboard' && (
                    <ModalComponent key="leaderboard" title="Leaderboard" onClose={() => setActiveModal('none')}>
                        {topPlayers.length > 0 ? (<>
                            {/* Podium */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 16, height: 120 }}>
                                {[topPlayers[1], topPlayers[0], topPlayers[2]].map((entry, i) => {
                                    const rank = [2,1,3][i];
                                    const heights = [38, 52, 26];
                                    const avatarSizes = [34, 42, 34];
                                    const colors = ['linear-gradient(135deg,#C0C0C0,#808080)', 'linear-gradient(135deg,#00DC64,#00a84a)', 'linear-gradient(135deg,#CD7F32,#8B4513)'];
                                    const glows = ['none', '0 0 14px rgba(0,220,100,0.5)', 'none'];
                                    if (!entry) return <div key={i} style={{ flex: 1 }} />;
                                    return (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                            {rank === 1 && <span style={{ fontSize: '0.9rem', marginBottom: 2 }}>👑</span>}
                                            <div style={{ width: avatarSizes[i], height: avatarSizes[i], borderRadius: '50%', background: colors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', marginBottom: 3, boxShadow: glows[i], border: '2px solid rgba(255,255,255,0.2)' }}>
                                                {(entry.name || '??').slice(0,2).toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 1, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{entry.name}</div>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#00DC64', marginBottom: 3 }}>{entry.score.toLocaleString()}</div>
                                            <div style={{ width: '100%', height: heights[i], borderRadius: '6px 6px 0 0', background: rank === 1 ? 'linear-gradient(180deg,rgba(0,220,100,0.25),rgba(0,220,100,0.08))' : rank === 2 ? 'linear-gradient(180deg,rgba(192,192,192,0.2),rgba(192,192,192,0.05))' : 'linear-gradient(180deg,rgba(205,127,50,0.2),rgba(205,127,50,0.05))', border: `1px solid ${rank===1?'rgba(0,220,100,0.3)':rank===2?'rgba(192,192,192,0.2)':'rgba(205,127,50,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                                                {rank}{rank===1?'st':rank===2?'nd':'rd'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {topPlayers.map((entry, idx) => {
                                    const isPlayer = entry.name === playerName;
                                    return (
                                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: isPlayer ? 'linear-gradient(90deg,rgba(0,220,100,0.15),rgba(74,222,128,0.08))' : idx < 3 ? 'rgba(0,220,100,0.04)' : 'rgba(255,255,255,0.03)', border: isPlayer ? '1px solid rgba(0,220,100,0.4)' : idx < 3 ? '1px solid rgba(0,220,100,0.1)' : '1px solid rgba(255,255,255,0.06)' }}>
                                            <div style={{ width: 24, textAlign: 'center', fontSize: idx < 3 ? '0.9rem' : '0.72rem', fontWeight: 700, color: idx < 3 ? undefined : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                                                {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
                                            </div>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,220,100,0.5),rgba(74,222,128,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff', flexShrink: 0, border: '1px solid rgba(0,220,100,0.3)' }}>
                                                {(entry.name || '??').slice(0,2).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    {entry.name}
                                                    {isPlayer && <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#00DC64', background: 'rgba(0,220,100,0.2)', border: '1px solid rgba(0,220,100,0.4)', borderRadius: 5, padding: '1px 5px' }}>YOU</span>}
                                                </div>
                                                {entry.phone && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}></div>}
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#00DC64' }}>{entry.score.toLocaleString()} <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>pts</span></div>
                                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(entry.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>) : (
                            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem 0' }}>No players yet. Be the first!</p>
                        )}
                    </ModalComponent>
                )}

                {activeModal === 'history' && (
                    <ModalComponent key="history" title="Game History" onClose={() => setActiveModal('none')}>
                        {!hasSavedDetails ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.7)' }}>
                                <User size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p>Set your profile details first to view your history.</p>
                                <button onClick={() => { setActiveModal('none'); setIsEditing(true); }}
                                    style={{ marginTop: '1rem', background: '#00DC64', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                                    Set Profile
                                </button>
                            </div>
                        ) : historySessions.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {historySessions.map((s, i) => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: i === 0 ? 'rgba(0,220,100,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(0,220,100,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{(s.score ?? 0).toLocaleString()} pts</div>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 2 }}>✅ {s.correct ?? 0} correct · ❌ {s.wrong ?? 0} wrong</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{s.playedAt?.toDate?.()?.toLocaleDateString('en-GB') ?? '—'}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>{s.playedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem 0' }}>No games played yet. Start your first game!</p>
                        )}
                    </ModalComponent>
                )}

                {activeModal === 'share' && (
                    <ModalComponent key="share" title="Share Game" onClose={() => setActiveModal('none')}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: 0 }}>
                                Invite your friends to play and see who gets the highest score!
                            </p>
                            <button
                                onClick={handleWhatsAppShare}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#25D366', color: '#fff', border: 'none', padding: '1rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', outline: 'none' }}
                            >
                                <MessageCircle size={24} />
                                Share on WhatsApp
                            </button>
                            <button
                                onClick={handleCopyLink}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '1rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', outline: 'none' }}
                            >
                                {isCopied ? <Check size={24} style={{ color: '#10b981' }} /> : <Copy size={24} />}
                                {isCopied ? 'Link Copied!' : 'Copy Game Link'}
                            </button>
                        </div>
                    </ModalComponent>
                )}
            </AnimatePresence>

            {/* Main Landing Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="center-content landing-center"
                style={{ paddingTop: '60px', alignItems: 'flex-start' }}
            >
                <div className="main-container" style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem 2rem' }}>

                    {/* Badge */}
                    <div style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: '2rem', padding: '0.35rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1rem' }}>🧬</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', letterSpacing: '2px', textTransform: 'uppercase' }}>How well do you know Biology?</span>
                    </div>

                    {/* Title */}
                    <h1 style={{ margin: '0 0 0.25rem', lineHeight: 0.9, textAlign: 'center' }}>
                        <span style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', fontSize: 'clamp(3.5rem, 14vw, 6rem)', fontWeight: 900, color: '#4ade80', textShadow: '0 0 40px rgba(74,222,128,0.6), 0 4px 0 rgba(0,0,0,0.4)', letterSpacing: '-2px' }}>
                            {"BIOLOGY".split('').map((char, i) => (
                                <motion.span key={i}
                                    animate={{ rotateY: [0, 360, 360], y: [0, -20, 0, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.1, times: [0, 0.4, 0.8, 1], ease: 'easeInOut' }}
                                    style={{ display: 'inline-block', transformStyle: 'preserve-3d' }}>{char}</motion.span>
                            ))}
                        </span>
                        <span style={{ display: 'block', fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 30px rgba(251,191,36,0.5), 0 4px 0 rgba(0,0,0,0.4)', letterSpacing: '4px' }}>QUIZ</span>
                    </h1>

                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', textAlign: 'center', margin: '0.75rem 0 1.25rem', letterSpacing: '0.5px' }}>
                        Test your knowledge of Biology
                    </p>

                    {/* Profile pill */}
                    <button onClick={() => setIsEditing(true)} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '2rem', padding: '0.5rem 1.25rem', color: '#fff', fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        marginBottom: '1.5rem', backdropFilter: 'blur(4px)', fontWeight: 600,
                        transition: 'background 0.2s',
                    }}>
                        <UserIcon size={14} style={{ opacity: 0.6 }} />
                        {hasSavedDetails ? `${playerName} | ${playerPhone}` : 'Set your name & phone'}
                        <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>✏️</span>
                    </button>

                    {/* Step cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', width: '100%', marginBottom: '1.5rem' }}>
                        {[
                            { step: '01', icon: '💳', title: 'Pay & Enter', sub: 'KES 20 M-Pesa', color: '#f43f5e' },
                            { step: '02', icon: '🔬', title: 'Answer Fast', sub: '60s +100/-50', color: '#4ade80' },
                            { step: '03', icon: '🏆', title: 'Climb Ranks', sub: 'Beat & own', color: '#fbbf24' },
                        ].map(({ step, icon, title, sub, color }) => (
                            <div key={step} style={{
                                background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`,
                                borderRadius: '1rem', padding: '0.85rem 0.4rem', textAlign: 'center',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                                boxShadow: `0 4px 20px ${color}15`,
                            }}>
                                <div style={{ fontSize: '1.6rem' }}>{icon}</div>
                                <div style={{ fontSize: '0.55rem', color, fontWeight: 800, letterSpacing: '1px' }}>STEP {step}</div>
                                <div style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.8rem)', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{title}</div>
                                <div style={{ fontSize: 'clamp(0.55rem, 2vw, 0.7rem)', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Play Now button */}
                    <button onClick={handleStartGameClick} style={{
                        width: '100%', background: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)',
                        color: '#fff', border: 'none', borderRadius: '3rem', padding: '1rem',
                        fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer', letterSpacing: '2px',
                        boxShadow: '0 8px 32px rgba(168,85,247,0.45), 0 2px 0 rgba(255,255,255,0.15) inset',
                        transition: 'transform 0.15s, box-shadow 0.15s', marginBottom: '0.75rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(168,85,247,0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(168,85,247,0.45)'; }}
                    >
                        🎯 PLAY NOW
                    </button>

                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: '1.5rem', letterSpacing: '0.5px' }}>
                        Entry: KES 20 · 60s per session · +100 correct · -50 wrong
                    </div>

                    {/* Browse Games */}
                    <div style={{ width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '16px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 14px' }}>Browse Games</p>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {[
                                { label: 'Bongo Quiz', logo: bongoPoster, path: '/', tag: 'HOT' },
                                { label: 'Bible Quiz', logo: biblePoster, path: '/bible-quiz', tag: 'NEW' },
                            ].map(app => (
                                <div key={app.label} onClick={() => { window.location.href = app.path; }} title={app.label}
                                    style={{ cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, WebkitTapHighlightColor: 'transparent' }}>
                                    {app.tag && <span style={{ position: 'absolute', top: -8, right: -8, background: app.tag === 'HOT' ? 'linear-gradient(135deg,#ff4e00,#ff9500)' : 'linear-gradient(135deg,#00c6ff,#7B61FF)', color: '#fff', fontSize: '0.55rem', fontWeight: 900, letterSpacing: 1, padding: '2px 6px', borderRadius: 20, textTransform: 'uppercase', zIndex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{app.tag}</span>}
                                    <div style={{ width: 90, height: 90, borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)', animation: 'gamePulse 2.4s ease-in-out infinite' }}>
                                        <img src={app.logo} alt={app.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase' }}>{app.label}</span>
                                </div>
                            ))}
                        </div>
                        <style>{`@keyframes gamePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,180,0,0.4),0 6px 20px rgba(0,0,0,0.4);transform:translateY(0)}50%{box-shadow:0 0 0 6px rgba(255,180,0,0),0 6px 20px rgba(0,0,0,0.4);transform:translateY(-3px)}}`}</style>
                    </div>

                </div>
            </motion.div>
        </>
    );
};