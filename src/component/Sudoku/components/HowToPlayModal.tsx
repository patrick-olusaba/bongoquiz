import React from 'react';
import { X } from 'lucide-react';

type HowToPlayModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
      <div className="sudoku-modal-overlay" onClick={onClose}>
        <div className="sudoku-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="sudoku-modal-header">
            <h2>How to Play</h2>
            <button
                onClick={onClose}
                className="sudoku-icon-btn"
            >
              <X size={20} />
            </button>
          </div>
          <div className="sudoku-modal-body">
            <p>Fill the grid so that every row, column, and box contains all digits without repeating.</p>

            <h3 className="sudoku-modal-section-title">Scoring & Progression</h3>
            <ul>
              <li><strong>Easy (6x6):</strong> +100 points per stage</li>
              <li><strong>Medium (9x9):</strong> +200 points per stage</li>
              <li><strong>Hard (9x9):</strong> +400 points per stage</li>
              <li><strong>Hint:</strong> Costs 20 points</li>
            </ul>

            <h3 className="sudoku-modal-section-title">Controls</h3>
            <ul>
              <li>Tap a cell to select it.</li>
              <li>Use the number pad to fill in a number.</li>
              <li>Use <strong>Hint</strong> if you get stuck!</li>
            </ul>
          </div>
          <button
              onClick={onClose}
              className="sudoku-modal-btn"
          >
            Got it!
          </button>
        </div>
      </div>
  );
};
