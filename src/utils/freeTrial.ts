// freeTrial.ts — gives every new player one full free flagship game (R1+R2+R3)
// before the M-Pesa paywall kicks in. The free game is the single biggest
// acquisition lever: it lets a player feel the full loop before paying.
//
// Tracked per phone number in localStorage. This is a client-side hook, not a
// hard entitlement — server-side enforcement (a Cloud Function flag on the
// player doc) should back this if abuse becomes a concern.

const USED_KEY = "bongo_free_games_used";

const readUsed = (): string[] => {
    try {
        const raw = localStorage.getItem(USED_KEY);
        const arr = raw ? (JSON.parse(raw) as unknown) : [];
        return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
        return [];
    }
};

const isValidPhone = (phone?: string | null): phone is string =>
    !!phone && /^07\d{8}$/.test(phone);

/**
 * Is a free game still available?
 * - With no valid phone yet (guest on the home screen) we return true so the
 *   "first game free" hook shows and pulls them into signing in.
 * - With a valid phone, true only if that phone hasn't consumed its free game.
 */
export function isFreeGameAvailable(phone?: string | null): boolean {
    if (!isValidPhone(phone)) return true;
    return !readUsed().includes(phone);
}

/**
 * Fast, synchronous "is this a returning player?" heuristic, used to gate the
 * free game so only NEW users get it. Returns true the moment we see any sign
 * of prior play, so an existing player never slips through before the
 * authoritative Firestore game-history check completes.
 */
export function looksLikeReturningPlayer(phone?: string | null): boolean {
    const best  = parseInt(localStorage.getItem("bongo_best_score") ?? "0", 10);
    const total = parseInt(localStorage.getItem("bongo_total_points") ?? "0", 10);
    if (best > 0 || total > 0) return true;
    if (isValidPhone(phone) && readUsed().includes(phone)) return true;
    return false;
}

/** Mark this phone's free game as used. Call once the free game completes. */
export function consumeFreeGame(phone?: string | null): void {
    if (!isValidPhone(phone)) return;
    const used = readUsed();
    if (used.includes(phone)) return;
    used.push(phone);
    try {
        localStorage.setItem(USED_KEY, JSON.stringify(used));
    } catch {
        /* storage full / unavailable — non-fatal */
    }
}
