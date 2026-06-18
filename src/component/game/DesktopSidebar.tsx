// DesktopSidebar — shared left rail used across the app (Home, Community,
// Tournament play). On desktop it's an always-available rail that can be
// collapsed; on mobile it's a slide-in drawer toggled by a hamburger. It also
// hosts the menu actions (How to Play, Share, Log Out, …) via the `actions` prop.
import { type FC, type ReactNode, useEffect, useState } from "react";
import { Gamepad2, Home, Medal, Menu, Trophy, User, X } from "lucide-react";
import brandLogo from "../../assets/logo.png";
import { initials } from "../../utils/tournaments.ts";
import "../../styles/Sidebar.css";

export type SidebarKey =
    | "home" | "tournaments" | "games" | "leaderboard"
    | "community" | "profile" | "rewards" | "wallet" | "market" | "alerts";

export interface SidebarAction {
    key: string;
    label: string;
    sub?: string;
    icon: ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface Props {
    active: SidebarKey;
    onNavigate: (key: SidebarKey) => void;
    playerName?: string;
    subtitle?: string;
    points?: number;
    actions?: SidebarAction[];
    // When false, the rail behaves like the original static sidebar (visible on
    // desktop, hidden on mobile) — no floating hamburger opener or close toggle.
    // Used on inner pages that already have their own back button + bottom nav.
    collapsible?: boolean;
}

const ITEMS: { key: SidebarKey; label: string; Icon: typeof Home }[] = [
    { key: "home",        label: "Home",        Icon: Home },
    { key: "tournaments", label: "Tournaments", Icon: Trophy },
    { key: "games",       label: "Games",       Icon: Gamepad2 },
    { key: "leaderboard", label: "Leaderboard", Icon: Medal },
    { key: "profile",     label: "Profile",     Icon: User },
];

const isDesktop = () => typeof window !== "undefined" && window.innerWidth >= 1024;

export const DesktopSidebar: FC<Props> = ({ active, onNavigate, playerName = "Player", subtitle, points, actions, collapsible = true }) => {
    // Open by default on desktop, collapsed on mobile.
    const [open, setOpen] = useState(isDesktop);

    // Let any part of the app (e.g. the home top bar's Menu button) toggle the drawer.
    useEffect(() => {
        const toggle = () => setOpen(o => !o);
        window.addEventListener("bongo:toggle-sidebar", toggle);
        return () => window.removeEventListener("bongo:toggle-sidebar", toggle);
    }, []);

    const closeOnMobile = () => { if (!isDesktop()) setOpen(false); };

    const handleNav = (key: SidebarKey) => { onNavigate(key); closeOnMobile(); };
    const handleAction = (action: SidebarAction) => { action.onClick(); closeOnMobile(); };

    return (
        <>
            {/* Floating opener — used to reopen a collapsed rail */}
            {collapsible && !open && (
                <button className="app-sidebar-open" onClick={() => setOpen(true)} aria-label="Open menu">
                    <Menu size={22} />
                </button>
            )}

            {collapsible && open && <div className="app-sidebar-backdrop" onClick={() => setOpen(false)} />}

            <aside className={`app-sidebar${open ? " open" : ""}`}>
                <div className="app-sidebar-top">
                    <div className="app-sidebar-brand">
                        <img src={brandLogo} alt="BongoQuiz" />
                        <div><strong>BongoQuiz</strong><span>Arena</span></div>
                    </div>
                    {collapsible && (
                        <button className="app-sidebar-toggle" onClick={() => setOpen(false)} aria-label="Close menu">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="app-sidebar-scroll">
                    <nav className="app-sidebar-nav">
                        {ITEMS.map(({ key, label, Icon }) => (
                            <button key={key} className={active === key ? "active" : ""} onClick={() => handleNav(key)}>
                                <Icon size={19} /> <span>{label}</span>
                            </button>
                        ))}
                    </nav>

                    {actions && actions.length > 0 && (
                        <div className="app-sidebar-actions">
                            {actions.map(action => (
                                <button
                                    key={action.key}
                                    className={`app-sidebar-action${action.danger ? " danger" : ""}`}
                                    onClick={() => handleAction(action)}
                                >
                                    <span className="app-sidebar-action-icon">{action.icon}</span>
                                    <span className="app-sidebar-action-text">
                                        <strong>{action.label}</strong>
                                        {action.sub && <small>{action.sub}</small>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="app-sidebar-profile">
                    <span className="app-sidebar-avatar">{initials(playerName)}</span>
                    <div className="app-sidebar-profile-text">
                        <strong>{playerName}</strong>
                        <span>{subtitle ?? (points != null ? `${points.toLocaleString()} pts` : "Player")}</span>
                    </div>
                </div>
            </aside>
        </>
    );
};
