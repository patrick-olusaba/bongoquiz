import React, { useEffect, useState } from 'react';
import { User, Pencil, CreditCard, Medal, Target, Info, Loader } from 'lucide-react';
import { LiveBackground } from './LiveBackground';
import logoImage from '../assets/logo.png';
import '../styles/styles.css';

// import { getLeaderboard } from '../lib/leaderboard';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, query, where } from 'firebase/firestore';
// import type { LeaderboardEntry } from '../lib/leaderboard';
import { initAudio } from '../hooks/useSoundEffects';
import { PlayerNameModal } from '../../game/Playernamemodal';

interface LandingPageProps {
    onPlay: () => void;
}

const normalizePhone07 = (phone: string) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('254') && digits.length === 12) return '0' + digits.slice(3);
    if (digits.startsWith('7') && digits.length === 9) return '0' + digits;
    return digits;
};

const normalizePhone254 = (phone: string) => normalizePhone07(phone).replace(/^0/, '254');

const getStoredName = () => localStorage.getItem('bongo_player_name') || '';
const getStoredPhone = () => normalizePhone07(localStorage.getItem('bongo_player_phone') || '');

const readPositiveLevel = (value: string | null) => {
    const raw = Number(value || '1');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
};

const getPendingLevel = () => readPositiveLevel(localStorage.getItem('connectDotsNextLevel'));
const hasPaidPendingLevel = () => {
    const paidLevel = localStorage.getItem('connectDotsPaidLevel');
    return paidLevel !== null && readPositiveLevel(paidLevel) === getPendingLevel();
};

async function hasRestoredConnectDotsSession(phone: string) {
    const phone07 = normalizePhone07(phone);
    if (!/^07\d{8}$/.test(phone07)) return false;

    const db = getFirestore();
    const grantSnap = await getDoc(doc(db, 'grantedConnectDotsSessions', phone07));
    if (grantSnap.exists()) return true;

    const phone254 = normalizePhone254(phone07);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [connectDotsPaymentsSnap, sharedPaymentsSnap] = await Promise.all([
        getDocs(query(
            collection(db, 'connectDotsPayments'),
            where('phone', '==', phone254),
            where('status', '==', 'paid'),
            limit(5),
        )),
        getDocs(query(
            collection(db, 'payments'),
            where('phone', '==', phone254),
            where('status', '==', 'paid'),
            where('game', '==', 'CONNECT_DOTS'),
            limit(5),
        )),
    ]);

    const paidDocs = [...connectDotsPaymentsSnap.docs, ...sharedPaymentsSnap.docs];
    if (!paidDocs.length) return false;

    const latest = paidDocs
        .map(d => ({...d.data(), _paidAt: d.data().createdAt?.toDate?.() ?? new Date(0)}))
        .sort((a, b) => b._paidAt.getTime() - a._paidAt.getTime())[0];

    if (latest._paidAt < since) return false;

    const sessionsSnap = await getDocs(query(
        collection(db, 'connectDotsSessions'),
        where('phone', '==', phone07),
        limit(10),
    ));

    return !sessionsSnap.docs.some(d => (d.data().playedAt?.toDate?.() ?? new Date(0)) > latest._paidAt);
}

