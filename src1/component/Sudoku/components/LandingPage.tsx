import {useEffect, useState} from 'react';
import {Target, CreditCard, Medal, Pencil, User, X} from 'lucide-react';
import {HelpCircle, History, Share2, UserCog} from 'lucide-react';
import {PaymentModal} from './PaymentModal';
import {ProfileModal, type UserProfile} from './ProfileModal';
import {LeaderboardModal} from './LeaderboardModal';
import {LiveBackground} from './LiveBackground';
import type {LeaderboardEntry} from "../../MathQuiz/types.ts";
import {EditProfileModal} from "../../BiologyQuiz/components/EditProfileModal.tsx";
import {collection, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, query, where} from "firebase/firestore";
import {BottomNav} from "../../game/BottomNav.tsx";
import {AppTopBar, type SettingsItem} from "../../game/AppTopBar.tsx";

type LandingPageProps = {
    onPlay: () => void;
    playerName?: string;
    setPlayerName?: (n: string) => void;
    leaderboard?: LeaderboardEntry[];
    playerPhone?: string;
    setPlayerPhone?: (p: string) => void;
};

const normalizePhone07 = (phone: string) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('254') && digits.length === 12) return `0${digits.slice(3)}`;
    if (digits.startsWith('7') && digits.length === 9) return `0${digits}`;
    return digits;
};

const normalizePhone254 = (phone: string) => normalizePhone07(phone).replace(/^0/, '254');

const getBongoProfile = (): UserProfile | null => {
    const name = localStorage.getItem('bongo_player_name')?.trim() ?? '';
    const phone = normalizePhone07(localStorage.getItem('bongo_player_phone') ?? '');
    return name && /^07\d{8}$/.test(phone) ? {name, phone} : null;
};

const getSudokuProfile = (): UserProfile | null => {
    const saved = localStorage.getItem('sudoku_user');
    if (!saved) return null;
    try {
        const parsed = JSON.parse(saved) as UserProfile;
        const name = parsed.name?.trim() ?? '';
        const phone = normalizePhone07(parsed.phone ?? '');
        return name && phone ? {name, phone} : null;
    } catch {
        return null;
    }
};

const getStoredProfile = (): UserProfile | null => getBongoProfile() ?? getSudokuProfile();

const saveSharedProfile = (profile: UserProfile) => {
    const normalizedProfile = {...profile, phone: normalizePhone07(profile.phone)};
    localStorage.setItem('sudoku_user', JSON.stringify(normalizedProfile));
    localStorage.setItem('bongo_player_name', normalizedProfile.name);
    localStorage.setItem('bongo_player_phone', normalizedProfile.phone);
    localStorage.setItem('bongo_last_activity', Date.now().toString());
    return normalizedProfile;
};

async function hasRestoredSudokuSession(phone: string) {
    const phone07 = normalizePhone07(phone);
    if (!/^07\d{8}$/.test(phone07)) return false;

    const db = getFirestore();
    const grantSnap = await getDoc(doc(db, 'grantedSudokuSessions', phone07));
    if (grantSnap.exists()) return true;

    const phone254 = normalizePhone254(phone07);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const paymentsSnap = await getDocs(query(
        collection(db, 'payments'),
        where('phone', '==', phone254),
        where('status', '==', 'paid'),
        where('game', '==', 'SUDOKU'),
        limit(5),
    ));

    if (paymentsSnap.empty) return false;

    const latest = paymentsSnap.docs
        .map(d => ({...d.data(), _paidAt: d.data().createdAt?.toDate?.() ?? new Date(0)}))
        .sort((a, b) => b._paidAt.getTime() - a._paidAt.getTime())[0];

    if (latest._paidAt < since) return false;

    const sessionsSnap = await getDocs(query(
        collection(db, 'sudokuSessions'),
        where('phone', '==', phone07),
        limit(10),
    ));

    return !sessionsSnap.docs.some(d => (d.data().playedAt?.toDate?.() ?? new Date(0)) > latest._paidAt);
}

