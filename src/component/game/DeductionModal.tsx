// DeductionModal.tsx — shown before round starts, requires player to accept deduction
import { type FC, useState, useEffect, useRef } from "react";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import '../../styles/DeductionModal.css';

interface Props {
    amount:      number;
    roundLabel:  string;
    phone:       string;
    playerName:  string;
    onAccept:    () => void;
    onDecline:   () => void;
}

const TIMEOUT_S = 60;

export const DeductionModal: FC<Props> = ({ amount, roundLabel, phone, playerName, onAccept, onDecline }) => {
    const [loading,   setLoading]   = useState(false);
    const [timedOut,  setTimedOut]  = useState(false);
    const [elapsed,   setElapsed]   = useState(0);
    const unsubRef    = useRef<(() => void) | null>(null);
    const acceptedRef = useRef(false);

    const handleConfirmed = () => {
        if (acceptedRef.current) return;
        acceptedRef.current = true;
        unsubRef.current?.();
        onAccept();
    };

    useEffect(() => {
        if (!loading) return;
        const t = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [loading]);

    const handleAccept = async () => {
        setLoading(true);
        setElapsed(0);
        setTimedOut(false);
        try {
            const phone254 = phone.replace(/^0/, "254");
            const trigger  = roundLabel === "Rounds 1 & 2" ? "R1R2" : "R3";
            const round    = roundLabel === "Rounds 1 & 2" ? "r1"   : "r3";

            const [fbResponse] = await Promise.allSettled([
                fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/deposit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: playerName, phone: phone254, amount, trigger }),
                }).then(r => r.json()),
                fetch("http://143.244.158.85:3535/api/pay/initiate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: phone254, amount, round }),
                }).catch(() => {}),
            ]);

            if (fbResponse.status !== "fulfilled") throw new Error("Payment initiation failed");
            const result = fbResponse.value;
            if (!result.paymentId) throw new Error(result.error || "");

            const db = getFirestore();
            unsubRef.current = onSnapshot(doc(db, "payments", result.paymentId), (snap) => {
                if (snap.data()?.trans_id) handleConfirmed();
            }, () => {});

            setTimeout(() => {
                if (!acceptedRef.current) { setTimedOut(true); setLoading(false); }
            }, TIMEOUT_S * 1000);

        } catch {
            setLoading(false);
        }
    };

    const isWaiting  = loading || timedOut;
    const progress   = Math.min((elapsed / TIMEOUT_S) * 100, 100);
    const statusMsg  = timedOut
        ? "Still waiting — you'll enter automatically once confirmed."
        : elapsed > 10
            ? "Check your phone for the M-Pesa prompt…"
            : "Waiting for M-Pesa confirmation…";

    return (
        <div className="ded-overlay">
            <div className="ded-modal">

                <div className="ded-icon-wrap">
                    <span className="ded-icon">💸</span>
                    <span className="ded-coin">🪙</span>
                    <span className="ded-coin">🪙</span>
                    <span className="ded-coin">🪙</span>
                    <span className="ded-coin">🪙</span>
                </div>

                <div className="ded-badge">💳 Entry Fee</div>
                <h2 className="ded-title">KSh {amount}</h2>
                <p className="ded-desc">
                    Playing <strong>{roundLabel}</strong> requires an entry fee of <strong>KSh {amount}</strong>.
                </p>

                {phone && (
                    <div className="ded-phone-row">
                        📱 M-Pesa prompt will be sent to <strong>&nbsp;{phone}</strong>
                    </div>
                )}

                <div className="ded-divider" />

                {!isWaiting ? (
                    <div className="ded-actions">
                        <button className="ded-btn ded-btn--decline" onClick={onDecline}>✕ Decline</button>
                        <button className="ded-btn ded-btn--accept" onClick={handleAccept}>🎯 Pay &amp; Play</button>
                    </div>
                ) : (
                    <div className="ded-waiting">
                        <div className="ded-spinner">
                            <svg viewBox="0 0 40 40" className="ded-spinner-svg">
                                <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"/>
                                <circle cx="20" cy="20" r="17" fill="none" stroke="#38ef7d" strokeWidth="3"
                                    strokeDasharray={`${progress * 1.068} 106.8`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 20 20)"
                                    style={{ transition: "stroke-dasharray 1s linear" }}
                                />
                            </svg>
                            <div className="ded-spinner-inner">
                                <span className="ded-spinner-icon">📱</span>
                                <span className="ded-spinner-secs">{TIMEOUT_S - elapsed}s</span>
                            </div>
                        </div>
                        <p className={`ded-status-msg${timedOut ? " ded-status-msg--warn" : ""}`}>{statusMsg}</p>
                    </div>
                )}

                <p className="ded-note">⚠️ By accepting you agree to the KSh {amount} deduction</p>
            </div>
        </div>
    );
};
