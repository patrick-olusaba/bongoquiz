import { collection, getDocs, query, where, limit, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase.ts';
import { useState, useEffect, useRef, useCallback } from 'react';
import MainMenu from '../components/MainMenu.tsx';
import QuestionScreen from '../components/QuestionScreen.tsx';
import Tutorial from '../components/Tutorial.tsx';
import ResultsPopup from '../components/ResultsPopup.tsx';
import GameOverScreen from '../components/GameOver.tsx';
import { BibleQuizGame } from '../utils/gameLogic.ts';
import { DeductionModal } from './DeductionModal.tsx';
import { GameTransition } from './GameTransition.tsx';
import LeaderboardScreen from './LeaderboardScreen.tsx';
import { PlayerNameModal } from '../../game/Playernamemodal.tsx';
import { GENERAL_QUESTIONS } from '../data/questions.ts';
import { sound } from '../utils/sound.ts';
import '../style/style.css';
import type {Question, GameState, Player} from '../types/type.ts';

export const MainGameLayout = () => {

    const [game] = useState(() => new BibleQuizGame(
        localStorage.getItem('bongo_player_name') || localStorage.getItem('quizPlayer') || 'Quiz Master',
        GENERAL_QUESTIONS
    ));

    // Fetch questions from Firestore, fall back to local data
    useEffect(() => {
        getDocs(collection(db, 'generalKnowledgeQuestions')).then(snap => {
            if (!snap.empty) {
                const q = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: data.id ?? d.id,
                        question: data.question,
                        options: data.options,
                        correctAnswer: (data.correctAnswer ?? data.answer) ?? 0,
                        category: data.category ?? '',
                        difficulty: data.difficulty ?? 'easy',
                        explanation: data.explanation ?? '',
                        points: data.points ?? 10,
                    } as Question;
                });
                game.updateQuestions(q);
            }
        }).catch(() => {});
    }, []); // eslint-disable-line

    // Payment / granted-session check
    const [hasPaidSession, setHasPaidSession] = useState(false);
    useEffect(() => {
        const phone = localStorage.getItem('bongo_player_phone');
        if (!phone || !/^07\d{8}$/.test(phone)) return;
        const phone254 = phone.replace(/^0/, '254');
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        getDocs(query(collection(db, 'payments'), where('phone', '==', phone254), where('game', '==', 'GENERALKNOWLEDGE'), where('status', '==', 'paid'), limit(5)))
            .then(async snap => {
                if (snap.empty) return;
                const latest = snap.docs
                    .map(d => ({ ...d.data(), _paidAt: d.data().createdAt?.toDate?.() ?? new Date(0) }))
                    .sort((a, b) => b._paidAt.getTime() - a._paidAt.getTime())[0];
                if (latest._paidAt < since) return;
                const sessionSnap = await getDocs(query(collection(db, 'genQuizSessions'), where('phone', '==', phone), limit(10)));
                const alreadyPlayed = sessionSnap.docs.some(d => (d.data().playedAt?.toDate?.() ?? new Date(0)) > latest._paidAt);
                if (!alreadyPlayed) setHasPaidSession(true);
            }).catch(() => {});
        const unsub = onSnapshot(doc(db, 'grantedGenSessions', phone), snap => {
            if (snap.exists()) setHasPaidSession(true);
        }, () => {});
        return unsub;
    }, []);

    const [gameState, setGameState] = useState<GameState>({
        currentScreen: 'menu',
        currentQuestion: null,
        selectedAnswer: null,
        isAnswered: false,
        timeLeft: 60,
        gameStarted: false,
        showResults: false,
        showLevelUp: false,
        isGameOver: false
    });

    const [player, setPlayer] = useState<Player>(() => game.getPlayerStats());
    const [roundTimeLeft, setRoundTimeLeft] = useState(60);
    const [showNameModal, setShowNameModal] = useState(
        !localStorage.getItem('bongo_player_phone') || !localStorage.getItem('bongo_player_name')
    );

    // Refs to manage timeout IDs
    const timerRef = useRef<number | null>(null);
    const autoNextRef = useRef<number | null>(null);

    // Timer effect
    useEffect(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (gameState.currentScreen === 'game' && gameState.currentQuestion) {
            timerRef.current = window.setTimeout(() => {
                setRoundTimeLeft(prev => {
                    if (prev <= 1) {
                        sound.timeout();
                        setGameState(gs => ({ ...gs, currentScreen: 'results' }));
                        return 0;
                    }
                    if (prev <= 5) sound.tickUrgent(); else if (prev <= 10) sound.tick();
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current !== null) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
            };
        }
    }, [gameState.currentScreen, gameState.currentQuestion, roundTimeLeft]);

    const startNewGame = () => {
        if (!localStorage.getItem('bongo_player_phone') || !localStorage.getItem('bongo_player_name')) {
            setShowNameModal(true);
            return;
        }
        if (hasPaidSession) {
            setHasPaidSession(false);
            setGameState(prev => ({ ...prev, currentScreen: 'transition' }));
        } else {
            setGameState(prev => ({ ...prev, currentScreen: 'deduction' }));
        }
    };

    const _doStartGame = () => {
        if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (autoNextRef.current !== null) { clearTimeout(autoNextRef.current); autoNextRef.current = null; }

        game.startNewGame();
        const question = game.getNextQuestion();
        const newPlayer = game.getPlayerStats();

        if (newPlayer.points <= 0) {
            setGameState(prev => ({ ...prev, currentScreen: 'gameover' }));
            return;
        }

        setPlayer(newPlayer);
        setRoundTimeLeft(60);
        setGameState({
            currentScreen: 'game',
            currentQuestion: question,
            selectedAnswer: null,
            isAnswered: false,
            timeLeft: 30,
            gameStarted: true,
            showResults: false,
            showLevelUp: false,
            isGameOver: false
        });
    };

    const handleAnswerSelect = useCallback((answerIndex: number, question: Question) => {
        const answerResult = game.submitAnswer(question, answerIndex);
        const newPlayer = game.getPlayerStats();

        setPlayer(newPlayer);
        answerResult.correct ? sound.correct() : sound.wrong();

        setGameState(prev => ({
            ...prev,
            selectedAnswer: answerIndex,
            isAnswered: true,
            showLevelUp: false,
            isGameOver: false
        }));

        autoNextRef.current = window.setTimeout(() => {
            const nextQuestion = game.getNextQuestion();
            const updatedPlayer = game.getPlayerStats();
            setPlayer(updatedPlayer);
            if (nextQuestion) {
                setGameState(prev => ({
                    ...prev,
                    currentQuestion: nextQuestion,
                    selectedAnswer: null,
                    isAnswered: false,
                }));
            } else {
                setGameState(prev => ({ ...prev, currentScreen: 'results' }));
            }
        }, 1000);
    }, [game]);

    const handlePass = useCallback(() => {
        game.passQuestion();
        const newPlayer = game.getPlayerStats();
        setPlayer(newPlayer);
        const nextQuestion = game.getNextQuestion();
        if (!nextQuestion) {
            setGameState(prev => ({ ...prev, currentScreen: 'results' }));
            return;
        }
        setGameState(prev => ({
            ...prev,
            currentQuestion: nextQuestion,
            selectedAnswer: null,
            isAnswered: false,
            timeLeft: 30,
        }));
    }, [game]);

    useEffect(() => {
        const handler = () => setGameState(prev => ({ ...prev, currentScreen: 'leaderboard' }));
        window.addEventListener('show-leaderboard', handler);
        return () => window.removeEventListener('show-leaderboard', handler);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
            if (autoNextRef.current !== null) clearTimeout(autoNextRef.current);
        };
    }, []);

    const renderScreen = () => {
        switch (gameState.currentScreen) {
            case 'deduction':
                return (
                    <DeductionModal
                        amount={20}
                        onAccept={() => setGameState(prev => ({ ...prev, currentScreen: 'transition' }))}
                        onDecline={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                    />
                );
            case 'transition':
                return <GameTransition onDone={() => _doStartGame()} />;

            case 'menu':
                return (
                    <MainMenu
                        player={player}
                        onStartGame={startNewGame}
                        onShowTutorial={() => setGameState(prev => ({ ...prev, currentScreen: 'tutorial' }))}
                        onLeaderboard={() => setGameState(prev => ({ ...prev, currentScreen: 'leaderboard' }))}
                        onChangeName={() => setShowNameModal(true)}
                    />
                );

            case 'tutorial':
                return (
                    <Tutorial
                        onStartGame={startNewGame}
                        onBack={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                    />
                );

            case 'game':
                if (!gameState.currentQuestion) {
                    if (player.points <= 0 || gameState.isGameOver) {
                        return <GameOverScreen
                            player={player}
                            onRetry={startNewGame}
                            onMenu={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                        />;
                    }
                    return (
                        <div className="loading-screen">
                            <h2>No more questions available!</h2>
                            <button className="btn-primary" onClick={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}>
                                Back to Menu
                            </button>
                        </div>
                    );
                }
                return (
                    <QuestionScreen
                        question={gameState.currentQuestion}
                        timeLeft={roundTimeLeft}
                        isAnswered={gameState.isAnswered}
                        selectedAnswer={gameState.selectedAnswer}
                        onAnswerSelect={(answerIndex) => handleAnswerSelect(answerIndex, gameState.currentQuestion!)}
                        onPass={handlePass}
                        onMenu={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                        showAutoNext={gameState.isAnswered}
                        player={player}
                    />
                );

            case 'leaderboard':
                return (
                    <LeaderboardScreen
                        playerScore={player.score}
                        playerName={player.name}
                        onPlayAgain={startNewGame}
                        onClose={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                    />
                );

            case 'results':
                sound.victory();
                return (
                    <ResultsPopup
                        player={player}
                        onPlayAgain={startNewGame}
                        onMenu={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                    />
                );

            case 'gameover':
                return (
                    <GameOverScreen
                        player={player}
                        onRetry={startNewGame}
                        onMenu={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                    />
                );

            default:
                return (
                    <div className="error-fallback">
                        <h2>Oops! Something went wrong</h2>
                        <button className="btn-primary" onClick={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}>
                            Back to Menu
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="app-container">
            <div className="main-content">
                {renderScreen()}
                {showNameModal && gameState.currentScreen === 'menu' && (
                    <PlayerNameModal
                        currentName={player.name}
                        currentPhone={localStorage.getItem('bongo_player_phone') ?? ''}
                        onSave={(name, phone) => {
                            localStorage.setItem('bongo_player_name', name);
                            localStorage.setItem('bongo_player_phone', phone);
                            localStorage.setItem('quizPlayer', name);
                            game.setPlayerName(name);
                            setPlayer(game.getPlayerStats());
                            setShowNameModal(false);
                        }}
                        onClose={() => {
                            if (localStorage.getItem('bongo_player_phone') && localStorage.getItem('bongo_player_name')) {
                                setShowNameModal(false);
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
};
