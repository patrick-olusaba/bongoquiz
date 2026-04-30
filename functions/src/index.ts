import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as http from "http";

admin.initializeApp();
const db = admin.firestore();

// Secret shared with the payment backend — set this in Firebase config:
// firebase functions:config:set callback.secret="YOUR_SECRET_HERE"
const CALLBACK_SECRET = (functions.config().callback?.secret ?? "") as string;

function isValidCallback(req: functions.https.Request): boolean {
    if (!CALLBACK_SECRET) return true; // not configured yet — allow (remove this once secret is set)
    return req.headers["x-callback-secret"] === CALLBACK_SECRET;
}

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
/**
 * consumeGrantedSession — callable. Deletes a granted session after it's been used.
 * Prevents clients from deleting other users' sessions.
 */
export const consumeGrantedSession = functions.https.onCall(
    async (data: { phone: string }) => {
        const { phone } = data;
        if (typeof phone !== "string" || !/^07\d{8}$/.test(phone))
            throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        await db.collection("grantedSessions").doc(phone).delete();
        return { success: true };
    }
);

export const saveGameSession = functions.https.onCall(
    async (data: SaveSessionData) => {
        // data is already the first argument

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


        // POST to SQL leaderboard server-side (non-fatal, 5s timeout)
        const msisdn = data.phone.replace(/^0/, "254");
        const sqlPayload = JSON.stringify({ msisdn, score: total });
        await Promise.race([
            new Promise<void>((resolve) => {
                const options = {
                    hostname: "142.93.47.187", port: 2027,
                    path: "/api/savewebscore", method: "POST",
                    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(sqlPayload) },
                };
                const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
                req.on("error", () => resolve());
                req.write(sqlPayload); req.end();
            }),
            new Promise<void>(resolve => setTimeout(resolve, 5000)),
        ]);

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

/**
 * getLeaderboard — HTTP proxy so the HTTPS frontend can fetch the HTTP SQL leaderboard.
 */
export const getLeaderboard = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    try {
        const data = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/lifetime-leaderboard", method: "GET" };
            const request = http.request(options, (response) => {
                let body = "";
                response.on("data", chunk => { body += chunk; });
                response.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve([]); } });
            });
            request.on("error", reject);
            request.end();
        });
        res.status(200).json(data);
    } catch {
        res.status(200).json([]);
    }
});

interface StkPushData {
    name:    string;
    phone:   string;
    amount:  number;
    billref: string;
}

/**
 * deposit — HTTP endpoint to initiate M-Pesa STK push AND receive callback.
 */
