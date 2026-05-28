import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import mainLogo from './assets/logo.png';
import logoBg from './assets/bongo-logo.png';
import { BongoMain }       from "./component/game/BongoMain.tsx";
import { PWAInstallBanner } from "./component/PWAInstallBanner.tsx";
import { AdminLogin, KCSE_EMAIL } from "./component/admin/AdminLogin.tsx";
import { AgentLogin } from "./component/support/AgentLogin.tsx";
import type { Agent } from "./component/support/AgentLogin.tsx";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase.ts";

const GameInfoDocs  = lazy(() => import("./component/docs/GameInfoDocs.tsx").then(m => ({ default: m.GameInfoDocs })));
const AdminView     = lazy(() => import("./component/admin/AdminView.tsx").then(m => ({ default: m.AdminView })));
const SummaryView   = lazy(() => import("./component/summary/SummaryView.tsx").then(m => ({ default: m.SummaryView })));
const KCSEPastPapers = lazy(() => import("./component/KCSEPastPapers/KCSEPastPapers.tsx").then(m => ({ default: m.KCSEPastPapers })));
const AdminKCSE     = lazy(() => import("./component/admin/AdminKCSE.tsx").then(m => ({ default: m.AdminKCSE })));
const StreetBongoAdminRoute = lazy(() => import("./component/admin/StreetBongoAdminRoute.tsx"));
const SupportView    = lazy(() => import("./component/support/SupportView.tsx").then(m => ({ default: m.SupportView })));
const ContactSupport = lazy(() => import("./component/support/ContactSupport.tsx").then(m => ({ default: m.ContactSupport })));
const AdminSupport   = lazy(() => import("./component/support/AdminSupport.tsx").then(m => ({ default: m.AdminSupport })));
const SupportDashboard = lazy(() => import("./component/support/SupportDashboard.tsx").then(m => ({ default: m.SupportDashboard })));
const TermsPage      = lazy(() => import("./component/legal/LegalPages.tsx").then(m => ({ default: m.TermsPage })));
const PrivacyPage    = lazy(() => import("./component/legal/LegalPages.tsx").then(m => ({ default: m.PrivacyPage })));
const ResponsiblePlayPage = lazy(() => import("./component/legal/LegalPages.tsx").then(m => ({ default: m.ResponsiblePlayPage })));
const BibleQuiz     = lazy(() => import("./component/BibleQuiz/App.tsx"));
const BiologyQuiz   = lazy(() => import("./component/BiologyQuiz/App.tsx"));
const MathQuiz      = lazy(() => import("./component/MathQuiz/App.tsx"));
const GeneralKnowledge = lazy(() => import("./component/GeneralKnowledgeQuiz/App.tsx"));
const SudokuGame = lazy(() => import("./component/Sudoku/App.tsx"));
const StreetBongo = lazy(() => import("./component/StreetBongo/StreetBongo.tsx"));
const ConnectDots = lazy(() => import("./component/ConnectDots/App.tsx"));

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

function SupportAdminRoute() {
    const navigate = useNavigate();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [tab, setTab] = useState<"chats" | "dashboard">("chats");

    if (!agent) return <AgentLogin onLogin={setAgent} />;

    return (
        <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f4f5fb", minHeight: "100vh" }}>
            <style>{`h tml,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}`}</style>
            <div style={{ background: "#1a1a2e", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => navigate('/')} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "#aaa", fontFamily: "inherit" }}>← Back</button>
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "#ffd200", flex: 1 }}>💬 Support Portal</span>
                <button onClick={() => setTab("chats")} style={{ background: tab === "chats" ? "#4361ee" : "transparent", border: "none", borderRadius: 6, padding: "5px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" }}>Chats</button>
                <button onClick={() => setTab("dashboard")} style={{ background: tab === "dashboard" ? "#4361ee" : "transparent", border: "none", borderRadius: 6, padding: "5px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" }}>Dashboard</button>
                <span style={{ color: "#aaa", fontSize: "0.78rem" }}>{agent.name}</span>
                <button onClick={() => { signOut(auth); setAgent(null); }} style={{ background: "#ef4444", border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", cursor: "pointer", fontSize: "0.78rem", fontFamily: "inherit" }}>Logout</button>
            </div>
            <div style={{ padding: 20 }}>
                {tab === "chats"
                    ? <AdminSupport agent={agent} />
                    : <SupportDashboard agent={agent} />}
            </div>
        </div>
    );
}


function SummaryRoute() {
    const { id } = useParams<{ id: string }>();
    return <SummaryView summaryId={id!} />;
}

