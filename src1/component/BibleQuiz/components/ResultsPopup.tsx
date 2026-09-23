import { type FC, useEffect, useState, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Player } from '../types/type.ts';
import '../style/resultpopup.css';

interface ResultsPopupProps {
    player: Player;
    onPlayAgain: () => void;
    onMenu: () => void;
}

const ResultsPopup: FC<ResultsPopupProps> = ({ player, onPlayAgain, onMenu }) => {
    const [isNewBest, setIsNewBest] = useState(false);
    const [prevBest, setPrevBest] = useState(0);
    const savedRef = useRef(false);

    useEffect(() => {
        if (savedRef.current) return;
        savedRef.current = true;

        const prev = parseInt(localStorage.getItem('bible_best_score') ?? '0');
        setPrevBest(prev);
        if (player.score > prev) {
            setIsNewBest(true);
            localStorage.setItem('bible_best_score', String(player.score));
        }

        // Save to backend
        const phone = localStorage.getItem('bongo_player_phone') ?? '';
        const name  = localStorage.getItem('bongo_player_name')  ?? 'Player';
        if (/^07\d{8}$/.test(phone)) {
            httpsCallable(getFunctions(), 'saveBibleQuizSession')({
                name, phone,
                score:   player.score,
                correct: player.correctAnswers,
                wrong:   player.totalQuestions - player.correctAnswers,
                passed:  0,
                total:   player.totalQuestions,
            }).catch(() => {});
        }
    }, [player.score]);

    const accuracy = player.totalQuestions > 0 ? Math.round((player.correctAnswers / player.totalQuestions) * 100) : 0;
    const rating =
        player.score >= 1000 ? '🌟 Legendary! Bible Master!'
        : player.score >= 500 ? '🔥 Amazing! Well done!'
        : player.score >= 200 ? '🎉 Great job!'
        : player.score >= 50 ? '👍 Good effort!'
        : '📚 Keep practising!';

    return (
        <div className="rp-root">
            {isNewBest && (
                <div className="rp-new-best-banner">
                    🏆 NEW PERSONAL BEST! {prevBest > 0 ? `(was ${prevBest.toLocaleString()})` : 'First score saved!'}
                </div>
            )}

            <div className="rp-card">
                <div className="rp-trophy">{isNewBest ? '🥇' : '🏆'}</div>
                <h1 className="rp-title">Quiz Complete!</h1>

                <div className="rp-breakdown">
                    <div className="rp-breakdown-cell">
                        <div className="rp-breakdown-label">📊 Accuracy</div>
                        <div className="rp-breakdown-value" style={{ color: '#4d96ff' }}>{accuracy}%</div>
                    </div>
                    <div className="rp-breakdown-cell">
                        <div className="rp-breakdown-label">✅ Correct</div>
                        <div className="rp-breakdown-value" style={{ color: '#38ef7d' }}>{player.correctAnswers}/{player.totalQuestions}</div>
                    </div>
                    <div className="rp-breakdown-cell">
                        <div className="rp-breakdown-label">🔥 Best Streak</div>
                        <div className="rp-breakdown-value" style={{ color: '#ff6b6b' }}>{player.bestStreak}</div>
                    </div>
                </div>

                <div className="rp-total-box">
                    <div className="rp-total-label">FINAL SCORE</div>
                    <div className="rp-total-value">{player.score.toLocaleString()}</div>
                    <div className="rp-rating">{rating}</div>
                </div>

                <div className="rp-actions">
                    <button className="rp-btn rp-btn--play" onClick={onPlayAgain}>🔄 Play Again</button>
                    <button className="rp-btn rp-btn--menu" onClick={onMenu}>🏠 Main Menu</button>
                </div>
            </div>
        </div>
    );
};

export default ResultsPopup;