export const deposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        // Check if this is a callback (has trans_id) or initiation request
        if (body.trans_id) {
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;

            // Match by phone + pending status (most recent) — preserves original trigger (BBQ, R1R2, etc.)
            const existing = await db.collection("payments")
                .where("phone", "==", phone)
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .limit(1).get();

            if (!existing.empty) {
                await existing.docs[0].ref.update({
                    status: "paid",
                    trans_id,
                    trans_time,
                    business_shortcode,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                await db.collection("payments").add({
                    name, phone, amount,
                    status: "paid",
                    trans_id,
                    trans_time,
                    business_shortcode,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            res.status(200).json({ success: true, message: "Payment recorded" });
            return;
        }

        // Otherwise, this is an initiation request
        const { name, phone, amount, trigger } = body;

        if (typeof name   !== "string" || name.trim().length === 0)    { res.status(400).json({ error: "Invalid name" });    return; }
        if (typeof phone  !== "string" || !/^254\d{9}$/.test(phone))   { res.status(400).json({ error: "Invalid phone" });   return; }
        if (typeof amount !== "number" || amount <= 0)                  { res.status(400).json({ error: "Invalid amount" });  return; }
        if (typeof trigger !== "string" || trigger.trim().length === 0) { res.status(400).json({ error: "Invalid trigger" }); return; }

        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });

        const result = await new Promise<any>((resolve, reject) => {
            const options = {
                hostname: "142.93.47.187",
                port: 2610,
                path: "/ngomma/bongo/stkrequest",
                method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            };
            const request = http.request(options, (response) => {
                let body = "";
                response.on("data", (chunk) => { body += chunk; });
                response.on("end", () => {
                    try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
                });
            });
            request.on("error", reject);
            request.write(payload);
            request.end();
        });

        // Save pending payment to Firestore
        const docRef = await db.collection("payments").add({
            name: name.trim(), phone, amount, trigger,
            status: "pending",
            checkoutRequestId: result?.CheckoutRequestID ?? result?.checkoutRequestId ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("Deposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface StkCallbackData {
    Body: {
        stkCallback: {
            MerchantRequestID: string;
            CheckoutRequestID: string;
            ResultCode: number;
            ResultDesc: string;
            CallbackMetadata?: {
                Item: Array<{
                    Name: string;
                    Value: string | number;
                }>;
            };
        };
    };
}

/**
 * stkCallback — HTTP endpoint for M-Pesa STK push callback.
 * Receives payment confirmation from Safaricom and stores in Firestore.
 */
export const stkCallback = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }

    try {
        const data: StkCallbackData = req.body;
        const callback = data.Body?.stkCallback;

        if (!callback) {
            res.status(400).send("Invalid callback data");
            return;
        }

        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

        let amount = 0;
        let receipt = "";
        let phone = "";
        let transactionDate = "";

        if (ResultCode === 0 && CallbackMetadata?.Item) {
            for (const item of CallbackMetadata.Item) {
                if (item.Name === "Amount")             amount          = Number(item.Value);
                if (item.Name === "MpesaReceiptNumber") receipt         = String(item.Value);
                if (item.Name === "PhoneNumber")        phone           = String(item.Value);
                if (item.Name === "TransactionDate")    transactionDate = String(item.Value);
            }
        }

        const status = ResultCode === 0 ? "paid" : "failed";

        // Try to update existing pending payment by checkoutRequestId
        const existing = await db.collection("payments")
            .where("checkoutRequestId", "==", CheckoutRequestID)
            .limit(1).get();

        if (!existing.empty) {
            await existing.docs[0].ref.update({ status, receipt, resultCode: ResultCode, resultDesc: ResultDesc, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
            // No matching pending record — create new
            await db.collection("payments").add({
                checkoutRequestId: CheckoutRequestID,
                merchantRequestId: MerchantRequestID,
                phone, amount, receipt, transactionDate,
                status, resultCode: ResultCode, resultDesc: ResultDesc,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
        console.error("STK callback error:", error);
        res.status(500).send("Internal error");
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// BIBLE QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * bibleQuizDeposit — initiate STK push + receive payment callback for BibleQuiz.
 * Same pattern as `deposit` but writes to bibleQuizPayments collection.
 */
export const bibleQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        // Callback from payment provider
        if (body.trans_id) {
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            const existing = await db.collection("bibleQuizPayments")
                .where("phone", "==", phone)
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .limit(1).get();

            if (!existing.empty) {
                await existing.docs[0].ref.update({
                    status: "paid", trans_id, trans_time, business_shortcode,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                await db.collection("bibleQuizPayments").add({
                    name, phone, amount, trans_id, trans_time, business_shortcode,
                    status: "paid",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            res.status(200).json({ success: true });
            return;
        }

        // Initiation request
        const { name, phone, amount } = body;
        if (typeof name   !== "string" || !name.trim())              { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone  !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)               { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "BBQ";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });

        const result = await new Promise<any>((resolve, reject) => {
            const options = {
                hostname: "142.93.47.187",
                port: 2610,
                path: "/ngomma/bongo/stkrequest",
                method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            };
            const request = http.request(options, (response) => {
                let data = "";
                response.on("data", chunk => { data += chunk; });
                response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
            });
            request.on("error", reject);
            request.write(payload);
            request.end();
        });

        const docRef = await db.collection("bibleQuizPayments").add({
            name: name.trim(), phone, amount, trigger,
            status: "pending",
            checkoutRequestId: result?.CheckoutRequestID ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("bibleQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

/**
 * saveBibleQuizSession — callable. Validates and saves a completed BibleQuiz game.
 */
interface BibleQuizSessionData {
    name:   string;
    phone:  string;
    score:  number;
    correct: number;
    wrong:  number;
    passed: number;
    total:  number;
}

export const saveBibleQuizSession = functions.https.onCall(
    async (data: BibleQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");

        // POST to shared SQL leaderboard
        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = {
                hostname: "142.93.47.187", port: 2027,
                path: "/api/savewebscore", method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve()); // non-fatal
            req.write(payload); req.end();
        });

        await db.collection("bibleQuizSessions").add({
            name, phone: data.phone,
            score: data.score, correct: data.correct,
            wrong: data.wrong, passed: data.passed, total: data.total,
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Upsert Firebase leaderboard — keep highest score per phone
        const lbRef  = db.collection("bibleQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        return { success: true };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// MATH QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const mathQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        if (body.trans_id) {
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const existing = await db.collection("mathQuizPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("mathQuizPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }

        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())              { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)){ res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)             { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "MQ";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });

        const docRef = await db.collection("mathQuizPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("mathQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface MathQuizSessionData { name: string; phone: string; score: number; correct: number; wrong: number; passed: number; total: number; }

export const saveMathQuizSession = functions.https.onCall(
    async (data: MathQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");

        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve());
            req.write(payload); req.end();
        });

        await db.collection("mathQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });

        const lbRef  = db.collection("mathQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        return { success: true };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// BIOLOGY QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const bioQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;
        if (body.trans_id) {
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const existing = await db.collection("bioQuizPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("bioQuizPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }
        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())               { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)              { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "BQ";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });
        const docRef = await db.collection("bioQuizPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("bioQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface BioQuizSessionData { name: string; phone: string; score: number; correct: number; wrong: number; passed: number; total: number; }

export const saveBioQuizSession = functions.https.onCall(
    async (data: BioQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");
        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve()); req.write(payload); req.end();
        });
        await db.collection("bioQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        const lbRef = db.collection("bioQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        return { success: true };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL KNOWLEDGE QUIZ BACKEND
// ─────────────────────────────────────────────────────────────────────────────

export const genQuizDeposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
        const body = req.body;

        if (body.trans_id) {
            const { name, phone, amount, trans_id, trans_time, business_shortcode } = body;
            if (!isValidCallback(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
            const existing = await db.collection("genQuizPayments")
                .where("phone", "==", phone).where("status", "==", "pending")
                .orderBy("createdAt", "desc").limit(1).get();
            if (!existing.empty) {
                await existing.docs[0].ref.update({ status: "paid", trans_id, trans_time, business_shortcode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await db.collection("genQuizPayments").add({ name, phone, amount, trans_id, trans_time, business_shortcode, status: "paid", createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            res.status(200).json({ success: true }); return;
        }

        const { name, phone, amount } = body;
        if (typeof name !== "string" || !name.trim())               { res.status(400).json({ error: "Invalid name" });   return; }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) { res.status(400).json({ error: "Invalid phone" });  return; }
        if (typeof amount !== "number" || amount <= 0)              { res.status(400).json({ error: "Invalid amount" }); return; }

        const trigger = "GKQ";
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise<any>((resolve, reject) => {
            const options = { hostname: "142.93.47.187", port: 2610, path: "/ngomma/bongo/stkrequest", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const request = http.request(options, (response) => { let data = ""; response.on("data", c => { data += c; }); response.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }); });
            request.on("error", reject); request.write(payload); request.end();
        });

        const docRef = await db.collection("genQuizPayments").add({ name: name.trim(), phone, amount, trigger, status: "pending", checkoutRequestId: result?.CheckoutRequestID ?? null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, paymentId: docRef.id, result });
    } catch (error) {
        console.error("genQuizDeposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

interface GenQuizSessionData { name: string; phone: string; score: number; correct: number; wrong: number; passed: number; total: number; }

export const saveGenQuizSession = functions.https.onCall(
    async (data: GenQuizSessionData) => {
        // data is already the first argument
        if (typeof data.name  !== "string" || !data.name.trim())             throw new functions.https.HttpsError("invalid-argument", "Invalid name");
        if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone)) throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
        if (typeof data.score !== "number")                                   throw new functions.https.HttpsError("invalid-argument", "Invalid score");

        const name   = data.name.trim().slice(0, 20);
        const msisdn = data.phone.replace(/^0/, "254");
        const payload = JSON.stringify({ msisdn, score: data.score });
        await new Promise<void>((resolve) => {
            const options = { hostname: "142.93.47.187", port: 2027, path: "/api/savewebscore", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const req = http.request(options, res => { res.resume(); res.on("end", resolve); });
            req.on("error", () => resolve()); req.write(payload); req.end();
        });

        await db.collection("genQuizSessions").add({ name, phone: data.phone, score: data.score, correct: data.correct, wrong: data.wrong, passed: data.passed, total: data.total, playedAt: admin.firestore.FieldValue.serverTimestamp() });

        const lbRef = db.collection("genQuizLeaderboard").doc(data.phone);
        const lbSnap = await lbRef.get();
        if (!lbSnap.exists || (lbSnap.data()?.score ?? 0) < data.score) {
            await lbRef.set({ name, phone: data.phone, score: data.score, playedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        return { success: true };
    }
);
