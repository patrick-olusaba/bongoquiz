import { FC } from 'react';
import bongoPoster from '../../assets/gamesposter/bongoquizb.png';
import biblePoster from '../../assets/gamesposter/Bible-IMG.png';
import biologyPoster from '../../assets/gamesposter/biologyquizposter.png';
import '../../styles/HomeScreen.css';

const GAMES = [
    { label: 'Bible Quiz', logo: biblePoster, path: '/bible-quiz', tag: 'NEW' },
    { label: 'Biology Quiz', logo: biologyPoster, path: '/biology-quiz', tag: 'NEW' },
    { label: 'Bongo Quiz', logo: bongoPoster, path: '/', tag: 'HOT' },
];

interface Props { exclude?: string; }

export const BrowseGames: FC<Props> = ({ exclude }) => {
    const games = GAMES.filter(g => g.label !== exclude);
    return (
        <div className="home-browse-games">
            <div className="home-browse-header">
                <span className="home-browse-title">BROWSE GAMES</span>
            </div>
            <div className="home-browse-grid">
                {games.map(app => (
                    <div key={app.label} className="home-browse-item" onClick={() => { window.location.href = app.path; }}>
                        {app.tag && <span className={`home-browse-tag${app.tag === 'HOT' ? ' hot' : ''}`}>{app.tag}</span>}
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
