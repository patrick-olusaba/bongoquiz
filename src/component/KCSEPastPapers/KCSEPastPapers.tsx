// import { useEffect, useMemo, useState } from "react";
import {JSX, useEffect, useMemo, useState} from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.ts";
import {
  Search, BookOpen, Dna, FlaskConical, Globe, CheckCircle2,
  ChevronRight, Home, LayoutGrid, Trophy, User, ArrowLeft,
  // Target,
  // Zap,
  BarChart2, XCircle, FileText, ClipboardList,
  RotateCcw, Play,
  // Bell,
  Download, Smartphone, ShieldCheck,
  ArrowRight, Star,
  // GraduationCap,
  // Bot,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type RevisionQuestion, type Difficulty,
  // SUBJECTS,
  DIFFICULTY_COLORS } from "./types.ts";
import "./kcse.css";

type View = "home" | "subject" | "quiz" | "results";

const SUBJ_COLOR: Record<string, string> = {
  Mathematics:"#2563eb", English:"#7c3aed", Biology:"#d97706",
  Chemistry:"#0891b2", Physics:"#9333ea", Geography:"#059669",
  CRE:"#16a34a", Kiswahili:"#dc2626", History:"#9333ea",
  "Business Studies":"#0284c7", Agriculture:"#65a30d",
  "Computer Studies":"#6366f1", "Home Science":"#ec4899", IRE:"#16a34a",
};
const SUBJ_BG: Record<string, string> = {
  Mathematics:"#eff6ff", English:"#f5f3ff", Biology:"#fffbeb",
  Chemistry:"#ecfeff", Physics:"#faf5ff", Geography:"#ecfdf5",
  CRE:"#dcfce7", Kiswahili:"#fef2f2", History:"#faf5ff",
  "Business Studies":"#e0f2fe", Agriculture:"#f7fee7",
  "Computer Studies":"#eef2ff", "Home Science":"#fdf2f8", IRE:"#dcfce7",
};

function SubjIcon({ subject, size = 22 }: { subject: string; size?: number }) {
  const c = SUBJ_COLOR[subject] || "#00a651";
  if (subject === "Biology") return <Dna size={size} color={c}/>;
  if (subject === "Chemistry") return <FlaskConical size={size} color={c}/>;
  if (subject === "Geography") return <Globe size={size} color={c}/>;
  if (subject === "History") return <BarChart2 size={size} color={c}/>;
  if (subject === "Mathematics") return <span style={{color:c,fontWeight:900,fontSize:size*0.7}}>x²</span>;
  return <BookOpen size={size} color={c}/>;
}
//
// const CATEGORIES = [
//   { name:"Revision Papers", desc:"KCSE-style revision papers with marking schemes.", icon:<FileText size={28}/>, link:"Browse Papers →" },
//   { name:"Topic Packs", desc:"In-depth revision packs for specific topics.", icon:<ClipboardList size={28}/>, link:"Browse Packs →" },
//   { name:"Mock Exams", desc:"School, County & National mock examinations.", icon:<ClipboardList size={28}/>, link:"Browse Mocks →" },
//   { name:"Prediction Papers", desc:"Handpicked prediction papers for 2026.", icon:<Target size={28}/>, link:"View Predictions →" },
//   { name:"AI Paper Generator", desc:"Generate unique papers on any topic instantly.", icon:<Bot size={28}/>, link:"Generate Paper →" },
// ];

const POPULAR_SUBJECTS = ["Mathematics","Biology","Chemistry","Physics","English","Kiswahili","Geography","History"];

