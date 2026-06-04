import { type FC, useEffect, useState } from "react";
import { ArrowLeft, Check, Coins, ShoppingBag } from "lucide-react";
import { BONGO_MARKET_ITEMS, getBongoCoinBalance, getPurchases, purchaseBongoMarketItem } from "../../utils/bongoWallet";
import "../../styles/BongoWallet.css";

interface Props {
    onBack: () => void;
    onWallet: () => void;
}

export const BongoMarketPage: FC<Props> = ({ onBack, onWallet }) => {
    const [balance, setBalance] = useState(() => getBongoCoinBalance());
    const [purchases, setPurchases] = useState(() => getPurchases());
    const [message, setMessage] = useState("");

    useEffect(() => {
        const refresh = () => {
            setBalance(getBongoCoinBalance());
            setPurchases(getPurchases());
        };
        window.addEventListener("bongo:wallet-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("bongo:wallet-updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    const boughtIds = new Set(purchases.map(item => item.id));

    return (
        <div className="wallet-page market-page">
            <div className="wallet-topbar">
                <button type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={22}/></button>
                <strong>Bongo Market</strong>
                <button type="button" onClick={onWallet} aria-label="Open wallet"><Coins size={20}/></button>
            </div>

            <section className="wallet-balance-card market-hero">
                <span>Spend BongoCoins</span>
                <div><ShoppingBag size={34}/><strong>{balance.toLocaleString()}</strong></div>
                <p>Use coins earned from game sessions to unlock items and keep an inventory.</p>
            </section>

            {message && <div className="market-message">{message}</div>}

            <div className="market-grid">
                {BONGO_MARKET_ITEMS.map(item => {
                    const owned = boughtIds.has(item.id);
                    return (
                        <div className="market-item" key={item.id}>
                            <div className="market-item-icon"><ShoppingBag size={26}/></div>
                            <div className="market-item-copy">
                                <span>{item.tag}</span>
                                <strong>{item.name}</strong>
                                <p>{item.description}</p>
                            </div>
                            <div className="market-item-bottom">
                                <span className="market-price"><Coins size={16}/>{item.price}</span>
                                <button
                                    type="button"
                                    disabled={owned}
                                    onClick={() => {
                                        const result = purchaseBongoMarketItem(item);
                                        if (result.ok) {
                                            setMessage(item.name + " added to your inventory.");
                                            setBalance(result.balance);
                                            setPurchases(getPurchases());
                                        } else {
                                            setMessage("Not enough BongoCoins for " + item.name + ".");
                                        }
                                    }}
                                >
                                    {owned ? <><Check size={15}/> Owned</> : "Buy"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <section className="market-inventory">
                <h2>Inventory</h2>
                {purchases.length ? purchases.slice(0, 6).map(item => (
                    <div className="market-inventory-row" key={item.id + item.purchasedAt}>
                        <span>{item.name}</span>
                        <small>{new Date(item.purchasedAt).toLocaleDateString()}</small>
                    </div>
                )) : <p>No items purchased yet.</p>}
            </section>
        </div>
    );
};
