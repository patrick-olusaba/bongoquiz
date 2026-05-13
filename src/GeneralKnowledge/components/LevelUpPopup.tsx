import React from 'react';
import '../style/leveluppopup.css';

interface LevelUpPopupProps {
    newLevel: number;
    levelName: string;
    pointsMultiplier: number;
    levelDifficulty: string; // ADD THIS PROP
    onContinue: () => void;
}

const LevelUpPopup: React.FC<LevelUpPopupProps> = ({
                                                       newLevel,
                                                       levelName,
                                                       levelDifficulty,
                                                       pointsMultiplier,
                                                       onContinue
                                                   }) => {
    return (
        <div className="level-up-overlay">
            <div className="level-up-popup">
                <div className="level-up-content">
                    <div className="level-up-icon">🎉</div>
                    <h2>Level Up!</h2>
                    <p className="level-up-message">
                        You've reached <strong>Level {newLevel}</strong>
                    </p>

                    <div className="level-details">
                        <div className="detail-item">
                            <span className="detail-label">Title:</span>
                            <span className="detail-value">{levelName}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Difficulty:</span>
                            <span className="detail-value">{levelDifficulty}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Points Multiplier:</span>
                            <span className="detail-value">{pointsMultiplier}x</span>
                        </div>
                    </div>

                    <button className="continue-btn" onClick={onContinue}>
                        Continue to Level {newLevel} →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LevelUpPopup;