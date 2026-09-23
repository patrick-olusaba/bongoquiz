import { motion } from 'motion/react';
import { Trophy, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface LevelCompleteProps {
  level: number;
  gameInLevel?: number;
  totalGamesInLevel?: number;
  onNextLevel: () => void;
}

export function LevelComplete({ level, gameInLevel, totalGamesInLevel, onNextLevel }: LevelCompleteProps) {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
      <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring", bounce: 0.3 }}
          className="sum-level-complete"
      >
        <div className="sum-trophy-container">
          <Trophy className="sum-trophy-icon" />
        </div>

        <h2>Masterpiece!</h2>
        <p>
          You cleared the grid and revealed the hidden image for {gameInLevel && totalGamesInLevel && gameInLevel === totalGamesInLevel ? `Level ${level}` : `Stage ${gameInLevel} of Level ${level}`}.
        </p>

        <button
            onClick={onNextLevel}
            className="sum-next-level-btn"
        >
          <div className="sum-next-level-btn-overlay" />
          <span className="sum-next-level-btn-text">
          {gameInLevel && totalGamesInLevel && gameInLevel === totalGamesInLevel ? `Pay & Play Level ${level + 1}` : `Play Stage ${(gameInLevel || 0) + 1}`} <ArrowRight />
        </span>
        </button>
      </motion.div>
  );
}
