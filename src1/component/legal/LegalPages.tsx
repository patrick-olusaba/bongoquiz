// LegalPages.tsx — Terms, Privacy Policy, Responsible Play — Sidebar TOC layout
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const DARK = "rgba(10,0,26,0.95)";

const S = {
    p:  { color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.85, margin: "0 0 14px" } as React.CSSProperties,
    li: { color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.85, marginBottom: 6 } as React.CSSProperties,
    ul: { paddingLeft: 20, margin: "0 0 14px" } as React.CSSProperties,
};

function LegalLayout({ title, badge, sections, children }: {
    title: string; badge: string;
    sections: { id: string; label: string }[];
    children: React.ReactNode;
}) {
    const navigate = useNavigate();
    const [active, setActive] = useState(sections[0]?.id ?? "");

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0035 0%,#050010 50%,#000 100%)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#fff" }}>
            <style>{`html,body{overflow-x:hidden!important;overflow-y:auto!important;height:auto!important;width:100%!important;display:block!important;place-items:unset!important;align-items:unset!important;justify-content:unset!important}`}</style>

            {/* Sticky top bar */}
            <div style={{ position: "sticky", top: 0, zIndex: 100, background: DARK, borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(10px)", padding: "13px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#e2e8f0", cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit", borderRadius: 7, padding: "6px 12px", whiteSpace: "nowrap" }}>← Back</button>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>{title}</span>
                <span style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", borderRadius: 20, padding: "2px 10px", fontSize: "0.68rem", fontWeight: 700 }}>{badge}</span>
            </div>

            {/* Body: sidebar + content */}
            <div style={{ display: "flex", maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>

                {/* Desktop sidebar — hidden on mobile */}
                <aside className="legal-sidebar" style={{ width: 200, flexShrink: 0, paddingTop: 32 }}>
                    <div style={{ position: "sticky", top: 72 }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Contents</div>
                        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {sections.map(s => (
                                <button key={s.id} onClick={() => setActive(s.id)}
                                    style={{ background: active === s.id ? "rgba(99,102,241,0.15)" : "none", border: "none", textAlign: "left", cursor: "pointer", padding: "7px 10px", borderRadius: 7, fontSize: "0.8rem", fontFamily: "inherit", color: active === s.id ? "#a5b4fc" : "#64748b", fontWeight: active === s.id ? 600 : 400, transition: "all 0.15s", borderLeft: `2px solid ${active === s.id ? "#818cf8" : "transparent"}` } as React.CSSProperties}>
                                    {s.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main content */}
                <main style={{ flex: 1, minWidth: 0, padding: "24px 0 32px 32px", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Mobile pill row — shown only on mobile */}
                    <div className="legal-pills" style={{ display: "none", overflowX: "auto", gap: 8, paddingBottom: 16, marginBottom: 16, WebkitOverflowScrolling: "touch" as any }}>
                        {sections.map(s => (
                            <button key={s.id} onClick={() => setActive(s.id)}
                                style={{ flexShrink: 0, background: active === s.id ? "linear-gradient(135deg,#6366f1,#a855f7)" : "rgba(255,255,255,0.07)", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: "0.78rem", fontWeight: active === s.id ? 700 : 400, color: active === s.id ? "#fff" : "#94a3b8", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const, boxShadow: active === s.id ? "0 2px 12px rgba(99,102,241,0.4)" : "none" }}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <style>{`
                        @media(max-width:600px){
                            .legal-sidebar{display:none!important}
                            .legal-pills{display:flex!important}
                            main{padding-left:0!important;border-left:none!important}
                        }
                    `}</style>
                    <p style={{ color: "#475569", fontSize: "0.75rem", marginBottom: 24 }}>Last updated: May 2026</p>
                    {React.Children.map(children, child =>
                        React.isValidElement(child)
                            ? React.cloneElement(child as React.ReactElement<any>, { _active: active })
                            : child
                    )}
                </main>
            </div>
        </div>
    );
}

function Section({ id, title, children, _active }: { id: string; title: string; children: React.ReactNode; _active?: string }) {
    if (_active && _active !== id) return null;
    return (
        <section id={id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 3, height: 22, borderRadius: 2, background: "linear-gradient(#818cf8,#a855f7)", flexShrink: 0 }} />
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#e2e8f0" }}>{title}</h2>
            </div>
            {children}
        </section>
    );
}

// ── Terms ─────────────────────────────────────────────────────────────────────
const TERMS_SECTIONS = [
    { id: "eligibility",   label: "1. Eligibility" },
    { id: "payments",      label: "2. Payments" },
    { id: "scoring",       label: "3. Scoring & Powers" },
    { id: "show",          label: "4. Show Selection" },
    { id: "fairplay",      label: "5. Fair Play" },
    { id: "liability",     label: "6. Liability" },
    { id: "changes",       label: "7. Changes" },
    { id: "contact",       label: "8. Contact" },
];

export function TermsPage() {
    return (
        <LegalLayout title="Terms & Conditions" badge="Legal" sections={TERMS_SECTIONS}>
            <p style={S.p}>By accessing or using Bongo Quiz, you agree to be bound by these Terms and Conditions. Please read them carefully before participating in any game.</p>
            <Section id="eligibility" title="1. Eligibility">
                <ul style={S.ul}>
                    <li style={S.li}>You must be at least 18 years of age to participate.</li>
                    <li style={S.li}>You must be a resident of Kenya with a valid M-Pesa registered phone number.</li>
                    <li style={S.li}>One account per person. Multiple accounts will be disqualified.</li>
                </ul>
            </Section>
            <Section id="payments" title="2. Game Entry & Payments">
                <p style={S.p}>Entry fees are KES 20 for Rounds 1 & 2 and KES 10 for Round 3 (Spin). Payments are processed via M-Pesa STK Push. Entry fees are non-refundable once a game session has started.</p>
            </Section>
            <Section id="scoring" title="3. Scoring & Powers">
                <p style={S.p}>Scores are calculated server-side based on correct answers, time remaining, and the power selected at the start of each session. Power effects are applied automatically and are final. Bongo Quiz reserves the right to adjust scoring rules at any time.</p>
            </Section>
            <Section id="show" title="4. Show Selection & Competition">
                <ul style={S.ul}>
                    <li style={S.li}>Top-performing players may be selected and contacted to compete on the <strong style={{ color: "#e2e8f0" }}>Bongo Quiz Show</strong> — a live televised/hosted competition.</li>
                    <li style={S.li}>Selection is based on leaderboard performance, consistency, and availability.</li>
                    <li style={S.li}>Being contacted does not guarantee a spot on the show — final selection is at Bongo Quiz's discretion.</li>
                    <li style={S.li}>Prize details for the show will be communicated directly to selected participants.</li>
                </ul>
            </Section>
            <Section id="fairplay" title="5. Fair Play">
                <p style={S.p}>Use of bots, scripts, or any automated tools is strictly prohibited and will result in permanent disqualification. All game logic is processed server-side to ensure fairness.</p>
            </Section>
            <Section id="liability" title="6. Limitation of Liability">
                <p style={S.p}>Bongo Quiz is provided "as is". We are not liable for any losses arising from technical failures, payment delays, or interruptions beyond our control.</p>
            </Section>
            <Section id="changes" title="7. Changes to Terms">
                <p style={S.p}>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
            </Section>
            <Section id="contact" title="8. Contact">
                <p style={S.p}>For questions about these terms, contact us at <a href="mailto:support@bongoquiz.com" style={{ color: "#818cf8" }}>support@bongoquiz.com</a>.</p>
            </Section>
        </LegalLayout>
    );
}

// ── Privacy ───────────────────────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
    { id: "collect",  label: "1. Data We Collect" },
    { id: "use",      label: "2. How We Use It" },
    { id: "sharing",  label: "3. Data Sharing" },
    { id: "storage",  label: "4. Data Storage" },
    { id: "cookies",  label: "5. Cookies" },
    { id: "changes",  label: "6. Changes" },
];

export function PrivacyPage() {
    return (
        <LegalLayout title="Privacy Policy" badge="Legal" sections={PRIVACY_SECTIONS}>
            <p style={S.p}>Bongo Quiz is committed to protecting your personal information. This policy explains what data we collect, how we use it, and your rights.</p>
            <Section id="collect" title="1. Data We Collect">
                <ul style={S.ul}>
                    <li style={S.li}><strong style={{ color: "#e2e8f0" }}>Phone number</strong> — used to process M-Pesa payments and identify your account.</li>
                    <li style={S.li}><strong style={{ color: "#e2e8f0" }}>Display name</strong> — shown on the leaderboard.</li>
                    <li style={S.li}><strong style={{ color: "#e2e8f0" }}>Game scores & session data</strong> — stored to maintain leaderboards and game history.</li>
                    <li style={S.li}><strong style={{ color: "#e2e8f0" }}>Payment records</strong> — transaction IDs and amounts, provided by M-Pesa.</li>
                </ul>
            </Section>
            <Section id="use" title="2. How We Use Your Data">
                <ul style={S.ul}>
                    <li style={S.li}>To process game entry payments.</li>
                    <li style={S.li}>To display your name and score on the leaderboard.</li>
                    <li style={S.li}>To provide customer support.</li>
                    <li style={S.li}>To detect and prevent fraud.</li>
                </ul>
            </Section>
            <Section id="sharing" title="3. Data Sharing">
                <p style={S.p}>We do not sell your personal data. We share data only with M-Pesa (Safaricom) for payment processing.</p>
            </Section>
            <Section id="storage" title="4. Data Storage">
                <p style={S.p}>Your data is stored securely. We retain game session data for up to 12 months. Payment records are retained as required by Kenyan financial regulations.</p>
            </Section>
            <Section id="cookies" title="5. Cookies & Local Storage">
                <p style={S.p}>We use browser local storage to save your name, phone number, and game preferences on your device. No third-party tracking cookies are used.</p>
            </Section>
            <Section id="changes" title="6. Changes">
                <p style={S.p}>We may update this policy periodically. We will notify users of significant changes via the app.</p>
            </Section>
        </LegalLayout>
    );
}

// ── Responsible Play ──────────────────────────────────────────────────────────
const RESPONSIBLE_SECTIONS = [
    { id: "means",    label: "Play Within Your Means" },
    { id: "signs",    label: "Signs of Problem Gaming" },
    { id: "age",      label: "Age Restriction" },
    { id: "contact",  label: "Contact Us" },
];

export function ResponsiblePlayPage() {
    return (
        <LegalLayout title="Responsible Play" badge="Player Safety" sections={RESPONSIBLE_SECTIONS}>
            <p style={S.p}>Bongo Quiz is a skill-based trivia game where top players are selected to compete on the <strong style={{ color: "#e2e8f0" }}>Bongo Quiz Show</strong>. We are committed to ensuring our platform is enjoyed safely and responsibly.</p>
            <Section id="means" title="Play Within Your Means">
                <p style={S.p}>Only spend what you can afford. Set a personal budget before playing and stick to it. Entry fees are entertainment costs — treat them as such.</p>
            </Section>
            <Section id="signs" title="Signs of Problem Gaming">
                <ul style={S.ul}>
                    <li style={S.li}>Spending more than you planned or can afford.</li>
                    <li style={S.li}>Playing to recover money you've lost.</li>
                    <li style={S.li}>Neglecting work, family, or responsibilities to play.</li>
                    <li style={S.li}>Feeling anxious or irritable when not playing.</li>
                </ul>
            </Section>
            <Section id="age" title="Age Restriction">
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px" }}>
                    <p style={{ ...S.p, color: "#fca5a5", margin: 0, fontWeight: 600 }}>🔞 Bongo Quiz is strictly for players aged 18 and above. If you are under 18, please do not participate.</p>
                </div>
            </Section>
            <Section id="contact" title="Contact Us">
                <p style={S.p}>To raise a responsible play concern, contact us at <a href="mailto:support@bongoquiz.com" style={{ color: "#818cf8" }}>support@bongoquiz.com</a> or use the <a href="/contact" style={{ color: "#818cf8" }}>Live Chat</a>.</p>
            </Section>
        </LegalLayout>
    );
}
