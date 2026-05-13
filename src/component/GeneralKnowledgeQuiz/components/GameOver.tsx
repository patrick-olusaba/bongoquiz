import React, { useEffect, useRef } from 'react';
import type {Player} from "../types/type.ts";
import "../style/style.css";

interface GameOverProps {
    player: Player;
    onRetry: () => void;
    onMenu: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ player, onRetry, onMenu }) => {
    const savedRef = useRef(false);

    useEffect(() => {
        if (savedRef.current) return;
        savedRef.current = true;
        if (player.score > 0) {
            const prev = parseInt(localStorage.getItem('quiz_best_score') ?? '0');
            if (player.score > prev) localStorage.setItem('quiz_best_score', String(player.score));
            const entries: { name: string; score: number }[] = JSON.parse(localStorage.getItem('quiz_leaderboard') ?? '[]');
            entries.push({ name: player.name, score: player.score });
            entries.sort((a, b) => b.score - a.score);
            localStorage.setItem('quiz_leaderboard', JSON.stringify(entries.slice(0, 20)));
        }
    }, [player.score, player.name]);

    const accuracy = player.totalQuestions > 0
        ? Math.round((player.correctAnswers / player.totalQuestions) * 100)
        : 0;

    const achievements = [
        { name: 'Quiz Scholar', unlocked: player.score >= 500 },
        { name: 'Hot Streak', unlocked: player.bestStreak >= 10 },
        { name: 'Quiz Master', unlocked: player.level >= 5 }
    ];

    return (
        <div className="game-over-screen">
            <div className="game-over-header">
                <div className="game-over-icon">😔</div>
                <h2>Game Over</h2>
                <p>The timer ran out!</p>
            </div>

            <div className="final-stats">
                <h3>Final Score: {player.score}</h3>

                <div className="stats-grid">
                    <div className="final-stat">
                        <span className="label">Level Reached</span>
                        <span className="value">{player.level}</span>
                    </div>
                    <div className="final-stat">
                        <span className="label">Questions Answered</span>
                        <span className="value">{player.totalQuestions}</span>
                    </div>
                    <div className="final-stat">
                        <span className="label">Correct Answers</span>
                        <span className="value">{player.correctAnswers}</span>
                    </div>
                    <div className="final-stat">
                        <span className="label">Accuracy</span>
                        <span className="value">{accuracy}%</span>
                    </div>
                    <div className="final-stat">
                        <span className="label">Best Streak</span>
                        <span className="value">{player.bestStreak}</span>
                    </div>
                </div>

                <div className="achievements">
                    <h3>Achievements</h3>
                    <div className="achievements-grid">
                        {achievements.map((achievement, index) => (
                            <div key={index} className={`achievement ${achievement.unlocked ? 'unlocked' : ''}`}>
                                {achievement.unlocked ? '🌟' : '🔒'} {achievement.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="game-over-actions">
                <div className="btn-primary" onClick={onRetry}>🔄 Play Again</div>
                <div className="btn-secondary" onClick={onMenu}>🏠 Main Menu</div>
            </div>
        </div>
    );
};

export default GameOver;
