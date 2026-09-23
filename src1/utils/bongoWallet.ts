import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.ts";

export type BongoWalletRecord = {
    id: string;
    title: string;
    description?: string;
    amount: number;
    points?: number;
    createdAt: string;
};

export type BongoMarketItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    tag: string;
    brand: string;
    category: "Shirts" | "Caps" | "Capes" | "Accessories";
    color: string;
    active?: boolean;
    stock?: number;
    imageUrl?: string;
    imageUrls?: string[];
    sortOrder?: number;
    availableColors?: string[];
};

export type BongoPurchase = BongoMarketItem & {
    purchasedAt: string;
};

export type BongoOrderItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
};

export type BongoOrder = {
    id: string;
    items: BongoOrderItem[];
    total: number;
    method: "delivery" | "pickup";
    status: "Order placed" | "Ready for pickup" | "Out for delivery" | "Delivered" | "Cancelled";
    createdAt: string;
    phone?: string;
    playerName?: string;
};

const COIN_RECORDS_KEY = "bongo_coin_records";
const BONUS_RECORDS_KEY = "bongo_bonus_records";
const PURCHASES_KEY = "bongo_market_purchases";
const ORDERS_KEY = "bongo_market_orders";
const AWARDED_SESSIONS_KEY = "bongo_coin_awarded_sessions";

export const BONGO_MARKET_ITEMS: BongoMarketItem[] = [
    { id: "bq-tee-black", name: "BongoQuiz Classic Tee", description: "Soft black cotton shirt with the BongoQuiz front logo.", price: 7500, tag: "New", brand: "BongoQuiz Merch", category: "Shirts", color: "#ff28f4" },
    { id: "bq-cap-neon", name: "BongoQuiz Cap", description: "Adjustable cap with neon stitched BongoQuiz mark.", price: 4500, tag: "Popular", brand: "BongoQuiz Merch", category: "Caps", color: "#22d3ee" },
    { id: "bq-hoodie", name: "BongoQuiz Hoodie", description: "Warm hoodie with bold BongoQuiz chest artwork.", price: 15000, tag: "Limited Stock", brand: "BongoQuiz Merch", category: "Shirts", color: "#ff28f4" },
    { id: "kalif-tee", name: "KalifRecords Street Tee", description: "Music label streetwear tee for everyday wear.", price: 6500, tag: "Drop", brand: "KalifRecords Merch", category: "Shirts", color: "#fef08a" },
    { id: "kalif-cap", name: "KalifRecords Cap", description: "Clean logo cap inspired by studio sessions and street culture.", price: 5000, tag: "Limited", brand: "KalifRecords Merch", category: "Caps", color: "#a78bfa" },
    { id: "urban-tour-shirt", name: "Urban Tour Shirt", description: "Tour-ready shirt for events, meetups, and city activations.", price: 6000, tag: "Tour", brand: "Urban Tour Merch", category: "Shirts", color: "#67e8f9" },
    { id: "urban-tour-cape", name: "Urban Tour Cape", description: "Statement cape for promo events and stage moments.", price: 12000, tag: "Premium", brand: "Urban Tour Merch", category: "Capes", color: "#fb7185" },
];

const readJson = <T>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : fallback;
    } catch {
        return fallback;
    }
};

const writeJson = <T>(key: string, value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("bongo:wallet-updated"));
};

const makeId = (prefix: string) => prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

export const scoreToBongoCoins = (points: number) => Math.max(Math.floor(Math.max(points, 0) / 250), 0);

export const getCoinRecords = () => readJson<BongoWalletRecord[]>(COIN_RECORDS_KEY, []);
export const getBonusRecords = () => readJson<BongoWalletRecord[]>(BONUS_RECORDS_KEY, []);
export const getPurchases = () => readJson<BongoPurchase[]>(PURCHASES_KEY, []);
export const getMarketOrders = () => readJson<BongoOrder[]>(ORDERS_KEY, []);

export const getBongoCoinBalance = () => getCoinRecords().reduce((sum, record) => sum + record.amount, 0);

