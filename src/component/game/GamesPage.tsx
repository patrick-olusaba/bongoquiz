import { FC } from 'react';
import biblePoster from '../../assets/gamesposter/Bible-IMG.png';
import biologyPoster from '../../assets/gamesposter/biologyquizposter.png';
import bongoPoster from '../../assets/gamesposter/bongoquizb.png';
import { BottomNav } from './BottomNav';
import '../../styles/GamesPage.css';

interface Props {
    onBack: () => void;
    onPlayBongo: () => void;
    onNavigate: (tab: 'home' | 'games' | 'spin' | 'leaderboard' | 'profile') => void;
}

const GAMES = [
    { label: 'Bongo Quiz', poster: bongoPoster, tag: 'HOT', path: null, desc: '3 explosive rounds · hidden powers · prize wheel' },
    { label: 'Bible Quiz', poster: biblePoster, tag: 'NEW', path: '/bible-quiz', desc: 'Test your biblical knowledge' },
    { label: 'Biology Quiz', poster: biologyPoster, tag: 'NEW', path: '/biology-quiz', desc: 'Science trivia challenge' },
];

export const GamesPage: FC<Props> = ({ onBack, onPlayBongo, onNavigate }) => (
    <div className="games-page">
        <div className="games-topbar">
            <button className="games-back" onClick={onBack}>←</button>
            <span className="games-title">All Games</span>
        </div>

        <div className="games-grid">
            {GAMES.map(g => (
            <div key={g.label} className="games-card">
                    <div className="games-card-img">
                        <img src={g.poster} alt={g.label} />
                        {g.tag && <span className={`games-tag ${g.tag === 'HOT' ? 'hot' : ''}`}>{g.tag}</span>}
                    </div>
                    <div className="games-card-info">
                        <p className="games-card-name">{g.label}</p>
                        <p className="games-card-desc">{g.desc}</p>
                    </div>
                    <button className="games-play-btn" onClick={() => {
                        if (g.path) window.location.href = g.path;
                        else onPlayBongo();
                    }}>PLAY</button>
                </div>
            ))}
        </div>

        <BottomNav active="games" onNavigate={onNavigate} />
    </div>
);
