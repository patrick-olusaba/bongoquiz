import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { AdminLogin, KCSE_EMAIL } from "./AdminLogin";
import { AdminStreetBongo } from "./AdminStreetBongo";

export default function StreetBongoAdminRoute() {
    const navigate = useNavigate();
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        return onAuthStateChanged(auth, user => {
            setAuthed(!!user && user.email !== KCSE_EMAIL);
        });
    }, []);

    if (authed === null) return null;
    if (!authed) return <AdminLogin onLogin={() => {}} label="Street Bongo Admin" />;

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f4f5fb",
            fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        }}>
            <style>{`html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}`}</style>
            <header style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 24px",
                background: "#1a1a2e",
            }}>
                <button
                    onClick={() => navigate("/street-bongo")}
                    style={{
                        border: "none",
                        background: "none",
                        color: "#aaa",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                    }}
                >
                    ← Back to Street Bongo
                </button>
                <h1 style={{
                    flex: 1,
                    margin: 0,
                    color: "#ffd200",
                    fontSize: "1.05rem",
                    fontWeight: 800,
                }}>
                    🎤 Street Bongo Admin
                </h1>
                <button
                    onClick={() => signOut(auth)}
                    style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,100,100,0.3)",
                        background: "rgba(255,80,80,0.12)",
                        color: "#ff8080",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                    }}
                >
                    Logout
                </button>
            </header>
            <main style={{ padding: 24 }}>
                <AdminStreetBongo />
            </main>
        </div>
    );
}
