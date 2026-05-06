import { FC, useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trophy, Star, Gamepad2, Flame } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { PlayerNameModal } from './Playernamemodal';
import bongoPoster from '../../assets/gamesposter/bongoquizb.png';
import biblePoster from '../../assets/gamesposter/Bible-IMG.png';
import biologyPoster from '../../assets/gamesposter/biologyquizposter.png';

const GAME_INFO: Record<string, { name: string; logo: string }> = {
    bongo:   { name: 'Bongo Quiz',   logo: bongoPoster },
    bible:   { name: 'Bible Quiz',   logo: biblePoster },
    biology: { name: 'Biology Quiz', logo: biologyPoster },
};

function detectGame(s: Session) {
    if (s.gameType) return GAME_INFO[s.gameType] ?? GAME_INFO.bongo;
    if (s.r1Score !== undefined) return GAME_INFO.bongo;
    return GAME_INFO.bongo;
}
import '../../styles/ProfilePage.css';

interface Props { onBack: () => void; onNavigate: (tab: 'home' | 'games' | 'spin' | 'leaderboard' | 'profile') => void; }

interface Session { total?: number; score?: number; playedAt: any; power?: string; gameType?: string; r1Score?: number; }

export const ProfilePage: FC<Props> = ({ onBack, onNavigate }) => {
    const [name, setName] = useState(() => localStorage.getItem('bongo_player_name') ?? 'Player');
    const [phone, setPhone] = useState(() => localStorage.getItem('bongo_player_phone') ?? '');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showEdit, setShowEdit] = useState(false);
    const [allSessions, setAllSessions] = useState<Session[]>([]);

    useEffect(() => {
        if (!phone || !/^07\d{8}$/.test(phone)) return;

        const q = (col: string) => getDocs(query(collection(db, col), where('phone', '==', phone)));

        Promise.all([q('gameSessions'), q('bibleQuizSessions'), q('bioQuizSessions')])
            .then(([bongo, bible, bio]) => {
                const all: Session[] = [
                    ...bongo.docs.map(d => ({ ...d.data(), gameType: 'bongo' } as Session)),
                    ...bible.docs.map(d => ({ ...d.data(), gameType: 'bible' } as Session)),
                    ...bio.docs.map(d => ({ ...d.data(), gameType: 'biology' } as Session)),
                ];
                const sorted = all.sort((a, b) => {
                    const ta = a.playedAt?.toDate?.()?.getTime() ?? 0;
                    const tb = b.playedAt?.toDate?.()?.getTime() ?? 0;
                    return tb - ta;
                });
                setSessions(sorted.slice(0, 10));
                setAllSessions(all);
            }).catch(() => {});
    }, [phone]);

    const gamesPlayed = allSessions.length;
    const getScore = (s: Session) => s.gameType === 'bongo' ? (s.total ?? 0) : (s.score ?? s.total ?? 0);
    const personalBest = allSessions.reduce((max, s) => Math.max(max, getScore(s)), 0);
    const totalPoints = allSessions.reduce((sum, s) => sum + getScore(s), 0);
    const streak = parseInt(localStorage.getItem('bongo_streak') ?? '0');

    const handleLogout = () => {
        ['bongo_player_name','bongo_player_phone','bongo_best_score','bongo_total_points',
         'bongo_session_score','bongo_achievements','bongo_streak','bongo_last_activity']
            .forEach(k => localStorage.removeItem(k));
        onBack();
    };

    return (
        <div className="profile-page">
            <div className="profile-topbar">
                <button className="profile-back" onClick={onBack}>←</button>
                <span className="profile-topbar-title">Profile</span>
            </div>

            {/* Avatar */}
            <div className="profile-avatar-section">
                <div className="profile-avatar">{name.charAt(0).toUpperCase()}</div>
                <h2 className="profile-name">{name}</h2>
                <p className="profile-phone">{phone || 'No phone set'}</p>
                <button className="profile-edit-btn" onClick={() => setShowEdit(true)}>✏️ Edit Profile</button>
            </div>

            {/* Stats */}
            <div className="profile-stats">
                {[
                    { label: 'Personal Best', value: personalBest.toLocaleString(), icon: <Trophy size={28} color="#FFD700" />, color: '#FFD700' },
                    { label: 'Total Points',  value: totalPoints.toLocaleString(),  icon: <Star size={28} color="#FFD700" fill="#FFD700" />, color: '#FFD700' },
                    { label: 'Games Played',  value: gamesPlayed,                   icon: <Gamepad2 size={28} color="#a855f7" />, color: '#a855f7' },
                    { label: 'Win Streak',    value: `${streak} days`,              icon: <Flame size={28} color="#ff6b35" />, color: '#ff6b35' },
                ].map(s => (
                    <div key={s.label} className="profile-stat-card">
                        <span className="profile-stat-icon">{s.icon}</span>
                        <span className="profile-stat-value" style={{color: s.color}}>{s.value}</span>
                        <span className="profile-stat-label">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Recent Games */}
            <div className="profile-section">
                <h3 className="profile-section-title">Recent Games</h3>
                {sessions.length === 0 ? (
                    <p className="profile-empty">No games played yet</p>
                ) : (
                <div className="profile-sessions-scroll">
                {sessions.map((s, i) => {
                    const game = detectGame(s);
                    return (
                    <div key={i} className="profile-session">
                        <div className="profile-session-left">
                            <img src={game.logo} alt={game.name} className="profile-session-logo" />
                            <div>
                                <p className="profile-session-game">{game.name}</p>
                                {s.gameType === 'bongo' && s.power && (
                                    <p className="profile-session-power">{s.power}</p>
                                )}
                                <p className="profile-session-date">
                                    {s.playedAt?.toDate?.()?.toLocaleDateString() ?? 'Recent'}
                                </p>
                            </div>
                        </div>
                        <span className="profile-session-score">{getScore(s).toLocaleString()} pts</span>
                    </div>
                    );
                })}
                </div>
                )}
            </div>

            {/* Logout */}
            <button className="profile-logout-btn" onClick={handleLogout}>🚪 Log Out</button>

            <BottomNav active="profile" onNavigate={onNavigate} />

            {showEdit && (
                <PlayerNameModal
                    currentName={name}
                    currentPhone={phone}
                    onSave={(n, p) => {
                        setName(n); setPhone(p);
                        localStorage.setItem('bongo_player_name', n);
                        localStorage.setItem('bongo_player_phone', p);
                        setShowEdit(false);
                    }}
                    onClose={() => setShowEdit(false)}
                />
            )}
        </div>
    );
};
