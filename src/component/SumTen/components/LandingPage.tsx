import { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, Edit2, CreditCard } from 'lucide-react';
import { useProfile, type UserProfile } from '../hooks/useProfile';
import { ProfileModal } from './ProfileModal';
import { LeaderboardModal } from './LeaderboardModal';
import { PaymentModal } from './PaymentModal';

import { audio } from '../utils/audio';

interface LandingPageProps {
    onStartGame: () => void;
}

export function LandingPage({ onStartGame }: LandingPageProps) {
    const { profile, saveProfile } = useProfile();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAttemptingPlay, setIsAttemptingPlay] = useState(false);

    const handlePlayClick = () => {
        audio.unlock();
        if (!profile) {
            setIsAttemptingPlay(true);
            setIsProfileModalOpen(true);
        } else {
            setIsPaymentModalOpen(true);
        }
    };

    const handleSaveProfile = (newProfile: UserProfile) => {
        saveProfile(newProfile);
        setIsProfileModalOpen(false);
        if (isAttemptingPlay) {
            setIsAttemptingPlay(false);
            setIsPaymentModalOpen(true);
        }
    };

    const handleModalClose = () => {
        setIsProfileModalOpen(false);
        setIsAttemptingPlay(false);
    };

    const handlePaymentSuccess = () => {
        setIsPaymentModalOpen(false);
        onStartGame();
    };

    return (
        <div className="sum-landing-container">
            {/* Main Content */}
            <main className="sum-landing-content">

                {/* Top Section: Title & Profile */}
                <div className="sum-landing-top">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="sum-landing-title-wrapper"
                    >
                        <div className="sum-landing-title-glow"></div>
                        <h1 className="sum-landing-title">
                            <span className="sum-landing-title-part1">SUMTEN</span>
                            <div className="flex items-start">
                                <span className="sum-landing-title-part2">PUZZLE</span>
                                <span className="sum-landing-title-part3">6</span>
                            </div>
                        </h1>
                        <p className="sum-landing-subtitle">Test your logic skills</p>
                    </motion.div>

                    {/* User profile pill */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="sum-landing-profile"
                        onClick={() => {
                            setIsAttemptingPlay(false);
                            setIsProfileModalOpen(true);
                        }}
                    >
                        <div className="sum-landing-profile-inner">
                            <Users size={16} />
                            {profile ? (
                                <span className="sum-landing-profile-text">
                  {profile.name} | {profile.phone}
                </span>
                            ) : (
                                <span className="sum-landing-profile-text">
                  Set Profile
                </span>
                            )}
                            <Edit2 size={14} className="sum-landing-profile-icon-edit" />
                        </div>
                    </motion.div>
                </div>

                {/* Middle Section: Info Cards */}
                <div className="sum-landing-middle">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="sum-landing-cards-container"
                    >
                        <div className="group sum-landing-card">
                            <div className="sum-landing-card-glow"></div>
                            <CreditCard className="sum-landing-card-icon" />
                            <span className="sum-landing-card-step">Step 01</span>
                            <h3 className="sum-landing-card-title">Pay & Enter</h3>
                            <p className="sum-landing-card-desc">KES 20 M-Pesa</p>
                        </div>

                        <div className="group sum-landing-card">
                            <div className="sum-landing-card-glow"></div>
                            <Trophy className="sum-landing-card-icon" />
                            <span className="sum-landing-card-step">Step 02</span>
                            <h3 className="sum-landing-card-title">Climb Ranks</h3>
                            <p className="sum-landing-card-desc">Beat & own</p>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom Section: Action Buttons */}
                <div className="sum-landing-bottom">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="sum-landing-actions"
                    >
                        <button
                            onClick={handlePlayClick}
                            className="group sum-landing-play-btn"
                        >
                            <div className="sum-landing-play-btn-glow"></div>
                            <span className="sum-landing-play-inner">
                <div className="sum-landing-play-circle-outer">
                  <div className="sum-landing-play-circle-inner"></div>
                </div>
                PLAY NOW
              </span>
                        </button>

                        <button
                            onClick={() => setIsLeaderboardModalOpen(true)}
                            className="sum-landing-leaderboard-btn"
                        >
                            <Trophy size={22} className="sum-landing-leaderboard-icon" />
                            LEADERBOARD
                        </button>
                    </motion.div>

                    {/* Footer text */}
                    <div className="sum-landing-footer">
                        Entry: KES 20 | 100-400 points per stage | -50 pts hint
                    </div>
                </div>
            </main>

            {/* Profile Modal */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={handleModalClose}
                onSave={handleSaveProfile}
                initialProfile={profile}
                isAttemptingPlay={isAttemptingPlay}
            />

            {/* Leaderboard Modal */}
            <LeaderboardModal
                isOpen={isLeaderboardModalOpen}
                onClose={() => setIsLeaderboardModalOpen(false)}
            />

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onPay={handlePaymentSuccess}
                profile={profile}
            />
        </div>
    );
}
