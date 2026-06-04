import { type CSSProperties, useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.ts";
import { type RevisionQuestion, type Difficulty, SUBJECTS, YEARS, DIFFICULTY_COLORS } from "../KCSEPastPapers/types.ts";

const s: Record<string, CSSProperties> = {
  card: { background:"#fff", borderRadius:10, padding:"20px 24px", border:"1px solid #e8eaf0", marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  h2:  { color:"#1a1a2e", fontSize:"1.05rem", fontWeight:700, marginTop:0, marginBottom:14, paddingBottom:8, borderBottom:"2px solid #f0f0f8" },
  row: { display:"flex", gap:10, flexWrap:"wrap" as const, marginBottom:12, alignItems:"flex-end" },
  lbl: { fontSize:"0.75rem", color:"#888", marginBottom:4 },
  input:  { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:"0.85rem", fontFamily:"inherit", outline:"none", width:"100%" },
  select: { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:"0.85rem", fontFamily:"inherit", outline:"none", background:"#fff" },
  btn: { padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer", fontSize:"0.85rem", fontWeight:600, fontFamily:"inherit" },
  th: { background:"#f5f5ff", color:"#4361ee", padding:"10px 14px", textAlign:"left" as const, borderBottom:"2px solid #e0e0f0", fontWeight:600, fontSize:"0.82rem" },
  td: { padding:"10px 14px", borderBottom:"1px solid #f0f0f8", color:"#333", verticalAlign:"top" as const, fontSize:"0.85rem" },
};

const DIFF_OPTS: Difficulty[] = ["easy","medium","hard"];
const EMPTY_FORM = { subject:SUBJECTS[0], year:2024, topic:"", difficulty:"easy" as Difficulty, question:"", options:["","","",""], answer:0, explanation:"" };

export function AdminKCSE() {
  const [questions, setQuestions] = useState<RevisionQuestion[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM, options:["","","",""] as string[] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState({ subject:"all", difficulty:"all", search:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const [tab, setTab] = useState<"add"|"manage">("add");

  const load = () =>
    getDocs(collection(db,"kcseRevision"))
      .then(snap => setQuestions(snap.docs.map(d => ({ id:d.id, ...d.data() } as RevisionQuestion)).sort((a,b)=>a.subject.localeCompare(b.subject)||a.year-b.year)))
      .catch(()=>{});

  useEffect(() => { load(); }, []);

  const validate = () => {
    if (!form.topic.trim()) return "Topic is required.";
    if (!form.question.trim()) return "Question is required.";
    if (form.options.some(o => !o.trim())) return "All 4 options are required.";
    return "";
  };

  const save = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setSaving(true); setErr(""); setSuccess("");
    const payload = { subject:form.subject, year:form.year, topic:form.topic.trim(), difficulty:form.difficulty, question:form.question.trim(), options:form.options.map(o=>o.trim()), answer:form.answer, explanation:form.explanation.trim(), uploadedAt:serverTimestamp() };
    try {
      if (editId) {
        await updateDoc(doc(db,"kcseRevision",editId), payload);
        setSuccess("Question updated!"); setEditId(null);
      } else {
        await addDoc(collection(db,"kcseRevision"), payload);
        setSuccess("Question added!");
      }
      setForm({ ...EMPTY_FORM, options:["","","",""] });
      load();
    } catch { setErr("Save failed. Try again."); }
    setSaving(false);
  };

  const del = async (q: RevisionQuestion) => {
    if (!confirm(`Delete: "${q.question.slice(0,60)}..."?`)) return;
    await deleteDoc(doc(db,"kcseRevision",q.id));
    setQuestions(prev => prev.filter(x => x.id !== q.id));
  };

  const startEdit = (q: RevisionQuestion) => {
    setForm({ subject:q.subject, year:q.year, topic:q.topic, difficulty:q.difficulty, question:q.question, options:[...q.options], answer:q.answer, explanation:q.explanation||"" });
    setEditId(q.id); setTab("add"); window.scrollTo(0,0);
  };

  const filtered = questions.filter(q =>
    (filter.subject==="all"||q.subject===filter.subject) &&
    (filter.difficulty==="all"||q.difficulty===filter.difficulty) &&
    (!filter.search||q.question.toLowerCase().includes(filter.search.toLowerCase())||q.topic.toLowerCase().includes(filter.search.toLowerCase()))
  );

  return (
    <div>
      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:"2px solid #e0e0f0",marginBottom:20}}>
        {(["add","manage"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{...s.btn,borderRadius:0,background:"none",borderBottom:`2px solid ${tab===t?"#4361ee":"transparent"}`,marginBottom:-2,color:tab===t?"#4361ee":"#6b7280",fontWeight:tab===t?700:500,padding:"10px 24px"}}>
            {t==="add" ? (editId?"✏️ Edit Question":"➕ Add Question") : `📋 Manage (${questions.length})`}
          </button>
        ))}
      </div>

      {tab === "add" && <AddForm form={form} setForm={setForm} saving={saving} err={err} success={success} onSave={save} editId={editId} onCancel={()=>{setEditId(null);setForm({...EMPTY_FORM,options:["","","",""]});}}/>}
      {tab === "manage" && <ManageTable questions={filtered} filter={filter} setFilter={setFilter} onEdit={startEdit} onDelete={del}/>}
    </div>
  );
}

// ── Add/Edit form ─────────────────────────────────────────────────────────────
function AddForm({ form, setForm, saving, err, success, onSave, editId, onCancel }: any) {
  const setOpt = (i: number, v: string) => setForm((f: any) => { const opts=[...f.options]; opts[i]=v; return {...f,options:opts}; });

  return (
    <div style={s.card}>
      <h2 style={s.h2}>{editId ? "Edit Revision Question" : "Add Revision Question"}</h2>

      {/* Row 1: Subject (left) | Year + Difficulty + Topic (right) */}
      <div className="adm-form-row1">
        <div>
          <div style={s.lbl}>Subject</div>
          <select style={{...s.select,width:"100%"}} value={form.subject} onChange={e=>setForm((f:any)=>({...f,subject:e.target.value}))}>
            {SUBJECTS.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="adm-form-row2">
          <div>
            <div style={s.lbl}>Year</div>
            <select style={s.select} value={form.year} onChange={e=>setForm((f:any)=>({...f,year:+e.target.value}))}>
              {YEARS.map(y=><option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={s.lbl}>Difficulty</div>
            <select style={s.select} value={form.difficulty} onChange={e=>setForm((f:any)=>({...f,difficulty:e.target.value}))}>
              {(["easy","medium","hard"] as const).map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <div style={s.lbl}>Topic</div>
            <input style={s.input} placeholder="e.g. Quadratic Equations" value={form.topic} onChange={e=>setForm((f:any)=>({...f,topic:e.target.value}))}/>
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{marginBottom:14}}>
        <div style={s.lbl}>Question</div>
        <textarea style={{...s.input,minHeight:90,resize:"vertical" as const,display:"block"}} placeholder="Type the full question here..." value={form.question} onChange={e=>setForm((f:any)=>({...f,question:e.target.value}))}/>
      </div>

      {/* Options */}
      <div style={{marginBottom:14}}>
        <div style={s.lbl}>Options (select the correct answer)</div>
        {form.options.map((opt: string, i: number) => (
          <div key={i} className="adm-opt-row">
            <input type="radio" name="correct" checked={form.answer===i} onChange={()=>setForm((f:any)=>({...f,answer:i}))} style={{accentColor:"#16a34a",width:16,height:16}}/>
            <span style={{fontWeight:700,fontSize:"0.82rem",color:form.answer===i?"#16a34a":"#6b7280"}}>{String.fromCharCode(65+i)}</span>
            <input className={`adm-opt-input${form.answer===i?" correct":""}`} placeholder={`Option ${String.fromCharCode(65+i)}`} value={opt} onChange={e=>setOpt(i,e.target.value)}/>
            {form.answer===i ? <span className="adm-correct-badge">✓ Correct</span> : <span/>}
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div style={{marginBottom:18}}>
        <div style={s.lbl}>Explanation (optional)</div>
        <textarea style={{...s.input,minHeight:64,resize:"vertical" as const,display:"block"}} placeholder="Brief explanation of the correct answer..." value={form.explanation} onChange={e=>setForm((f:any)=>({...f,explanation:e.target.value}))}/>
      </div>

      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button style={{...s.btn,background:"#16a34a",color:"#fff",padding:"11px 26px",fontSize:"0.9rem"}} onClick={onSave} disabled={saving}>
          {saving?"Saving…":editId?"Update Question":"Add Question"}
        </button>
        {editId&&<button style={{...s.btn,background:"#f3f4f6",color:"#6b7280"}} onClick={onCancel}>Cancel</button>}
        {err&&<span style={{color:"#991b1b",fontSize:"0.82rem"}}>{err}</span>}
        {success&&<span style={{color:"#16a34a",fontSize:"0.82rem",fontWeight:600}}>{success}</span>}
      </div>
    </div>
  );
}

// ── Manage table ──────────────────────────────────────────────────────────────
function ManageTable({ questions, filter, setFilter, onEdit, onDelete }: any) {
  return (
    <div style={s.card}>
      <h2 style={s.h2}>Revision Questions ({questions.length})</h2>

      {/* Filters */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <input style={{...s.input,maxWidth:220}} placeholder="Search question or topic…" value={filter.search} onChange={e=>setFilter((f:any)=>({...f,search:e.target.value}))}/>
        <select style={s.select} value={filter.subject} onChange={e=>setFilter((f:any)=>({...f,subject:e.target.value}))}>
          <option value="all">All Subjects</option>
          {SUBJECTS.map(s=><option key={s}>{s}</option>)}
        </select>
        <select style={s.select} value={filter.difficulty} onChange={e=>setFilter((f:any)=>({...f,difficulty:e.target.value}))}>
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem"}}>
          <thead>
            <tr>{["Subject","Year","Topic","Difficulty","Question","Answer","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {questions.length === 0 && (
              <tr><td colSpan={7} style={{...s.td,textAlign:"center",color:"#aaa",padding:30}}>No questions found. Add some above.</td></tr>
            )}
            {questions.map((q: RevisionQuestion, i: number) => (
              <tr key={q.id} style={{background:i%2===0?"#fff":"#fafafe"}}>
                <td style={s.td}>{q.subject}</td>
                <td style={s.td}>{q.year}</td>
                <td style={s.td}>{q.topic}</td>
                <td style={s.td}>
                  <span style={{padding:"2px 8px",borderRadius:10,fontSize:"0.72rem",fontWeight:700,background:q.difficulty==="easy"?"#dcfce7":q.difficulty==="medium"?"#fffbeb":"#fee2e2",color:DIFFICULTY_COLORS[q.difficulty]}}>
                    {q.difficulty}
                  </span>
                </td>
                <td style={{...s.td,maxWidth:280}}>{q.question.length>80?q.question.slice(0,80)+"…":q.question}</td>
                <td style={{...s.td,color:"#16a34a",fontWeight:600}}>{q.options[q.answer]?.slice(0,40)}</td>
                <td style={s.td}>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...s.btn,background:"#eff6ff",color:"#2563eb",padding:"5px 10px"}} onClick={()=>onEdit(q)}>Edit</button>
                    <button style={{...s.btn,background:"#fee2e2",color:"#991b1b",padding:"5px 10px"}} onClick={()=>onDelete(q)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
