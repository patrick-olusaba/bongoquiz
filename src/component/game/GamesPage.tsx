import {FC, useEffect, useMemo, useState} from 'react';
import {collection, doc, getDocs, serverTimestamp, setDoc} from 'firebase/firestore';
import {db} from '../../firebase.ts';
import biblePoster from '../../assets/gamesposter/Bible-IMG.png';
import bongobanner from '../../assets/gamesbanners/bongoquizbanner.png';
import biblebanner from '../../assets/gamesbanners/biblebanner.png';
import mathbanner from '../../assets/gamesbanners/MathQuiz-banner.png';
import sudokubanner from '../../assets/gamesbanners/sudokubanner.png';
import biologyPoster from '../../assets/gamesposter/biologyquizposter.png';
import bongoPoster from '../../assets/gamesposter/bongoquizb.png';
import mathPoster from '../../assets/gamesposter/MathQuiz.png';
import gkPoster from '../../assets/gamesposter/GeneralKnowledge.png';
import sudokuPoster from '../../assets/gamesposter/sodoku.png';
import {BottomNav} from './BottomNav';
import '../../styles/GamesPage.css';

interface Props {
    onBack: () => void;
    onPlayBongo: () => void;
    onNavigate: (tab: 'home' | 'games' | 'spin' | 'leaderboard' | 'profile') => void;
}

type GameCategory = 'all' | 'new' | 'timed' | 'hot' | 'quiz' | 'puzzle' | 'arcade';

const SliderGAMES = [
    {
        label: 'Bongo Quiz',
        poster: bongobanner,
        tag: 'HOT',
        path: null,
        desc: '3 skill rounds · bonus points · leaderboard ranking',
        category: 'quiz',
        hot: true,
        new: true,
        timed: true
    },
    // { label: 'General Knowledge', poster: gkPoster, tag: 'NEW', path: '/general-knowledge', desc: 'Science, history, geography & more', category: 'quiz', new: true, timed: true },
    {
        label: 'Street Bongo',
        poster: bongobanner,
        tag: 'NEW',
        path: '/street-bongo',
        desc: '2 out of 3 street challenge · chicken meal prize',
        category: 'quiz',
        hot: true,
        new: true,
        timed: true
    },
    {
        label: 'Bible Quiz',
        poster: biblebanner,
        tag: 'NEW',
        path: '/bible-quiz',
        desc: 'Test your biblical knowledge',
        category: 'quiz',
        new: true
    },
    // { label: 'Biology Quiz', poster: biologyPoster, tag: 'NEW', path: '/biology-quiz', desc: 'Science trivia challenge', category: 'quiz', new: true, timed: true },
    {
        label: 'Math Quiz',
        poster: mathbanner,
        tag: 'NEW',
        path: '/math-quiz',
        desc: 'Numbers, algebra & more',
        category: 'quiz',
        new: true,
        timed: true
    },
    {
        label: 'Sudoku',
        poster: sudokubanner,
        tag: 'NEW',
        path: '/sudoku',
        desc: 'Logic puzzle · stages · score ranking',
        category: 'puzzle',
        new: true
    },
];

const GAMES = [
    {
        label: 'Bongo Quiz',
        poster: bongoPoster,
        tag: 'HOT',
        path: null,
        desc: '3 skill rounds · bonus points · leaderboard ranking',
        category: 'quiz',
        hot: true,
        new: false,
        timed: true
    },
    {
        label: 'Street Bongo',
        poster: bongoPoster,
        tag: 'NEW',
        path: '/street-bongo',
        desc: 'Fast host-led 2 out of 3 challenge for street shoots',
        category: 'quiz',
        hot: true,
        new: true,
        timed: true
    },
    {
        label: 'General Knowledge',
        poster: gkPoster,
        tag: 'NEW',
        path: '/general-knowledge',
        desc: 'Science, history, geography & more',
        category: 'quiz',
        new: true,
        timed: true
    },
    {
        label: 'Bible Quiz',
        poster: biblePoster,
        tag: 'NEW',
        path: '/bible-quiz',
        desc: 'Test your biblical knowledge',
        category: 'quiz',
        new: true
    },
    {
        label: 'Biology Quiz',
        poster: biologyPoster,
        tag: 'NEW',
        path: '/biology-quiz',
        desc: 'Science trivia challenge',
        category: 'quiz',
        new: true,
        timed: true
    },
    {
        label: 'Math Quiz',
        poster: mathPoster,
        tag: 'NEW',
        path: '/math-quiz',
        desc: 'Numbers, algebra & more',
        category: 'quiz',
        new: true,
        timed: true
    },
    {
        label: 'Sudoku',
        poster: sudokuPoster,
        tag: 'NEW',
        path: '/sudoku',
        desc: 'Logic puzzle · stages · score ranking',
        category: 'puzzle',
        new: true
    },
];

