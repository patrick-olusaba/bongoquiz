import { motion } from 'motion/react';
import { RefreshCw, Clock } from 'lucide-react';

interface GameOverProps {
  level: number;
  score: number;
  onRetry: () => void;
}

export function GameOver({ level, score, onRetry }: GameOverProps) {
  return (
      <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring", bounce: 0.3 }}
          className="sum-level-complete"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
      >
        <div className="sum-trophy-container" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
          <Clock className="sum-trophy-icon" style={{ color: '#ef4444' }} />
        </div>

        <h2 style={{ color: '#f87171' }}>Time's Up!</h2>
        <p>You reached Level {level} with {score} points.</p>

        <button
            onClick={onRetry}
            className="sum-next-level-btn"
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
        >
          <div className="sum-next-level-btn-overlay" />
          <span className="sum-next-level-btn-text">
          Try Again <RefreshCw />
        </span>
        </button>
      </motion.div>
  );
}
