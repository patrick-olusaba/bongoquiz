// HomeScreen.tsx
import {type FC, type KeyboardEvent, useEffect, useRef, useState} from "react";
import {Home, Gamepad2, Trophy, Zap, FolderOpen, RotateCw, Clock3, Bell, Gift, ShieldCheck, Users, CalendarCheck, Sparkles, Megaphone, BookOpen, Coins, Trash2, ArrowLeft, PlusCircle, Wallet, ShoppingBag, LogIn, UserPlus} from 'lucide-react';
import {
    FaYoutube,
    FaFacebook,
    FaInstagram,
} from 'react-icons/fa';

import logoBg from "../../assets/logo.png";
// import mainLogo from "../../assets/background.png";
import wheelImg from "../../assets/wheel-hero.png";
// import biblePoster from "../../assets/gamesposter/Bible-IMG.png";
// import biologyPoster from "../../assets/gamesposter/biologyquizposter.png";
// import mathPoster from "../../assets/gamesposter/MathQuiz.png";
// import gkPoster from "../../assets/gamesposter/GeneralKnowledge.png";
// import SudokuPoster from "../../assets/gamesposter/sodoku.png";
import {PlayerNameModal} from "./Playernamemodal.tsx";
import {HowToPlayModal} from "./Howtoplaymodal.tsx";
// import {getStreakInfo} from "../../utils/streakDays.ts";
import {collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, getDoc} from "firebase/firestore";
import {getFunctions, httpsCallable} from "firebase/functions";
import {db} from "../../firebase.ts";
import '../../styles/HomeScreen.css';
import {BrowseGames} from "./BrowseGames.tsx";
import { getBongoCoinBalance, recordBonusReward, syncReconciledBongoCoins } from "../../utils/bongoWallet.ts";
// import {BrowseGames} from "./BrowseGames.tsx";

interface Props {
    onStart: (playerName: string) => void;
    onLeaderboard: () => void;
    onHistory?: () => void;
    onReviewSession?: () => void;
    hasPaidSession?: boolean;
    triggerPlay?: boolean;
    onTriggerPlayDone?: () => void;
    onViewAllGames?: () => void;
    onWallet?: () => void;
    onMarket?: () => void;
}

type LeaderPreviewEntry = {
    name: string;
    score: number;
};

type PlayerAnnouncement = {
    id: string;
    title: string;
    message: string;
    icon?: string;
    category?: "updates" | "rewards" | "system" | string;
    actionUrl?: string;
    url?: string;
    link?: string;
    createdAt?: { toDate?: () => Date; seconds?: number };
    localAt?: Date;
};

type DailyBonusStatus = {
    claimed: boolean;
    todayKey: string;
    streak: number;
};

type DailyBonusResult = {
    claimed: boolean;
    bonus: number;
    displayBonus?: number;
    streak: number;
    totalBonusPoints: number;
    todayKey: string;
    topUp?: boolean;
};

type Quest = {
    id: string;
    title: string;
    description: string;
    targetType: "daily_games" | "total_games" | "new_user" | string;
    targetCount: number;
    rewardPoints: number;
    active: boolean;
};

type PlayerQuest = {
    id: string;
    questId: string;
    progress: number;
    completed: boolean;
    readyToClaim: boolean;
    claimed: boolean;
    dateKey?: string;
};

const FALLBACK_LEADERS: LeaderPreviewEntry[] = [
    {name: "Amina", score: 9840},
    {name: "Brian", score: 9120},
    {name: "Jay", score: 8740},
];