const FILTERS: { id: GameCategory; label: string }[] = [
    {id: 'all', label: 'All Games'},
    {id: 'new', label: 'New'},
    {id: 'timed', label: 'Timed Trivia'},
    {id: 'hot', label: 'Hot'},
    {id: 'quiz', label: 'Quizzes'},
    {id: 'puzzle', label: 'Puzzle'},
    {id: 'arcade', label: 'Arcade'},
];

interface WinnerEntry {
    rank: number;
    name: string;
    phone?: string;
    score: number;
}

const toPhoneKey = (phone: string) => String(phone).replace(/^0/, '254');

const maskPhoneName = (phone: string) => {
    const phone07 = phone.replace(/^254/, '0');
    return `${phone07.slice(0, 3)}*******`;
};

export const GamesPage: FC<Props> = ({onBack, onPlayBongo, onNavigate}) => {
    const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
    const [activeSlide, setActiveSlide] = useState(0);
    const [winners, setWinners] = useState<WinnerEntry[]>([]);
    const filteredGames = useMemo(
        () => {
            if (activeCategory === 'all') return GAMES;
            if (activeCategory === 'new') return GAMES.filter(g => g.new);
            if (activeCategory === 'hot') return GAMES.filter(g => g.hot);
            if (activeCategory === 'timed') return GAMES.filter(g => g.timed);
            if (activeCategory === 'arcade') return [];
            return GAMES.filter(g => g.category === activeCategory);
        },
        [activeCategory]
    );
    const activeLabel = FILTERS.find(f => f.id === activeCategory)?.label ?? 'All Games';
    const featuredSlides = SliderGAMES.slice(0, 5);
    const featured = featuredSlides[activeSlide] ?? featuredSlides[0];

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveSlide(current => (current + 1) % featuredSlides.length);
        }, 4500);
        return () => window.clearInterval(timer);
    }, [featuredSlides.length]);

    useEffect(() => {
        const sqlFetch = fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard')
            .then(r => r.json())
            .catch(() => []);

        const fbFetch = getDocs(collection(db, 'leaderboard'))
            .then(snap => snap.docs.map(d => ({...d.data(), id: d.id})))
            .catch(() => []);

        Promise.all([sqlFetch, fbFetch]).then(([sqlRaw, fbRaw]) => {
            const byPhone = new Map<string, { name: string; phone: string; score: number }>();

            (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
                const phone = toPhoneKey(String(d.msisdn ?? ''));
                if (!phone) return;

                const score = Number(d.score ?? 0);
                const existing = byPhone.get(phone);

                if (!existing || score > existing.score) {
                    byPhone.set(phone, {name: maskPhoneName(phone), phone, score});
                }
            });

            (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
                const phone = toPhoneKey(String(d.phone || d.id || ''));
                if (!phone) return;

                const score = Number(d.score ?? 0);
                const existing = byPhone.get(phone);
                const name = d.name && !/^\d/.test(d.name)
                    ? d.name
                    : existing?.name ?? d.name ?? maskPhoneName(phone);

                if (!existing || score > existing.score) {
                    byPhone.set(phone, {name, phone, score});
                } else if (existing && name && !/^\d/.test(name)) {
                    byPhone.set(phone, {...existing, name});
                }
            });

            byPhone.forEach(({name, phone, score}) => {
                const phone07 = phone.replace(/^254/, '0');
                setDoc(
                    doc(db, 'leaderboard', phone07),
                    {name, phone: phone07, score, updatedAt: serverTimestamp()},
                    {merge: true}
                ).catch(() => {
                });
            });

            const topWinners = Array.from(byPhone.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 30)
                .map((winner, index) => ({...winner, rank: index + 1}));

            setWinners(topWinners);
        });
    }, []);


    return (
        <div className="games-page">
            <div className="games-shell">
                <div className="games-topbar">
                    <button className="games-back" onClick={onBack} aria-label="Back">←</button>
                    <div>
                        <span className="games-kicker">Game Library</span>
                        <h1 className="games-title">All Games</h1>
                    </div>
                </div>

                <div className="games-hero">
                    <img src={featured.poster}
                         alt={featured.label}
                         className="games-hero-img"
                         onClick={() => {
                             if (featured.path) {
                                 window.location.href = featured.path;
                             } else {
                                 onPlayBongo();
                             }
                         }}
                    />
                    <div className="games-hero-overlay">
                        <span className="games-hero-badge">{featured.tag ?? 'Featured'}</span>
                        {/*<div className="games-hero-copy">*/}
                        {/*    <p>{featured.category === 'puzzle' ? 'Featured Puzzle' : 'Featured Quiz'}</p>*/}
                        {/*    <h2>{featured.label}</h2>*/}
                        {/*    <span>{featured.desc}</span>*/}
                        {/*</div>*/}
                    </div>
                    <div className="games-hero-dots" aria-hidden="true">
                        {featuredSlides.map((slide, index) => (
                            <button
                                key={slide.label}
                                className={activeSlide === index ? 'active' : ''}
                                onClick={() => setActiveSlide(index)}
                                type="button"
                                aria-label={`Show ${slide.label}`}
                            />
                        ))}
                    </div>
                </div>

                <section className="games-winners" aria-label="Top winners">
                    <div className="games-winners-head">
                        <span className="games-live-dot"/>
                        <strong>Live</strong>
                        <span>Top winners</span>
                    </div>
                    <div className="games-winners-marquee">
                        <div className="games-winners-track">
                            {[...winners, ...winners].map((winner, index) => (
                                <div className="games-winner" key={`${winner.phone ?? winner.name}-${index}`}>
                                    <span className="games-winner-avatar">
                                        {winner.name.slice(0, 2).toUpperCase()}
                                    </span>

                                    <div className="games-winner-info">
                                        <strong>{winner.name}</strong>
                                        <span>#{winner.rank} Player</span>
                                    </div>

                                    <b>{winner.score.toLocaleString()}</b>
                                </div>
                                // <div className="games-winner" key={`${winner.rank}-${winner.name}`}>
                                //     <span className="games-winner-avatar">{winner.name.slice(0, 2).toUpperCase()}</span>
                                //     <div className="games-winner-info">
                                //         <span className="games-winner-rank">{winner.rank}</span>
                                //         <strong>{winner.name}</strong>
                                //     </div>
                                //     <b>{winner.score.toLocaleString()}</b>
                                // </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="games-browse-head">Browse</div>
                <div className="games-filter-pills" aria-label="Game categories">
                    {FILTERS.map(filter => (
                        <button
                            key={filter.id}
                            className={`games-filter-pill${activeCategory === filter.id ? ' active' : ''}`}
                            onClick={() => setActiveCategory(filter.id)}
                            type="button"
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
                <div className="games-current-filter">Currently viewing: <strong>{activeLabel}</strong></div>

                <div className="games-grid">
                    {filteredGames.length > 0 ? filteredGames.map(g => (
                        <div key={g.label}
                             className="games-card"
                             onClick={() => {
                                 if (g.path) window.location.href = g.path;
                                 else onPlayBongo();
                             }}
                        >
                            <div className="games-card-img">
                                <img src={g.poster} alt={g.label}/>
                                {g.tag && <span className={`games-tag ${g.tag === 'HOT' ? ' hot' : ''}`}>{g.tag}</span>}
                            </div>
                            <div className="games-card-info">
                                <div className="games-card-meta">
                                    <span>{g.category === 'puzzle' ? 'Puzzle' : 'Quiz'}</span>
                                </div>
                                <p className="games-card-name">{g.label}</p>
                                <p className="games-card-desc">{g.desc}</p>
                            </div>
                            <button className="games-play-btn" onClick={() => {
                                if (g.path) window.location.href = g.path;
                                else onPlayBongo();
                            }}>Play
                            </button>
                        </div>
                    )) : (
                        <div className="games-empty">
                            <strong>Arcade games coming soon</strong>
                            <span>New categories will appear here as more games are added.</span>
                        </div>
                    )}
                </div>

                <footer className="games-footer">
                    <div className="games-footer-brand">
                        <strong>Bongo Quiz</strong>
                        <span>Play games, earn points, climb the leaderboard.</span>
                    </div>
                    <div className="games-footer-links">
                        <button type="button" onClick={onBack}>Home</button>
                        <button type="button" onClick={() => onNavigate('leaderboard')}>Leaderboard</button>
                        <button type="button" onClick={() => window.location.href = "/contact"}>Support</button>
                    </div>
                </footer>
            </div>

            <BottomNav active="games" onNavigate={onNavigate}/>
        </div>
    );
};