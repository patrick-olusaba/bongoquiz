import { useState, useRef, useEffect } from 'react';
import { Sparkles, Settings, Volume2, VolumeX, Info, ArrowLeft } from 'lucide-react';
import { audio } from '../utils/audio';

interface HeaderProps {
    level: number;
    gameInLevel?: number;
    totalGamesInLevel?: number;
    score: number;
    timeLeft: number;
    maxTime: number;
    onShowHelp: () => void;
    onExit?: () => void;
}

export function Header({ level, gameInLevel, totalGamesInLevel, score, timeLeft, maxTime, onShowHelp, onExit }: HeaderProps) {
    const isUrgent = timeLeft <= 10;
    const [showSettings, setShowSettings] = useState(false);
    const [isMuted, setIsMuted] = useState(audio.muted);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggleMute = () => {
        setIsMuted(audio.toggleMute());
        setShowSettings(false);
    };

    const statsContent = (
        <>
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
        </>
    );

    return (
        <header className="sum-header relative flex items-center justify-between w-full shadow-md z-20">
            <div className="sum-header-left flex items-center gap-1 sm:gap-3">
                {onExit && (
                    <button
                        onClick={onExit}
                        className="flex items-center justify-center p-1 sm:p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                        aria-label="Exit Game"
                    >
                        <ArrowLeft size={24} />
                    </button>
                )}
                <div className="sum-header-logo flex">
                    <span>10</span>
                </div>
                <div className="sum-header-title-container hidden sm:block">
                    <h1>
                        SUMTEN <Sparkles className="sum-sparkle-icon" />
                    </h1>
                </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center z-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative flex items-center justify-center scale-90 sm:scale-100 -mx-3 sm:mx-0">
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
                        style={{ overflow: 'visible' }}
                    >
                        <rect
                            x="0" y="0" width="100%" height="100%" rx="999"
                            fill={isUrgent ? "rgba(239, 68, 68, 0.15)" : "rgba(30, 41, 59, 0.8)"}
                            stroke={isUrgent ? "rgba(239, 68, 68, 0.3)" : "rgba(51, 65, 85, 1)"}
                            strokeWidth="4"
                        />
                        <rect
                            x="0" y="0" width="100%" height="100%" rx="999"
                            fill="transparent"
                            stroke={isUrgent ? "#ef4444" : "#34d399"}
                            strokeWidth="4"
                            pathLength="100"
                            strokeDasharray="100"
                            strokeDashoffset={100 - (timeLeft / maxTime) * 100}
                            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s ease' }}
                        />
                    </svg>
                    <div className={`relative z-10 px-4 sm:px-6 py-1.5 sm:py-2.5 flex items-center justify-center text-center font-mono text-lg sm:text-2xl min-w-[4.5rem] sm:min-w-[6.5rem] tracking-wider ${isUrgent ? 'text-red-500 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-emerald-400 font-semibold'}`}>
                        <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                    </div>
                </div>
            </div>

            <div className="sum-settings-wrapper" ref={dropdownRef}>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex relative justify-end">
                        <div className="sum-header-stats">
                            {statsContent}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`sum-settings-btn ${showSettings ? 'is-open' : ''} p-1 sm:p-2 ml-2 sm:ml-4 mr-1 sm:mr-0`}
                        aria-label="Settings"
                    >
                        <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                </div>

                {showSettings && (
                    <div className="sum-settings-dropdown">
                        <button
                            onClick={handleToggleMute}
                            className="sum-settings-item"
                        >
                            {isMuted ? <VolumeX className="sum-settings-item-icon muted" /> : <Volume2 className="sum-settings-item-icon unmuted" />}
                            {isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
                        </button>
                        <div className="sum-settings-divider"></div>
                        <button
                            onClick={() => {
                                setShowSettings(false);
                                onShowHelp();
                            }}
                            className="sum-settings-item"
                        >
                            <Info className="sum-settings-item-icon info" />
                            How to Play
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
