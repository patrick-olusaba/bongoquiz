import { FC, useMemo, useState } from 'react';
import { Search, Play } from 'lucide-react';
import bongoBg from '../../assets/gamesposter/bongoquizb.webp';
import bibleBg from '../../assets/gamesposter/Bible-IMG.webp';
import biologyBg from '../../assets/gamesposter/biologyquizposter.webp';
import mathBg from '../../assets/gamesposter/MathQuiz.webp';
import gkBg from '../../assets/gamesposter/GeneralKnowledge.webp';
import sudokuBg from '../../assets/gamesposter/sodoku.webp';
import connectDotsBg from '../../assets/gamesposter/ConnectDots.webp';
import sumTenBg from '../../assets/gamesposter/sumten.webp';

import '../../styles/HomeScreen.css';

type FilterKey = 'all' | 'new' | 'timed' | 'hot';
type Category = 'Trivia' | 'Numbers' | 'Puzzle';

type GameItem = {
    label: string;
    background: string;
    path: string;
    tag: 'NEW' | 'HOT';
    category: Category;
    timed?: boolean;
    featured?: boolean;
    tagline?: string;
};

const GAMES: GameItem[] = [
    { label: 'Bongo Quiz', background: bongoBg, path: '/bongo-quiz', tag: 'HOT', category: 'Trivia', timed: true, featured: true, tagline: 'Race the clock across 3 skill rounds and climb the daily leaderboard.' },
    { label: 'General Knowledge', background: gkBg, path: '/general-knowledge', tag: 'NEW', category: 'Trivia', timed: true },
    { label: 'Bible Quiz', background: bibleBg, path: '/bible-quiz', tag: 'NEW', category: 'Trivia', timed: true },
    { label: 'Biology Quiz', background: biologyBg, path: '/biology-quiz', tag: 'NEW', category: 'Trivia', timed: true },
    { label: 'Math Quiz', background: mathBg, path: '/math-quiz', tag: 'NEW', category: 'Numbers', timed: true },
    { label: 'Sum Ten', background: sumTenBg, path: '/sum-ten', tag: 'HOT', category: 'Numbers', timed: true },
    { label: 'Sudoku', background: sudokuBg, path: '/sudoku', tag: 'NEW', category: 'Puzzle' },
    { label: 'Connect Dots', background: connectDotsBg, path: '/connect-dots', tag: 'HOT', category: 'Puzzle' },
];

interface Props {
    exclude?: string;
    /** Called instead of navigating when the featured (Bongo Quiz) game is played. */
    onFeaturedPlay?: () => void;
}

export const BrowseGames: FC<Props> = ({ exclude, onFeaturedPlay }) => {
    const openGame = (game: GameItem) => {
        if (game.featured && onFeaturedPlay) onFeaturedPlay();
        else window.location.href = game.path;
    };

    const [filter, setFilter] = useState<FilterKey>('all');
    const [search, setSearch] = useState('');

    const term = search.trim().toLowerCase();
    const featured = GAMES.find(g => g.featured);
    // Featured spotlight only in the default view; it collapses once the user
    // filters or searches so the hero stays relevant to what's shown.
    const showHero = Boolean(featured && featured.label !== exclude && filter === 'all' && term === '');

    const games = useMemo(() => {
        return GAMES.filter(game => {
            if (exclude && game.label === exclude) return false;
            if (showHero && featured && game.label === featured.label) return false;
            if (filter === 'new' && game.tag !== 'NEW') return false;
            if (filter === 'timed' && !game.timed) return false;
            if (filter === 'hot' && game.tag !== 'HOT') return false;
            if (term && !game.label.toLowerCase().includes(term)) return false;
            return true;
        });
    }, [exclude, filter, term, showHero, featured]);

    const viewingLabel = filter === 'all' ? 'All Games'
        : filter === 'timed' ? 'Timed Trivia'
        : filter === 'new' ? 'New'
        : 'Hot';

    return (
        <section className="home-browse-games home-browse-games--grid">

            {showHero && featured && (
                <button
                    type="button"
                    className="home-browse-hero"
                    onClick={() => openGame(featured)}
                >
                    <div className="home-browse-hero-art">
                        <img src={featured.background} alt={featured.label} />
                        <span className="home-browse-hero-scrim" aria-hidden="true" />
                    </div>
                    <div className="home-browse-hero-body">
                        <span className="home-browse-hero-eyebrow">Featured</span>
                        <span className="home-browse-hero-title">{featured.label}</span>
                        {featured.tagline && <span className="home-browse-hero-tagline">{featured.tagline}</span>}
                        <div className="home-browse-hero-meta">
                            <span className="home-browse-chip">{featured.category}</span>
                            <span className={`home-browse-chip home-browse-chip--${featured.tag.toLowerCase()}`}>{featured.tag}</span>
                        </div>
                        <span className="home-browse-hero-cta">
                            <Play size={16} fill="currentColor" /> Play now
                        </span>
                    </div>
                </button>
            )}
            <div className="home-browse-header home-browse-header--stacked">
                <div>
                    <span className="home-browse-title">Browse</span>
                    <div className="home-browse-current">Currently viewing: <strong>{viewingLabel}</strong></div>
                </div>

            </div>

            <div className="home-browse-search">
                <Search size={15} />
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search games"
                    aria-label="Search games"
                />
            </div>
            <div className="home-browse-filters" role="tablist" aria-label="Game filters">
                {([
                    ['all', 'All Games'],
                    ['new', 'New'],
                    ['timed', 'Timed Trivia'],
                    ['hot', 'Hot'],
                ] as Array<[FilterKey, string]>).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={filter === key}
                        className={filter === key ? 'home-browse-pill active' : 'home-browse-pill'}
                        onClick={() => setFilter(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {games.length === 0 ? (
                <div className="home-browse-empty">
                    <span className="home-browse-empty-title">No games found</span>
                    <span className="home-browse-empty-sub">
                        {term ? <>Nothing matches “<strong>{search.trim()}</strong>”.</> : 'Try a different filter.'}
                    </span>
                </div>
            ) : (
                <div className="home-browse-grid home-browse-grid--cards" key={`${filter}-${term}`}>
                    {games.map(app => (
                        <button
                            key={app.label}
                            type="button"
                            className="home-browse-card home-browse-card--rich"
                            onClick={() => openGame(app)}
                        >
                            <div className="home-browse-img-wrap">
                                <span className={app.tag === 'HOT' ? 'home-browse-tag hot' : 'home-browse-tag'}>{app.tag}</span>
                                <img src={app.background} alt={app.label} />
                                <span className="home-browse-play" aria-hidden="true">
                                    <Play size={18} fill="currentColor" />
                                </span>
                            </div>
                            <div className="home-browse-card-body">
                                <span className="home-browse-label">{app.label}</span>
                                <span className="home-browse-meta">{app.category} · {app.tag}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
};