export function KCSEPastPapers({ onBack }: { onBack: () => void }) {
  const [questions, setQuestions] = useState<RevisionQuestion[]>([]);
  const [view, setView] = useState<View>("home");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [selYear, setSelYear] = useState<number | "all">("all");
  const [quizQs, setQuizQs] = useState<RevisionQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerOn, setTimerOn] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "kcseRevision"))
      .then(snap => setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as RevisionQuestion))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!timerOn) return;
    if (timeLeft === 0) { handleAnswer(null); return; }
    const t = setTimeout(() => setTimeLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [timerOn, timeLeft]);

  const subjects = useMemo(() => [...new Set(questions.map(q => q.subject))].sort(), [questions]);
  const years = useMemo(() => [...new Set(questions.filter(q => q.subject === selectedSubject).map(q => q.year))].sort((a,b)=>b-a), [questions, selectedSubject]);
  const subjectCount = (s: string) => questions.filter(q => q.subject === s).length;

  const startQuiz = () => {
    let pool = questions.filter(q => q.subject === selectedSubject);
    if (difficulty !== "all") pool = pool.filter(q => q.difficulty === difficulty);
    if (selYear !== "all") pool = pool.filter(q => q.year === selYear);
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 20);
    if (!pool.length) return;
    setQuizQs(pool); setQIndex(0); setScore(0); setChosen(null);
    setAnswers([]); setTimeLeft(30); setTimerOn(true); setView("quiz");
  };

  const handleAnswer = (idx: number | null) => {
    if (chosen !== null) return;
    setTimerOn(false); setChosen(idx);
    if (idx === quizQs[qIndex]?.answer) setScore(s => s + 1);
    setAnswers(prev => [...prev, idx]);
  };

  const nextQ = () => {
    if (qIndex + 1 >= quizQs.length) { setView("results"); return; }
    setQIndex(i => i + 1); setChosen(null); setTimeLeft(30); setTimerOn(true);
  };

  const goHome = () => { setView("home"); setSelectedSubject(null); setTimerOn(false); };
  const goSubject = (s: string) => { setSelectedSubject(s); setDifficulty("all"); setSelYear("all"); setView("subject"); };

  return (
    <div className="kcse-root">
      {/* Navbar */}
      <nav className="bq-nav">
        <div className="bq-nav-inner">
          <div className="bq-logo" onClick={goHome}>
            <div className="bq-logo-icon"><BookOpen size={20}/></div>
            <span className="bq-logo-name">Bongo<span>Quiz</span></span>
          </div>
          <div className="bq-nav-links">
            {["Home","Revision Papers","Topic Packs","Mock Exams","Predictions","AI Paper Generator","Pricing","Blog"].map(l=>(
              <span key={l} className="bq-nav-link">{l}{["Revision Papers","Topic Packs","Mock Exams","Predictions"].includes(l)&&<ChevronDown size={12}/>}</span>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:"auto"}}>
            <div className="bq-search"><Search size={15} color="#9ca3af"/><input placeholder="Search papers, topics..."/><button className="bq-search-btn"><Search size={14}/></button></div>
            <button className="bq-login-btn">Login</button>
            <button className="bq-signup-btn">Sign Up</button>
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === "home" && <HomeView key="home" subjects={subjects} questions={questions} subjectCount={subjectCount} onSelectSubject={goSubject} onBack={onBack}/>}
        {view === "subject" && selectedSubject && <SubjectView key="sub" subject={selectedSubject} questions={questions} difficulty={difficulty} setDifficulty={setDifficulty} selYear={selYear} setSelYear={setSelYear} years={years} onStart={startQuiz} onBack={goHome}/>}
        {view === "quiz" && <QuizView key="quiz" questions={quizQs} qIndex={qIndex} chosen={chosen} score={score} timeLeft={timeLeft} onAnswer={handleAnswer} onNext={nextQ} onBack={goHome}/>}
        {view === "results" && <ResultsView key="res" questions={quizQs} answers={answers} score={score} onRetry={startQuiz} onHome={goHome}/>}
      </AnimatePresence>

      <div className="bq-disclaimer">Disclaimer: Revision and practice materials prepared by BongoQuiz and are not official KNEC examinations.</div>

      <nav className="kcse-bottom-nav">
        {([["home","Home",<Home size={22}/>],["subject","Subjects",<LayoutGrid size={22}/>],["results","Top",<Trophy size={22}/>],["account","Account",<User size={22}/>]] as [string,string,JSX.Element][]).map(([v,l,ic])=>(
          <div key={v} className={`kcse-bottom-nav-item ${view===v?"active":""}`} onClick={()=>v==="home"&&goHome()}>{ic}<span>{l}</span></div>
        ))}
      </nav>
    </div>
  );
}

