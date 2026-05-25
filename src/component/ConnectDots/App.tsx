/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import './styles/styles.css';
import { Game } from './components/Game';
import { OceanBackground } from './components/OceanBackground';
import { LandingPage } from './components/LandingPage';

export default function App() {
    const [gameState, setGameState] = useState<'landing' | 'playing'>('landing');

    return (
        <>
            {gameState === 'landing' ? (
                <LandingPage onPlay={() => setGameState('playing')} />
            ) : (
                <>
                    <OceanBackground />
                    <div className="app-container">
                        <Game onClose={() => setGameState('landing')} />
                    </div>
                </>
            )}
        </>
    );
}
