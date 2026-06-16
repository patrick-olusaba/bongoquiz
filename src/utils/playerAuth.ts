import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.ts";
import { getPendingReferrer, markReferralRedeemed } from "./referral.ts";

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
    const pendingReferrer = isNew ? getPendingReferrer() : null;
    const write = setDoc(ref, {
        name, phone, pin, hasPin: true,
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        ...(isNew && pendingReferrer && pendingReferrer !== phone ? { pendingReferrer } : {}),
    }, { merge: true });
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Save timed out. Check your connection.")), 10000)
    );
    await Promise.race([write, timeout]);
    if (pendingReferrer) markReferralRedeemed();
}

export function saveLocalProfile(name: string, phone: string): void {
    localStorage.setItem("bongo_player_name", name);
    localStorage.setItem("bongo_player_phone", phone);
    localStorage.setItem("bongo_last_activity", Date.now().toString());
}
