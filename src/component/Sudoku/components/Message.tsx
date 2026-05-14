import React from 'react';
import type {Difficulty} from '../utils/sudoku';

type MessageProps = {
  isComplete: boolean;
  difficulty: Difficulty;
  stage: number;
};

export const Message: React.FC<MessageProps> = ({ isComplete, difficulty, stage }) => {
  if (isComplete) {
    return (
      <div className="sudoku-message sudoku-success">
        <span className="sudoku-icon">🎉</span>
        <span className="sudoku-text">Congratulations! You solved the puzzle!</span>
      </div>
    );
  }

  return (
    <div className="sudoku-message sudoku-info">
      <span className="sudoku-icon">✏️</span>
      <span className="sudoku-text">
        {difficulty === 'Easy' && stage === 1 
          ? "Here's your first puzzle to get you started." 
          : `You are at ${difficulty} level stage ${stage}.`}
      </span>
    </div>
  );
};
