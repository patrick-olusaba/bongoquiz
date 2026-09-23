// streakDays.ts — consecutive days played tracker

export interface StreakInfo {
    current: number;   // current consecutive days
    best:    number;   // all-time best streak
    lastPlayed?: string; // ISO date string
}

export function getStreakInfo(): StreakInfo {
    try {
        return JSON.parse(localStorage.getItem("bongo_streak") ?? "{}") as StreakInfo;
    } catch { return { current: 0, best: 0 }; }
}

export function recordPlayToday(): StreakInfo {
    const today   = new Date().toISOString().slice(0, 10); // "2026-03-04"
    const info    = getStreakInfo();
    const last    = info.lastPlayed;

    if (last === today) return info; // already recorded today

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newCurrent = last === yesterday ? (info.current ?? 0) + 1 : 1;
    const newBest    = Math.max(info.best ?? 0, newCurrent);

    const updated: StreakInfo = { current: newCurrent, best: newBest, lastPlayed: today };
    localStorage.setItem("bongo_streak", JSON.stringify(updated));
    return updated;
}