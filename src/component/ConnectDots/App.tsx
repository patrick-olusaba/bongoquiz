/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/styles.css';
import { Game } from './components/Game';
import { OceanBackground } from './components/OceanBackground';
import { LandingPage } from './components/LandingPage';
import { BottomNav } from '../game/BottomNav';

const getPaidLevel = () => {
    const raw = Number(localStorage.getItem('connectDotsPaidLevel') || localStorage.getItem('connectDotsNextLevel') || '1');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
};

export default function App() {
    const [gameState, setGameState] = useState<'landing' | 'playing'>('landing');
    const [paidLevel, setPaidLevel] = useState(() => getPaidLevel());
    const navigate = useNavigate();

    const startPaidLevel = () => {
        const level = getPaidLevel();
        setPaidLevel(level);
        setGameState('playing');
    };

    const handleNavigate = (tab: 'home' | 'games' | 'spin' | 'leaderboard' | 'profile') => {
        const target =
            tab === 'home' ? '/' :
            tab === 'games' ? '/?tab=games' :
            tab === 'spin' ? '/?tab=spin' :
            tab === 'leaderboard' ? '/?tab=leaderboard' :
            '/?tab=profile';
        navigate(target);
    };

    return (
        <div className="connect-dots-shell">
            {gameState === 'landing' ? (
                <LandingPage onPlay={startPaidLevel} />
            ) : (
                <>
                    <OceanBackground />
                    <div className="app-container">
                        <Game paidLevel={paidLevel} onClose={() => setGameState('landing')} />
                    </div>
                </>
            )}
            <BottomNav active="games" onNavigate={handleNavigate} />
        </div>
    );
}
