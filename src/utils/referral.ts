// referral.ts — WhatsApp share links + referral capture/attribution.
//
// Loop: an existing player shares `?ref=<theirPhone>` over WhatsApp → a NEW
// visitor opens it → we remember the referrer → when that new player finishes
// their first game, the server (`redeemReferral`) credits BongoCoins to both.

const REFERRER_KEY = "bongo_referred_by";
const REDEEMED_KEY = "bongo_referral_redeemed";

const isValidPhone = (p?: string | null): p is string => !!p && /^07\d{8}$/.test(p);

/** Player-facing referral link, e.g. https://app.url/?ref=0712345678 */
export function getReferralLink(phone?: string | null): string {
    const base = "https://bongoquiz.com";
    return isValidPhone(phone) ? `${base}/?ref=${phone}` : base;
}

/** Wrap a message in a WhatsApp deep link (opens chat picker / app). */
export function buildWhatsAppShareUrl(message: string): string {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Read `?ref=` once on app load and remember the referrer — but ONLY for a
 * genuinely new visitor. Established players (existing phone or prior score)
 * are ignored so referral rewards stay a new-user acquisition lever.
 */
export function captureReferralFromUrl(): void {
    try {
        const ref = new URLSearchParams(window.location.search).get("ref");
        if (!isValidPhone(ref)) return;

        const myPhone = localStorage.getItem("bongo_player_phone");
        const best  = parseInt(localStorage.getItem("bongo_best_score") ?? "0", 10);
        const total = parseInt(localStorage.getItem("bongo_total_points") ?? "0", 10);

        // Self-referral, established players, or an already-rewarded device: skip.
        if (myPhone === ref) return;
        if (isValidPhone(myPhone) || best > 0 || total > 0) return;
        if (localStorage.getItem(REDEEMED_KEY)) return;

        if (!localStorage.getItem(REFERRER_KEY)) localStorage.setItem(REFERRER_KEY, ref);
    } catch {
        /* ignore */
    }
}

/** The referrer phone awaiting attribution, if any. */
export function clearPendingReferrer(): void {
    localStorage.removeItem(REFERRER_KEY);
}

export function getPendingReferrer(): string | null {
    const v = localStorage.getItem(REFERRER_KEY);
    return isValidPhone(v) ? v : null;
}

/** Called once attribution succeeds so we never double-redeem on this device. */
export function markReferralRedeemed(): void {
    localStorage.setItem(REDEEMED_KEY, "1");
    localStorage.removeItem(REFERRER_KEY);
}