export function LandingPage({
                                onPlay,
                                playerName: playerNameProp,
                                setPlayerName,
                                playerPhone: playerPhoneProp,
                                setPlayerPhone,
                            }: LandingPageProps) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getStoredProfile());
    const [showHtp, setShowHtp] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historySessions, setHistorySessions] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [hasPaidSession, setHasPaidSession] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const playerName = playerNameProp ?? userProfile?.name ?? '';
    const playerPhone = playerPhoneProp ?? userProfile?.phone ?? '';
    const handleProfileSave = (profile: UserProfile) => {
        const savedProfile = saveSharedProfile(profile);
        setUserProfile(savedProfile);
        setShowProfileModal(false);

        // If we were trying to play, show the payment modal now
        if (!showPaymentModal && document.activeElement?.classList.contains('landing-play-btn')) {
            // but we lose the context. A better way: check if we just saved from PLAY NOW.
        }
    };

    useEffect(() => {
        const syncProfile = () => {
            const storedProfile = getStoredProfile();
            if (!storedProfile) return;

            setUserProfile(current => {
                if (current?.name === storedProfile.name && normalizePhone07(current.phone) === storedProfile.phone) {
                    return current;
                }
                localStorage.setItem('sudoku_user', JSON.stringify(storedProfile));
                return storedProfile;
            });
        };

        syncProfile();
        window.addEventListener('storage', syncProfile);
        window.addEventListener('focus', syncProfile);
        return () => {
            window.removeEventListener('storage', syncProfile);
            window.removeEventListener('focus', syncProfile);
        };
    }, []);

    useEffect(() => {
        const phone07 = normalizePhone07(userProfile?.phone ?? '');
        if (!/^07\d{8}$/.test(phone07)) {
            setHasPaidSession(false);
            return;
        }

        let cancelled = false;
        hasRestoredSudokuSession(phone07)
            .then(hasSession => {
                if (!cancelled) setHasPaidSession(hasSession);
            })
            .catch(() => {
                if (!cancelled) setHasPaidSession(false);
            });

        const unsub = onSnapshot(doc(getFirestore(), 'grantedSudokuSessions', phone07), snap => {
            if (snap.exists()) setHasPaidSession(true);
        }, () => {});

        return () => {
            cancelled = true;
            unsub();
        };
    }, [userProfile?.phone]);

    const handlePlayClick = async () => {
        if (!userProfile) {
            setShowProfileModal(true);
        } else {
            if (hasPaidSession || await hasRestoredSudokuSession(userProfile.phone).catch(() => false)) {
                setHasPaidSession(false);
                onPlay();
                return;
            }
            setShowPaymentModal(true);
        }
    };

    const handleProfileUpdate = (name: string, phone: string) => {
        const profile = saveSharedProfile({name, phone});
        setPlayerName?.(name);
        setPlayerPhone?.(profile.phone);
        setUserProfile(profile);
        setIsEditing(false);
    };

    const loadHistory = () => {
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
            .then(snap => setHistorySessions(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0))))
            .catch(() => setHistorySessions([]))
            .finally(() => setHistoryLoading(false));
    };

    const handleShare = () => {
        const text = `🧮 Play Sudoku Puzzle — test your logic skills!\n${window.location.href}`;
        if (navigator.share) navigator.share({title: "Sudoku Puzzle", text, url: window.location.href}).catch(() => {});
        else navigator.clipboard?.writeText(window.location.href).then(() => alert("Link copied!")).catch(() => {});
    };

    const settingsItems: SettingsItem[] = [
        {key: "htp", label: "How to Play", icon: <HelpCircle size={18}/>, onClick: () => setShowHtp(true)},
        {key: "history", label: "Game History", icon: <History size={18}/>, onClick: loadHistory},
        {key: "share", label: "Share", icon: <Share2 size={18}/>, onClick: handleShare},
        {key: "profile", label: "Edit Profile", icon: <UserCog size={18}/>, onClick: () => setIsEditing(true)},
    ];

    return (
        <div className="main-sudoku-landing-container">
            <LiveBackground/>
            <AppTopBar settingsItems={settingsItems}/>
            {isEditing && (
                <EditProfileModal
                    isOpen={isEditing}
                    currentName={playerName}
                    currentPhone={playerPhone}
                    onSave={handleProfileUpdate}
                    onClose={() => setIsEditing(false)}
                />
            )}
            <div className="landing-container" style={{paddingTop: 'calc(80px + env(safe-area-inset-top))'}}>
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

                {/* How to Play */}
                {showHtp && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 400,
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }} onClick={() => setShowHtp(false)}>
                        <div style={{
                            background: '#0a0518',
                            border: '1px solid rgba(74,222,128,0.2)',
                            borderRadius: 20,
                            padding: '2rem',
                            width: '100%',
                            maxWidth: 400,
                            maxHeight: '80vh',
                            overflowY: 'auto'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <h3 style={{color: '#4ade80', fontWeight: 900, margin: 0}}>🧮 How to Play</h3>
                                <button onClick={() => setShowHtp(false)}
                                        style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer'}}>
                                    <X size={18}/></button>
                            </div>
                            {[
                                {
                                    step: '01',
                                    title: 'Pay Entry Fee',
                                    desc: 'Pay KES 20 via M-Pesa to enter a session.',
                                    color: '#f43f5e'
                                },
                                {
                                    step: '02',
                                    title: 'Fill the Grid',
                                    desc: 'Every row, column, and 3x3 box must contain digits 1-9.',
                                    color: '#4ade80'
                                },
                                {
                                    step: '03',
                                    title: 'Difficulty Levels',
                                    desc: 'Choose Easy, Medium, or Hard. Complete stages to unlock more.',
                                    color: '#22d3ee'
                                },
                                {
                                    step: '04',
                                    title: 'Scoring & Hints',
                                    desc: 'Earn points by completing stages. Hints cost 20 points.',
                                    color: '#facc15'
                                },
                            ].map(s => (
                                <div key={s.step} style={{
                                    display: 'flex',
                                    gap: 12,
                                    marginBottom: '1rem',
                                    background: 'rgba(255,255,255,0.04)',
                                    borderLeft: `3px solid ${s.color}`,
                                    borderRadius: 10,
                                    padding: '0.75rem 1rem'
                                }}>
                                    <div>
                                        <div style={{
                                            fontSize: '0.6rem',
                                            fontWeight: 900,
                                            color: s.color,
                                            letterSpacing: 2,
                                            textTransform: 'uppercase',
                                            marginBottom: 2
                                        }}>STEP {s.step}</div>
                                        <div style={{
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            marginBottom: 2
                                        }}>{s.title}</div>
                                        <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem'}}>{s.desc}</div>
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
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 400,
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }} onClick={() => setShowHistory(false)}>
                        <div style={{
                            background: '#0a0518',
                            border: '1px solid rgba(74,222,128,0.2)',
                            borderRadius: 20,
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: 400,
                            maxHeight: '85vh',
                            overflowY: 'auto'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <h3 style={{color: '#4ade80', fontWeight: 900, margin: 0}}>📜 Game History</h3>
                                <button onClick={() => setShowHistory(false)}
                                        style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer'}}>
                                    <X size={18}/></button>
                            </div>
                            {historyLoading ? (
                                <p style={{
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: '0.85rem'
                                }}>Loading...</p>
                            ) : historySessions.length > 0 ? (
                                historySessions.map((s: any) => (
                                    <div key={s.id} style={{
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        marginBottom: 6
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 4
                                        }}>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                color: '#4ade80'
                                            }}>{s.score || 0} pts</span>
                                            <span style={{fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)'}}>
                      {s.playedAt ? new Date(s.playedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </span>
                                        </div>
                                        <div style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)'}}>
                                            {s.difficulty || 'Easy'} · Stage {s.stage || 1} · {s.hintsUsed || 0} hints
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem'}}>No
                                    game history found</p>
                            )}
                        </div>
                    </div>
                )}

            </div>
            <BottomNav active="home" onNavigate={(tab) => {
                if (tab === 'leaderboard') window.dispatchEvent(new CustomEvent('show-leaderboard'));
                else window.location.href = `/?tab=${tab}`;
            }}/>
        </div>
    );
}
