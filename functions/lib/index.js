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
exports.initiateStkPush = exports.saveGameSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
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
 * initiateStkPush — callable Cloud Function.
 * Forwards name + phone + amount to the payment backend to trigger an M-Pesa STK push.
 */
exports.initiateStkPush = functions.https.onCall(async (request) => {
    const { name, phone, amount, ref } = request.data;
    if (typeof name !== "string" || name.trim().length === 0)
        throw new functions.https.HttpsError("invalid-argument", "Invalid name");
    if (typeof phone !== "string" || !/^07\d{8}$/.test(phone))
        throw new functions.https.HttpsError("invalid-argument", "Invalid phone");
    if (typeof amount !== "number" || amount <= 0)
        throw new functions.https.HttpsError("invalid-argument", "Invalid amount");
    if (typeof ref !== "string" || ref.trim().length === 0)
        throw new functions.https.HttpsError("invalid-argument", "Invalid ref");
    const backendUrl = process.env.PAYMENT_BACKEND_URL;
    if (!backendUrl)
        throw new functions.https.HttpsError("internal", "Payment backend not configured");
    const payload = JSON.stringify({ name: name.trim(), phone, amount, ref: ref.trim() });
    const url = new URL("/api/pay/initiate", backendUrl);
    const result = await new Promise((resolve, reject) => {
        const req = https.request({ hostname: url.hostname, port: url.port || 443, path: url.pathname, method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } }, (res) => {
            let body = "";
            res.on("data", (chunk) => { body += chunk; });
            res.on("end", () => {
                if (res.statusCode !== 200)
                    return reject(new Error(`Backend error ${res.statusCode}: ${body}`));
                try {
                    resolve(JSON.parse(body));
                }
                catch {
                    reject(new Error("Invalid backend response"));
                }
            });
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
    return { checkoutRequestId: result.checkoutRequestId };
});
