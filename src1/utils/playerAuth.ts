import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.ts";
import { getPendingReferralCode, markReferralRedeemed, referralCodeForPhone } from "./referral.ts";

const isPhone = (v: string) => /^07\d{8}$/.test(v);

interface PlayerRecord {
    name: string;
    phone: string;
    pin: string;
    hasPin: boolean;
    createdAt?: any;
}

export async function lookupPlayer(phone: string): Promise<{ name: string; hasPin: boolean } | null> {
    const snap = await getDoc(doc(db, "players", phone));
    if (!snap.exists()) return null;
    const data = snap.data() as PlayerRecord;
    return { name: data.name, hasPin: !!data.pin && data.pin !== "0000" };
}

export async function verifyPin(phone: string, pin: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "players", phone));
    if (!snap.exists()) return false;
    const data = snap.data() as PlayerRecord;
    const stored = data.pin ? String(data.pin) : "0000";
    return stored === pin;
}

export async function registerPlayer(name: string, phone: string, pin: string): Promise<void> {
    const ref = doc(db, "players", phone);
    const snap = await getDoc(ref);
    const isNew = !snap.exists();
    const pending = isNew ? getPendingReferralCode() : null;
    // A pending value is either a masked code or a legacy phone link — store it
    // in the matching field so the server can resolve the referrer either way.
    const pendingFields = pending && pending !== phone
        ? (isPhone(pending) ? { pendingReferrer: pending } : { pendingReferralCode: pending })
        : {};
    const write = setDoc(ref, {
        name, phone, pin, hasPin: true,
        referralCode: referralCodeForPhone(phone),  // this player's own masked code
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        ...(isNew ? pendingFields : {}),
    }, { merge: true });
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Save timed out. Check your connection.")), 10000)
    );
    await Promise.race([write, timeout]);
    if (pending) markReferralRedeemed();
}

/**
 * Make sure a player's masked referral code is stored on their record so the
 * server can resolve `?ref=<code>` back to this phone. Safe to call before
 * sharing a link; fire-and-forget, never throws.
 */
export async function ensureReferralCode(phone?: string | null): Promise<void> {
    if (!phone || !isPhone(phone)) return;
    try {
        await setDoc(doc(db, "players", phone), { referralCode: referralCodeForPhone(phone) }, { merge: true });
    } catch {
        /* non-fatal */
    }
}

export function saveLocalProfile(name: string, phone: string): void {
    localStorage.setItem("bongo_player_name", name);
    localStorage.setItem("bongo_player_phone", phone);
    localStorage.setItem("bongo_last_activity", Date.now().toString());
}
