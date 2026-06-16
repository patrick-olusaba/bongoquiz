import { type FC, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import bongoPoster from "../../assets/gamesposter/bongoquizb.png";
import biblePoster from "../../assets/gamesposter/Bible-IMG.png";
import biologyPoster from "../../assets/gamesposter/biologyquizposter.png";
import mathPoster from "../../assets/gamesposter/MathQuiz.png";
import gkPoster from "../../assets/gamesposter/GeneralKnowledge.png";
import sudokuPoster from "../../assets/gamesposter/sodoku.png";
import connectDotsPoster from "../../assets/gamesposter/ConnectDots.png";
import "../../styles/GamesPage.css";

interface Props {
    onStart: (playerName: string) => void;
    onLeaderboard: () => void;
    onHistory?: () => void;
    onReviewSession?: () => void;
    hasPaidSession?: boolean;
    triggerPlay?: boolean;
    onTriggerPlayDone?: () => void;
    onViewAllGames?: () => void;
    onWallet?: () => void;
    onMarket?: () => void;
    onBack?: () => void;
}

type GameFilter = "all" | "new" | "timed" | "hot";

type GameItem = {
    name: string;
    shortName: string;
    poster: string;
    path: string;
    tag: "NEW" | "HOT";
    category: string;
    desc: string;
    timed?: boolean;
    hot?: boolean;
};

const GAMES: GameItem[] = [
    { name: "Bongo Quiz", shortName: "Bongo Quiz", poster: bongoPoster, path: "/", tag: "HOT", category: "Flagship", desc: "Three rounds, bonus spins, and leaderboard points.", timed: true, hot: true },
    { name: "Sudoku", shortName: "Sudoku", poster: sudokuPoster, path: "/sudoku", tag: "HOT", category: "Puzzle", desc: "Solve grids and sharpen your logic.", hot: true },
    { name: "General Knowledge", shortName: "General Knowledge", poster: gkPoster, path: "/general-knowledge", tag: "NEW", category: "Trivia", desc: "Fast questions across everyday topics.", timed: true },
    { name: "Bible Quiz", shortName: "Bible Quiz", poster: biblePoster, path: "/bible-quiz", tag: "NEW", category: "Faith", desc: "Test scripture knowledge and memory.", timed: true },
    { name: "Biology Quiz", shortName: "Biology Quiz", poster: biologyPoster, path: "/biology-quiz", tag: "NEW", category: "Science", desc: "Cells, systems, ecology, and more.", timed: true },
    { name: "Math Quiz", shortName: "Math Quiz", poster: mathPoster, path: "/math-quiz", tag: "NEW", category: "Numbers", desc: "Quick calculations and problem solving.", timed: true },
    { name: "Connect Dots", shortName: "Connect Dots", poster: connectDotsPoster, path: "/connect-dots", tag: "HOT", category: "Arcade", desc: "Connect paths, beat levels, and score.", hot: true },
];

export const GamesPage: FC<Props> = ({ onBack }) => {
    const [filter, setFilter] = useState<GameFilter>("all");
    const filteredGames = useMemo(() => {
        if (filter === "new") return GAMES.filter(game => game.tag === "NEW");
        if (filter === "timed") return GAMES.filter(game => game.timed);
        if (filter === "hot") return GAMES.filter(game => game.hot || game.tag === "HOT");
        return GAMES;
    }, [filter]);

    const openGame = (game: GameItem) => {
        window.location.href = game.path;
    };

    return (
        <div className="games-page">
            <div className="games-shell">
                <header className="games-topbar">
                    <button type="button" className="games-back" onClick={onBack} aria-label="Back">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <span className="games-kicker">Game Library</span>
                        <h1 className="games-title">All Games</h1>
                    </div>
                </header>

                <div className="games-browse-head">Browse</div>
                <div className="games-filter-pills">
                    {[
                        ["all", "All Games"],
                        ["new", "New"],
                        ["timed", "Timed Trivia"],
                        ["hot", "Hot"],
                    ].map(([key, label]) => (
                        <button key={key} type="button" className={filter === key ? "games-filter-pill active" : "games-filter-pill"} onClick={() => setFilter(key as GameFilter)}>{label}</button>
                    ))}
                </div>
                <div className="games-current-filter"><Search size={13} /> Currently viewing: <strong>{filter === "all" ? "All Games" : filter === "timed" ? "Timed Trivia" : filter[0].toUpperCase() + filter.slice(1)}</strong></div>

                <section className="games-grid">
                    {filteredGames.map(game => (
                        <article className="games-card" key={game.name} onClick={() => openGame(game)}>
                            <div className="games-card-img">
                                <img src={game.poster} alt={game.name} />
                                <span className={game.tag === "HOT" ? "games-tag hot" : "games-tag"}>{game.tag}</span>
                            </div>
                            <h2 className="games-card-name">{game.shortName}</h2>
                        </article>
                    ))}
                    {filteredGames.length === 0 && <div className="games-empty"><strong>No games found</strong><span>Try another category.</span></div>}
                </section>
            </div>
        </div>
    );
};