export const syncReconciledBongoCoins = async (phone: string) => {
    if (!/^07\d{8}$/.test(phone)) return getBongoCoinBalance();
    const snap = await getDoc(doc(db, "playerCoinBalances", phone));
    if (!snap.exists()) return getBongoCoinBalance();

    const data = snap.data();
    const serverBalance = Math.max(0, Number(data.balanceCoins ?? data.earnedCoins ?? 0));
    const records = getCoinRecords().filter(record => record.id !== "score-reconciliation");
    const localTotal = records.reduce((sum, record) => sum + record.amount, 0);
    const adjustment = serverBalance - localTotal;
    const reconciliation: BongoWalletRecord = {
        id: "score-reconciliation",
        title: "Score Reconciliation",
        description: "BongoCoins aligned with completed game sessions and market spending",
        amount: adjustment,
        points: Number(data.lifetimeSessionPoints || 0),
        createdAt: new Date().toISOString(),
    };
    writeJson(COIN_RECORDS_KEY, adjustment === 0 ? records : [reconciliation, ...records].slice(0, 80));
    return getBongoCoinBalance();
};

export const awardBongoCoinsForSession = (params: { sessionId: string; points: number; power?: string }) => {
    const coins = scoreToBongoCoins(params.points);
    if (coins <= 0) return 0;

    const awarded = readJson<string[]>(AWARDED_SESSIONS_KEY, []);
    if (awarded.includes(params.sessionId)) return 0;

    const nextRecord: BongoWalletRecord = {
        id: makeId("game"),
        title: "Game Session",
        description: params.power ? params.power : "Bongo Quiz result",
        amount: coins,
        points: params.points,
        createdAt: new Date().toISOString(),
    };
    writeJson(COIN_RECORDS_KEY, [nextRecord, ...getCoinRecords()].slice(0, 80));
    writeJson(AWARDED_SESSIONS_KEY, [params.sessionId, ...awarded].slice(0, 160));
    return coins;
};

export const recordBonusReward = (params: { title: string; amount: number; description?: string }) => {
    if (!Number.isFinite(params.amount) || params.amount === 0) return;
    const nextRecord: BongoWalletRecord = {
        id: makeId("bonus"),
        title: params.title,
        description: params.description,
        amount: params.amount,
        createdAt: new Date().toISOString(),
    };
    writeJson(BONUS_RECORDS_KEY, [nextRecord, ...getBonusRecords()].slice(0, 80));
};

export const purchaseBongoMarketItem = (item: BongoMarketItem) => {
    const balance = getBongoCoinBalance();
    if (balance < item.price) return { ok: false, balance };

    const spendRecord: BongoWalletRecord = {
        id: makeId("market"),
        title: "Market Purchase",
        description: item.name,
        amount: -item.price,
        createdAt: new Date().toISOString(),
    };
    const purchase: BongoPurchase = { ...item, purchasedAt: new Date().toISOString() };
    writeJson(COIN_RECORDS_KEY, [spendRecord, ...getCoinRecords()].slice(0, 80));
    writeJson(PURCHASES_KEY, [purchase, ...getPurchases()].slice(0, 80));
    return { ok: true, balance: balance - item.price };
};

export const upsertBonusRecord = (record: BongoWalletRecord) => {
    if (!Number.isFinite(record.amount) || record.amount === 0) return;
    const records = getBonusRecords();
    if (records.some(existing => existing.id === record.id)) return;
    writeJson(BONUS_RECORDS_KEY, [record, ...records].slice(0, 80));
};

type BongoMarketOrderResult =
    | { ok: false; reason: "empty" | "balance"; balance: number }
    | { ok: true; balance: number; order: BongoOrder };

export const placeBongoMarketOrder = (params: { items: BongoOrderItem[]; method: "delivery" | "pickup" }): BongoMarketOrderResult => {
    const total = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const balance = getBongoCoinBalance();
    if (!params.items.length) return { ok: false, reason: "empty", balance };
    if (balance < total) return { ok: false, reason: "balance", balance };

    const order: BongoOrder = {
        id: makeId("order"),
        items: params.items,
        total,
        method: params.method,
        status: params.method === "pickup" ? "Ready for pickup" : "Order placed",
        createdAt: new Date().toISOString(),
    };
    const spendRecord: BongoWalletRecord = {
        id: makeId("market"),
        title: "Market Order",
        description: params.items.map(item => item.name).join(", "),
        amount: -total,
        createdAt: order.createdAt,
    };
    writeJson(COIN_RECORDS_KEY, [spendRecord, ...getCoinRecords()].slice(0, 80));
    writeJson(ORDERS_KEY, [order, ...getMarketOrders()].slice(0, 80));
    writeJson(PURCHASES_KEY, [
        ...params.items.map(item => ({
            id: item.productId,
            name: item.name,
            description: "Market order " + order.id,
            price: item.price,
            tag: "Order",
            brand: "Bongo Market",
            category: "Accessories" as const,
            color: "#67e8f9",
            purchasedAt: order.createdAt,
        })),
        ...getPurchases(),
    ].slice(0, 80));
    return { ok: true, balance: balance - total, order };
};
