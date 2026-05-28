import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Settings, X, Volume2, VolumeX, Info } from "lucide-react";
import { Instructions } from "./Instructions";
import { GameCanvas } from "./GameCanvas";
import { saveScoreToLocalLeaderboard } from "../lib/leaderboard";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, getDocs, getFirestore, limit, query, where } from "firebase/firestore";
import {
  getExpectedNextNumber,
  isAdjacent,
  pointsEqual,
  isLevelSolved,
} from "../utils/gameLogic";
import { generateLevel } from "../utils/levelGenerator";
import type { Point, LevelData } from "../types";
import { useSoundEffects } from "../hooks/useSoundEffects";

interface GameProps {
  paidLevel: number;
  onClose?: () => void;
}

const normalizePhone07 = (phone: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return "0" + digits.slice(3);
  if (digits.startsWith("7") && digits.length === 9) return "0" + digits;
  return digits;
};

const getConnectDotsUser = () => ({
  name: localStorage.getItem("bongo_player_name") || "",
  phone: normalizePhone07(localStorage.getItem("bongo_player_phone") || ""),
});

interface SavedConnectDotsProgress {
  level: number;
  stage: number;
  score: number;
  updatedAt: number;
}

interface CompletionStats {
  level: number;
  stage: number;
  maxStages: number;
  score: number;
  mistakes: number;
  hintsUsed: number;
  isLevelComplete: boolean;
}

const readPositiveInt = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const getProgressKey = (phone: string) => `connectDotsProgress:${phone || "guest"}`;

const loadConnectDotsProgress = (paidLevel: number): SavedConnectDotsProgress | null => {
  const user = getConnectDotsUser();
  try {
    const raw = localStorage.getItem(getProgressKey(user.phone));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedConnectDotsProgress>;
    const level = readPositiveInt(parsed.level, paidLevel);

    return {
      level,
      stage: readPositiveInt(parsed.stage, 1),
      score: Math.max(0, Number(parsed.score ?? 0)),
      updatedAt: Number(parsed.updatedAt ?? 0),
    };
  } catch {
    return null;
  }
};

const saveConnectDotsProgress = (level: number, stage: number, score: number) => {
  const user = getConnectDotsUser();
  if (!user.phone) return;
  localStorage.setItem(getProgressKey(user.phone), JSON.stringify({
    level,
    stage,
    score: Math.max(0, Math.round(score)),
    updatedAt: Date.now(),
  }));
};

const getMaxStagesForLevel = (_level: number) => 10;

const timestampToMillis = (value: any) => {
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return 0;
};

const loadServerConnectDotsProgress = async (phone: string): Promise<SavedConnectDotsProgress | null> => {
  const phone07 = normalizePhone07(phone);
  if (!/^07\d{8}$/.test(phone07)) return null;

  const snap = await getDocs(query(
      collection(getFirestore(), "connectDotsSessions"),
      where("phone", "==", phone07),
      limit(50),
  ));

  if (snap.empty) return null;

  const latest = snap.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          level: readPositiveInt(data.level, 1),
          stage: readPositiveInt(data.stage, 1),
          score: Math.max(0, Number(data.score ?? 0)),
          playedAt: timestampToMillis(data.playedAt),
        };
      })
      .sort((a, b) => b.playedAt - a.playedAt || b.level - a.level || b.stage - a.stage)[0];

  const maxStages = getMaxStagesForLevel(latest.level);
  if (latest.stage >= maxStages) return null;

  return {
    level: latest.level,
    stage: latest.stage + 1,
    score: latest.score,
    updatedAt: Date.now(),
  };
};

