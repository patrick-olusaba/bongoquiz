/**
 * Deletes duplicate gameSessions from Firestore.
 * Keeps the earliest document per (phone, r1Score, r2Score, r3Bonus) group.
 * Run: node scripts/dedup-sessions.js
 */
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function dedup() {
    const snap = await db.collection("gameSessions").get();
    const groups = new Map();

    snap.docs.forEach(d => {
        const { phone, r1Score, r2Score, r3Bonus, playedAt } = d.data();
        const key = `${phone}|${r1Score}|${r2Score}|${r3Bonus}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ id: d.id, playedAt: playedAt?.toDate?.() ?? new Date(0) });
    });

    const toDelete = [];
    groups.forEach(docs => {
        if (docs.length < 2) return;
        // Sort oldest first, keep the first, delete the rest
        docs.sort((a, b) => a.playedAt - b.playedAt);
        docs.slice(1).forEach(d => toDelete.push(d.id));
    });

    if (toDelete.length === 0) { console.log("No duplicates found."); process.exit(0); }

    console.log(`Deleting ${toDelete.length} duplicate(s)…`);
    // Batch deletes (max 500 per batch)
    for (let i = 0; i < toDelete.length; i += 500) {
        const batch = db.batch();
        toDelete.slice(i, i + 500).forEach(id => batch.delete(db.collection("gameSessions").doc(id)));
        await batch.commit();
    }
    console.log("Done.");
    process.exit(0);
}

dedup().catch(e => { console.error(e); process.exit(1); });
