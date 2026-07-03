import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Info, Loader2 } from 'lucide-react';
import type {UserProfile} from '../hooks/useProfile';
import { audio } from '../utils/audio';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPay: () => void;
    profile: UserProfile | null;
}

export function PaymentModal({ isOpen, onClose, onPay, profile }: PaymentModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayClick = () => {
        audio.unlock();
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            onPay();
        }, 1000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="sum-payment-modal-overlay">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="sum-payment-modal-backdrop"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="sum-payment-modal-content"
                    >
                        {/* Icon */}
                        <div className="sum-payment-icon-wrapper">
                            <div className="sum-payment-icon-container">
                                <CreditCard className="sum-payment-icon" strokeWidth={2} />
                            </div>
                        </div>

                        <h2 className="sum-payment-title">
                            Speed Quiz Ticket
                        </h2>

                        <p className="sum-payment-message">
                            Hi <span className="sum-payment-bold">{profile?.name || 'Player'}</span>! To start this round, please confirm payment of <span className="sum-payment-bold">20/-</span> via your mobile number.
                        </p>

                        <div className="sum-payment-prompt">
                            <p className="sum-payment-prompt-label">M-Pesa prompt will be sent to</p>
                            <p className="sum-payment-prompt-number">{profile?.phone || '...'}</p>
                        </div>

                        <div className="sum-payment-actions">
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="sum-payment-btn sum-payment-btn-cancel disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handlePayClick}
                                disabled={isProcessing}
                                className="sum-payment-btn sum-payment-btn-pay flex items-center justify-center gap-2 disabled:opacity-90 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        PROCESSING...
                                    </>
                                ) : (
                                    'PAY'
                                )}
                            </button>
                        </div>

                        <div className="sum-payment-footer">
                            <Info className="sum-payment-footer-icon" />
                            <p>Secure payment via your mobile provider</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
