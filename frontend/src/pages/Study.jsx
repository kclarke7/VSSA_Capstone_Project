import { useEffect, useMemo, useRef, useState } from "react";
import { loadJSON, saveJSON } from "../storage";
import { getNotes } from "../api";
import "../styles/study.css";

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

function splitNotesIntoLines(notes) {
const lines = [];

for (const note of notes) {
const content = String(note.content || "");
const pieces = content
.split(/\r?\n/)
.map((line) => line.trim())
.filter(Boolean);

for (const piece of pieces) {
if (piece.length >= 3) lines.push(piece);
}
}

return lines;
}

function buildFlashcardsFromLines(lines) {
const cards = [];

for (let i = 0; i < lines.length; i++) {
const line = lines[i];

if (line.includes(":")) {
const [front, ...rest] = line.split(":");
const back = rest.join(":").trim();

if (front.trim() && back.trim()) {
cards.push({
id: `${i}-${front}`,
front: front.trim(),
back: back.trim(),
});
continue;
}
}

if (line.startsWith("-")) {
const cleaned = line.replace(/^-+\s*/, "").trim();
if (cleaned.includes(":")) {
const [front, ...rest] = cleaned.split(":");
const back = rest.join(":").trim();

if (front.trim() && back.trim()) {
cards.push({
id: `${i}-${front}`,
front: front.trim(),
back: back.trim(),
});
continue;
}
}
}
}

return cards;
}

function buildQuizFromFlashcards(cards) {
const validCards = cards.filter((c) => c.front && c.back && c.back.length > 1);

return validCards.slice(0, 15).map((card) => {
const wrongAnswers = shuffleArray(
validCards
.filter((c) => c.id !== card.id)
.map((c) => c.back)
.filter(Boolean)
).slice(0, 3);

const options = shuffleArray([card.back, ...wrongAnswers]).slice(0, 4);

return {
id: `${card.id}-quiz`,
question: `What is the correct answer for: ${card.front}?`,
correctAnswer: card.back,
options,
};
});
}

function getDefaultAnalytics() {
return {
timeSpentSeconds: {
timer: 0,
flashcards: 0,
practice: 0,
},
studySessionsCompleted: 0,
quiz: {
answered: 0,
correct: 0,
wrong: 0,
completedRounds: 0,
},
flashcardsViewed: 0,
lastUpdated: Date.now(),
};
}

function updateAnalytics(mutator) {
const current = loadJSON("vssa_analytics", getDefaultAnalytics());
const updated = mutator({ ...current });

updated.lastUpdated = Date.now();
saveJSON("vssa_analytics", updated);
return updated;
}