function HomeView({ subjects, questions, subjectCount, onSelectSubject, onBack }: any) {
  const [search, setSearch] = useState("");
  const displaySubjects = (subjects.length ? subjects : POPULAR_SUBJECTS).slice(0, 6);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      {/* Hero */}
      <div className="hv-hero">
        <div className="hv-hero-inner">
          <div>
            <h1 style={{fontSize:"2.6rem",fontWeight:800,lineHeight:1.15,marginBottom:12,letterSpacing:"-0.02em"}}>
              Practice & Master<br/>KCSE Revision<br/><span style={{color:"var(--primary)"}}>Instantly</span>
            </h1>
            <p style={{color:"var(--text-muted)",fontSize:"1rem",marginBottom:28,maxWidth:440,lineHeight:1.6}}>
              Access top quality KCSE revision questions with instant feedback. Practice by subject, topic and difficulty and track your progress.
            </p>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:36}}>
              <button className="bq-btn-green" style={{display:"flex",alignItems:"center",gap:8,padding:"14px 28px",fontSize:"1rem"}} onClick={() => document.getElementById("subjects-section")?.scrollIntoView({behavior:"smooth"})}>
                <Play size={18}/> Browse Subjects
              </button>
              <button className="bq-btn-outline" style={{display:"flex",alignItems:"center",gap:8,padding:"13px 28px",fontSize:"1rem"}}>
                <BookOpen size={18}/> View Packages
              </button>
            </div>
            {/* Feature pills */}
            <div style={{display:"flex",gap:28,flexWrap:"wrap"}}>
              {[[<Download size={18}/>, "Instant Practice"],[<Smartphone size={18}/>, "Free to Start"],[<ShieldCheck size={18}/>, "KCSE Aligned"],[<ClipboardList size={18}/>, "By Subject & Year"]].map(([ic,t],i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:"0.82rem",fontWeight:700,color:"var(--text-muted)"}}>
                  <span style={{color:"var(--primary)"}}>{ic as JSX.Element}</span>{t as string}
                </div>
              ))}
            </div>
          </div>

          {/* Hero image */}
          <div style={{flexShrink:0,position:"relative"}}>
            <img src="/src/assets/KCSEPastPaper/hero-image.png" alt="Student studying with BongoQuiz" className="hv-hero-img"/>
          </div>
        </div>
      </div>

      {/* Features bar */}
      <div className="hv-feats">
        <div className="hv-feats-inner">
          {[[<Download size={20}/>, "Instant Practice","Start right after signup"],[<Smartphone size={20}/>, "Free Access","Core questions are free"],[<ShieldCheck size={20}/>, "KCSE Aligned","Matched to KNEC syllabus"],[<ClipboardList size={20}/>, "By Subject & Year","Organized for easy navigation"]].map(([ic,t,d],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontWeight:700,fontSize:"0.875rem"}}>
              <span style={{color:"var(--primary)"}}>{ic as JSX.Element}</span>
              <div><div>{t as string}</div><div style={{fontSize:"0.72rem",color:"var(--text-muted)",fontWeight:500}}>{d as string}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="hv-search">
        <div style={{display:"flex",background:"white",border:"1px solid var(--border)",borderRadius:10,padding:8,boxShadow:"0 8px 24px rgba(0,0,0,0.04)"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",padding:"0 16px",gap:12}}>
            <Search size={20} color="#9ca3af"/>
            <input placeholder="Search by subject, topic, or year..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{flex:1,border:"none",outline:"none",fontFamily:"inherit",fontSize:"1rem",padding:"10px 0"}}/>
          </div>
          <button className="bq-btn-green" style={{padding:"12px 32px",borderRadius:7,fontSize:"1rem"}}>Search</button>
        </div>
      </div>

      {/* Popular Subjects */}
      <div id="subjects-section" className="hv-subjects">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:"1.2rem"}}>Popular Subjects</div>
          <span style={{color:"var(--primary)",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>View all subjects <ArrowRight size={16}/></span>
        </div>
        <div className="hv-subjects-grid">
          {displaySubjects.filter((s:string)=>s.toLowerCase().includes(search.toLowerCase())).map((s:string)=>{
            const color=SUBJ_COLOR[s]||"#00a651", bg=SUBJ_BG[s]||"#f3f4f6", count=subjectCount(s);
            return (
              <motion.div key={s} whileHover={{y:-4}} onClick={()=>onSelectSubject(s)}
                style={{border:"1px solid var(--border)",borderRadius:12,padding:"20px 12px",textAlign:"center",cursor:"pointer",background:"white",transition:"box-shadow 0.2s"}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                  <SubjIcon subject={s} size={26}/>
                </div>
                <div style={{fontWeight:800,fontSize:"0.9rem",marginBottom:4}}>{s}</div>
                <div style={{fontSize:"0.72rem",color:"var(--text-muted)",marginBottom:6}}>{count} Questions</div>
                <div style={{color,fontSize:"0.75rem",fontWeight:700}}>From KSh 50</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* How it Works */}
      <div className="hv-how">
        <h2 style={{fontSize:"1.6rem",fontWeight:800,marginBottom:8}}>How it Works</h2>
        <div style={{width:40,height:4,background:"var(--primary)",margin:"0 auto 48px",borderRadius:2}}/>
        <div className="hv-steps">
          <div className="hv-step-connector"/>
          {[[<Search size={32}/>, "Browse","Search by subject, topic and year."],[<Smartphone size={32}/>, "Start Practice","Pick difficulty and begin instantly."],[<Download size={32}/>, "Get Feedback","Instant correct/wrong with explanation."],[<BookOpen size={32}/>, "Study & Excel","Review results and track progress."]].map(([ic,t,d],i)=>(
            <div key={i} style={{position:"relative",zIndex:1}}>
              <div style={{width:32,height:32,background:"var(--primary)",color:"white",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,margin:"0 auto 16px",fontSize:"0.9rem",border:"4px solid var(--bg-light)",boxShadow:"0 0 0 1px #d1d5db"}}>{i+1}</div>
              <div style={{width:80,height:80,background:"white",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 8px 20px rgba(0,0,0,0.06)",color:"var(--primary)"}}>{ic as JSX.Element}</div>
              <div style={{fontWeight:800,fontSize:"1.1rem",marginBottom:6}}>{t as string}</div>
              <div style={{fontSize:"0.875rem",color:"var(--text-muted)",maxWidth:180,margin:"0 auto",lineHeight:1.5}}>{d as string}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="hv-stats">
        <div className="hv-stats-inner">
          {[[<CheckCircle2 size={28}/>, "10,000+","Happy Students"],[<FileText size={28}/>, "5,000+","Practice Questions"],[<Star size={28}/>, "4.8/5","Student Rating"],[<ShieldCheck size={28}/>, "100%","KCSE Aligned"]].map(([ic,v,l],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:16}}>
              <span style={{color:"var(--primary)"}}>{ic as JSX.Element}</span>
              <div><div style={{fontWeight:800,fontSize:"1.3rem"}}>{v as string}</div><div style={{fontSize:"0.85rem",color:"var(--text-muted)",fontWeight:600}}>{l as string}</div></div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onBack} style={{display:"block",margin:"0 auto 40px",background:"none",border:"1px solid var(--border)",padding:"10px 24px",borderRadius:8,fontWeight:600,cursor:"pointer",color:"var(--text-muted)"}}>← Back to App</button>
    </motion.div>
  );
}

function SubjectView({ subject, questions, difficulty, setDifficulty, selYear, setSelYear, years, onStart, onBack }: any) {
  const pool = questions.filter((q: RevisionQuestion) =>
    q.subject === subject &&
    (difficulty === "all" || q.difficulty === difficulty) &&
    (selYear === "all" || q.year === selYear)
  );
  const color = SUBJ_COLOR[subject] || "#00a651";

  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} style={{maxWidth:700,margin:"0 auto",padding:"24px 20px 100px"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontWeight:600,marginBottom:20}}>
        <ArrowLeft size={16}/> Back
      </button>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:SUBJ_BG[subject]||"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center"}}><SubjIcon subject={subject} size={26}/></div>
        <div><h1 style={{fontSize:"1.4rem",fontWeight:800,margin:0}}>{subject} Revision</h1><div style={{color:"var(--text-muted)",fontSize:"0.85rem"}}>{questions.filter((q:RevisionQuestion)=>q.subject===subject).length} questions available</div></div>
      </div>

      <div style={{marginBottom:16}}>
        <div style={{fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:8,textTransform:"uppercase"}}>Difficulty</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {(["all","easy","medium","hard"] as const).map(d=>(
            <button key={d} onClick={()=>setDifficulty(d)} style={{padding:"7px 18px",borderRadius:20,border:"1.5px solid",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",borderColor:difficulty===d?(d==="all"?color:DIFFICULTY_COLORS[d]):"var(--border)",background:difficulty===d?(d==="all"?color:DIFFICULTY_COLORS[d]):"white",color:difficulty===d?"white":"var(--text-muted)"}}>
              {d==="all"?"All":d.charAt(0).toUpperCase()+d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{marginBottom:24}}>
        <div style={{fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:8,textTransform:"uppercase"}}>Year</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setSelYear("all")} style={{padding:"7px 18px",borderRadius:20,border:"1.5px solid",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",borderColor:selYear==="all"?color:"var(--border)",background:selYear==="all"?color:"white",color:selYear==="all"?"white":"var(--text-muted)"}}>All Years</button>
          {years.map((y:number)=>(
            <button key={y} onClick={()=>setSelYear(y)} style={{padding:"7px 18px",borderRadius:20,border:"1.5px solid",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",borderColor:selYear===y?color:"var(--border)",background:selYear===y?color:"white",color:selYear===y?"white":"var(--text-muted)"}}>{y}</button>
          ))}
        </div>
      </div>

      <div style={{background:"var(--primary-light)",border:"1px solid #bbf7d0",borderRadius:12,padding:20,textAlign:"center"}}>
        <div style={{fontSize:"2rem",fontWeight:800,color:"var(--primary)"}}>{Math.min(pool.length,20)}</div>
        <div style={{fontSize:"0.85rem",color:"var(--text-muted)",marginBottom:16}}>questions (max 20 per session)</div>
        <button onClick={onStart} disabled={!pool.length} style={{background:pool.length?"var(--primary)":"#d1d5db",color:"white",border:"none",padding:"13px 36px",borderRadius:10,fontWeight:800,fontSize:"1rem",cursor:pool.length?"pointer":"not-allowed",display:"inline-flex",alignItems:"center",gap:8}}>
          <Play size={18}/> Start Practice
        </button>
      </div>
    </motion.div>
  );
}

function QuizView({ questions, qIndex, chosen, score, timeLeft, onAnswer, onNext, onBack }: any) {
  const q = questions[qIndex];
  if (!q) return null;
  const pct = ((qIndex + (chosen!==null?1:0)) / questions.length) * 100;
  const timerColor = timeLeft>15?"var(--primary)":timeLeft>7?"#d97706":"#dc2626";

  return (
    <motion.div initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0}} style={{maxWidth:700,margin:"0 auto",padding:"16px 16px 100px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,gap:12}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.75rem",fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>
            <span>Q{qIndex+1}/{questions.length}</span><span>Score: {score}</span>
          </div>
          <div style={{background:"#e5e7eb",borderRadius:4,height:6}}><div style={{background:"var(--primary)",height:"100%",width:`${pct}%`,borderRadius:4,transition:"width 0.4s"}}/></div>
        </div>
        <div style={{width:44,height:44,position:"relative",flexShrink:0}}>
          <svg width={44} height={44} style={{transform:"rotate(-90deg)"}}>
            <circle cx={22} cy={22} r={18} fill="none" stroke="#e5e7eb" strokeWidth={4}/>
            <circle cx={22} cy={22} r={18} fill="none" stroke={timerColor} strokeWidth={4} strokeDasharray={`${2*Math.PI*18}`} strokeDashoffset={`${2*Math.PI*18*(1-timeLeft/30)}`} style={{transition:"stroke-dashoffset 1s linear"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.78rem",fontWeight:800,color:timerColor}}>{timeLeft}</div>
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[q.subject,q.topic,q.difficulty,String(q.year)].map((t,i)=><span key={i} style={{background:"var(--bg-light)",color:"var(--text-muted)",padding:"3px 10px",borderRadius:20,fontSize:"0.72rem",fontWeight:700}}>{t}</span>)}
      </div>

      <div style={{background:"white",border:"1px solid var(--border)",borderRadius:12,padding:20,marginBottom:16,fontSize:"1rem",fontWeight:600,lineHeight:1.6}}>{q.question}</div>

      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {q.options.map((opt: string, i: number) => {
          const isCorrect = i===q.answer, isChosen = i===chosen, revealed = chosen!==null;
          let bg="white",border="var(--border)",color="var(--text-main)";
          if(revealed&&isCorrect){bg="#dcfce7";border="#16a34a";color="#15803d";}
          else if(revealed&&isChosen&&!isCorrect){bg="#fee2e2";border="#dc2626";color="#b91c1c";}
          return (
            <button key={i} onClick={()=>!revealed&&onAnswer(i)} style={{background:bg,border:`1.5px solid ${border}`,borderRadius:10,padding:"13px 16px",textAlign:"left",fontWeight:600,fontSize:"0.92rem",cursor:revealed?"default":"pointer",display:"flex",alignItems:"center",gap:12,color,fontFamily:"inherit",transition:"all 0.2s"}}>
              <span style={{width:28,height:28,borderRadius:"50%",background:revealed&&isCorrect?"#16a34a":revealed&&isChosen&&!isCorrect?"#dc2626":"var(--bg-light)",color:revealed&&(isCorrect||isChosen)?"white":"var(--text-muted)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"0.78rem",flexShrink:0}}>
                {revealed&&isCorrect?<CheckCircle2 size={14}/>:revealed&&isChosen?<XCircle size={14}/>:String.fromCharCode(65+i)}
              </span>{opt}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {chosen!==null&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginTop:14}}>
            {q.explanation&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"11px 14px",fontSize:"0.85rem",color:"#15803d",marginBottom:10}}><strong>Explanation:</strong> {q.explanation}</div>}
            <button onClick={onNext} style={{width:"100%",background:"var(--primary)",color:"white",border:"none",padding:14,borderRadius:10,fontWeight:800,fontSize:"1rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {qIndex+1<questions.length?<>Next <ChevronRight size={18}/></>:<>See Results <Trophy size={18}/></>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultsView({ questions, answers, score, onRetry, onHome }: any) {
  const pct = Math.round((score/questions.length)*100);
  const [review, setReview] = useState(false);
  const grade = pct>=80?"Excellent! 🏆":pct>=60?"Good job! 🎯":pct>=40?"Keep going! 📚":"Needs work 💪";
  return (
    <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} exit={{opacity:0}} style={{maxWidth:600,margin:"0 auto",padding:"24px 16px 100px"}}>
      <div style={{background:"linear-gradient(135deg,#f0faf5,#e8f8ef)",border:"1px solid #bbf7d0",borderRadius:16,padding:"32px 20px",textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:"3rem",marginBottom:8}}>{pct>=80?"🏆":pct>=60?"🎯":"📚"}</div>
        <div style={{fontSize:"3rem",fontWeight:900,color:"var(--primary)",lineHeight:1}}>{score}<span style={{fontSize:"1.4rem",color:"var(--text-muted)"}}>/{questions.length}</span></div>
        <div style={{fontWeight:700,fontSize:"1.1rem",marginTop:4}}>{grade}</div>
        <div style={{color:"var(--primary)",fontWeight:800,fontSize:"1.3rem"}}>{pct}%</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        <button onClick={onRetry} style={{background:"var(--primary)",color:"white",border:"none",padding:14,borderRadius:10,fontWeight:800,fontSize:"1rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><RotateCcw size={18}/>Try Again</button>
        <button onClick={()=>setReview(!review)} style={{background:"white",border:"1px solid var(--border)",padding:13,borderRadius:10,fontWeight:700,fontSize:"0.95rem",cursor:"pointer"}}>{review?"Hide":"Review"} Answers</button>
        <button onClick={onHome} style={{background:"var(--bg-light)",border:"none",padding:13,borderRadius:10,fontWeight:700,fontSize:"0.95rem",cursor:"pointer",color:"var(--text-muted)"}}>Back to Home</button>
      </div>
      {review&&questions.map((q: RevisionQuestion,i: number)=>{
        const ua=answers[i],ok=ua===q.answer;
        return(
          <div key={q.id} style={{border:`1.5px solid ${ok?"#bbf7d0":"#fecaca"}`,borderRadius:10,padding:14,background:ok?"#f0fdf4":"#fff5f5",marginBottom:10}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>{ok?<CheckCircle2 size={16} color="#16a34a"/>:<XCircle size={16} color="#dc2626"/>}<span style={{fontWeight:600,fontSize:"0.88rem"}}>{q.question}</span></div>
            <div style={{fontSize:"0.8rem",color:"#15803d"}}><strong>Correct:</strong> {q.options[q.answer]}</div>
            {!ok&&ua!==null&&<div style={{fontSize:"0.8rem",color:"#b91c1c"}}><strong>Your answer:</strong> {q.options[ua]}</div>}
            {!ok&&ua===null&&<div style={{fontSize:"0.8rem",color:"#b91c1c"}}>Time expired</div>}
          </div>
        );
      })}
    </motion.div>
  );
}
