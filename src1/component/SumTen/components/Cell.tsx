import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PanInfo } from 'motion/react';
import type { CellValue } from '../types';

interface CellProps {
    key?: React.Key;
    idx: number;
    value: CellValue;
    mergingCells?: { id: string; value: number }[];
    isSelected: boolean;
    isHinted?: boolean;
    isHoverTarget?: boolean;
    isProcessing: boolean;
    onPointerDown: (idx: number, e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onDrag: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
    onDragEnd: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}

export const Cell = React.memo(function Cell({ idx, value, mergingCells = [], isSelected, isHinted, isHoverTarget,
                                                 onPointerDown, onPointerUp, onDrag, onDragEnd }: CellProps) {
    const hasContent = value !== null || mergingCells.length > 0;
    return (
        <div data-idx={idx} className={`sum-cell-wrapper relative ${hasContent ? 'sum-has-value' : 'sum-empty'} ${isHoverTarget ? 'sum-hover-target' : ''}`}>
            <AnimatePresence>
                {value !== null && (
                    <motion.div
                        key={value.id}
                        layout
                        layoutId={value.id}
                        drag
                        dragSnapToOrigin={true}
                        dragElastic={0.2}
                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        whileDrag={{
                            scale: 1.05,
                            rotate: 3,
                            zIndex: 50,
                            cursor: "grabbing",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)"
                        }}
                        animate={{
                            scale: isSelected ? 0.9 : 1
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5
                        }}
                        style={{ willChange: "transform, opacity" }}
                        onPointerDown={(e) => onPointerDown(idx, e)}
                        onPointerUp={onPointerUp}
                        onDrag={onDrag}
                        onDragEnd={onDragEnd}
                        className={`sum-cell ${isSelected ? 'sum-cell-selected' : isHinted ? 'sum-cell-hinted' : 'sum-cell-default'} relative z-10`}
                    >
                        {value.value}
                    </motion.div>
                )}

                {mergingCells.length > 0 && (
                    <motion.div
                        key="merge-bg"
                        initial={{ scale: 0.8, opacity: 1, borderWidth: "4px", borderColor: "#34d399" }}
                        animate={{ scale: 1.6, opacity: 0, borderWidth: "0px" }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="sum-cell z-10 m-auto pointer-events-none box-border"
                        style={{ borderStyle: 'solid', backgroundColor: 'transparent', boxShadow: 'none', borderBottomColor: 'transparent', willChange: "transform, opacity, border-width" }}
                    />
                )}

                {mergingCells.length > 0 && Array.from({length: 6}).map((_, i) => {
                    const angle = (i * Math.PI * 2) / 6;
                    const distance = 50;
                    return (
                        <motion.div
                            key={`spark-${i}`}
                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                            animate={{
                                x: Math.cos(angle) * distance,
                                y: Math.sin(angle) * distance,
                                scale: 0.5,
                                opacity: 0
                            }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            style={{ willChange: "transform, opacity" }}
                            className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-emerald-400 z-30 pointer-events-none"
                        />
                    )
                })}

                {mergingCells.map((c, index) => (
                    <motion.div
                        key={`merge-${c.id}-${index}`}
                        layoutId={c.id}
                        initial={{ scale: 1 }}
                        animate={{
                            scale: [1, 1.2, 0],
                            opacity: index === 0 ? [1, 1, 0] : [0.9, 0.9, 0]
                        }}
                        transition={{
                            duration: 0.5,
                            times: [0, 0.5, 1],
                            ease: "easeOut",
                            layout: { type: "spring", stiffness: 400, damping: 25 }
                        }}
                        className={`sum-cell z-20 pointer-events-none m-auto`}
                        style={{
                            backgroundColor: '#34d399',
                            borderColor: '#10b981',
                            color: '#064e3b',
                            boxShadow: 'none',
                            willChange: 'transform, opacity'
                        }}
                    >
                        {c.value}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
});
