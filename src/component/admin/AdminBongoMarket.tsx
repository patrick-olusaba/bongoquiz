import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../firebase.ts";
import { BONGO_MARKET_ITEMS, type BongoMarketItem, type BongoOrder } from "../../utils/bongoWallet.ts";
import { writeAdminAudit } from "./auditLog.ts";

type MarketProductForm = Omit<BongoMarketItem, "price"> & {
    price: number | "";
    active: boolean;
    stock: number | "";
    imageUrl: string;
    imageUrls: string[];
    sortOrder: number | "";
    availableColors: string[];
};

type MarketOrder = BongoOrder & {
    phone?: string;
    playerName?: string;
    updatedAt?: unknown;
};

const BLANK_PRODUCT: MarketProductForm = {
    id: "",
    name: "",
    description: "",
    price: 0,
    tag: "New",
    brand: "BongoQuiz Merch",
    category: "Shirts",
    color: "#ff28f4",
    active: true,
    stock: 20,
    imageUrl: "",
    imageUrls: [],
    sortOrder: 10,
    availableColors: ["#111827"],
};

const statuses: MarketOrder["status"][] = ["Order placed", "Ready for pickup", "Out for delivery", "Delivered", "Cancelled"];
const categories: BongoMarketItem["category"][] = ["Shirts", "Caps", "Capes", "Accessories"];
const presetColors = ["#111827", "#ffffff", "#ff28f4", "#22d3ee", "#a78bfa", "#fef08a", "#fb7185", "#16a34a", "#dc2626", "#2563eb"];

