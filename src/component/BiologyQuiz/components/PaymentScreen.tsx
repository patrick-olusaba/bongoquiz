import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

interface Props {
    playerName: string;
    playerPhone: string;
    onPayAndPlay: () => void;
    onCancel: () => void;
}

const TIMEOUT_S = 90;

export const PaymentScreen: React.FC<Props> = ({ playerName, playerPhone, onPayAndPlay, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [timedOut, setTimedOut] = useState(false);
    const [error, setError] = useState('');
    const acceptedRef = useRef(false);
    const unsubRef = useRef<(() => void) | null>(null);

    const handleConfirmed = () => {
        if (acceptedRef.current) return;
        acceptedRef.current = true;
        unsubRef.current?.();
        onPayAndPlay();
    };

    useEffect(() => {
        if (!loading) return;
        const t = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [loading]);

    const handlePay = async () => {
        setLoading(true); setElapsed(0); setTimedOut(false); setError('');
        try {
            const phone254 = playerPhone.replace(/^0/, '254');
            const res = await fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playerName, phone: phone254, amount: 20, trigger: 'R1R2', game: 'BIOLOGYQUIZ' }),
            }).then(r => r.json());

            if (!res.paymentId) throw new Error(res.error || 'Payment failed');

            const db = getFirestore();
            unsubRef.current = onSnapshot(doc(db, 'payments', res.paymentId), snap => {
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
    const statusMsg = timedOut
        ? "Still waiting — you'll enter once confirmed."
        : elapsed > 10 ? 'Check your phone for the M-Pesa prompt…'
        : 'Waiting for M-Pesa confirmation…';

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'linear-gradient(145deg,#1a0030,#0d001a)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💸</div>
                <div style={{ display: 'inline-block', background: 'rgba(0,220,100,0.15)', border: '1px solid rgba(0,220,100,0.3)', borderRadius: 20, padding: '3px 14px', fontSize: '0.7rem', fontWeight: 800, color: '#00DC64', letterSpacing: 2, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Entry Fee</div>
                <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900, margin: '0 0 0.25rem' }}>Biology Quiz</h2>
                <div style={{ color: '#00DC64', fontSize: '2rem', fontWeight: 900, margin: '0.25rem 0 0.75rem' }}>KSh 20</div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
                    Hi <strong style={{ color: '#fff' }}>{playerName || 'Player'}</strong>! An M-Pesa prompt will be sent to your phone.
                </p>
                {playerPhone && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '0.6rem 1rem', marginBottom: '1.25rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                        📱 <strong style={{ color: '#fff', letterSpacing: 1 }}>{playerPhone}</strong>
                    </div>
                )}
                {error && <p style={{ color: '#ff6b6b', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}

                {!loading ? (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={onCancel} style={{ flex: 1, background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 12, padding: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>✕ Cancel</button>
                        <button onClick={handlePay} style={{ flex: 1, background: 'linear-gradient(135deg,#00DC64,#00a84a)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>✓ Accept & Play</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ position: 'relative', width: 80, height: 80 }}>
                            <svg viewBox="0 0 40 40" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
                                <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                                <circle cx="20" cy="20" r="17" fill="none" stroke="#00DC64" strokeWidth="3"
                                    strokeDasharray={`${progress * 1.068} 106.8`} strokeLinecap="round"
                                    style={{ transition: 'stroke-dasharray 1s linear' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.2rem' }}>📱</span>
                                <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{TIMEOUT_S - elapsed}s</span>
                            </div>
                        </div>
                        <p style={{ color: timedOut ? '#fbbf24' : 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>{statusMsg}</p>
                    </div>
                )}
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', marginTop: '1rem' }}>⚠️ By accepting you agree to the KSh 20 deduction</p>
            </div>
        </div>
    );
};
