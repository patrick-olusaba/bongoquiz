export type Cell = {
  value: number | null;
  isFixed: boolean;
  notes: number[];
};

export type Board = Cell[][];
