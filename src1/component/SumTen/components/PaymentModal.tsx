import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Info, Loader2 } from "lucide-react";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "../hooks/useProfile";
import { audio } from "../utils/audio";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPay: (paymentId?: string) => void;
    profile: UserProfile | null;
}

const TIMEOUT_S = 90;
const DEPOSIT_URL = "https://us-central1-bongoquiz-23ad4.cloudfunctions.net/deposit";

export function PaymentModal({ isOpen, onClose, onPay, profile }: PaymentModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [timedOut, setTimedOut] = useState(false);
    const [error, setError] = useState("");
    const acceptedRef = useRef(false);
    const paymentIdRef = useRef<string | undefined>();
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
            setElapsed(0);
            setTimedOut(false);
            setError("");
            acceptedRef.current = false;
            paymentIdRef.current = undefined;
            unsubRef.current?.();
            unsubRef.current = null;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isProcessing) return;
        const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, [isProcessing]);

    const handleConfirmed = (paymentId?: string) => {
        if (acceptedRef.current) return;
        acceptedRef.current = true;
        unsubRef.current?.();
        unsubRef.current = null;
        setIsProcessing(false);
        onPay(paymentId);
    };

    const handlePayClick = async () => {
        audio.unlock();
        if (!profile?.name || !profile?.phone) {
            setError("Sign in before paying.");
            return;
        }

        setIsProcessing(true);
        setElapsed(0);
        setTimedOut(false);
        setError("");
        acceptedRef.current = false;

        try {
            const phone254 = profile.phone.replace(/^0/, "254");
            const res = await fetch(DEPOSIT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: profile.name,
                    phone: phone254,
                    amount: 20,
                    trigger: "R1R2",
                    game: "SUMTEN",
                }),
            }).then(response => response.json());

            if (!res.paymentId) throw new Error(res.error || "Payment failed");
            paymentIdRef.current = res.paymentId;

            unsubRef.current = onSnapshot(doc(getFirestore(), "payments", res.paymentId), snapshot => {
                const data = snapshot.data();
                if (data?.trans_id || data?.status === "paid") handleConfirmed(res.paymentId);
                if (data?.status === "failed") {
                    setError(data.resultDesc || "Payment failed. Try again.");
                    setIsProcessing(false);
                    unsubRef.current?.();
                    unsubRef.current = null;
                }
            }, () => {});

            window.setTimeout(() => {
                if (!acceptedRef.current) {
                    setTimedOut(true);
                    setIsProcessing(false);
                }
            }, TIMEOUT_S * 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Payment failed");
            setIsProcessing(false);
        }
    };

    const progress = Math.min((elapsed / TIMEOUT_S) * 100, 100);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="sum-payment-modal-overlay">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="sum-payment-modal-backdrop"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="sum-payment-modal-content"
                    >
                        <div className="sum-payment-icon-wrapper">
                            <div className="sum-payment-icon-container">
                                <CreditCard className="sum-payment-icon" strokeWidth={2} />
                            </div>
                        </div>

                        <h2 className="sum-payment-title">SumTen Entry</h2>

                        <p className="sum-payment-message">
                            Hi <span className="sum-payment-bold">{profile?.name || "Player"}</span>! Pay <span className="sum-payment-bold">KES 20</span> via M-Pesa to play.
                        </p>

                        <div className="sum-payment-prompt">
                            <p className="sum-payment-prompt-label">M-Pesa prompt will be sent to</p>
                            <p className="sum-payment-prompt-number">{profile?.phone || "..."}</p>
                        </div>

                        {error && <p className="sum-payment-error">{error}</p>}

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
                                        {timedOut ? "WAITING..." : `CHECK PHONE ${Math.max(TIMEOUT_S - elapsed, 0)}s`}
                                    </>
                                ) : (
                                    "PAY"
                                )}
                            </button>
                        </div>

                        {isProcessing && (
                            <div className="sum-payment-progress" aria-hidden="true">
                                <span style={{ width: `${progress}%` }} />
                            </div>
                        )}

                        <div className="sum-payment-footer">
                            <Info className="sum-payment-footer-icon" />
                            <p>{timedOut ? "Still waiting. You will enter once payment confirms." : "Secure payment via M-Pesa"}</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