const s: Record<string, CSSProperties> = {
    top: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" },
    h2: { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, margin: 0 },
    tabs: { display: "flex", gap: 8, flexWrap: "wrap" },
    card: { background: "#fff", borderRadius: 10, padding: "18px 20px", border: "1px solid #e8eaf0", marginBottom: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
    th: { background: "#f5f5ff", color: "#4361ee", padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e0e0f0", whiteSpace: "nowrap" },
    td: { padding: "10px 12px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" },
    btn: { padding: "7px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, fontFamily: "inherit" },
    ghost: { background: "#f1f5f9", color: "#475569" },
    primary: { background: "#4361ee", color: "#fff" },
    danger: { background: "#fee2e2", color: "#991b1b" },
    input: { padding: "8px 10px", borderRadius: 7, border: "1px solid #d8dce8", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" },
    label: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#555", marginBottom: 5 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 12 },
    chip: { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 8px", fontSize: "0.72rem", fontWeight: 800 },
    upload: { border: "1.5px dashed #b8c2d8", borderRadius: 12, padding: 14, background: "#f8faff", display: "grid", gridTemplateColumns: "88px 1fr", gap: 14, alignItems: "center", cursor: "pointer" },
    uploadPreview: { width: 88, height: 88, borderRadius: 10, objectFit: "cover", background: "#edf2ff", border: "1px solid #dce5ff" },
    uploadThumbs: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
    uploadThumb: { position: "relative", width: 62, height: 62, borderRadius: 8, overflow: "hidden", border: "1px solid #dce5ff", background: "#edf2ff" },
    uploadEmpty: { width: 88, height: 88, borderRadius: 10, background: "linear-gradient(135deg, #eef2ff, #fdf4ff)", border: "1px solid #dce5ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4361ee", fontWeight: 900, fontSize: "1.4rem" },
    swatches: { display: "flex", flexWrap: "wrap", gap: 8 },
    swatch: { width: 30, height: 30, borderRadius: 999, border: "2px solid #d8dce8", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
};

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const parseNumberInput = (value: string) => value === "" ? "" : Number(value);

const cleanProduct = (form: MarketProductForm) => ({
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price || 0),
    tag: form.tag.trim() || "Merch",
    brand: form.brand.trim() || "BongoQuiz Merch",
    category: form.category,
    color: form.color || "#ff28f4",
    active: form.active,
    stock: Number(form.stock || 0),
    imageUrl: (form.imageUrls[0] || form.imageUrl).trim(),
    imageUrls: form.imageUrls.length ? form.imageUrls : form.imageUrl ? [form.imageUrl.trim()] : [],
    sortOrder: Number(form.sortOrder || 0),
    availableColors: form.availableColors?.length ? form.availableColors : [form.color],
});

const formatDate = (value: any) => {
    const date = value?.toDate?.() ?? (value ? new Date(value) : null);
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "-";
};

export function AdminBongoMarket() {
    const [tab, setTab] = useState<"products" | "orders">("products");
    const [products, setProducts] = useState<MarketProductForm[]>([]);
    const [orders, setOrders] = useState<MarketOrder[]>([]);
    const [form, setForm] = useState<MarketProductForm>(BLANK_PRODUCT);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [customColor, setCustomColor] = useState("#000000");

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "bongoMarketProducts"), snap => {
            setProducts(snap.docs.map(d => {
                const data = { ...BLANK_PRODUCT, id: d.id, ...d.data() } as MarketProductForm;
                const imageUrls = data.imageUrls?.length ? data.imageUrls : data.imageUrl ? [data.imageUrl] : [];
                return { ...data, imageUrl: imageUrls[0] || "", imageUrls, availableColors: data.availableColors?.length ? data.availableColors : [data.color] };
            })
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name)));
        }, err => {
            console.error("Failed to load Bongo Market products:", err);
            setError("Could not load market products. Deploy the updated Firestore rules for bongoMarketProducts, then refresh.");
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "bongoMarketOrders"), snap => {
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketOrder))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }, err => {
            console.error("Failed to load Bongo Market orders:", err);
        });
        return unsub;
    }, []);

    const totals = useMemo(() => ({
        active: products.filter(p => p.active).length,
        stock: products.reduce((sum, p) => sum + Number(p.stock || 0), 0),
        pending: orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").length,
    }), [products, orders]);

    const uploadProductImages = async (files?: FileList | File[] | null) => {
        const selected = Array.from(files || []).filter(file => file.type.startsWith("image/"));
        if (!selected.length) {
            alert("Please upload image files.");
            return;
        }
        setUploading(true);
        try {
            const productSlug = slugify(form.name) || "market-product";
            const urls: string[] = [];
            for (const file of selected) {
                const ext = file.name.split(".").pop() || "jpg";
                const imageRef = ref(storage, "bongoMarketProducts/" + productSlug + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext);
                await uploadBytes(imageRef, file, { contentType: file.type });
                urls.push(await getDownloadURL(imageRef));
            }
            setForm(prev => {
                const imageUrls = [...prev.imageUrls, ...urls];
                return { ...prev, imageUrls, imageUrl: imageUrls[0] || "" };
            });
        } catch (err) {
            alert("Image upload failed: " + err);
        } finally {
            setUploading(false);
        }
    };

    const removeProductImage = (imageUrl: string) => {
        setForm(prev => {
            const imageUrls = prev.imageUrls.filter(url => url !== imageUrl);
            return { ...prev, imageUrls, imageUrl: imageUrls[0] || "" };
        });
    };

    const toggleAvailableColor = (color: string) => {
        setForm(prev => {
            const exists = prev.availableColors.includes(color);
            const availableColors = exists ? prev.availableColors.filter(c => c !== color) : [...prev.availableColors, color];
            return { ...prev, availableColors, color: availableColors[0] || prev.color };
        });
    };


    const saveProduct = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        const id = form.id || `${slugify(form.name) || "market-product"}-${Date.now()}`;
        const data = cleanProduct(form);
        try {
            const payload = form.id
                ? { ...data, updatedAt: serverTimestamp() }
                : { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
            await setDoc(doc(db, "bongoMarketProducts", id), payload, { merge: true });
            await writeAdminAudit({ action: form.id ? "Market product updated" : "Market product created", target: data.name, game: "Bongo Market", details: data });
            setForm(BLANK_PRODUCT);
        } catch (err) {
            alert("Error saving product: " + err);
        } finally {
            setSaving(false);
        }
    };

    const seedDefaults = async () => {
        if (!confirm("Seed default Bongo Market merch into Firestore? Existing matching IDs will be updated.")) return;
        for (const item of BONGO_MARKET_ITEMS) {
            await setDoc(doc(db, "bongoMarketProducts", item.id), {
                ...item,
                active: true,
                stock: item.stock ?? 20,
                imageUrl: item.imageUrl ?? "",
                imageUrls: item.imageUrls ?? (item.imageUrl ? [item.imageUrl] : []),
                sortOrder: item.sortOrder ?? 10,
                availableColors: item.availableColors ?? [item.color],
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }
        await writeAdminAudit({ action: "Market defaults seeded", target: "Bongo Market", game: "Bongo Market" });
    };

    const deleteProduct = async (product: MarketProductForm) => {
        if (!confirm(`Delete ${product.name}?`)) return;
        await deleteDoc(doc(db, "bongoMarketProducts", product.id));
        await writeAdminAudit({ action: "Market product deleted", target: product.name, game: "Bongo Market" });
    };

    const updateOrderStatus = async (order: MarketOrder, status: MarketOrder["status"]) => {
        await setDoc(doc(db, "bongoMarketOrders", order.id), { status, updatedAt: serverTimestamp() }, { merge: true });
        await writeAdminAudit({ action: "Market order status updated", target: order.id, game: "Bongo Market", details: { status } });
    };

    return (
        <>
            <div style={s.top}>
                <div>
                    <h2 style={s.h2}>Bongo Market</h2>
                    <p style={{ margin: "6px 0 0", color: "#667085", fontSize: "0.86rem" }}>Manage merch catalog, cart checkout orders, and fulfillment status.</p>
                </div>
                <div style={s.tabs}>
                    <button style={{ ...s.btn, ...(tab === "products" ? s.primary : s.ghost) }} onClick={() => setTab("products")}>Merch Products</button>
                    <button style={{ ...s.btn, ...(tab === "orders" ? s.primary : s.ghost) }} onClick={() => setTab("orders")}>Orders ({totals.pending})</button>
                    <button style={{ ...s.btn, background: "#ecfeff", color: "#0e7490" }} onClick={seedDefaults}>Seed Defaults</button>
                </div>
            </div>

            {error && <div style={{ ...s.card, color: "#991b1b", background: "#fff1f2" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div style={s.card}><strong>{products.length}</strong><br/><span>Total products</span></div>
                <div style={s.card}><strong>{totals.active}</strong><br/><span>Active products</span></div>
                <div style={s.card}><strong>{totals.stock}</strong><br/><span>Stock units</span></div>
                <div style={s.card}><strong>{orders.length}</strong><br/><span>Total orders</span></div>
            </div>

            {tab === "products" && (
                <>
                    <form style={s.card} onSubmit={saveProduct}>
                        <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Merch Product" : "Add Merch Product"}</h3>
                        <div style={s.grid}>
                            <Field label="Product name"><input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required/></Field>
                            <Field label="Brand"><input style={s.input} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}/></Field>
                            <Field label="Category"><select style={s.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value as BongoMarketItem["category"] })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
                            <Field label="Price (Coins/KSh)"><input type="number" min="0" style={s.input} value={form.price} onChange={e => setForm({ ...form, price: parseNumberInput(e.target.value) })}/></Field>
                            <Field label="Stock"><input type="number" min="0" style={s.input} value={form.stock} onChange={e => setForm({ ...form, stock: parseNumberInput(e.target.value) })}/></Field>
                            <Field label="Tag"><input style={s.input} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}/></Field>
                            <Field label="Primary display color"><input type="color" style={{ ...s.input, height: 38 }} value={form.color} onChange={e => setForm({ ...form, color: e.target.value, availableColors: form.availableColors.includes(e.target.value) ? form.availableColors : [e.target.value, ...form.availableColors] })}/></Field>
                            <Field label="Sort order"><input type="number" style={s.input} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseNumberInput(e.target.value) })}/></Field>
                        </div>
                        <ImageUploader imageUrls={form.imageUrls} uploading={uploading} onUpload={uploadProductImages} onRemove={removeProductImage} onClear={() => setForm({ ...form, imageUrl: "", imageUrls: [] })}/>
                        <div style={{ marginTop: 12 }}>
                            <Field label="Available colors">
                                <div style={s.swatches}>
                                    {presetColors.map(color => (
                                        <button key={color} type="button" aria-label={color} title={color} onClick={() => toggleAvailableColor(color)} style={{ ...s.swatch, background: color, outline: form.availableColors.includes(color) ? "3px solid #4361ee" : "none", outlineOffset: 2 }}/>
                                    ))}
                                    <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} style={{ ...s.swatch, padding: 0 }}/>
                                    <button type="button" style={{ ...s.btn, ...s.ghost }} onClick={() => toggleAvailableColor(customColor)}>Add color</button>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                    {form.availableColors.map(color => <span key={color} style={{ ...s.chip, background: color, color: color.toLowerCase() === "#ffffff" ? "#111827" : "#fff", border: "1px solid #d8dce8" }}>{color}</span>)}
                                </div>
                            </Field>
                        </div>
                        <div style={{ marginTop: 12 }}><Field label="Description"><textarea style={{ ...s.input, minHeight: 70 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></Field></div>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: "0.85rem", fontWeight: 700 }}><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}/> Active in market</label>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                            <button type="button" style={{ ...s.btn, ...s.ghost }} onClick={() => setForm(BLANK_PRODUCT)}>Clear</button>
                            <button type="submit" style={{ ...s.btn, ...s.primary }} disabled={saving}>{saving ? "Saving..." : "Save Product"}</button>
                        </div>
                    </form>

                    <div style={s.card}>
                        <table style={s.table}>
                            <thead><tr><th style={s.th}>Product</th><th style={s.th}>Brand</th><th style={s.th}>Price</th><th style={s.th}>Stock</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
                            <tbody>{products.map(product => (
                                <tr key={product.id}>
                                    <td style={s.td}><strong>{product.name}</strong><br/><small>{product.category} · {product.tag}</small></td>
                                    <td style={s.td}>{product.brand}</td>
                                    <td style={s.td}>{Number(product.price).toLocaleString()} coins</td>
                                    <td style={s.td}>{product.stock}</td>
                                    <td style={s.td}><span style={{ ...s.chip, background: product.active ? "#dcfce7" : "#f1f5f9", color: product.active ? "#166534" : "#64748b" }}>{product.active ? "Active" : "Hidden"}</span></td>
                                    <td style={s.td}><div style={{ display: "flex", gap: 6 }}><button style={{ ...s.btn, ...s.ghost }} onClick={() => setForm(product)}>Edit</button><button style={{ ...s.btn, ...s.danger }} onClick={() => deleteProduct(product)}>Delete</button></div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </>
            )}

            {tab === "orders" && (
                <div style={s.card}>
                    <table style={s.table}>
                        <thead><tr><th style={s.th}>Order</th><th style={s.th}>Customer</th><th style={s.th}>Items</th><th style={s.th}>Total</th><th style={s.th}>Method</th><th style={s.th}>Status</th><th style={s.th}>Date</th></tr></thead>
                        <tbody>{orders.map(order => (
                            <tr key={order.id}>
                                <td style={s.td}><strong>{order.id}</strong></td>
                                <td style={s.td}>{order.playerName || "Player"}<br/><small>{order.phone || "No phone"}</small></td>
                                <td style={s.td}>{order.items?.map(item => `${item.quantity}x ${item.name}`).join(", ")}</td>
                                <td style={s.td}>{Number(order.total || 0).toLocaleString()} coins</td>
                                <td style={s.td}>{order.method}</td>
                                <td style={s.td}><select style={s.input} value={order.status} onChange={e => updateOrderStatus(order, e.target.value as MarketOrder["status"])}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select></td>
                                <td style={s.td}>{formatDate(order.createdAt)}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                    {!orders.length && <p style={{ color: "#667085" }}>No Bongo Market orders yet.</p>}
                </div>
            )}
        </>
    );
}

function ImageUploader({ imageUrls, uploading, onUpload, onRemove, onClear }: { imageUrls: string[]; uploading: boolean; onUpload: (files?: FileList | File[] | null) => void; onRemove: (imageUrl: string) => void; onClear: () => void }) {
    const primaryImage = imageUrls[0] || "";
    return (
        <div style={{ marginTop: 12 }}>
            <span style={s.label}>Product image</span>
            <label
                style={s.upload}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault();
                    onUpload(e.dataTransfer.files);
                }}
            >
                {primaryImage ? <img src={primaryImage} alt="Product preview" style={s.uploadPreview}/> : <div style={s.uploadEmpty}>+</div>}
                <div>
                    <strong style={{ color: "#1a1a2e", display: "block", marginBottom: 4 }}>{uploading ? "Uploading image..." : "Drag and drop product image"}</strong>
                    <span style={{ color: "#667085", fontSize: "0.84rem" }}>Import one or more JPG, PNG, or WebP images from your device.</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <span style={{ ...s.btn, ...s.primary, display: "inline-flex" }}>Import image</span>
                        {imageUrls.length > 0 && <button type="button" style={{ ...s.btn, ...s.ghost }} onClick={e => { e.preventDefault(); onClear(); }}>Remove all</button>}
                    </div>
                </div>
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => onUpload(e.target.files)}/>
            </label>
            {imageUrls.length > 0 && (
                <div style={s.uploadThumbs}>
                    {imageUrls.map((url, index) => (
                        <div key={url} style={s.uploadThumb}>
                            <img src={url} alt={`Product ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                            <button type="button" aria-label="Remove image" onClick={() => onRemove(url)} style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 999, border: "none", background: "rgba(15,23,42,0.82)", color: "#fff", cursor: "pointer" }}>×</button>
                            {index === 0 && <span style={{ position: "absolute", left: 3, bottom: 3, borderRadius: 999, background: "#4361ee", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 5px" }}>Main</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return <label><span style={s.label}>{label}</span>{children}</label>;
}
