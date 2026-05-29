import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.ts";

const PRICE_RANGE = "KSh 20-50";

const css = `
html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}
.kcse-root{min-height:100vh;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827}
.kcse-topbar{background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:20}.kcse-topbar-inner{max-width:1180px;margin:0 auto;padding:12px 18px;display:flex;align-items:center;gap:12px}.kcse-back{width:34px;height:34px;border:1px solid #e2e8f0;background:#fff;color:#111827;border-radius:8px;cursor:pointer;font-size:1rem;display:grid;place-items:center;flex:0 0 auto}.kcse-back:hover{border-color:#00a651;color:#00a651}.kcse-brand{min-width:0}.kcse-brand-title{font-weight:900;color:#00a651;font-size:1.05rem;line-height:1.1}.kcse-brand-sub{color:#64748b;font-size:0.78rem;margin-top:2px}
.kcse-market{max-width:1180px;margin:0 auto;padding:18px}.kcse-hero{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:22px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;box-shadow:0 10px 30px rgba(15,23,42,.05)}.kcse-eyebrow{color:#047857;font-size:.76rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}.kcse-hero h1{margin:0;color:#111827;font-size:clamp(1.55rem,3vw,2.45rem);line-height:1.05;letter-spacing:0}.kcse-hero p{max-width:680px;margin:10px 0 0;color:#475569;font-size:.95rem;line-height:1.55}.kcse-price-pill{display:inline-flex;align-items:center;justify-content:center;min-width:160px;padding:16px 20px;border-radius:8px;background:#00a651;color:#fff;font-size:1.4rem;font-weight:900;box-shadow:0 12px 28px rgba(0,166,81,.22)}
.kcse-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px;max-width:620px}.kcse-stat{background:#e8f8ef;border:1px solid #c8efd8;border-radius:8px;padding:10px 12px}.kcse-stat strong{display:block;font-size:1rem;color:#047857}.kcse-stat span{display:block;color:#64748b;font-size:.74rem;margin-top:2px}
.kcse-toolbar{margin-top:16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;align-items:center}.kcse-search,.kcse-select{height:40px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#111827;font:inherit;font-size:.9rem;outline:none}.kcse-search{padding:0 13px;min-width:0}.kcse-select{padding:0 34px 0 12px;cursor:pointer}.kcse-years{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.kcse-year-btn{padding:8px 15px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;color:#475569;font-size:.85rem;font-weight:800;cursor:pointer;transition:all .15s}.kcse-year-btn:hover{border-color:#00a651;color:#00a651}.kcse-year-btn.active{background:#00a651;border-color:#00a651;color:#fff}
.kcse-section{margin-top:22px}.kcse-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:12px}.kcse-section-title{font-size:1rem;font-weight:900;color:#111827;margin:0}.kcse-section-sub{color:#64748b;font-size:.82rem;margin-top:3px}.kcse-count{color:#047857;font-size:.82rem;font-weight:900;background:#e8f8ef;border:1px solid #c8efd8;border-radius:999px;padding:6px 10px;white-space:nowrap}.kcse-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
.kcse-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.06);display:flex;flex-direction:column;min-height:390px;transition:transform .15s,box-shadow .15s,border-color .15s}.kcse-card:hover{transform:translateY(-2px);border-color:#b7e4c7;box-shadow:0 14px 34px rgba(15,23,42,.1)}.kcse-card-thumb{width:100%;aspect-ratio:4/3;position:relative;overflow:hidden;background:linear-gradient(135deg,#f8fafc,#e2e8f0);border-bottom:1px solid #e2e8f0;flex-shrink:0}.kcse-card-thumb iframe{width:200%;height:200%;transform:scale(.5);transform-origin:top left;border:none;pointer-events:none;background:#fff}.kcse-doc-placeholder{height:100%;display:grid;place-items:center;color:#475569;font-weight:900;font-size:1.1rem}.kcse-card-badge{position:absolute;top:10px;left:10px;background:rgba(17,24,39,.82);color:#fff;font-size:.68rem;font-weight:900;padding:5px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em;max-width:calc(100% - 20px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kcse-card-price{position:absolute;right:10px;bottom:10px;background:#f97316;color:#fff;font-weight:900;font-size:.88rem;padding:7px 9px;border-radius:8px;box-shadow:0 8px 18px rgba(249,115,22,.25)}
.kcse-card-body{padding:13px 13px 14px;display:flex;flex-direction:column;gap:10px;flex:1}.kcse-card-label{font-size:1rem;font-weight:900;color:#111827;line-height:1.25;margin:0}.kcse-card-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:#64748b;font-size:.8rem}.kcse-tag{border:1px solid #e2e8f0;background:#f8fafc;border-radius:999px;padding:4px 8px;font-size:.74rem;font-weight:800;color:#475569}.kcse-card-desc{color:#475569;font-size:.82rem;line-height:1.45;margin:0;min-height:36px}.kcse-card-actions{display:grid;grid-template-columns:1fr 1.1fr;gap:8px;margin-top:auto}.kcse-btn-preview,.kcse-btn-buy{height:40px;border-radius:8px;font-size:.84rem;font-weight:900;cursor:pointer;font-family:inherit;white-space:nowrap}.kcse-btn-preview{border:1.5px solid #00a651;background:#fff;color:#00a651}.kcse-btn-preview:hover{background:#e8f8ef}.kcse-btn-buy{border:none;background:#f97316;color:#fff}.kcse-btn-buy:hover{background:#c2410c}
.kcse-empty{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:44px 20px;text-align:center;color:#64748b;box-shadow:0 8px 24px rgba(15,23,42,.05)}.kcse-empty strong{display:block;color:#111827;font-size:1.05rem;margin-bottom:5px}.kcse-preview-overlay{position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:100;display:flex;flex-direction:column}.kcse-preview-bar{background:#fff;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;gap:12px}.kcse-preview-title{font-weight:900;font-size:.95rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kcse-preview-actions{display:flex;gap:8px;align-items:center;flex:0 0 auto}.kcse-preview-buy{padding:8px 13px;border-radius:8px;background:#f97316;color:#fff;font-size:.82rem;font-weight:900;border:none;cursor:pointer}.kcse-preview-close{width:34px;height:34px;background:#fff;border:1px solid #e2e8f0;font-size:1.15rem;cursor:pointer;border-radius:8px;display:grid;place-items:center;color:#111827}.kcse-preview-close:hover{background:#f8fafc}.kcse-preview-iframe{flex:1;border:none;width:100%}
.kcse-buy-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}.kcse-buy-modal{background:#fff;border-radius:8px;padding:24px;max-width:380px;width:100%;text-align:left;box-shadow:0 24px 70px rgba(15,23,42,.24)}.kcse-buy-kicker{font-size:.75rem;font-weight:900;color:#047857;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}.kcse-buy-title{font-size:1.2rem;font-weight:900;color:#111827;margin-bottom:5px}.kcse-buy-sub{font-size:.88rem;color:#475569;margin-bottom:18px}.kcse-buy-price{display:flex;align-items:baseline;gap:8px;color:#f97316;font-size:2rem;font-weight:950;margin-bottom:16px}.kcse-buy-price span{color:#64748b;font-size:.8rem;font-weight:700}.kcse-buy-confirm{width:100%;height:44px;border-radius:8px;border:none;background:#f97316;color:#fff;font-size:.95rem;font-weight:900;cursor:pointer;margin-bottom:10px}.kcse-buy-confirm:hover{background:#c2410c}.kcse-buy-cancel{width:100%;height:40px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;font-size:.9rem;font-weight:800;cursor:pointer;color:#475569}
@media (max-width:760px){.kcse-market{padding:14px}.kcse-hero{grid-template-columns:1fr;padding:18px}.kcse-price-pill{width:100%;min-width:0}.kcse-stats{grid-template-columns:1fr}.kcse-toolbar{grid-template-columns:1fr}.kcse-grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.kcse-card{min-height:360px}.kcse-card-actions{grid-template-columns:1fr}.kcse-preview-bar{align-items:flex-start}.kcse-preview-actions{flex-direction:column;align-items:stretch}.kcse-preview-buy{height:34px}}
`;

