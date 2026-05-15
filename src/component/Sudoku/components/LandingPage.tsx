import  {useState} from 'react';
import {Target, CreditCard, Medal, Pencil, User, Menu, X, HelpCircle, ScrollText, Grid3X3} from 'lucide-react';
import {PaymentModal} from './PaymentModal';
import {ProfileModal, type UserProfile} from './ProfileModal';
import {LeaderboardModal} from './LeaderboardModal';
import {LiveBackground} from './LiveBackground';
import {BrowseGames} from "../../game/BrowseGames.tsx";
import type {LeaderboardEntry} from "../../MathQuiz/types.ts";
import {EditProfileModal} from "../../BiologyQuiz/components/EditProfileModal.tsx";
import {collection, getDocs, getFirestore, limit, query, where} from "firebase/firestore";
import {BottomNav} from "../../game/BottomNav.tsx";

type LandingPageProps = {
    onPlay: () => void;
    playerName?: string;
    setPlayerName?: (n: string) => void;
    leaderboard?: LeaderboardEntry[];
    playerPhone?: string;
    setPlayerPhone?: (p: string) => void;
};

export function LandingPage({
    onPlay,
    playerName: playerNameProp,
    setPlayerName,
    leaderboard = [],
    playerPhone: playerPhoneProp,
    setPlayerPhone,
}: LandingPageProps) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
        const saved = localStorage.getItem('sudoku_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [showHtp, setShowHtp]           = useState(false);
    const [showHistory, setShowHistory]         = useState(false);
    const [historySessions, setHistorySessions] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading]   = useState(false);
    const [hasGrantedSession, setHasGrantedSession] = useState(false);

    const [isMenuOpen, setIsMenuOpen]     = useState(false);
    const [isEditing, setIsEditing]       = useState(false);
    const playerName = playerNameProp ?? userProfile?.name ?? '';
    const playerPhone = playerPhoneProp ?? userProfile?.phone ?? '';
    const phone254 = playerPhone ? playerPhone.replace(/^0/, '254') : '';
    const myEntry = leaderboard.find((d: any) => String(d.msisdn) === phone254 || String(d.msisdn) === playerPhone || d.phone === playerPhone);
    const totalPoints = myEntry?.score ?? 0;
    const personalBest = parseInt(localStorage.getItem('sudoku_high_score') ?? '0');


    const handleProfileSave = (profile: UserProfile) => {
        setUserProfile(profile);
        localStorage.setItem('sudoku_user', JSON.stringify(profile));
        setShowProfileModal(false);

        // If we were trying to play, show the payment modal now
        if (!showPaymentModal && document.activeElement?.classList.contains('landing-play-btn')) {
            // but we lose the context. A better way: check if we just saved from PLAY NOW.
        }
    };

    const handlePlayClick = () => {
        if (!userProfile) {
            setShowProfileModal(true);
        } else {
            setShowPaymentModal(true);
        }
    };

    const handleProfileUpdate = (name: string, phone: string) => {
        const profile = { name, phone };
        setPlayerName?.(name);
        setPlayerPhone?.(phone);
        setUserProfile(profile);
        localStorage.setItem('sudoku_user', JSON.stringify(profile));
        setIsEditing(false);
    };

    return (
        <>
        <div className="landing-container">

            <LiveBackground/>
            <div className="sudoku-landing-topbar">
                <div className="sudoku-landing-brand-wrap">
                    <div className="sudoku-landing-brand">
                        <div className="sudoku-landing-brand-icon">
                            <Grid3X3 size={20} strokeWidth={3} />
                        </div>
                        <div className="sudoku-landing-brand-copy">
                            <div className="sudoku-landing-brand-name">Sudoku</div>
                            <div className="sudoku-landing-brand-type">Puzzle</div>
                        </div>
                    </div>
                    {playerPhone && /^07\d{8}$/.test(playerPhone) && totalPoints > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 20,
                            padding: '3px 10px'
                        }}>
                            <span style={{fontSize: '0.9rem'}}>🪙</span>
                            <span style={{
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                color: '#ffd200'
                            }}>{totalPoints.toLocaleString()}</span>
                        </div>
                    )}
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
                                        getDocs(query(collection(getFirestore(), 'sudokuSessions'), where('phone', '==', phone07), limit(20)))
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
                {isEditing && (
                    <EditProfileModal
                        isOpen={isEditing}
                        currentName={playerName}
                        currentPhone={playerPhone}
                        onSave={handleProfileUpdate}
                        onClose={() => setIsEditing(false)}
                    />
                )}
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    {personalBest > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(255,215,0,0.1)',
                            border: '1px solid rgba(255,215,0,0.25)',
                            borderRadius: 20,
                            padding: '3px 10px'
                        }}>
                            <span style={{fontSize: '0.9rem'}}>🏆</span>
                            <span style={{
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                color: '#ffd200'
                            }}>{personalBest.toLocaleString()}</span>
                        </div>
                    )}
                    <button onClick={() => setIsMenuOpen(true)} className="sudoku-landing-menu-btn" aria-label="Open menu">
                        <Menu size={20}/>
                    </button>
                </div>
            </div>

            <div className="landing-title">
                <span className="landing-title-word1">SUDOKU</span>
                <span className="landing-title-word2">PUZZLE</span>
            </div>

            <h2 className="landing-subtitle">Test your logic skills</h2>

            <div
                className="landing-user-pill"
                style={{cursor: 'pointer', opacity: userProfile ? 1 : 0.7}}
                onClick={() => setShowProfileModal(true)}
            >
        <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <User size={18} color="#60a5fa"/>
        </span>
                {userProfile ? (
                    <>
                        {userProfile.name} | {userProfile.phone}
                        <Pencil size={14} color="#facc15" style={{marginLeft: '4px'}}/>
                    </>
                ) : (
                    <>
                        Set up Profile to Play
                        <Pencil size={14} color="#facc15" style={{marginLeft: '4px'}}/>
                    </>
                )}
            </div>

            <div className="landing-cards">
                <div className="landing-card">
                    <div className="landing-card-icon"><CreditCard size={32} color="#facc15"/></div>
                    <div className="landing-card-step">STEP 01</div>
                    <div className="landing-card-title">Pay & Enter</div>
                    <div className="landing-card-desc">KES 20 M-Pesa</div>
                </div>

                <div className="landing-card">
                    <div className="landing-card-icon"><Medal size={32} color="#facc15"/></div>
                    <div className="landing-card-step">STEP 02</div>
                    <div className="landing-card-title">Climb Ranks</div>
                    <div className="landing-card-desc">Beat & own</div>
                </div>
            </div>

            <button className="landing-play-btn" onClick={handlePlayClick} style={{marginBottom: '1.5rem'}}>
                <Target size={24} color="white"/>
                <span className="play-now-text">
          {'PLAY NOW'.split('').map((char, index) => (
              <span key={index} className="play-now-letter" style={{animationDelay: `${index * 0.1}s`}}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </span>
            </button>

            {/*<button className="landing-leaderboard-btn" onClick={() => setShowLeaderboard(true)}>*/}
            {/*    <Trophy size={18} />*/}
            {/*    LEADERBOARD*/}
            {/*</button>*/}

            <div className="landing-footer">
                Entry: KES 20 | 100-400 points per stage | -20 pts hint
            </div>
            <BrowseGames exclude="Sudoku"/>

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
                            { step: '02', title: 'Fill the Grid', desc: 'Every row, column, and 3x3 box must contain digits 1-9.', color: '#4ade80' },
                            { step: '03', title: 'Difficulty Levels', desc: 'Choose Easy, Medium, or Hard. Complete stages to unlock more.', color: '#22d3ee' },
                            { step: '04', title: 'Scoring & Hints', desc: 'Earn points by completing stages. Hints cost 20 points.', color: '#facc15' },
                        ].map(s => (
                            <div key={s.step} style={{ display: 'flex', gap: 12, marginBottom: '1rem', background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: '0.75rem 1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: s.color, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>STEP {s.step}</div>
                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{s.title}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{s.desc}</div>
                                </div>
                            </div>
                        ))}
                        {/*<button onClick={handlePlay} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg,#4ade80,#22d3ee)', border: 'none', borderRadius: 50, color: '#000', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.5rem' }}>Start Playing Now</button>*/}
                    </div>
                </div>
            )}
            {showProfileModal && (
                <ProfileModal
                    initialProfile={userProfile}
                    onSave={(profile) => {
                        const isFirstTime = !userProfile;
                        handleProfileSave(profile);
                        if (isFirstTime) {
                            setShowPaymentModal(true);
                        }
                    }}
                    onClose={() => setShowProfileModal(false)}
                />
            )}

            {showPaymentModal && userProfile && (
                <PaymentModal
                    userProfile={userProfile}
                    onClose={() => setShowPaymentModal(false)}
                    onPay={() => {
                        setShowPaymentModal(false);
                        onPlay();
                    }}
                />
            )}

            {showLeaderboard && (
                <LeaderboardModal
                    userProfile={userProfile}
                    onClose={() => setShowLeaderboard(false)}
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
                                        {s.difficulty || 'Easy'} · Stage {s.stage || 1} · {s.hintsUsed || 0} hints
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
    <BottomNav active="games" onNavigate={(tab) => {
        if (tab === 'leaderboard') window.dispatchEvent(new CustomEvent('show-leaderboard'));
        else window.location.href = `/?tab=${tab}`;
    }} />
    </>
    );
}