export default function Study() {
const [studyMode, setStudyMode] = useState("timer");

const STUDY_PRESETS = useMemo(() => [25, 50], []);
const BREAK_PRESETS = useMemo(() => [5, 10], []);

const [mode, setMode] = useState("study");
const [studyMinutes, setStudyMinutes] = useState(25);
const [breakMinutes, setBreakMinutes] = useState(5);

const initialSeconds = useMemo(() => {
return (mode === "study" ? studyMinutes : breakMinutes) * 60;
}, [mode, studyMinutes, breakMinutes]);

const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
const [isRunning, setIsRunning] = useState(false);

const [questions, setQuestions] = useState(() =>
loadJSON("vssa_questions", [])
);
const [questionText, setQuestionText] = useState("");
const [activeQuestionId, setActiveQuestionId] = useState(null);

const [notes, setNotes] = useState([]);
const [notesLoading, setNotesLoading] = useState(false);

const [flipped, setFlipped] = useState(false);
const [flashIndex, setFlashIndex] = useState(0);

const [quizIndex, setQuizIndex] = useState(0);
const [selectedChoice, setSelectedChoice] = useState("");
const [quizSubmitted, setQuizSubmitted] = useState(false);
const [quizResults, setQuizResults] = useState([]);

const sessionCompletedRef = useRef(false);

useEffect(() => {
saveJSON("vssa_questions", questions);
}, [questions]);

useEffect(() => {
setSecondsLeft(initialSeconds);
}, [initialSeconds]);

useEffect(() => {
if (!isRunning) return;

const t = setInterval(() => {
setSecondsLeft((prev) => Math.max(0, prev - 1));
}, 1000);

return () => clearInterval(t);
}, [isRunning]);

useEffect(() => {
if (!isRunning || secondsLeft !== 0) return;

setIsRunning(false);

if (mode === "study" && !sessionCompletedRef.current) {
sessionCompletedRef.current = true;
updateAnalytics((a) => {
a.studySessionsCompleted += 1;
return a;
});
}

setMode((prev) => (prev === "study" ? "break" : "study"));
}, [secondsLeft, isRunning, mode]);

useEffect(() => {
async function loadNotesFromDb() {
setNotesLoading(true);
try {
const data = await getNotes();
setNotes(data.notes || []);
} catch (err) {
console.error(err);
} finally {
setNotesLoading(false);
}
}

loadNotesFromDb();
}, []);

useEffect(() => {
const t = setInterval(() => {
updateAnalytics((a) => {
if (studyMode === "timer") {
a.timeSpentSeconds.timer += 1;
} else if (studyMode === "flashcards") {
a.timeSpentSeconds.flashcards += 1;
} else if (studyMode === "practice") {
a.timeSpentSeconds.practice += 1;
}
return a;
});
}, 1000);

return () => clearInterval(t);
}, [studyMode]);

const noteLines = useMemo(() => splitNotesIntoLines(notes), [notes]);
const flashcards = useMemo(() => buildFlashcardsFromLines(noteLines), [noteLines]);
const quizQuestions = useMemo(() => buildQuizFromFlashcards(flashcards), [flashcards]);

const activeQuestion =
questions.find((q) => q.id === activeQuestionId) || null;

const currentFlashcard = flashcards[flashIndex] || null;
const currentQuiz = quizQuestions[quizIndex] || null;

const correctCount = quizResults.filter((r) => r.correct).length;
const wrongCount = quizResults.filter((r) => !r.correct).length;

function handleMode(newMode) {
setMode(newMode);
setIsRunning(false);
}

function handleReset() {
setIsRunning(false);
setSecondsLeft(initialSeconds);
setActiveQuestionId(null);
sessionCompletedRef.current = false;
}

function addQuestion() {
const q = questionText.trim();
if (!q) return;

setQuestions((prev) => [{ id: crypto.randomUUID(), text: q }, ...prev]);
setQuestionText("");
}

function deleteQuestion(id) {
setQuestions((prev) => prev.filter((q) => q.id !== id));
if (activeQuestionId === id) setActiveQuestionId(null);
}

function importQuestionsFromText(fileText) {
const lines = String(fileText)
.split(/\r?\n/)
.map((l) => l.trim())
.filter(Boolean);

const existing = new Set(questions.map((q) => q.text.toLowerCase()));

const newOnes = lines
.filter((line) => !existing.has(line.toLowerCase()))
.map((line) => ({
id: crypto.randomUUID(),
text: line,
}));

if (newOnes.length) {
setQuestions((prev) => [...newOnes, ...prev]);
}
}

async function handleFileUpload(e) {
const file = e.target.files?.[0];
if (!file) return;

const text = await file.text();

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
importQuestionsFromText(text);
}

e.target.value = "";
}

function toggleStartPause() {
if (!isRunning && mode === "study" && questions.length > 0) {
const randomQuestion =
questions[Math.floor(Math.random() * questions.length)] || null;
setActiveQuestionId(randomQuestion?.id || null);
}

if (!isRunning && mode === "study") {
sessionCompletedRef.current = false;
}

setIsRunning((prev) => !prev);
}

function nextFlashcard() {
if (flashcards.length === 0) return;
setFlipped(false);
setFlashIndex((prev) => (prev + 1) % flashcards.length);

updateAnalytics((a) => {
a.flashcardsViewed += 1;
return a;
});
}

function prevFlashcard() {
if (flashcards.length === 0) return;
setFlipped(false);
setFlashIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
}

function submitQuizAnswer() {
if (!currentQuiz || !selectedChoice || quizSubmitted) return;

const isCorrect = selectedChoice === currentQuiz.correctAnswer;

setQuizResults((prev) => [
...prev,
{
questionId: currentQuiz.id,
selected: selectedChoice,
correctAnswer: currentQuiz.correctAnswer,
correct: isCorrect,
},
]);

updateAnalytics((a) => {
a.quiz.answered += 1;
if (isCorrect) {
a.quiz.correct += 1;
} else {
a.quiz.wrong += 1;
}

if (quizIndex === quizQuestions.length - 1) {
a.quiz.completedRounds += 1;
}

return a;
});

setQuizSubmitted(true);
}

function nextQuizQuestion() {
if (quizIndex < quizQuestions.length - 1) {
setQuizIndex((prev) => prev + 1);
setSelectedChoice("");
setQuizSubmitted(false);
}
}

function restartQuiz() {
setQuizIndex(0);
setSelectedChoice("");
setQuizSubmitted(false);
setQuizResults([]);
}