function LoadingScreen() {
    return (
        <div className="loader-main">


                <div className="app-loader-orbit" aria-hidden="true">
                    <span/>
                </div>

            <style>{`
                .app-loader { position:fixed; inset:0; z-index:9999; min-height:100dvh; display:grid; place-items:center; padding:22px; box-sizing:border-box; color:#fff; font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:repeating-linear-gradient(90deg,rgba(125,211,252,.055) 0 1px,transparent 1px 92px),repeating-linear-gradient(0deg,rgba(255,211,61,.045) 0 1px,transparent 1px 92px),linear-gradient(135deg,#090014,#180024 48%,#03111c); }
                .app-loader-board { position:relative; width:min(100%,440px); min-height:270px; padding:clamp(20px,4vw,34px); border:1px solid rgba(125,211,252,.28); border-radius:8px; box-sizing:border-box; display:grid; align-content:center; gap:24px; overflow:hidden; background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.035)),rgba(5,8,24,.76); box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 28px 84px rgba(0,0,0,.46); }
                .app-loader-board::before { content:""; position:absolute; inset:12px; border:1px solid rgba(255,211,61,.14); border-radius:6px; pointer-events:none; }
                .app-loader-brand { position:relative; display:grid; grid-template-columns:88px minmax(0,1fr); align-items:center; gap:16px; }
                .app-loader-brand img { width:88px; height:88px; object-fit:contain; border:1px solid rgba(255,211,61,.32); border-radius:8px; background:rgba(0,0,0,.28); box-shadow:0 12px 30px rgba(0,0,0,.3); }
                .app-loader-brand span { display:block; width:fit-content; margin-bottom:8px; padding:6px 9px; border-radius:6px; background:#7dd3fc; color:#04111f; font-size:.72rem; font-weight:950; text-transform:uppercase; }
                .app-loader-brand strong { display:block; font-size:clamp(1.8rem,7vw,3.15rem); line-height:.96; letter-spacing:0; text-shadow:0 4px 0 rgba(0,0,0,.28); }
                .app-loader-orbit { position:relative; width:112px; height:112px; margin:auto; display:grid; place-items:center; border-radius:50%; background:radial-gradient(circle,rgba(6,182,212,.1),rgba(0,0,0,.12) 54%,transparent 70%); }
                .app-loader-orbit::before { content:""; width:72px; height:72px; border:3px solid rgba(34,211,238,.92); border-right-color:rgba(34,211,238,.16); border-radius:50%; box-shadow:inset 0 0 18px rgba(34,211,238,.08),0 0 20px rgba(34,211,238,.28); }
                .app-loader-orbit span { position:absolute; inset:8px; border:5px solid transparent; border-left-color:#00efff; border-bottom-color:#00efff; border-radius:50%; filter:drop-shadow(0 0 8px rgba(0,239,255,.95)); animation:app-loader-orbit 1.1s cubic-bezier(.55,.1,.35,.92) infinite; }
                .app-loader-board p { position:relative; margin:0; color:rgba(255,255,255,.76); font-size:.92rem; font-weight:750; }
                @keyframes app-loader-orbit { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
                @media (max-width:480px) { .app-loader { padding:14px; } .app-loader-board { min-height:248px; gap:18px; } .app-loader-brand { grid-template-columns:66px minmax(0,1fr); gap:12px; } .app-loader-brand img { width:66px; height:66px; } .app-loader-orbit { width:96px; height:96px; } .app-loader-orbit::before { width:62px; height:62px; } }
            `}</style>
        {/*</div>*/}
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
            <PWAInstallBanner />
            <Routes>
                <Route path="/"            element={<BongoMain />} />
                <Route path="/docs"        element={<GameInfoDocs />} />
                <Route path="/admin-main"  element={<AdminView />} />
                <Route path="/kcse"        element={<KCSEPastPapers onBack={() => navigate('/')} />} />
                <Route path="/kcse-admin"  element={<KCSEAdminRoute />} />
                <Route path="/bible-quiz"   element={<BibleQuiz />} />
                <Route path="/bible-admin" element={<AdminView initialTab="biblequiz" />} />
                <Route path="/street-bongo-admin" element={<StreetBongoAdminRoute />} />
                <Route path="/biology-quiz" element={<BiologyQuiz />} />
                <Route path="/math-quiz"    element={<MathQuiz />} />
                <Route path="/general-knowledge" element={<GeneralKnowledge />} />
                <Route path="/sudoku" element={<SudokuGame />} />
                <Route path="/street-bongo" element={<StreetBongo />} />
                <Route path="/connect-dots" element={<ConnectDots />} />

                <Route path="/summary/:id" element={<SummaryRoute />} />
                <Route path="/support"        element={<SupportView />} />
                <Route path="/contact"        element={<ContactSupport />} />
                <Route path="/support-admin"  element={<SupportAdminRoute />} />
                <Route path="/terms"       element={<TermsPage />} />
                <Route path="/privacy"     element={<PrivacyPage />} />
                <Route path="/responsible" element={<ResponsiblePlayPage />} />
            </Routes>
        </Suspense>
    );
}

export default App;
