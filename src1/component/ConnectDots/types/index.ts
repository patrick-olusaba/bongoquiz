export type Point = {
  r: number;
  c: number;
};

export type LevelNode = Point & {
  num: number;
};

export type LevelData = {
  rows: number;
  cols: number;
  nodes: LevelNode[];
  blockedWalls?: string[];
  solutionPath?: Point[];
};
