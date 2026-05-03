import { useState, useEffect, useCallback, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs, query, where, limit, doc, onSnapshot } from 'firebase/firestore';
import { getRandomQuestions } from '../constants/data';
import type { Question, LeaderboardEntry } from '../types';
import { audioSystem } from '../utils/audio';

export type Screen = 'landing' | 'payment' | 'intro' | 'quiz' | 'results';

export function useQuiz() {
  const [currentScreen, setCurrentScreenState] = useState<Screen>('landing');
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('biologyPlayerName') || '';
  });
  const [playerPhone, setPlayerPhone] = useState<string>(() => {
    return localStorage.getItem('biologyPlayerPhone') || '';
  });

  const setCurrentScreen = useCallback((screen: Screen, replace = false) => {
    setCurrentScreenState(screen);
    if (replace) {
      window.history.replaceState({ screen }, '', '');
    } else {
      window.history.pushState({ screen }, '', '');
    }
  }, []);

  // Check on mount if this phone has a paid session not yet played
  const [hasPaidSession, setHasPaidSession] = useState(false);
  useEffect(() => {
    const phone = localStorage.getItem('biologyPlayerPhone');
    if (!phone || !/^07\d{8}$/.test(phone)) return;
    const phone254 = phone.replace(/^0/, '254');
    const db = getFirestore();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    getDocs(query(collection(db, 'payments'), where('phone', '==', phone254), where('status', '==', 'paid'), where('game', '==', 'BIOLOGYQUIZ'), limit(5)))
      .then(async snap => {
        if (snap.empty) return;
        const latest = snap.docs
          .map(d => ({ ...d.data(), _paidAt: d.data().createdAt?.toDate?.() ?? new Date(0) }))
          .sort((a, b) => b._paidAt.getTime() - a._paidAt.getTime())[0];
        if (latest._paidAt < since) return;
        const sessionSnap = await getDocs(query(collection(db, 'bioQuizSessions'), where('phone', '==', phone), limit(10)));
        const alreadyPlayed = sessionSnap.docs.some(d => (d.data().playedAt?.toDate?.() ?? new Date(0)) > latest._paidAt);
        if (!alreadyPlayed) setHasPaidSession(true);
      }).catch(() => {});
    // Also listen for admin-granted sessions
    const unsub = onSnapshot(doc(db, 'grantedBioSessions', phone), snap => {
      if (snap.exists()) setHasPaidSession(true);
    }, () => {});
    return unsub;
  }, []);

  useEffect(() => {
    window.history.replaceState({ screen: currentScreen }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      const stateScreen = event.state?.screen;
      if (stateScreen) {
        setCurrentScreenState(stateScreen);
      } else {
        setCurrentScreenState('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [topicQuestions, setTopicQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  const [timeLeft, setTimeLeft] = useState<number>(60);
  const gameEndedRef = useRef(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('biologyLeaderboard');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch combined leaderboard from SQL + Firestore on mount
  useEffect(() => {
    const toKey = (p: string) => String(p).replace(/^0/, '254');
    Promise.all([
      fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard').then(r => r.json()).catch(() => []),
      getDocs(collection(getFirestore(), 'bioQuizLeaderboard')).then(snap => snap.docs.map(d => ({ ...d.data(), id: d.id }))).catch(() => []),
    ]).then(([sqlRaw, fbRaw]) => {
      const byPhone = new Map<string, { name: string; score: number; phone: string }>();
      (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
        const p = toKey(String(d.msisdn ?? ''));
        const s = d.score ?? 0;
        if (!byPhone.has(p) || s > byPhone.get(p)!.score)
          byPhone.set(p, { name: p.replace(/^254/, '0').slice(0, 3) + '*******', score: s, phone: p.replace(/^254/, '0') });
      });
      (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
        const p = toKey(d.phone || d.id || '');
        const s = d.score ?? 0;
        const existing = byPhone.get(p);
        const name = d.name && !/^\d/.test(d.name) ? d.name : existing?.name ?? d.name;
        if (!existing || s > existing.score) byPhone.set(p, { name, score: s, phone: p.replace(/^254/, '0') });
        else if (existing && name && !/^\d/.test(name)) byPhone.set(p, { ...existing, name });
      });
      const entries = Array.from(byPhone.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 20)
        .map(([, v], i) => ({ id: String(i), name: v.name, phone: v.phone, score: v.score, date: new Date().toISOString() }));
      if (entries.length > 0) {
        setLeaderboard(entries);
        localStorage.setItem('biologyLeaderboard', JSON.stringify(entries));
      }
    });
  }, []);

  const handleGoToPayment = (name: string, phone: string) => {
    localStorage.setItem('biologyPlayerName', name);
    localStorage.setItem('biologyPlayerPhone', phone);
    setPlayerName(name);
    setPlayerPhone(phone);
    if (hasPaidSession) {
      setHasPaidSession(false);
      setCurrentScreen('intro', true);
    } else {
      setCurrentScreen('payment');
    }
  };

  const handleStartGame = () => {
    setCurrentScreen('intro', true);
  };

  const doStartGame = async () => {
    let questions: Question[] = [];
    try {
      const snap = await getDocs(collection(getFirestore(), 'bioQuizQuestions'));
      if (!snap.empty) {
        const all = snap.docs.map(d => {
          const data = d.data();
          const correct_answer = data.correct_answer ?? data.options?.[data.answer] ?? '';
          return { id: d.id, ...data, correct_answer } as Question;
        });
        // Fisher-Yates shuffle
        for (let i = all.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [all[i], all[j]] = [all[j], all[i]];
        }
        questions = all.slice(0, 50);
      }
    } catch { /* ignore */ }
    if (questions.length === 0) questions = getRandomQuestions(50);
    gameEndedRef.current = false;
    setTopicQuestions(questions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setIsFeedbackModalOpen(false);
    setTimeLeft(60);
    setCurrentScreen('quiz', true);
  };

  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    setCurrentScreen('results', true);
    audioSystem.playGameOver();

    const newEntry: LeaderboardEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: playerName || 'Anonymous',
      phone: playerPhone || '',
      score,
      date: new Date().toISOString()
    };

    setLeaderboard(prev => {
      const updated = [...prev, newEntry];
      localStorage.setItem('biologyLeaderboard', JSON.stringify(updated));
      return updated;
    });

    // Save session to Firestore via Cloud Function, then refresh leaderboard
    const phone = playerPhone || localStorage.getItem('biologyPlayerPhone') || '';
    if (/^07\d{8}$/.test(phone)) {
      httpsCallable(getFunctions(), 'saveBioQuizSession')({
        name: playerName || 'Anonymous',
        phone,
        score,
        correct: correctCount,
        wrong: wrongCount,
        passed: 0,
        total: correctCount + wrongCount,
      }).then(() => {
        // Refresh combined leaderboard after save
        const toKey = (p: string) => String(p).replace(/^0/, '254');
        Promise.all([
          fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard').then(r => r.json()).catch(() => []),
          getDocs(collection(getFirestore(), 'bioQuizLeaderboard')).then(snap => snap.docs.map(d => ({ ...d.data(), id: d.id }))).catch(() => []),
        ]).then(([sqlRaw, fbRaw]) => {
          const byPhone = new Map<string, { name: string; score: number; phone: string }>();
          (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
            const p = toKey(String(d.msisdn ?? ''));
            const s = d.score ?? 0;
            if (!byPhone.has(p) || s > byPhone.get(p)!.score)
              byPhone.set(p, { name: p.replace(/^254/, '0').slice(0, 3) + '*******', score: s, phone: p.replace(/^254/, '0') });
          });
          (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
            const p = toKey(d.phone || d.id || '');
            const s = d.score ?? 0;
            const existing = byPhone.get(p);
            const name = d.name && !/^\d/.test(d.name) ? d.name : existing?.name ?? d.name;
            if (!existing || s > existing.score) byPhone.set(p, { name, score: s, phone: p.replace(/^254/, '0') });
            else if (existing && name && !/^\d/.test(name)) byPhone.set(p, { ...existing, name });
          });
          const entries = Array.from(byPhone.entries())
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 20)
            .map(([, v], i) => ({ id: String(i), name: v.name, phone: v.phone, score: v.score, date: new Date().toISOString() }));
          setLeaderboard(entries);
          localStorage.setItem('biologyLeaderboard', JSON.stringify(entries));
        });
      }).catch(() => {});
    }
  }, [playerName, playerPhone, score, correctCount, wrongCount, setCurrentScreen]);

  // Timer logic - runs continuously during quiz
  useEffect(() => {
    let timer: number;
    if (currentScreen === 'quiz') {
      timer = window.setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          if (newTime <= 19 && newTime > 0) {
            audioSystem.playAlarm();
          }
          if (newTime <= 0) {
            clearInterval(timer);
            endGame();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentScreen, endGame]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < topicQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setIsFeedbackModalOpen(false);
    } else {
      endGame();
    }
  }, [currentQuestionIndex, topicQuestions.length, endGame]);

  const handleAnswerSelect = useCallback((answer: string) => {
    if (selectedAnswer !== null) return;

    const currentQuestion = topicQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    const correct = answer === currentQuestion.correct_answer;

    setSelectedAnswer(answer);
    setIsAnswerCorrect(correct);

    if (correct) {
      audioSystem.playCorrect();
      setScore(prev => prev + 100);
      setCorrectCount(prev => prev + 1);
    } else {
      audioSystem.playWrong();
      setScore(prev => prev - 50);
      setWrongCount(prev => prev + 1);
    }

    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  }, [selectedAnswer, currentQuestionIndex, topicQuestions, handleNextQuestion]);

  const handleSkipQuestion = useCallback(() => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer('__SKIP__'); // special value so options don't light up as chosen wrong
    setIsAnswerCorrect(false);

    audioSystem.playWrong();
    setScore(prev => prev - 50);
    setWrongCount(prev => prev + 1);

    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  }, [selectedAnswer, handleNextQuestion]);

  const handleQuitGame = () => {
    endGame();
  };

  const handlePlayAgain = () => {
    setCurrentScreen('payment');
  };

  const handleCancelPayment = () => {
    setCurrentScreen('landing', true);
  };

  const handleBackToMenu = () => {
    setCurrentScreen('landing', true);
    setTopicQuestions([]);
    setScore(0);
  };

  return {
    currentScreen,
    playerName,
    setPlayerName,
    playerPhone,
    setPlayerPhone,
    leaderboard,
    hasPaidSession,
    topicQuestions,
    currentQuestionIndex,
    score,
    correctCount,
    wrongCount,
    selectedAnswer,
    isAnswerCorrect,
    isFeedbackModalOpen,
    timeLeft,
    setIsFeedbackModalOpen,
    handleGoToPayment,
    handleStartGame,
    doStartGame,
    handleAnswerSelect,
    handleNextQuestion,
    handleSkipQuestion,
    handleQuitGame,
    handlePlayAgain,
    handleCancelPayment,
    handleBackToMenu
  };
}