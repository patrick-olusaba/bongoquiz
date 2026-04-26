"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.stkCallback = exports.deposit = exports.saveGameSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const http = __importStar(require("http"));
admin.initializeApp();
const db = admin.firestore();
/**
 * saveGameSession — callable Cloud Function.
 * Validates inputs server-side before writing to Firestore,
 * so clients cannot write arbitrary scores directly.
 */
exports.saveGameSession = functions.https.onCall(async (request) => {
    const data = request.data;
    // Basic validation
    if (typeof data.name !== "string" || data.name.trim().length === 0)
        throw new functions.https.HttpsError("invalid-argument", "Invalid name");
    if (typeof data.phone !== "string" || !/^07\d{8}$/.test(data.phone))
        throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
    if (typeof data.r1Score !== "number" || data.r1Score < 0)
        throw new functions.https.HttpsError("invalid-argument", "Invalid r1Score");
    if (typeof data.r2Score !== "number")
        throw new functions.https.HttpsError("invalid-argument", "Invalid r2Score");
    if (typeof data.r3Bonus !== "number" || data.r3Bonus < 0)
        throw new functions.https.HttpsError("invalid-argument", "Invalid r3Bonus");
    // Sanity caps — adjust to your actual max possible scores
    const MAX_R1 = 15000, MAX_R2 = 25000, MAX_R3 = 50000;
    if (data.r1Score > MAX_R1 || data.r2Score > MAX_R2 || data.r3Bonus > MAX_R3) {
        throw new functions.https.HttpsError("invalid-argument", "Score out of range");
    }
    const total = data.r1Score + data.r2Score + data.r3Bonus;
    const name = data.name.trim().slice(0, 20);
    const sessionRef = await db.collection("gameSessions").add({
        name,
        phone: data.phone,
        power: typeof data.power === "string" ? data.power.slice(0, 50) : "",
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
});
/**
 * deposit — HTTP endpoint to initiate M-Pesa STK push AND receive callback.
 */
exports.deposit = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const body = req.body;
        // Check if this is a callback (has trans_id) or initiation request
        if (body.trans_id) {
            // This is a callback from the backend with payment result
            const { name, phone, amount, trigger, trans_id, trans_time, business_shortcode } = body;
            // Find the most recent pending payment with matching phone and trigger
            const existing = await db.collection("payments")
                .where("phone", "==", phone)
                .where("trigger", "==", trigger)
                .orderBy("createdAt", "desc")
                .limit(1).get();
            if (!existing.empty) {
                console.log("Updating payment doc:", existing.docs[0].id);
                await existing.docs[0].ref.update({
                    status: "paid",
                    trans_id,
                    trans_time,
                    business_shortcode,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                console.log("No pending payment found, creating new doc");
                await db.collection("payments").add({
                    name, phone, amount, trigger,
                    status: "paid",
                    trans_id,
                    trans_time,
                    business_shortcode,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            console.log("Payment callback received:", body);
            res.status(200).json({ success: true, message: "Payment recorded" });
            return;
        }
        // Otherwise, this is an initiation request
        const { name, phone, amount, trigger } = body;
        if (typeof name !== "string" || name.trim().length === 0) {
            res.status(400).json({ error: "Invalid name" });
            return;
        }
        if (typeof phone !== "string" || !/^254\d{9}$/.test(phone)) {
            res.status(400).json({ error: "Invalid phone" });
            return;
        }
        if (typeof amount !== "number" || amount <= 0) {
            res.status(400).json({ error: "Invalid amount" });
            return;
        }
        if (typeof trigger !== "string" || trigger.trim().length === 0) {
            res.status(400).json({ error: "Invalid trigger" });
            return;
        }
        const payload = JSON.stringify({ name: name.trim(), phone, amount, trigger });
        const result = await new Promise((resolve, reject) => {
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
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        resolve({ raw: body });
                    }
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
    }
    catch (error) {
        console.error("Deposit error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});
/**
 * stkCallback — HTTP endpoint for M-Pesa STK push callback.
 * Receives payment confirmation from Safaricom and stores in Firestore.
 */
exports.stkCallback = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    try {
        const data = req.body;
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
                if (item.Name === "Amount")
                    amount = Number(item.Value);
                if (item.Name === "MpesaReceiptNumber")
                    receipt = String(item.Value);
                if (item.Name === "PhoneNumber")
                    phone = String(item.Value);
                if (item.Name === "TransactionDate")
                    transactionDate = String(item.Value);
            }
        }
        const status = ResultCode === 0 ? "paid" : "failed";
        // Try to update existing pending payment by checkoutRequestId
        const existing = await db.collection("payments")
            .where("checkoutRequestId", "==", CheckoutRequestID)
            .limit(1).get();
        if (!existing.empty) {
            await existing.docs[0].ref.update({ status, receipt, resultCode: ResultCode, resultDesc: ResultDesc, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        else {
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
    }
    catch (error) {
        console.error("STK callback error:", error);
        res.status(500).send("Internal error");
    }
});
