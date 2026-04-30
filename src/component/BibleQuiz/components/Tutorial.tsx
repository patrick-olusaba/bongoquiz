import React from 'react';
import "../style/howtoplay.css"

interface TutorialProps {
    onStartGame: () => void;
    onBack: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onStartGame, onBack }) => {
    return (
        <div className="tutorial-screen">
            <div className="tutorial-orbs">
                <div className="tutorial-orb1" />
                <div className="tutorial-orb2" />
                <div className="tutorial-orb3" />
            </div>

            <div className="tutorial-header">
                <h2>📖 How to Play</h2>
            </div>

            <div className="tutorial-content">
                <div className="instruction">
                    <div className="instruction-icon">🎯</div>
                    <h3>Objective</h3>
                    <p>Answer Bible questions correctly to earn points, level up, and climb the leaderboard!</p>
                </div>

                <div className="instruction">
                    <div className="instruction-icon">🎮</div>
                    <h3>Gameplay</h3>
                    <ul>
                        <li><strong>3 Lives:</strong> Start with 3 hearts</li>
                        <li><strong>Time Limit:</strong> 30 seconds per question</li>
                        <li><strong>Earn Points:</strong> Correct answers grant points</li>
                        <li><strong>Streak Bonus:</strong> Consecutive correct answers multiply points</li>
                        <li><strong>Wrong Answer:</strong> Costs 1 life, resets streak</li>
                    </ul>
                </div>

                <div className="instruction">
                    <div className="instruction-icon">⭐</div>
                    <h3>Scoring System</h3>
                    <ul>
                        <li><strong>Easy Questions:</strong> 10 base points</li>
                        <li><strong>Medium Questions:</strong> 15 base points</li>
                        <li><strong>Hard Questions:</strong> 20 base points</li>
                        <li><strong>Time Bonus:</strong> Extra points for quick answers</li>
                        <li><strong>Streak Bonus:</strong> +5 points every 3 correct answers</li>
                        <li><strong>Level Up Bonus:</strong> +50 bonus points!</li>
                    </ul>
                </div>

                <div className="instruction">
                    <div className="instruction-icon">💡</div>
                    <h3>Power-Ups & Hints</h3>
                    <ul>
                        <li><strong>Hint:</strong> Remove 2 wrong answers (costs 10 points)</li>
                        <li><strong>Skip:</strong> Skip difficult questions (costs 20 points)</li>
                        <li><strong>Time Freeze:</strong> Pause timer for 10 seconds (costs 30 points)</li>
                    </ul>
                </div>

                <div className="instruction">
                    <div className="instruction-icon">⌨️</div>
                    <h3>Keyboard Shortcuts</h3>
                    <ul>
                        <li><strong>1-4:</strong> Select answer option</li>
                        <li><strong>H:</strong> Use hint (if available)</li>
                        <li><strong>S:</strong> Skip question</li>
                        <li><strong>Enter/Space:</strong> Continue to next question</li>
                        <li><strong>Esc:</strong> Pause game</li>
                    </ul>
                </div>
            </div>

            <div className="tutorial-actions">
                <button className="btn-primary" onClick={onStartGame}>
                    <span className="icon">🎮</span>
                    <span>Start Playing!</span>
                </button>
                <button className="btn-secondary" onClick={onBack}>
                    <span className="icon">←</span>
                    <span>Back to Menu</span>
                </button>
            </div>
        </div>
    );
};

export default Tutorial;
