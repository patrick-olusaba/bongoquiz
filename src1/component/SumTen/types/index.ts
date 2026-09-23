export type Stage = 'playing' | 'completed' | 'gameover';
export type CellData = { id: string; value: number };
export type CellValue = CellData | null;
export type GridState = CellValue[];
