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

export const DeductionModal: FC<Props> = ({ amount, roundLabel, phone, playerName, onAccept, onDecline }) => {
    const [loading,  setLoading]  = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    const [elapsed,  setElapsed]  = useState(0);
    const unsubRef   = useRef<(() => void) | null>(null);
    const acceptedRef = useRef(false);

    // Keep listening even after timeout — if payment arrives, still proceed
    const handleConfirmed = () => {
        if (acceptedRef.current) return;
        acceptedRef.current = true;
        unsubRef.current?.();
        onAccept();
    };

    // Elapsed counter while loading
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

            // Listen indefinitely — unsubscribe only on confirmation
            const db = getFirestore();
            const paymentRef = doc(db, "payments", result.paymentId);
            unsubRef.current = onSnapshot(paymentRef, (snapshot) => {
                if (snapshot.data()?.trans_id) handleConfirmed();
            }, () => {});

            // After 60s show "still waiting" UI but keep the listener alive
            setTimeout(() => {
                if (!acceptedRef.current) {
                    setTimedOut(true);
                    setLoading(false);
                }
            }, 60000);

        } catch {
            setLoading(false);
        }
    };

    const statusMsg = timedOut
        ? "Still waiting for M-Pesa confirmation…"
        : elapsed > 10
            ? "This is taking a moment — please check your phone…"
            : "Waiting for payment confirmation…";

    const isWaiting = loading || timedOut;

    return (
        <div className="ded-overlay">
            <div className="ded-modal">
                <div className="ded-icon">💸</div>
                <div className="ded-badge">Entry Fee</div>
                <h2 className="ded-title">KSh {amount} Deduction</h2>
                <p className="ded-desc">
                    Playing <strong>{roundLabel}</strong> requires an entry fee of{" "}
                    <strong className="ded-amount">KSh {amount}</strong>.
                </p>
                {phone && (
                    <p style={{ fontSize: "0.85rem", color: "#888", margin: "0 0 12px", textAlign: "center" }}>
                        📱 M-Pesa prompt will be sent to <strong style={{ color: "#1a1a2e" }}>{phone}</strong>
                    </p>
                )}
                <div className="ded-divider" />
                <div className="ded-actions">
                    <button className="ded-btn ded-btn--decline" onClick={onDecline} disabled={isWaiting}>
                        ✕ Decline
                    </button>
                    <button className="ded-btn ded-btn--accept" onClick={handleAccept} disabled={isWaiting}>
                        ✓ Accept &amp; Play
                    </button>
                </div>

                {isWaiting && (
                    <div style={{ textAlign: "center", marginTop: 12 }}>
                        <div style={{ display: "inline-block", width: 20, height: 20, border: "3px solid #f3f3f3", borderTop: "3px solid #7B61FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        <p style={{ fontSize: "0.85rem", color: timedOut ? "#e67e22" : "#666", marginTop: 8, fontWeight: timedOut ? 600 : 400 }}>
                            {statusMsg}
                        </p>
                        {timedOut && (
                            <p style={{ fontSize: "0.78rem", color: "#888", marginTop: 4 }}>
                                You'll be taken to the game automatically once confirmed.
                            </p>
                        )}
                    </div>
                )}

                <p className="ded-note">⚠️ By accepting you agree to the deduction</p>
            </div>
        </div>
    );
};
