import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import mainLogo from './assets/logo.png';
import logoBg from './assets/bongo-logo.png';
import { BongoMain }       from "./component/game/BongoMain.tsx";
import { AdminLogin, KCSE_EMAIL } from "./component/admin/AdminLogin.tsx";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.ts";

const GameInfoDocs  = lazy(() => import("./component/docs/GameInfoDocs.tsx").then(m => ({ default: m.GameInfoDocs })));
const AdminView     = lazy(() => import("./component/admin/AdminView.tsx").then(m => ({ default: m.AdminView })));
const SummaryView   = lazy(() => import("./component/summary/SummaryView.tsx").then(m => ({ default: m.SummaryView })));
const KCSEPastPapers = lazy(() => import("./component/KCSEPastPapers/KCSEPastPapers.tsx").then(m => ({ default: m.KCSEPastPapers })));
const AdminKCSE     = lazy(() => import("./component/admin/AdminKCSE.tsx").then(m => ({ default: m.AdminKCSE })));
const BibleQuiz     = lazy(() => import("./component/BibleQuiz/App.tsx"));
const BiologyQuiz   = lazy(() => import("./component/BiologyQuiz/App.tsx"));

function KCSEAdminRoute() {
    const navigate = useNavigate();
    const [authed, setAuthed] = useState<boolean | null>(null);
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, user => { setAuthed(!!user); });
        return unsub;
    }, []);
    if (authed === null) return null;
    if (!authed) return <AdminLogin onLogin={() => {}} email={KCSE_EMAIL} label="KCSE Uploader" />;
    return (
        <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f4f5fb", minHeight: "100vh" }}>
            <style>{`html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}`}</style>
            <div style={{ background: "#1a1a2e", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => navigate('/')}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "#aaa" }}>← Back</button>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#ffd200" }}>📄 KCSE Papers — Admin</h2>
            </div>
            <div style={{ padding: 24 }}><AdminKCSE /></div>
        </div>
    );
}

function SummaryRoute() {
    const { id } = useParams<{ id: string }>();
    return <SummaryView summaryId={id!} />;
}

function LoadingScreen() {
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at 30% 40%, #0f0035 0%, #000 45%, #0a001a 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', zIndex: 9999
        }}>
            <div style={{ width: '60px', height: '60px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #FFD700', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontFamily: 'Segoe UI, sans-serif', letterSpacing: '1px' }}>Loading...</p>
            <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
        </div>
    );
}

function App() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const images = [mainLogo, logoBg];
        let loaded = 0;
        images.forEach(src => {
            const img = new Image();
            img.onload = img.onerror = () => { if (++loaded === images.length) setTimeout(() => setLoading(false), 500); };
            img.src = src;
        });
        const timeout = setTimeout(() => setLoading(false), 3000);
        return () => clearTimeout(timeout);
    }, []);

    if (loading) return <LoadingScreen />;

    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                <Route path="/"            element={<BongoMain />} />
                <Route path="/docs"        element={<GameInfoDocs />} />
                <Route path="/admin-main"  element={<AdminView />} />
                <Route path="/kcse"        element={<KCSEPastPapers onBack={() => navigate('/')} />} />
                <Route path="/kcse-admin"  element={<KCSEAdminRoute />} />
                <Route path="/bible-quiz"   element={<BibleQuiz />} />
                <Route path="/bible-admin" element={<AdminView initialTab="biblequiz" />} />
                <Route path="/biology-quiz" element={<BiologyQuiz />} />
                <Route path="/summary/:id" element={<SummaryRoute />} />
            </Routes>
        </Suspense>
    );
}

export default App;
