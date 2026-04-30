import { type FC, useState, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import '../style/deduction.css';

interface Props {
  amount: number;
  onAccept: () => void;
  onDecline: () => void;
}

const TIMEOUT_S = 60;

export const DeductionModal: FC<Props> = ({ amount, onAccept, onDecline }) => {
  const phone    = localStorage.getItem("bongo_player_phone") ?? "";
  const name     = localStorage.getItem("bongo_player_name")  ?? "Player";
  const [loading,  setLoading]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const acceptedRef = useRef(false);
  const unsubRef    = useRef<(() => void) | null>(null);

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
    setLoading(true); setElapsed(0); setTimedOut(false);
    try {
      const phone254 = phone.replace(/^0/, "254");
      const res = await fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/bibleQuizDeposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone254, amount }),
      }).then(r => r.json());

      if (!res.paymentId) throw new Error(res.error || "Payment failed");

      const db = getFirestore();
      unsubRef.current = onSnapshot(doc(db, "bibleQuizPayments", res.paymentId), snap => {
        if (snap.data()?.trans_id || snap.data()?.status === "paid") handleConfirmed();
      }, () => {});

      setTimeout(() => {
        if (!acceptedRef.current) { setTimedOut(true); setLoading(false); }
      }, TIMEOUT_S * 1000);
    } catch {
      setLoading(false);
    }
  };

  const progress  = Math.min((elapsed / TIMEOUT_S) * 100, 100);
  const statusMsg = timedOut
    ? "Still waiting — you'll enter once confirmed."
    : elapsed > 10 ? "Check your phone for the M-Pesa prompt…"
    : "Waiting for M-Pesa confirmation…";

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

        <div className="ded-badge"><span className="ded-badge-dot" />Entry Fee</div>
        <h2 className="ded-title">Bible Quiz</h2>
        <span className="ded-amount-big">KSh {amount}</span>

        <p className="ded-desc">An M-Pesa prompt will be sent to your phone to unlock the game.</p>

        {phone && <div className="ded-phone-row">📱 <strong>{phone}</strong></div>}

        <div className="ded-divider" />

        {!loading && !timedOut ? (
          <div className="ded-actions">
            <button className="ded-btn ded-btn--decline" onClick={onDecline}>✕ Decline</button>
            <button className="ded-btn ded-btn--accept" onClick={handleAccept}>✓ Accept &amp; Play</button>
          </div>
        ) : (
          <div className="ded-waiting">
            <div className="ded-spinner">
              <svg viewBox="0 0 40 40" className="ded-spinner-svg">
                <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"/>
                <circle cx="20" cy="20" r="17" fill="none" stroke="#38ef7d" strokeWidth="3"
                  strokeDasharray={`${progress * 1.068} 106.8`} strokeLinecap="round"
                  transform="rotate(-90 20 20)" style={{ transition: "stroke-dasharray 1s linear" }}/>
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