type PaperType = "paper" | "paper1" | "paper2" | "paper3" | "answers";
type TypeFilter = "all" | "questions" | "answers";

const PAPER_TYPE_LABELS: Record<PaperType, string> = {
    paper: "Question Paper",
    paper1: "Paper 1",
    paper2: "Paper 2",
    paper3: "Paper 3",
    answers: "Marking Scheme",
};

interface Paper {
    id: string;
    subject: string;
    year: number;
    paperUrl: string;
    fileName?: string;
    answersUrl?: string;
    type: PaperType;
}

export function KCSEPastPapers({ onBack }: { onBack: () => void }) {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [years, setYears] = useState<number[]>([]);
    const [selYear, setSelYear] = useState<number | null>(null);
    const [subjectFilter, setSubjectFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [search, setSearch] = useState("");
    const [preview, setPreview] = useState<{ url: string; title: string; paper: Paper } | null>(null);
    const [buying, setBuying] = useState<Paper | null>(null);

    useEffect(() => {
        getDocs(collection(db, "kcsePapers"))
            .then(snap => {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Paper));
                const sorted = docs.sort((a, b) => b.year - a.year || a.subject.localeCompare(b.subject));
                setPapers(sorted);
                const uniqueYears = [...new Set(sorted.map(p => p.year))];
                setYears(uniqueYears);
                if (uniqueYears.length) setSelYear(uniqueYears[0]);
            }).catch(() => {});
    }, []);

    const subjects = useMemo(() => [...new Set(papers.map(p => p.subject))].sort(), [papers]);
    const visiblePapers = papers.filter(paper => {
        const query = search.trim().toLowerCase();
        const matchesYear = selYear ? paper.year === selYear : true;
        const matchesSubject = subjectFilter === "all" || paper.subject === subjectFilter;
        const matchesType = typeFilter === "all" || (typeFilter === "answers" ? paper.type === "answers" : paper.type !== "answers");
        const matchesSearch = !query || paper.subject.toLowerCase().includes(query) || paperTypeLabel(paper.type).toLowerCase().includes(query) || String(paper.year).includes(query);
        return matchesYear && matchesSubject && matchesType && matchesSearch;
    });
    const questionPapers = visiblePapers.filter(p => p.type !== "answers");
    const answerPapers = visiblePapers.filter(p => p.type === "answers");
    const previewIsPdf = preview ? isPdfPaper(preview.paper) : false;

    return (
        <>
            <style>{css}</style>
            <div className="kcse-root">
                <div className="kcse-topbar"><div className="kcse-topbar-inner"><button className="kcse-back" onClick={onBack} aria-label="Back">←</button><div className="kcse-brand"><div className="kcse-brand-title">KCSE Paper Market</div><div className="kcse-brand-sub">Past papers, marking schemes, and instant downloads</div></div></div></div>
                <main className="kcse-market">
                    <section className="kcse-hero"><div><div className="kcse-eyebrow">High school exam marketplace</div><h1>Buy KCSE past papers from {PRICE_RANGE}</h1><p>Browse papers by year, subject, and paper type. Preview the first page, then buy and download the document for revision.</p><div className="kcse-stats"><div className="kcse-stat"><strong>{papers.length}</strong><span>Available files</span></div><div className="kcse-stat"><strong>{subjects.length || "All"}</strong><span>Subjects covered</span></div><div className="kcse-stat"><strong>{years.length || "Latest"}</strong><span>Exam years</span></div></div></div><div className="kcse-price-pill">{PRICE_RANGE}</div></section>
                    <section className="kcse-toolbar" aria-label="Paper filters"><input className="kcse-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search subject, year, or paper type" /><select className="kcse-select" value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)}><option value="all">All subjects</option>{subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}</select><select className="kcse-select" value={typeFilter} onChange={event => setTypeFilter(event.target.value as TypeFilter)}><option value="all">All documents</option><option value="questions">Question papers</option><option value="answers">Marking schemes</option></select></section>
                    <div className="kcse-years">{years.map(year => <button key={year} className={"kcse-year-btn" + (selYear === year ? " active" : "")} onClick={() => setSelYear(year)}>{year}</button>)}</div>
                    {papers.length === 0 ? <div className="kcse-empty"><strong>No papers available yet</strong>Check back soon for KCSE papers and marking schemes.</div> : visiblePapers.length === 0 ? <div className="kcse-empty"><strong>No matching papers</strong>Try another year, subject, or document type.</div> : <>{questionPapers.length > 0 && <PaperSection title="Question Papers" subtitle="Paper 1, Paper 2, Paper 3, and full question papers" papers={questionPapers} onPreview={setPreview} onBuy={setBuying} />}{answerPapers.length > 0 && <PaperSection title="Marking Schemes" subtitle="Answers and marking guides for fast revision" papers={answerPapers} onPreview={setPreview} onBuy={setBuying} />}</>}
                </main>
            </div>
            {preview && <div className="kcse-preview-overlay"><div className="kcse-preview-bar"><span className="kcse-preview-title">{preview.title}</span><div className="kcse-preview-actions"><button className="kcse-preview-buy" onClick={() => { setBuying(preview.paper); setPreview(null); }}>Download for KSh {paperPrice(preview.paper)}</button><button className="kcse-preview-close" onClick={() => setPreview(null)} aria-label="Close preview">×</button></div></div>{previewIsPdf ? <iframe className="kcse-preview-iframe" src={preview.url + "#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH"} title={preview.title} style={{ pointerEvents: "none" }} /> : <div className="kcse-preview-iframe" style={{ display: "grid", placeItems: "center", background: "#f9fafb", color: "#6b7280", padding: 24 }}>Word documents cannot be previewed here. Use Download after payment to open the file.</div>}</div>}
            {buying && <div className="kcse-buy-overlay" onClick={() => setBuying(null)}><div className="kcse-buy-modal" onClick={event => event.stopPropagation()}><div className="kcse-buy-kicker">Secure document checkout</div><div className="kcse-buy-title">{buying.subject} {buying.year}</div><div className="kcse-buy-sub">{paperTypeLabel(buying.type)} · PDF download</div><div className="kcse-buy-price">KSh {paperPrice(buying)} <span>one-time download</span></div><button className="kcse-buy-confirm" onClick={() => { alert("M-Pesa payment coming soon!"); setBuying(null); }}>Pay via M-Pesa</button><button className="kcse-buy-cancel" onClick={() => setBuying(null)}>Cancel</button></div></div>}
        </>
    );
}