export const LandingPage: React.FC<LandingPageProps> = ({ onPlay }) => {
    const [name, setName] = useState(() => getStoredName());
    const [phone, setPhone] = useState(() => getStoredPhone());

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [hasPaidSession, setHasPaidSession] = useState(false);
    // const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    //
    // const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    //
    // const handleOpenLeaderboard = async () => {
    //     setLeaderboard(await getLeaderboard());
    //     setIsLeaderboardOpen(true);
    // };

    const handlePayClick = async () => {
        initAudio();
        setIsProcessingPayment(true);
        setPaymentError('');
        try {
            const phone07 = normalizePhone07(phone);
            const res = await fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone: normalizePhone254(phone07), amount: 20, trigger: 'R1R2', game: 'CONNECT_DOTS' }),
            }).then(r => r.json());

            if (!res.paymentId) throw new Error(res.error || 'Payment failed');

            const paidSince = new Date();
            let confirmed = false;
            let stopFallbackPolling: number | undefined;

            const handleConfirmed = () => {
                if (confirmed) return;
                confirmed = true;
                unsub();
                if (stopFallbackPolling) window.clearInterval(stopFallbackPolling);
                localStorage.setItem('connectDotsPaidLevel', String(getPendingLevel()));
                setIsProcessingPayment(false);
                setIsPaymentModalOpen(false);
                onPlay();
            };

            const unsub = onSnapshot(doc(getFirestore(), 'payments', res.paymentId), snap => {
                const data = snap.data();
                if (data?.trans_id || data?.status === 'paid') handleConfirmed();
            }, () => {});

            const checkFallbackPayment = async () => {
                const paidSnap = await getDocs(query(
                    collection(getFirestore(), 'payments'),
                    where('phone', '==', normalizePhone254(phone07)),
                    where('status', '==', 'paid'),
                    where('game', '==', 'CONNECT_DOTS'),
                    limit(10),
                )).catch(() => null);

                const matched = paidSnap?.docs.some(d => {
                    const data = d.data();
                    const createdAt = data.createdAt?.toDate?.() ?? new Date(0);
                    return Number(data.amount ?? 0) === 20 && createdAt >= paidSince;
                });

                if (matched) handleConfirmed();
            };

            stopFallbackPolling = window.setInterval(checkFallbackPayment, 2500);

            setTimeout(() => {
                if (stopFallbackPolling) window.clearInterval(stopFallbackPolling);
                setIsProcessingPayment(current => {
                    if (!current) return false;
                    setPaymentError('Still waiting for payment confirmation. Keep this open or contact admin if you paid.');
                    return false;
                });
            }, 90000);
        } catch (error) {
            setPaymentError(error instanceof Error ? error.message : 'Payment failed');
            setIsProcessingPayment(false);
        }
    };

    const handlePlayClick = async () => {
        initAudio();
        const phone07 = normalizePhone07(phone);
        if (!name || !/^07\d{8}$/.test(phone07)) {
            setIsEditModalOpen(true);
        } else if (hasPaidPendingLevel()) {
            onPlay();
        } else if (hasPaidSession || await hasRestoredConnectDotsSession(phone07).catch(() => false)) {
            setHasPaidSession(false);
            localStorage.setItem('connectDotsPaidLevel', String(getPendingLevel()));
            deleteDoc(doc(getFirestore(), 'grantedConnectDotsSessions', phone07)).catch(() => {});
            onPlay();
        } else {
            setIsPaymentModalOpen(true);
        }
    };

    const handleSaveProfile = (savedName: string, savedPhone: string) => {
        initAudio();
        const phone07 = normalizePhone07(savedPhone);
        setName(savedName.trim());
        setPhone(phone07);
        localStorage.setItem('bongo_player_name', savedName.trim());
        localStorage.setItem('bongo_player_phone', phone07);
        localStorage.setItem('bongo_last_activity', Date.now().toString());
        setIsEditModalOpen(false);
        setIsPaymentModalOpen(true);
    };

    useEffect(() => {
        const syncGlobalProfile = () => {
            setName(getStoredName());
            setPhone(getStoredPhone());
        };

        window.addEventListener('storage', syncGlobalProfile);
        window.addEventListener('focus', syncGlobalProfile);
        return () => {
            window.removeEventListener('storage', syncGlobalProfile);
            window.removeEventListener('focus', syncGlobalProfile);
        };
    }, []);

    useEffect(() => {
        const phone07 = normalizePhone07(phone);
        if (!/^07\d{8}$/.test(phone07)) {
            setHasPaidSession(false);
            return;
        }

        let cancelled = false;
        hasRestoredConnectDotsSession(phone07)
            .then(hasSession => { if (!cancelled) setHasPaidSession(hasSession); })
            .catch(() => { if (!cancelled) setHasPaidSession(false); });

        const unsub = onSnapshot(doc(getFirestore(), 'grantedConnectDotsSessions', phone07), snap => {
            if (snap.exists()) setHasPaidSession(true);
        }, () => {});

        return () => {
            cancelled = true;
            unsub();
        };
    }, [phone]);

    return (
        <div className="landing-container">
            {/* Top Bar Header */}
            <header className="landing-top-bar">
                <div className="logo-container">
                    <img src={logoImage} alt="Dot Joiner Logo" className="logo-image" />
                </div>
            </header>

            {/* Live Canvas Background */}
            <LiveBackground />

            <div className="landing-content">
                {/* Title Section */}
                <div className="landing-header">
                    <div className="title-wrapper">
                        <h1 className="title-top">CONNECT</h1>
                        <div className="title-connector"></div>
                        <h1 className="title-bottom">THE DOTS</h1>
                    </div>
                    <p className="subtitle">Test your logic skills</p>
                </div>

                {/* User Profile Pill */}
                {(name || phone) ? (
                    <div className="user-pill">
                        <User size={16} className="user-icon" />
                        <span>{name} | {phone}</span>
                        <button className="edit-btn" onClick={() => setIsEditModalOpen(true)}>
                            <Pencil size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="user-pill" style={{ cursor: 'pointer' }} onClick={() => setIsEditModalOpen(true)}>
                        <User size={16} className="user-icon" />
                        <span>Name | 0700...</span>
                        <button className="edit-btn">
                            <Pencil size={14} />
                        </button>
                    </div>
                )}

                {/* Info Cards */}
                <div className="info-cards">
                    <div className="info-card">
                        <CreditCard size={28} className="card-icon text-yellow" />
                        <div className="card-step">STEP 01</div>
                        <div className="card-title">Pay &amp; Enter</div>
                        <div className="card-desc">KES 20 M-Pesa</div>
                    </div>
                    <div className="info-card">
                        <Medal size={28} className="card-icon text-yellow" />
                        <div className="card-step">STEP 02</div>
                        <div className="card-title">Climb Ranks</div>
                        <div className="card-desc">Beat &amp; own</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button className="btn-play-now" onClick={handlePlayClick}>
                        <Target size={20} />
                        <span>{getPendingLevel() > 1 ? `LEVEL ${getPendingLevel()}` : 'PLAY NOW'}</span>
                    </button>

                    {/*<button className="btn-leaderboard" onClick={handleOpenLeaderboard}>*/}
                    {/*    <Trophy size={18} className="text-yellow" />*/}
                    {/*    <span>LEADERBOARD</span>*/}
                    {/*</button>*/}
                </div>

                {/* Footer info */}
                <div className="landing-footer">
                    Entry: KES 20 per level | 100 points per stage | -25 pts hint
                </div>
            </div>

            {/* Modals */}
            {isPaymentModalOpen && (
                <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
                    <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon-wrapper">
                            <CreditCard size={28} className="modal-icon text-white" />
                        </div>
                        <h2 className="modal-title">Connect Dots Entry</h2>
                        <p className="modal-desc">
                            Hi <strong>{name}!</strong> To start Level <strong>{getPendingLevel()}</strong>, please confirm payment of <strong>20/-</strong> via your mobile number.
                        </p>
                        <div className="phone-prompt-box">
                            <div className="prompt-text">M-Pesa prompt will be sent to</div>
                            <div className="prompt-phone">{normalizePhone07(phone)}</div>
                        </div>
                        {paymentError && <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{paymentError}</p>}
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsPaymentModalOpen(false)} disabled={isProcessingPayment}>CANCEL</button>
                            <button className="btn-pay" onClick={handlePayClick} disabled={isProcessingPayment}>
                                {isProcessingPayment ? (
                                    <>
                                        <Loader size={18} className="animate-spin mr-2" style={{ display: 'inline', marginRight: '8px' }} />
                                        PROCESSING
                                    </>
                                ) : (
                                    'PAY'
                                )}
                            </button>
                        </div>
                        <div className="modal-footer">
                            <Info size={14} /> Secure payment via your mobile provider
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <PlayerNameModal
                    currentName={name || 'Player'}
                    currentPhone={phone}
                    onSave={handleSaveProfile}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}

            {/*{isLeaderboardOpen && (*/}
            {/*    <div className="modal-overlay" onClick={() => setIsLeaderboardOpen(false)}>*/}
            {/*        <div className="modal-content leaderboard-modal" onClick={(e) => e.stopPropagation()}>*/}
            {/*            <div className="modal-header">*/}
            {/*                <h2 className="modal-title">Leaderboard</h2>*/}
            {/*                <button className="btn-close" onClick={() => setIsLeaderboardOpen(false)}>*/}
            {/*                    <X size={18} />*/}
            {/*                </button>*/}
            {/*            </div>*/}

            {/*            <div className="leaderboard-list">*/}
            {/*                {leaderboard.length === 0 ? (*/}
            {/*                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>*/}
            {/*                        No players yet. Play a game to see your name here!*/}
            {/*                    </div>*/}
            {/*                ) : (*/}
            {/*                    leaderboard.map((item, idx) => (*/}
            {/*                        <div key={item.id} className="leaderboard-item">*/}
            {/*                            <div className="lb-rank">#{idx + 1}</div>*/}
            {/*                            <div className="lb-details">*/}
            {/*                                <div className="lb-name">{item.name}</div>*/}
            {/*                                <div className="lb-phone">{item.phone}</div>*/}
            {/*                            </div>*/}
            {/*                            <div className="lb-stats">*/}
            {/*                                <div className="lb-pts">{item.pts} pts</div>*/}
            {/*                                <div className="lb-date">{item.date}</div>*/}
            {/*                            </div>*/}
            {/*                        </div>*/}
            {/*                    ))*/}
            {/*                )}*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*)}*/}
        </div>
    );
};
