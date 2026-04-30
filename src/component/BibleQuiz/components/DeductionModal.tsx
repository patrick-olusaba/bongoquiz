import { type FC } from 'react';
import '../style/deduction.css';

interface Props {
  amount: number;
  onAccept: () => void;
  onDecline: () => void;
}

export const DeductionModal: FC<Props> = ({ amount, onAccept, onDecline }) => (
  <div className="ded-overlay">
    <div className="ded-modal">
      <div className="ded-icon">💸</div>
      <div className="ded-badge">Entry Fee</div>
      <h2 className="ded-title">KSh {amount} Deduction</h2>
      <p className="ded-desc">
        Playing <strong>Bible Quiz</strong> requires an entry fee of{' '}
        <strong className="ded-amount">KSh {amount}</strong>.
      </p>
      <div className="ded-divider" />
      <div className="ded-actions">
        <button className="ded-btn ded-btn--decline" onClick={onDecline}>✕ Decline</button>
        <button className="ded-btn ded-btn--accept" onClick={onAccept}>✓ Accept &amp; Play</button>
      </div>
      <p className="ded-note">⚠️ By accepting you agree to the deduction</p>
    </div>
  </div>
);
