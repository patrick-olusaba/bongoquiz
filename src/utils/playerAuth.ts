import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.ts";

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
    await setDoc(ref, {
        name, phone, pin, hasPin: true,
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
    }, { merge: true });
}

export function saveLocalProfile(name: string, phone: string): void {
    localStorage.setItem("bongo_player_name", name);
    localStorage.setItem("bongo_player_phone", phone);
    localStorage.setItem("bongo_last_activity", Date.now().toString());
}
