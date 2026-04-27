// KCSEPastPapers.tsx — student-facing KCSE past papers browser
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.ts";

const PRICE = 20;

const C = {
    green:  "#16a34a",
    greenL: "#dcfce7",
    orange: "#ea580c",
    orangeL:"#fff7ed",
    black:  "#111827",
    gray:   "#6b7280",
    border: "#e5e7eb",
    bg:     "#f9fafb",
};

const css = `
html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}
.kcse-root{min-height:100vh;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${C.black}}
.kcse-header{background:#fff;border-bottom:3px solid ${C.green};padding:14px 20px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}
.kcse-back{background:none;border:none;cursor:pointer;font-size:1.2rem;padding:4px 8px;border-radius:6px;color:${C.black}}
.kcse-back:hover{background:${C.greenL}}
.kcse-header-title{font-size:1.1rem;font-weight:800;color:${C.green}}
.kcse-header-sub{font-size:0.78rem;color:${C.gray};margin-top:1px}
.kcse-body{max-width:700px;margin:0 auto;padding:20px 16px}
.kcse-year-select{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.kcse-year-btn{padding:7px 16px;border-radius:20px;border:2px solid ${C.border};background:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.15s;color:${C.black}}
.kcse-year-btn:hover{border-color:${C.green};color:${C.green}}
.kcse-year-btn.active{background:${C.green};color:#fff;border-color:${C.green}}
.kcse-section-title{font-size:0.78rem;font-weight:700;color:${C.gray};text-transform:uppercase;letter-spacing:1px;margin:0 0 10px}
.kcse-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;margin-bottom:24px}
.kcse-card{background:#fff;border-radius:16px;border:1px solid ${C.border};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;flex-direction:column}
.kcse-card-thumb{width:100%;aspect-ratio:4/3;position:relative;overflow:hidden;background:#f3f4f6;flex-shrink:0}
.kcse-card-thumb iframe{width:200%;height:200%;transform:scale(0.5);transform-origin:top left;border:none;pointer-events:none}
.kcse-card-thumb-badge{position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px}
.kcse-card-label{padding:8px 10px 4px;font-weight:700;font-size:0.88rem;color:${C.black};text-align:center;line-height:1.3}
.kcse-card-meta{font-size:0.75rem;color:${C.gray};text-align:center;padding:0 10px 10px}
.kcse-card-actions{display:flex;gap:6px;padding:0 10px 12px;margin-top:auto}
.kcse-btn-preview{flex:1;padding:7px 4px;border-radius:8px;border:1.5px solid ${C.green};background:#fff;color:${C.green};font-size:0.75rem;font-weight:700;cursor:pointer}
.kcse-btn-preview:hover{background:${C.greenL}}
.kcse-btn-buy{flex:1;padding:7px 4px;border-radius:8px;border:none;background:${C.orange};color:#fff;font-size:0.75rem;font-weight:700;cursor:pointer}
.kcse-btn-buy:hover{background:#c2410c}
.kcse-empty{text-align:center;padding:48px 20px;color:${C.gray}}
.kcse-preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;display:flex;flex-direction:column}
.kcse-preview-bar{background:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${C.border}}
.kcse-preview-title{font-weight:700;font-size:0.95rem}
.kcse-preview-close{background:none;border:none;font-size:1.3rem;cursor:pointer;padding:4px 8px;border-radius:6px}
.kcse-preview-close:hover{background:#f3f4f6}
.kcse-preview-iframe{flex:1;border:none;width:100%}
.kcse-buy-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
.kcse-buy-modal{background:#fff;border-radius:16px;padding:28px 24px;max-width:340px;width:100%;text-align:center}
.kcse-buy-icon{font-size:2.5rem;margin-bottom:8px}
.kcse-buy-title{font-size:1.1rem;font-weight:800;color:${C.black};margin-bottom:4px}
.kcse-buy-sub{font-size:0.85rem;color:${C.gray};margin-bottom:20px}
.kcse-buy-price{font-size:2rem;font-weight:900;color:${C.orange};margin-bottom:20px}
.kcse-buy-confirm{width:100%;padding:12px;border-radius:10px;border:none;background:${C.orange};color:#fff;font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:10px}
.kcse-buy-confirm:hover{background:#c2410c}
.kcse-buy-cancel{width:100%;padding:10px;border-radius:10px;border:1.5px solid ${C.border};background:#fff;font-size:0.9rem;cursor:pointer;color:${C.gray}}
`;

interface Paper {
    id: string;
    subject: string;
    year: number;
    paperUrl: string;
    answersUrl?: string;
    type: "paper" | "answers";
}

