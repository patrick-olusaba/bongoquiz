import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

interface SaveSessionData {
    name: string;
    phone: string;
    power: string;
    r1Score: number;
    r2Score: number;
    r3Bonus: number;
}

/**
 * saveGameSession — callable Cloud Function.
 * Validates inputs server-side before writing to Firestore,
 * so clients cannot write arbitrary scores directly.
 */
export const saveGameSession = functions.https.onCall(
    async (request: functions.https.CallableRequest<SaveSessionData>) => {
        const data = request.data;

        // Basic validation
        if (typeof data.name   !== "string" || data.name.trim().length === 0)  throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone  !== "string" || !/^07\d{8}$/.test(data.phone))  throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.r1Score !== "number" || data.r1Score < 0)              throw new functions.https.HttpsError("invalid-argument", "Invalid r1Score");
        if (typeof data.r2Score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid r2Score");
        if (typeof data.r3Bonus !== "number" || data.r3Bonus < 0)              throw new functions.https.HttpsError("invalid-argument", "Invalid r3Bonus");

        // Sanity caps — adjust to your actual max possible scores
        const MAX_R1 = 15000, MAX_R2 = 25000, MAX_R3 = 50000;
        if (data.r1Score > MAX_R1 || data.r2Score > MAX_R2 || data.r3Bonus > MAX_R3) {
            throw new functions.https.HttpsError("invalid-argument", "Score out of range");
        }

        const total = data.r1Score + data.r2Score + data.r3Bonus;
        const name  = data.name.trim().slice(0, 20);

        const sessionRef = await db.collection("gameSessions").add({
            name,
            phone:   data.phone,
            power:   typeof data.power === "string" ? data.power.slice(0, 50) : "",
            r1Score: data.r1Score,
            r2Score: data.r2Score,
            r3Bonus: data.r3Bonus,
            total,
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Upsert leaderboard — keep highest score per phone
        const lbRef = db.collection("leaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < total) {
            await lbRef.set({
                name,
                phone: data.phone,
                score: total,
                playedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return { sessionId: sessionRef.id, total };
    }
);
