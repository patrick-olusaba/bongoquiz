import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import type { Question } from '../types';

// Reuse the same TimerPill logic from BiologyQuiz
const getTimerColor = (p: number) => {
  if (p > 0.66) { const t = (1-p)/0.34; return `rgb(${Math.round(16+(59-16)*t)},${Math.round(185+(130-185)*t)},${Math.round(129+(246-129)*t)})`; }
  if (p > 0.33) { const t = (0.66-p)/0.33; return `rgb(${Math.round(59+(146-59)*t)},${Math.round(130+(64-130)*t)},${Math.round(246+(14-246)*t)})`; }
  const t = (0.33-p)/0.33; return `rgb(${Math.round(146+(244-146)*t)},${Math.round(64+(63-64)*t)},${Math.round(14+(94-14)*t)})`;
};

const TimerPill: React.FC<{ timeLeft: number; maxTime: number }> = ({ timeLeft, maxTime }) => {
  const W = 80, H = 28, sw = 3, r = H/2 - sw/2, half = sw/2;
  const perimeter = 2*(W-H) + Math.PI*H;
  const progress = maxTime > 0 ? timeLeft/maxTime : 0;
  const color = getTimerColor(progress);
  const ref = useRef<SVGRectElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.style.strokeDashoffset = String(perimeter*(1-progress)); ref.current.style.stroke = color; }
  }, [progress, color, perimeter]);
  return (
    <div style={{ position: 'relative', width: W, height: H, flexShrink: 0 }}>
      <svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <rect x={0.5} y={0.5} width={W-1} height={H-1} rx={H/2-0.5} fill="rgba(15,10,33,0.8)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <rect ref={ref} x={half} y={half} width={W-sw} height={H-sw} rx={r} fill="none" stroke={getTimerColor(1)} strokeWidth={sw}
          strokeDasharray={perimeter} strokeDashoffset={0} strokeLinecap="round" pathLength={perimeter}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.1s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textShadow: `0 0 6px ${color}` }}>{Math.ceil(timeLeft)}s</span>
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
  setIsFeedbackModalOpen: (v: boolean) => void;
}

export const Quiz: React.FC<Props> = ({ topicQuestions, currentQuestionIndex, selectedAnswer, timeLeft, onAnswerSelect, onSkipQuestion, onBackToTopics }) => {
  if (!topicQuestions.length) return null;
  const q = topicQuestions[currentQuestionIndex];

  return (
    <div className="quiz-center-content" style={{ width: '100%' }}>
      <div className="main-container">
        <div className="quiz-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBackToTopics} className="btn-back" style={{ marginBottom: 0, zIndex: 2 }}>
            <ArrowLeft size={16} /><span>Quit</span>
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
            <TimerPill timeLeft={timeLeft} maxTime={60} />
          </div>
          <div className="stat-pill" style={{ zIndex: 2 }}>{currentQuestionIndex} answered</div>
        </div>

        <div className="question-card" style={{ position: 'relative' }}>
          <div className="question-content">
            <div className="question-text" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
              <span className="question-number" style={{ fontWeight: 'bold', flexShrink: 0 }}>Q{currentQuestionIndex + 1}.</span>
              <div style={{ flex: 1 }}>{q.question}</div>
            </div>
            {q.imageUrl && <div className="question-image-container"><img src={q.imageUrl} alt="diagram" className="question-image" referrerPolicy="no-referrer" /></div>}
            <button onClick={onSkipQuestion} disabled={selectedAnswer !== null}
              style={{ position: 'absolute', bottom: '0.5rem', left: '1rem', background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '1rem', padding: '0.2rem 0.6rem', color: '#facc15', fontSize: '0.65rem', fontWeight: 600, cursor: selectedAnswer !== null ? 'default' : 'pointer' }}>
              Skip (-50)
            </button>
            <div className="question-meta" style={{ position: 'absolute', bottom: '0.5rem', right: '1rem', marginBottom: 0, background: 'transparent', padding: 0 }}>
              <span className="question-topic" style={{ textTransform: 'uppercase', color: '#f43f5e', opacity: 0.8, letterSpacing: '1px', fontWeight: 800, fontSize: '0.6rem' }}>[{q.topic}]</span>
            </div>
          </div>
        </div>

        <div className="options-grid paper-options">
          {q.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect  = option === q.correct_answer;
            const showCorrect   = selectedAnswer !== null && isCorrect;
            const showIncorrect = isSelected && !isCorrect;
            let cls = 'option-btn ';
            if (showCorrect)   cls += 'correct' + (selectedAnswer === q.correct_answer ? ' celebrate' : ' highlight-correct');
            else if (showIncorrect) cls += 'incorrect shake';
            else if (selectedAnswer !== null) cls += 'disabled-unselected';
            return (
              <button key={`${currentQuestionIndex}-${index}`} onClick={() => onAnswerSelect(option)} disabled={selectedAnswer !== null} className={cls}>
                <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
                <span className="option-text">{option}</span>
                {showCorrect   && <CheckCircle2 size={20} className="option-icon" />}
                {showIncorrect && <XCircle      size={20} className="option-icon" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
