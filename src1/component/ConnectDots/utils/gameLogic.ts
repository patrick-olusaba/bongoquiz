import type {LevelData, LevelNode, Point} from '../types';

export function isAdjacent(p1: Point, p2: Point, level?: LevelData): boolean {
  if (Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c) !== 1) return false;
  
  if (level?.blockedWalls) {
    const wallA = `${p1.r},${p1.c}-${p2.r},${p2.c}`;
    const wallB = `${p2.r},${p2.c}-${p1.r},${p1.c}`;
    if (level.blockedWalls.includes(wallA) || level.blockedWalls.includes(wallB)) {
      return false;
    }
  }
  return true;
}

export function pointsEqual(p1: Point, p2: Point): boolean {
  return p1.r === p2.r && p1.c === p2.c;
}

export function getExpectedNextNumber(path: Point[], nodes: LevelNode[]): number {
  if (path.length === 0) return 1;
  const visitedNumbers: number[] = [];
  
  for (const p of path) {
    const node = nodes.find(n => pointsEqual(n, p));
    if (node) {
      visitedNumbers.push(node.num);
    }
  }

  if (visitedNumbers.length === 0) return 1;
  
  // They must be visited in order, so the last visited number + 1 is the target
  const maxVisited = visitedNumbers[visitedNumbers.length - 1];
  return maxVisited + 1;
}

// Checks if path represents a fully solved level
export function isLevelSolved(path: Point[], level: LevelData): boolean {
  const totalCells = level.rows * level.cols;
  if (path.length !== totalCells) return false;

  const visitedNumbers = path
    .map(p => level.nodes.find(n => pointsEqual(n, p))?.num)
    .filter(Boolean) as number[];

  if (visitedNumbers.length !== level.nodes.length) return false;

  // Check if they are in correct order
  for (let i = 0; i < visitedNumbers.length; i++) {
    if (visitedNumbers[i] !== i + 1) return false;
  }

  return true;
}
