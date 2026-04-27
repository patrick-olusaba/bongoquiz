// DeductionModal.tsx — shown before round starts, requires player to accept deduction
import { type FC, useState } from "react";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import '../../styles/DeductionModal.css';

interface Props {
    amount:      number;
    roundLabel:  string;
    phone:       string;       // player phone from localStorage — used for STK push
    playerName:  string;
    onAccept:    () => void;
    onDecline:   () => void;
}

export const DeductionModal: FC<Props> = ({ amount, roundLabel, phone, playerName, onAccept, onDecline }) => {
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        setLoading(true);
        try {
            const phone254 = phone.replace(/^0/, "254");
            const trigger = roundLabel === "Rounds 1 & 2" ? "R1R2" : "R3";
            const payload = {
                name: playerName,
                phone: phone254,
                amount,
                trigger
            };
            // console.log("Sending payment data:", payload);
            
            const response = await fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/deposit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            // console.log("Payment response:", result);
            
            if (!response.ok) {
                throw new Error(result.error || "");
            }
            
            // Poll Firestore to check if payment is confirmed
            const db = getFirestore();
            const paymentRef = doc(db, "payments", result.paymentId);
            
            // console.log("Listening to payment doc:", result.paymentId);
            
            const unsubscribe = onSnapshot(paymentRef, (snapshot) => {
                const data = snapshot.data();
                // console.log("Payment snapshot update:", data);
                
                if (data?.trans_id) {
                    // console.log("Payment confirmed with trans_id:", data.trans_id);
                    unsubscribe();
                    onAccept();
                }
            }, () => {
                // console.error("Snapshot error:", error);
            });
            
            // Timeout after 60 seconds
            setTimeout(() => {
                unsubscribe();
                setLoading(false);
                // alert("Payment timeout. Please try again.");
            }, 60000);
            
        } catch (error) {
            // console.error("Payment failed:", error);
            // alert(`Payment failed: ${error.message}`);
            setLoading(false);
        }
    };

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
                    <button className="ded-btn ded-btn--decline" onClick={onDecline} disabled={loading}>
                        ✕ Decline
                    </button>
                    <button className="ded-btn ded-btn--accept" onClick={handleAccept} disabled={loading}>
                        ✓ Accept &amp; Play
                    </button>
                </div>

                {loading && (
                    <div style={{ textAlign: "center", marginTop: 12 }}>
                        <div style={{ display: "inline-block", width: 20, height: 20, border: "3px solid #f3f3f3", borderTop: "3px solid #7B61FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        <p style={{ fontSize: "0.85rem", color: "#666", marginTop: 8 }}>Waiting for payment confirmation...</p>
                    </div>
                )}

                <p className="ded-note">⚠️ By accepting you agree to the deduction</p>
            </div>
        </div>
    );
};
