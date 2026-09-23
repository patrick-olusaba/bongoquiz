// referral.ts — WhatsApp share links + referral capture/attribution.
//
// Loop: an existing player shares `?ref=<code>` over WhatsApp → a NEW
// visitor opens it → we remember the referrer code → when that new player
// finishes their first game, the server (`redeemReferral`) resolves the code
// back to the referrer's phone and credits BongoCoins to both.
//
// The phone number is NEVER put in the shared link. We derive a short,
// stable alphanumeric code from the phone instead (e.g. ?ref=3kf9d2a7q).

const REFERRER_KEY = "bongo_referred_by";
const REDEEMED_KEY = "bongo_referral_redeemed";

const isValidPhone = (p?: string | null): p is string => !!p && /^07\d{8}$/.test(p);
const isValidCode  = (c?: string | null): c is string => !!c && /^[a-z0-9]{6,14}$/.test(c);

// cyrb53 — fast, well-distributed 53-bit non-crypto hash. Used to turn a phone
// into a stable code. Two phones colliding on the same code is astronomically
// unlikely at our user scale, and the server falls back to "no referrer" if it
// ever can't resolve a single owner for a code.
function cyrb53(str: string, seed = 0x9e3779b9): number {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Stable masked referral code for a phone, e.g. "3kf9d2a7q" (9 alphanumeric chars). */
export function referralCodeForPhone(phone?: string | null): string | null {
    if (!isValidPhone(phone)) return null;
    return cyrb53("bq:" + phone).toString(36).padStart(9, "0").slice(-9);
}

/** Player-facing referral link, e.g. https://app.url/?ref=3kf9d2a7q (phone masked). */
export function getReferralLink(phone?: string | null): string {
    const base = "https://bongoquiz.com";
    const code = referralCodeForPhone(phone);
    return code ? `${base}/?ref=${code}` : base;
}

/** Wrap a message in a WhatsApp deep link (opens chat picker / app). */
export function buildWhatsAppShareUrl(message: string): string {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Read `?ref=` once on app load and remember the referrer — but ONLY for a
 * genuinely new visitor. Established players (existing phone or prior score)
 * are ignored so referral rewards stay a new-user acquisition lever.
 *
 * Accepts both the new masked code (`?ref=3kf9d2a7q`) and legacy phone links
 * (`?ref=0712345678`) so links already shared in the wild keep working.
 */
export function captureReferralFromUrl(): void {
    try {
        const ref = (new URLSearchParams(window.location.search).get("ref") || "").trim().toLowerCase();
        if (!isValidCode(ref) && !isValidPhone(ref)) return;

        const myPhone = localStorage.getItem("bongo_player_phone");
        const best  = parseInt(localStorage.getItem("bongo_best_score") ?? "0", 10);
        const total = parseInt(localStorage.getItem("bongo_total_points") ?? "0", 10);

        // Self-referral guard (compare phone or its derived code).
        if (myPhone && (myPhone === ref || referralCodeForPhone(myPhone) === ref)) return;
        // Established players or an already-rewarded device: skip.
        if (isValidPhone(myPhone) || best > 0 || total > 0) return;
        if (localStorage.getItem(REDEEMED_KEY)) return;

        if (!localStorage.getItem(REFERRER_KEY)) localStorage.setItem(REFERRER_KEY, ref);
    } catch {
        /* ignore */
    }
}

export function clearPendingReferrer(): void {
    localStorage.removeItem(REFERRER_KEY);
}

/** The pending referral value awaiting attribution — a masked code or legacy phone. */
export function getPendingReferralCode(): string | null {
    const v = localStorage.getItem(REFERRER_KEY);
    return isValidCode(v) || isValidPhone(v) ? v : null;
}

/** Called once attribution succeeds so we never double-redeem on this device. */
export function markReferralRedeemed(): void {
    localStorage.setItem(REDEEMED_KEY, "1");
    localStorage.removeItem(REFERRER_KEY);
}
