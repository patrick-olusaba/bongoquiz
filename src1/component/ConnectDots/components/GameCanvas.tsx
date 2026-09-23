import React, { useRef, useEffect } from "react";
import type { LevelData, Point } from "../types";
import { motion } from "motion/react";

interface GameCanvasProps {
  level: LevelData;
  path: Point[];
  width: number;
  height: number;
  errorCells?: Point[];
  hintCells?: Point[];
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
                                                        level,
                                                        path,
                                                        width,
                                                        height,
                                                        errorCells = [],
                                                        hintCells = [],
                                                      }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (width === 0 || height === 0) return;

    const cellW = width / level.cols;
    const cellH = height / level.rows;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Color connected cells light green, error cells dark red
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const isPath = path.some((p) => p.r === r && p.c === c);
        const isError = errorCells.some((e) => e.r === r && e.c === c);

        if (isError) {
          ctx.fillStyle = "#dc2626"; // Dark red
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        } else if (isPath) {
          ctx.fillStyle = "#dcfce7"; // Light green
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }

    ctx.strokeStyle = "#a0a0a0";
    ctx.lineWidth = 3;

    // Draw borders/cells
    for (let r = 0; r <= level.rows; r++) {
      ctx.beginPath();
      const y = r * cellH;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let c = 0; c <= level.cols; c++) {
      ctx.beginPath();
      const x = c * cellW;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw start node backgrounds
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const x = c * cellW;
        const y = r * cellH;
        const isStart = level.nodes.find(
            (n) => n.num === 1 && n.r === r && n.c === c,
        );
        if (isStart) {
          ctx.fillStyle = "#dfceeb";
          ctx.fillRect(x + 1.5, y + 1.5, cellW - 3, cellH - 3);
        }
      }
    }

    // Draw path
    if (path.length > 0) {
      const baseWidth = Math.min(cellW, cellH) * 0.2;
      const first = path[0];

      const drawPath = (
          width: number,
          color: string,
          offsetX = 0,
          offsetY = 0,
      ) => {
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = width;
        ctx.strokeStyle = color;

        ctx.moveTo(
            first.c * cellW + cellW / 2 + offsetX,
            first.r * cellH + cellH / 2 + offsetY,
        );

        for (let i = 1; i < path.length; i++) {
          const p = path[i];
          ctx.lineTo(
              p.c * cellW + cellW / 2 + offsetX,
              p.r * cellH + cellH / 2 + offsetY,
          );
        }
        ctx.stroke();
      };

      // 3D Tube effect
      drawPath(baseWidth + 4, "rgba(0,0,0,0.3)", 0, 4); // Drop shadow
      drawPath(baseWidth + 2, "#991b1b", 0, 0); // Dark border
      drawPath(baseWidth, "#ef4444", 0, 0); // Main red
      drawPath(baseWidth * 0.5, "#fca5a5", -1, -1); // Highlight
      drawPath(baseWidth * 0.2, "#fee2e2", -2, -2); // Specular highlight
    }

    // Draw start node halo
    for (const node of level.nodes) {
      if (node.num === 1) {
        const cx = node.c * cellW + cellW / 2;
        const cy = node.r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.25;

        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = "#3b0b59";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = "#dfceeb";
        ctx.fill();
      }
    }

    // Draw walls
    if (level.blockedWalls && level.blockedWalls.length > 0) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = Math.min(cellW, cellH) * 0.15;
      ctx.lineCap = "round";

      for (const w of level.blockedWalls) {
        const [p1, p2] = w.split("-");
        const [r1, c1] = p1.split(",").map(Number);
        const [r2, c2] = p2.split(",").map(Number);

        let x1, y1, x2, y2;
        if (r1 === r2) {
          const maxC = Math.max(c1, c2);
          x1 = maxC * cellW;
          x2 = x1;
          y1 = r1 * cellH;
          y2 = (r1 + 1) * cellH;
        } else {
          const maxR = Math.max(r1, r2);
          y1 = maxR * cellH;
          y2 = y1;
          x1 = c1 * cellW;
          x2 = (c1 + 1) * cellW;
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }, [level, path, width, height, errorCells]);

  const cellW = width / level.cols;
  const cellH = height / level.rows;
  const radius = Math.min(cellW, cellH) * 0.25;

  return (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}>
        <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              display: "block",
              touchAction: "none",
              pointerEvents: "none",
            }}
            className="game-canvas"
        />
        {width > 0 &&
            height > 0 &&
            hintCells.map((pt, i) => {
              const cx = pt.c * cellW + cellW / 2;
              const cy = pt.r * cellH + cellH / 2;
              const r = Math.min(cellW, cellH) * 0.15;
              return (
                  <div
                      key={`hint-${pt.r}-${pt.c}-${i}`}
                      className="hint-cell"
                      style={{
                        position: "absolute",
                        left: cx - r,
                        top: cy - r,
                        width: r * 2,
                        height: r * 2,
                        borderRadius: "50%",
                        backgroundColor: "rgba(236, 72, 153, 0.8)",
                        boxShadow: "0 0 10px 4px rgba(236, 72, 153, 0.6)",
                        pointerEvents: "none",
                        zIndex: 20,
                        animation: `hintWave 1.5s ease-in-out ${i * 0.15}s infinite`,
                      }}
                  />
              );
            })}
        {width > 0 &&
            height > 0 &&
            level.nodes.map((node) => {
              const cx = node.c * cellW + cellW / 2;
              const cy = node.r * cellH + cellH / 2;

              // Is this node currently in the path?
              const isConnected =
                  node.num === 1
                      ? path.length > 1
                      : path.some((p) => p.r === node.r && p.c === node.c);

              return (
                  <motion.div
                      key={`node-${node.r}-${node.c}`}
                      className="node-ball"
                      initial={false}
                      animate={{
                        scale: isConnected ? 0.85 : 1,
                        boxShadow: isConnected
                            ? "inset 0 4px 6px rgba(0,0,0,0.8), 0 0px 0px rgba(0,0,0,0)"
                            : "inset -3px -3px 6px rgba(255,255,255,0.2), inset 3px 3px 6px rgba(0,0,0,0.8), 0 4px 6px rgba(0,0,0,0.4)",
                        x: node.num === 1 && !isConnected ? [0, 2, 0, -2, 0] : 0,
                        y: node.num === 1 && !isConnected ? [-2, 0, 2, 0, -2] : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        x:
                            node.num === 1 && !isConnected
                                ? { repeat: Infinity, duration: 1.5, ease: "linear" }
                                : undefined,
                        y:
                            node.num === 1 && !isConnected
                                ? { repeat: Infinity, duration: 1.5, ease: "linear" }
                                : undefined,
                      }}
                      style={{
                        position: "absolute",
                        left: cx - radius,
                        top: cy - radius,
                        width: radius * 2,
                        height: radius * 2,
                        borderRadius: "50%",
                        background:
                            "radial-gradient(circle at 30% 30%, #555555 0%, #1c1c1c 40%, #000000 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: Math.max(10, cellW * 0.2),
                        fontWeight: "bold",
                        pointerEvents: "none",
                        transformOrigin: "center",
                        zIndex: node.num === 1 ? 10 : 5, // keep start dot slightly above? Actually not needed if we render properly
                      }}
                  >
                    {node.num}
                  </motion.div>
              );
            })}
      </div>
  );
};
