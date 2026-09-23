import { type FC, type ReactNode, useEffect, useState } from "react";
import { Gamepad2, Home, Medal, Trophy, User, X } from "lucide-react";
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
    collapsible?: boolean;
}

const PRIMARY_ITEMS: { key: SidebarKey; label: string; Icon: typeof Home }[] = [
    { key: "home",        label: "Home",        Icon: Home },
    { key: "games",       label: "Games",       Icon: Gamepad2 },
    { key: "tournaments", label: "Tournaments", Icon: Trophy },
    { key: "leaderboard", label: "Leaderboard", Icon: Medal },
];

// Action keys shown as secondary nav (in this order)
const SECONDARY_KEYS = ["history", "htp", "share", "support"];

const isDesktop = () => typeof window !== "undefined" && window.innerWidth >= 1024;

export const DesktopSidebar: FC<Props> = ({ active, onNavigate, playerName = "Player", subtitle, points, actions, collapsible = true }) => {
    const [open, setOpen] = useState(isDesktop);

    useEffect(() => {
        const toggle = () => setOpen(o => !o);
        window.addEventListener("bongo:toggle-sidebar", toggle);
        return () => window.removeEventListener("bongo:toggle-sidebar", toggle);
    }, []);

    const closeOnMobile = () => { if (!isDesktop()) setOpen(false); };
    const handleNav = (key: SidebarKey) => { onNavigate(key); closeOnMobile(); };
    const handleAction = (action: SidebarAction) => { action.onClick(); closeOnMobile(); };

    const secondaryActions = SECONDARY_KEYS
        .map(k => actions?.find(a => a.key === k))
        .filter((a): a is SidebarAction => !!a);
    const dangerActions = actions?.filter(a => a.danger) ?? [];

    return (
        <>
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
                    {/* Primary navigation */}
                    <div className="app-sidebar-section-label">Navigation</div>
                    <nav className="app-sidebar-nav">
                        {PRIMARY_ITEMS.map(({ key, label, Icon }) => (
                            <button key={key} className={active === key ? "active" : ""} onClick={() => handleNav(key)}>
                                <Icon size={19} /> <span>{label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Secondary navigation */}
                    <div className="app-sidebar-divider" />
                    <div className="app-sidebar-section-label">More</div>
                    <nav className="app-sidebar-nav app-sidebar-nav--secondary">
                        <button className={active === "profile" ? "active" : ""} onClick={() => handleNav("profile")}>
                            <User size={19} /> <span>Profile</span>
                        </button>
                        {secondaryActions.map(action => (
                            <button key={action.key} onClick={() => handleAction(action)}>
                                <span className="app-sidebar-action-icon">{action.icon}</span>
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Danger zone (Log Out) */}
                    {dangerActions.length > 0 && (
                        <div className="app-sidebar-danger-zone">
                            {dangerActions.map(action => (
                                <button key={action.key} className="app-sidebar-action danger" onClick={() => handleAction(action)}>
                                    <span className="app-sidebar-action-icon">{action.icon}</span>
                                    <span className="app-sidebar-action-text">
                                        <strong>{action.label}</strong>
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
