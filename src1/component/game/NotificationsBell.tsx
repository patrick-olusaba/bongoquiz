// NotificationsBell — self-contained alerts bell + announcements panel.
// Fetches global announcements from Firestore, tracks read state in localStorage,
// and renders using the shared .topbar-notification-* / .home-notification-* styles
// so it matches the main home top bar. Used by AppTopBar on game landing pages.
import { type FC, useEffect, useRef, useState } from "react";
import { Bell, ArrowLeft, Trash2, Megaphone, Gift, Trophy, Coins, CalendarCheck, ShieldCheck, BookOpen, Users, Sparkles, PlusCircle, Clock3 } from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.ts";

type Announcement = {
    id: string;
    title: string;
    message: string;
    icon?: string;
    category?: "updates" | "rewards" | "system" | string;
    active?: boolean;
    targetPhone?: string;
    createdAt?: { toDate?: () => Date; seconds?: number };
};

const iconMap = {
    megaphone: Megaphone, bell: Bell, gift: Gift, trophy: Trophy, coins: Coins,
    calendar: CalendarCheck, shield: ShieldCheck, book: BookOpen, users: Users,
    sparkles: Sparkles, plus: PlusCircle, youtube: FaYoutube, facebook: FaFacebook,
    instagram: FaInstagram, clock: Clock3,
};

const getIcon = (icon?: string) => iconMap[(icon ?? "megaphone") as keyof typeof iconMap] ?? Megaphone;
const getDate = (a: Announcement) => a.createdAt?.toDate?.() ?? (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : null);
const timeAgo = (date: Date | null) => {
    if (!date) return "Just now";
    const minutes = Math.floor(Math.max(Date.now() - date.getTime(), 0) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "Yesterday" : `${days}d ago`;
};

const TABS = [
    { id: "all" as const, label: "All" },
    { id: "updates" as const, label: "Updates" },
    { id: "system" as const, label: "System" },
];

export const NotificationsBell: FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<"all" | "updates" | "system">("all");
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        try { return new Set(JSON.parse(localStorage.getItem("bongo_read_announcements") ?? "[]")); }
        catch { return new Set(); }
    });
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const playerPhone = localStorage.getItem("bongo_player_phone") ?? "";

    useEffect(() => {
        const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(30));
        return onSnapshot(q, snap => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
            setAnnouncements(all.filter(a => {
                if (a.active === false) return false;
                if (!a.targetPhone || a.targetPhone === playerPhone) return true;
                return false;
            }).slice(0, 15));
        }, () => setAnnouncements([]));
    }, [playerPhone]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const persist = (next: Set<string>) => {
        setReadIds(next);
        localStorage.setItem("bongo_read_announcements", JSON.stringify([...next]));
    };
    const markRead = (id: string) => { if (!readIds.has(id)) persist(new Set([...readIds, id])); };
    const markAllRead = () => persist(new Set([...readIds, ...announcements.map(a => a.id)]));

    const unread = announcements.filter(a => !readIds.has(a.id)).length;
    const visible = announcements.filter(a => filter === "all" || a.category === filter);

    return (
        <div className="topbar-notification-wrap" ref={wrapRef}>
            <button
                className="topbar-notification-btn"
                onClick={() => setOpen(o => !o)}
                aria-label="Notifications"
                aria-expanded={open}
            >
                <Bell size={18} strokeWidth={2.35} />
                <span className="topbar-action-label">Alerts</span>
                {unread > 0 && <span className="topbar-notification-badge">{unread}</span>}
            </button>
            {open && (
                <div className="home-notification-panel">
                    <div className="home-notification-top">
                        <button className="home-notification-icon-btn" onClick={() => setOpen(false)} aria-label="Close notifications"><ArrowLeft size={18} /></button>
                        <strong>Notifications</strong>
                        <button className="home-notification-icon-btn" onClick={markAllRead} aria-label="Mark notifications read"><Trash2 size={17} /></button>
                    </div>
                    <div className="home-notification-tabs">
                        {TABS.map(tab => (
                            <button key={tab.id} className={filter === tab.id ? "active" : ""} onClick={() => setFilter(tab.id)}>{tab.label}</button>
                        ))}
                    </div>
                    <div className="home-notification-list">
                        {visible.length ? visible.map(item => {
                            const Icon = getIcon(item.icon);
                            return (
                                <button
                                    type="button"
                                    className={`home-notification-item is-clickable${readIds.has(item.id) ? " is-read" : ""}`}
                                    key={item.id}
                                    onClick={() => markRead(item.id)}
                                    aria-label={`Open notification: ${item.title}`}
                                >
                                    <span className={`home-notification-item-icon ${item.category ?? "updates"}`}><Icon size={22} /></span>
                                    <span className="home-notification-item-copy">
                                        <strong>{item.title}</strong>
                                        <p>{item.message}</p>
                                    </span>
                                    <small>{timeAgo(getDate(item))}</small>
                                    {!readIds.has(item.id) && <i />}
                                </button>
                            );
                        }) : (
                            <div className="home-notification-empty">No notifications in this category.</div>
                        )}
                    </div>
                    <div className="home-notification-footer">You're all caught up!</div>
                </div>
            )}
        </div>
    );
};
