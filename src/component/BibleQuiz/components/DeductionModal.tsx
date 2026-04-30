import { type FC } from 'react';
import '../style/deduction.css';

interface Props {
  amount: number;
  onAccept: () => void;
  onDecline: () => void;
}

export const DeductionModal: FC<Props> = ({ amount, onAccept, onDecline }) => {
  const phone = localStorage.getItem("bible_player_phone") ?? "";

  return (
    <div className="ded-overlay">
      <div className="ded-modal">
        <div className="ded-icon-wrap">
          <span className="ded-icon">💸</span>
          <div className="ded-coins">
            <span className="ded-coin">🪙</span>
            <span className="ded-coin">🪙</span>
            <span className="ded-coin">🪙</span>
          </div>
        </div>

        <div className="ded-badge">
          <span className="ded-badge-dot" />
          Entry Fee
        </div>

        <h2 className="ded-title">Bible Quiz</h2>
        <span className="ded-amount-big">KSh {amount}</span>

        <p className="ded-desc">
          An M-Pesa prompt will be sent to your phone to unlock the game.
        </p>

        {phone && (
          <div className="ded-phone-row">
            📱 <strong>{phone}</strong>
          </div>
        )}

        <div className="ded-divider" />

        <div className="ded-actions">
          <button className="ded-btn ded-btn--decline" onClick={onDecline}>✕ Decline</button>
          <button className="ded-btn ded-btn--accept" onClick={onAccept}>✓ Accept &amp; Play</button>
        </div>
        <p className="ded-note">⚠️ By accepting you agree to the KSh {amount} deduction</p>
      </div>
    </div>
  );
};
