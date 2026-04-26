// BoxSelectScreen.tsx
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { type CellState, getRandomPrizeItems, type PrizeItem } from "../../types/bongotypes.ts";
import { BongoCanvas } from "./BongoCanvas.tsx";
import '../../styles/style.css';
import '../../styles/BoxSelectScreen.css'

interface Props {
    onPowerSelected: (power: PrizeItem) => void;
}

export const BoxSelectScreen: FC<Props> = ({ onPowerSelected }) => {
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
            <div className="boxselect-header">
                {/*<span className="boxselect-badge">Step 1 of 3</span>*/}
                <h2 className="boxselect-title">🎁 Choose Your Power Box</h2>
                <p className="boxselect-subtitle">Each box hides a power that affects Rounds 1 &amp; 2. Tap any box to reveal!</p>
            </div>

            <div className="bingo-canvas-container boxselect-canvas-wrap">
                <BongoCanvas
                    cells={cells}
                    onCellChange={setCells}
                    onCellClick={handleCellClick}
                    onRefreshGrid={reshufflePrizes}
                />
            </div>

            <p className="boxselect-hint">Ctrl+Z to reshuffle · Ctrl+1–8 to open by number</p>
        </div>
    );
};