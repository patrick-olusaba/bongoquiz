import { useState, useEffect } from 'react';
import './App.css';
import { BongoMain }    from "./component/game/BongoMain.tsx";
import { GameInfoDocs } from "./component/docs/GameInfoDocs.tsx";
import { AdminView }    from "./component/admin/AdminView.tsx";

function App() {
    const [hash, setHash] = useState(window.location.hash);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const onHash = () => setHash(window.location.hash);
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
    }, []);

    useEffect(() => {
        // Preload critical images
        const images = [
            '/logo-bg.png',
            '/main-logo.png',
            // Add other critical images here
        ];

        let loadedCount = 0;
        const totalImages = images.length;

        if (totalImages === 0) {
            setLoading(false);
            return;
        }

        images.forEach(src => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                    setTimeout(() => setLoading(false), 500); // Small delay for smooth transition
                }
            };
            img.src = src;
        });

        // Fallback timeout
        const timeout = setTimeout(() => setLoading(false), 3000);
        return () => clearTimeout(timeout);
    }, []);

    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'radial-gradient(ellipse at 30% 40%, #0f0035 0%, #000 45%, #0a001a 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                zIndex: 9999
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderTop: '4px solid #FFD700',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.9rem',
                    fontFamily: 'Segoe UI, sans-serif',
                    letterSpacing: '1px'
                }}>Loading...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (hash === "#/docs")  return <GameInfoDocs />;
    if (hash === "#/admin") return <AdminView />;
    return <BongoMain />;
}

export default App;