export const HomeScreen: FC<Props> = ({
                                          onStart,
                                          onLeaderboard,
                                          onHistory,
                                          onReviewSession,
                                          hasPaidSession = false,
                                          triggerPlay,
                                          onTriggerPlayDone,
                                          onViewAllGames,
                                          onWallet,
                                          onMarket
                                      }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const logoRef = useRef<HTMLImageElement>(null);
    const notificationRef = useRef<HTMLDivElement | null>(null);
    const rewardsRef = useRef<HTMLDivElement | null>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "signup">("login");
    const [startAfterAuth, setStartAfterAuth] = useState(false);
    const [showHTP, setShowHTP] = useState(false);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [playerName, setPlayerName] = useState(() =>
        localStorage.getItem("bongo_player_name") ?? "Player"
    );
    const [playerPhone, setPlayerPhone] = useState(() =>
        localStorage.getItem("bongo_player_phone") ?? ""
    );
    const [menuOpen, setMenuOpen] = useState(false);
    const [personalBest, setPersonalBest] = useState(() =>
        parseInt(localStorage.getItem("bongo_best_score") ?? "0")
    );
    const [totalPoints, setTotalPoints] = useState(() =>
        parseInt(localStorage.getItem("bongo_total_points") ?? "0")
    );
    const [coinBalance, setCoinBalance] = useState(() => getBongoCoinBalance());
    const [leaderPreview, setLeaderPreview] = useState<LeaderPreviewEntry[]>(FALLBACK_LEADERS);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [rewardsOpen, setRewardsOpen] = useState(false);
    const [notificationFilter, setNotificationFilter] = useState<"all" | "updates" | "rewards" | "system">("all");
    const [announcements, setAnnouncements] = useState<PlayerAnnouncement[]>([]);
    const [personalNotifications, setPersonalNotifications] = useState<PlayerAnnouncement[]>([]);
    const [claimingDailyBonus, setClaimingDailyBonus] = useState(false);
    const [dailyBonusClaimedToday, setDailyBonusClaimedToday] = useState(false);
    const [dailyBonusStreak, setDailyBonusStreak] = useState(1);
    const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
    const [playerQuestProgress, setPlayerQuestProgress] = useState<Record<string, PlayerQuest>>({});
    const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);
    const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem("bongo_read_announcements") ?? "[]"));
        } catch {
            return new Set();
        }
    });

    useEffect(() => {
        const refreshCoinBalance = () => setCoinBalance(getBongoCoinBalance());
        let unsubscribeCoins = () => {};
        if (/^07\d{8}$/.test(playerPhone)) {
            syncReconciledBongoCoins(playerPhone).then(setCoinBalance).catch(refreshCoinBalance);
            unsubscribeCoins = onSnapshot(doc(db, "playerCoinBalances", playerPhone), () => {
                syncReconciledBongoCoins(playerPhone).then(setCoinBalance).catch(refreshCoinBalance);
            }, () => {});
        } else {
            refreshCoinBalance();
        }
        window.addEventListener("bongo:wallet-updated", refreshCoinBalance);
        window.addEventListener("storage", refreshCoinBalance);
        return () => {
            window.removeEventListener("bongo:wallet-updated", refreshCoinBalance);
            window.removeEventListener("storage", refreshCoinBalance);
            unsubscribeCoins();
        };
    }, [playerPhone]);

    useEffect(() => {
        const q = query(collection(db, "quests"), where("active", "==", true));
        return onSnapshot(q, snap => {
            setAvailableQuests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));
        });
    }, []);

    useEffect(() => {
        if (!playerPhone || !/^07\d{8}$/.test(playerPhone)) return;
        const q = query(collection(db, "playerQuests"), where("phone", "==", playerPhone));
        return onSnapshot(q, snap => {
            const map: Record<string, PlayerQuest> = {};
            snap.docs.forEach(doc => {
                const data = doc.data() as PlayerQuest;
                const key = data.dateKey ? `${data.questId}_${data.dateKey}` : data.questId;
                map[key] = { id: doc.id, ...data };
            });
            setPlayerQuestProgress(map);
        });
    }, [playerPhone]);

    useEffect(() => {
        // Fetch global announcements AND personalized ones for this player
        const baseQuery = collection(db, "announcements");
        // Firestore doesn't support OR queries across different fields easily without complex setup,
        // so we'll fetch global and targeted separately or use a combined approach.
        // For simplicity and to avoid complex composite indexes, we can use two listeners or a broader fetch.

        const q = query(baseQuery, orderBy("createdAt", "desc"), limit(30));

        return onSnapshot(q, snap => {
            const all = snap.docs.map(doc => ({id: doc.id, ...doc.data()} as PlayerAnnouncement & { active?: boolean, targetPhone?: string }));

            const filtered = all.filter(item => {
                if (item.active === false) return false;
                // Show if it's global (no targetPhone) OR targeted specifically to this player
                if (!item.targetPhone || item.targetPhone === playerPhone) return true;
                return false;
            }).slice(0, 15);

            setAnnouncements(filtered);
        }, () => {
            setAnnouncements([]);
        });
    }, [playerPhone]);

    useEffect(() => {
        if (!notificationsOpen && !rewardsOpen) return;
        const handleOutsideClick = (event: MouseEvent) => {
            if (notificationsOpen && !notificationRef.current?.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
            if (rewardsOpen && !rewardsRef.current?.contains(event.target as Node)) {
                setRewardsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [notificationsOpen, rewardsOpen]);

    const persistReadAnnouncements = (next: Set<string>) => {
        setReadAnnouncementIds(next);
        localStorage.setItem("bongo_read_announcements", JSON.stringify([...next]));
    };

    const markAnnouncementRead = (id: string) => {
        if (readAnnouncementIds.has(id)) return;
        persistReadAnnouncements(new Set([...readAnnouncementIds, id]));
    };

    const markAnnouncementsRead = () => {
        persistReadAnnouncements(new Set([...readAnnouncementIds, ...combinedNotifications.map(item => item.id)]));
    };

    const runPanelAction = (action: () => void) => {
        action();
    };

    const handlePanelActionKey = (event: KeyboardEvent<HTMLElement>, action: () => void) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        action();
    };

    const openGamesFromPanel = () => {
        setRewardsOpen(false);
        setNotificationsOpen(false);
        onViewAllGames?.();
    };

    const openRewardsPanel = () => {
        setNotificationsOpen(false);
        setRewardsOpen(true);
    };

    const handleNotificationClick = (item: PlayerAnnouncement) => {
        markAnnouncementRead(item.id);
        const externalUrl = item.actionUrl || item.url || item.link;
        if (externalUrl) {
            window.open(externalUrl, "_blank", "noopener,noreferrer");
            return;
        }
        if (item.category === "rewards" || item.icon === "gift" || item.icon === "coins" || item.icon === "sparkles") {
            openRewardsPanel();
            return;
        }
        if (item.icon === "trophy" || /leaderboard|rank/i.test(item.title)) {
            setNotificationsOpen(false);
            onLeaderboard();
            return;
        }
        if (item.icon === "book" || /how to|rules/i.test(item.title)) {
            setNotificationsOpen(false);
            setShowHTP(true);
            return;
        }
        if (item.icon === "gamepad" || /play|game|quest/i.test(item.title)) {
            openGamesFromPanel();
        }
    };

    const combinedNotifications = [...personalNotifications, ...announcements];
    const unreadAnnouncementCount = combinedNotifications.filter(item => !readAnnouncementIds.has(item.id)).length;
    const notificationTabs = [
        {id: "all" as const, label: "All"},
        {id: "updates" as const, label: "Updates"},
        // {id: "rewards" as const, label: "Rewards"},
        {id: "system" as const, label: "System"},
    ];
    const notificationIconMap = {
        megaphone: Megaphone,
        bell: Bell,
        gift: Gift,
        trophy: Trophy,
        coins: Coins,
        calendar: CalendarCheck,
        shield: ShieldCheck,
        book: BookOpen,
        users: Users,
        sparkles: Sparkles,
        plus: PlusCircle,
        youtube: FaYoutube,
        facebook: FaFacebook,
        instagram: FaInstagram,
        clock: Clock3,
    };
    const getAnnouncementIcon = (icon?: string) => notificationIconMap[(icon ?? "megaphone") as keyof typeof notificationIconMap] ?? Megaphone;
    const getAnnouncementDate = (item: PlayerAnnouncement) => item.localAt ?? item.createdAt?.toDate?.() ?? (item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000) : null);
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
    const dailyBonusRewards = [10, 15, 20, 25, 30, 40, 50];
    const activeBonusDay = Math.min(Math.max(dailyBonusStreak, 1), dailyBonusRewards.length);
    const currentDailyBonus = dailyBonusRewards[activeBonusDay - 1];
    const visibleAnnouncements = combinedNotifications.filter(item => notificationFilter === "all" || item.category === notificationFilter);
    const hasValidPlayer = /^07\d{8}$/.test(playerPhone);

    const pushPersonalNotification = (item: Omit<PlayerAnnouncement, "localAt"> & { localAt?: Date }) => {
        setPersonalNotifications(prev => {
            const next = { ...item, localAt: item.localAt ?? new Date() };
            return [next, ...prev.filter(existing => existing.id !== item.id)].slice(0, 8);
        });
    };

    const refreshPlayerLeaderboard = async (phone: string) => {
        if (!/^07\d{8}$/.test(phone)) return;
        const phone254 = phone.replace(/^0/, "254");
        try {
            const data = await fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard").then(r => r.json());
            const sorted = [...data].sort((a: any, b: any) => Number(b.score ?? 0) - Number(a.score ?? 0));
            const rank = sorted.findIndex((d: any) => String(d.msisdn) === phone254 || String(d.msisdn) === phone) + 1;
            const entry = rank > 0 ? sorted[rank - 1] : data.find((d: any) => String(d.msisdn) === phone254 || String(d.msisdn) === phone);
            if (entry) {
                const score = Number(entry.score ?? 0);
                setTotalPoints(score);
                localStorage.setItem("bongo_total_points", String(score));
            }
            if (rank > 0) {
                const rankKey = "bongo_last_rank:" + phone;
                const previousRank = parseInt(localStorage.getItem(rankKey) ?? "0");
                if (previousRank > 0 && rank < previousRank) {
                    pushPersonalNotification({
                        id: "leaderboard-up-" + phone + "-" + Date.now(),
                        title: "Leaderboard update",
                        message: "You moved from #" + previousRank + " to #" + rank + ". Keep climbing.",
                        icon: "trophy",
                        category: "rewards",
                    });
                }
                localStorage.setItem(rankKey, String(rank));
            }
        } catch {
        }
    };

    const claimDailyBonus = async () => {
        if (!playerPhone || !/^07\d{8}$/.test(playerPhone)) {
            setAuthMode("login");
            setStartAfterAuth(false);
            setShowNameModal(true);
            return;
        }
        setClaimingDailyBonus(true);
        try {
            const claim = httpsCallable<{ name: string; phone: string }, DailyBonusResult>(getFunctions(), "claimDailyBonus");
            const result = (await claim({ name: playerName, phone: playerPhone })).data;
            setDailyBonusClaimedToday(true);
            setDailyBonusStreak(Math.min(Math.max(result.streak, 1), dailyBonusRewards.length));
            setShowRewardModal(false);
            if (result.claimed) {
                const nextTotal = totalPoints + result.bonus;
                setTotalPoints(nextTotal);
                localStorage.setItem("bongo_total_points", String(nextTotal));
                const shownBonus = result.displayBonus ?? result.bonus;
                recordBonusReward({
                    title: result.topUp ? "Daily bonus corrected" : "Check-In",
                    amount: shownBonus,
                    description: "Day " + result.streak + " daily bonus",
                });
                pushPersonalNotification({
                    id: "daily-bonus-" + result.todayKey,
                    title: result.topUp ? "Daily bonus corrected" : "Daily bonus claimed",
                    message: result.topUp
                        ? "Your day " + result.streak + " bonus is now " + shownBonus.toLocaleString() + " points. Added the missing " + result.bonus.toLocaleString() + " points."
                        : "You collected " + shownBonus.toLocaleString() + " points. Streak day " + result.streak + " is active.",
                    icon: "coins",
                    category: "rewards",
                });
                void refreshPlayerLeaderboard(playerPhone);
            } else {
                pushPersonalNotification({
                    id: "daily-bonus-already-" + result.todayKey,
                    title: "Daily bonus already claimed",
                    message: "Come back tomorrow for a fresh streak reward.",
                    icon: "shield",
                    category: "system",
                });
            }
        } catch {
            pushPersonalNotification({
                id: "daily-bonus-error-" + Date.now(),
                title: "Bonus claim failed",
                message: "Check your connection and try again in a moment.",
                icon: "shield",
                category: "system",
            });
        } finally {
            setClaimingDailyBonus(false);
        }
    };

    const handleClaimReward = async (questId: string, dateKey?: string) => {
        if (!playerPhone) return;
        setClaimingRewardId(questId);
        try {
            const claim = httpsCallable<{ phone: string, questId: string, dateKey?: string }, any>(getFunctions(), "claimQuestReward");
            const result = (await claim({ phone: playerPhone, questId, dateKey })).data;
            if (result.success) {
                const nextTotal = totalPoints + result.rewardPoints;
                recordBonusReward({ title: "Quest Reward", amount: result.rewardPoints, description: questId });
                setTotalPoints(nextTotal);
                localStorage.setItem("bongo_total_points", String(nextTotal));
                void refreshPlayerLeaderboard(playerPhone);
            }
        } catch (err) {
            console.error("Failed to claim reward", err);
        } finally {
            setClaimingRewardId(null);
        }
    };

    useEffect(() => {
        if (!playerPhone || !/^07\d{8}$/.test(playerPhone)) return;

        // Match backend YYYY-MM-DD format for Nairobi time
        const now = new Date();
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(now);
        const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
        const todayKey = `${get("year")}-${get("month")}-${get("day")}`;

        const seenKey = "bongo_login_notification:" + playerPhone + ":" + todayKey;
        if (!sessionStorage.getItem(seenKey)) {
            sessionStorage.setItem(seenKey, "1");
            pushPersonalNotification({
                id: "login-" + playerPhone + "-" + todayKey,
                title: "Welcome back, " + playerName,
                message: "Your daily bonus is waiting. Claim it before midnight and keep your streak alive.",
                icon: "sparkles",
                category: "updates",
            });
        }

        const checkBonusStatus = async () => {
            try {
                const getStatus = httpsCallable<{ phone: string }, DailyBonusStatus>(getFunctions(), "getDailyBonusStatus");
                const status = (await getStatus({ phone: playerPhone })).data;
                setDailyBonusClaimedToday(status.claimed);
                setDailyBonusStreak(Math.min(Math.max(status.streak, 1), dailyBonusRewards.length));
                setShowRewardModal(!status.claimed);
            } catch (err) {
                console.error("Failed to check bonus status", err);
                setShowRewardModal(false);
            }
        };
        void checkBonusStatus();
    }, [playerPhone, playerName]);

    // Fetch real personal best and total points from Firestore when phone is known
    useEffect(() => {
        if (!playerPhone || !/^07\d{8}$/.test(playerPhone)) return;
        getDocs(query(
            collection(db, "gameSessions"),
            where("phone", "==", playerPhone),
            orderBy("total", "desc"),
            limit(1)
        )).then(snap => {
            if (!snap.empty) {
                const best = snap.docs[0].data().total ?? 0;
                setPersonalBest(best);
                localStorage.setItem("bongo_best_score", String(best));
            }
        }).catch(() => {
        });

        void refreshPlayerLeaderboard(playerPhone);
    }, [playerPhone]);

    useEffect(() => {
        fetch('https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard')
            .then(r => r.json())
            .then((data: any[]) => {
                const leaders = data
                    .map((entry: any) => ({
                        name: entry.name || entry.playerName || entry.username || "Player",
                        score: Number(entry.score ?? entry.total ?? 0),
                    }))
                    .filter((entry: LeaderPreviewEntry) => entry.score > 0)
                    .sort((a: LeaderPreviewEntry, b: LeaderPreviewEntry) => b.score - a.score)
                    .slice(0, 3);
                if (leaders.length === 3) setLeaderPreview(leaders);
            })
            .catch(() => {
            });
    }, []);
    //     const next = !soundOn;
    //     setSoundOn(next);
    //     localStorage.setItem("bongo_sound", next ? "on" : "off");
    // };
    // const streakInfo = getStreakInfo();

    const saveProfile = (name: string, phone: string) => {
        setPlayerName(name);
        setPlayerPhone(phone);
        localStorage.setItem("bongo_player_name", name);
        localStorage.setItem("bongo_player_phone", phone);
        localStorage.setItem("bongo_last_activity", Date.now().toString());
    };

    const checkInactivity = () => {
        const lastActivity = localStorage.getItem("bongo_last_activity");
        if (lastActivity) {
            const hoursSinceActivity = (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60);
            if (hoursSinceActivity >= 24) {
                // Clear cache after 4 hours of inactivity
                ["bongo_player_name", "bongo_player_phone", "bongo_best_score", "bongo_total_points",
                    "bongo_session_score", "bongo_achievements", "bongo_streak", "bongo_last_activity"].forEach(k => localStorage.removeItem(k));
                setPlayerName("Player");
                setPlayerPhone("");
            }
        }
    };

    const handlePlay = () => {
        localStorage.setItem("bongo_last_activity", Date.now().toString());
        if (!playerPhone || !/^07\d{8}$/.test(playerPhone)) {
            setAuthMode("login");
            setStartAfterAuth(true);
            setShowNameModal(true);
        } else {
            onStart(playerName);
        }
    };

    useEffect(() => {
        if (triggerPlay) {
            handlePlay();
            onTriggerPlayDone?.();
        }
    }, [triggerPlay]);

    useEffect(() => {
        const onScroll = () => {
            if (logoRef.current) {
                logoRef.current.style.transform = `translate(-50%, calc(-50% + ${window.scrollY * 0.3}px))`;
            }
        };
        window.addEventListener('scroll', onScroll, {passive: true});
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        checkInactivity();/*body {*/
        /*    display: flex;*/
        /*    flex-direction: column;*/
        /*}*/
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        let animId: number;
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);
        const stars = Array.from({length: 120}, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.8 + 0.3,
            speed: Math.random() * 0.4 + 0.1,
            opacity: Math.random() * 0.7 + 0.3,
            twinkle: Math.random() * Math.PI * 2,
        }));
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.twinkle += 0.02;
                s.y += s.speed;
                if (s.y > canvas.height) {
                    s.y = -4;
                    s.x = Math.random() * canvas.width;
                }
                const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    const rounds = [
        {
            num: "01",
            label: "Quickfire",
            Icon: Zap,
            desc: "Score fast points before the timer runs out",
            color: "#00e5ff",
            glow: "drop-shadow(0 0 12px rgba(0,229,255,0.6))",
            FooterIcon: Clock3,
            footerLabel: "80s"
        },
        {
            num: "02",
            label: "Categories",
            Icon: FolderOpen,
            desc: "Pick your topic and build a stronger score",
            color: "#c084fc",
            glow: "drop-shadow(0 0 12px rgba(192,132,252,0.6))",
            FooterIcon: Clock3,
            footerLabel: "40s"
        },
        {
            num: "03",
            label: "Bonus Spin",
            Icon: RotateCw,
            desc: "Spin for bonus points, streak boosts, or multipliers",
            color: "#e2e8f0",
            glow: "drop-shadow(0 0 12px rgba(226,232,240,0.4))",
            FooterIcon: RotateCw,
            footerLabel: "BONUS"
        },
    ];

    // const moreApps = [
    //     { label: "General Knowledge", logo: gkPoster, path: "/general-knowledge", tag: "NEW" },
    //     { label: "Bible Quiz", logo: biblePoster, path: "/bible-quiz", tag: "NEW" },
    //     { label: "Biology Quiz", logo: biologyPoster, path: "/biology-quiz", tag: "NEW" },
    //     { label: "Math Quiz", logo: mathPoster, path: "/math-quiz", tag: "NEW" },
    //     // { label: "Sudoku", logo: SudokuPoster, path: '/sudoku', tag: "NEW" },
    // ];

    return (
        <div className="home-root">
            <div className="bongo-top-bar">
                <div className="topbar-left">
                    <img src={logoBg} alt="Bongo Quiz" className="topbar-logo"/>
                    {hasValidPlayer && (
                        <div className="topbar-coins" tabIndex={0} aria-label={`BongoCoin balance: ${coinBalance.toLocaleString()}`}>
                            <Coins className="topbar-coin-icon" size={28} strokeWidth={2.6}/>
                            <span className="topbar-coin-value">{coinBalance.toLocaleString()}</span>
                            <span className="topbar-coin-tooltip">BongoCoin balance</span>
                        </div>
                    )}
                </div>
                {/* Desktop nav links */}
                <div className="topbar-desktop-nav">
                    <button className="topbar-nav-link active" onClick={() => {
                    }}><Home size={16} strokeWidth={2}/> Home
                    </button>
                    <button className="topbar-nav-link" onClick={onViewAllGames}><Gamepad2 size={16}
                                                                                           strokeWidth={2}/> Games
                    </button>
                    <button className="topbar-nav-link" onClick={onLeaderboard}><Trophy size={16}
                                                                                        strokeWidth={2}/> Leaderboard
                    </button>
                </div>
                <div className="topbar-right">
                    {hasValidPlayer && <>
                    {personalBest > 0 && (
                        <div className="topbar-score">
                            <span>🏆</span>
                            <span>{personalBest.toLocaleString()}</span>
                        </div>
                    )}

                    <button
                        type="button"
                        className="topbar-notification-btn topbar-wallet-btn"
                        onClick={onWallet}
                        aria-label="BongoCoin wallet"
                    >
                        <Wallet size={18} strokeWidth={2.35}/>
                        <span className="topbar-action-label">Wallet</span>
                    </button>
                    <button
                        type="button"
                        className="topbar-notification-btn topbar-market-btn"
                        onClick={onMarket}
                        aria-label="Bongo Market"
                    >
                        <ShoppingBag size={18} strokeWidth={2.35}/>
                        <span className="topbar-action-label">Market</span>
                    </button>

                    <div className="topbar-notification-wrap" ref={rewardsRef}>
                        <button
                            className="topbar-notification-btn"
                            onClick={() => setRewardsOpen(open => !open)}
                            aria-label="Rewards"
                            aria-expanded={rewardsOpen}
                        >
                            <Gift size={18} strokeWidth={2.35}/>
                            <span className="topbar-action-label">Rewards</span>
                        </button>
                        {rewardsOpen && (
                            <div className="home-notification-panel">
                                <div className="home-notification-top">
                                    <button className="home-notification-icon-btn" onClick={() => setRewardsOpen(false)} aria-label="Close rewards"><ArrowLeft size={18}/></button>
                                    <strong>Rewards</strong>
                                    <div style={{width: 34}}/>
                                </div>
                                <div className="home-notification-hero home-checkin-card">
                                    <div className="home-checkin-top">
                                        <div className="home-checkin-bonus">
                                            <span><Coins size={20}/></span>
                                            <strong>{currentDailyBonus}</strong>
                                            <small>Your bonus</small>
                                        </div>
                                        <div className="home-checkin-gift"><Gift size={72}/></div>
                                    </div>
                                    <div className="home-checkin-body">
                                        <strong>Daily check-in</strong>
                                        <p>Earn rewards for check-in</p>
                                        <div className="home-checkin-days">
                                            {dailyBonusRewards.map((points, index) => {
                                                const day = index + 1;
                                                const isActive = day === activeBonusDay;
                                                const isDone = dailyBonusClaimedToday && day === activeBonusDay;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={day}
                                                        className={"home-checkin-day" + (isActive ? " active" : "") + (isDone ? " claimed" : "")}
                                                        disabled={!isActive || claimingDailyBonus || dailyBonusClaimedToday}
                                                        onClick={claimDailyBonus}
                                                        aria-label={"Claim day " + day + " bonus"}>
                                                        <Coins size={22}/>
                                                        <strong>+{points}</strong>
                                                        <span>Day {day}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button className="home-daily-bonus-btn" disabled={claimingDailyBonus || dailyBonusClaimedToday} onClick={claimDailyBonus}>
                                            {claimingDailyBonus ? "Claiming..." : dailyBonusClaimedToday ? "Bonus claimed" : "Claim daily bonus"}
                                        </button>
                                    </div>
                                </div>

                                <div className="home-reward-section-title">Quests & Rewards</div>
                                <div className="home-reward-list">
                                    {availableQuests.map(q => {
                                        // Match backend YYYY-MM-DD format
                                        const now = new Date();
                                        const pts = new Intl.DateTimeFormat("en-CA", {
                                            timeZone: "Africa/Nairobi",
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit",
                                        }).formatToParts(now);
                                        const getVal = (type: string) => pts.find(p => p.type === type)?.value ?? "";
                                        const todayKey = `${getVal("year")}-${getVal("month")}-${getVal("day")}`;

                                        const progressKey = q.targetType === "daily_games" ? `${q.id}_${todayKey}` : q.id;
                                        const progress = playerQuestProgress[progressKey];
                                        const isClaimed = progress?.claimed;
                                        const canClaim = progress?.readyToClaim && !isClaimed;
                                        const currentVal = progress?.progress || 0;
                                        const targetVal = q.targetCount;
                                        const Icon = getAnnouncementIcon(q.icon || (q.targetType === "new_user" ? "sparkles" : "gamepad"));

                                        return (
                                            <div
                                                className={"home-reward-row" + (isClaimed ? " is-claimed" : "") + (!isClaimed ? " is-clickable" : "")}
                                                key={q.id}
                                                role={!isClaimed ? "button" : undefined}
                                                tabIndex={!isClaimed ? 0 : undefined}
                                                onClick={() => {
                                                    if (isClaimed) return;
                                                    if (canClaim) {
                                                        runPanelAction(() => handleClaimReward(q.id, q.targetType === "daily_games" ? todayKey : undefined));
                                                    } else {
                                                        openGamesFromPanel();
                                                    }
                                                }}
                                                onKeyDown={(event) => handlePanelActionKey(event, () => {
                                                    if (isClaimed) return;
                                                    if (canClaim) {
                                                        runPanelAction(() => handleClaimReward(q.id, q.targetType === "daily_games" ? todayKey : undefined));
                                                    } else {
                                                        openGamesFromPanel();
                                                    }
                                                })}
                                            >
                                                <div className="home-reward-icon">
                                                    <Icon size={20}/>
                                                </div>
                                                <div className="home-reward-info">
                                                    <strong>{q.title}</strong>
                                                    <div className="home-reward-pts">
                                                        <Coins size={14}/>
                                                        <span>+{q.rewardPoints}</span>
                                                        {q.targetType !== "new_user" && (
                                                            <small>({currentVal}/{targetVal})</small>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="home-reward-action">
                                                    {isClaimed ? (
                                                        <button className="home-reward-btn claimed" disabled>Claimed</button>
                                                    ) : canClaim ? (
                                                        <button
                                                            className="home-reward-btn claim"
                                                            disabled={claimingRewardId === q.id}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleClaimReward(q.id, q.targetType === "daily_games" ? todayKey : undefined);
                                                            }}
                                                        >
                                                            {claimingRewardId === q.id ? "..." : "Claim"}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="home-reward-btn go"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openGamesFromPanel();
                                                            }}
                                                        >
                                                            Go
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {availableQuests.length === 0 && (
                                        <div className="home-reward-empty">No active quests right now. Check back soon!</div>
                                    )}
                                </div>

                                <div className="home-notification-footer">Come back daily for more rewards!</div>
                            </div>
                        )}
                    </div>

                    <div className="topbar-notification-wrap" ref={notificationRef}>
                        <button
                            className="topbar-notification-btn"
                            onClick={() => setNotificationsOpen(open => !open)}
                            aria-label="Notifications"
                            aria-expanded={notificationsOpen}
                        >
                            <Bell size={18} strokeWidth={2.35}/>
                            <span className="topbar-action-label">Alerts</span>
                            {unreadAnnouncementCount > 0 && <span className="topbar-notification-badge">{unreadAnnouncementCount}</span>}
                        </button>
                        {notificationsOpen && (
                            <div className="home-notification-panel">
                                <div className="home-notification-top">
                                    <button className="home-notification-icon-btn" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><ArrowLeft size={18}/></button>
                                    <strong>Notifications</strong>
                                    <button className="home-notification-icon-btn" onClick={markAnnouncementsRead} aria-label="Mark notifications read"><Trash2 size={17}/></button>
                                </div>
                                <div className="home-notification-tabs">
                                    {notificationTabs.map(tab => (
                                        <button key={tab.id} className={notificationFilter === tab.id ? "active" : ""} onClick={() => setNotificationFilter(tab.id)}>{tab.label}</button>
                                    ))}
                                </div>
                                <div className="home-notification-list">
                                    {visibleAnnouncements.length ? visibleAnnouncements.map(item => {
                                        const at = getAnnouncementDate(item);
                                        const Icon = getAnnouncementIcon(item.icon);
                                        return (
                                            <button
                                                type="button"
                                                className={`home-notification-item is-clickable${readAnnouncementIds.has(item.id) ? " is-read" : ""}`}
                                                key={item.id}
                                                onClick={() => handleNotificationClick(item)}
                                                aria-label={`Open notification: ${item.title}`}
                                            >
                                                <span className={`home-notification-item-icon ${item.category ?? "updates"}`}><Icon size={22}/></span>
                                                <span className="home-notification-item-copy">
                                                    <strong>{item.title}</strong>
                                                    <p>{item.message}</p>
                                                </span>
                                                <small>{timeAgo(at)}</small>
                                                {!readAnnouncementIds.has(item.id) && <i/>}
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
                    </>}
                    {!hasValidPlayer && <div className="topbar-guest-actions">
                        <button className="topbar-auth-btn topbar-auth-btn--login" onClick={() => { setAuthMode("login"); setStartAfterAuth(false); setShowNameModal(true); }}><LogIn size={15}/><span>Log in</span></button>
                        <button className="topbar-auth-btn topbar-auth-btn--signup" onClick={() => { setAuthMode("signup"); setStartAfterAuth(false); setShowNameModal(true); }}><UserPlus size={15}/><span>Sign up</span></button>
                    </div>}
                    <button className="topbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
                        <span className="topbar-hamburger-lines"><i/><i/><i/></span>
                        <span className="topbar-action-label">Menu</span>
                    </button>
                </div>
            </div>

            {/* Floating centered logo */}
            {/*<div className="home-floating-logo">*/}
            {/*    <img src={logoBg} alt="Bongo Quiz" className="home-title-image"/>*/}
            {/*</div>*/}

            {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)}/>}
            <div className={`menu-drawer${menuOpen ? ' menu-drawer--open' : ''}`}>
                <div className="menu-drawer-header">
                    <img src={logoBg} alt="" style={{width: 32}}/>
                    <span className="menu-drawer-title">Menu</span>
                    <button className="menu-close-btn" onClick={() => setMenuOpen(false)}>✕</button>
                </div>
                <div className="menu-items">
                    <button className="menu-item" onClick={() => {
                        setMenuOpen(false);
                        setShowHTP(true);
                    }}>
                        <span className="menu-item-icon">❓</span>
                        <div>
                            <div className="menu-item-label">How to Play</div>
                            <div className="menu-item-sub">Learn the rules & rounds</div>
                        </div>
                    </button>
                    <div className="hideonmobile">
                        <button className="menu-item" onClick={() => {
                            setMenuOpen(false);
                            onLeaderboard();
                        }}>
                            <span className="menu-item-icon">🏆</span>
                            <div>
                                <div className="menu-item-label">Leaderboard</div>
                                <div className="menu-item-sub">See top players</div>
                            </div>
                        </button>
                        <button className="menu-item" onClick={() => {
                            setMenuOpen(false);
                            setAuthMode("login");
                            setStartAfterAuth(false);
                            setShowNameModal(true);
                        }}>
                            <span className="menu-item-icon">👤</span>
                            <div>
                                <div className="menu-item-label">Edit Profile</div>
                                <div className="menu-item-sub">{playerName} · {playerPhone || 'No phone set'}</div>
                            </div>
                        </button>
                    </div>

                    {onHistory && (
                        <button className="menu-item" onClick={() => {
                            setMenuOpen(false);
                            onHistory();
                        }}>
                            <span className="menu-item-icon">📜</span>
                            <div>
                                <div className="menu-item-label">Game History</div>
                                <div className="menu-item-sub">View your past sessions</div>
                            </div>
                        </button>
                    )}
                    {onReviewSession && (
                        <button className="menu-item" onClick={() => {
                            setMenuOpen(false);
                            onReviewSession();
                        }}>
                            <span className="menu-item-icon">📋</span>
                            <div>
                                <div className="menu-item-label">Review Last Game</div>
                                <div className="menu-item-sub">See questions & answers</div>
                            </div>
                        </button>
                    )}
                    <button className="menu-item" onClick={() => {
                        const text = `Play Bongo Quiz - 3 rounds of trivia, bonus points, and leaderboard rankings.\n${window.location.href}`;
                        if (navigator.share) {
                            navigator.share({title: 'Bongo Quiz', text, url: window.location.href}).catch(() => {
                            });
                        } else {
                            navigator.clipboard?.writeText(window.location.href).then(() => alert('Link copied!')).catch(() => {
                            });
                        }
                    }}>
                        <span className="menu-item-icon">🔗</span>
                        <div>
                            <div className="menu-item-label">Share</div>
                            <div className="menu-item-sub">Invite friends to play</div>
                        </div>
                    </button>
                    <button className="menu-item" onClick={() => {
                        setMenuOpen(false);
                        window.location.href = "/contact";
                    }}>
                        <span className="menu-item-icon">🎧</span>
                        <div>
                            <div className="menu-item-label">Contact Support</div>
                            <div className="menu-item-sub">Live chat, email & WhatsApp</div>
                        </div>
                    </button>
                    {/*<button className="menu-item" onClick={toggleSound}>*/}
                    {/*    <span className="menu-item-icon">{soundOn ? '🔊' : '🔇'}</span>*/}
                    {/*    <div><div className="menu-item-label">Sound</div><div className="menu-item-sub">{soundOn ? 'On — tap to mute' : 'Off — tap to unmute'}</div></div>*/}
                    {/*    <span className={`menu-toggle${soundOn ? ' menu-toggle--on' : ''}`}/>*/}
                    {/*</button>*/}
                    {playerPhone && (
                        <button className="menu-item" style={{color: "#ef4444"}} onClick={() => {
                            ["bongo_player_name", "bongo_player_phone", "bongo_best_score", "bongo_total_points",
                                "bongo_session_score", "bongo_achievements", "bongo_streak", "bongo_last_activity"].forEach(k => localStorage.removeItem(k));
                            setPlayerName("Player");
                            setPlayerPhone("");
                            setMenuOpen(false);
                        }}>
                            <span className="menu-item-icon">🚪</span>
                            <div>
                                <div className="menu-item-label" style={{color: "#ef4444"}}>Log Out</div>
                                <div className="menu-item-sub">Sign out of your account</div>
                            </div>
                        </button>
                    )}
                </div>
                {personalBest > 0 && (
                    <div className="menu-best">🏅 Personal Best: <strong>{personalBest.toLocaleString()} pts</strong>
                    </div>
                )}
            </div>

            <canvas ref={canvasRef} className="home-canvas"/>
            <img ref={logoRef} src={logoBg} alt="" className="home-logo-bg"/>
            <div className="home-orbs">
                <div className="home-orb1"/>
                <div className="home-orb2"/>
                <div className="home-orb3"/>
            </div>
            <div className="home-scanline-wrap">
                <div className="home-scanline"/>
            </div>

            <div className="home-content">
                {/* ── Hero section: text + wheel ── */}
                <div className="home-hero">
                    <div className="home-hero-text">
                        <div className="home-arena-chip"><span/> Bongo Quiz Arena</div>
                        <p className="home-hero-label">3 SKILL ROUNDS</p>
                        <p className="home-hero-sub">TEST YOUR KNOWLEDGE</p>

                        <p className="home-hero-rounds">SCORE POINTS</p>
                        <p className="home-hero-win">CLIMB THE BOARD</p>
                        <div className="home-hero-actions">
                            <button className="home-btn" onClick={handlePlay}>
                                <span className="home-btn-shine"/>
                                {hasPaidSession ? "Continue" : "Start Quiz"}
                            </button>
                            {/*<button className="home-hero-secondary" onClick={onLeaderboard}>Leaderboard</button>*/}
                        </div>
                        <div className="home-hero-stats" aria-label="Player score summary">
                            <div>
                                <span>Personal best</span>
                                <strong>{personalBest > 0 ? personalBest.toLocaleString() : "--"} pts</strong>
                            </div>
                            <div>
                                <span>Total points</span>
                                <strong>{totalPoints > 0 ? totalPoints.toLocaleString() : "--"} pts</strong>
                            </div>
                            <div>
                                <span>Goal</span>
                                <strong>Top 10</strong>
                            </div>
                        </div>
                        <p className="home-hint">Leaderboard points only. Every correct answer moves your rank.</p>
                    </div>

                    <div className="home-hero-wheel">
                        <div className="home-wheel-card">
                            <div className="home-wheel-kicker">Round 3 Spin</div>
                            <img src={wheelImg} alt="Bonus points wheel" className="home-wheel-img"/>
                            <div className="home-wheel-pills">
                                <span>+2500 pts</span>
                                {/*<span>Double points</span>*/}
                                <span>Streak boost</span>
                            </div>
                            <div className="home-wheel-status">
                                <span>Next move</span>
                                <strong>Answer to claim the bonus</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='middle-section'>
                    {/* Player name + personal best bar */}
                    <div className="home-rounds">
                        {rounds.map((r, i) => (
                            <div key={r.num} className="home-round-card" style={{
                                animationDelay: `${0.4 + i * 0.08}s`,
                                borderColor: r.color,
                                boxShadow: `0 0 16px ${r.color}33`
                            }}>
                                <div className="home-round-num" style={{color: r.color}}>ROUND {r.num}</div>
                                <div className="home-round-icon" style={{filter: r.glow, color: r.color}}>
                                    <r.Icon size={38} strokeWidth={2.5}/>
                                </div>
                                <div className="home-round-label" style={{color: r.color}}>{r.label}</div>
                                <div className="home-round-desc">{r.desc}</div>
                                <div className="home-round-footer" style={{borderTopColor: `${r.color}44`}}>
                                <span className="home-round-footer-text" style={{color: r.color}}>
                                    <r.FooterIcon size={13} strokeWidth={2.5}/>
                                    {r.footerLabel}
                                </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <section className="home-leader-preview" aria-label="Top players today">
                        <div className="home-leader-preview-head">
                            <div>
                                <span>Leaderboard Preview</span>
                                <h2>Top Players Today</h2>
                            </div>
                            <button type="button" onClick={onLeaderboard}>View Board</button>
                        </div>
                        <div className="home-leader-preview-list">
                            {leaderPreview.map((entry, index) => (
                                <div className="home-leader-preview-row" key={`${entry.name}-${index}`}>
                                    <span className="home-leader-rank">#{index + 1}</span>
                                    <span className="home-leader-name">{entry.name}</span>
                                    <strong>{entry.score.toLocaleString()} pts</strong>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
                <BrowseGames exclude="Bongo Quiz"/>

            </div>


            {showRewardModal && (
                <div className="reward-modal-overlay">
                    <div className="reward-modal-content">
                        <button className="reward-modal-close" onClick={() => setShowRewardModal(false)}>✕</button>
                        <div className="reward-modal-ribbon"><Gift size={64}/></div>
                        <div className="reward-modal-header">
                            <h2>Claim daily bonus. Boost your score.</h2>
                        </div>
                        <div className="reward-modal-body">
                            <div className="reward-modal-days">
                                {dailyBonusRewards.map((points, index) => {
                                    const day = index + 1;
                                    const isActive = day === activeBonusDay;
                                    const isDone = dailyBonusClaimedToday && day === activeBonusDay;
                                    return (
                                        <div
                                            key={day}
                                            className={"reward-modal-day" + (isActive ? " active" : "") + (isDone ? " claimed" : "")}>
                                            <div className="reward-modal-day-icon">
                                                {day === 7 ? <Coins size={32}/> : <Coins size={20}/>}
                                            </div>
                                            <strong>+{points}</strong>
                                            <span>Day {day}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <button className="reward-modal-claim-btn" disabled={claimingDailyBonus || dailyBonusClaimedToday} onClick={claimDailyBonus}>
                                {claimingDailyBonus ? "Claiming..." : "Check-In"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showNameModal && (
                <PlayerNameModal
                    currentName={playerName}
                    currentPhone={playerPhone}
                    onSave={(name, phone) => {
                        saveProfile(name, phone);
                        if (startAfterAuth) onStart(name);
                    }}
                    onClose={() => { setShowNameModal(false); setStartAfterAuth(false); }}
                    initialMode={authMode}
                />
            )}
            {showHTP && <HowToPlayModal onClose={() => setShowHTP(false)}/>}

            {/* ── Fixed bottom ad banner ── */}
            {/* <a href="https://tushinde.com/" target="_blank" rel="noopener noreferrer"
                style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, display: "block", cursor: "pointer" }}>
                <div style={{ position: "relative", width: "100%", maxWidth: 800, margin: "0 auto" }}>
                    <img src={chezaTenaAd} alt="Cheza Tena — Activate & Get 50% Back"
                        style={{ width: "100%", display: "block", maxHeight: 56, objectFit: "cover", objectPosition: "center" }} />
                    <button
                        onClick={e => e.preventDefault()}
                        aria-label="Close ad"
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", border: "none",
                            borderRadius: "50%", width: 20, height: 20, color: "#fff", fontSize: "0.65rem",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                        onClickCapture={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget.closest("a") as HTMLElement | null)?.remove(); }}>
                        ✕
                    </button>
                </div>
            </a> */}

            {/* ── Footer ── */}
            <footer style={{
                background: "#0d0d1a",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                padding: "32px 24px 100px",
                marginTop: 16,
                width: "100%",
                boxSizing: "border-box",
                alignSelf: "stretch"
            }}>
                {/* Logo + tagline */}
                <div style={{textAlign: "center", marginBottom: 28}}>
                    <div style={{fontWeight: 900, fontSize: "1.2rem", color: "#FFD700", letterSpacing: 1}}>
                        <img className="bongo-footer-logo" src={logoBg} alt=""/>
                    </div>
                    <div style={{color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", marginTop: 4}}>Test your
                        knowledge. Build your score. Climb the leaderboard.
                    </div>
                </div>

                {/* 3-column grid — collapses to 1 col on small screens via minmax */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "24px 16px",
                    maxWidth: 900,
                    margin: "0 auto 28px"
                }}>
                    {/* Support */}
                    <div>
                        <div style={{
                            color: "rgba(255,255,255,0.45)",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            marginBottom: 10
                        }}>Support
                        </div>
                        {[
                            {label: "Contact Us", action: () => window.location.href = "/contact"},
                            {
                                label: "Live Chat",
                                action: () => window.dispatchEvent(new CustomEvent("bongo:open-chat"))
                            },
                            {label: "FAQs", action: () => window.location.href = "/contact"},
                        ].map(l => (
                            <button key={l.label} onClick={l.action} style={{
                                display: "block",
                                background: "none",
                                border: "none",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                padding: "4px 0",
                                fontFamily: "inherit",
                                textAlign: "left"
                            }}>{l.label}</button>
                        ))}
                    </div>

                    {/* Quick Links */}
                    <div>
                        <div style={{
                            color: "rgba(255,255,255,0.45)",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            marginBottom: 10
                        }}>Quick Links
                        </div>
                        {[
                            // { label: "How to Play", action: () => window.location.href = "/docs" },
                            {
                                label: "Leaderboard",
                                action: () => window.dispatchEvent(new CustomEvent("bongo:goto-leaderboard"))
                            },
                            {label: "Games", action: () => window.dispatchEvent(new CustomEvent("bongo:goto-games"))},
                        ].map(l => (
                            <button key={l.label} onClick={l.action} style={{
                                display: "block",
                                background: "none",
                                border: "none",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                padding: "4px 0",
                                fontFamily: "inherit",
                                textAlign: "left"
                            }}>{l.label}</button>
                        ))}
                    </div>

                    {/* Legal */}
                    <div>
                        <div style={{
                            color: "rgba(255,255,255,0.45)",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            marginBottom: 10
                        }}>Legal
                        </div>
                        {[
                            {label: "Terms & Conditions", action: () => window.location.href = "/terms"},
                            {label: "Privacy Policy", action: () => window.location.href = "/privacy"},
                            {label: "Fair Play", action: () => window.location.href = "/responsible"},
                        ].map(l => (
                            <button key={l.label} onClick={l.action} style={{
                                display: "block",
                                background: "none",
                                border: "none",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                padding: "4px 0",
                                fontFamily: "inherit",
                                textAlign: "left"
                            }}>{l.label}</button>
                        ))}
                    </div>
                </div>

                {/* Fair play notice */}
                <div style={{
                    textAlign: "center",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    // paddingTop: 20,
                    maxWidth: 900,
                    margin: "0 auto"
                }}>
                    <div style={{
                        color: "#FFD700",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        marginBottom: 6,
                        letterSpacing: "0.05em"
                    }}>POINTS-BASED QUIZ PLAY
                    </div>
                    <div style={{
                        color: "rgba(255,255,255,0.25)",
                        fontSize: "0.68rem",
                        lineHeight: 1.6,
                        maxWidth: 400,
                        margin: "0 auto 12px"
                    }}>
                        Bongo Quiz is a skill-based trivia game. Scores earn points for leaderboard ranking only.
                    </div>
                    <div
                        style={{color: "rgba(255,255,255,0.2)", fontSize: "0.65rem"}}>© {new Date().getFullYear()} Bongo
                        Quiz. All Rights Reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};
