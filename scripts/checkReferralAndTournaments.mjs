// checkReferralAndTournaments.mjs — read-only verification.
// Confirms (1) referral data is being saved in Firestore and the new masked
// code resolves to a phone, and (2) tournament leaderboard entries are saved.
//
//   node scripts/checkReferralAndTournaments.mjs

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

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

// Mirror of the client/server code generator so we can verify resolution.
function cyrb53(str, seed = 0x9e3779b9) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const codeFor = phone => cyrb53("bq:" + phone).toString(36).padStart(9, "0").slice(-9);

console.log("Project:", env.VITE_FIREBASE_PROJECT_ID, "\n");

// ── 1. REFERRALS ────────────────────────────────────────────────────────────
console.log("=== referrals collection (server-written redemptions) ===");
try {
    const refSnap = await getDocs(collection(db, "referrals"));
    console.log("Total redemption docs:", refSnap.size);
    refSnap.docs.slice(0, 5).forEach(d => {
        const r = d.data();
        console.log(`  • ${d.id}: referrer=${r.referrerPhone} new=${r.newUserPhone} coins=${r.referrerCoins}+${r.welcomeCoins} score=${r.score}`);
    });
} catch (e) {
    console.log(`  (cannot list as unauthenticated visitor: ${e.code} — admin/owner reads only; checking via players instead)`);
}

// ── 2. PLAYERS: codes, pending markers, attribution ────────────────────────────
const playersSnap = await getDocs(collection(db, "players"));
let withCode = 0, codeOk = 0, pendingCode = 0, pendingPhone = 0, referredBy = 0;
playersSnap.docs.forEach(d => {
    const p = d.data();
    const phone = p.phone || d.id;
    if (p.referralCode) { withCode++; if (codeFor(phone) === p.referralCode) codeOk++; }
    if (p.pendingReferralCode) pendingCode++;
    if (p.pendingReferrer) pendingPhone++;
    if (p.referredBy) referredBy++;
});
console.log("\n=== players collection ===");
console.log("Total players:", playersSnap.size);
console.log(`  referralCode stored: ${withCode} (code matches phone: ${codeOk})`);
console.log(`  pendingReferralCode (new masked, awaiting redeem): ${pendingCode}`);
console.log(`  pendingReferrer (legacy phone, awaiting redeem):   ${pendingPhone}`);
console.log(`  referredBy (already attributed): ${referredBy}`);

// Show that a stored code resolves to exactly one phone (server resolution check)
const sampleCoded = playersSnap.docs.find(d => d.data().referralCode);
if (sampleCoded) {
    const code = sampleCoded.data().referralCode;
    const owners = playersSnap.docs.filter(d => d.data().referralCode === code);
    console.log(`\n  Resolution check: code "${code}" -> ${owners.length} owner(s) (${owners.map(o => o.data().phone || o.id).join(", ")})`);
    console.log(`  Sample masked link: https://bongoquiz.com/?ref=${code}`);
}

// ── 3. TOURNAMENT LEADERBOARDS ────────────────────────────────────────────────
console.log("\n=== quizTournaments leaderboards ===");
const tSnap = await getDocs(collection(db, "quizTournaments"));
console.log("Total tournaments:", tSnap.size);
for (const t of tSnap.docs.slice(0, 8)) {
    const data = t.data();
    const entries = await getDocs(query(collection(db, "quizTournaments", t.id, "entries"), orderBy("points", "desc"), limit(3)));
    const events = await getDocs(collection(db, "quizTournaments", t.id, "events"));
    console.log(`\n  [${data.status}] ${data.title} (${data.quizType}) id=${t.id}`);
    console.log(`    entries: ${entries.size > 0 ? "(top)" : "none"}  events: ${events.size}`);
    entries.docs.forEach((e, i) => {
        const v = e.data();
        console.log(`      ${i + 1}. ${v.name} (${v.phone}) — ${v.points} pts, ${v.sessions} sessions`);
    });
}

process.exit(0);
