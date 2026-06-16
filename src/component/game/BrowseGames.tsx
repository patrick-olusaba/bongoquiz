import { FC } from 'react';
import bongoPoster from '../../assets/gamesposter/bongoquizb.png';
import biblePoster from '../../assets/gamesposter/Bible-IMG.png';
import biologyPoster from '../../assets/gamesposter/biologyquizposter.png';
import mathPoster from '../../assets/gamesposter/MathQuiz.png';
import gkPoster from '../../assets/gamesposter/GeneralKnowledge.png';
import Sudoku from '../../assets/gamesposter/sodoku.png';
import ConnectDots from '../../assets/gamesposter/ConnectDots.png';
import '../../styles/HomeScreen.css';

const GAMES = [
    { label: 'General Knowledge', logo: gkPoster, path: '/general-knowledge', tag: 'NEW' },
    { label: 'Bible Quiz', logo: biblePoster, path: '/bible-quiz', tag: 'NEW' },
    { label: 'Biology Quiz', logo: biologyPoster, path: '/biology-quiz', tag: 'NEW' },
    { label: 'Math Quiz', logo: mathPoster, path: '/math-quiz', tag: 'NEW' },
    { label: 'Sudoku', logo: Sudoku, path: '/sudoku', tag: 'NEW' },
    { label: 'Bongo Quiz', logo: bongoPoster, path: '/', tag: 'HOT' },
    { label: 'Connect Dots', logo: ConnectDots, path: '/connect-dots', tag: 'HOT' },
];

interface Props { exclude?: string; }

export const BrowseGames: FC<Props> = ({ exclude }) => {
    const games = GAMES.filter(g => g.label !== exclude);
    return (
        <div className="home-browse-games">
            <div className="home-browse-header">
                <span className="home-browse-title">MORE GAMES</span>
            </div>
            <div className="home-browse-grid">
                {games.map(app => (
                    <div key={app.label} className="home-browse-item" onClick={() => { window.location.href = app.path; }}>
                        {app.tag &&
                            <span className={`home-browse-tag${app.tag === 'HOT' ? ' hot' : ''}`}>{app.tag}</span>}
                        <div className="home-browse-img-wrap">
                            <img src={app.logo} alt={app.label} />
                        </div>
                        <span className="home-browse-label">{app.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};