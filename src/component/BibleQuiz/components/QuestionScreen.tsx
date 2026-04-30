import React from 'react';
import type { BibleQuestion, Player } from '../types/type.ts';
import '../style/style.css';

interface QuestionScreenProps {
    question: BibleQuestion;
    timeLeft: number;
    isAnswered: boolean;
    selectedAnswer: number | null;
    onAnswerSelect: (answerIndex: number) => void;
    onMenu: () => void;
    onPass: () => void;
    showAutoNext?: boolean;
    currentLevel: number;
    levelProgress: { current: number; needed: number; level: number };
    player: Player;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const QuestionScreen: React.FC<QuestionScreenProps> = ({
    question,
    timeLeft,
    isAnswered,
    selectedAnswer,
    onAnswerSelect,
    onPass,
    player,
    levelProgress,
}) => {
    const timerColor = timeLeft <= 10 ? '#FF4757' : timeLeft <= 20 ? '#FFA500' : '#00c864';
    const progressPct = (timeLeft / 40) * 100;

    const getOptionClass = (index: number) => {
        if (!isAnswered) return 'qs-option';
        if (index === question.correctAnswer) return 'qs-option correct';
        if (index === selectedAnswer) return 'qs-option wrong';
        return 'qs-option';
    };

    return (
        <div className="qs-root">
            <div className={`qs-card${isAnswered ? (selectedAnswer === question.correctAnswer ? ' answered-correct' : ' answered-wrong') : ''}`}>
                {/* Row 1: category + score */}
                <div className="qs-top-row">
                    <span className="qs-score">🏆 {player.score}</span>
                </div>

                {/* Row 2: Q counter + timer */}
                <div className="qs-meta-row">
                    <span className="qs-meta-text">
                        Q{player.totalQuestions + 1} · {player.correctAnswers} ✓ · {player.totalQuestions - player.correctAnswers} ✗
                    </span>
                    <span className="qs-timer" style={{ color: timerColor }}>
                        🕐 {timeLeft}s
                    </span>
                </div>

                {/* Progress bar */}
                <div className="qs-progress-track">
                    <div className={`qs-progress-fill${timeLeft <= 10 ? ' critical' : ''}`} style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${timerColor}88, ${timerColor})` }} />
                </div>

                {/* Question text */}
                <div className="qs-question-box">
                    <p className="qs-question-text">{question.question}</p>
                </div>

                {/* Options */}
                <div className="qs-options">
                    {question.options.map((option, index) => (
                        <button
                            key={index}
                            className={getOptionClass(index)}
                            onClick={() => !isAnswered && onAnswerSelect(index)}
                            disabled={isAnswered}
                        >
                            <span className="qs-option-label">{OPTION_LABELS[index]}</span>
                            <span className="qs-option-text">{option}</span>
                            {isAnswered && index === question.correctAnswer && <span className="qs-icon">✓</span>}
                            {isAnswered && index === selectedAnswer && index !== question.correctAnswer && <span className="qs-icon">✗</span>}
                        </button>
                    ))}
                </div>

                {/* Pass button */}
                {!isAnswered && (
                    <button className="qs-pass-btn" onClick={onPass}>
                        ⏭ Pass <span className="qs-pass-cost">(-50)</span>
                    </button>
                )}

                {/* Feedback */}
                {isAnswered && (
                    <div className={`qs-feedback ${selectedAnswer === question.correctAnswer ? 'qs-feedback-correct' : 'qs-feedback-wrong'}`}>
                        <p className="qs-explanation">{question.explanation}</p>
                        {question.scripture && (
                            <p className="qs-scripture">📖 <em>{question.scripture}</em></p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionScreen;
