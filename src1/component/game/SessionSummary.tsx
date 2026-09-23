// SessionSummary.tsx - Shows questions answered in the current game
import { type FC } from "react";
import type { RoundRecord } from "../../types/sessionTypes.ts";
import "../../styles/SessionSummary.css";

interface Props {
    rounds: RoundRecord[];
    onClose: () => void;
}

export const SessionSummary: FC<Props> = ({ rounds, onClose }) => {
    return (
        <div className="session-summary-overlay" onClick={onClose}>
            <div className="session-summary-card" onClick={e => e.stopPropagation()}>
                <div className="session-summary-header">
                    <h2>📋 Session Review</h2>
                    <button className="session-summary-close" onClick={onClose}>✕</button>
                </div>

                <div className="session-summary-content">
                    {rounds.map((round, rIdx) => (
                        <div key={rIdx} className="round-section">
                            <div className="round-header">
                                <span className="round-icon">
                                    {round.roundNumber === 1 ? "⚡" : round.roundNumber === 2 ? "🗂️" : "🎡"}
                                </span>
                                <div>
                                    <h3>Round {round.roundNumber}</h3>
                                    {round.category && <p className="round-category">{round.category}</p>}
                                </div>
                                <span className="round-score">{round.score.toLocaleString()} pts</span>
                            </div>

                            <div className="questions-list">
                                {round.questions.map((q, qIdx) => (
                                    <div key={qIdx} className={`question-item ${q.isCorrect ? "correct" : "incorrect"}`}>
                                        <div className="question-number">Q{qIdx + 1}</div>
                                        <div className="question-content">
                                            <p className="question-text">{q.question}</p>
                                            <div className="answer-row">
                                                <span className="answer-label">Your answer:</span>
                                                <span className={`answer-value ${q.isCorrect ? "correct" : "incorrect"}`}>
                                                    {q.userAnswer || "Skipped"}
                                                </span>
                                            </div>
                                            {!q.isCorrect && (
                                                <div className="answer-row">
                                                    <span className="answer-label">Correct answer:</span>
                                                    <span className="answer-value correct">{q.correctAnswer}</span>
                                                </div>
                                            )}
                                            <div className="question-meta">
                                                <span className={`points ${q.pointsEarned >= 0 ? "positive" : "negative"}`}>
                                                    {q.pointsEarned >= 0 ? "+" : ""}{q.pointsEarned} pts
                                                </span>
                                                {q.timeSpent !== undefined && (
                                                    <span className="time-spent">{q.timeSpent.toFixed(1)}s</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button className="session-summary-btn" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};
