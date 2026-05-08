import { useState, useEffect } from "react";

export function PWAInstallBanner() {
    const [show, setShow] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Already installed as PWA
        if (window.matchMedia("(display-mode: standalone)").matches) return;
        // Already dismissed
        if (localStorage.getItem("pwa_banner_dismissed")) return;

        const ua = navigator.userAgent;
        const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
        // Non-Chrome on Android (e.g. MIUI browser, Firefox)
        const androidNonChrome = /android/i.test(ua) && !/chrome/i.test(ua);

        if (ios || androidNonChrome) {
            setIsIOS(ios);
            setShow(true);
        }
    }, []);

    if (!show) return null;

    const dismiss = () => {
        localStorage.setItem("pwa_banner_dismissed", "1");
        setShow(false);
    };

    return (
        <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
            background: "#1a1a2e", borderTop: "1px solid rgba(255,255,255,0.12)",
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        }}>
            <img src="/icon-192.png" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>Install Bongo Quiz</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: 2 }}>
                    {isIOS
                        ? <>Tap <strong style={{ color: "#4da6ff" }}>Share ↑</strong> then <strong style={{ color: "#4da6ff" }}>"Add to Home Screen"</strong></>
                        : <>Open this page in <strong style={{ color: "#4da6ff" }}>Chrome</strong> to install the app</>
                    }
                </div>
            </div>
            <button onClick={dismiss} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.4)",
                fontSize: "1.2rem", cursor: "pointer", padding: "4px 8px", flexShrink: 0,
            }}>✕</button>
        </div>
    );
}
