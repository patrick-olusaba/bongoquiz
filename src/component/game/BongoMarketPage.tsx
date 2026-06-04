import { type FC, type ReactNode, useEffect, useState } from "react";
import {
    Banknote, Coins, Minus, PackageCheck, Plus, Shirt, Wallet, ShoppingCart, Smartphone, Truck, ArrowLeft,
    ShoppingBag
} from "lucide-react";
import { collection, doc, onSnapshot, query, setDoc, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { BONGO_MARKET_ITEMS, getBongoCoinBalance, getMarketOrders, placeBongoMarketOrder, syncReconciledBongoCoins, type BongoMarketItem, type BongoOrder } from "../../utils/bongoWallet";
import "../../styles/BongoWallet.css";

interface Props {
    onBack: () => void;
    onWallet: () => void;
}

type MarketView = "browse" | "detail" | "cart" | "orders";
type MarketCategory = "merch" | "airtime" | "cash";
type CartLine = { product: BongoMarketItem; quantity: number };

type ServiceProduct = {
    id: string;
    title: string;
    provider: string;
    coins: number;
    type: "airtime" | "cash";
};

const airtimeProducts: ServiceProduct[] = [
    { id: "safaricom-50", title: "50 KES", provider: "Safaricom", coins: 50, type: "airtime" },
    { id: "safaricom-100", title: "100 KES", provider: "Safaricom", coins: 100, type: "airtime" },
    { id: "safaricom-200", title: "200 KES", provider: "Safaricom", coins: 200, type: "airtime" },
    { id: "safaricom-500", title: "500 KES", provider: "Safaricom", coins: 500, type: "airtime" },
];

const cashProducts: ServiceProduct[] = [
    { id: "cash-50", title: "KSh 50", provider: "Cash", coins: 50, type: "cash" },
    { id: "cash-100", title: "KSh 100", provider: "Cash", coins: 100, type: "cash" },
    { id: "cash-200", title: "KSh 200", provider: "Cash", coins: 200, type: "cash" },
    { id: "cash-500", title: "KSh 500", provider: "Cash", coins: 500, type: "cash" },
];

const categories = ["Shirts", "Caps", "Capes", "Accessories"] as const;

const normalizeProduct = (id: string, data: Partial<BongoMarketItem>): BongoMarketItem => ({
    id,
    name: data.name || "Bongo Market Item",
    description: data.description || "Bongo Market merch item.",
    price: Number(data.price || 0),
    tag: data.tag || "Merch",
    brand: data.brand || "BongoQuiz Merch",
    category: categories.includes(data.category as any) ? data.category as BongoMarketItem["category"] : "Accessories",
    color: data.color || "#ff28f4",
    active: data.active !== false,
    stock: Number(data.stock ?? 0),
    imageUrl: data.imageUrls?.[0] || data.imageUrl || "",
    imageUrls: data.imageUrls?.length ? data.imageUrls : data.imageUrl ? [data.imageUrl] : [],
    sortOrder: Number(data.sortOrder ?? 0),
    availableColors: data.availableColors?.length ? data.availableColors : data.color ? [data.color] : [],
});

const productLabel = (product: BongoMarketItem) => product.category === "Caps" ? "CAP" : product.name.toLowerCase().includes("hoodie") ? "HOOD" : product.category === "Capes" ? "CAPE" : "TEE";

export const BongoMarketPage: FC<Props> = ({ onBack, onWallet }) => {
    const [balance, setBalance] = useState(() => getBongoCoinBalance());
    const [orders, setOrders] = useState<BongoOrder[]>(() => getMarketOrders());
    const [products, setProducts] = useState<BongoMarketItem[]>(BONGO_MARKET_ITEMS);
    const [message, setMessage] = useState("");
    const [view, setView] = useState<MarketView>("browse");
    const [selected, setSelected] = useState<BongoMarketItem | null>(null);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [method, setMethod] = useState<"delivery" | "pickup">("pickup");
    const [activeCategory, setActiveCategory] = useState<MarketCategory>("merch");

    const phone = localStorage.getItem("bongo_player_phone") || "";
    const playerName = localStorage.getItem("bongo_player_name") || "Player";

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "bongoMarketProducts"), snap => {
            const rows = snap.docs
                .map(d => normalizeProduct(d.id, d.data() as Partial<BongoMarketItem>))
                .filter(product => product.active !== false)
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
            setProducts(rows.length ? rows : BONGO_MARKET_ITEMS);
        }, () => setProducts(BONGO_MARKET_ITEMS));
        return unsub;
    }, []);

    useEffect(() => {
        if (!phone) return;
        syncReconciledBongoCoins(phone).then(setBalance).catch(() => {});
        const unsubscribeCoins = onSnapshot(doc(db, "playerCoinBalances", phone), () => {
            syncReconciledBongoCoins(phone).then(setBalance).catch(() => {});
        }, () => {});
        const unsub = onSnapshot(query(collection(db, "bongoMarketOrders"), where("phone", "==", phone)), snap => {
            const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as BongoOrder))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (rows.length) setOrders(rows);
        }, () => {});
        return () => { unsubscribeCoins(); unsub(); };
    }, [phone]);

    useEffect(() => {
        const refresh = () => {
            setBalance(getBongoCoinBalance());
            setOrders(prev => prev.length ? prev : getMarketOrders());
        };
        window.addEventListener("bongo:wallet-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("bongo:wallet-updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    const saveOrderToFirestore = async (order: BongoOrder) => {
        await setDoc(doc(db, "bongoMarketOrders", order.id), {
            ...order,
            phone,
            playerName,
            source: "bongo-market",
            updatedAt: serverTimestamp(),
        }, { merge: true });
    };

    // const featuredProduct = [...products].sort((a, b) => b.price - a.price)[0] || null;
    const moreProducts = products.slice(0, 8);
    const goalProduct = products.find(product => product.price > balance) || products[0] || null;
    const coinsNeeded = goalProduct ? Math.max(goalProduct.price - balance, 0) : 0;
    const goalProgress = goalProduct && goalProduct.price > 0 ? Math.min(100, Math.round((balance / goalProduct.price) * 100)) : 100;
    const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
    const cartTotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

    const addToCart = (product: BongoMarketItem) => {
        setCart(prev => {
            const existing = prev.find(line => line.product.id === product.id);
            if (existing) return prev.map(line => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
            return [...prev, { product, quantity: 1 }];
        });
        setMessage(product.name + " added to cart.");
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.flatMap(line => {
            if (line.product.id !== productId) return [line];
            const quantity = line.quantity + delta;
            return quantity > 0 ? [{ ...line, quantity }] : [];
        }));
    };

    const checkout = async () => {
        const result = placeBongoMarketOrder({
            method,
            items: cart.map(line => ({
                productId: line.product.id,
                name: line.product.name,
                price: line.product.price,
                quantity: line.quantity,
            })),
        });
        if (result.ok !== true) {
            setMessage(result.reason === "balance" ? "Not enough BongoCoins to checkout." : "Add products before checkout.");
            return;
        }
        setBalance(result.balance);
        setOrders(getMarketOrders());
        setCart([]);
        setMessage("Order placed. Track delivery or pickup status below.");
        setView("orders");
        try {
            await saveOrderToFirestore(result.order);
        } catch (error) {
            console.error("Failed to save market order:", error);
            setMessage("Order placed locally. Admin sync failed, please contact support if status does not update.");
        }
    };

    const buyAirtime = async (product: ServiceProduct) => {
        const result = placeBongoMarketOrder({
            method: "delivery",
            items: [{ productId: product.id, name: product.provider + " Airtime " + product.title, price: product.coins, quantity: 1 }],
        });
        if (result.ok !== true) {
            setMessage("Not enough BongoCoins for " + product.provider + " " + product.title + ".");
            return;
        }
        setBalance(result.balance);
        setOrders(getMarketOrders());
        setMessage("Airtime order placed. Track status under Orders.");
        setView("orders");
        try {
            await saveOrderToFirestore(result.order);
        } catch (error) {
            console.error("Failed to save airtime order:", error);
        }
    };

    const MarketSection: FC<{ title: string; children: ReactNode; accent?: "cyan" | "pink" | "green"; action?: ReactNode }> = ({ title, children, accent = "pink", action }) => {
        const SectionIcon = accent === "cyan" ? Smartphone : accent === "green" ? Banknote : Shirt;
        return (
            <section className={`market-pill-section ${accent}`}>
                <div className="market-pill-section-head">
                    <h2><SectionIcon size={18}/>{title}</h2>
                    {action}
                </div>
                <div className="market-pill-scroll">{children}</div>
            </section>
        );
    };

    return (
        <div className="wallet-page market-page">
            <div className="market-game-topbar">
                <button type="button" onClick={view === "browse" ? onBack : () => setView("browse")} aria-label="Back"><ArrowLeft size={28}/></button>
                <strong>Bongo <span>Market</span></strong>
                <button type="button" className="market-cart-bubble" onClick={() => setView("cart")} aria-label="Open cart"><Wallet size={24}/>{cartCount > 0 && <em>{cartCount}</em>}</button>
            </div>

            {view === "browse" && (
                <section className="market-reward-hero">
                    <div className="market-reward-balance">
                        <span>Your BongoCoins</span>
                        <div><Coins size={34}/><strong>{balance.toLocaleString()}</strong></div>
                        <button type="button" onClick={onWallet}><ShoppingBag size={15}/> History <span>›</span></button>
                    </div>
                    <div className="market-reward-progress">
                        <span>{coinsNeeded > 0 ? `You're ${coinsNeeded.toLocaleString()} coins away!` : "Ready to unlock"}</span>
                        {/*{goalProduct && <p>{coinsNeeded > 0 ? `get ${coinsNeeded.toLocaleString()} more coins to get ` : "You can get "}<b>{goalProduct.name}</b></p>}*/}
                        <div className="market-goal-track"><span style={{ width: `${goalProgress}%` }}/></div>
                    </div>
                    {goalProduct && (
                        <div className="market-reward-preview">
                            {(goalProduct.imageUrls?.[0] || goalProduct.imageUrl) ? <img src={goalProduct.imageUrls?.[0] || goalProduct.imageUrl} alt={goalProduct.name}/> : <Shirt size={54}/>}
                            <button type="button" onClick={() => { setSelected(goalProduct); setView("detail"); }}><ShoppingBag size={17}/></button>
                        </div>
                    )}
                </section>
            )}

            {view !== "browse" && (
                <div className="market-toolbar">
                    <button type="button" onClick={() => setView("browse")}>Products</button>
                    <button type="button" className={view === "cart" ? "active" : ""} onClick={() => setView("cart")}><ShoppingCart size={15}/> Cart {cartCount ? `(${cartCount})` : ""}</button>
                    <button type="button" className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}><Truck size={15}/> Orders</button>
                </div>
            )}

            {message && <div className="market-message">{message}</div>}

            {view === "browse" && (
                <div className="market-shop-layout">
                    {/*{featuredProduct && (*/}
                    {/*    <section className="market-featured-section">*/}
                    {/*        <div className="market-shop-heading">*/}
                    {/*            <div><Flame size={16}/><span>Featured Today</span></div>*/}
                    {/*            <button type="button" onClick={() => { setSelected(featuredProduct); setView("detail"); }}>View drop</button>*/}
                    {/*        </div>*/}
                    {/*        <article className="market-featured-card">*/}
                    {/*            <div className="market-featured-image">*/}
                    {/*                {(featuredProduct.imageUrls?.[0] || featuredProduct.imageUrl) ? (*/}
                    {/*                    <img src={featuredProduct.imageUrls?.[0] || featuredProduct.imageUrl} alt={featuredProduct.name}/>*/}
                    {/*                ) : (*/}
                    {/*                    <div style={{ background: `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.28), transparent 34%), linear-gradient(145deg, ${featuredProduct.color}, #13001f)` }}><Shirt size={48}/><span>{productLabel(featuredProduct)}</span></div>*/}
                    {/*                )}*/}
                    {/*            </div>*/}
                    {/*            <div className="market-featured-copy">*/}
                    {/*                <small>{featuredProduct.tag || "Limited Drop"}</small>*/}
                    {/*                <h2>{featuredProduct.name}</h2>*/}
                    {/*                <p>{featuredProduct.brand}</p>*/}
                    {/*                <div className="market-featured-meta">*/}
                    {/*                    <strong><Coins size={16}/>{featuredProduct.price.toLocaleString()}</strong>*/}
                    {/*                    {typeof featuredProduct.stock === "number" && featuredProduct.stock > 0 && <span>Only {featuredProduct.stock} left</span>}*/}
                    {/*                </div>*/}
                    {/*                <button type="button" onClick={() => { setSelected(featuredProduct); setView("detail"); }}>View Details</button>*/}
                    {/*            </div>*/}
                    {/*        </article>*/}
                    {/*    </section>*/}
                    {/*)}*/}

                    <div className="market-category-tiles">
                        <button type="button" className={activeCategory === "merch" ? "active" : ""} onClick={() => setActiveCategory("merch")}><ShoppingBag size={32}/><span><b>Merch</b><small>Shop apparel</small></span><em>›</em></button>
                        <button type="button" className="coming-soon" disabled aria-label="Airtime coming soon"><Smartphone size={32}/><span><b>Airtime</b><small>Coming soon</small></span></button>
                        <button type="button" className="coming-soon" disabled aria-label="M-Pesa cash rewards coming soon"><Banknote size={32}/><span><b>M-Pesa Cash</b><small>Coming soon</small></span></button>
                    </div>

                    {activeCategory === "merch" && !!moreProducts.length && (
                        <MarketSection title="Merch" action={<button type="button" onClick={() => setMessage("More categories are coming soon.")}>View all <span>›</span></button>}>
                            {moreProducts.map(product => (
                                <article className="market-pill-card merch" key={product.id}>
                                    {(product.imageUrls?.[0] || product.imageUrl) ? (
                                        <img className="market-pill-image" src={product.imageUrls?.[0] || product.imageUrl} alt={product.name}/>
                                    ) : (
                                        <div className="market-pill-art" style={{ background: `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.28), transparent 34%), linear-gradient(145deg, ${product.color}, #13001f)` }}>
                                            <Shirt size={34}/>
                                            <span>{productLabel(product)}</span>
                                        </div>
                                    )}
                                    <div className="market-pill-info">
                                        <strong>{product.name}</strong>
                                        <span>{product.price.toLocaleString()} Coins</span>
                                        {product.tag && <small>{product.tag}</small>}
                                    </div>
                                    <button type="button" onClick={() => { setSelected(product); setView("detail"); }}>View Details</button>
                                </article>
                            ))}
                        </MarketSection>
                    )}

                    {activeCategory === "airtime" && (
                    <MarketSection title="Airtime" accent="cyan" action={<button type="button" onClick={() => setMessage("Airtime rewards are live below.")}>View all <span>›</span></button>}>
                        {airtimeProducts.map(product => (
                            <button type="button" className="market-pill-card service airtime reward-compact" key={product.id} onClick={() => buyAirtime(product)}>
                                <div className="market-safaricom-logo"><i/>Safaricom</div>
                                <b>{product.title}</b>
                                <span><Coins size={14}/>{product.coins.toLocaleString()}</span>
                            </button>
                        ))}
                    </MarketSection>
                    )}

                    {activeCategory === "cash" && (
                    <MarketSection title="Cash Rewards (KSH)" accent="green" action={<button type="button" onClick={() => setMessage("Cash redemption is coming soon.")}>View all <span>›</span></button>}>
                        {cashProducts.map(product => (
                            <button type="button" className="market-pill-card service cash reward-compact" key={product.id} onClick={() => setMessage("Cash redemption is coming soon.")}>
                                <div className="market-cash-stack"><Banknote size={30}/></div>
                                <b>{product.title}</b>
                                <span><Coins size={14}/>{product.coins.toLocaleString()}</span>
                            </button>
                        ))}
                    </MarketSection>
                    )}
                </div>
            )}

            {view === "detail" && selected && (
                <section className="market-detail-card">
                    {(selected.imageUrls?.[0] || selected.imageUrl) ? <img className="market-detail-image" src={selected.imageUrls?.[0] || selected.imageUrl} alt={selected.name}/> : (
                        <div className="market-detail-art" style={{ background: `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.28), transparent 34%), linear-gradient(145deg, ${selected.color}, #8b2cff 58%, #14001f)` }}>
                            {productLabel(selected)}
                        </div>
                    )}
                    {!!selected.imageUrls?.length && selected.imageUrls.length > 1 && (
                        <div className="market-image-gallery">
                            {selected.imageUrls.map(url => <img key={url} src={url} alt={selected.name}/>)}
                        </div>
                    )}
                    <span>{selected.brand}</span>
                    <h2>{selected.name}</h2>
                    <p>{selected.description}</p>
                    <div className="market-detail-meta">
                        <small>{selected.category}{typeof selected.stock === "number" && selected.stock > 0 ? ` · ${selected.stock} in stock` : ""}</small>
                        <strong><Coins size={18}/>{selected.price.toLocaleString()}</strong>
                    </div>
                    {!!selected.availableColors?.length && (
                        <div className="market-color-row">
                            {selected.availableColors.map(color => <span key={color} style={{ background: color }} title={color}/>)}
                        </div>
                    )}
                    <div className="market-detail-actions">
                        <button type="button" onClick={() => setView("browse")}>Browse more</button>
                        <button type="button" onClick={() => { addToCart(selected); setView("cart"); }}>Add to cart</button>
                    </div>
                </section>
            )}

            {view === "cart" && (
                <section className="market-cart-card">
                    <h2>Cart</h2>
                    {cart.length ? cart.map(line => (
                        <div className="market-cart-row" key={line.product.id}>
                            <div>
                                <strong>{line.product.name}</strong>
                                <span>{line.product.brand}</span>
                                <small>{line.product.price.toLocaleString()} coins each</small>
                            </div>
                            <div className="market-qty">
                                <button type="button" onClick={() => updateQuantity(line.product.id, -1)}><Minus size={14}/></button>
                                <span>{line.quantity}</span>
                                <button type="button" onClick={() => updateQuantity(line.product.id, 1)}><Plus size={14}/></button>
                            </div>
                        </div>
                    )) : <p className="market-muted">Your cart is empty. Browse products to add merch.</p>}

                    <div className="market-methods">
                        <button type="button" className={method === "pickup" ? "active" : ""} onClick={() => setMethod("pickup")}>Pickup</button>
                        <button type="button" className={method === "delivery" ? "active" : ""} onClick={() => setMethod("delivery")}>Delivery</button>
                    </div>

                    <div className="market-checkout-bar">
                        <div>
                            <span>Total</span>
                            <strong><Coins size={18}/>{cartTotal.toLocaleString()}</strong>
                        </div>
                        <button type="button" disabled={!cart.length} onClick={checkout}>Checkout</button>
                    </div>
                </section>
            )}

            {view === "orders" && (
                <section className="market-inventory market-orders-card">
                    <h2>Order Status</h2>
                    {orders.length ? orders.map(order => (
                        <div className="market-order-row" key={order.id}>
                            <div className="market-order-main">
                                <PackageCheck size={22}/>
                                <div>
                                    <strong>{order.status}</strong>
                                    <span>{order.method === "pickup" ? "Pickup" : "Delivery"} · {new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <small>{order.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}</small>
                            <b>{order.total.toLocaleString()} coins</b>
                        </div>
                    )) : <p>No orders yet. Checkout with BongoCoins to create one.</p>}
                </section>
            )}
        </div>
    );
};
