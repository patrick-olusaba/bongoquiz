import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.ts";

export type MergedLeaderboardEntry = {
    rank: number;
    name: string;
    phone: string;
    score: number;
    playedAt?: any;
};

const toKey = (phone: string) => String(phone || "").replace(/^0/, "254");
const toPhone07 = (phone: string) => toKey(phone).replace(/^254/, "0");
const maskPhone = (phone: string) => phone.slice(0, 3) + "*******";

export async function fetchMergedLeaderboard(limitRows?: number): Promise<MergedLeaderboardEntry[]> {
    const sqlFetch = fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard")
        .then(response => response.json())
        .catch(() => []);
    const fbFetch = getDocs(collection(db, "leaderboard"))
        .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        .catch(() => []);

    const [sqlRaw, fbRaw] = await Promise.all([sqlFetch, fbFetch]);
    const byPhone = new Map<string, { name: string; phone: string; score: number; playedAt?: any }>();

    (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((entry: any) => {
        const phone = toKey(String(entry.msisdn ?? entry.phone ?? ""));
        if (!phone) return;
        const score = Number(entry.score ?? 0);
        const phone07 = phone.replace(/^254/, "0");
        const existing = byPhone.get(phone);
        if (!existing || score > existing.score) {
            byPhone.set(phone, { name: maskPhone(phone07), phone: phone07, score, playedAt: null });
        }
    });

    (Array.isArray(fbRaw) ? fbRaw : []).forEach((entry: any) => {
        const phone = toKey(entry.phone || entry.id || "");
        if (!phone) return;
        const score = Number(entry.score ?? 0);
        const phone07 = toPhone07(phone);
        const existing = byPhone.get(phone);
        const validName = entry.name && !/^\d/.test(String(entry.name)) ? String(entry.name) : existing?.name;
        if (!existing || score > existing.score) {
            byPhone.set(phone, { name: validName ?? maskPhone(phone07), phone: phone07, score, playedAt: entry.playedAt ?? null });
        } else if (existing && validName) {
            byPhone.set(phone, { ...existing, name: validName });
        }
    });

    const sorted = Array.from(byPhone.values())
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    return typeof limitRows === "number" ? sorted.slice(0, limitRows) : sorted;
}
