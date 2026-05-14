import { useState, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from './ProfileModal';

interface PaymentModalProps {
    userProfile: UserProfile | null;
    onClose: () => void;
    onPay: () => void;
}

const TIMEOUT_S = 90;

export function PaymentModal({ userProfile, onClose, onPay }: PaymentModalProps) {
    const [loading, setLoading]   = useState(false);
    const [elapsed, setElapsed]   = useState(0);
    const [timedOut, setTimedOut] = useState(false);
    const [error, setError]       = useState('');
    const acceptedRef = useRef(false);
    const unsubRef    = useRef<(() => void) | null>(null);

    const handleConfirmed = () => {
        if (acceptedRef.current) return;
        acceptedRef.current = true;
        unsubRef.current?.();
        onPay();
    };

    useEffect(() => {
        if (!loading) return;
        const t = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [loading]);

    const handlePay = async () => {
        if (!userProfile) return;
        setLoading(true); setElapsed(0); setTimedOut(false); setError('');
        try {
            const phone254 = userProfile.phone.replace(/^0/, '254');
            const res = await fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/sudokuDeposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: userProfile.name, phone: phone254, amount: 20, trigger: 'R1R2', game: 'SUDOKU' }),
            }).then(r => r.json());

            if (!res.paymentId) throw new Error(res.error || 'Payment failed');

            unsubRef.current = onSnapshot(doc(getFirestore(), 'sudokuPayments', res.paymentId), snap => {
                const d = snap.data();
                if (d?.trans_id || d?.status === 'paid') handleConfirmed();
            }, () => {});

            setTimeout(() => {
                if (!acceptedRef.current) { setTimedOut(true); setLoading(false); }
            }, TIMEOUT_S * 1000);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Payment failed');
            setLoading(false);
        }
    };

    const progress = Math.min((elapsed / TIMEOUT_S) * 100, 100);

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal" onClick={e => e.stopPropagation()}>
                <div className="payment-modal-icon">💸</div>
                <h2 className="payment-modal-title">Sudoku Entry</h2>
                <p className="payment-modal-text">
                    Hi <strong>{userProfile?.name || 'Player'}!</strong> Pay <strong>KES 20</strong> via M-Pesa to play.
                </p>
                <div className="payment-modal-prompt">
                    Prompt sent to <strong>{userProfile?.phone}</strong>
                </div>

                {error && <p style={{ color: '#ff6b6b', fontSize: '0.8rem', margin: '0.5rem 0' }}>{error}</p>}

                {!loading ? (
                    <div className="payment-modal-buttons">
                        <button className="payment-modal-btn payment-modal-btn-cancel" onClick={onClose}>CANCEL</button>
                        <button className="payment-modal-btn payment-modal-btn-pay" onClick={handlePay}>PAY</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}>
                        <svg viewBox="0 0 40 40" style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }}>
                            <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                            <circle cx="20" cy="20" r="17" fill="none" stroke="#4ade80" strokeWidth="3"
                                strokeDasharray={`${progress * 1.068} 106.8`} strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 1s linear' }} />
                        </svg>
                        <p style={{ color: timedOut ? '#fbbf24' : 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                            {timedOut ? "Still waiting — you'll enter once confirmed." : 'Check your phone for the M-Pesa prompt…'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