export const Game: React.FC<GameProps> = ({ paidLevel, onClose }) => {
  const initialProgress = useMemo(() => loadConnectDotsProgress(Math.max(1, paidLevel)), [paidLevel]);
  const [currentLevel, setCurrentLevel] = useState(() => initialProgress?.level ?? Math.max(1, paidLevel));
  const [currentStage, setCurrentStage] = useState(() => initialProgress?.stage ?? 1);

  // Derive level instead of storing in state to avoid setState in effect
  const level = useMemo(
      () => generateLevel(currentLevel, currentStage),
      [currentLevel, currentStage],
  );

  // Initialize path based on level
  const getInitialPath = useCallback((levelData: LevelData): Point[] => {
    const startNode = levelData.nodes.find((n) => n.num === 1);
    return startNode ? [{ r: startNode.r, c: startNode.c }] : [];
  }, []);

  const [path, setPath] = useState<Point[]>(() => getInitialPath(level));
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSolved, setShowSolved] = useState(false);
  const [showEarnedPopup, setShowEarnedPopup] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [score, setScore] = useState<number>(() => initialProgress?.score ?? 0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [errorCells, setErrorCells] = useState<Point[]>([]);
  const [hintCells, setHintCells] = useState<Point[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(path);
  const errorPathRef = useRef<Point[]>([]);
  const lastErrorRef = useRef(0);
  const prevLevelRef = useRef(level);
  const hasAwardedScoreRef = useRef(false);
  const savedStageRef = useRef<Set<string>>(new Set());
  const hintsUsedRef = useRef(0);
  const mistakesRef = useRef(0);

  useEffect(() => {
    if (initialProgress) return;

    let cancelled = false;
    const user = getConnectDotsUser();
    loadServerConnectDotsProgress(user.phone)
        .then((serverProgress) => {
          if (cancelled || !serverProgress) return;
          saveConnectDotsProgress(serverProgress.level, serverProgress.stage, serverProgress.score);
          localStorage.setItem("connectDotsNextLevel", String(serverProgress.level));
          setCurrentLevel(serverProgress.level);
          setCurrentStage(serverProgress.stage);
          setScore(serverProgress.score);
          setPath(getInitialPath(generateLevel(serverProgress.level, serverProgress.stage)));
          setShowSolved(false);
          setCompletionStats(null);
          hasAwardedScoreRef.current = false;
        })
        .catch((error) => {
          console.error("Failed to restore Connect Dots progress", error);
        });

    return () => {
      cancelled = true;
    };
  }, [getInitialPath, initialProgress]);

  const {
    playConnectSound,
    playErrorSound,
    playStageCompleteSound,
    playLevelCompleteSound,
  } = useSoundEffects(isMuted);

  // Keep a local cache for instant leaderboard fallback; authoritative scores are saved via Cloud Functions.
  useEffect(() => {
    const user = getConnectDotsUser();
    if (user.name && user.phone) {
      saveScoreToLocalLeaderboard(user.name, user.phone, score);
    }
  }, [score]);

  const solved = isLevelSolved(path, level);

  useEffect(() => {
    if (!solved) saveConnectDotsProgress(currentLevel, currentStage, score);
  }, [currentLevel, currentStage, score, solved]);

  // Keep pathRef in sync with path state
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  // Reset path when level changes (using ref to detect actual level change)
  useEffect(() => {
    if (prevLevelRef.current !== level) {
      const startNode = level.nodes.find((n) => n.num === 1);
      setPath(startNode ? [{ r: startNode.r, c: startNode.c }] : []);
      setShowSolved(false);
      hasAwardedScoreRef.current = false;
      prevLevelRef.current = level;
    }
  }, [level]);

  // Handle click outside for settings dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
          settingsRef.current &&
          !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    }

    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettings]);

  // Prevent default touch moves to stop iOS scrolling
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const preventDefaultTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    node.addEventListener("touchmove", preventDefaultTouchMove, {
      passive: false,
    });
    return () => {
      node.removeEventListener("touchmove", preventDefaultTouchMove);
    };
  }, []);


  // Handle solved state and play sounds
  useEffect(() => {
    const maxStagesCurrentLevel = 10;
    if (solved && !isDrawing) {
      if (!hasAwardedScoreRef.current) {
        hasAwardedScoreRef.current = true;
        const nextScore = score + 100;
        const nextProgressLevel = currentStage >= maxStagesCurrentLevel ? currentLevel + 1 : currentLevel;
        const nextProgressStage = currentStage >= maxStagesCurrentLevel ? 1 : currentStage + 1;
        const nextProgressScore = currentStage >= maxStagesCurrentLevel ? 0 : nextScore;
        setScore(nextScore);
        setCompletionStats({
          level: currentLevel,
          stage: currentStage,
          maxStages: maxStagesCurrentLevel,
          score: nextScore,
          mistakes: mistakesRef.current,
          hintsUsed: hintsUsedRef.current,
          isLevelComplete: currentStage >= maxStagesCurrentLevel,
        });
        saveConnectDotsProgress(nextProgressLevel, nextProgressStage, nextProgressScore);

        const user = getConnectDotsUser();
        const stageKey = `${currentLevel}:${currentStage}:${nextScore}`;
        if (user.name && /^0\d{9}$/.test(user.phone) && !savedStageRef.current.has(stageKey)) {
          savedStageRef.current.add(stageKey);
          const saveConnectDotsScore = httpsCallable(getFunctions(), "saveConnectDotsScore");
          saveConnectDotsScore({
            name: user.name,
            phone: user.phone,
            score: nextScore,
            level: currentLevel,
            stage: currentStage,
            hintsUsed: hintsUsedRef.current,
            mistakes: mistakesRef.current,
          }).catch((error) => {
            savedStageRef.current.delete(stageKey);
            console.error("saveConnectDotsScore failed", error);
          });
        }
      }

      if (currentStage >= maxStagesCurrentLevel) {
        playLevelCompleteSound();
      } else {
        playStageCompleteSound();
      }

      // Delay slightly to avoid updating state during effect synchronously
      const initT = setTimeout(() => setShowEarnedPopup(true), 0);
      const popupT = setTimeout(() => setShowEarnedPopup(false), 2000);

      const t = setTimeout(() => setShowSolved(true), 150);
      return () => {
        clearTimeout(initT);
        clearTimeout(t);
        clearTimeout(popupT);
      };
    }
  }, [
    solved,
    isDrawing,
    currentLevel,
    currentStage,
    playStageCompleteSound,
    playLevelCompleteSound,
    score,
  ]);

  // Handle grid size calculation
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    // Initial size
    setGridSize({ width: node.clientWidth, height: node.clientHeight });

    // Create observer
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === node) {
          setGridSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleNextLevel = useCallback(() => {
    hasAwardedScoreRef.current = false;
    const maxStagesCurrentLevel = 10;
    if (currentStage >= maxStagesCurrentLevel) {
      const nextLevel = currentLevel + 1;
      localStorage.setItem('connectDotsNextLevel', String(nextLevel));
      localStorage.removeItem('connectDotsPaidLevel');
      setScore(0);
      saveConnectDotsProgress(nextLevel, 1, 0);
      setShowSolved(false);
      setCompletionStats(null);
      if (onClose) onClose();
      return;
    }

    const nextStage = currentStage + 1;
    saveConnectDotsProgress(currentLevel, nextStage, score);
    setCurrentStage(nextStage);
    setShowSolved(false);
    setCompletionStats(null);
  }, [currentLevel, currentStage, onClose, score]);

  const getPointFromEvent = useCallback(
      (e: React.PointerEvent): Point | null => {
        if (!gridRef.current) return null;
        const rect = gridRef.current.getBoundingClientRect();
        const borderLeft = gridRef.current.clientLeft || 0;
        const borderTop = gridRef.current.clientTop || 0;
        const x = e.clientX - rect.left - borderLeft;
        const y = e.clientY - rect.top - borderTop;
        const width = gridRef.current.clientWidth;
        const height = gridRef.current.clientHeight;

        if (x < 0 || x >= width || y < 0 || y >= height) return null;

        const c = Math.floor((x / width) * level.cols);
        const r = Math.floor((y / height) * level.rows);
        return { r, c };
      },
      [level.cols, level.rows],
  );

  const handleTouchPoint = useCallback(
      (pt: Point) => {
        const currentPath = pathRef.current;
        const currentErrorPath = errorPathRef.current;

        if (currentPath.length === 0) return;

        // Are we tracking an error path?
        if (currentErrorPath.length > 0) {
          const lastError = currentErrorPath[currentErrorPath.length - 1];
          if (pointsEqual(lastError, pt)) return;

          // Backtrack error path
          if (currentErrorPath.length >= 2) {
            const secondToLastError =
                currentErrorPath[currentErrorPath.length - 2];
            if (pointsEqual(secondToLastError, pt)) {
              const newErrorPath = currentErrorPath.slice(0, -1);
              errorPathRef.current = newErrorPath;
              setErrorCells(newErrorPath);
              return;
            }
          } else {
            // Backtrack to last valid node
            const lastValid = currentPath[currentPath.length - 1];
            if (pointsEqual(lastValid, pt)) {
              errorPathRef.current = [];
              setErrorCells([]);
              return;
            }
          }

          // Forward on error path
          if (isAdjacent(lastError, pt, level)) {
            if (currentErrorPath.some((p) => pointsEqual(p, pt))) return;
            if (currentPath.some((p) => pointsEqual(p, pt))) return;

            const newErrorPath = [...currentErrorPath, pt];
            errorPathRef.current = newErrorPath;
            setErrorCells(newErrorPath);
          }
          return;
        }

        // No error path
        const lastValid = currentPath[currentPath.length - 1];
        if (pointsEqual(lastValid, pt)) return;

        // Backtracking on valid path
        if (currentPath.length >= 2) {
          const secondToLastValid = currentPath[currentPath.length - 2];
          if (pointsEqual(secondToLastValid, pt)) {
            const newPath = currentPath.slice(0, -1);
            pathRef.current = newPath;
            setPath(newPath);
            return;
          }
        }

        // Forward on valid path
        if (isAdjacent(lastValid, pt, level)) {
          if (currentPath.some((p) => pointsEqual(p, pt))) {
            // Moved into a node already on path
            const now = Date.now();
            if (now - lastErrorRef.current > 300) {
              playErrorSound();
              lastErrorRef.current = now;
              mistakesRef.current += 1;
              setScore((s: number) => Math.max(0, s - 50));
            }
            const newErrorPath = [pt];
            errorPathRef.current = newErrorPath;
            setErrorCells(newErrorPath);
            return;
          }

          const node = level.nodes.find((n) => pointsEqual(n, pt));
          const currentTargetNum = getExpectedNextNumber(
              currentPath,
              level.nodes,
          );

          let isValid = true;
          if (currentTargetNum > level.nodes.length) {
            isValid = false;
          } else if (node) {
            if (node.num !== currentTargetNum) {
              isValid = false;
            }
          }

          if (isValid) {
            playConnectSound(node ? true : false);
            const newPath = [...currentPath, pt];
            pathRef.current = newPath;
            setPath(newPath);
          } else {
            const now = Date.now();
            if (now - lastErrorRef.current > 300) {
              playErrorSound();
              lastErrorRef.current = now;
              mistakesRef.current += 1;
              setScore((s: number) => Math.max(0, s - 50));
            }
            const newErrorPath = [pt];
            errorPathRef.current = newErrorPath;
            setErrorCells(newErrorPath);
          }
        } else {
          const dx = Math.abs(lastValid.c - pt.c);
          const dy = Math.abs(lastValid.r - pt.r);
          if (dx + dy === 1) {
            // Handled wall intersection
            const now = Date.now();
            if (now - lastErrorRef.current > 300) {
              playErrorSound();
              lastErrorRef.current = now;
              mistakesRef.current += 1;
              setScore((s: number) => Math.max(0, s - 50));
            }
            const newErrorPath = [pt];
            errorPathRef.current = newErrorPath;
            setErrorCells(newErrorPath);
          }
        }
      },
      [level, playConnectSound, playErrorSound],
  );

  const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (showSolved) return;
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch (error) {
          // ignore setup errors
          console.debug("Pointer capture error", error);
        }

        const pt = getPointFromEvent(e);
        if (!pt) return;

        const pathIndex = path.findIndex((p) => pointsEqual(p, pt));

        if (pathIndex !== -1) {
          // Clicked on an existing point in the path, trim it to here
          const newPath = path.slice(0, pathIndex + 1);
          pathRef.current = newPath;
          setPath(newPath);
          setIsDrawing(true);
          playConnectSound(false);
        } else if (path.length === 0) {
          // Start a new path (must be on 1)
          const clickedNode = level.nodes.find((n) => pointsEqual(n, pt));
          if (clickedNode && clickedNode.num === 1) {
            const newPath = [pt];
            pathRef.current = newPath;
            setPath(newPath);
            setIsDrawing(true);
            playConnectSound(true);
          }
        } else {
          // Valid touch down but not on path - see if it's an adjacent continuation
          const last = path[path.length - 1];
          if (pointsEqual(last, pt)) {
            setIsDrawing(true);
          } else if (isAdjacent(last, pt, level)) {
            setIsDrawing(true);
            handleTouchPoint(pt);
          }
        }
      },
      [
        showSolved,
        path,
        level,
        getPointFromEvent,
        playConnectSound,
        handleTouchPoint,
      ],
  );

  const clearSelection = useCallback(() => {
    // Clear the selection on the window if it happens during dragging
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawing || showSolved) return;
        clearSelection();

        const pt = getPointFromEvent(e);
        if (!pt) return;

        handleTouchPoint(pt);
      },
      [
        isDrawing,
        showSolved,
        clearSelection,
        getPointFromEvent,
        handleTouchPoint,
      ],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDrawing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (error) {
      // ignore teardown errors
      console.debug("Pointer release error", error);
    }

    if (errorPathRef.current.length > 0) {
      setTimeout(() => {
        errorPathRef.current = [];
        setErrorCells([]);
      }, 150);
    }
  }, []);

  const handleUndo = useCallback(() => {
    setPath((currentPath) => {
      if (currentPath.length > 1) {
        const newPath = currentPath.slice(0, -1);
        pathRef.current = newPath;
        return newPath;
      }
      return currentPath;
    });
  }, []);

  const handleHint = useCallback(() => {
    if (showSolved) return;
    if (!level.solutionPath) return;

    const sp = level.solutionPath;

    // Find where user diverged
    let validLength = 0;
    for (let i = 0; i < path.length; i++) {
      if (i < sp.length && pointsEqual(path[i], sp[i])) {
        validLength++;
      } else {
        break;
      }
    }

    // Let's show the correct path from sp[validLength - 1] to the next Number node
    let endIndex = validLength;
    while (endIndex < sp.length) {
      const pt = sp[endIndex];
      const isNode = level.nodes.some(n => pointsEqual(n, pt));
      if (isNode) break;
      endIndex++;
    }

    const hintPoints = sp.slice(
        Math.max(0, validLength - 1),
        endIndex + 1
    );

    if (hintPoints.length > 0) {
      hintsUsedRef.current += 1;
      setScore((s: number) => Math.max(0, s - 50));
      setHintCells(hintPoints);
      setTimeout(() => {
        setHintCells((currentHints) => {
          // only clear if they haven't requested another hint immediately
          if (currentHints === hintPoints) return [];
          return currentHints;
        });
      }, 2500);
    }
  }, [showSolved, path, level]);

  const maxStagesCurrentLevel = 10;

  return (
      <div className="game-wrapper">
        {/* Header */}
        <div className="game-top-header">
          <button
              className="icon-btn"
              onClick={() => {
                if (onClose) onClose();
              }}
          >
            <X size={24} />
          </button>
          <div className="header-score">Points: {score}</div>
          <div className="settings-wrapper" ref={settingsRef}>
            <button
                className="icon-btn"
                onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={24} />
            </button>

            {showSettings && (
                <div className="settings-dropdown">
                  <button
                      className="settings-item"
                      onClick={() => {
                        setIsMuted(!isMuted);
                        setShowSettings(false);
                      }}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    <span>{isMuted ? "Unmute" : "Mute"} Sounds</span>
                  </button>
                  <button
                      className="settings-item"
                      onClick={() => {
                        setShowInstructionsModal(true);
                        setShowSettings(false);
                      }}
                  >
                    <Info size={20} />
                    <span>How to play</span>
                  </button>
                </div>
            )}
          </div>
        </div>

        <div className="game-card">
          {/* Game Board */}
          <div
              ref={gridRef}
              className="game-canvas-container"
              style={{ touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
          >
            {gridSize.width > 0 && (
                <GameCanvas
                    level={level}
                    path={path}
                    width={gridSize.width}
                    height={gridSize.height}
                    errorCells={errorCells}
                    hintCells={hintCells}
                />
            )}

            {showEarnedPopup && (
                <div className="earned-popup">
                  Wow, 100 points earned
                </div>
            )}

            {showSolved && (
                <div className="solved-overlay">
                  <div className="level-complete-modal">
                    <div className="level-complete-kicker">
                      {completionStats?.isLevelComplete ? "Level Complete" : "Stage Complete"}
                    </div>
                    <div className="solved-text">Solved!</div>
                    <div className="level-complete-grid">
                      <div className="level-complete-stat">
                        <span>Total Score</span>
                        <strong>{completionStats?.score ?? score}</strong>
                      </div>
                      <div className="level-complete-stat">
                        <span>Mistakes</span>
                        <strong>{completionStats?.mistakes ?? mistakesRef.current}</strong>
                      </div>
                      <div className="level-complete-stat">
                        <span>Level</span>
                        <strong>{completionStats?.level ?? currentLevel}</strong>
                      </div>
                      <div className="level-complete-stat">
                        <span>Stage</span>
                        <strong>{completionStats ? String(completionStats.stage) + "/" + String(completionStats.maxStages) : String(currentStage) + "/" + String(maxStagesCurrentLevel)}</strong>
                      </div>
                      <div className="level-complete-stat level-complete-stat-wide">
                        <span>Hints Used</span>
                        <strong>{completionStats?.hintsUsed ?? hintsUsedRef.current}</strong>
                      </div>
                    </div>
                    <button onClick={handleNextLevel} className="next-button">
                      {currentStage >= maxStagesCurrentLevel ? "Pay for level " + (currentLevel + 1) : "Next Stage"}
                    </button>
                  </div>
                </div>
            )}
          </div>

          {/* Controls */}
          <div className="controls-container">
            <div className="level-text">
              Level {currentLevel} - Stage {currentStage}/{maxStagesCurrentLevel}
            </div>
            <div className="buttons-group">
              <button
                  onClick={handleUndo}
                  disabled={path.length <= 1 || showSolved}
                  className="control-btn btn-undo"
              >
                Undo
              </button>
              <button
                  onClick={handleHint}
                  disabled={showSolved}
                  className="control-btn btn-hint"
              >
                Hint
              </button>
            </div>
          </div>
        </div>

        {/* Graphical Instructions */}
        <div className="instructions-container">
          <Instructions />
        </div>

        {showInstructionsModal && (
            <div
                className="modal-overlay"
                onClick={() => setShowInstructionsModal(false)}
            >
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>How to play</h2>
                  <button
                      className="icon-btn"
                      onClick={() => setShowInstructionsModal(false)}
                  >
                    <X size={24} />
                  </button>
                </div>
                <div
                    className="modal-body"
                    style={{ padding: "1.5rem", lineHeight: "2", color: "#4b5563" }}
                >
                  <ul
                      style={{ paddingLeft: "1.5rem", margin: 0, fontSize: "1rem" }}
                  >
                    <li>
                      Start at the circle labeled <strong>1</strong>.
                    </li>
                    <li>
                      Swipe or drag to draw a line connecting numbers in ascending
                      order.
                    </li>
                    <li>
                      You must fill <strong>every single cell</strong> on the grid.
                    </li>
                    <li>The line cannot cross itself or intersect.</li>
                    <li>The path must end exactly at the last numbered dot.</li>
                    <li>You earn 100 points for solving a puzzle.</li>
                    <li>Using a hint will deduct 50 points from your total score.</li>
                  </ul>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};
