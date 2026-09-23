// scaffoldTournaments.mjs — make several tournaments active so players can pick.
// Only scaffolds game types that have questions in the shared bank
// (generalKnowledge, carLogos). Writes to quizTournaments (rules allow write).
//
//   node scripts/scaffoldTournaments.mjs            # dry run
//   node scripts/scaffoldTournaments.mjs --write    # apply

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, Timestamp, serverTimestamp } from "firebase/firestore";

const WRITE = process.argv.includes("--write");

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

const now = Date.now();
const startsAt = Timestamp.fromMillis(now - 60 * 1000);          // started a minute ago
const endsWeekly = Timestamp.fromMillis(now + 7 * 86400 * 1000); // +7 days
const endsDaily = Timestamp.fromMillis(now + 86400 * 1000);      // +24 hours

const rewards = [
    { rank: "1st Place", title: "Champion Pack", items: ["2,000 Coins", "Exclusive Shirt", "Winner Badge"] },
    { rank: "2nd Place", title: "Silver Pack", items: ["1,000 Coins", "Silver Medal"] },
    { rank: "3rd Place", title: "Bronze Pack", items: ["500 Coins", "Bronze Medal"] },
    { rank: "Top 10", title: "Community Recognition", items: ["Badge", "200 Coins"] },
];

const base = (over) => ({
    subtitle: "Answer the tournament questions and climb the leaderboard.",
    status: "active",
    active: true,
    entryFeeCoins: 0,
    durationSeconds: 80,
    dailyStartTime: "08:00",
    rewards,
    startsAt,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    ...over,
});

// id === existing doc id -> update in place; else create new
const plan = [
    { id: "q7VbxfgeLWJko7So15CF", title: "Weekly BongoQuiz Cup",   quizType: "generalKnowledge", tournamentCycle: "weekly", endsAt: endsWeekly, note: "activate existing GK tournament" },
    { id: null,                   title: "General Knowledge Daily", quizType: "generalKnowledge", tournamentCycle: "daily",  endsAt: endsDaily,  note: "new daily GK tournament" },
    { id: null,                   title: "Car Logos Cup",           quizType: "carLogos",         tournamentCycle: "daily",  endsAt: endsDaily,  note: "new Car Logos tournament" },
];

async function main() {
    for (const t of plan) {
        const ref = t.id ? doc(db, "quizTournaments", t.id) : doc(collection(db, "quizTournaments"));
        const payload = base({ title: t.title, quizType: t.quizType, tournamentCycle: t.tournamentCycle, endsAt: t.endsAt });
        console.log(`${WRITE ? "WRITE" : "DRY "} [${t.quizType}] "${t.title}" -> ${ref.id}  (${t.note})`);
        if (WRITE) await setDoc(ref, payload, { merge: true });
    }
    if (!WRITE) console.log("\nDry run. Re-run with --write to apply.");
    else console.log("\nDone — tournaments are active.");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
