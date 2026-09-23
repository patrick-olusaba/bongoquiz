import { type FC, useEffect, useState } from "react";
import {
    ArrowLeft, Banknote, Bell, ChevronDown, ChevronLeft, ChevronRight, Coins, Headphones, Heart, Home, Menu, Minus,
    PackageCheck, Plus, Search, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Smartphone, Star, Truck, Wallet,
} from "lucide-react";
import { collection, doc, onSnapshot, query, setDoc, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { BONGO_MARKET_ITEMS, getBongoCoinBalance, getMarketOrders, placeBongoMarketOrder, syncReconciledBongoCoins, type BongoMarketItem, type BongoOrder } from "../../utils/bongoWallet";
import "../../styles/BongoMarket.css";

interface Props {
    onBack: () => void;
    onWallet: () => void;
}

type MarketView = "browse" | "detail" | "cart" | "orders";
type CartLine = { product: BongoMarketItem; quantity: number };

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
    const [detailSize, setDetailSize] = useState("M");
    const [detailColor, setDetailColor] = useState("#ec008c");
    const [detailQty, setDetailQty] = useState(1);

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

    useEffect(() => {
        if (!message) return;
        const timer = window.setTimeout(() => setMessage(""), 3500);
        return () => window.clearTimeout(timer);
    }, [message]);

    const saveOrderToFirestore = async (order: BongoOrder) => {
        await setDoc(doc(db, "bongoMarketOrders", order.id), {
            ...order,
            phone,
            playerName,
            source: "bongo-market",
            updatedAt: serverTimestamp(),
        }, { merge: true });
    };

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

    const openProduct = (product: BongoMarketItem) => {
        setSelected(product);
        setView("detail");
    };

    const featuredProduct = selected || products[0] || null;
    const featuredImages = featuredProduct ? (featuredProduct.imageUrls?.length ? featuredProduct.imageUrls : featuredProduct.imageUrl ? [featuredProduct.imageUrl] : []) : [];
    const featuredImage = featuredImages[0] || "";
    const featuredColors = featuredProduct?.availableColors?.length ? featuredProduct.availableColors : ["#c000ff", "#111827", "#9ca3af", "#ec008c"];
    const featuredStock = Math.max(Number(featuredProduct?.stock ?? 20), 0);
    const detailTotal = featuredProduct ? featuredProduct.price * detailQty : 0;
    const addFeaturedToCart = () => {
        if (!featuredProduct) return;
        for (let i = 0; i < detailQty; i += 1) addToCart(featuredProduct);
    };

    return (
        <div className="bm-page">
            <header className="bm-topbar">
                <button type="button" onClick={view === "browse" ? onBack : () => setView("browse")} aria-label="Back"><ArrowLeft size={22}/></button>
                <strong>Bongo <span>Market</span></strong>
                <button type="button" className="bm-cart-btn" onClick={() => setView("cart")} aria-label="Open cart">
                    <ShoppingCart size={20}/>
                    {cartCount > 0 && <em>{cartCount}</em>}
                </button>
            </header>

            {message && <div className="bm-toast" role="status">{message}</div>}

            {view !== "browse" && (
                <nav className="bm-toolbar">
                    <button type="button" onClick={() => setView("browse")}><ShoppingBag size={14}/> Shop</button>
                    <button type="button" className={view === "cart" ? "active" : ""} onClick={() => setView("cart")}><ShoppingCart size={14}/> Cart{cartCount ? ` (${cartCount})` : ""}</button>
                    <button type="button" className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}><Truck size={14}/> Orders</button>
                </nav>
            )}

            {view === "browse" && (
                <>
                    {featuredProduct && (
                        <div className="bm-desktop-market">
                            <header className="bm-desktop-header">
                                <button type="button" className="bm-icon-button" aria-label="Menu"><Menu size={19}/></button>
                                <div className="bm-desktop-search"><Search size={17}/><span>Search for merch, games...</span></div>
                                <div className="bm-desktop-actions">
                                    <button type="button" className="bm-desktop-coins" onClick={onWallet}><Coins size={16}/><strong>{balance.toLocaleString()}</strong></button>
                                    <button type="button" className="bm-icon-button" onClick={() => setView("cart")} aria-label="Cart"><ShoppingCart size={19}/>{cartCount > 0 && <em>{cartCount}</em>}</button>
                                    <button type="button" className="bm-icon-button" aria-label="Alerts"><Bell size={19}/></button>
                                    <button type="button" className="bm-desktop-profile"><span>{playerName.charAt(0).toUpperCase()}</span><b>{playerName}<small>Player</small></b><ChevronDown size={16}/></button>
                                </div>
                            </header>

                            <div className="bm-breadcrumb"><Home size={13}/> <span>Market</span> <i/> <span>{featuredProduct.category}</span> <i/> <b>{featuredProduct.name}</b></div>

                            <main className="bm-product-layout">
                                <section className="bm-product-gallery">
                                    <div className="bm-product-stage">
                                        <span className="bm-new-badge">New</span>
                                        <button type="button" className="bm-heart" aria-label="Save product"><Heart size={20}/></button>
                                        {featuredImage ? <img src={featuredImage} alt={featuredProduct.name}/> : <div className="bm-product-fallback"><Shirt size={88}/><strong>{productLabel(featuredProduct)}</strong></div>}
                                        <button type="button" className="bm-gallery-arrow left" aria-label="Previous image"><ChevronLeft size={18}/></button>
                                        <button type="button" className="bm-gallery-arrow right" aria-label="Next image"><ChevronRight size={18}/></button>
                                    </div>
                                    <div className="bm-thumb-row">
                                        <button type="button" aria-label="Previous thumbnails"><ChevronLeft size={18}/></button>
                                        {(featuredImages.length ? featuredImages : [""]).slice(0, 4).map((url, index) => (
                                            <button type="button" className={index === 0 ? "active" : ""} key={url || index} aria-label={`Product image ${index + 1}`}>
                                                {url ? <img src={url} alt={featuredProduct.name}/> : <Shirt size={34}/>} 
                                            </button>
                                        ))}
                                        <button type="button" aria-label="Next thumbnails"><ChevronRight size={18}/></button>
                                    </div>
                                    <div className="bm-product-tabs">
                                        <button type="button" className="active">Description</button>
                                        <button type="button">Details</button>
                                        <button type="button">Shipping & Returns</button>
                                        <button type="button">Reviews (42)</button>
                                    </div>
                                    <div className="bm-product-description">
                                        <strong>{featuredProduct.name}</strong>
                                        <p>{featuredProduct.description}</p>
                                        <ul><li>Premium merch item</li><li>High quality print</li><li>Machine washable</li></ul>
                                    </div>
                                </section>

                                <section className="bm-product-info">
                                    <h1>{featuredProduct.name}</h1>
                                    <span className="bm-limited-pill">Limited Edition</span>
                                    <div className="bm-product-price"><Coins size={24}/><strong>{featuredProduct.price.toLocaleString()}</strong></div>
                                    <div className="bm-stock-line"><i/> In stock · {featuredStock || 20}+ units available</div>
                                    <p>{featuredProduct.description}</p>

                                    <div className="bm-option-group"><span>Size</span><div className="bm-size-row">{["S", "M", "L", "XL", "XXL"].map(size => <button type="button" key={size} className={detailSize === size ? "active" : ""} onClick={() => setDetailSize(size)}>{size}</button>)}</div></div>
                                    <div className="bm-option-group"><span>Color</span><div className="bm-color-choice-row">{featuredColors.map(color => <button type="button" key={color} className={detailColor === color ? "active" : ""} style={{ background: color }} onClick={() => setDetailColor(color)} aria-label={`Select color ${color}`}/>)}</div></div>
                                    <div className="bm-option-group"><span>Quantity</span><div className="bm-desktop-qty"><button type="button" onClick={() => setDetailQty(q => Math.max(1, q - 1))}><Minus size={16}/></button><strong>{detailQty}</strong><button type="button" onClick={() => setDetailQty(q => Math.min(9, q + 1))}><Plus size={16}/></button></div></div>

                                    <button type="button" className="bm-add-main" onClick={addFeaturedToCart}><ShoppingCart size={18}/> Add to cart</button>
                                    <button type="button" className="bm-buy-main" onClick={() => { addFeaturedToCart(); setView("cart"); }}>Buy now</button>

                                    <div className="bm-trust-grid">
                                        <span><Heart size={17}/><b>Premium Quality</b><small>100% cotton</small></span>
                                        <span><ShieldCheck size={17}/><b>Secure Payment</b><small>Safe & encrypted</small></span>
                                        <span><Truck size={17}/><b>Fast Delivery</b><small>Delivered to your door</small></span>
                                        <span><PackageCheck size={17}/><b>7-Day Returns</b><small>Easy returns</small></span>
                                    </div>
                                </section>

                                <aside className="bm-product-side">
                                    <section className="bm-side-card bm-side-balance"><span>BongoCoins Balance</span><div><Coins size={24}/><strong>{balance.toLocaleString()}</strong><button type="button" onClick={onWallet}><Wallet size={14}/> Wallet</button></div></section>
                                    {goalProduct && <section className="bm-side-card bm-side-goal"><div className="bm-side-goal-row"><span>{(goalProduct.imageUrls?.[0] || goalProduct.imageUrl) ? <img src={goalProduct.imageUrls?.[0] || goalProduct.imageUrl} alt={goalProduct.name}/> : <Shirt size={24}/>}</span><p><b>{coinsNeeded.toLocaleString()} coins away from</b>{goalProduct.name}</p></div><div className="bm-side-track"><i style={{ width: `${goalProgress}%` }}/></div></section>}
                                    <section className="bm-side-card bm-side-benefits"><div><Star size={22}/><b>Earn Coins</b><p>Play games and complete challenges</p></div><div><Star size={22}/><b>Get Rewards</b><p>Spend coins on merch and more</p></div><div><ShoppingBag size={22}/><b>Exclusive Drops</b><p>Access limited edition merch first</p></div></section>
                                    <section className="bm-side-card bm-support-card"><div><Headphones size={22}/><b>Need help?</b><p>Our support team is here to help you.</p></div><button type="button">Contact Support</button></section>
                                </aside>
                            </main>
                        </div>
                    )}

                    <div className="bm-mobile-shop">
                    <section className="bm-hero">
                        <div className="bm-balance">
                            <div className="bm-balance-copy">
                                <span>BongoCoin Balance</span>
                                <div><Coins size={28}/><strong>{balance.toLocaleString()}</strong></div>
                            </div>
                            <button type="button" onClick={onWallet}><Wallet size={15}/> Wallet</button>
                        </div>
                        {goalProduct && (
                            <button type="button" className="bm-goal" onClick={() => openProduct(goalProduct)}>
                                <span className="bm-goal-thumb">
                                    {(goalProduct.imageUrls?.[0] || goalProduct.imageUrl) ? <img src={goalProduct.imageUrls?.[0] || goalProduct.imageUrl} alt={goalProduct.name}/> : <Shirt size={24}/>}
                                </span>
                                <span className="bm-goal-copy">
                                    <small>{coinsNeeded > 0 ? `${coinsNeeded.toLocaleString()} coins away from` : "You can now redeem"}</small>
                                    <b>{goalProduct.name}</b>
                                    <span className="bm-goal-track"><i style={{ width: `${goalProgress}%` }}/></span>
                                </span>
                                <ChevronRight size={18}/>
                            </button>
                        )}
                    </section>

                    <nav className="bm-tabs" aria-label="Market categories">
                        <button type="button" className="active"><ShoppingBag size={16}/> Merch</button>
                        <button type="button" disabled aria-label="Airtime coming soon"><Smartphone size={16}/> Airtime <em>Soon</em></button>
                        <button type="button" disabled aria-label="M-Pesa cash coming soon"><Banknote size={16}/> Cash <em>Soon</em></button>
                    </nav>

                    <div className="bm-grid">
                        {products.map(product => {
                            const image = product.imageUrls?.[0] || product.imageUrl;
                            return (
                                <article className="bm-card" key={product.id}>
                                    <button type="button" className="bm-card-media" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}>
                                        {image ? <img src={image} alt={product.name}/> : (
                                            <i style={{ background: `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.25), transparent 36%), linear-gradient(150deg, ${product.color}, #14001f)` }}>
                                                <Shirt size={32}/>
                                                <span>{productLabel(product)}</span>
                                            </i>
                                        )}
                                        {product.tag && <small>{product.tag}</small>}
                                    </button>
                                    <div className="bm-card-info">
                                        <strong>{product.name}</strong>
                                        <span className={product.price <= balance ? "ok" : ""}><Coins size={13}/>{product.price.toLocaleString()}</span>
                                    </div>
                                    <button type="button" className="bm-card-add" onClick={() => addToCart(product)}><Plus size={14}/> Add to cart</button>
                                </article>
                            );
                        })}
                    </div>
                    </div>
                </>
            )}

            {view === "detail" && selected && (
                <section className="bm-panel bm-detail">
                    {(selected.imageUrls?.[0] || selected.imageUrl) ? (
                        <img className="bm-detail-image" src={selected.imageUrls?.[0] || selected.imageUrl} alt={selected.name}/>
                    ) : (
                        <div className="bm-detail-art" style={{ background: `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.28), transparent 34%), linear-gradient(145deg, ${selected.color}, #8b2cff 58%, #14001f)` }}>
                            {productLabel(selected)}
                        </div>
                    )}
                    {!!selected.imageUrls?.length && selected.imageUrls.length > 1 && (
                        <div className="bm-gallery">
                            {selected.imageUrls.map(url => <img key={url} src={url} alt={selected.name}/>)}
                        </div>
                    )}
                    <span className="bm-detail-brand">{selected.brand}</span>
                    <h2>{selected.name}</h2>
                    <p>{selected.description}</p>
                    <div className="bm-detail-meta">
                        <small>{selected.category}{typeof selected.stock === "number" && selected.stock > 0 ? ` · ${selected.stock} in stock` : ""}</small>
                        <strong><Coins size={17}/>{selected.price.toLocaleString()}</strong>
                    </div>
                    {!!selected.availableColors?.length && (
                        <div className="bm-color-row">
                            {selected.availableColors.map(color => <span key={color} style={{ background: color }} title={color}/>)}
                        </div>
                    )}
                    <div className="bm-detail-actions">
                        <button type="button" onClick={() => setView("browse")}>Keep browsing</button>
                        <button type="button" onClick={() => { addToCart(selected); setView("cart"); }}>Add to cart</button>
                    </div>
                </section>
            )}

            {view === "cart" && (
                <section className="bm-panel bm-cart">
                    <h2>Your Cart</h2>
                    {cart.length ? cart.map(line => (
                        <div className="bm-cart-row" key={line.product.id}>
                            <div className="bm-cart-copy">
                                <strong>{line.product.name}</strong>
                                <span>{line.product.brand}</span>
                                <small>{line.product.price.toLocaleString()} coins each</small>
                            </div>
                            <div className="bm-qty">
                                <button type="button" onClick={() => updateQuantity(line.product.id, -1)} aria-label="Decrease quantity"><Minus size={14}/></button>
                                <span>{line.quantity}</span>
                                <button type="button" onClick={() => updateQuantity(line.product.id, 1)} aria-label="Increase quantity"><Plus size={14}/></button>
                            </div>
                        </div>
                    )) : <p className="bm-muted">Your cart is empty. Browse products to add merch.</p>}

                    <div className="bm-methods">
                        <button type="button" className={method === "pickup" ? "active" : ""} onClick={() => setMethod("pickup")}>Pickup</button>
                        <button type="button" className={method === "delivery" ? "active" : ""} onClick={() => setMethod("delivery")}>Delivery</button>
                    </div>

                    <div className="bm-checkout-bar">
                        <div>
                            <span>Total</span>
                            <strong><Coins size={17}/>{cartTotal.toLocaleString()}</strong>
                        </div>
                        <button type="button" disabled={!cart.length} onClick={checkout}>Checkout</button>
                    </div>
                </section>
            )}

            {view === "orders" && (
                <section className="bm-panel bm-orders">
                    <h2>Order Status</h2>
                    {orders.length ? orders.map(order => (
                        <div className="bm-order-row" key={order.id}>
                            <div className="bm-order-main">
                                <PackageCheck size={20}/>
                                <div>
                                    <strong>{order.status}</strong>
                                    <span>{order.method === "pickup" ? "Pickup" : "Delivery"} · {new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <b>{order.total.toLocaleString()} coins</b>
                            </div>
                            <small>{order.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}</small>
                        </div>
                    )) : <p className="bm-muted">No orders yet. Checkout with BongoCoins to create one.</p>}
                </section>
            )}
        </div>
    );
};
