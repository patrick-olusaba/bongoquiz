// BongoCanvas.tsx - Fully responsive with accurate click handling and 1200x1200 canvas for 8 boxes
import React, { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import '../styles/style.css';
import '../styles/modalOverlaybtn.css';
import {
    type CellState,
    CELL_GRADIENT_COLORS,
    // type PrizeSelectionMode,
    // getPrizeItemsByMode,
    // assignPrizesToCells
} from "../types/bongotypes.ts";

// Modal Component (unchanged)
const PrizeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cell: CellState | null;
    cellColors: { topColor: string; bottomColor: string; circleColor: string; };
}> = ({ isOpen, onClose, cell, cellColors }) => {
    if (!isOpen || !cell || !cell.prizeItem) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>✕</button>
                <div className="modal-body">
                    <img
                        src={cell.prizeItem.img}
                        alt={cell.prizeItem.name}
                        className="prize-image"
                    />
                    <div className="modal-header">
                        <div
                            className="modal-cell-preview"
                            style={{
                                background: `linear-gradient(to bottom, ${cellColors.topColor}, ${cellColors.bottomColor})`
                            }}
                        >
                            <div
                                className="modal-circle"
                                style={{ backgroundColor: cellColors.circleColor }}
                            >
                                <div className="modal-cell-number">
                                    {cell.value}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const BongoCanvas: React.FC<{
    cells: CellState[];
    onCellClick: (id: number) => void;
    onRefreshGrid?: () => void;
    onCellChange: Dispatch<SetStateAction<CellState[]>>
}> = ({ cells, onCellClick, onRefreshGrid }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number>(2);

    // State
    const [selectedCellDetails, setSelectedCellDetails] = useState<CellState | null>(null);
    const [revealedTimes, setRevealedTimes] = useState<Record<number, number>>({});
    const [modalColors, setModalColors] = useState({ topColor: '#FFFFFF', bottomColor: '#F0F0F0', circleColor: '#FFFFFF' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [loadedImages, setLoadedImages] = useState<Record<number, HTMLImageElement>>({});

    // Refs
    const hoveredCellRef = useRef<number | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>(3);
    const cellDimensionsRef = useRef({
        cellWidth: 500,
        cellHeight: 500,
        startX: 0,
        startY: 0,
        cellPadding: 15
    });

    // Constants - UPDATED for 8 boxes (2x4 grid)
    const GRID_COLS = 4;  // 4 columns
    const GRID_ROWS = 2;  // 2 rows
    // const TOTAL_CELLS = GRID_COLS * GRID_ROWS; // 8 cells
    const CELL_PADDING = 10;
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 1200;

    // Load prize images
    useEffect(() => {
        const loadImages = async () => {
            const imagePromises = cells.map(cell => {
                return new Promise<void>((resolve) => {
                    if (!cell.prizeItem) {
                        resolve();
                        return;
                    }
                    const img = new Image();
                    img.src = cell.prizeItem.img;
                    img.onload = () => {
                        setLoadedImages(prev => ({ ...prev, [cell.id]: img }));
                        resolve();
                    };
                    img.onerror = () => resolve();
                });
            });
            await Promise.all(imagePromises);
        };
        if (cells.length > 0) loadImages();
    }, [cells]);

    // Toast
    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage({ text, type });
        toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
    }, []);

    // Color utilities
    const lightenColor = (color: string, percent: number): string => {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    };

    const getCircleColor = useCallback((topColor: string, bottomColor: string): string => {
        const r1 = parseInt(topColor.slice(1, 3), 16);
        const g1 = parseInt(topColor.slice(3, 5), 16);
        const b1 = parseInt(topColor.slice(5, 7), 16);
        const r2 = parseInt(bottomColor.slice(1, 3), 16);
        const g2 = parseInt(bottomColor.slice(3, 5), 16);
        const b2 = parseInt(bottomColor.slice(5, 7), 16);

        const avgR = Math.round((r1 + r2) / 2);
        const avgG = Math.round((g1 + g2) / 2);
        const avgB = Math.round((b1 + b2) / 2);

        return lightenColor(`#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`, 25);
    }, []);

    // Handle cell click
    const handleCellClick = useCallback((cellId: number, isKeyboardShortcut: boolean = false) => {
        const cell = cells.find(c => c.id === cellId);
        if (cell && !cell.isRevealed) {
            setRevealedTimes(prev => ({ ...prev, [cellId]: Date.now() }));

            const gradientColors = CELL_GRADIENT_COLORS[cell.id % CELL_GRADIENT_COLORS.length] || ['#FFFFFF', '#F0F0F0'];
            const [topColor, bottomColor] = gradientColors;
            const circleColor = getCircleColor(topColor, bottomColor);

            setModalColors({ topColor, bottomColor, circleColor });
            setSelectedCellDetails(cell);
            onCellClick(cellId);

            setTimeout(() => setIsModalOpen(true), 300);

            if (isKeyboardShortcut) {
                showToast(`Box ${cell.value} opened with shortcut`, 'success');
            }
        } else if (cell?.isRevealed) {
            showToast(`Box ${cell.value} is already opened!`, 'error');
        }
    }, [cells, onCellClick, showToast, getCircleColor]);

    // Close modal
    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedCellDetails(null), 300);
    }, []);

    // Update canvas size
    useEffect(() => {
        const updateCanvasSize = () => {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const container = canvas.parentElement;

                if (!container) return;

                // PRESERVE the 1200x1200 buffer size - DON'T change this
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;

                // Calculate cell dimensions based on the fixed 1200x1200 canvas
                const availableWidth = CANVAS_WIDTH;
                const availableHeight = CANVAS_HEIGHT;

                const cellWidthFromWidth = (availableWidth - (CELL_PADDING * (GRID_COLS - 1))) / GRID_COLS;
                const cellHeightFromHeight = (availableHeight - (CELL_PADDING * (GRID_ROWS - 1))) / GRID_ROWS;

                // Use positive cell size
                let cellSize = Math.min(
                    Math.max(cellWidthFromWidth, 10),
                    Math.max(cellHeightFromHeight, 10)
                );

                // Ensure cell size is reasonable for 1200x1200 canvas
                cellSize = Math.max(cellSize, 200); // Increased min size for 8 boxes

                const totalGridWidth = (cellSize * GRID_COLS) + (CELL_PADDING * (GRID_COLS - 1));
                const totalGridHeight = (cellSize * GRID_ROWS) + (CELL_PADDING * (GRID_ROWS - 1));

                const startX = Math.max(0, (CANVAS_WIDTH - totalGridWidth) / 2);
                const startY = Math.max(0, (CANVAS_HEIGHT - totalGridHeight) / 2);

                cellDimensionsRef.current = {
                    cellWidth: cellSize,
                    cellHeight: cellSize,
                    startX,
                    startY,
                    cellPadding: CELL_PADDING
                };

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                }
            }
        };

        updateCanvasSize();

        const resizeObserver = new ResizeObserver(updateCanvasSize);
        if (canvasRef.current?.parentElement) resizeObserver.observe(canvasRef.current.parentElement);
        window.addEventListener('resize', updateCanvasSize);

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            resizeObserver.disconnect();
        };
    }, []);

    // Get cell at coordinates - Adjusted for 8 cells
    const getCellAtCoordinates = useCallback((x: number, y: number) => {
        const { cellWidth, cellHeight, startX, startY, cellPadding } = cellDimensionsRef.current;

        if (!cellWidth || !cellHeight || cellWidth <= 0 || cellHeight <= 0) return null;

        // Calculate which cell
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const cellX = startX + col * (cellWidth + cellPadding);
                const cellY = startY + row * (cellHeight + cellPadding);

                if (x >= cellX && x <= cellX + cellWidth &&
                    y >= cellY && y <= cellY + cellHeight) {
                    return cells.find(c => c.x === col && c.y === row);
                }
            }
        }
        return null;
    }, [cells]);

    // Get canvas coordinates from event
    const getCanvasCoordinates = useCallback((e: MouseEvent | TouchEvent | PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();

        // Get client coordinates
        let clientX: number, clientY: number;

        if ('touches' in e) {
            clientX = e.touches[0]?.clientX ?? 0;
            clientY = e.touches[0]?.clientY ?? 0;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Calculate scale factors between display size and buffer size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Convert to canvas buffer coordinates (1200x1200 space)
        let canvasX = (clientX - rect.left) * scaleX;
        let canvasY = (clientY - rect.top) * scaleY;

        // Clamp to canvas bounds
        canvasX = Math.max(0, Math.min(canvasX, canvas.width));
        canvasY = Math.max(0, Math.min(canvasY, canvas.height));

        return { x: canvasX, y: canvasY };
    }, []);

    // Pointer event handlers
    const handlePointerMove = useCallback((e: PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        e.preventDefault();

        const coords = getCanvasCoordinates(e);
        if (!coords) return;

        const cell = getCellAtCoordinates(coords.x, coords.y);

        if (cell && !cell.isRevealed) {
            canvas.style.cursor = 'pointer';
            hoveredCellRef.current = cell.id;
        } else {
            canvas.style.cursor = 'default';
            hoveredCellRef.current = null;
        }
    }, [getCanvasCoordinates, getCellAtCoordinates]);

    const handlePointerUp = useCallback((e: PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        e.preventDefault();

        const coords = getCanvasCoordinates(e);
        if (!coords) return;

        const cell = getCellAtCoordinates(coords.x, coords.y);

        if (cell && !cell.isRevealed) {
            handleCellClick(cell.id);
            if (navigator.vibrate) navigator.vibrate(10);
        }

        hoveredCellRef.current = null;
    }, [getCanvasCoordinates, getCellAtCoordinates, handleCellClick]);

    const handlePointerLeave = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.cursor = 'default';
            hoveredCellRef.current = null;
        }
    }, []);

    // Setup event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Prevent default touch behaviors
        canvas.style.touchAction = 'none';
        canvas.style.userSelect = 'none';

        // Add event listeners
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerLeave);
        canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
        });

        // Prevent context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        return () => {
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointerleave', handlePointerLeave);
            canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        };
    }, [handlePointerMove, handlePointerUp, handlePointerLeave]);

    // Drawing functions
    const drawRoundedRectPath = useCallback((
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
    ) => {
        // Ensure radius is not negative and not larger than half the smaller dimension
        const safeRadius = Math.max(0, Math.min(r, w / 2, h / 2));

        ctx.beginPath();
        ctx.moveTo(x + safeRadius, y);
        ctx.lineTo(x + w - safeRadius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + safeRadius);
        ctx.lineTo(x + w, y + h - safeRadius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - safeRadius, y + h);
        ctx.lineTo(x + safeRadius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - safeRadius);
        ctx.lineTo(x, y + safeRadius);
        ctx.quadraticCurveTo(x, y, x + safeRadius, y);
        ctx.closePath();
    }, []);

    const drawCell = useCallback((
        ctx: CanvasRenderingContext2D,
        cell: CellState,
        cellWidth: number,
        cellHeight: number,
        startX: number,
        startY: number,
        cellPadding: number,
        time: number
    ) => {
        // Ensure cell dimensions are positive
        if (cellWidth <= 0 || cellHeight <= 0) return;

        const x = startX + (cell.x * (cellWidth + cellPadding));
        const y = startY + (cell.y * (cellHeight + cellPadding));

        const isHovered = hoveredCellRef.current === cell.id;
        const isRevealed = cell.isRevealed;

        const gradientColors = CELL_GRADIENT_COLORS[cell.id % CELL_GRADIENT_COLORS.length] || ['#FFFFFF', '#F0F0F0'];
        const [topColor, bottomColor] = gradientColors;
        const circleColor = getCircleColor(topColor, bottomColor);

        // Calculate radius - ensure it's positive
        const radius = Math.max(4, Math.min(25, cellWidth * 0.05));

        // Outer shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = Math.min(22, cellWidth * 0.1);
        ctx.shadowOffsetY = Math.min(12, cellHeight * 0.05);
        drawRoundedRectPath(ctx, x, y, cellWidth, cellHeight, radius);
        ctx.fillStyle = bottomColor;
        ctx.fill();
        ctx.restore();

        // Main gradient
        const bodyGradient = ctx.createLinearGradient(x, y, x, y + cellHeight);
        bodyGradient.addColorStop(0, topColor);
        bodyGradient.addColorStop(0.55, topColor);
        bodyGradient.addColorStop(1, bottomColor);

        ctx.save();
        drawRoundedRectPath(ctx, x, y, cellWidth, cellHeight, radius);
        ctx.fillStyle = bodyGradient;
        ctx.fill();
        ctx.restore();

        // Inner bevel
        ctx.save();
        drawRoundedRectPath(ctx, x + 2, y + 2, cellWidth - 4, cellHeight - 4, Math.max(0, radius - 2));
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Gloss effect
        ctx.save();
        drawRoundedRectPath(ctx, x, y, cellWidth, cellHeight, radius);
        ctx.clip();
        const gloss = ctx.createLinearGradient(x, y, x, y + cellHeight * 0.45);
        gloss.addColorStop(0, 'rgba(66,61,61,0.45)');
        gloss.addColorStop(1, 'rgba(42,33,33,0)');
        ctx.fillStyle = gloss;
        ctx.fillRect(x, y, cellWidth, cellHeight * 0.45);
        ctx.restore();

        // Hover effect
        if (isHovered && !isRevealed) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = 20;
            drawRoundedRectPath(ctx, x, y, cellWidth, cellHeight, radius);
            ctx.stroke();
            ctx.restore();
        }

        if (!isRevealed) {
            // Draw circle - ensure radius is positive
            const circleX = x + cellWidth / 2;
            const circleY = y + cellHeight / 2;
            const circleRadius = Math.max(20, Math.min(cellWidth, cellHeight) * 0.2);

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 3;
            ctx.beginPath();
            ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = circleColor;
            ctx.fill();

            ctx.shadowColor = 'rgba(255,255,255,0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 0;
            ctx.beginPath();
            ctx.arc(circleX, circleY, circleRadius - 1, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Draw number
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;
            ctx.fillStyle = '#FFFFFF';
            const fontSize = Math.max(24, Math.min(48, cellHeight * 0.32));
            ctx.font = `800 ${fontSize}px "Montserrat", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.value.toString(), x + cellWidth / 2, y + cellHeight / 2);
            ctx.restore();
        }

        if (isRevealed) {
            // Dark overlay
            ctx.save();
            drawRoundedRectPath(ctx, x, y, cellWidth, cellHeight, radius);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fill();
            ctx.restore();

            const revealTime = revealedTimes[cell.id];
            const isAnimating = revealTime && (Date.now() - revealTime) < 3000;

            // Draw prize image
            if (cell.prizeItem && loadedImages[cell.id]) {
                const img = loadedImages[cell.id];

                ctx.save();
                ctx.translate(x + cellWidth / 2, y + cellHeight / 2);

                if (isAnimating) {
                    const pulseScale = 1 + Math.sin(time * 0.01) * 0.05;
                    ctx.scale(pulseScale, pulseScale);
                }

                const imgSize = Math.min(cellWidth, cellHeight) * 0.7;
                ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
                ctx.restore();
            }

            // Shimmer effect
            if (isAnimating) {
                ctx.save();
                const shimmerOpacity = 0.7 + Math.sin(time * 0.008) * 0.3;
                const shimmerGradient = ctx.createLinearGradient(x, y, x + cellWidth, y + cellHeight);
                shimmerGradient.addColorStop(0, `rgba(255, 215, 0, ${shimmerOpacity})`);
                shimmerGradient.addColorStop(0.5, `rgba(255, 255, 255, ${shimmerOpacity})`);
                shimmerGradient.addColorStop(1, `rgba(255, 215, 0, ${shimmerOpacity})`);

                ctx.strokeStyle = shimmerGradient;
                ctx.lineWidth = 3;
                ctx.shadowColor = `rgba(255, 215, 0, ${shimmerOpacity * 0.8})`;
                ctx.shadowBlur = 20;
                drawRoundedRectPath(ctx, x, y, cellWidth, cellHeight, radius);
                ctx.stroke();
                ctx.restore();
            }
        }
    }, [getCircleColor, loadedImages, revealedTimes, drawRoundedRectPath]);

    // Animation loop
    useEffect(() => {
        const animate = (time: number) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            // Clear canvas - using 1200x1200 buffer size
            ctx.fillStyle = '#191425';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const { cellWidth, cellHeight, startX, startY, cellPadding } = cellDimensionsRef.current;

            if (cellWidth > 0 && cellHeight > 0) {
                // Draw all cells
                cells.forEach(cell => {
                    drawCell(ctx, cell, cellWidth, cellHeight, startX, startY, cellPadding, time);
                });
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [cells, drawCell]);

    // Cleanup revealed times
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setRevealedTimes(prev => {
                const newTimes = { ...prev };
                let hasChanges = false;
                Object.entries(newTimes).forEach(([id, time]) => {
                    if (now - time > 3000) {
                        delete newTimes[Number(id)];
                        hasChanges = true;
                    }
                });
                return hasChanges ? newTimes : prev;
            });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Keyboard shortcuts - UPDATED for 8 boxes
    useEffect(() => {
        const handleKeyboardShortcut = (e: KeyboardEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();

                // Refresh grid
                if (e.key === 'z' || e.key === 'Z') {
                    if (onRefreshGrid) onRefreshGrid();
                    showToast('🔄 Grid reshuffled!', 'success');
                    return;
                }

                // Numbers 1-8 for boxes 1-8
                if (/^[1-8]$/.test(e.key)) {
                    const boxNumber = parseInt(e.key);
                    const cell = cells.find(c => c.value === boxNumber);
                    if (cell && !cell.isRevealed) {
                        handleCellClick(cell.id, true);
                    }
                    return;
                }

                // No shortcuts for boxes 9-12 since we only have 8 boxes now
            }
        };

        window.addEventListener('keydown', handleKeyboardShortcut);
        return () => window.removeEventListener('keydown', handleKeyboardShortcut);
    }, [cells, handleCellClick, onRefreshGrid, showToast]);

    return (
        <div
            className="bingo-canvas-container"
        >
            {toastMessage && (
                <div className="toast-notification" style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: toastMessage.type === 'success' ? '#4caf50' : '#f44336',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '30px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    zIndex: 1000,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    animation: 'slideUp 0.3s ease'
                }}>
                    {toastMessage.text}
                </div>
            )}

            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
            />

            <PrizeModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                cell={selectedCellDetails}
                cellColors={modalColors}
            />
        </div>
    );
};