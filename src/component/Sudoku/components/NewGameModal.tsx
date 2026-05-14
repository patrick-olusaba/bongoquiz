import React from 'react';
import { X, Lock } from 'lucide-react';
import type {Difficulty} from '../utils/sudoku';

type NewGameModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onStart: (difficulty: Difficulty) => void;
  unlockedLevels: Difficulty[];
  score: number;
};

export const NewGameModal: React.FC<NewGameModalProps> = ({ isOpen, onClose, onStart, unlockedLevels}) => {
  if (!isOpen) return null;

  return (
      <div className="sudoku-modal-overlay" onClick={onClose}>
        <div className="sudoku-modal-content sudoku-new-game-modal" onClick={(e) => e.stopPropagation()}>
          <div className="sudoku-modal-header">
            <h2>New Game</h2>
            <button
                onClick={onClose}
                className="sudoku-icon-btn sudoku-new-game-close-btn"
            >
              <X size={20} />
            </button>
          </div>

          <div className="sudoku-modal-body">
            {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((diff) => {
              const isUnlocked = unlockedLevels.includes(diff);
              const isDisabled = !isUnlocked;
              return (
                  <button
                      key={diff}
                      onClick={() => {
                        if (!isDisabled) {
                          onStart(diff);
                          onClose();
                        }
                      }}
                      className={`sudoku-difficulty-btn ${isDisabled ? 'sudoku-locked' : 'sudoku-unlocked'}`}
                      disabled={isDisabled}
                  >
                    <div className="sudoku-difficulty-btn-content">
                      <span>{diff}</span>
                      {!isUnlocked && <Lock size={14} color="#9ca3af" />}
                    </div>
                    <span className="sudoku-desc">
                  {diff === 'Easy' ? '6x6 Grid (3 Stages)' : diff === 'Medium' ? '9x9 Grid (6 Stages)' : '9x9 Grid (10 Stages)'}
                </span>
                  </button>
              );
            })}
          </div>
        </div>
      </div>
  );
};
