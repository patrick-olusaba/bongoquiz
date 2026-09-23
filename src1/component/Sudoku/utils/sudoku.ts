import type {Board} from '../types';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

const getGridSize = (difficulty: Difficulty) => difficulty === 'Easy' ? 6 : 9;
const getBlockSize = (difficulty: Difficulty) => difficulty === 'Easy' ? { r: 2, c: 3 } : { r: 3, c: 3 };

const isValid = (b: (number | null)[][], r: number, c: number, num: number, size: number, blockR: number, blockC: number) => {
  for (let i = 0; i < size; i++) {
    if (b[r][i] === num) return false;
    if (b[i][c] === num) return false;
  }
  const br = Math.floor(r / blockR) * blockR;
  const bc = Math.floor(c / blockC) * blockC;
  for (let i = 0; i < blockR; i++) {
    for (let j = 0; j < blockC; j++) {
      if (b[br + i][bc + j] === num) return false;
    }
  }
  return true;
};

const solveHelper = (b: (number | null)[][], size: number, blockR: number, blockC: number, randomize = false): boolean => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (b[r][c] === null) {
        const nums = Array.from({ length: size }, (_, i) => i + 1);
        if (randomize) {
          for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
          }
        }
        for (const num of nums) {
          if (isValid(b, r, c, num, size, blockR, blockC)) {
            b[r][c] = num;
            if (solveHelper(b, size, blockR, blockC, randomize)) return true;
            b[r][c] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
};

const countSolutions = (b: (number | null)[][], size: number, blockR: number, blockC: number, count = { val: 0 }) => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (b[r][c] === null) {
        for (let num = 1; num <= size; num++) {
          if (isValid(b, r, c, num, size, blockR, blockC)) {
            b[r][c] = num;
            countSolutions(b, size, blockR, blockC, count);
            b[r][c] = null;
            if (count.val > 1) return;
          }
        }
        return;
      }
    }
  }
  count.val++;
};

export const generatePuzzle = (difficulty: Difficulty): Board => {
  const size = getGridSize(difficulty);
  const { r: blockR, c: blockC } = getBlockSize(difficulty);
  const b: (number | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  
  // Generate a full board
  solveHelper(b, size, blockR, blockC, true);
  
  // Determine how many cells to remove
  let cellsToRemove = 0;
  switch (difficulty) {
    case 'Easy': cellsToRemove = 14 + Math.floor(Math.random() * 3); break; // 14-16 out of 36
    case 'Medium': cellsToRemove = 40 + Math.floor(Math.random() * 5); break; // 40-44 out of 81
    case 'Hard': cellsToRemove = 50 + Math.floor(Math.random() * 5); break; // 50-54 out of 81
  }

  const positions = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      positions.push({ r, c });
    }
  }
  
  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let removed = 0;
  for (const pos of positions) {
    if (removed >= cellsToRemove) break;
    
    const { r, c } = pos;
    const temp = b[r][c];
    b[r][c] = null;
    
    const count = { val: 0 };
    countSolutions(b, size, blockR, blockC, count);
    
    if (count.val === 1) {
      removed++;
    } else {
      b[r][c] = temp; // Put it back if it leads to multiple solutions
    }
  }

  return b.map(row => 
    row.map(val => ({
      value: val,
      isFixed: val !== null,
      notes: []
    }))
  );
};

export const solveBoard = (board: Board, difficulty: Difficulty): Board | null => {
  const size = getGridSize(difficulty);
  const { r: blockR, c: blockC } = getBlockSize(difficulty);
  const b = board.map(row => row.map(cell => cell.value));
  if (solveHelper(b, size, blockR, blockC)) {
    return b.map((row, r) => 
      row.map((val, c) => ({
        value: val,
        isFixed: board[r][c].isFixed,
        notes: [...board[r][c].notes]
      }))
    );
  }
  return null;
};