return (
<div className="study-page">
<div className="study-header">
<h1 className="study-title">Study Session</h1>
<p className="study-subtitle">
Focus, review your questions, and stay on track.
</p>
</div>

<div className="study-tabs">
<button
className={studyMode === "timer" ? "active" : ""}
onClick={() => setStudyMode("timer")}
>
Timer
</button>

<button
className={studyMode === "flashcards" ? "active" : ""}
onClick={() => setStudyMode("flashcards")}
>
Flashcards
</button>

<button
className={studyMode === "practice" ? "active" : ""}
onClick={() => setStudyMode("practice")}
>
Practice Quiz
</button>
</div>

{studyMode === "timer" && (
<div className="study-grid">
<div className="study-card study-card--timer">
<div className="study-mode-toggle">
<button
onClick={() => handleMode("study")}
className={mode === "study" ? "active" : ""}
>
Study
</button>
<button
onClick={() => handleMode("break")}
className={mode === "break" ? "active" : ""}
>
Break
</button>
</div>

<div className="study-timer">{formatTime(secondsLeft)}</div>

<div className="study-actions">
<button onClick={toggleStartPause}>
{isRunning ? "Pause" : "Start"}
</button>
<button onClick={handleReset} className="secondary">
Reset
</button>
</div>

<div className="study-selects">
<div>
<label>Study minutes</label>
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
<label>Break minutes</label>
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

{mode === "study" && isRunning && activeQuestion && (
<div className="study-current-question">
<div className="study-current-label">Current question</div>
<div className="study-current-text">{activeQuestion.text}</div>
</div>
)}
</div>

<div className="study-card">
<h2 className="study-section-title">Question Bank</h2>

<div className="study-question-input">
<input
value={questionText}
onChange={(e) => setQuestionText(e.target.value)}
placeholder="Type a study question..."
/>
<button onClick={addQuestion}>Add</button>
</div>

<div className="study-upload">
<label>Upload questions (.txt or .csv)</label>
<input type="file" accept=".txt,.csv" onChange={handleFileUpload} />
<small>CSV uses the first column. TXT uses one question per line.</small>
</div>

<div className="study-question-list">
{questions.length === 0 ? (
<div className="study-empty">
No questions yet. Add one or upload a file.
</div>
) : (
questions.map((q) => (
<div
key={q.id}
className={`study-question-item ${
q.id === activeQuestionId ? "highlighted" : ""
}`}
>
<span>{q.text}</span>
<button
className="delete-btn"
onClick={() => deleteQuestion(q.id)}
>
Delete
</button>
</div>
))
)}
</div>
</div>
</div>
)}

{studyMode === "flashcards" && (
<div className="study-card">
<h2>Flashcards</h2>

{notesLoading ? (
<p>Loading notes...</p>
) : flashcards.length === 0 ? (
<p style={{ opacity: 0.7 }}>
Upload notes first. Flashcards will be generated from your saved notes.
</p>
) : (
<>
<div
className={`flashcard ${flipped ? "flipped" : ""}`}
onClick={() => setFlipped((prev) => !prev)}
>
<div className="flashcard-inner">
<div className="flashcard-front">
{currentFlashcard.front}
<p className="flashcard-hint">Click to flip</p>
</div>

<div className="flashcard-back">{currentFlashcard.back}</div>
</div>
</div>

<div style={{ display: "flex", gap: 12, marginTop: 16 }}>
<button onClick={prevFlashcard}>Previous Flashcard</button>
<button onClick={nextFlashcard}>Next Flashcard</button>
</div>

<p className="flashcard-info" style={{ marginTop: 12 }}>
Card {flashIndex + 1} of {flashcards.length}
</p>
</>
)}
</div>
)}

{studyMode === "practice" && (
<div className="study-card">
<h2>Practice Questions</h2>

{notesLoading ? (
<p>Loading notes...</p>
) : quizQuestions.length === 0 ? (
<p style={{ opacity: 0.7 }}>
Upload notes first. Practice questions will be generated from your saved notes.
</p>
) : (
<>
<div style={{ marginBottom: 16 }}>
<strong>Correct:</strong> {correctCount} &nbsp; | &nbsp;
<strong>Wrong:</strong> {wrongCount}
</div>

<div className="practice-question">
<p style={{ fontWeight: 700 }}>
Question {quizIndex + 1} of {quizQuestions.length}
</p>

<p>{currentQuiz.question}</p>

<div style={{ display: "grid", gap: 10, marginTop: 14 }}>
{currentQuiz.options.map((option, i) => (
<button
key={option}
type="button"
onClick={() => !quizSubmitted && setSelectedChoice(option)}
style={{
textAlign: "left",
padding: "12px",
borderRadius: "10px",
border: "1px solid #d9d9d9",
background:
selectedChoice === option ? "#dff1ff" : "#fff",
}}
>
{String.fromCharCode(65 + i)}. {option}
</button>
))}
</div>

{!quizSubmitted ? (
<button
style={{ marginTop: 14 }}
onClick={submitQuizAnswer}
disabled={!selectedChoice}
>
Submit Answer
</button>
) : (
<div style={{ marginTop: 14 }}>
<p style={{ fontWeight: 700 }}>
{selectedChoice === currentQuiz.correctAnswer
? "Correct ✅"
: `Wrong ❌ Correct answer: ${currentQuiz.correctAnswer}`}
</p>

{quizIndex < quizQuestions.length - 1 ? (
<button onClick={nextQuizQuestion}>Next Question</button>
) : (
<button onClick={restartQuiz}>Restart Quiz</button>
)}
</div>
)}
</div>
</>
)}
</div>
)}
</div>
);
}
