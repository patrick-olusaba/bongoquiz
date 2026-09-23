import React, { useEffect, useRef } from 'react';

export const AviatorBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        let animId: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        const stars = Array.from({ length: 120 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.8 + 0.3,
            speed: Math.random() * 0.4 + 0.1,
            opacity: Math.random() * 0.7 + 0.3,
            twinkle: Math.random() * Math.PI * 2,
        }));
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.twinkle += 0.02;
                s.y += s.speed;
                if (s.y > canvas.height) { s.y = -4; s.x = Math.random() * canvas.width; }
                const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <div className="aviator-bg">
            {/* Wide purple ambient glow */}
            <div style={{
                position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
                width: '120vw', height: '70vh',
                background: 'radial-gradient(ellipse, rgba(100,0,160,0.35) 0%, rgba(80,0,120,0.15) 45%, transparent 70%)',
                borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none',
            }} />
            {/* Bright pink/magenta center orb */}
            <div style={{
                position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
                width: 600, height: 400,
                background: 'radial-gradient(ellipse, rgba(200,0,150,0.7) 0%, rgba(140,0,200,0.35) 45%, transparent 70%)',
                borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '-5%', left: '25%',
                width: 300, height: 220,
                background: 'radial-gradient(ellipse, rgba(230,0,100,0.5) 0%, transparent 70%)',
                borderRadius: '50%', filter: 'blur(35px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '-5%', right: '15%',
                width: 260, height: 180,
                background: 'radial-gradient(ellipse, rgba(180,0,220,0.45) 0%, transparent 70%)',
                borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none',
            }} />
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        </div>
    );
};