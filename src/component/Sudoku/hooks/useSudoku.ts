import { useState, useEffect, useCallback, useRef } from 'react';
import type {Board} from '../types';
import {type Difficulty, generatePuzzle, solveBoard } from '../utils/sudoku';
import { soundEngine } from '../utils/sound';
import { getFunctions, httpsCallable } from 'firebase/functions';

const STAGES_PER_LEVEL = {
  Easy: 3,
  Medium: 6,
  Hard: 10
};

const POINTS_PER_STAGE: Record<Difficulty, number> = {
  Easy: 100,
  Medium: 200,
  Hard: 400
};

type SudokuUser = {
  name?: string;
  phone?: string;
};

type SaveSudokuScorePayload = {
  name: string;
  phone: string;
  score: number;
  difficulty: string;
  stage: number;
  hintsUsed: number;
};

const normalizePhoneForSudokuScore = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (/^254\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^0\d{9}$/.test(digits)) return digits;
  return digits;
};

const getSavedSudokuUser = (): SudokuUser | null => {
  const userStr = localStorage.getItem('sudoku_user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as SudokuUser;
  } catch {
    return null;
  }
};

export const useSudoku = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [stage, setStage] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<Difficulty[]>(['Easy']);
  const [score, setScore] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  const [board, setBoard] = useState<Board>(() => generatePuzzle('Easy'));
  const [history, setHistory] = useState<Board[]>([]);
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [solution, setSolution] = useState<Board | null>(() => solveBoard(board, 'Easy'));
  const [hintedCell, setHintedCell] = useState<{r: number, c: number} | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const puzzleSessionRef = useRef(0);
  const savedPuzzleSessionsRef = useRef<Set<number>>(new Set());

  const startNewGame = useCallback((newDifficulty: Difficulty, newStage: number = 1) => {
    puzzleSessionRef.current += 1;
    setDifficulty(newDifficulty);
    setStage(newStage);
    const newBoard = generatePuzzle(newDifficulty);
    setBoard(newBoard);
    setSolution(solveBoard(newBoard, newDifficulty));
    setHistory([]);
    setSelected(null);
    setHintedCell(null);
    setHintsUsed(0);
  }, []);

  const replayGame = useCallback(() => {
    puzzleSessionRef.current += 1;
    setBoard(prev => prev.map(row => row.map(cell => ({
      ...cell,
      value: cell.isFixed ? cell.value : null,
      notes: []
    }))));
    setHistory([]);
    setSelected(null);
    setHintedCell(null);
  }, []);

  const nextStage = useCallback(() => {
    const points = POINTS_PER_STAGE[difficulty];
    setScore(prev => prev + points);

    const maxStages = STAGES_PER_LEVEL[difficulty];
    if (stage < maxStages) {
      startNewGame(difficulty, stage + 1);
    } else {
      let nextDiff: Difficulty = 'Easy';
      if (difficulty === 'Easy') nextDiff = 'Medium';
      else if (difficulty === 'Medium') nextDiff = 'Hard';
      else nextDiff = 'Hard';

      setUnlockedLevels(prev => {
        if (!prev.includes(nextDiff)) return [...prev, nextDiff];
        return prev;
      });

      startNewGame(nextDiff, 1);
    }
  }, [difficulty, stage, startNewGame]);

  const handleInput = useCallback((num: number) => {
    if (!selected) return;
    const { r, c } = selected;
    if (board[r][c].isFixed) return;

    setHistory(prev => [...prev, board]);

    const newBoard = board.map(row => row.map(cell => ({ ...cell })));

    if (newBoard[r][c].value === num) {
      newBoard[r][c].value = null;
      soundEngine.playErase();
    } else {
      newBoard[r][c].value = num;
      // Check if this new value causes a conflict
      const hasConflictNow = () => {
        const val = num;
        const size = newBoard.length;
        for (let i = 0; i < size; i++) {
          if (i !== c && newBoard[r][i].value === val) return true;
          if (i !== r && newBoard[i][c].value === val) return true;
        }
        const blockR = size === 6 ? 2 : 3;
        const blockC = 3;
        const br = Math.floor(r / blockR) * blockR;
        const bc = Math.floor(c / blockC) * blockC;
        for (let i = 0; i < blockR; i++) {
          for (let j = 0; j < blockC; j++) {
            const rr = br + i;
            const cc = bc + j;
            if ((rr !== r || cc !== c) && newBoard[rr][cc].value === val) return true;
          }
        }
        return false;
      };

      if (hasConflictNow()) {
        soundEngine.playError();
      } else {
        soundEngine.playClick();
      }
    }
    setBoard(newBoard);
  }, [selected, board]);

  const handleErase = useCallback(() => {
    if (!selected) return;
    const { r, c } = selected;
    if (board[r][c].isFixed) return;

    setHistory(prev => [...prev, board]);

    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    if (newBoard[r][c].value !== null) {
      soundEngine.playErase();
    }
    newBoard[r][c].value = null;
    setBoard(newBoard);
  }, [selected, board]);

  const handleHint = useCallback(() => {
    if (!solution) return;
    if (score < 20) {
      soundEngine.playError();
      return;
    }
    const size = board.length;

    const triggerHintHighlight = (r: number, c: number) => {
      setHintedCell({ r, c });
      soundEngine.playHint();
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => setHintedCell(null), 1500);
    };

    if (selected) {
      const { r, c } = selected;
      if (!board[r][c].isFixed && board[r][c].value !== solution[r][c].value) {
        setHistory(prev => [...prev, board]);
        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        newBoard[r][c].value = solution[r][c].value;
        setBoard(newBoard);
        setScore(prev => {
          const newScore = prev - 20;
          if (newScore > (parseInt(localStorage.getItem('sudoku_high_score') || '0', 10))) {
            localStorage.setItem('sudoku_high_score', newScore.toString());
          }
          return newScore;
        });
        setHintsUsed(prev => prev + 1);
        triggerHintHighlight(r, c);
        return;
      }
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board[r][c].isFixed && board[r][c].value !== solution[r][c].value) {
          setHistory(prev => [...prev, board]);
          const newBoard = board.map(row => row.map(cell => ({ ...cell })));
          newBoard[r][c].value = solution[r][c].value;
          setBoard(newBoard);
          setSelected({ r, c });
          setScore(prev => {
            const newScore = prev - 20;
            if (newScore > (parseInt(localStorage.getItem('sudoku_high_score') || '0', 10))) {
              localStorage.setItem('sudoku_high_score', newScore.toString());
            }
            return newScore;
          });
          setHintsUsed(prev => prev + 1);
          triggerHintHighlight(r, c);
          return;
        }
      }
    }
  }, [board, selected, solution, score]);

  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const prevBoard = history[history.length - 1];
      setBoard(prevBoard);
      setHistory(prev => prev.slice(0, -1));
      soundEngine.playErase();
    }
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const size = board.length;
      if (size === 6 && e.key >= '1' && e.key <= '6') {
        handleInput(parseInt(e.key));
      } else if (size === 9 && e.key >= '1' && e.key <= '9') {
        handleInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase();
      } else if (e.key === 'ArrowUp') {
        setSelected(prev => prev ? { r: Math.max(0, prev.r - 1), c: prev.c } : { r: size - 1, c: 0 });
      } else if (e.key === 'ArrowDown') {
        setSelected(prev => prev ? { r: Math.min(size - 1, prev.r + 1), c: prev.c } : { r: 0, c: 0 });
      } else if (e.key === 'ArrowLeft') {
        setSelected(prev => prev ? { r: prev.r, c: Math.max(0, prev.c - 1) } : { r: 0, c: size - 1 });
      } else if (e.key === 'ArrowRight') {
        setSelected(prev => prev ? { r: prev.r, c: Math.min(size - 1, prev.c + 1) } : { r: 0, c: 0 });
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, handleErase, handleUndo, board.length]);

  const hasConflict = (r: number, c: number) => {
    if (!board[r] || !board[r][c]) return false;
    const val = board[r][c].value;
    if (!val) return false;

    const size = board.length;
    for (let i = 0; i < size; i++) {
      if (i !== c && board[r][i].value === val) return true;
      if (i !== r && board[i][c].value === val) return true;
    }

    const blockR = size === 6 ? 2 : 3;
    const blockC = 3;
    const br = Math.floor(r / blockR) * blockR;
    const bc = Math.floor(c / blockC) * blockC;
    for (let i = 0; i < blockR; i++) {
      for (let j = 0; j < blockC; j++) {
        const rr = br + i;
        const cc = bc + j;
        if ((rr !== r || cc !== c) && board[rr][cc].value === val) return true;
      }
    }

    return false;
  };

  const isRelated = (r: number, c: number) => {
    if (!selected) return false;
    if (selected.r === r && selected.c === c) return false;
    const sameRow = selected.r === r;
    const sameCol = selected.c === c;

    const size = board.length;
    const blockR = size === 6 ? 2 : 3;
    const blockC = 3;
    const sameBlock = Math.floor(selected.r / blockR) === Math.floor(r / blockR) && Math.floor(selected.c / blockC) === Math.floor(c / blockC);
    return sameRow || sameCol || sameBlock;
  };

  const isSameValue = (r: number, c: number) => {
    if (!selected || !board[selected.r] || !board[selected.r][selected.c]) return false;
    const selectedValue = board[selected.r][selected.c].value;
    if (!selectedValue) return false;
    return board[r][c].value === selectedValue && !(selected.r === r && selected.c === c);
  };

  const isIncorrect = useCallback((r: number, c: number) => {
    if (!solution || !board[r] || !board[r][c]) return false;
    const cell = board[r][c];
    if (cell.isFixed || cell.value === null) return false;
    return cell.value !== solution[r][c].value;
  }, [board, solution]);

  const isComplete = solution && board.length > 0 && board.every((row, r) => row.every((cell, c) => cell.value === solution[r][c].value));

  const updateLocalLeaderboard = useCallback((savedScore: number) => {
    const user = getSavedSudokuUser();
    if (!user?.name || !user?.phone) return;

    try {
      const lbStr = localStorage.getItem('sudoku_leaderboard');
      const lb: { name: string, phone: string, score: number, date: string }[] = lbStr ? JSON.parse(lbStr) : [];
      const userIdx = lb.findIndex(p => p.name === user.name && p.phone === user.phone);

      const highScore = Math.max(savedScore, parseInt(localStorage.getItem('sudoku_high_score') || '0', 10));
      localStorage.setItem('sudoku_high_score', highScore.toString());

      if (userIdx !== -1) {
        lb[userIdx].score = Math.max(lb[userIdx].score, savedScore);
        lb[userIdx].date = new Date().toLocaleDateString();
      } else {
        lb.push({
          name: user.name,
          phone: user.phone,
          score: savedScore,
          date: new Date().toLocaleDateString()
        });
      }
      localStorage.setItem('sudoku_leaderboard', JSON.stringify(lb));
    } catch (e) {
      console.error("Failed to update local Sudoku leaderboard", e);
    }
  }, []);

  useEffect(() => {
    updateLocalLeaderboard(score);
  }, [score, updateLocalLeaderboard]);

  useEffect(() => {
    if (!isComplete) return;

    const puzzleSessionId = puzzleSessionRef.current;
    if (savedPuzzleSessionsRef.current.has(puzzleSessionId)) return;

    const user = getSavedSudokuUser();
    if (!user?.name || !user?.phone) return;

    const phone = normalizePhoneForSudokuScore(user.phone);
    if (!/^0\d{9}$/.test(phone)) {
      console.error('Sudoku score save skipped: invalid phone', user.phone);
      return;
    }

    const completedScore = score + POINTS_PER_STAGE[difficulty];
    savedPuzzleSessionsRef.current.add(puzzleSessionId);
    updateLocalLeaderboard(completedScore);

    const saveSudokuScore = httpsCallable<SaveSudokuScorePayload, { success: boolean }>(
      getFunctions(),
      'saveSudokuScore'
    );

    saveSudokuScore({
      name: user.name,
      phone,
      score: completedScore,
      difficulty,
      stage,
      hintsUsed
    }).catch(e => {
      savedPuzzleSessionsRef.current.delete(puzzleSessionId);
      console.error('saveSudokuScore failed', e);
    });
  }, [difficulty, hintsUsed, isComplete, score, stage, updateLocalLeaderboard]);

  return {
    board,
    selected,
    setSelected,
    solution,
    difficulty,
    stage,
    unlockedLevels,
    score,
    startNewGame,
    replayGame,
    nextStage,
    handleInput,
    handleErase,
    handleHint,
    handleUndo,
    canUndo: history.length > 0,
    hasConflict,
    isIncorrect,
    isRelated,
    isSameValue,
    isComplete,
    hintedCell
  };
};