export function KCSEPastPapers({ onBack }: { onBack: () => void }) {
    const [papers,   setPapers]   = useState<Paper[]>([]);
    const [years,    setYears]    = useState<number[]>([]);
    const [selYear,  setSelYear]  = useState<number | null>(null);
    const [preview,  setPreview]  = useState<{ url: string; title: string; paper: Paper } | null>(null);
    const [buying,   setBuying]   = useState<Paper | null>(null);

    useEffect(() => {
        getDocs(collection(db, "kcsePapers"))
            .then(snap => {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Paper));
                const sorted = docs.sort((a, b) => b.year - a.year);
                setPapers(sorted);
                const uniqueYears = [...new Set(sorted.map(p => p.year))];
                setYears(uniqueYears);
                if (uniqueYears.length) setSelYear(uniqueYears[0]);
            }).catch(() => {});
    }, []);

    const filtered = selYear ? papers.filter(p => p.year === selYear) : papers;
    const questionPapers = filtered.filter(p => p.type === "paper");
    const answerPapers   = filtered.filter(p => p.type === "answers");

    return (
        <>
        <style>{css}</style>
        <div className="kcse-root">
            <div className="kcse-header">
                <button className="kcse-back" onClick={onBack}>←</button>
                <div>
                    <div className="kcse-header-title">📄 KCSE Past Papers</div>
                    <div className="kcse-header-sub">Form 4 · All Subjects</div>
                </div>
            </div>

            <div className="kcse-body">
                {/* Year selector */}
                <div className="kcse-year-select">
                    {years.map(y => (
                        <button key={y} className={`kcse-year-btn${selYear === y ? " active" : ""}`}
                            onClick={() => setSelYear(y)}>{y}</button>
                    ))}
                </div>

                {papers.length === 0 ? (
                    <div className="kcse-empty">
                        <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📂</div>
                        <div>No papers available yet. Check back soon.</div>
                    </div>
                ) : (
                    <>
                        {questionPapers.length > 0 && (
                            <>
                                <div className="kcse-section-title">📝 Question Papers</div>
                                <div className="kcse-grid">
                                    {questionPapers.map(p => <PaperCard key={p.id} paper={p} onPreview={setPreview} onBuy={setBuying} />)}
                                </div>
                            </>
                        )}
                        {answerPapers.length > 0 && (
                            <>
                                <div className="kcse-section-title">✅ Marking Schemes</div>
                                <div className="kcse-grid">
                                    {answerPapers.map(p => <PaperCard key={p.id} paper={p} onPreview={setPreview} onBuy={setBuying} />)}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* PDF Preview — first page only */}
        {preview && (
            <div className="kcse-preview-overlay">
                <div className="kcse-preview-bar">
                    <span className="kcse-preview-title">{preview.title}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setBuying(preview.paper); setPreview(null); }}
                            style={{ padding: "5px 14px", borderRadius: 6, background: "#ea580c", color: "#fff", fontSize: "0.82rem", fontWeight: 700, border: "none", cursor: "pointer" }}>
                            🛒 Download — KSh {PRICE}
                        </button>
                        <button className="kcse-preview-close" onClick={() => setPreview(null)}>✕</button>
                    </div>
                </div>
                <iframe
                    className="kcse-preview-iframe"
                    src={`${preview.url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    title={preview.title}
                    style={{ pointerEvents: "none" }}
                />
            </div>
        )}

        {/* Buy modal */}
        {buying && (
            <div className="kcse-buy-overlay" onClick={() => setBuying(null)}>
                <div className="kcse-buy-modal" onClick={e => e.stopPropagation()}>
                    <div className="kcse-buy-icon">🛒</div>
                    <div className="kcse-buy-title">{buying.subject} {buying.year}</div>
                    <div className="kcse-buy-sub">{buying.type === "answers" ? "Marking Scheme" : "Question Paper"}</div>
                    <div className="kcse-buy-price">KSh {PRICE}</div>
                    <button className="kcse-buy-confirm" onClick={() => {
                        // TODO: wire M-Pesa payment
                        alert("M-Pesa payment coming soon!");
                        setBuying(null);
                    }}>Pay via M-Pesa</button>
                    <button className="kcse-buy-cancel" onClick={() => setBuying(null)}>Cancel</button>
                </div>
            </div>
        )}
        </>
    );
}

function PaperCard({ paper, onPreview, onBuy }: {
    paper: Paper;
    onPreview: (p: { url: string; title: string; paper: Paper }) => void;
    onBuy: (p: Paper) => void;
}) {
    const isAnswers = paper.type === "answers";
    return (
        <div className="kcse-card">
            <div className="kcse-card-thumb">
                <iframe
                    src={`${paper.paperUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    title={`${paper.subject} preview`}
                />
                <span className="kcse-card-thumb-badge">{isAnswers ? "Answers" : "Paper"}</span>
            </div>
            <div className="kcse-card-label">{paper.subject}</div>
            <div className="kcse-card-meta">{paper.year}</div>
            <div className="kcse-card-actions">
                <button className="kcse-btn-preview"
                    onClick={() => onPreview({ url: paper.paperUrl, title: `${paper.subject} ${paper.year}`, paper })}>
                    👁 Preview
                </button>
                <button className="kcse-btn-buy" onClick={() => onBuy(paper)}>
                    ⬇ KSh {PRICE}
                </button>
            </div>
        </div>
    );
}
