import React from 'react';
import type {Player} from "../types/type.ts";
import "../style/style.css";

interface GameOverProps {
    player: Player;
    onRetry: () => void;
    onMenu: () => void;
}

const GameOver: React.FC<GameOverProps> = ({
                                               player,
                                               onRetry,
                                               onMenu,
                                           }) => {
    const accuracy = player.totalQuestions > 0
        ? Math.round((player.correctAnswers / player.totalQuestions) * 100)
        : 0;

    const achievements = [
        { name: 'Bible Scholar', unlocked: player.score >= 500 },
        { name: 'Hot Streak', unlocked: player.bestStreak >= 10 },
        { name: 'Bible Master', unlocked: player.level >= 5 }
    ];

    return (
        <div className="game-over-screen">
            <div className="game-over-header">
                <div className="game-over-icon">😔</div>
                <h2>Game Over</h2>
                <p>You ran out of lives!</p>
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
                            <div
                                key={index}
                                className={`achievement ${achievement.unlocked ? 'unlocked' : ''}`}
                            >
                                {achievement.unlocked ? '🌟' : '🔒'} {achievement.name}
                            </div>
                        ))}

                    </div>

                </div>
            </div>

            <div className="game-over-actions">
                <div className="btn-primary-bible" onClick={onRetry}>
                    🔄 Play Again
                </div>
                <div className="btn-secondary-bible" onClick={onMenu}>
                    🏠 Main Menu
                </div>

            </div>
        </div>
    );
};

export default GameOver;