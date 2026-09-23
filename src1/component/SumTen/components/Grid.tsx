import React from 'react';
import type { PanInfo } from 'motion/react';
import { Cell } from './Cell';
import type { GridState, Stage } from '../types';

interface GridProps {
    grid: GridState;
    cols: number;
    rows: number;
    stage: Stage;
    selected: number[];
    isProcessing: boolean;
    onPointerDown: (idx: number, e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onDrag: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
    onDragEnd: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
    hoverTargetIdx: number | null;
    mergingSlots: { [slotIdx: number]: { id: string; value: number }[] };
    hintIndices?: number[];
}

export const Grid = React.memo(function Grid({
                                                 grid,
                                                 cols,
                                                 rows,
                                                 stage,
                                                 selected,
                                                 isProcessing,
                                                 onPointerDown,
                                                 onPointerUp,
                                                 onDrag,
                                                 onDragEnd,
                                                 hoverTargetIdx,
                                                 mergingSlots,
                                                 hintIndices = []
                                             }: GridProps) {
    const callbacksRef = React.useRef({ onPointerDown, onPointerUp, onDrag, onDragEnd });
    React.useEffect(() => {
        callbacksRef.current = { onPointerDown, onPointerUp, onDrag, onDragEnd };
    });

    const handlePointerDown = React.useCallback((idx: number, e: React.PointerEvent) => {
        callbacksRef.current.onPointerDown(idx, e);
    }, []);

    const handlePointerUp = React.useCallback(() => {
        callbacksRef.current.onPointerUp();
    }, []);

    const handleDrag = React.useCallback((e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        callbacksRef.current.onDrag(e, info);
    }, []);

    const handleDragEnd = React.useCallback((e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        callbacksRef.current.onDragEnd(e, info);
    }, []);

    return (
        <div
            className={`sum-grid ${stage === 'completed' ? 'sum-completed' : ''}`}
            style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                '--cols': cols
            } as React.CSSProperties}
        >
            {grid.map((cellData, idx) => (
                <Cell
                    key={`slot-${idx}`}
                    idx={idx}
                    value={cellData}
                    mergingCells={mergingSlots[idx] || []}
                    isSelected={selected.includes(idx)}
                    isHinted={hintIndices.includes(idx)}
                    isHoverTarget={hoverTargetIdx === idx}
                    isProcessing={isProcessing}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                />
            ))}
        </div>
    );
});
