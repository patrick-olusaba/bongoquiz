import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface HowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <React.Fragment>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="sum-modal-backdrop"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
                        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                        exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
                        className="sum-modal-content"
                    >
                        <div className="sum-modal-header">
                            <h2 className="sum-modal-title">How to Play</h2>
                            <button
                                onClick={onClose}
                                className="sum-modal-close"
                                aria-label="Close rules"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="sum-modal-body">
                            <p>Your goal is to clear the board by pairing numbers that add up to <strong>10</strong>.</p>

                            <h3>Rules:</h3>
                            <ul>
                                <li>Select two numbers that total exactly 10.</li>
                                <li>The two numbers must follow a clear path between them in the same row or column (no other un-matched numbers blocking the way).</li>
                                <li>Clear all tiles to complete the level before the time runs out.</li>
                            </ul>

                            <h3>Scoring:</h3>
                            <ul>
                                <li>Earn <strong>100 points</strong> for each level completed.</li>
                                <li>Deduct <strong>20 points</strong> when using a hint.</li>
                            </ul>

                            <h3>Tips:</h3>
                            <p>If you get stuck and there are no valid moves left, the board will automatically shuffle.</p>
                        </div>

                        <div className="sum-modal-footer">
                            <button
                                onClick={onClose}
                                className="sum-modal-action-btn"
                            >
                                Got It
                            </button>
                        </div>
                    </motion.div>
                </React.Fragment>
            )}
        </AnimatePresence>
    );
}
