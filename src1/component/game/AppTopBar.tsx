// AppTopBar — shared, streamlined top bar for game landing pages (not Bongo Quiz).
// Matches the main home top bar's look (reuses .bongo-top-bar / .topbar-* styles):
// logo (-> home), coin balance, alerts bell, wallet, and a Settings gear whose menu
// is supplied per-game via `settingsItems`.
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { Coins, Wallet, Settings, X } from "lucide-react";
import logo from "../../assets/logo.webp";
import { getBongoCoinBalance } from "../../utils/bongoWallet.ts";
import { NotificationsBell } from "./NotificationsBell.tsx";

export interface SettingsItem {
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface Props {
    settingsItems: SettingsItem[];
}

export const AppTopBar: FC<Props> = ({ settingsItems }) => {
    const [coinBalance, setCoinBalance] = useState(() => getBongoCoinBalance());
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement | null>(null);
    const hasValidPlayer = /^07\d{8}$/.test(localStorage.getItem("bongo_player_phone") ?? "");

    useEffect(() => {
        const refresh = () => setCoinBalance(getBongoCoinBalance());
        window.addEventListener("bongo:wallet-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("bongo:wallet-updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    useEffect(() => {
        if (!settingsOpen) return;
        const onClick = (e: MouseEvent) => {
            if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [settingsOpen]);

    return (
        <div className="bongo-top-bar">
            <div className="topbar-left">
                <button
                    type="button"
                    className="topbar-logo-btn"
                    onClick={() => { window.location.href = "/"; }}
                    aria-label="Back to home"
                >
                    <img src={logo} alt="Bongo Quiz" className="topbar-logo" />
                </button>
                {hasValidPlayer && (
                    <div className="topbar-coins" tabIndex={0} aria-label={`BongoCoin balance: ${coinBalance.toLocaleString()}`}>
                        <Coins className="topbar-coin-icon" size={28} strokeWidth={2.6} />
                        <span className="topbar-coin-value">{coinBalance.toLocaleString()}</span>
                        <span className="topbar-coin-tooltip">BongoCoin balance</span>
                    </div>
                )}
            </div>

            <div className="topbar-right">
                <NotificationsBell />

                <button
                    type="button"
                    className="topbar-notification-btn topbar-wallet-btn"
                    onClick={() => { window.location.href = "/?tab=wallet"; }}
                    aria-label="BongoCoin wallet"
                >
                    <Wallet size={18} strokeWidth={2.35} />
                    <span className="topbar-action-label">Wallet</span>
                </button>

                <div className="topbar-notification-wrap" ref={settingsRef}>
                    <button
                        type="button"
                        className="topbar-notification-btn topbar-settings-btn"
                        onClick={() => setSettingsOpen(o => !o)}
                        aria-label="Settings"
                        aria-expanded={settingsOpen}
                    >
                        <Settings size={18} strokeWidth={2.35} />
                        <span className="topbar-action-label">Settings</span>
                    </button>
                    {settingsOpen && (
                        <div className="topbar-settings-menu">
                            {settingsItems.map(item => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`topbar-settings-item${item.danger ? " danger" : ""}`}
                                    onClick={() => { setSettingsOpen(false); item.onClick(); }}
                                >
                                    <span className="topbar-settings-item-icon">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className="topbar-notification-btn topbar-exit-btn"
                    onClick={() => { window.location.href = "/"; }}
                    aria-label="Exit to home"
                >
                    <X size={18} strokeWidth={2.6} />
                    <span className="topbar-action-label">Exit</span>
                </button>
            </div>
        </div>
    );
};
