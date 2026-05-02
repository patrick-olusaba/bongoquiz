import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import type { Question } from '../types';

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [prevText, setPrevText] = useState('');

  if (text !== prevText) {
    setPrevText(text);
    setDisplayedText('');
  }

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayedText}</>;
};

interface TimerPillProps {
  timeLeft: number;
  maxTime: number;
}

const getTimerColor = (p: number) => {
  if (p > 0.66) {
    const t = (1 - p) / 0.34;
    return `rgb(${Math.round(16 + (59 - 16) * t)},${Math.round(185 + (130 - 185) * t)},${Math.round(129 + (246 - 129) * t)})`;
  } else if (p > 0.33) {
    const t = (0.66 - p) / 0.33;
    return `rgb(${Math.round(59 + (146 - 59) * t)},${Math.round(130 + (64 - 130) * t)},${Math.round(246 + (14 - 246) * t)})`;
  } else {
    const t = (0.33 - p) / 0.33;
    return `rgb(${Math.round(146 + (244 - 146) * t)},${Math.round(64 + (63 - 64) * t)},${Math.round(14 + (94 - 14) * t)})`;
  }
};

const TimerPill: React.FC<TimerPillProps> = ({ timeLeft, maxTime }) => {
  const W = 80;
  const H = 28;
  const sw = 3; // make stroke thicker
  const bgSw = 1; // thinner background border to contrast
  const r = H / 2 - sw / 2;
  const half = sw / 2;
  const perimeter = 2 * (W - H) + Math.PI * H;

  const progress = maxTime > 0 ? timeLeft / maxTime : 0;
  const dashOffset = (perimeter * (1 - progress));
  const color = getTimerColor(progress);
  const displayTime = Math.ceil(timeLeft);

  const progressRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.strokeDashoffset = String(dashOffset);
      progressRef.current.style.stroke = color;
      progressRef.current.style.filter = `drop-shadow(0 0 4px ${color})`;
    }
  }, [dashOffset, color]);

  return (
      <div style={{ position: 'relative', width: W, height: H, flexShrink: 0 }}>
        <svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
          <rect
              x={bgSw/2} y={bgSw/2}
              width={W - bgSw} height={H - bgSw}
              rx={H / 2 - bgSw / 2} ry={H / 2 - bgSw / 2}
              fill="rgba(15, 10, 33, 0.8)"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={bgSw}
          />
          <rect
              ref={progressRef}
              x={half} y={half}
              width={W - sw} height={H - sw}
              rx={r} ry={r}
              fill="none"
              stroke={getTimerColor(1)}
              strokeWidth={sw}
              strokeDasharray={perimeter}
              strokeDashoffset={0}
              strokeLinecap="round"
              pathLength={perimeter}
              style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.1s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 800, lineHeight: 1, letterSpacing: '0.5px',
          color: '#fff', textShadow: `0 0 6px ${color}`
        }}>
          {displayTime}s
        </span>
        </div>
      </div>
  );
};

interface Props {
  topicQuestions: Question[];
  currentQuestionIndex: number;
  score: number;
  selectedAnswer: string | null;
  isAnswerCorrect: boolean | null;
  isFeedbackModalOpen: boolean;
  timeLeft: number;
  onAnswerSelect: (answer: string) => void;
  onSkipQuestion: () => void;
  onNextQuestion: () => void;
  onBackToTopics: () => void;
  setIsFeedbackModalOpen: (isOpen: boolean) => void;
}

export const Quiz: React.FC<Props> = ({
                                        topicQuestions,
                                        currentQuestionIndex,
                                        selectedAnswer,
                                        timeLeft,
                                        onAnswerSelect,
                                        onSkipQuestion,
                                        onBackToTopics,
                                      }) => {
  if (!topicQuestions.length) return null;
  const currentQuestion = topicQuestions[currentQuestionIndex];

  return (
      <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="quiz-center-content"
      >
        <div className="main-container">
          <div className="quiz-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
                onClick={onBackToTopics}
                className="btn-back"
                style={{ marginBottom: 0, zIndex: 2 }}
            >
              <ArrowLeft size={16} />
              <span>Quit<span className="hide-mobile"> Game</span></span>
            </button>

            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
              <TimerPill timeLeft={timeLeft} maxTime={60} />
            </div>

            <div className="stat-pill" style={{ zIndex: 2 }}>
              {currentQuestionIndex} answered
            </div>
          </div>

          <div className="question-card" style={{ position: 'relative' }}>
            <div className="question-content">
              <div className="question-text" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <span className="question-number" style={{ fontWeight: 'bold', flexShrink: 0 }}>Q{currentQuestionIndex + 1}.</span>
                <div style={{ flex: 1 }}>
                  <TypewriterText text={currentQuestion.question} />
                </div>
              </div>

              {currentQuestion.imageUrl && (
                  <div className="question-image-container">
                    <img
                        src={currentQuestion.imageUrl}
                        alt="Question Diagram"
                        className="question-image"
                        referrerPolicy="no-referrer"
                    />
                  </div>
              )}

              <button
                  onClick={onSkipQuestion}
                  disabled={selectedAnswer !== null}
                  style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    left: '1rem',
                    background: 'rgba(234, 179, 8, 0.2)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    borderRadius: '1rem',
                    padding: '0.2rem 0.6rem',
                    color: '#facc15',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    cursor: selectedAnswer !== null ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(4px)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAnswer === null) {
                      e.currentTarget.style.background = 'rgba(234, 179, 8, 0.3)';
                      e.currentTarget.style.color = '#fef08a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAnswer === null) {
                      e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)';
                      e.currentTarget.style.color = '#facc15';
                    }
                  }}
              >
                Skip (-50)
              </button>

              <div className="question-meta" style={{ position: 'absolute', bottom: '0.5rem', right: '1rem', marginBottom: 0, background: 'transparent', padding: 0 }}>
                <span className="question-topic" style={{ textTransform: 'uppercase', color: '#f43f5e', opacity: 0.8, letterSpacing: '1px', fontWeight: 800, fontSize: '0.6rem' }}>[{currentQuestion.topic}]</span>
              </div>
            </div>
          </div>

          <div className="options-grid paper-options">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correct_answer;
              const showCorrect = selectedAnswer !== null && isCorrect;
              const showIncorrect = isSelected && !isCorrect;

              let buttonClass = "option-btn ";

              if (selectedAnswer === null) {
                // Default state
              } else if (showCorrect) {
                buttonClass += "correct";
                if (selectedAnswer === currentQuestion.correct_answer) {
                  buttonClass += " celebrate";
                } else {
                  buttonClass += " highlight-correct";
                }
              } else if (showIncorrect) {
                buttonClass += "incorrect shake";
              } else {
                buttonClass += "disabled-unselected";
              }

              const optionLetter = String.fromCharCode(65 + index);

              return (
                  <button
                      key={`${currentQuestionIndex}-${index}`}
                      onClick={() => onAnswerSelect(option)}
                      disabled={selectedAnswer !== null}
                      className={buttonClass}
                  >
                    <span className="option-letter">{optionLetter}.</span>
                    <span className="option-text">{option}</span>
                    {showCorrect && <CheckCircle2 size={20} className="option-icon" />}
                    {showIncorrect && <XCircle size={20} className="option-icon" />}
                  </button>
              );
            })}
          </div>
        </div>
      </motion.div>
  );
};