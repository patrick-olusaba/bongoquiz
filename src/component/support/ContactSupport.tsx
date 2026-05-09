import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
// import { MessageCircle, Mail } from "lucide-react";

// const WhatsAppIcon = () => (
//     <svg viewBox="0 0 24 24" width="22" height="22" fill="#4ade80">
//         <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
//         <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.428a.75.75 0 0 0 .916.916l5.57-1.476A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.205-1.432l-.374-.222-3.875 1.027 1.027-3.875-.222-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
//     </svg>
// );

// const SUPPORT_EMAIL = "support@bongoquiz.com";
// const WHATSAPP_NUMBER = "254700000000";
// const WHATSAPP_MSG = encodeURIComponent("");
// const WHATSAPP_MSG = encodeURIComponent("Hi Bongo Quiz Support, I need help with...");

const CHANNELS = [
    { icon: <MessageCircle size={22} color="#818cf8" />, title: "Live Chat",     badge: "Fastest",   desc: "Talk to a real person right now", action: "Start Chat", href: "#live-chat",                                                       color: "#818cf8" },
    // { icon: <Mail         size={22} color="#38bdf8" />, title: "Email Support", badge: "24h reply", desc: SUPPORT_EMAIL,                     action: "Send Email", href: `mailto:${SUPPORT_EMAIL}?subject=Bongo Quiz Support`,               color: "#38bdf8" },
    // { icon: <WhatsAppIcon />,                           title: "WhatsApp",      badge: "Quick",     desc: "Message us on WhatsApp",          action: "Chat Now",   href: `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`,            color: "#4ade80" },
];

const FAQS = [
    { q: "How do I join a game?",           a: "Tap 'Play Now', enter your name and phone number, then wait for the game to start." },
    { q: "I paid but didn't get access",    a: "Payments process within 1–2 minutes. If longer, contact us via Live Chat with your M-Pesa transaction code." },
    { q: "Can I play on iPhone?",           a: "Yes! Open in Safari → tap Share → Add to Home Screen to install as an app." },
    { q: "I lost connection during a game", a: "Refresh and rejoin — your progress is saved. If points were lost, contact support with your player name." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div onClick={() => setOpen(o => !o)} style={{ borderRadius: 10, cursor: "pointer", border: `1px solid ${open ? "rgba(129,140,248,0.35)" : "rgba(255,255,255,0.1)"}`, background: open ? "rgba(129,140,248,0.1)" : "rgba(255,255,255,0.04)", transition: "all 0.18s" }}>
            <div style={{ padding: "13px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.87rem", fontWeight: 600, color: open ? "#c7d2fe" : "#e2e8f0", lineHeight: 1.3 }}>{q}</span>
                <span style={{ fontSize: "1.1rem", color: open ? "#818cf8" : "rgba(255,255,255,0.4)", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.18s", flexShrink: 0, lineHeight: 1 }}>+</span>
            </div>
            {open && <div style={{ padding: "0 14px 13px", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.7 }}>{a}</div>}
        </div>
    );
}

export function ContactSupport() {
    const navigate = useNavigate();

    const handleChannel = (href: string) => {
        if (href === "#live-chat") {
            navigate("/");
            setTimeout(() => window.dispatchEvent(new CustomEvent("bongo:open-chat")), 300);
            return;
        }
        window.open(href, "_blank", "noopener");
    };

    return (
        <div style={{ minHeight: "100vh", width: "100%", boxSizing: "border-box", overflowX: "hidden", background: "linear-gradient(160deg,#1e0050 0%,#0d001a 50%,#000 100%)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#fff" }}>
            <style>{`*{box-sizing:border-box}html,body{overflow-x:hidden!important;overflow-y:auto!important;height:auto!important;display:block!important;place-items:unset!important;margin:0;padding:0}`}</style>

            {/* Header */}
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10 }}>
                <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#e2e8f0", cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit", borderRadius: 7, padding: "6px 12px", whiteSpace: "nowrap" }}>← Back</button>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Support</span>
            </div>

            {/* Content — constrained, no overflow */}
            <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", padding: "28px 14px 48px" }}>

                {/* Hero */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", margin: "0 auto 14px", boxShadow: "0 0 32px rgba(99,102,241,0.5)" }}>🎧</div>
                    <h2 style={{ margin: "0 0 6px", fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>How can we help?</h2>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Pick a channel or browse the FAQs</p>
                </div>

                {/* Channel cards — stacked, full width */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    {CHANNELS.map(ch => (
                        <button key={ch.title} onClick={() => handleChannel(ch.href)}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", display: "grid", gridTemplateColumns: "44px 1fr auto", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", width: "100%" }}>
                            {/* Icon */}
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ch.color}18`, border: `1.5px solid ${ch.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                                {ch.icon}
                            </div>
                            {/* Text */}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9" }}>{ch.title}</span>
                                    <span style={{ background: `${ch.color}25`, color: ch.color, borderRadius: 20, padding: "1px 8px", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>{ch.badge}</span>
                                </div>
                                <div style={{ fontSize: "0.77rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.desc}</div>
                            </div>
                            {/* CTA */}
                            <div style={{ background: ch.color, color: "#000", borderRadius: 9, padding: "8px 13px", fontSize: "0.75rem", fontWeight: 800, whiteSpace: "nowrap", fontFamily: "inherit" }}>
                                {ch.action}
                            </div>
                        </button>
                    ))}
                </div>

                {/* FAQ divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.08em" }}>FREQUENTLY ASKED</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>

                {/* FAQs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {FAQS.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
                </div>

                <p style={{ textAlign: "center", color: "#475569", fontSize: "0.73rem", marginTop: 28 }}>
                    🕐 Support hours: Mon–Sat, 8am–8pm EAT
                </p>
            </div>
        </div>
    );
}
