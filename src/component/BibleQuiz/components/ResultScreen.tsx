import React from 'react';
import type { BibleQuestion, AnswerResult } from '../types/type.ts';
import '../style/resultpopup.css';

interface ResultScreenProps {
    question: BibleQuestion;
    result: AnswerResult;
    playerScore: number;
    playerStreak: number;
    playerLives: number;
    onNextQuestion: () => void;
    onMenu: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({
                                                       question,
                                                       result,
                                                       playerScore,
                                                       playerStreak,
                                                       playerLives,
                                                       onNextQuestion,
                                                       onMenu
                                                   }) => {
    return (
        <div className={`result-screen ${result.correct ? 'correct' : 'wrong'}`}>
            <div className="result-header">
                <div className="result-icon">{result.correct ? '🎉' : '💡'}</div>
                <h2>{result.correct ? 'Correct!' : 'Incorrect'}</h2>
                <p className="result-message">
                    {result.correct
                        ? `You earned ${result.pointsEarned} points!`
                        : 'Better luck next time!'}
                </p>
            </div>

            <div className="result-details">
                {result.newLevel && (
                    <div className="level-up">
                        <div className="level-up-icon">🌟</div>
                        <h3>Level Up!</h3>
                        <p>You've reached a new level!</p>
                        <p className="bonus">+50 bonus points!</p>
                    </div>
                )}

                <div className="explanation">
                    <h3>📚 Explanation:</h3>
                    <p>{result.explanation}</p>
                </div>

                <div className="scripture">
                    <h3>📖 Scripture Reference:</h3>
                    <p className="scripture-text">{question.scripture}</p>
                </div>

                <div className="stats-update">
                    <div className="stat-update">
                        <span>Total Score:</span>
                        <span className="value">{playerScore}</span>
                    </div>
                    <div className="stat-update">
                        <span>Current Streak:</span>
                        <span className="value">{playerStreak}</span>
                    </div>
                    <div className="stat-update">
                        <span>Lives Remaining:</span>
                        <span className="value">{playerLives} ❤️</span>
                    </div>
                </div>
            </div>

            <div className="result-actions">
                <button className="btn-primary" onClick={onNextQuestion}>
                    {result.correct ? 'Next Question ➡️' : 'Continue ▶️'}
                </button>
                <button className="btn-secondary" onClick={onMenu}>
                    🏠 Main Menu
                </button>
            </div>
        </div>
    );
};

export default ResultScreen;