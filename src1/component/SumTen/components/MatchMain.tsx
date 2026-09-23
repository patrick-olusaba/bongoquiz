import { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { RefreshCcw, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../hooks/useGame';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useProfile } from '../hooks/useProfile';
import { Header } from './Header';
import { Footer } from './Footer';
import { Grid } from './Grid';
import { LevelComplete } from './LevelComplete';
import { GameOver } from './GameOver';
import { HowToPlayModal } from './HowToPlayModal';
import { PaymentModal } from './PaymentModal';

interface MatchMainProps {
    onBack?: () => void;
    paymentId?: string;
    onPaymentConfirmed?: (paymentId?: string) => void;
}

export default function MatchMain({ onBack, paymentId, onPaymentConfirmed }: MatchMainProps = {}) {
    const {
        level,
        gameInLevel,
        totalGamesInLevel,
        totalGamesCompleted,
        setTotalGamesCompleted,
        score,
        grid,
        selected,
        stage,
        isProcessing,
        statusText,
        cols,
        rows,
        handlePointerDown,
        handlePointerUp,
        handleDrag,
        handleDragEnd,
        mergingSlots,
        maxTime,
        timeLeft,
        retryLevel,
        hintIndices,
        hintsUsed,
        showHintAction,
        hoverTargetIdx,
        gameSeed
    } = useGame();

    const { addScore } = useLeaderboard();
    const { profile } = useProfile();
    const [showHowToPlay, setShowHowToPlay] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const savedSessionRef = useRef(false);

    const saveSession = useCallback((endedReason: string) => {
        if (savedSessionRef.current || !profile?.name || !profile?.phone) return;
        savedSessionRef.current = true;
        const saveSumTenSession = httpsCallable(getFunctions(), "saveSumTenSession");
        saveSumTenSession({
            name: profile.name,
            phone: profile.phone,
            score,
            level,
            gameInLevel,
            totalGamesCompleted,
            hintsUsed,
            completed: stage === "completed",
            endedReason,
            paidPaymentId: paymentId || undefined,
        }).catch(error => {
            savedSessionRef.current = false;
            console.error("saveSumTenSession failed", error);
        });
    }, [profile, score, level, gameInLevel, totalGamesCompleted, hintsUsed, stage, paymentId]);

    useEffect(() => {
        if (stage === 'gameover') {
            addScore(score);
            saveSession("gameover");
        }
    }, [stage, score, addScore, saveSession]);

    const handleRetryRequest = () => {
        retryLevel();
    };

    const handleNextGameRequest = () => {
        if (gameInLevel === totalGamesInLevel) {
            // Completed the level! Need to pay for the next one
            setIsPaymentModalOpen(true);
        } else {
            setTotalGamesCompleted(c => c + 1);
        }
    };

    const handlePaymentSuccess = (nextPaymentId?: string) => {
        setIsPaymentModalOpen(false);
        onPaymentConfirmed?.(nextPaymentId);
        setTotalGamesCompleted(c => c + 1);
    };

    return (
        <div className="sum-app-container">
            <Header
                // We can pass both level and game info to Header, but for now we'll just pass level
                level={level}
                gameInLevel={gameInLevel}
                totalGamesInLevel={totalGamesInLevel}
                score={score}
                timeLeft={timeLeft}
                maxTime={maxTime}
                onShowHelp={() => setShowHowToPlay(true)}
                onExit={() => {
                    if (score > 0) {
                        addScore(score);
                        saveSession("exit");
                    }
                    if (onBack) onBack();
                }}
            />



            <main className="sum-main-content">
                <div className="w-full flex-1 flex flex-col justify-center items-center sm:hidden min-h-0">
                    <div className="sum-header-stats relative justify-center w-full mt-2">
                        <div className="sum-stat-box">
                            <span className="sum-stat-label">Level</span>
                            <span className="sum-stat-value">{level.toString().padStart(2, '0')}</span>
                        </div>
                        {gameInLevel && totalGamesInLevel && (
                            <>
                                <div className="sum-stat-divider"></div>
                                <div className="sum-stat-box">
                                    <span className="sum-stat-label">Stage</span>
                                    <span className="sum-stat-value">{gameInLevel}/{totalGamesInLevel}</span>
                                </div>
                            </>
                        )}
                        <div className="sum-stat-divider"></div>
                        <div className="sum-stat-box">
                            <span className="sum-stat-label">Score</span>
                            <span className="sum-stat-value sum-stat-value-score">{score}</span>
                        </div>
                    </div>
                </div>

                <div className="sum-game-container flex-none">
                    <div
                        className="sum-game-background"
                        style={{
                            backgroundImage: `url(https://picsum.photos/seed/sumten${gameSeed}/800/800)`
                        }}
                    />

                    <AnimatePresence>
                        {statusText && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, x: "-50%" }}
                                animate={{ opacity: 1, y: 0, x: "-50%" }}
                                exit={{ opacity: 0, scale: 0.9, x: "-50%" }}
                                className="sum-toast"
                            >
                                {statusText.includes("Shuffling") && <RefreshCcw className="sum-icon-spin" />}
                                {statusText}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Grid
                        grid={grid}
                        cols={cols}
                        rows={rows}
                        stage={stage}
                        selected={selected}
                        isProcessing={isProcessing}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onDrag={handleDrag}
                        onDragEnd={handleDragEnd}
                        hoverTargetIdx={hoverTargetIdx}
                        mergingSlots={mergingSlots}
                        hintIndices={hintIndices}
                    />

                    {stage === 'completed' && <LevelComplete level={level} gameInLevel={gameInLevel} totalGamesInLevel={totalGamesInLevel} onNextLevel={handleNextGameRequest} />}
                    {stage === 'gameover' && <GameOver level={level} score={score} onRetry={handleRetryRequest} />}
                </div>

                <div className="w-full flex-1 sm:hidden min-h-0 flex items-center justify-end px-6">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                        onClick={showHintAction}
                    >
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-200 font-bold tracking-widest text-sm uppercase drop-shadow">HINT</span>
                    </div>
                </div>
            </main>

            <Footer onHint={showHintAction} />

            <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onPay={handlePaymentSuccess}
                profile={profile}
            />
        </div>
    );
}
