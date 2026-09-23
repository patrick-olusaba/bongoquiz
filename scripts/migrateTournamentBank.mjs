// migrateTournamentBank.mjs — one-off migration.
// Consolidates every existing quizTournaments/{id}/questions doc into the new
// shared, top-level `tournamentQuestionBank` collection, keyed by each
// question's own quizType. Deduplicates globally by quizType + question text +
// visual. Additive only: it never deletes or edits the source subcollections.
//
//   node scripts/migrateTournamentBank.mjs            # dry run (counts only)
//   node scripts/migrateTournamentBank.mjs --write    # actually write the bank

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import {
    getFirestore, collection, getDocs, writeBatch, doc, query, where, limit,
} from "firebase/firestore";

const WRITE = process.argv.includes("--write");

// Load VITE_FIREBASE_* from .env
const env = Object.fromEntries(
    readFileSync(new URL("../.env", import.meta.url), "utf8")
        .split("\n").filter(Boolean).map(line => {
            const i = line.indexOf("=");
            return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        })
);

const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const VALID = ["generalKnowledge", "sports", "carLogos", "brandLogos", "trickQuestions", "kenyaTrivia"];
const norm = v => VALID.includes(v) ? v : "generalKnowledge";
const BANK = "tournamentQuestionBank";

const dedupeKey = (q) =>
    [norm(q.quizType), String(q.question || "").toLowerCase().replace(/\s+/g, " ").trim(), q.visualImageUrl || "", q.visual || ""].join("|");

async function main() {
    // Skip anything already in the bank (so the script is safe to re-run).
    const existing = new Set();
    const bankSnap = await getDocs(collection(db, BANK));
    bankSnap.forEach(d => existing.add(dedupeKey(d.data())));
    console.log(`Existing bank docs: ${bankSnap.size}`);

    const tournaments = await getDocs(collection(db, "quizTournaments"));
    const seen = new Set(existing);
    const toWrite = [];
    const perType = {};

    for (const t of tournaments.docs) {
        const qSnap = await getDocs(collection(db, "quizTournaments", t.id, "questions"));
        for (const qd of qSnap.docs) {
            const q = qd.data();
            if (!q.question || !Array.isArray(q.options) || q.options.length < 2) continue;
            const quizType = norm(q.quizType || t.data().quizType);
            const key = dedupeKey({ ...q, quizType });
            if (seen.has(key)) continue;
            seen.add(key);
            toWrite.push({
                question: String(q.question).trim(),
                options: q.options.map(o => String(o).trim()).filter(Boolean),
                answer: Number(q.answer ?? 0),
                active: q.active !== false,
                quizType,
                difficulty: q.difficulty || "easy",
                visual: q.visual ?? null,
                visualImageUrl: q.visualImageUrl ?? null,
                order: toWrite.length + 1,
                migratedFrom: `${t.id}/${qd.id}`,
                createdAt: new Date().toISOString(),
            });
            perType[quizType] = (perType[quizType] || 0) + 1;
        }
    }

    console.log("New unique questions to migrate, by quizType:", perType);
    console.log("Total new:", toWrite.length);

    if (!WRITE) { console.log("\nDry run. Re-run with --write to commit."); return; }

    let written = 0;
    for (let i = 0; i < toWrite.length; i += 450) {
        const batch = writeBatch(db);
        for (const q of toWrite.slice(i, i + 450)) batch.set(doc(collection(db, BANK)), q);
        await batch.commit();
        written += Math.min(450, toWrite.length - i);
        console.log(`  committed ${written}/${toWrite.length}`);
    }
    console.log("Done.");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
