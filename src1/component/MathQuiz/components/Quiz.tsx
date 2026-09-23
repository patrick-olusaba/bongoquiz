import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { Question } from '../types';

const OPTION_COLORS = [
  { bg: 'rgba(0,180,160,0.25)',  border: 'rgba(0,220,180,0.5)',  badge: '#00dca0' },
  { bg: 'rgba(100,0,180,0.25)', border: 'rgba(140,60,220,0.5)', badge: '#8c3cdc' },
  { bg: 'rgba(140,80,0,0.3)',   border: 'rgba(200,130,0,0.5)',  badge: '#c88200' },
  { bg: 'rgba(160,0,80,0.25)',  border: 'rgba(220,0,120,0.5)',  badge: '#dc0078' },
];

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

export const Quiz: React.FC<Props> = ({
  topicQuestions, currentQuestionIndex, score, selectedAnswer,
  timeLeft, onAnswerSelect, onSkipQuestion, onBackToTopics
}) => {
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount,   setWrongCount]   = useState(0);
  const [skipCount,    setSkipCount]    = useState(0);
  const prevSelected = useRef<string | null>(null);
  const prevIndex    = useRef(currentQuestionIndex);

  useEffect(() => {
    if (currentQuestionIndex !== prevIndex.current) {
      prevIndex.current = currentQuestionIndex;
      prevSelected.current = null;
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (selectedAnswer && selectedAnswer !== prevSelected.current) {
      prevSelected.current = selectedAnswer;
      const q = topicQuestions[currentQuestionIndex];
      if (!q) return;
      if (selectedAnswer === '__SKIP__') setSkipCount(c => c + 1);
      else if (selectedAnswer === q.correct_answer) setCorrectCount(c => c + 1);
      else setWrongCount(c => c + 1);
    }
  }, [selectedAnswer, currentQuestionIndex, topicQuestions]);

  if (!topicQuestions.length) return null;
  const q = topicQuestions[currentQuestionIndex];
  if (!q) return null;

  const maxTime = 60;
  const pct = Math.max(0, (timeLeft / maxTime) * 100);
  const timerColor = pct > 50 ? '#00dca0' : pct > 25 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      minHeight: '100svh', width: '100%', background: '#060412',
      fontFamily: "'Trebuchet MS','Segoe UI',sans-serif", color: '#fff',
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes mq-float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(180deg)} }
        @keyframes mq-opt-in { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes mq-pulse  { 0%,100%{opacity:0.08} 50%{opacity:0.18} }
      `}</style>

      {/* Floating bg symbols */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        {['×','÷','+','−','%','²','√','π','∑','≠','∞','f(x)'].map((s,i) => (
          <span key={i} style={{
            position:'absolute', fontWeight:900, userSelect:'none',
            fontSize:`${1.5+(i%3)*1.2}rem`, color:['#00dca0','#8c3cdc','#f59e0b','#dc0078'][i%4],
            opacity:0.07+(i%3)*0.03, left:`${(i*9+4)%92}%`, top:`${(i*13+6)%88}%`,
            animation:`mq-float ${4+i%4}s ease-in-out ${i*0.35}s infinite`
          }}>{s}</span>
        ))}
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,220,160,0.08),transparent 70%)', top:'10%', left:'50%', transform:'translateX(-50%)', animation:'mq-pulse 4s ease-in-out infinite' }} />
      </div>

      {/* Top bar */}
      <div style={{ position:'relative', zIndex:2, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem 0.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:50, padding:'6px 14px' }}>
          <span style={{ fontSize:'0.85rem', fontWeight:900, color:'#00dca0' }}>∑</span>
          <span style={{ fontSize:'0.7rem', fontWeight:900, color:'#fff', letterSpacing:2, textTransform:'uppercase' }}>Math Quiz</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#00dca0,#00b87a)', borderRadius:50, padding:'6px 14px' }}>
          <span style={{ fontSize:'0.9rem' }}>🏆</span>
          <span style={{ fontSize:'0.9rem', fontWeight:900, color:'#000' }}>{score}</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ position:'relative', zIndex:2, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 1.25rem 0.25rem' }}>
        <div style={{ display:'flex', gap:12, fontSize:'0.78rem', fontWeight:700 }}>
          <span style={{ color:'rgba(255,255,255,0.5)' }}>Q{currentQuestionIndex + 1}</span>
          <span style={{ color:'#00dca0' }}>✓{correctCount}</span>
          <span style={{ color:'#ef4444' }}>✗{wrongCount}</span>
          <span style={{ color:'rgba(255,255,255,0.4)' }}>{skipCount} skip</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, color:timerColor, fontWeight:900, fontSize:'0.85rem' }}>
          <span>⏱</span><span>{Math.ceil(timeLeft)}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ position:'relative', zIndex:2, height:4, background:'rgba(255,255,255,0.08)', margin:'0 0 0.75rem' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:timerColor, borderRadius:2, transition:'width 0.5s linear, background 0.3s' }} />
      </div>

      {/* Content */}
      <div style={{ position:'relative', zIndex:2, flex:1, display:'flex', flexDirection:'column', padding:'0 1rem 1rem', gap:'0.6rem', maxWidth:600, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>

        {/* Question card */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'1.25rem 1.25rem 1rem', marginBottom:'0.25rem' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:900, color:'rgba(255,255,255,0.3)', letterSpacing:3, textTransform:'uppercase', marginBottom:'0.5rem', textAlign:'center' }}>
            f(x) ——— ?
          </div>
          <p style={{ margin:0, fontSize:'clamp(1rem,4vw,1.3rem)', fontWeight:800, textAlign:'center', lineHeight:1.4, color:'#fff' }}>
            {q.question}
          </p>
          {q.imageUrl && <img src={q.imageUrl} alt="" style={{ width:'100%', borderRadius:10, marginTop:'0.75rem', objectFit:'contain', maxHeight:160 }} referrerPolicy="no-referrer" />}
        </div>

        {/* Options */}
        {q.options.map((option, i) => {
          const col = OPTION_COLORS[i % OPTION_COLORS.length];
          const isSelected = selectedAnswer === option;
          const isCorrect  = option === q.correct_answer;
          const showCorrect   = selectedAnswer !== null && isCorrect;
          const showIncorrect = isSelected && !isCorrect;
          const disabled = selectedAnswer !== null;

          let bg     = col.bg;
          let border = col.border;
          let opacity = 1;
          if (showCorrect)        { bg = 'rgba(0,220,100,0.25)'; border = '#00dc64'; }
          else if (showIncorrect) { bg = 'rgba(239,68,68,0.25)'; border = '#ef4444'; }
          else if (disabled)      { opacity = 0.45; }

          return (
            <button key={`${currentQuestionIndex}-${i}`}
              onClick={() => !disabled && onAnswerSelect(option)}
              disabled={disabled}
              style={{
                display:'flex', alignItems:'center', gap:'0.75rem',
                background:bg, border:`1px solid ${border}`, borderRadius:12,
                padding:'0.85rem 1rem', cursor:disabled?'default':'pointer',
                opacity, transition:'opacity 0.2s, background 0.2s',
                animation:`mq-opt-in 0.25s ease ${i*0.07}s both`,
                width:'100%', textAlign:'left',
              }}>
              <span style={{ width:32, height:32, borderRadius:8, background:col.badge, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.85rem', color:'#fff', flexShrink:0 }}>
                {String.fromCharCode(65+i)}
              </span>
              <span style={{ flex:1, fontSize:'0.95rem', fontWeight:700, color:'#fff' }}>{option}</span>
              {showCorrect   && <CheckCircle2 size={18} color="#00dc64" />}
              {showIncorrect && <XCircle      size={18} color="#ef4444" />}
            </button>
          );
        })}

        {/* Pass button */}
        <button onClick={onSkipQuestion} disabled={selectedAnswer !== null}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12, padding:'0.75rem', color:'rgba(255,255,255,0.6)',
            fontSize:'0.85rem', fontWeight:700, cursor:selectedAnswer!==null?'default':'pointer',
            opacity:selectedAnswer!==null?0.4:1,
          }}>
          ⏭ Pass <span style={{ fontSize:'0.75rem', opacity:0.7 }}>(-50)</span>
        </button>

        {/* Footer note */}
        <p style={{ textAlign:'center', fontSize:'0.65rem', color:'rgba(255,255,255,0.25)', margin:'0.25rem 0 0', letterSpacing:1 }}>
          ✓ +100 · ✗ −50 · SKIP −50 · 60S ROUND
        </p>
      </div>
    </div>
  );
};