function PaperSection({ title, subtitle, papers, onPreview, onBuy }: { title: string; subtitle: string; papers: Paper[]; onPreview: (paper: { url: string; title: string; paper: Paper }) => void; onBuy: (paper: Paper) => void; }) {
    return <section className="kcse-section"><div className="kcse-section-head"><div><h2 className="kcse-section-title">{title}</h2><div className="kcse-section-sub">{subtitle}</div></div><div className="kcse-count">{papers.length} listed</div></div><div className="kcse-grid">{papers.map(paper => <PaperCard key={paper.id} paper={paper} onPreview={onPreview} onBuy={onBuy} />)}</div></section>;
}

function PaperCard({ paper, onPreview, onBuy }: { paper: Paper; onPreview: (paper: { url: string; title: string; paper: Paper }) => void; onBuy: (paper: Paper) => void; }) {
    const isAnswers = paper.type === "answers";
    const title = paper.subject + " " + paper.year + " " + paperTypeLabel(paper.type);
    return <article className="kcse-card"><div className="kcse-card-thumb">{isPdfPaper(paper) ? <iframe src={paper.paperUrl + "#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH"} title={title + " preview"} /> : <div className="kcse-doc-placeholder">DOCX</div>}<span className="kcse-card-badge">{isAnswers ? "Answers" : paperTypeLabel(paper.type)}</span><span className="kcse-card-price">KSh {paperPrice(paper)}</span></div><div className="kcse-card-body"><h3 className="kcse-card-label">{paper.subject}</h3><div className="kcse-card-meta"><span className="kcse-tag">{paper.year}</span><span className="kcse-tag">{paperTypeLabel(paper.type)}</span><span className="kcse-tag">PDF</span></div><p className="kcse-card-desc">Preview the first page, then buy and download this {isAnswers ? "marking scheme" : "exam paper"} for revision.</p><div className="kcse-card-actions"><button className="kcse-btn-preview" onClick={() => onPreview({ url: paper.paperUrl, title, paper })}>{isPdfPaper(paper) ? "Preview" : "View"}</button><button className="kcse-btn-buy" onClick={() => onBuy(paper)}>Buy KSh {paperPrice(paper)}</button></div></div></article>;
}

function isPdfPaper(paper: Paper) {
    return (paper.fileName || paper.paperUrl).toLowerCase().includes(".pdf");
}

function paperTypeLabel(type: PaperType) {
    return PAPER_TYPE_LABELS[type] ?? "Question Paper";
}

function paperPrice(paper: Paper) {
    if (paper.type === "answers") return 20;
    if (paper.type === "paper3") return 50;
    return 30;
}
