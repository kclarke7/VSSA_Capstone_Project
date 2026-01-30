import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { loadJSON, saveJSON } from "./stroage";

// ---------- helpers ----------
function formatTime(totalSeconds) {
const m = Math.floor(totalSeconds / 60);
const s = totalSeconds % 60;
return `${m}:${String(s).padStart(2, "0")}`;
}

function shuffleArray(arr) {
const a = [...arr];
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}

export default function App() {
// durations in minutes
const STUDY_PRESETS = useMemo(() => [25, 50], []);
const BREAK_PRESETS = useMemo(() => [5, 10], []);

const [mode, setMode] = useState("study"); // "study" | "break"
const [studyMinutes, setStudyMinutes] = useState(25);
const [breakMinutes, setBreakMinutes] = useState(5);

const initialSeconds = useMemo(() => {
return (mode === "study" ? studyMinutes : breakMinutes) * 60;
}, [mode, studyMinutes, breakMinutes]);

const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
const [isRunning, setIsRunning] = useState(false);

// Keep timer display in sync when user changes mode/minutes (and timer is NOT running)
useEffect(() => {
if (!isRunning) setSecondsLeft(initialSeconds);
}, [initialSeconds, isRunning]);

// Timer ticking
useEffect(() => {
if (!isRunning) return;

const t = setInterval(() => {
setSecondsLeft((prev) => Math.max(0, prev - 1));
}, 1000);

return () => clearInterval(t);
}, [isRunning]);

// When timer hits 0: switch mode + stop (simple behavior)
useEffect(() => {
if (!isRunning) return;
if (secondsLeft !== 0) return;

setIsRunning(false);
setMode((prev) => (prev === "study" ? "break" : "study"));
}, [secondsLeft, isRunning]);

function handleMode(newMode) {
setMode(newMode);
setIsRunning(false);
}

function handleReset() {
setIsRunning(false);
setSecondsLeft(initialSeconds);
setActiveQuestionId(null);
setSessionQueue([]);
}

// -------------------------------
// PART 2: Questions List + Delete
// -------------------------------
const [questions, setQuestions] = useState(() => loadJSON("vssa_questions", []));
const [questionText, setQuestionText] = useState("");

// Save to localStorage anytime questions change
useEffect(() => {
saveJSON("vssa_questions", questions);
}, [questions]);

function addQuestion() {
const q = questionText.trim();
if (!q) return;

setQuestions((prev) => [{ id: crypto.randomUUID(), text: q }, ...prev]);
setQuestionText("");
}

function deleteQuestion(id) {
setQuestions((prev) => prev.filter((q) => q.id !== id));
}

function importQuestionsFromText(fileText) {
const lines = String(fileText)
.split(/\r?\n/)
.map((l) => l.trim())
.filter(Boolean);

// prevent duplicates (case-insensitive)
const existing = new Set(questions.map((q) => q.text.toLowerCase()));

const newOnes = lines
.filter((line) => !existing.has(line.toLowerCase()))
.map((line) => ({ id: crypto.randomUUID(), text: line }));

if (newOnes.length) {
setQuestions((prev) => [...newOnes, ...prev]);
}
}

// ONE upload handler (keep only this one)
async function handleFileUpload(e) {
const file = e.target.files?.[0];
if (!file) return;

const text = await file.text();

// If CSV, grab first column as the question text
if (file.name.toLowerCase().endsWith(".csv")) {
const lines = text
.split(/\r?\n/)
.map((l) => l.trim())
.filter(Boolean);

const firstCol = lines
.map((line) => line.split(",")[0]?.replace(/^"|"$/g, "").trim())
.filter(Boolean);

importQuestionsFromText(firstCol.join("\n"));
} else {
// Normal .txt
importQuestionsFromText(text);
}

// reset so you can upload same file again if needed
e.target.value = "";
}

// -----------------------------------------
// PART 2: Random / rotating question on Start
// -----------------------------------------
const [activeQuestionId, setActiveQuestionId] = useState(null);
const [sessionQueue, setSessionQueue] = useState([]); // shuffled IDs for this study session

// If active question was deleted, clear it
useEffect(() => {
if (!activeQuestionId) return;
const stillExists = questions.some((q) => q.id === activeQuestionId);
if (!stillExists) setActiveQuestionId(null);
}, [questions, activeQuestionId]);

const activeQuestion = useMemo(() => {
if (!activeQuestionId) return null;
return questions.find((q) => q.id === activeQuestionId) || null;
}, [questions, activeQuestionId]);

function startStudyQuestionSession() {
if (mode !== "study") return;
if (questions.length === 0) {
setActiveQuestionId(null);
setSessionQueue([]);
return;
}

// Rotate order each session: shuffle IDs when study starts
const ids = shuffleArray(questions.map((q) => q.id));
setSessionQueue(ids);
setActiveQuestionId(ids[0] ?? null);
}

function toggleStartPause() {
// If starting a STUDY session, pick a question
if (!isRunning) {
if (mode === "study") startStudyQuestionSession();
}
setIsRunning((prev) => !prev);
}

// -------------------------------
// UI
// -------------------------------
const presets = mode === "study" ? STUDY_PRESETS : BREAK_PRESETS;

return (
<div className="app">
<h1>VSSA</h1>

<div className="row">
<button onClick={() => handleMode("study")} className={mode === "study" ? "active" : ""}>
Study
</button>
<button onClick={() => handleMode("break")} className={mode === "break" ? "active" : ""}>
Break
</button>
</div>

<div className="timer">{formatTime(secondsLeft)}</div>

<div className="row">
<button onClick={toggleStartPause}>{isRunning ? "Pause" : "Start"}</button>
<button onClick={handleReset}>Reset</button>
</div>

<div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
<div>
<div style={{ fontSize: 12, opacity: 0.8 }}>Study minutes</div>
<select
value={studyMinutes}
onChange={(e) => {
setStudyMinutes(Number(e.target.value));
setIsRunning(false);
}}
>
{STUDY_PRESETS.map((m) => (
<option key={m} value={m}>
{m}
</option>
))}
</select>
</div>

<div>
<div style={{ fontSize: 12, opacity: 0.8 }}>Break minutes</div>
<select
value={breakMinutes}
onChange={(e) => {
setBreakMinutes(Number(e.target.value));
setIsRunning(false);
}}
>
{BREAK_PRESETS.map((m) => (
<option key={m} value={m}>
{m}
</option>
))}
</select>
</div>
</div>

<hr style={{ width: "60%", margin: "24px auto", opacity: 0.3 }} />

<h2>Study Questions</h2>

{/* Show the random question during Study */}
{mode === "study" && isRunning && activeQuestion && (
<div style={{ maxWidth: 520, margin: "0 auto 14px auto", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)" }}>
<div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Current question</div>
<div style={{ fontSize: 16, fontWeight: 600 }}>{activeQuestion.text}</div>
</div>
)}

<div className="row" style={{ gap: 10 }}>
<input
style={{ minWidth: 260 }}
value={questionText}
onChange={(e) => setQuestionText(e.target.value)}
placeholder="Type a study question..."
/>
<button onClick={addQuestion}>Add</button>
</div>

<div style={{ marginTop: 10 }}>
<div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Upload questions (.txt or .csv)</div>
<input type="file" accept=".txt,.csv" onChange={handleFileUpload} />
<div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>
CSV uses the first column. TXT = one question per line.
</div>
</div>

{/* Questions list */}
<div style={{ maxWidth: 620, margin: "16px auto 0 auto", textAlign: "left" }}>
{questions.length === 0 ? (
<div style={{ opacity: 0.7, fontSize: 13 }}>No questions yet. Add one or upload a file.</div>
) : (
<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
{questions.map((q) => (
<li
key={q.id}
style={{
display: "flex",
gap: 10,
alignItems: "center",
padding: "10px 12px",
borderRadius: 8,
border: "1px solid rgba(255,255,255,0.12)",
marginBottom: 8,
background: q.id === activeQuestionId ? "rgba(255,255,255,0.08)" : "transparent",
}}
>
<div style={{ flex: 1 }}>{q.text}</div>
<button onClick={() => deleteQuestion(q.id)} style={{ opacity: 0.9 }}>
Delete
</button>
</li>
))}
</ul>
)}
</div>
</div>
);
}