import { useState, useEffect } from 'react';
import './App.css';
import mainLogo from './assets/logo.png';
import logoBg from './assets/bongo-logo.png';
import { BongoMain }       from "./component/game/BongoMain.tsx";
import { GameInfoDocs }    from "./component/docs/GameInfoDocs.tsx";
import { AdminView }       from "./component/admin/AdminView.tsx";
import { SummaryView }     from "./component/summary/SummaryView.tsx";
import { KCSEPastPapers }  from "./component/KCSEPastPapers/KCSEPastPapers.tsx";
import { AdminKCSE }       from "./component/admin/AdminKCSE.tsx";
import { AdminLogin, KCSE_EMAIL } from "./component/admin/AdminLogin.tsx";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.ts";

function KCSEAdminRoute() {
    const [authed, setAuthed] = useState<boolean | null>(null);
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, user => {
            // Allow KCSE uploader OR full admin
            setAuthed(!!user);
        });
        return unsub;
    }, []);
    if (authed === null) return null;
    if (!authed) return <AdminLogin onLogin={() => {}} email={KCSE_EMAIL} label="KCSE Uploader" />;
    return (
        <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f4f5fb", minHeight: "100vh" }}>
            <style>{`html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}`}</style>
            <div style={{ background: "#1a1a2e", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, marginBottom: 0 }}>
                <button onClick={() => { window.location.hash = "/"; }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "#aaa" }}>← Back</button>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#ffd200" }}>📄 KCSE Papers — Admin</h2>
            </div>
            <div style={{ padding: 24 }}>
                <AdminKCSE />
            </div>
        </div>
    );
}

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
        const images = [mainLogo, logoBg];

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

    if (hash === "#/docs")       return <GameInfoDocs />;
    if (hash === "#/admin-main") return <AdminView />;
    if (hash === "#/kcse")       return <KCSEPastPapers onBack={() => { window.location.hash = "/"; }} />;
    if (hash === "#/kcse-admin") return <KCSEAdminRoute />;
    if (hash === "#/bible-admin") return <AdminView initialTab="biblequiz" />;
    const summaryMatch = hash.match(/^#\/summary\/(.+)$/) || window.location.pathname.match(/^\/summary\/(.+)$/);
    if (summaryMatch) return <SummaryView summaryId={summaryMatch[1]} />;
    return <BongoMain />;
}

export default App;
