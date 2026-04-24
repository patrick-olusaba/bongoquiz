// DeductionModal.tsx — shown before round starts, requires player to accept deduction
import { type FC } from "react";
import '../../styles/DeductionModal.css';

interface Props {
    amount:      number;
    roundLabel:  string;
    phone:       string;       // player phone from localStorage — used for STK push
    onAccept:    () => void;
    onDecline:   () => void;
}

export const DeductionModal: FC<Props> = ({ amount, roundLabel, phone, onAccept, onDecline }) => (
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
                <button className="ded-btn ded-btn--decline" onClick={onDecline}>
                    ✕ Decline
                </button>
                <button className="ded-btn ded-btn--accept" onClick={onAccept}>
                    ✓ Accept &amp; Play
                </button>
            </div>

            <p className="ded-note">⚠️ By accepting you agree to the deduction</p>
        </div>
    </div>
);
