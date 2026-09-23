import type {GridState} from '../types';

// Level configurations
export function getLevelAndGame(totalGamesCompleted: number): { level: number, gameInLevel: number, totalGamesInLevel: number } {
  let level = 1;
  let gamesInLevel = 4; // Level 1 -> 4, Level 2 -> 8, Level 3 -> 10
  let completedInLevel = totalGamesCompleted;

  while (completedInLevel >= gamesInLevel) {
    completedInLevel -= gamesInLevel;
    level++;
    gamesInLevel = 4 + level * 2;
  }

  return {
    level,
    gameInLevel: completedInLevel + 1, // 1-indexed
    totalGamesInLevel: gamesInLevel
  };
}

export const getGameConfig = (totalPuzzlesCompleted: number): { cols: number, pairs: number } => {
  const { level } = getLevelAndGame(totalPuzzlesCompleted);
  const cols = 2 + level * 2;
  return { cols, pairs: (cols * cols) / 2 };
};

export function findHint(grid: GridState, cols: number): [number, number] | null {
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === null) continue;

    const row = Math.floor(i / cols);

    // Check row line-of-sight
    for (let j = i + 1; Math.floor(j / cols) === row; j++) {
      if (grid[j] !== null) {
        if (grid[i]!.value + grid[j]!.value === 10) return [i, j];
        break; // Stop at first non-null
      }
    }

    // Check column line-of-sight
    for (let j = i + cols; j < grid.length; j += cols) {
      if (grid[j] !== null) {
        if (grid[i]!.value + grid[j]!.value === 10) return [i, j];
        break; // Stop at first non-null in column
      }
    }
  }
  return null;
}

export function hasValidMoves(grid: GridState, cols: number): boolean {
  return findHint(grid, cols) !== null;
}

export function safeShuffle(currentGrid: GridState, cols: number): GridState {
  const nonNullIndices = currentGrid
      .map((v, idx) => v !== null ? idx : null)
      .filter((idx) => idx !== null) as number[];

  const nonNullValues = nonNullIndices.map(idx => currentGrid[idx]!);
  const totalCells = currentGrid.length;

  let attempts = 0;

  while (attempts < 200) {
    // Shuffle the values
    const shuffledValues = [...nonNullValues];
    for (let i = shuffledValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledValues[i], shuffledValues[j]] = [shuffledValues[j], shuffledValues[i]];
    }

    // Put them back in the exact same slots
    const newGrid: GridState = Array(totalCells).fill(null);
    for (let i = 0; i < nonNullIndices.length; i++) {
      newGrid[nonNullIndices[i]] = shuffledValues[i];
    }

    if (hasValidMoves(newGrid, cols)) {
      return newGrid;
    }
    attempts++;
  }

  // Fallback: If random permutation fails, force a pair into a valid horizontal or vertical arrangement
  const forceGrid: GridState = Array(totalCells).fill(null);
  const tempValues = [...nonNullValues];

  // Try to find a matching pair
  let matchedIndices = [-1, -1];
  for (let i = 0; i < tempValues.length; i++) {
    for (let j = i + 1; j < tempValues.length; j++) {
      if (tempValues[i].value + tempValues[j].value === 10) {
        matchedIndices = [i, j]; break;
      }
    }
    if (matchedIndices[0] !== -1) break;
  }

  if (matchedIndices[0] !== -1) {
    const v1 = tempValues[matchedIndices[0]];
    const v2 = tempValues[matchedIndices[1]];
    tempValues.splice(matchedIndices[1], 1);
    tempValues.splice(matchedIndices[0], 1);
    tempValues.unshift(v1, v2);
  }

  // Find two slots in nonNullIndices that are in the same row or column
  let targetSlotA = 0;
  let targetSlotB = 1;
  let found = false;

  for (let i = 0; i < nonNullIndices.length; i++) {
    for (let j = i + 1; j < nonNullIndices.length; j++) {
      const idx1 = nonNullIndices[i];
      const idx2 = nonNullIndices[j];
      const r1 = Math.floor(idx1 / cols);
      const r2 = Math.floor(idx2 / cols);
      const c1 = idx1 % cols;
      const c2 = idx2 % cols;

      if (r1 === r2 || c1 === c2) {
        targetSlotA = i;
        targetSlotB = j;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    // We want the pair (originally at 0 and 1) to end up at targetSlotA and targetSlotB.
    const p1 = tempValues[0];
    const p2 = tempValues[1];

    // First, place the original items from targetSlotA and targetSlotB into 0 and 1.
    // If targetSlotA == 0 and targetSlotB == 1, no change needed.
    // To handle arbitrary swaps cleanly, we can just do a multi-way assignment if we are careful,
    // or just build a new array.

    // Simplest approach: Clone array, set manually, and gather remaining.
    const remaining = [...tempValues];
    remaining.splice(1, 1);
    remaining.splice(0, 1); // remaining now has everything except p1 and p2

    for (let i = 0; i < tempValues.length; i++) {
      if (i === targetSlotA) tempValues[i] = p1;
      else if (i === targetSlotB) tempValues[i] = p2;
      else {
        tempValues[i] = remaining.shift()!;
      }
    }

    for (let i = 0; i < nonNullIndices.length; i++) {
      forceGrid[nonNullIndices[i]] = tempValues[i];
    }
  } else {
    // Extremely rare: No two slots share a row or column!
    // We must move one to force a horizontal match with the first element.
    const firstIdx = nonNullIndices[0];
    const c = firstIdx % cols;
    // Try to place the second element to the right, or left
    let newSecondIdx = firstIdx + 1;
    if (c === cols - 1) newSecondIdx = firstIdx - 1;

    // update nonNullIndices[1]
    nonNullIndices[1] = newSecondIdx;

    for (let i = 0; i < nonNullIndices.length; i++) {
      forceGrid[nonNullIndices[i]] = tempValues[i];
    }
  }

  return forceGrid;
}
