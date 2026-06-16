import { FC, useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trophy, Star, Gamepad2, Flame } from 'lucide-react';
import { BottomNav } from './BottomNav';
import type { MainNavTab } from '../../types/gametypes.ts';
import { PlayerNameModal } from './Playernamemodal';
import bongoPoster from '../../assets/gamesposter/bongoquizb.png';
import biblePoster from '../../assets/gamesposter/Bible-IMG.png';
import biologyPoster from '../../assets/gamesposter/biologyquizposter.png';
import mathPoster from '../../assets/gamesposter/MathQuiz.png';
import genKnowledgePoster from '../../assets/gamesposter/GeneralKnowledge.png';
import sudokuPoster from '../../assets/gamesposter/sodoku.png';
import connectDotsPoster from '../../assets/gamesposter/ConnectDots.png';

const GAME_INFO: Record<string, { name: string; logo: string }> = {
    bongo:        { name: 'Bongo Quiz',         logo: bongoPoster },
    bible:        { name: 'Bible Quiz',          logo: biblePoster },
    biology:      { name: 'Biology Quiz',        logo: biologyPoster },
    math:         { name: 'Math Quiz',           logo: mathPoster },
    genKnowledge: { name: 'General Knowledge',   logo: genKnowledgePoster },
    sudoku:       { name: 'Sudoku',              logo: sudokuPoster },
    connectDots:  { name: 'Connect Dots',        logo: connectDotsPoster },
    tournament:   { name: 'Tournament',          logo: genKnowledgePoster },
};

function detectGame(s: Session) {
    if (s.gameType) return GAME_INFO[s.gameType] ?? GAME_INFO.bongo;
    if (s.r1Score !== undefined) return GAME_INFO.bongo;
    return GAME_INFO.bongo;
}
import '../../styles/ProfilePage.css';

interface Props { onBack: () => void; onNavigate: (tab: MainNavTab) => void; }

interface Session { total?: number; score?: number; playedAt: any; power?: string; gameType?: string; r1Score?: number; }

export const ProfilePage: FC<Props> = ({ onBack, onNavigate }) => {
    const [name, setName] = useState(() => localStorage.getItem('bongo_player_name') ?? 'Player');
    const [phone, setPhone] = useState(() => localStorage.getItem('bongo_player_phone') ?? '');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showEdit, setShowEdit] = useState(false);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [leaderboardTotal, setLeaderboardTotal] = useState<number | null>(null);

    useEffect(() => {
        if (!phone) return;
        const phone254 = phone.replace(/^0/, '254');
        fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard')
            .then(r => r.json())
            .then((data: any[]) => {
                const entry = data.find((d: any) => String(d.msisdn) === phone254 || String(d.msisdn) === phone);
                if (entry) setLeaderboardTotal(entry.score ?? 0);
            }).catch(() => {});
    }, [phone]);

    useEffect(() => {
        if (!phone || !/^07\d{8}$/.test(phone)) return;

        const q = (col: string) => getDocs(query(collection(db, col), where('phone', '==', phone)));

        Promise.all([
            q('gameSessions'), q('bibleQuizSessions'), q('bioQuizSessions'),
            q('mathQuizSessions'), q('genQuizSessions'), q('sudokuSessions'), q('connectDotsSessions'),
        ]).then(([bongo, bible, bio, math, genKnowledge, sudoku, connectDots]) => {
                const all: Session[] = [
                    ...bongo.docs.map(d => ({ ...d.data(), gameType: 'bongo' } as Session)),
                    ...bible.docs.map(d => ({ ...d.data(), gameType: 'bible' } as Session)),
                    ...bio.docs.map(d => ({ ...d.data(), gameType: 'biology' } as Session)),
                    ...math.docs.map(d => ({ ...d.data(), gameType: 'math' } as Session)),
                    ...genKnowledge.docs.map(d => ({ ...d.data(), gameType: 'genKnowledge' } as Session)),
                    ...sudoku.docs.map(d => ({ ...d.data(), gameType: 'sudoku' } as Session)),
                    ...connectDots.docs.map(d => ({ ...d.data(), gameType: 'connectDots' } as Session)),
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
    const bongoSessions = allSessions.filter(s => s.gameType === 'bongo');
    const personalBest = bongoSessions.reduce((max, s) => Math.max(max, s.total ?? 0), 0);
    const totalPoints = leaderboardTotal ?? bongoSessions.reduce((sum, s) => sum + (s.total ?? 0), 0);
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
                <h1>Profile</h1>
                <button className="profile-logout-btn" onClick={handleLogout}>Log Out</button>
            </div>

            <div className="profile-content">
                {/* Hero */}
                <div className="profile-hero">
                    <div className="profile-avatar">
                        {name.charAt(0).toUpperCase()}
                        <button className="profile-edit-btn" onClick={() => setShowEdit(true)} aria-label="Edit profile">✏</button>
                    </div>
                    <strong className="profile-hero-name">{name}</strong>
                    <span className="profile-hero-phone">{phone || 'No phone set'}</span>
                    <button className="profile-hero-action" onClick={() => setShowEdit(true)}>Edit Profile</button>
                </div>

                {/* Stats */}
                <div className="profile-stats">
                    <div className="profile-stat">
                        <div className="profile-stat-icon gold"><Trophy size={18} /></div>
                        <div className="profile-stat-value">{personalBest.toLocaleString()}</div>
                        <div className="profile-stat-label">Personal Best</div>
                    </div>
                    <div className="profile-stat">
                        <div className="profile-stat-icon gold"><Star size={18} /></div>
                        <div className="profile-stat-value">{totalPoints.toLocaleString()}</div>
                        <div className="profile-stat-label">Total Points</div>
                    </div>
                    <div className="profile-stat">
                        <div className="profile-stat-icon purple"><Gamepad2 size={18} /></div>
                        <div className="profile-stat-value">{gamesPlayed}</div>
                        <div className="profile-stat-label">Games Played</div>
                    </div>
                    <div className="profile-stat">
                        <div className="profile-stat-icon green"><Flame size={18} /></div>
                        <div className="profile-stat-value">{streak}</div>
                        <div className="profile-stat-label">Day Streak</div>
                    </div>
                </div>

                {/* Recent Games */}
                <div className="profile-section">
                    <div className="profile-section-head">
                        <h2>Recent Games</h2>
                        <span>{sessions.length} sessions</span>
                    </div>
                    <div className="session-list">
                        {sessions.length === 0 ? (
                            <div className="session-empty">No games played yet. Start playing to see your history here.</div>
                        ) : sessions.map((s, i) => {
                            const game = detectGame(s);
                            const dateStr = s.playedAt?.toDate?.() ? (() => {
                                const d = s.playedAt.toDate();
                                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                            })() : 'Recent';
                            return (
                                <div key={i} className="session-card">
                                    <img src={game.logo} alt={game.name} className="session-game-logo" />
                                    <div className="session-info">
                                        <strong>{game.name}</strong>
                                        <span>{dateStr}{s.gameType === 'bongo' && s.power ? ` · ${s.power}` : ''}</span>
                                    </div>
                                    <span className="session-score">{getScore(s).toLocaleString()} pts</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

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
