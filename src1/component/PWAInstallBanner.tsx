import { useState, useEffect } from "react";

export function PWAInstallBanner() {
    const [show, setShow] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        if (window.matchMedia("(display-mode: standalone)").matches) return;
        if (localStorage.getItem("pwa_banner_dismissed")) return;

        const ua = navigator.userAgent;
        const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
        if (ios) return;

        // Always show banner — install button only works on HTTPS with Chrome
        setShow(false);

        const existing = (window as any).__pwaInstallPrompt;
        if (existing) { setDeferredPrompt(existing); return; }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler as EventListener);
        return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
    }, []);

    if (!show) return null;

    const dismiss = () => { localStorage.setItem("pwa_banner_dismissed", "1"); setShow(false); };

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setShow(false);
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
    };

    return (
        <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
            background: "#1a1a2e", borderTop: "2px solid #4da6ff",
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        }}>
            <img src="/icon-192.png" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} alt="" />
            <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>Install Bongo Quiz</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: 2 }}>
                    {deferredPrompt
                        ? "Tap Install to add the app to your phone"
                        : "Open in Chrome on HTTPS to install"
                    }
                </div>
            </div>
            {deferredPrompt && (
                <button onClick={install} style={{
                    background: "#4da6ff", border: "none", color: "#fff",
                    fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                    padding: "9px 16px", borderRadius: 8, flexShrink: 0,
                }}>Install</button>
            )}
            <button onClick={dismiss} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.4)",
                fontSize: "1.3rem", cursor: "pointer", padding: "4px 8px", flexShrink: 0,
            }}>✕</button>
        </div>
    );
}
