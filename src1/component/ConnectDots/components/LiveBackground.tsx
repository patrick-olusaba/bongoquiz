import React, { useRef, useEffect } from 'react';

interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    alpha: number;
}

export const LiveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let balls: Ball[] = [];

        const colors = [
            '#f472b6', // pink
            '#c084fc', // purple
            '#34d399', // emerald
            '#fbbf24', // amber
            '#60a5fa', // blue
        ];

        const initBalls = () => {
            balls = [];
            const numBalls = Math.floor((window.innerWidth * window.innerHeight) / 15000);
            const limit = Math.min(Math.max(numBalls, 30), 100);

            for (let i = 0; i < limit; i++) {
                const radius = Math.random() * 8 + 3;
                balls.push({
                    x: Math.random() * (canvas.width - radius * 2) + radius,
                    y: Math.random() * (canvas.height - radius * 2) + radius,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5,
                    radius,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: Math.random() * 0.4 + 0.2,
                });
            }
        };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initBalls();
        };

        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connecting lines between close points
            const maxDistance = 150;
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    const b1 = balls[i];
                    const b2 = balls[j];
                    const dx = b1.x - b2.x;
                    const dy = b1.y - b2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < maxDistance) {
                        ctx.beginPath();
                        ctx.moveTo(b1.x, b1.y);
                        ctx.lineTo(b2.x, b2.y);
                        // Opacity fades as distance increases
                        const lineAlpha = (1 - dist / maxDistance) * Math.min(b1.alpha, b2.alpha);
                        ctx.strokeStyle = b1.color;
                        ctx.globalAlpha = lineAlpha;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                        ctx.closePath();
                    }
                }
            }

            balls.forEach((ball) => {
                // Update position
                ball.x += ball.vx;
                ball.y += ball.vy;

                // Bounce off walls
                if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
                    ball.vx = -ball.vx;
                    ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x));
                }
                if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
                    ball.vy = -ball.vy;
                    ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
                }

                // Draw
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fillStyle = ball.color;
                ctx.globalAlpha = ball.alpha;
                ctx.fill();
                ctx.closePath();
            });

            ctx.globalAlpha = 1.0;
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1,
            }}
        />
    );
};
