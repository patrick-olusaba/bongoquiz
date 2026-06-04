import { type FC, useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, Banknote, Coins, Gift, Smartphone, ShoppingBag } from "lucide-react";
import { db } from "../../firebase";
import { getBongoCoinBalance, getBonusRecords, getCoinRecords, syncReconciledBongoCoins, upsertBonusRecord, type BongoWalletRecord } from "../../utils/bongoWallet";
import "../../styles/BongoWallet.css";

interface Props {
    onBack: () => void;
    onMarket: () => void;
}

type WalletTab = "coins" | "bonus" | "convert";

const airtimeOptions = [
    { label: "Safaricom", value: 50, coins: 50 },
    { label: "Safaricom", value: 100, coins: 100 },
    { label: "Safaricom", value: 200, coins: 200 },
    { label: "Safaricom", value: 500, coins: 500 },
];

const cashOptions = [
    { label: "KSh 50", value: 50, coins: 50 },
    { label: "KSh 100", value: 100, coins: 100 },
    { label: "KSh 200", value: 200, coins: 200 },
    { label: "KSh 500", value: 500, coins: 500 },
];

const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Recent";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const RecordRow: FC<{ record: BongoWalletRecord; mode: WalletTab }> = ({ record, mode }) => {
    const isNegative = record.amount < 0;
    return (
        <div className="wallet-record-row">
            <div className="wallet-record-copy">
                <strong>{record.title}</strong>
                {record.description && <span>{record.description}</span>}
                <small>{formatDate(record.createdAt)}{record.points ? ` · ${record.points.toLocaleString()} pts` : ""}</small>
            </div>
            <div className={"wallet-record-amount" + (isNegative ? " negative" : "") }>
                <span>{isNegative ? "" : "+"}{record.amount.toLocaleString()}</span>
                {mode === "coins" ? <Coins size={24}/> : <Gift size={24}/>}
            </div>
        </div>
    );
};

export const BongoWalletPage: FC<Props> = ({ onBack, onMarket }) => {
    const [tab, setTab] = useState<WalletTab>("convert");
    const [coinRecords, setCoinRecords] = useState(() => getCoinRecords());
    const [bonusRecords, setBonusRecords] = useState(() => getBonusRecords());
    const [balance, setBalance] = useState(() => getBongoCoinBalance());

    const refresh = () => {
        setCoinRecords(getCoinRecords());
        setBonusRecords(getBonusRecords());
        setBalance(getBongoCoinBalance());
    };

    useEffect(() => {
        const phone = localStorage.getItem("bongo_player_phone") ?? "";
        if (!/^07\d{8}$/.test(phone)) return;
        syncReconciledBongoCoins(phone).then(refresh).catch(() => {});
        const unsubscribeCoins = onSnapshot(doc(db, "playerCoinBalances", phone), () => {
            syncReconciledBongoCoins(phone).then(refresh).catch(() => {});
        }, () => {});
        getDoc(doc(db, "players", phone)).then(snap => {
            if (!snap.exists()) return;
            const data = snap.data();
            const lastDate = String(data.lastDailyBonusDate ?? "");
            const lastBonus = Number(data.lastBonus ?? 0);
            if (!lastDate || lastBonus <= 0) return;
            upsertBonusRecord({
                id: "daily-bonus-" + phone + "-" + lastDate,
                title: "Check-In",
                description: "Daily bonus claimed",
                amount: lastBonus,
                createdAt: new Date(lastDate + "T12:00:00").toISOString(),
            });
            refresh();
        }).catch(() => {});
        return unsubscribeCoins;
    }, []);

    useEffect(() => {
        window.addEventListener("bongo:wallet-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("bongo:wallet-updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    const rows = tab === "coins" ? coinRecords : bonusRecords;

    return (
        <div className="wallet-page">
            <div className="wallet-topbar">
                <button type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={22}/></button>
                <strong>My Wallet</strong>
                <button type="button" onClick={onMarket} aria-label="Open Bongo Market"><ShoppingBag size={20}/></button>
            </div>

            <section className="wallet-balance-card">
                <span>BongoCoin Balance</span>
                <div><Coins size={34}/><strong>{balance.toLocaleString()}</strong></div>
                <p>Every 250 game points earns 1 BongoCoin. 500 points earns 2 BongoCoins.</p>
            </section>

            <div className="wallet-tabs wallet-tabs-three" role="tablist" aria-label="Wallet records">
                <button type="button" className={tab === "convert" ? "active" : ""} onClick={() => setTab("convert")}>Convert Coin</button>
                <button type="button" className={tab === "coins" ? "active" : ""} onClick={() => setTab("coins")}>Coin Record</button>
                <button type="button" className={tab === "bonus" ? "active" : ""} onClick={() => setTab("bonus")}>Bonus Record</button>
            </div>

            {tab === "convert" ? (
                <div className="wallet-convert-panel wallet-reward-convert">
                    <section className="wallet-convert-card wallet-reward-row cyan">
                        <div className="wallet-convert-head">
                            <Smartphone size={24}/>
                            <div>
                                <strong>Airtime <em className="wallet-coming-soon">Coming soon</em></strong>
                                <span>Airtime conversion is not available yet.</span>
                            </div>
                        </div>
                        <div className="wallet-reward-grid">
                            {airtimeOptions.map(option => (
                                <button type="button" disabled key={option.value} className="wallet-reward-card airtime">
                                    <div className="market-safaricom-logo"><i/>Safaricom</div>
                                    <b>{option.value} KES</b>
                                    <span><Coins size={14}/>{option.coins.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="wallet-convert-card wallet-reward-row green">
                        <div className="wallet-convert-head">
                            <Banknote size={24}/>
                            <div>
                                <strong>M-Pesa Cash <em className="wallet-coming-soon">Coming soon</em></strong>
                                <span>M-Pesa cash conversion is not available yet.</span>
                            </div>
                        </div>
                        <div className="wallet-reward-grid">
                            {cashOptions.map(option => (
                                <button type="button" disabled key={option.value} className="wallet-reward-card cash">
                                    <div className="market-cash-stack"><Banknote size={30}/></div>
                                    <b>{option.label}</b>
                                    <span><Coins size={14}/>{option.coins.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                        <button type="button" className="wallet-withdraw-btn" disabled>Coming soon</button>
                    </section>
                </div>
            ) : (
                <div className="wallet-record-list">
                    {rows.length ? rows.map(record => <RecordRow key={record.id} record={record} mode={tab}/>) : (
                        <div className="wallet-empty">
                            <Coins size={34}/>
                            <strong>No records yet</strong>
                            <p>{tab === "coins" ? "Play a game session to earn BongoCoins." : "Daily check-ins and reward claims will appear here."}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
