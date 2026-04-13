// DeductionModal.tsx — shown before round starts, requires player to accept deduction
import { type FC } from "react";
import '../styles/DeductionModal.css';

interface Props {
    amount:      number;       // KSh amount to deduct
    roundLabel:  string;       // e.g. "Rounds 1 & 2" or "Round 3"
    onAccept:    () => void;
    onDecline:   () => void;
}

export const DeductionModal: FC<Props> = ({ amount, roundLabel, onAccept, onDecline }) => (
    <div className="ded-overlay">
        <div className="ded-modal">
            <div className="ded-icon">💸</div>

            <div className="ded-badge">Entry Fee</div>

            <h2 className="ded-title">KSh {amount} Deduction</h2>
            <p className="ded-desc">
                Playing <strong>{roundLabel}</strong> requires an entry fee of{" "}
                <strong className="ded-amount">KSh {amount}</strong>.
                This will be deducted from your account.
            </p>

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
