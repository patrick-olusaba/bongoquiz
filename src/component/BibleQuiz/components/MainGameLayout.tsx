import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase.ts';
import { useState, useEffect, useRef, useCallback } from 'react';
import MainMenu from '../components/MainMenu.tsx';
import QuestionScreen from '../components/QuestionScreen.tsx';
import Tutorial from '../components/Tutorial.tsx';
import ResultsPopup from '../components/ResultsPopup.tsx';
import LevelUpPopup from '../components/LevelUpPopup.tsx';
import GameOverScreen from '../components/GameOver.tsx';
import { BibleQuizGame } from '../utils/gameLogic.ts';
import { DeductionModal } from './DeductionModal.tsx';
import LeaderboardScreen from './LeaderboardScreen.tsx';
import { BIBLE_QUESTIONS } from '../data/questions.ts';
import { sound } from '../utils/sound.ts';
import '../style/style.css';
import type {AnswerResult, BibleQuestion, GameState, Player} from "../types/type.ts";

export const MainGameLayout = () => {

    const [questions, setQuestions] = useState<BibleQuestion[]>(BIBLE_QUESTIONS);

    useEffect(() => {
        getDocs(collection(db, "bibleQuizQuestions")).then(snap => {
            if (!snap.empty) {
                const q = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: data.id ?? parseInt(d.id) || 0,
                        question: data.question,
                        options: data.options,
                        correctAnswer: data.correctAnswer ?? data.answer ?? 0,
                        category: data.category ?? "",
                        difficulty: data.difficulty ?? "easy",
                        scripture: data.scripture ?? "",
                        explanation: data.explanation ?? "",
                        points: data.points ?? 10,
                    } as BibleQuestion;
                });
                setQuestions(q);
                game.updateQuestions(q);
            }
        }).catch(() => {});
    }, []); // eslint-disable-line

    const [game] = useState(() => new BibleQuizGame(
        localStorage.getItem('bongo_player_name') || 'Bible Scholar',
        BIBLE_QUESTIONS
    ));

    const [gameState, setGameState] = useState<GameState>({
        currentScreen: 'menu',
        currentQuestion: null,
        selectedAnswer: null,
        isAnswered: false,
        timeLeft: 40,
        gameStarted: false,
        showResults: false,
        showLevelUp: false,
        isGameOver: false
    });

    const [player, setPlayer] = useState<Player>(() => game.getPlayerStats());
    const [result, setResult] = useState<AnswerResult | null>(null);
    const [levelProgress, setLevelProgress] = useState(() => game.getLevelProgress());
    const [showLevelUpPopup, setShowLevelUpPopup] = useState(false);
    const [newLevelInfo, setNewLevelInfo] = useState<{
        level: number;
        name: string;
        multiplier: number;
        difficulty: string;
    } | null>(null);
    const [roundTimeLeft, setRoundTimeLeft] = useState(40);

    // Refs to manage timeout IDs
    const timerRef = useRef<number | null>(null);
    const autoNextRef = useRef<number | null>(null);

    // Level up handling disabled
    const handleLevelUp = useCallback(() => {}, []);

    // Define handleTimeUp which uses handleLevelUp
    const handleTimeUp = useCallback(() => {
        // Clear any pending timer
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (gameState.currentQuestion && !gameState.isAnswered) {
            const answerResult = game.submitAnswer(gameState.currentQuestion, -1);
            const newPlayer = game.getPlayerStats();
            const newLevelProgress = game.getLevelProgress();

            setPlayer(newPlayer);
            setResult(answerResult);
            setLevelProgress(newLevelProgress);

            setGameState(prev => ({
                ...prev,
                isAnswered: true,
                timeLeft: 0
            }));

            // Check for game over immediately
            if (answerResult.isGameOver || newPlayer.points <= 0) {

                // Show game over after delay
                setTimeout(() => {
                    setGameState(prev => ({
                        ...prev,
                        currentScreen: 'gameover'
                    }));
                }, 1500);
                return;
            }

        }
    }, [gameState.currentQuestion, gameState.isAnswered, game]);

    const handleContinueAfterLevelUp = useCallback(() => {
        setShowLevelUpPopup(false);
        setNewLevelInfo(null);

        // Check if game should be over (points check)
        const currentPlayer = game.getPlayerStats();
        if (currentPlayer.points <= 0) {
            setGameState(prev => ({
                ...prev,
                currentScreen: 'gameover'
            }));
            return;
        }

        // Get next question with new level difficulty
        const nextQuestion = game.getNextQuestion();
        const newLevelProgress = game.getLevelProgress();
        const newPlayer = game.getPlayerStats();


        if (nextQuestion && newPlayer.points > 0) {
            setGameState({
                currentScreen: 'game',
                currentQuestion: nextQuestion,
                selectedAnswer: null,
                isAnswered: false,
                timeLeft: 30,
                gameStarted: true,
                showResults: false,
                showLevelUp: false,
                isGameOver: false
            });
            setResult(null);
            setLevelProgress(newLevelProgress);
            setPlayer(newPlayer);
        } else if (newPlayer.points <= 0) {
            // Game over due to no points
            setGameState(prev => ({
                ...prev,
                currentScreen: 'gameover'
            }));
        } else {
            // No more questions - show results
            setGameState(prev => ({
                ...prev,
                currentScreen: 'results'
            }));
        }
    }, [game]);

    // Timer effect - uses setTimeout for better control
    useEffect(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // Single 40s round timer — ticks continuously while in game screen
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

    // Auto-next is handled directly in handleAnswerSelect via setTimeout

    const startNewGame = () => {
        setGameState(prev => ({ ...prev, currentScreen: 'deduction' }));
    };

    const _doStartGame = () => {

        // Clear any existing timeouts
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (autoNextRef.current !== null) {
            clearTimeout(autoNextRef.current);
            autoNextRef.current = null;
        }

        game.startNewGame();
        const question = game.getNextQuestion();
        const newPlayer = game.getPlayerStats();
        const newLevelProgress = game.getLevelProgress();

        // Check if game should start (points should be positive)
        if (newPlayer.points <= 0) {
            setGameState(prev => ({
                ...prev,
                currentScreen: 'gameover'
            }));
            return;
        }


        setPlayer(newPlayer);
        setLevelProgress(newLevelProgress);
        setRoundTimeLeft(40);
        setShowLevelUpPopup(false);
        setNewLevelInfo(null);

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

        setResult(null);
    };

    // Update handleAnswerSelect to check for game over
    const handleAnswerSelect = useCallback((answerIndex: number, question: BibleQuestion) => {

        const answerResult = game.submitAnswer(question, answerIndex);
        const newPlayer = game.getPlayerStats();
        const newLevelProgress = game.getLevelProgress();


        setPlayer(newPlayer);
        setResult(answerResult);
        setLevelProgress(newLevelProgress);
        answerResult.correct ? sound.correct() : sound.wrong();

        setGameState(prev => ({
            ...prev,
            selectedAnswer: answerIndex,
            isAnswered: true,
            showLevelUp: false,
            isGameOver: false
        }));

        // Auto-advance to next question after 1s
        autoNextRef.current = window.setTimeout(() => {
            const nextQuestion = game.getNextQuestion();
            const updatedPlayer = game.getPlayerStats();
            const updatedProgress = game.getLevelProgress();
            setPlayer(updatedPlayer);
            setLevelProgress(updatedProgress);
            setResult(null);
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

    // Debug effect to check level progress
    useEffect(() => {
        if (gameState.currentScreen === 'game' && gameState.currentQuestion) {
        }
    }, [gameState.currentScreen, gameState.currentQuestion, levelProgress, player]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
            if (autoNextRef.current !== null) {
                clearTimeout(autoNextRef.current);
            }
        };
    }, []);

    const renderScreen = () => {
        switch (gameState.currentScreen) {
            case 'deduction':
                return (
                    <DeductionModal
                        amount={20}
                        onAccept={() => {
                            _doStartGame();
                        }}
                        onDecline={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                    />
                );
            case 'menu':
                return (
                    <MainMenu
                        player={player}
                        onStartGame={startNewGame}
                        onShowTutorial={() => setGameState(prev => ({ ...prev, currentScreen: 'tutorial' }))}
                        onLeaderboard={() => setGameState(prev => ({ ...prev, currentScreen: 'leaderboard' }))}
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
                    // Check if it's because game is over
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
                            <button
                                className="btn-primary"
                                onClick={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                            >
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
                        currentLevel={levelProgress.level}
                        levelProgress={levelProgress}
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
                        <button
                            className="btn-primary"
                            onClick={() => setGameState(prev => ({ ...prev, currentScreen: 'menu' }))}
                        >
                            Back to Menu
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="app-container">
            <div className="main-content">
                {/* Render the current screen */}
                {renderScreen()}

                {/* Level Up Popup */}
                {showLevelUpPopup && newLevelInfo && (
                    <LevelUpPopup
                        newLevel={newLevelInfo.level}
                        levelName={newLevelInfo.name}
                        pointsMultiplier={newLevelInfo.multiplier}
                        levelDifficulty={newLevelInfo.difficulty}
                        onContinue={handleContinueAfterLevelUp}
                    />
                )}
            </div>
        </div>
    );
};