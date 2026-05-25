import React, { useState } from 'react';
import { User, Pencil, CreditCard, Medal, Target, Trophy, X, Phone, Info, Loader } from 'lucide-react';
import { LiveBackground } from './LiveBackground';
import logoImage from '../assets/logo.png';
import '../styles/styles.css';

import { getLeaderboard } from '../lib/leaderboard';
import type { LeaderboardEntry } from '../lib/leaderboard';
import { initAudio } from '../hooks/useSoundEffects';

interface LandingPageProps {
    onPlay: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onPlay }) => {
    const [name, setName] = useState(() => localStorage.getItem('sudokuPlayerName') || '');
    const [phone, setPhone] = useState(() => localStorage.getItem('sudokuPlayerPhone') || '');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

    const [tempName, setTempName] = useState('');
    const [tempPhone, setTempPhone] = useState('');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    const handleOpenLeaderboard = () => {
        setLeaderboard(getLeaderboard());
        setIsLeaderboardOpen(true);
    };

    const handlePayClick = () => {
        initAudio();
        setIsProcessingPayment(true);
        setTimeout(() => {
            setIsProcessingPayment(false);
            setIsPaymentModalOpen(false);
            onPlay();
        }, 1000);
    };

    const handlePlayClick = () => {
        initAudio();
        if (!name || !phone) {
            setTempName(name);
            setTempPhone(phone);
            setIsEditModalOpen(true);
        } else {
            setIsPaymentModalOpen(true);
        }
    };

    const handleSaveProfile = () => {
        initAudio();
        if (tempName && tempPhone) {
            setName(tempName);
            setPhone(tempPhone);
            localStorage.setItem('sudokuPlayerName', tempName);
            localStorage.setItem('sudokuPlayerPhone', tempPhone);
            setIsEditModalOpen(false);
            setIsPaymentModalOpen(true);
        }
    };

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
                        <button className="edit-btn" onClick={() => {
                            setTempName(name);
                            setTempPhone(phone);
                            setIsEditModalOpen(true);
                        }}>
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
                        <span>PLAY NOW</span>
                    </button>

                    <button className="btn-leaderboard" onClick={handleOpenLeaderboard}>
                        <Trophy size={18} className="text-yellow" />
                        <span>LEADERBOARD</span>
                    </button>
                </div>

                {/* Footer info */}
                <div className="landing-footer">
                    Entry: KES 20 | 100-400 points per stage | -50 pts hint
                </div>
            </div>

            {/* Modals */}
            {isPaymentModalOpen && (
                <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
                    <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon-wrapper">
                            <CreditCard size={28} className="modal-icon text-white" />
                        </div>
                        <h2 className="modal-title">Speed Quiz Ticket</h2>
                        <p className="modal-desc">
                            Hi <strong>{name}!</strong> To start this round, please confirm payment of <strong>20/-</strong> via your mobile number.
                        </p>
                        <div className="phone-prompt-box">
                            <div className="prompt-text">M-Pesa prompt will be sent to</div>
                            <div className="prompt-phone">{phone}</div>
                        </div>
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
                <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Edit Profile</h2>
                            <button className="btn-close" onClick={() => setIsEditModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <p className="modal-desc">
                            Your name shows on the leaderboard. Phone is used for M-Pesa.
                        </p>

                        <div className="form-group">
                            <label>YOUR NAME</label>
                            <div className="input-wrapper">
                                <User size={16} className="input-icon" />
                                <input
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    placeholder="Name"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>PHONE NUMBER</label>
                            <div className="input-wrapper">
                                <Phone size={16} className="input-icon" />
                                <input
                                    type="text"
                                    value={tempPhone}
                                    onChange={(e) => setTempPhone(e.target.value)}
                                    placeholder="0700..."
                                />
                            </div>
                            <div className="input-hint">Used for M-Pesa payments (format: 0712345678 or 254712345678)</div>
                        </div>

                        <div className="modal-actions split">
                            <button className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveProfile} disabled={!tempName || !tempPhone}>Save &amp; Play</button>
                        </div>
                    </div>
                </div>
            )}

            {isLeaderboardOpen && (
                <div className="modal-overlay" onClick={() => setIsLeaderboardOpen(false)}>
                    <div className="modal-content leaderboard-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Leaderboard</h2>
                            <button className="btn-close" onClick={() => setIsLeaderboardOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="leaderboard-list">
                            {leaderboard.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No players yet. Play a game to see your name here!
                                </div>
                            ) : (
                                leaderboard.map((item, idx) => (
                                    <div key={item.id} className="leaderboard-item">
                                        <div className="lb-rank">#{idx + 1}</div>
                                        <div className="lb-details">
                                            <div className="lb-name">{item.name}</div>
                                            <div className="lb-phone">{item.phone}</div>
                                        </div>
                                        <div className="lb-stats">
                                            <div className="lb-pts">{item.pts} pts</div>
                                            <div className="lb-date">{item.date}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
