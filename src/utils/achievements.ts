// achievements.ts — badge unlock logic + localStorage persistence

export interface Achievement {
    id:          string;
    name:        string;
    desc:        string;
    emoji:       string;
    unlockedAt?: number;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
    { id: "first_win",     name: "First Win",      emoji: "🎉", desc: "Complete your first full game"                  },
    { id: "perfectionist", name: "Perfectionist",  emoji: "💎", desc: "Answer all 5 Round 2 questions correctly"       },
    { id: "speed_demon",   name: "Speed Demon",    emoji: "⚡", desc: "Finish Round 1 with 60+ seconds remaining"      },
    { id: "high_roller",   name: "High Roller",    emoji: "🎰", desc: "Score 20,000 points or more in a single game"   },
    { id: "on_fire",       name: "On Fire",        emoji: "🔥", desc: "Get a 10-answer streak in Round 1"              },
    { id: "comeback_kid",  name: "Comeback Kid",   emoji: "💪", desc: "Score 0 in Round 1 but still finish the game"   },
];

// Returns all achievements with unlockedAt set for ones already earned
export function getUnlocked(): Achievement[] {
    try {
        const raw = JSON.parse(localStorage.getItem("bongo_achievements") ?? "{}") as Record<string, number>;
        return ALL_ACHIEVEMENTS.map((a: Achievement) => raw[a.id] ? { ...a, unlockedAt: raw[a.id] } : a);
    } catch { return ALL_ACHIEVEMENTS.slice(); }
}

// Returns IDs that qualify based on this game's stats
export function checkAchievements(params: {
    total:      number;
    r2Correct:  number;
    r2Total:    number;
    r1TimeLeft: number;
    r1Score:    number;
    maxStreak:  number;
}): string[] {
    const ids: string[] = [];

    ids.push("first_win"); // always earned on completing a game

    if (params.r2Correct === params.r2Total && params.r2Total > 0) ids.push("perfectionist");
    if (params.r1TimeLeft >= 60)  ids.push("speed_demon");
    if (params.total >= 20000)    ids.push("high_roller");
    if (params.maxStreak >= 10)   ids.push("on_fire");
    if (params.r1Score === 0)     ids.push("comeback_kid");

    return ids;
}

// Saves any newly earned badges to storage.
// Returns ALL badges earned this round — including previously unlocked ones —
// EXCEPT first_win which only shows on the very first game ever.
export function unlockAchievements(ids: string[]): Achievement[] {
    try {
        const raw    = JSON.parse(localStorage.getItem("bongo_achievements") ?? "{}") as Record<string, number>;
        const now    = Date.now();

        // Persist any that aren't stored yet
        const newIds = ids.filter((id: string) => !raw[id]);
        if (newIds.length > 0) {
            newIds.forEach((id: string) => { raw[id] = now; });
            localStorage.setItem("bongo_achievements", JSON.stringify(raw));
        }

        // Show every badge earned this round, but first_win only on its very first unlock
        return ALL_ACHIEVEMENTS.filter((a: Achievement) => {
            if (!ids.includes(a.id)) return false;          // not earned this round
            if (a.id === "first_win") return newIds.includes(a.id); // only show once ever
            return true;                                     // all others: always show
        });
    } catch {
        return [];
    }
}