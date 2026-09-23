import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import type {PanInfo} from 'motion/react';
import { safeShuffle, hasValidMoves, findHint, getLevelAndGame, getGameConfig } from '../utils/gameLogic';
import type {GridState, Stage} from '../types';
import { audio } from '../utils/audio';

export function useGame() {
  const [totalGamesCompleted, setTotalGamesCompleted] = useState(0);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<GridState>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>('playing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [mergingSlots, setMergingSlots] = useState<{ [slotIdx: number]: { id: string; value: number }[] }>({});
  const [hintIndices, setHintIndices] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [gameSeed, setGameSeed] = useState(() => Date.now());

  const [maxTime, setMaxTime] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [hoverTargetIdx, setHoverTargetIdx] = useState<number | null>(null);

  const hoveredIdxRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const currentGridRef = useRef<GridState>(grid);

  // Keep ref in sync
  useEffect(() => {
    currentGridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const { level, gameInLevel, totalGamesInLevel } = getLevelAndGame(totalGamesCompleted);
  const config = getGameConfig(totalGamesCompleted);
  const cols = config.cols;
  const rows = config.cols;

  const initLevel = (totalGames: number) => {
    const lvlConfig = getGameConfig(totalGames);
    const { cols: dim, pairs: numPairs } = lvlConfig;
    const total = dim * dim;
    const pairs = [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]];

    let idCounter = Date.now();
    const initialGrid: GridState = [];
    for (let i = 0; i < numPairs; i++) {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      initialGrid.push({ id: `cell-${totalGames}-${idCounter++}-${Math.random()}`, value: pair[0] });
      initialGrid.push({ id: `cell-${totalGames}-${idCounter++}-${Math.random()}`, value: pair[1] });
    }

    // Pad with nulls to fill the grid up to `total`
    while (initialGrid.length < total) {
      initialGrid.push(null);
    }

    // Shuffle the newly created board
    for (let i = initialGrid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [initialGrid[i], initialGrid[j]] = [initialGrid[j], initialGrid[i]];
    }

    // Ensure we start with valid moves
    const finalGrid = safeShuffle(initialGrid, dim);

    setGrid(finalGrid);
    setSelected([]);
    setStage('playing');
    setIsProcessing(false);
    setStatusText("");
    setMergingSlots({});
    setGameSeed(Date.now());

    // Time calculation (dynamic based on active pairs)
    const timeForLevel = Math.max(30, numPairs * 8 + 10);
    setMaxTime(timeForLevel);
    setTimeLeft(timeForLevel);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      initLevel(totalGamesCompleted);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalGamesCompleted]);

  useEffect(() => {
    if (stage !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStage('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, totalGamesCompleted]);

  const isValidMatch = (i1: number, i2: number): boolean => {
    const min = Math.min(i1, i2);
    const max = Math.max(i1, i2);

    const row1 = Math.floor(min / cols);
    const row2 = Math.floor(max / cols);
    const col1 = min % cols;
    const col2 = max % cols;

    // 1. Same row line-of-sight
    if (row1 === row2) {
      let isConsecutiveRow = true;
      for (let k = min + 1; k < max; k++) {
        if (currentGridRef.current[k] !== null) {
          isConsecutiveRow = false;
          break;
        }
      }
      if (isConsecutiveRow) return true;
    }

    // 2. Same column line-of-sight
    if (col1 === col2) {
      let isConsecutiveCol = true;
      for (let k = min + cols; k < max; k += cols) {
        if (currentGridRef.current[k] !== null) {
          isConsecutiveCol = false;
          break;
        }
      }
      if (isConsecutiveCol) return true;
    }

    return false;
  };

  const tryMatch = (i1: number, i2: number) => {
    if (isProcessingRef.current) return;
    if (!currentGridRef.current[i1] || !currentGridRef.current[i2]) return;

    if (currentGridRef.current[i1]!.value + currentGridRef.current[i2]!.value === 10 && isValidMatch(i1, i2)) {
      // Valid match!
      audio.playMatchSuccess();
      const c1 = currentGridRef.current[i1]!;
      const c2 = currentGridRef.current[i2]!;

      // Lock them immediately in ref to prevent double matching in same render cycle
      const newGrid = [...currentGridRef.current];
      newGrid[i1] = null;
      newGrid[i2] = null;
      currentGridRef.current = newGrid;
      setGrid(newGrid);

      setMergingSlots(prev => ({
        ...prev,
        [i2]: [...(prev[i2] || []), { id: c1.id, value: c1.value }, { id: c2.id, value: c2.value }]
      }));

      setTimeout(() => {
        setMergingSlots(prev => {
          const next = { ...prev };
          if (next[i2]) {
            next[i2] = next[i2].filter(c => c.id !== c1.id && c.id !== c2.id);
            if (next[i2].length === 0) delete next[i2];
          }
          return next;
        });
      }, 500);

      setSelected([]);
      setDragStartIdx(null);

      // Check Win Condition
      if (newGrid.every((c) => c === null)) {
        setTimeout(() => {
          audio.playLevelComplete();
          setStage('completed');
          setScore((s) => s + 100);
        }, 200);
      } else if (!hasValidMoves(newGrid, cols)) {
        setTimeout(() => {
          setIsProcessing(true);
          setStatusText("No matches left! Shuffling...");
          setTimeout(() => {
            setGrid(safeShuffle(newGrid, cols));
            setStatusText("");
            setIsProcessing(false);
            setMergingSlots({});
          }, 600);
        }, 150);
      }
    } else {
      audio.playMatchFail();
      setSelected([i2]);
      setDragStartIdx(i2);
      setStatusText("Must equal 10 and be in line!");
      setTimeout(() => setStatusText(""), 1200);
    }
  };

  const handlePointerDown = (idx: number, e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isProcessing || stage !== 'playing' || grid[idx] === null) return;

    if (selected.length === 1 && selected[0] !== idx) {
      tryMatch(selected[0], idx);
    } else if (selected[0] === idx) {
      audio.playSelect();
      setSelected([]);
      setDragStartIdx(null);
    } else {
      audio.playSelect();
      setDragStartIdx(idx);
      setSelected([idx]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDrag = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (dragStartIdx === null) return;
    if (isProcessingRef.current) return;

    const els = document.elementsFromPoint(info.point.x, info.point.y);

    for (const el of els) {
      const target = el.closest('[data-idx]');
      if (target) {
        const idxAttr = target.getAttribute('data-idx');
        if (idxAttr !== null) {
          const targetIdx = parseInt(idxAttr, 10);
          if (targetIdx !== dragStartIdx && currentGridRef.current[targetIdx] !== null && currentGridRef.current[dragStartIdx] !== null) {
            if (hoveredIdxRef.current !== targetIdx) {
              const isMatch = (currentGridRef.current[dragStartIdx]!.value + currentGridRef.current[targetIdx]!.value === 10) && isValidMatch(dragStartIdx, targetIdx);
              if (isMatch) {
                hoveredIdxRef.current = targetIdx;
                setHoverTargetIdx(targetIdx);
              } else {
                hoveredIdxRef.current = null;
                setHoverTargetIdx(null);
              }
            }
            return;
          }
        }
      }
    }

    if (hoveredIdxRef.current !== null) {
      hoveredIdxRef.current = null;
      setHoverTargetIdx(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    if (dragStartIdx !== null && hoveredIdxRef.current !== null) {
      tryMatch(dragStartIdx, hoveredIdxRef.current);
    }
    // We let Framer Motion handle snap-back natively; we just clear the interaction state.
    setDragStartIdx(null);
    hoveredIdxRef.current = null;
    setHoverTargetIdx(null);
  };

  const handlePointerUp = () => {
    // Regular clicks handled by PointerDown. Drag ends handled by DragEnd.
  };

  const resetGame = () => {
    setTotalGamesCompleted(0);
    setScore(0);
    setHintsUsed(0);
    initLevel(0);
  };

  const retryLevel = () => {
    initLevel(totalGamesCompleted);
  };

  const showHintAction = () => {
    if (stage !== 'playing' || hintIndices.length > 0) return;
    const match = findHint(grid, cols);
    if (match) {
      setScore((s) => s - 20);
      setHintsUsed((count) => count + 1);
      setHintIndices(match);
      setTimeout(() => {
        setHintIndices([]);
      }, 1500);
    }
  };

  return {
    gameSeed,
    level,
    gameInLevel,
    totalGamesInLevel,
    totalGamesCompleted,
    setTotalGamesCompleted,
    score,
    grid,
    selected,
    stage,
    isProcessing,
    statusText,
    cols,
    rows,
    handlePointerDown,
    handlePointerUp,
    handleDrag,
    handleDragEnd,
    dragStartIdx,
    mergingSlots,
    maxTime,
    timeLeft,
    resetGame,
    retryLevel,
    hintIndices,
    hintsUsed,
    hoverTargetIdx,
    showHintAction
  };
}
