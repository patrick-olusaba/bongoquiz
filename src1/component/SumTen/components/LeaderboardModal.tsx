import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useProfile } from '../hooks/useProfile';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
    const { entries } = useLeaderboard();
    const { profile } = useProfile();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="sum-leaderboard-overlay" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="sum-leaderboard-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sum-leaderboard-header">
                            <h2 className="sum-leaderboard-title">Leaderboard</h2>
                            <button
                                onClick={onClose}
                                className="sum-leaderboard-close-btn"
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="sum-leaderboard-divider" />

                        {/* Content */}
                        <div className="sum-leaderboard-content">
                            {entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-white/50 text-center">
                                    <p>No scores yet.</p>
                                    <p className="text-sm">Play a game to appear on the leaderboard!</p>
                                </div>
                            ) : (
                                entries.map((entry, idx) => {
                                    const isCurrentUser = profile && entry.name === profile.name && entry.phone === profile.phone;
                                    return (
                                        <div key={entry.id} className={`sum-leaderboard-item ${isCurrentUser ? 'border-[#f43f5e] bg-[#f43f5e]/10' : ''}`}>
                                            <div className="sum-leaderboard-item-left">
                        <span className="sum-leaderboard-rank">
                          #{idx + 1}
                        </span>
                                                <div className="sum-leaderboard-info">
                                                    <span className="sum-leaderboard-name">{entry.name} {isCurrentUser ? '(You)' : ''}</span>
                                                    <span className="sum-leaderboard-phone">{entry.phone}</span>
                                                </div>
                                            </div>
                                            <div className="sum-leaderboard-item-right">
                                                <span className="sum-leaderboard-points">{entry.points} pts</span>
                                                <span className="sum-leaderboard-date">{entry.date}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
