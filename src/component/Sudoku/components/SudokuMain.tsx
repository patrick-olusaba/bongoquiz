import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useSudoku } from '../hooks/useSudoku';
import { SettingsDropdown } from './SettingsDropdown';
import { HowToPlayModal } from './HowToPlayModal';
import { NewGameModal } from './NewGameModal';
import { Message } from './Message';
import { CanvasGame } from './CanvasGame';
import { CongratsModal } from './CongratsModal';
import { PaymentModal } from './PaymentModal';
import { soundEngine } from '../utils/sound';
import { ArrowLeft } from 'lucide-react';
import type { Difficulty } from '../utils/sudoku';

export interface SudokuMainProps {
    onExit?: () => void;
}

export function SudokuMain({ onExit }: SudokuMainProps) {
    const {
        board,
        selected,
        setSelected,
        difficulty,
        stage,
        unlockedLevels,
        score,
        startNewGame,
        replayGame,
        nextStage,
        handleInput,
        handleErase,
        handleHint,
        handleUndo,
        canUndo,
        hasConflict,
        isIncorrect,
        isRelated,
        isSameValue,
        isComplete,
        hintedCell
    } = useSudoku();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
    const [isNewGameOpen, setIsNewGameOpen] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState<number | undefined>(undefined);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentCallback, setPaymentCallback] = useState<(() => void) | null>(null);

    useEffect(() => {
        soundEngine.setMuted(isMuted);
    }, [isMuted]);

    useEffect(() => {
        if (isComplete) {
            soundEngine.playWin();
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#2563eb', '#3b82f6', '#60a5fa', '#fef08a', '#fde047']
            });
        }
    }, [isComplete]);

    const triggerPayment = (callback: () => void) => {
        setPaymentCallback(() => callback);
        setIsPaymentModalOpen(true);
    };

    const handleNextLevel = () => {
        triggerPayment(() => nextStage());
    };

    const handleReplay = () => {
        replayGame();
    };

    const handleExit = () => {
        if (onExit) {
            onExit();
        } else {
            // Default fallback if no onExit is provided
            window.location.href = '/';
        }
    };

    const handleNewGameStart = (diff: Difficulty) => {
        triggerPayment(() => startNewGame(diff, 1));
    };

    const STAGES_PER_LEVEL = {
        Easy: 3,
        Medium: 6,
        Hard: 10
    };

    return (
        <div className="sudoku-wrapper">
            <div className="sudoku-card">

                {/* Header */}
                <div className="sudoku-header sudoku-header-dynamic" style={{ width: canvasWidth ? `${canvasWidth}px` : '100%' }}>
                    <div className="sudoku-header-title" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={handleExit}
                            className="sudoku-icon-btn"
                            style={{ padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            aria-label="Exit game"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h1 style={{ margin: 0, lineHeight: 1 }}>Sudoku</h1>
                            <span>{difficulty} - Stage {stage}/{STAGES_PER_LEVEL[difficulty]}</span>
                        </div>
                    </div>
                    <div className="sudoku-header-actions">
                        <button
                            onClick={() => setIsNewGameOpen(true)}
                            className="sudoku-btn-new-game"
                        >
                            {difficulty}
                        </button>
                        <SettingsDropdown
                            isSettingsOpen={isSettingsOpen}
                            setIsSettingsOpen={setIsSettingsOpen}
                            isMuted={isMuted}
                            setIsMuted={setIsMuted}
                            setIsHowToPlayOpen={setIsHowToPlayOpen}
                        />
                    </div>
                </div>

                <div className="sudoku-canvas-wrapper">
                    {board && board.length > 0 ? (
                        <CanvasGame
                            board={board}
                            selected={selected}
                            setSelected={setSelected}
                            hasConflict={hasConflict}
                            isIncorrect={isIncorrect}
                            isSameValue={isSameValue}
                            isRelated={isRelated}
                            handleHint={handleHint}
                            handleInput={handleInput}
                            handleErase={handleErase}
                            handleUndo={handleUndo}
                            canUndo={canUndo}
                            score={score}
                            hintedCell={hintedCell}
                            onWidthChange={setCanvasWidth}
                        />
                    ) : (
                        <div className="sudoku-loading">
                            Loading...
                        </div>
                    )}
                </div>

                <div className="sudoku-message-wrapper" style={{ width: canvasWidth ? `${canvasWidth}px` : '100%' }}>
                    <Message isComplete={isComplete ?? false} difficulty={difficulty} stage={stage} />
                </div>
            </div>

            <HowToPlayModal
                isOpen={isHowToPlayOpen}
                onClose={() => setIsHowToPlayOpen(false)}
            />

            <NewGameModal
                isOpen={isNewGameOpen}
                onClose={() => setIsNewGameOpen(false)}
                onStart={handleNewGameStart}
                unlockedLevels={unlockedLevels}
                score={score}
            />

            <CongratsModal
                isOpen={isComplete ?? false}
                onNext={handleNextLevel}
                onReplay={handleReplay}
            />

            {isPaymentModalOpen && (
                <PaymentModal
                    userProfile={JSON.parse(localStorage.getItem('sudoku_user') || 'null')}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onPay={() => {
                        setIsPaymentModalOpen(false);
                        if (paymentCallback) paymentCallback();
                    }}
                />
            )}
        </div>
    );
}
