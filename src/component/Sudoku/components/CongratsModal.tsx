import React from 'react';

type CongratsModalProps = {
  isOpen: boolean;
  onNext: () => void;
  onReplay: () => void;
};

export const CongratsModal: React.FC<CongratsModalProps> = ({ isOpen, onNext, onReplay }) => {
  if (!isOpen) return null;

  return (
    <div className="sudoku-modal-overlay">
      <div className="sudoku-modal-content sudoku-congrats-content">
        <div className="sudoku-congrats-icon">🎉</div>
        <h2 className="sudoku-congrats-title">
          Congratulations!
        </h2>
        <p className="sudoku-congrats-text">
          You solved the puzzle! What would you like to do next?
        </p>
        <div className="sudoku-congrats-buttons">
          <button 
            onClick={onNext}
            className="sudoku-congrats-btn-primary"
          >
            Next Stage
          </button>
          <button 
            onClick={onReplay}
            className="sudoku-congrats-btn-secondary"
          >
            Replay Stage
          </button>
        </div>
      </div>
    </div>
  );
};
