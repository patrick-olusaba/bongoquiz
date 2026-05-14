import React, { useEffect, useRef } from 'react';
import type {Board as BoardType} from '../types';

type CanvasGameProps = {
  board: BoardType;
  selected: { r: number; c: number } | null;
  setSelected: (selected: { r: number; c: number } | null) => void;
  hasConflict: (r: number, c: number) => boolean;
  isIncorrect: (r: number, c: number) => boolean;
  isSameValue: (r: number, c: number) => boolean;
  isRelated: (r: number, c: number) => boolean;
  handleHint: () => void;
  handleInput: (num: number) => void;
  handleErase: () => void;
  handleUndo: () => void;
  canUndo: boolean;
  score: number;
  hintedCell: { r: number; c: number } | null;
  onWidthChange?: (width: number) => void;
};

export const CanvasGame: React.FC<CanvasGameProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  const drawRef = useRef<((W: number) => void) | null>(null);
  const activeButtonRef = useRef<string | null>(null);

  const setActiveButton = (id: string | null) => {
    if (activeButtonRef.current !== id) {
      activeButtonRef.current = id;
      if (canvasRef.current && drawRef.current) {
        const W = parseFloat(canvasRef.current.style.width);
        if (!isNaN(W)) {
          drawRef.current(W);
        }
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawRef.current = (W: number) => {
      const p = propsRef.current;
      if (!p || !p.board || p.board.length === 0) return;

      ctx.clearRect(0, 0, W, W * 1.60);

      const colors = {
        bgMain: '#ffffff',
        gridLines: '#94a3b8',
        gridLinesThick: '#334155',
        textMain: '#0f172a',
        textFixed: '#334155',
        textError: '#ef4444',
        textConflict: '#ffffff',
        textBlue: '#2563eb',
        bgSelected: '#bfdbfe',
        bgRelated: '#e2e8f0',
        bgSame: '#93c5fd',
        bgConflict: '#ef4444',
        bgConflictRelated: '#fef2f2',
        btnBg: '#f3f4f6',
        btnBgHover: '#e5e7eb',
        btnText: '#1f2937',
        btnDisabled: '#9ca3af',
        shadow: 'rgba(0, 0, 0, 0.05)',
      };

      const size = p.board.length;
      const blockR = size === 6 ? 2 : 3;
      const blockC = 3;

      const S = W;
      const cellSize = S / size;

      // Draw Grid Backgrounds
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, S, S, 4);
      ctx.clip();

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const x = c * cellSize;
          const y = r * cellSize;

          let bg = colors.bgMain;
          if (p.hintedCell?.r === r && p.hintedCell?.c === c) bg = '#fef08a'; // yellow-200
          else if (p.selected?.r === r && p.selected?.c === c) bg = colors.bgSelected;
          else if (p.hasConflict(r, c)) bg = colors.bgConflict;
          else if (p.isSameValue(r, c)) bg = colors.bgSame;
          else if (p.isRelated(r, c)) bg = colors.bgRelated;

          ctx.fillStyle = bg;
          ctx.fillRect(x, y, cellSize, cellSize);

          const cell = p.board[r][c];
          if (cell.value) {
            if (cell.isFixed) {
              ctx.fillStyle = colors.textFixed;
            } else if (p.hasConflict(r, c)) {
              ctx.fillStyle = colors.textConflict;
            } else if (p.isIncorrect(r, c)) {
              ctx.fillStyle = colors.textError;
            } else {
              ctx.fillStyle = colors.textBlue;
            }
            ctx.font = `${cell.isFixed ? '600' : '700'} ${cellSize * 0.45}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.value.toString(), x + cellSize / 2, y + cellSize / 2 + 2);
          }
        }
      }

      // Grid Lines
      ctx.lineCap = 'square';
      for (let i = 1; i < size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, S);
        ctx.lineWidth = (i % blockC === 0) ? 2.5 : 1;
        ctx.strokeStyle = (i % blockC === 0) ? colors.gridLinesThick : colors.gridLines;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(S, i * cellSize);
        ctx.lineWidth = (i % blockR === 0) ? 2.5 : 1;
        ctx.strokeStyle = (i % blockR === 0) ? colors.gridLinesThick : colors.gridLines;
        ctx.stroke();
      }
      ctx.restore();

      // Outer Grid Border
      ctx.beginPath();
      ctx.roundRect(1.5, 1.5, S - 3, S - 3, 4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.gridLinesThick;
      ctx.stroke();

      // Selected Cell Border
      if (p.selected) {
        const { r, c } = p.selected;
        const x = c * cellSize;
        const y = r * cellSize;
        ctx.strokeStyle = colors.textBlue;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);
      }

      // Controls
      const M = W * 0.04;
      const controlsY = S + M;
      const controlsH = W * 0.12;

      ctx.font = `600 ${W * 0.04}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = colors.textBlue;
      ctx.fillText(`🏆 Points: ${p.score}`, 0, controlsY + controlsH / 2);

      const controlBtnW = W * 0.22;
      const controlBtnH = controlsH * 0.8;
      const btnYCenter = controlsY + controlsH / 2;

      const drawControlBtn = (text: string, isActive: boolean, xCenter: string | number, _id: string, baseColor: string, hoverColor: string, activeColor: string, borderColor: string, textColor: string, opacity: number = 1) => {
        const yOffset = isActive ? 4 : 0;
        const xC = typeof xCenter === 'number' ? xCenter : (xCenter === 'right' ? W - controlBtnW / 2 : W - controlBtnW * 1.5 - M);

        ctx.globalAlpha = opacity;

        if (!isActive) {
          ctx.fillStyle = baseColor;
          ctx.beginPath();
          ctx.roundRect(xC - controlBtnW/2, btnYCenter - controlBtnH/2 + 4, controlBtnW, controlBtnH, 12);
          ctx.fill();
        }
        ctx.fillStyle = isActive ? activeColor : hoverColor;
        ctx.beginPath();
        ctx.roundRect(xC - controlBtnW/2, btnYCenter - controlBtnH/2 + yOffset, controlBtnW, controlBtnH, 12);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = `600 ${W * 0.04}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(text, xC, btnYCenter + yOffset + 2);
        ctx.globalAlpha = 1.0;

        return { x: xC - controlBtnW/2, y: btnYCenter - controlBtnH/2, w: controlBtnW, h: controlBtnH };
      };

      const hintActive = activeButtonRef.current === 'hint';
      drawControlBtn("💡 Hint", hintActive, 'right', 'hint', '#d97706', '#fbbf24', '#fcd34d', '#f59e0b', '#78350f');

      const undoActive = activeButtonRef.current === 'undo';
      const undoOpacity = p.canUndo ? 1.0 : 0.5;
      drawControlBtn("↩ Undo", undoActive, W - controlBtnW * 1.5 - M, 'undo', '#94a3b8', '#e2e8f0', '#f1f5f9', '#cbd5e1', '#334155', undoOpacity);

      // Numpad
      const numpadY = controlsY + controlsH + M;
      const cols = size === 6 ? 4 : 5;
      const btnW = (W - (cols - 1) * M) / cols;
      const btnH = W * 0.16;

      const drawBtn = (text: string, col: number, row: number, id: string, isAction: boolean = false) => {
        const x = col * (btnW + M);
        const y = numpadY + row * (btnH + M);

        const isActive = activeButtonRef.current === id;
        const yOffset = isActive ? 4 : 0;

        // Button Shadow
        if (!isActive) {
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.roundRect(x, y + 4, btnW, btnH, 12);
          ctx.fill();
        }

        // Button Background
        ctx.fillStyle = isActive ? '#f8fafc' : '#ffffff';
        ctx.beginPath();
        ctx.roundRect(x, y + yOffset, btnW, btnH, 12);
        ctx.fill();

        // Button Border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = isAction ? colors.textError : colors.textBlue;
        if (isAction) {
          ctx.font = `600 ${W * 0.035}px system-ui, -apple-system, sans-serif`;
        } else {
          ctx.font = `600 ${W * 0.08}px system-ui, -apple-system, sans-serif`;
        }
        ctx.fillText(text, x + btnW / 2, y + yOffset + btnH / 2 + 2);
      };

      if (size === 6) {
        drawBtn("1", 0, 0, "numpad-1");
        drawBtn("2", 1, 0, "numpad-2");
        drawBtn("3", 2, 0, "numpad-3");
        drawBtn("✕ Erase", 3, 0, "erase", true);

        drawBtn("4", 0, 1, "numpad-4");
        drawBtn("5", 1, 1, "numpad-5");
        drawBtn("6", 2, 1, "numpad-6");
      } else {
        drawBtn("1", 0, 0, "numpad-1");
        drawBtn("2", 1, 0, "numpad-2");
        drawBtn("3", 2, 0, "numpad-3");
        drawBtn("4", 3, 0, "numpad-4");
        drawBtn("5", 4, 0, "numpad-5");

        drawBtn("6", 0, 1, "numpad-6");
        drawBtn("7", 1, 1, "numpad-7");
        drawBtn("8", 2, 1, "numpad-8");
        drawBtn("9", 3, 1, "numpad-9");
        drawBtn("✕", 4, 1, "erase", true);
      }
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const AW = rect.width;
      const AH = rect.height;
      let W = AW;
      if (1.60 * W > AH) {
        W = AH / 1.60;
      }
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = (W * 1.60) * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${W * 1.60}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      if (drawRef.current) drawRef.current(W);
      if (propsRef.current.onWidthChange) {
        propsRef.current.onWidthChange(W);
      }
    };

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(resize);
    });
    observer.observe(container);
    resize();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && drawRef.current) {
      const W = parseFloat(canvas.style.width);
      if (!isNaN(W)) {
        drawRef.current(W);
      }
    }
  }, [props]);

  const getHitTarget = (x: number, y: number, W: number, size: number) => {
    const M = W * 0.04;
    const S = W;
    const cellSize = S / size;

    // Check Grid
    if (y < S) {
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r >= 0 && r < size && c >= 0 && c < size) {
        return { type: 'grid', r, c };
      }
      return null;
    }

    // Check Controls
    const controlsY = S + M;
    const controlsH = W * 0.12;
    if (y >= controlsY && y <= controlsY + controlsH) {
      const controlBtnW = W * 0.22;
      const controlBtnH = controlsH * 0.8;
      const btnYCenter = controlsY + controlsH / 2;

      const hintXCenter = W - controlBtnW / 2;
      if (x >= hintXCenter - controlBtnW/2 && x <= hintXCenter + controlBtnW/2 &&
          y >= btnYCenter - controlBtnH/2 && y <= btnYCenter + controlBtnH/2) {
        return { type: 'hint' };
      }

      const undoXCenter = W - controlBtnW * 1.5 - M;
      if (x >= undoXCenter - controlBtnW/2 && x <= undoXCenter + controlBtnW/2 &&
          y >= btnYCenter - controlBtnH/2 && y <= btnYCenter + controlBtnH/2) {
        return { type: 'undo' };
      }

      return null;
    }

    // Check Numpad
    const numpadY = controlsY + controlsH + M;
    const cols = size === 6 ? 4 : 5;
    const btnW = (W - (cols - 1) * M) / cols;
    const btnH = W * 0.16;

    if (y >= numpadY) {
      const row = Math.floor((y - numpadY) / (btnH + M));
      const col = Math.floor(x / (btnW + M));

      const btnX = col * (btnW + M);
      const btnY = numpadY + row * (btnH + M);
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        if (size === 6) {
          if (row === 0) {
            if (col === 0) return { type: 'numpad', value: 1 };
            if (col === 1) return { type: 'numpad', value: 2 };
            if (col === 2) return { type: 'numpad', value: 3 };
            if (col === 3) return { type: 'erase' };
          } else if (row === 1) {
            if (col === 0) return { type: 'numpad', value: 4 };
            if (col === 1) return { type: 'numpad', value: 5 };
            if (col === 2) return { type: 'numpad', value: 6 };
          }
        } else {
          if (row === 0) {
            if (col >= 0 && col <= 4) return { type: 'numpad', value: col + 1 };
          } else if (row === 1) {
            if (col >= 0 && col <= 3) return { type: 'numpad', value: col + 6 };
            if (col === 4) return { type: 'erase' };
          }
        }
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const target = getHitTarget(x, y, rect.width, props.board.length);
    if (target) {
      if (target.type === 'grid') {
        props.setSelected({ r: target.r!, c: target.c! });
      } else if (target.type === 'hint') {
        setActiveButton('hint');
      } else if (target.type === 'undo') {
        if (props.canUndo) setActiveButton('undo');
      } else if (target.type === 'erase') {
        setActiveButton('erase');
      } else if (target.type === 'numpad') {
        setActiveButton(`numpad-${target.value}`);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);

    if (activeButtonRef.current) {
      const id = activeButtonRef.current;
      setActiveButton(null);

      if (id === 'hint') props.handleHint();
      else if (id === 'undo') props.handleUndo();
      else if (id === 'erase') props.handleErase();
      else if (id.startsWith('numpad-')) {
        const num = parseInt(id.split('-')[1]);
        props.handleInput(num);
      }
    }
  };

  const handlePointerCancel = () => {
    setActiveButton(null);
  };

  return (
      <div ref={containerRef} className="sudoku-canvas-container">
        <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerOut={handlePointerCancel}
            className="sudoku-game-canvas"
        />
      </div>
  );
};
