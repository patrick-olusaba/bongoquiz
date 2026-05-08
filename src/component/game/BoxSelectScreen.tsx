// BoxSelectScreen.tsx
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { type CellState, getRandomPrizeItems, type PrizeItem } from "../../types/bongotypes.ts";
import { BongoCanvas } from "./BongoCanvas.tsx";
import '../../styles/style.css';
import '../../styles/BoxSelectScreen.css'

interface Props {
    onPowerSelected: (power: PrizeItem) => void;
    onBack?: () => void;
}

export const BoxSelectScreen: FC<Props> = ({ onPowerSelected, onBack }) => {
    const [cells, setCells] = useState<CellState[]>([]);
    const [hasSelected, setHasSelected] = useState(false);
    const [loading, setLoading] = useState(true);
    const cellsRef = useRef<CellState[]>([]);

    useEffect(() => { cellsRef.current = cells; }, [cells]);

    const initializeCells = useCallback(async (): Promise<CellState[]> => {
        const prizes = await getRandomPrizeItems(8);
        const result: CellState[] = [];
        for (let y = 0; y < 2; y++)
            for (let x = 0; x < 4; x++) {
                const id = y * 4 + x;
                result.push({ id, value: id + 1, isRevealed: false, x, y, prizeItem: prizes[id] });
            }
        return result;
    }, []);

    useEffect(() => {
        initializeCells().then(c => {
            setCells(c);
            cellsRef.current = c;
            // Small delay to ensure canvas is ready
            setTimeout(() => setLoading(false), 100);
        });
    }, [initializeCells]);

    const reshufflePrizes = useCallback(async () => {
        if (hasSelected) return;
        const prizes = await getRandomPrizeItems(8);
        setCells(prev => prev.map((cell, i) => ({ ...cell, isRevealed: false, prizeItem: prizes[i] })));
    }, [hasSelected]);

    const handleCellClick = useCallback((id: number) => {
        if (hasSelected) return;
        setHasSelected(true);
        setCells(prev => {
            const next = [...prev];
            if (next[id]) next[id] = { ...next[id], isRevealed: true };
            return next;
        });
        const cell = cellsRef.current[id];
        if (cell?.prizeItem) {
            setTimeout(() => onPowerSelected(cell.prizeItem!), 3000);
        }
    }, [onPowerSelected, hasSelected]);

    if (loading) {
        return (
            <div className="boxselect-root">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid rgba(255,255,255,0.1)',
                            borderTop: '3px solid #FFD700',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 12px'
                        }} />
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Preparing boxes...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="boxselect-root">
            {/* Animated background */}
            <div className="boxselect-bg">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="boxselect-float-icon" style={{
                        left: `${(i * 13 + 5) % 95}%`,
                        top: `${(i * 17 + 10) % 90}%`,
                        animationDelay: `${i * 0.4}s`,
                        fontSize: `${1.2 + (i % 3) * 0.5}rem`,
                        opacity: 0.15 + (i % 3) * 0.05
                    }}>
                        {['🎁', '⭐', '✨', '🎲', '💎'][i % 5]}
                    </div>
                ))}
                {[...Array(8)].map((_, i) => (
                    <div key={`orb-${i}`} className="boxselect-orb" style={{
                        left: `${(i * 20 + 10) % 90}%`,
                        top: `${(i * 25 + 15) % 85}%`,
                        animationDelay: `${i * 0.6}s`,
                        width: `${60 + (i % 3) * 40}px`,
                        height: `${60 + (i % 3) * 40}px`
                    }} />
                ))}
            </div>

            {/* Fixed top bar */}
            {onBack && (
                <div className="boxselect-topbar">
                    <button onClick={onBack} className="boxselect-back-btn">
                        ← <span>Back to Home</span>
                    </button>
                </div>
            )}

            {/* Content wrapper */}
            <div className="boxselect-content">
                <div className="boxselect-header">
                    <div className="boxselect-badge">
                        <span className="boxselect-badge-pulse" />
                        Step 1 of 3
                    </div>
                    <h2 className="boxselect-title">
                        <span className="boxselect-title-icon">🎁</span>
                        Choose Your Power Box
                    </h2>
                    <p className="boxselect-subtitle">Each box hides a power that affects Rounds 1 & 2. Tap any box to reveal!</p>
                </div>

                <div className="bingo-canvas-container boxselect-canvas-wrap">
                    <BongoCanvas
                        cells={cells}
                        onCellChange={setCells}
                        onCellClick={handleCellClick}
                        onRefreshGrid={reshufflePrizes}
                    />
                </div>

                <p className="boxselect-hint">💡 Tip: Each box contains a unique power-up!</p>
            </div>
        </div>
    );
};