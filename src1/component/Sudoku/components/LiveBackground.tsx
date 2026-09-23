import { useEffect, useRef } from 'react';

export function LiveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const particles: { x: number; y: number; char: string; speed: number; size: number; opacity: number; direction: number }[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        const chars = '123456789'.split('');

        const createParticle = () => {
            const direction = Math.random() > 0.5 ? 1 : -1;
            return {
                x: Math.random() * canvas.width,
                y: direction === 1 ? -50 : canvas.height + 50,
                char: chars[Math.floor(Math.random() * chars.length)],
                speed: (Math.random() * 0.8 + 0.2) * direction,
                size: Math.random() * 24 + 12,
                opacity: Math.random() * 0.4 + 0.6,
                direction
            };
        };

        for (let i = 0; i < 40; i++) {
            particles.push({
                ...createParticle(),
                y: Math.random() * canvas.height
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                ctx.font = `bold ${p.size}px monospace`;
                ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`;
                ctx.shadowBlur = 15;
                ctx.shadowColor = `rgba(168, 85, 247, ${p.opacity * 2})`;

                ctx.fillText(p.char, p.x, p.y);

                p.y += p.speed;

                if ((p.direction === 1 && p.y > canvas.height + 50) ||
                    (p.direction === -1 && p.y < -50)) {
                    Object.assign(p, createParticle());
                }
            });

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
                zIndex: 0,
                opacity: 1
            }}
        />
    );
}
