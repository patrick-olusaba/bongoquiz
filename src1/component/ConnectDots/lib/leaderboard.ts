import { collection, getDocs, getFirestore, limit, orderBy, query } from "firebase/firestore";

export interface LeaderboardEntry {
    id: string;
    name: string;
    phone: string;
    pts: number;
    date: string;
}

const localKey = "connectDotsLeaderboard";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
        const snap = await getDocs(query(
            collection(getFirestore(), "connectDotsLeaderboard"),
            orderBy("score", "desc"),
            limit(50),
        ));

        const entries = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: String(data.name ?? "Player"),
                phone: String(data.phone ?? "").slice(0, 4) + "****",
                pts: Number(data.score ?? 0),
                date: data.playedAt?.toDate?.()?.toLocaleDateString?.() ?? "",
            };
        });

        localStorage.setItem(localKey, JSON.stringify(entries));
        return entries;
    } catch (error) {
        console.error("Failed to fetch Connect Dots leaderboard", error);
        try {
            const data = localStorage.getItem(localKey);
            return data ? JSON.parse(data) as LeaderboardEntry[] : [];
        } catch {
            return [];
        }
    }
}

export function saveScoreToLocalLeaderboard(name: string, phone: string, pts: number) {
    if (!name) return;
    try {
        const data = localStorage.getItem(localKey);
        const lb: LeaderboardEntry[] = data ? JSON.parse(data) : [];
        const existingIndex = lb.findIndex(p => p.phone === phone || p.name === name);
        const date = new Date().toLocaleDateString();

        if (existingIndex >= 0) {
            if (pts > lb[existingIndex].pts) {
                lb[existingIndex] = { ...lb[existingIndex], name, phone, pts, date };
            }
        } else {
            lb.push({ id: Date.now().toString(), name, phone, pts, date });
        }

        lb.sort((a, b) => b.pts - a.pts);
        localStorage.setItem(localKey, JSON.stringify(lb));
    } catch (error) {
        console.error("Failed to save local Connect Dots score", error);
    }
}
