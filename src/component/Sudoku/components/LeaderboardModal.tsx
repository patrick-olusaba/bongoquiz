import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { UserProfile } from './ProfileModal';

interface LeaderboardModalProps {
    userProfile: UserProfile | null;
    onClose: () => void;
}

export function LeaderboardModal({ userProfile, onClose }: LeaderboardModalProps) {
    const [entries, setEntries] = useState<{ name: string; phone: string; score: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDocs(query(collection(db, 'sudokuLeaderboard'), orderBy('score', 'desc'), limit(50)))
            .then(snap => setEntries(snap.docs.map(d => d.data() as { name: string; phone: string; score: number })))
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="profile-modal leaderboard-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '1.5rem' }}>
                <div className="profile-modal-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="profile-modal-title" style={{ fontSize: '1.25rem' }}>Leaderboard</h2>
                    <button className="profile-modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                {loading ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
                ) : entries.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No scores yet</p>
                ) : (
                    <div className="leaderboard-list">
                        {entries.map((player, index) => {
                            const isCurrent = userProfile?.phone === player.phone;
                            return (
                                <div key={player.phone} className={`leaderboard-item ${isCurrent ? 'current-user' : ''}`}>
                                    <div className="leaderboard-rank-container">
                                        <span className="leaderboard-hash">#</span>
                                        <span className="leaderboard-rank-number">{index + 1}</span>
                                    </div>
                                    <div className="leaderboard-info">
                                        <div className="leaderboard-name">{player.name}</div>
                                        <div className="leaderboard-phone">{player.phone}</div>
                                    </div>
                                    <div className="leaderboard-stats">
                                        <div className="leaderboard-score">{player.score} pts</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
