// GameInfoDocs.tsx — Full game analysis for backend/admin developers
import { useState } from "react";

type Tab = "overview" | "gameflow" | "powers" | "payments" | "admin" | "backend" | "frontend_changes";

const TAB_LABELS: { id: Tab; label: string }[] = [
    { id: "overview",          label: "📋 Overview"         },
    { id: "gameflow",          label: "🎮 Game Flow"         },
    { id: "powers",            label: "⚡ Powers"            },
    { id: "payments",          label: "💳 M-Pesa / Payments" },
    { id: "backend",           label: "🖥️ Backend API"       },
    { id: "admin",             label: "🛠️ Admin Panel"       },
    { id: "frontend_changes",  label: "🔗 Frontend Changes"  },
];

const s: Record<string, React.CSSProperties> = {
    section:    { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    h2:         { color: "#1a1a2e", fontSize: "1.05rem", fontWeight: 700, marginTop: 0, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #f0f0f8" },
    h3:         { color: "#4361ee", fontSize: "0.9rem", fontWeight: 600, marginTop: 16, marginBottom: 8 },
    p:          { lineHeight: 1.75, color: "#444", fontSize: "0.9rem", margin: "0 0 10px" },
    code:       { background: "#1e1e2e", borderRadius: 8, padding: "14px 16px", display: "block", overflowX: "auto" as const, fontSize: "0.8rem", color: "#a6e3a1", whiteSpace: "pre" as const, marginBottom: 12, maxWidth: "100%", lineHeight: 1.6 },
    table:      { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem", minWidth: 400 },
    th:         { background: "#f5f5ff", color: "#4361ee", padding: "10px 14px", textAlign: "left" as const, borderBottom: "2px solid #e0e0f0", fontWeight: 600, whiteSpace: "nowrap" as const },
    td:         { padding: "10px 14px", borderBottom: "1px solid #f0f0f8", color: "#333", verticalAlign: "top" as const },
    note:       { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", color: "#166534", fontSize: "0.85rem", marginBottom: 12 },
    warn:       { background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", color: "#9f1239", fontSize: "0.85rem", marginBottom: 12 },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return <div style={s.section}><h2 style={s.h2}>{title}</h2>{children}</div>;
}
function Code({ children }: { children: string }) {
    return <pre style={s.code}>{children}</pre>;
}
function badge(method: string) {
    const m = method.toUpperCase();
    const cls = m === "GET" ? "badge-get" : m === "POST" ? "badge-post" : m === "PUT" ? "badge-put" : "badge-delete";
    return <span className={`badge ${cls}`}>{m}</span>;
}
function Table({ heads, rows }: { heads: string[]; rows: (string | React.ReactNode)[][] }) {
    const isEndpointTable = heads[0] === "Method";
    return (
        <div className="d-table-wrap">
        <table style={s.table}>
            <thead><tr>{heads.map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                    {r.map((c, j) => (
                        <td key={j} style={s.td}>
                            {isEndpointTable && j === 0 && typeof c === "string" ? badge(c) : c}
                        </td>
                    ))}
                </tr>
            ))}</tbody>
        </table>
        </div>
    );
}

// ── Tab content ────────────────────────────────────────────────────────────────

function Overview() {
    return <>
        <Section title="What is Bongo Quiz?">
            <p style={s.p}>A paid, single-player trivia game with 3 rounds. Players pay via M-Pesa STK Push before playing. A hidden power-up box modifies scoring rules for Rounds 1 and 2. Round 3 is a spin wheel with risk mechanics.</p>
            <div style={s.note}>🟢 Currently: all data is in localStorage only. No backend, no real payments, no real leaderboard.</div>
        </Section>
        <Section title="Tech Stack (Current Frontend)">
            <Table
                heads={["Layer", "Technology"]}
                rows={[
                    ["Framework", "React 19 + TypeScript"],
                    ["Build Tool", "Vite 6"],
                    ["Routing", "Hash-based (no library)"],
                    ["State", "useState / useRef (no Redux)"],
                    ["Storage", "localStorage only"],
                    ["Payments", "Not implemented yet"],
                    ["Backend", "None yet"],
                ]}
            />
        </Section>
        <Section title="Recommended Backend Stack">
            <Table
                heads={["Layer", "Recommendation", "Why"]}
                rows={[
                    ["Runtime",   "Node.js + Express",    "Simple, fast to build"],
                    ["Database",  "PostgreSQL",            "Relational — good for scores/payments"],
                    ["Auth",      "JWT",                   "Stateless, easy to implement"],
                    ["M-Pesa",    "Daraja API v2",         "Official Safaricom API"],
                    ["Hosting",   "Railway / Render",      "Free tier, easy deploy"],
                    ["Admin UI",  "React (this codebase)", "Reuse existing components"],
                ]}
            />
        </Section>
    </>;
}

function GameFlow() {
    return <>
        <Section title="Full Screen Flow">
            <Code>{`home
 └─► box_select          (pick 1 of 8 power boxes)
      └─► power_reveal   (see what power you got)
           └─► deduct_r1r2  (pay KES 20 — STK Push here)
                └─► transition_r1
                     └─► round1        (75s quickfire, +100/-50)
                          └─► round1_result
                               └─► transition_r2
                                    └─► round2_question  (40s, +500/-250, mixed categories)
                                         └─► round2_result
                                              └─► deduct_r3  (pay KES 10 — STK Push here)
                                                   └─► transition_r3
                                                        └─► round3_spin  (3 spins, answer to bank)
                                                             └─► final_result
                                                                  └─► leaderboard`}</Code>
        </Section>
        <Section title="Round Rules">
            <Table
                heads={["Round", "Time", "Correct", "Wrong/Pass", "Questions"]}
                rows={[
                    ["Round 1 — Quickfire",    "75s (base)",  "+100 pts", "−50 pts",  "All R1 questions shuffled"],
                    ["Round 2 — Category Rush","40s (base)",  "+500 pts", "−250 pts", "All categories mixed, shuffled"],
                    ["Round 3 — Spin & Win",   "15s per Q",   "Bank spin pts", "Lose ALL R3 pts", "3 spins max, can stop early"],
                ]}
            />
        </Section>
        <Section title="Round 3 Wheel Segments">
            <Code>{`250, ★★★(0), 3000, ×3(multiplier), 7500, 2000, 250, 25000,
1000, 500, 5000, 15000, 2500, 250, Double(×2), 500, 5000, 500, 10000, 1000

Multiplier segments multiply: (currentScore + banked) × multiplier
★★★ = 0 points (but still need to answer correctly to continue)`}</Code>
        </Section>
        <Section title="Payment Gates">
            <Table
                heads={["Gate", "Amount", "Screen", "If Declined"]}
                rows={[
                    ["Entry fee (R1+R2)", "KES 20", "deduct_r1r2", "Game resets to home"],
                    ["Round 3 entry",     "KES 10", "deduct_r3",   "Goes back to round2_result"],
                ]}
            />
        </Section>
    </>;
}

function Powers() {
    return <>
        <Section title="All 17 Power-Ups">
            <Table
                heads={["Power", "R1 Effect", "R2 Effect", "Score Modifier (applied at end)"]}
                rows={[
                    ["Bonus Time",               "+30s timer",          "+15s timer",         "None"],
                    ["Time Tax",                 "−20s timer",          "−12s timer",         "None"],
                    ["Freeze Frame",             "Pause 15s (once)",    "Pause 10s (once)",   "None"],
                    ["No Penalty",               "Wrong/pass = 0 pts",  "Wrong/pass = 0 pts", "None"],
                    ["Second Chance",            "1 retry on wrong",    "1 retry on wrong",   "None"],
                    ["Question Swap",            "Skip 3 questions",    "Skip 2 questions",   "None"],
                    ["Borrowed Brain",           "Eliminate 2 options", "Eliminate 2 options","None"],
                    ["Double Points",            "None",                "ptsCorrect ×2",      "R1 score ×2"],
                    ["Double Or Nothing",        "None",                "None",               "All correct → ×2, any wrong → 0"],
                    ["Point Gamble",             "None",                "None",               "50%: ×2 or ÷2"],
                    ["Point Chance Brain",       "None",                "None",               "50%: ×2 or unchanged"],
                    ["Insurance",                "None",                "None",               "Floor: 500 (R1), 1000 (R2)"],
                    ["Mirror Effect",            "None",                "None",               "Score ×1.5"],
                    ["Steal A Point",            "None",                "None",               "+200 (R1), +500 (R2)"],
                    ["Swap Fate",                "None",                "None",               "Score ×1.25"],
                    ["Sudden Death Disqualified","None",                "None",               "Any wrong → ÷2 (R1), → 0 (R2)"],
                    ["Disqualified",             "None",                "None",               "Final score = 0"],
                ]}
            />
        </Section>
        <Section title="Power Selection (Box Select)">
            <p style={s.p}>8 boxes shown in a 2×4 grid. Each hides a random power from <code>CUSTOM_PRIZE_LIST_1</code> (12 items, 8 picked randomly). Player clicks one box — it reveals after 3 seconds then proceeds.</p>
        </Section>
    </>;
}

function Payments() {
    return <>
        <Section title="M-Pesa Daraja STK Push Flow">
            <Code>{`Player enters phone number (07XXXXXXXX)
  │
  ▼
Frontend: POST /api/pay/initiate  { phone, amount, sessionId }
  │
  ▼
Backend: normalize phone → 2547XXXXXXXX
Backend: GET Daraja access token (cached, expires 1hr)
Backend: POST Daraja STK Push → gets CheckoutRequestID
Backend: save { checkoutRequestId, sessionId, phone, amount, status:"pending" } to DB
  │
  ▼
Frontend: polls GET /api/pay/status/:checkoutRequestId  every 3s (max 60s)
  │
  ▼
Safaricom: calls POST /api/pay/callback  (your server must be public — use ngrok for dev)
Backend: updates DB status → "paid" or "failed"
  │
  ▼
Frontend poll gets status:"paid" → calls onAccept() → game proceeds`}</Code>
        </Section>
        <Section title="Daraja Credentials Needed">
            <Table
                heads={["Variable", "Where to Get"]}
                rows={[
                    ["CONSUMER_KEY",    "Safaricom Developer Portal → your app"],
                    ["CONSUMER_SECRET", "Safaricom Developer Portal → your app"],
                    ["SHORTCODE",       "Your paybill or till number (174379 for sandbox)"],
                    ["PASSKEY",         "Safaricom portal → Lipa Na M-Pesa → passkey"],
                    ["CALLBACK_URL",    "Your public server URL + /api/pay/callback"],
                ]}
            />
            <div style={s.note}>🟢 Use sandbox.safaricom.co.ke for testing. Switch to api.safaricom.co.ke for production.</div>
        </Section>
        <Section title="STK Push Request Body">
            <Code>{`POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
Authorization: Bearer {access_token}

{
  "BusinessShortCode": "174379",
  "Password":          base64(shortcode + passkey + timestamp),
  "Timestamp":         "20260423142559",   // YYYYMMDDHHmmss
  "TransactionType":   "CustomerPayBillOnline",
  "Amount":            20,                 // or 10 for R3
  "PartyA":            "254712345678",     // player phone
  "PartyB":            "174379",
  "PhoneNumber":       "254712345678",
  "CallBackURL":       "https://yourdomain.com/api/pay/callback",
  "AccountReference":  "BongoQuiz",
  "TransactionDesc":   "Round 1 & 2 entry"
}`}</Code>
        </Section>
        <Section title="Callback Payload (Safaricom → Your Server)">
            <Code>{`POST /api/pay/callback

{
  "Body": {
    "stkCallback": {
      "MerchantRequestID":  "...",
      "CheckoutRequestID":  "ws_CO_...",   // match this to your DB record
      "ResultCode":         0,             // 0 = success, 1032 = cancelled by user
      "ResultDesc":         "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount",              "Value": 20 },
          { "Name": "MpesaReceiptNumber",  "Value": "QKA1234XYZ" },
          { "Name": "PhoneNumber",         "Value": 254712345678 }
        ]
      }
    }
  }
}`}</Code>
        </Section>
        <Section title="Backend Payment Routes">
            <Code>{`POST   /api/pay/initiate          → trigger STK push, return checkoutRequestId
POST   /api/pay/callback          → receive Safaricom result, update DB
GET    /api/pay/status/:id        → return { status: "pending"|"paid"|"failed" }
GET    /api/pay/history/:phone    → all transactions for a player (admin use)`}</Code>
        </Section>
        <Section title="Payments DB Table">
            <Code>{`CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
  session_id          VARCHAR(100),
  phone               VARCHAR(20)  NOT NULL,
  amount              INTEGER      NOT NULL,   -- 20 or 10
  round               VARCHAR(10),             -- 'r1r2' or 'r3'
  status              VARCHAR(10)  DEFAULT 'pending',  -- pending/paid/failed
  mpesa_receipt       VARCHAR(50),
  created_at          TIMESTAMP    DEFAULT NOW(),
  paid_at             TIMESTAMP
);`}</Code>
        </Section>
    </>;
}

function Backend() {
    return <>
        <Section title="All API Endpoints Needed">
            <Table
                heads={["Method", "Endpoint", "Description"]}
                rows={[
                    ["POST",   "/api/auth/register",              "Create player account (name, phone)"],
                    ["POST",   "/api/auth/login",                 "Login → return JWT"],
                    ["GET",    "/api/player/me",                  "Get current player profile"],
                    ["PUT",    "/api/player/me",                  "Update name"],
                    ["POST",   "/api/pay/initiate",               "Start STK Push"],
                    ["POST",   "/api/pay/callback",               "Safaricom webhook"],
                    ["GET",    "/api/pay/status/:checkoutId",     "Poll payment status"],
                    ["POST",   "/api/game/start",                 "Create game session, return sessionId"],
                    ["POST",   "/api/game/complete",              "Save final scores"],
                    ["GET",    "/api/leaderboard",                "Top 50 all-time scores"],
                    ["GET",    "/api/leaderboard?period=today",   "Today's leaderboard"],
                    ["GET",    "/api/leaderboard?period=week",    "This week's leaderboard"],
                    ["POST",   "/api/player/streak",              "Record play today, return streak info"],
                    ["POST",   "/api/player/achievements",        "Unlock achievements, return new ones"],
                    ["GET",    "/api/player/achievements",        "Get all unlocked achievements"],
                    ["GET",    "/api/questions/:round",           "Get questions for a round (admin-managed)"],
                    ["GET",    "/api/admin/players",              "Admin: list all players"],
                    ["GET",    "/api/admin/payments",             "Admin: all transactions"],
                    ["GET",    "/api/admin/games",                "Admin: all game sessions"],
                    ["PUT",    "/api/admin/questions/:id",        "Admin: edit a question"],
                    ["POST",   "/api/admin/questions",            "Admin: add a question"],
                    ["DELETE", "/api/admin/questions/:id",        "Admin: delete a question"],
                ]}
            />
        </Section>
        <Section title="Database Schema">
            <h3 style={s.h3}>players</h3>
            <Code>{`id, phone (unique), name, created_at, last_played_at`}</Code>
            <h3 style={s.h3}>game_sessions</h3>
            <Code>{`id, player_id, power_name, power_img,
r1_score, r2_score, r3_bonus, total_score,
r1_correct, r1_total, r1_time_left, r1_max_streak,
r2_correct, r2_total,
payment_r1r2_id, payment_r3_id,
created_at, completed_at`}</Code>
            <h3 style={s.h3}>payments</h3>
            <Code>{`id, checkout_request_id (unique), session_id, player_id,
phone, amount, round, status, mpesa_receipt, created_at, paid_at`}</Code>
            <h3 style={s.h3}>player_achievements</h3>
            <Code>{`id, player_id, achievement_id, unlocked_at`}</Code>
            <h3 style={s.h3}>player_streaks</h3>
            <Code>{`id, player_id, current_streak, best_streak, last_played_date`}</Code>
            <h3 style={s.h3}>questions</h3>
            <Code>{`id, round (r1/r2/r3), category, question_text,
option_a, option_b, option_c, option_d,
correct_index (0-3), active (bool), created_at`}</Code>
        </Section>
        <Section title="Game Session Flow (Backend)">
            <Code>{`1. Player pays KES 20  → POST /api/pay/initiate  → poll until paid
2. POST /api/game/start  → { playerId, paymentId } → returns sessionId
3. Game plays in frontend (no backend calls during gameplay)
4. Player pays KES 10 (R3)  → POST /api/pay/initiate  → poll until paid
5. POST /api/game/complete  → { sessionId, r1Score, r2Score, r3Bonus, ... }
6. Backend saves to game_sessions, updates leaderboard`}</Code>
        </Section>
        <Section title="Environment Variables (.env)">
            <Code>{`PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/bongoquiz
JWT_SECRET=your_jwt_secret_here
DARAJA_CONSUMER_KEY=xxxx
DARAJA_CONSUMER_SECRET=xxxx
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=xxxx
DARAJA_CALLBACK_URL=https://yourdomain.com/api/pay/callback
DARAJA_ENV=sandbox   # change to production when live`}</Code>
        </Section>
    </>;
}

function Admin() {
    return <>
        <Section title="Admin Panel Pages Needed">
            <Table
                heads={["Page", "Data Shown", "Actions"]}
                rows={[
                    ["Dashboard",     "Total players, total revenue today/week/all-time, games played, avg score", "View only"],
                    ["Players",       "Name, phone, games played, best score, streak, join date", "View, ban, search"],
                    ["Payments",      "Transaction ID, phone, amount, round, status, M-Pesa receipt, date", "Filter by status/date, export CSV"],
                    ["Game Sessions", "Player, power used, R1/R2/R3 scores, total, date", "View breakdown, filter by date"],
                    ["Leaderboard",   "Top scores — all time / today / this week", "Reset, pin entries"],
                    ["Questions",     "All R1/R2/R3 questions with category", "Add, edit, delete, toggle active"],
                    ["Powers",        "17 power-up items with images and effects", "Edit description/effect text"],
                    ["Achievements",  "All 6 badges, unlock counts per badge", "Add new badges"],
                ]}
            />
        </Section>
        <Section title="Admin Auth">
            <p style={s.p}>Admin login is separate from player login. Use a simple <code>admins</code> table with hashed passwords. Protect all <code>/api/admin/*</code> routes with an <code>isAdmin</code> middleware that checks the JWT role claim.</p>
            <Code>{`// middleware
function isAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}`}</Code>
        </Section>
        <Section title="Revenue Tracking">
            <p style={s.p}>Each game can generate KES 20 (R1+R2) + KES 10 (R3) = KES 30 max per session. Track:</p>
            <Table
                heads={["Metric", "Query"]}
                rows={[
                    ["Today's revenue",    "SUM(amount) WHERE status='paid' AND paid_at >= today"],
                    ["This week",          "SUM(amount) WHERE status='paid' AND paid_at >= week_start"],
                    ["Per round split",    "GROUP BY round — see R1R2 vs R3 revenue"],
                    ["Failed payments",    "COUNT WHERE status='failed' — shows drop-off rate"],
                ]}
            />
        </Section>
    </>;
}

function FrontendChanges() {
    return <>
        <Section title="Files to Change in the Frontend">
            <Table
                heads={["File", "Current Behaviour", "Change Needed"]}
                rows={[
                    ["DeductionModal.tsx",      "Just shows confirm/decline buttons",                    "Add phone input field + call POST /api/pay/initiate + poll status before calling onAccept()"],
                    ["LeaderboardScreen.tsx",   "Uses hardcoded DUMMY_LEADERS array",                    "Replace with GET /api/leaderboard — add period filter tabs (today/week/all-time)"],
                    ["FinalResultScreen.tsx",   "Saves best score to localStorage",                      "Also POST /api/game/complete with full score breakdown"],
                    ["achievements.ts",         "Reads/writes localStorage",                             "Call POST /api/player/achievements + GET /api/player/achievements"],
                    ["streakDays.ts",           "Reads/writes localStorage",                             "Call POST /api/player/streak + GET /api/player/streak"],
                    ["HomeScreen.tsx",          "Reads best score from localStorage",                    "GET /api/player/me for best score + streak"],
                    ["BongoMain.tsx",           "No session tracking",                                   "Call POST /api/game/start after R1R2 payment, store sessionId"],
                    ["gametypes.ts",            "Questions hardcoded in the file",                       "Fetch from GET /api/questions/r1, /r2, /r3 on game start"],
                ]}
            />
        </Section>
        <Section title="DeductionModal — STK Push Integration">
            <Code>{`// What to add inside DeductionModal.tsx
const [phone,   setPhone]   = useState('');
const [status,  setStatus]  = useState<'idle'|'waiting'|'paid'|'failed'>('idle');

const handlePay = async () => {
  setStatus('waiting');
  const { checkoutRequestId } = await fetch('/api/pay/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, amount, round: roundLabel })
  }).then(r => r.json());

  // Poll every 3s for up to 60s
  let tries = 0;
  const poll = setInterval(async () => {
    const { status } = await fetch(\`/api/pay/status/\${checkoutRequestId}\`).then(r => r.json());
    if (status === 'paid')   { clearInterval(poll); setStatus('paid');   onAccept(); }
    if (status === 'failed') { clearInterval(poll); setStatus('failed'); }
    if (++tries > 20)        { clearInterval(poll); setStatus('failed'); }
  }, 3000);
};`}</Code>
        </Section>
        <Section title="Player Auth Flow (New)">
            <Code>{`// On first game start (HomeScreen):
// 1. Show phone number input (if no JWT in localStorage)
// 2. POST /api/auth/register  { name, phone }  → returns JWT
// 3. Store JWT in localStorage as "bongo_token"
// 4. All subsequent API calls include: Authorization: Bearer {token}

// On return visit:
// JWT still in localStorage → skip registration
// GET /api/player/me → load name, best score, streak`}</Code>
        </Section>
    </>;
}

// ── Download as plain text ─────────────────────────────────────────────────────
function downloadDoc() {
    const content = document.getElementById("docs-content")?.innerText ?? "";
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "BongoQuiz-Backend-Docs.txt";
    a.click();
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; display: block !important; place-items: unset !important; overflow: hidden; }

.d-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f4f5fb;
  color: #1a1a2e;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Top bar ── */
.d-topbar {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  min-height: 56px;
  flex-shrink: 0;
}
.d-topbar-brand { display: flex; align-items: center; gap: 10px; }
.d-topbar-brand h1 { color: #ffd200; font-size: 1.1rem; font-weight: 800; white-space: nowrap; }
.d-topbar-brand span { color: #666; font-size: 0.75rem; white-space: nowrap; }
.d-dl-btn {
  padding: 7px 16px; background: #ffd200; color: #000; border: none;
  border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 0.8rem;
  white-space: nowrap; flex-shrink: 0;
}

/* ── Mobile tab bar ── */
.d-mobile-tabs {
  display: none;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  padding: 8px 12px;
  gap: 6px;
  overflow-x: auto;
  flex-shrink: 0;
}

/* ── Body layout ── */
.d-layout { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ── */
.d-sidebar {
  width: 210px;
  min-width: 210px;
  background: #fff;
  border-right: 1px solid #e8eaf0;
  padding: 20px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}
.d-sidebar-label {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.2px; color: #aaa; padding: 0 10px 10px;
}

/* ── Tab buttons ── */
.d-tab {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  border-radius: 8px; border: none; background: transparent; color: #666;
  cursor: pointer; font-size: 0.85rem; text-align: left; width: 100%;
  transition: all 0.15s; font-family: inherit;
}
.d-tab:hover { background: #f4f5fb; color: #1a1a2e; }
.d-tab.active { background: #eef0ff; color: #4361ee; font-weight: 600; }
.d-tab.active .d-tab-dot { background: #4361ee; }
.d-tab-dot { width: 6px; height: 6px; border-radius: 50%; background: #ddd; flex-shrink: 0; }

/* Mobile tab pills */
.d-mob-tab {
  padding: 6px 12px; border-radius: 20px; border: 1px solid #0f3460;
  background: transparent; color: #aaa; cursor: pointer; font-size: 0.78rem;
  white-space: nowrap; font-family: inherit; flex-shrink: 0;
}
.d-mob-tab.active { background: #ffd200; color: #000; border-color: #ffd200; font-weight: 700; }

/* ── Content scrolls here ── */
.d-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 28px 60px;
  min-width: 0;
}

/* ── Table wrapper ── */
.d-table-wrap { overflow-x: auto; width: 100%; border-radius: 8px; border: 1px solid #e8eaf0; margin-bottom: 4px; }

/* ── Method badges ── */
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; font-family: monospace; }
.badge-get    { background: #dcfce7; color: #166534; }
.badge-post   { background: #dbeafe; color: #1e40af; }
.badge-put    { background: #fef9c3; color: #854d0e; }
.badge-delete { background: #fee2e2; color: #991b1b; }

@media (max-width: 720px) {
  .d-sidebar     { display: none; }
  .d-mobile-tabs { display: flex; }
  .d-content     { padding: 16px 14px 60px; }
  .d-topbar-brand span { display: none; }
}
`;

// ── Main component ─────────────────────────────────────────────────────────────
export function GameInfoDocs() {
    const [tab, setTab] = useState<Tab>("overview");
    const changeTab = (t: Tab) => { setTab(t); document.getElementById("docs-content")?.scrollTo({ top: 0 }); };

    return (
        <>
        <style>{CSS}</style>
        <div className="d-root">

            {/* Top bar */}
            <header className="d-topbar">
                <div className="d-topbar-brand">
                    <h1>🎯 Bongo Quiz — Developer Docs</h1>
                    <span>Backend &amp; Admin Guide · {new Date().toLocaleDateString()}</span>
                </div>
                <button className="d-dl-btn" onClick={downloadDoc}>⬇️ Download .txt</button>
            </header>

            {/* Mobile tab bar */}
            <div className="d-mobile-tabs">
                {TAB_LABELS.map(t => (
                    <button key={t.id} className={`d-mob-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="d-layout">
                {/* Sidebar */}
                <nav className="d-sidebar">
                    <div className="d-sidebar-label">Navigation</div>
                    {TAB_LABELS.map(t => (
                        <button key={t.id} className={`d-tab${tab === t.id ? " active" : ""}`} onClick={() => changeTab(t.id)}>
                            <span className="d-tab-dot" />
                            {t.label}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <main className="d-content" id="docs-content">
                    {tab === "overview"         && <Overview />}
                    {tab === "gameflow"         && <GameFlow />}
                    {tab === "powers"           && <Powers />}
                    {tab === "payments"         && <Payments />}
                    {tab === "backend"          && <Backend />}
                    {tab === "admin"            && <Admin />}
                    {tab === "frontend_changes" && <FrontendChanges />}
                </main>
            </div>
        </div>
        </>
    );
}
