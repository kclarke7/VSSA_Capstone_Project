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

function buildExamFromFlashcards(cards) {
const validCards = cards.filter((c) => c.front && c.back && c.back.length > 1);
const shuffled = shuffleArray(validCards).slice(0, 15);

return shuffled.map((card, index) => {
const typeIndex = index % 3;

if (typeIndex === 0) {
const wrongAnswers = shuffleArray(
validCards
.filter((c) => c.id !== card.id)
.map((c) => c.back)
.filter(Boolean)
).slice(0, 3);

const options = shuffleArray([card.back, ...wrongAnswers]).slice(0, 4);

return {
id: `${card.id}-exam-mc`,
type: "mc",
question: `What is the correct answer for: ${card.front}?`,
correctAnswer: card.back,
options,
};
}

if (typeIndex === 1) {
const useTrue = Math.random() > 0.5;
const wrongCard = shuffleArray(
validCards.filter((c) => c.id !== card.id && c.back !== card.back)
)[0];

return {
id: `${card.id}-exam-tf`,
type: "tf",
question: `${card.front}: ${useTrue ? card.back : wrongCard?.back || card.back}`,
correctAnswer: useTrue ? "True" : "False",
};
}

return {
id: `${card.id}-exam-fill`,
type: "fill",
question: `Fill in the blank: ${card.front}`,
correctAnswer: card.back,
};
});
}

function buildMatchPairsFromFlashcards(cards) {
return cards
.filter((c) => c.front && c.back)
.slice(0, 8)
.map((card) => ({
id: `${card.id}-match`,
term: card.front,
definition: card.back,
}));
}

function normalizeSubject(title = "") {
const lower = title.toLowerCase();

if (
lower.includes("computer_science") ||
lower.includes("computer science") ||
lower.includes("comp sci") ||
lower.includes("cs")
) {
return "Computer Science";
}
if (lower.includes("biology") || lower.includes("bio")) return "Biology";
if (lower.includes("business")) return "Business";
if (lower.includes("math")) return "Math";
if (lower.includes("psychology") || lower.includes("psych")) return "Psychology";

return "General";
}

function getDefaultAnalytics() {
return {
timeSpentSeconds: {
timer: 0,
flashcards: 0,
practice: 0,
exam: 0,
match: 0,
},
studySessionsCompleted: 0,
quiz: {
answered: 0,
correct: 0,
wrong: 0,
completedRounds: 0,
},
exam: {
answered: 0,
correct: 0,
wrong: 0,
completedRounds: 0,
},
match: {
answered: 0,
correct: 0,
wrong: 0,
completedRounds: 0,
},
flashcardsViewed: 0,
focus: {
trackingEnabled: false,
micPermission: "unknown",
cameraPermission: "unknown",
mic: {
loudSeconds: 0,
quietSeconds: 0,
},
camera: {
motionEvents: 0,
stillSeconds: 0,
},
correlations: {
loudCorrect: 0,
loudWrong: 0,
quietCorrect: 0,
quietWrong: 0,
motionCorrect: 0,
motionWrong: 0,
stillCorrect: 0,
stillWrong: 0,
},
},
subjectPerformance: {},
lastUpdated: Date.now(),
};
}

function ensureAnalyticsShape(current) {
const base = getDefaultAnalytics();

return {
...base,
...current,
timeSpentSeconds: {
...base.timeSpentSeconds,
...(current?.timeSpentSeconds || {}),
},
quiz: {
...base.quiz,
...(current?.quiz || {}),
},
exam: {
...base.exam,
...(current?.exam || {}),
},
match: {
...base.match,
...(current?.match || {}),
},
focus: {
...base.focus,
...(current?.focus || {}),
mic: {
...base.focus.mic,
...(current?.focus?.mic || {}),
},
camera: {
...base.focus.camera,
...(current?.focus?.camera || {}),
},
correlations: {
...base.focus.correlations,
...(current?.focus?.correlations || {}),
},
},
subjectPerformance: {
...base.subjectPerformance,
...(current?.subjectPerformance || {}),
},
};
}

function updateAnalytics(mutator) {
const current = ensureAnalyticsShape(
loadJSON("vssa_analytics", getDefaultAnalytics())
);
const updated = ensureAnalyticsShape(mutator({ ...current }));
updated.lastUpdated = Date.now();
saveJSON("vssa_analytics", updated);
return updated;
}

function normalizeText(value) {
return String(value || "").trim().toLowerCase();
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

const [selectedSubject, setSelectedSubject] = useState("All Subjects");
const [selectedNoteTitles, setSelectedNoteTitles] = useState([]);

const [flipped, setFlipped] = useState(false);
const [flashIndex, setFlashIndex] = useState(0);

const [quizIndex, setQuizIndex] = useState(0);
const [selectedChoice, setSelectedChoice] = useState("");
const [quizSubmitted, setQuizSubmitted] = useState(false);
const [quizResults, setQuizResults] = useState([]);

const [examIndex, setExamIndex] = useState(0);
const [examSelectedChoice, setExamSelectedChoice] = useState("");
const [examTypedAnswer, setExamTypedAnswer] = useState("");
const [examSubmitted, setExamSubmitted] = useState(false);
const [examResults, setExamResults] = useState([]);

const [matchDefinitions, setMatchDefinitions] = useState([]);
const [draggedTermId, setDraggedTermId] = useState(null);
const [matchedIds, setMatchedIds] = useState([]);
const [matchCorrectCount, setMatchCorrectCount] = useState(0);
const [matchWrongCount, setMatchWrongCount] = useState(0);
const [matchMessage, setMatchMessage] = useState("");

const [mediaEnabled, setMediaEnabled] = useState(false);
const [micPermission, setMicPermission] = useState("unknown");
const [cameraPermission, setCameraPermission] = useState("unknown");
const [mediaError, setMediaError] = useState("");
const [noiseStatus, setNoiseStatus] = useState("Quiet");
const [motionStatus, setMotionStatus] = useState("Still");
const [micLevel, setMicLevel] = useState(0);

const sessionCompletedRef = useRef(false);

const mediaStreamRef = useRef(null);
const videoRef = useRef(null);
const motionCanvasRef = useRef(null);
const analyserRef = useRef(null);
const audioContextRef = useRef(null);
const micAnimationRef = useRef(null);
const motionIntervalRef = useRef(null);
const previousMotionActiveRef = useRef(false);

const currentLoudRef = useRef(false);
const currentMotionRef = useRef(false);

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
const notesWithSubjects = (data.notes || []).map((note) => ({
...note,
subject: note.subject && note.subject !== "General"
? note.subject
: normalizeSubject(note.title),
}));
setNotes(notesWithSubjects);
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
if (studyMode === "timer") a.timeSpentSeconds.timer += 1;
if (studyMode === "flashcards") a.timeSpentSeconds.flashcards += 1;
if (studyMode === "practice") a.timeSpentSeconds.practice += 1;
if (studyMode === "exam") a.timeSpentSeconds.exam += 1;
if (studyMode === "match") a.timeSpentSeconds.match += 1;

if (mediaEnabled) {
a.focus.trackingEnabled = true;
a.focus.micPermission = micPermission;
a.focus.cameraPermission = cameraPermission;

if (currentLoudRef.current) a.focus.mic.loudSeconds += 1;
else a.focus.mic.quietSeconds += 1;

if (!currentMotionRef.current) a.focus.camera.stillSeconds += 1;
}

return a;
});
}, 1000);

return () => clearInterval(t);
}, [studyMode, mediaEnabled, micPermission, cameraPermission]);

useEffect(() => {
return () => {
stopMediaTracking();
};
}, []);

const subjects = useMemo(() => {
const unique = Array.from(new Set(notes.map((n) => n.subject))).filter(Boolean);
return ["All Subjects", ...unique];
}, [notes]);

const notesForSubject = useMemo(() => {
if (selectedSubject === "All Subjects") return notes;
return notes.filter((n) => n.subject === selectedSubject);
}, [notes, selectedSubject]);

useEffect(() => {
setSelectedNoteTitles(notesForSubject.map((n) => n.title));
}, [selectedSubject, notesForSubject]);

const selectedNotes = useMemo(() => {
return notesForSubject.filter((n) => selectedNoteTitles.includes(n.title));
}, [notesForSubject, selectedNoteTitles]);

const noteLines = useMemo(() => splitNotesIntoLines(selectedNotes), [selectedNotes]);
const flashcards = useMemo(() => buildFlashcardsFromLines(noteLines), [noteLines]);
const quizQuestions = useMemo(() => buildQuizFromFlashcards(flashcards), [flashcards]);
const examQuestions = useMemo(() => buildExamFromFlashcards(flashcards), [flashcards]);
const matchPairs = useMemo(() => buildMatchPairsFromFlashcards(flashcards), [flashcards]);

useEffect(() => {
setMatchDefinitions(shuffleArray(matchPairs.map((pair) => ({ ...pair }))));
setMatchedIds([]);
setMatchCorrectCount(0);
setMatchWrongCount(0);
setMatchMessage("");
}, [matchPairs]);

useEffect(() => {
setFlashIndex(0);
setFlipped(false);

setQuizIndex(0);
setSelectedChoice("");
setQuizSubmitted(false);
setQuizResults([]);

setExamIndex(0);
setExamSelectedChoice("");
setExamTypedAnswer("");
setExamSubmitted(false);
setExamResults([]);
}, [selectedSubject, selectedNoteTitles]);

const activeQuestion =
questions.find((q) => q.id === activeQuestionId) || null;

const currentFlashcard = flashcards[flashIndex] || null;
const currentQuiz = quizQuestions[quizIndex] || null;
const currentExam = examQuestions[examIndex] || null;

const correctCount = quizResults.filter((r) => r.correct).length;
const wrongCount = quizResults.filter((r) => !r.correct).length;

const examCorrectCount = examResults.filter((r) => r.correct).length;
const examWrongCount = examResults.filter((r) => !r.correct).length;

const currentSubjectForAnalytics = useMemo(() => {
if (selectedSubject !== "All Subjects") return selectedSubject;

const uniqueSelectedSubjects = Array.from(
new Set(selectedNotes.map((n) => n.subject).filter(Boolean))
);

if (uniqueSelectedSubjects.length === 1) return uniqueSelectedSubjects[0];
if (uniqueSelectedSubjects.length > 1) return "Mixed Subjects";
return "General";
}, [selectedSubject, selectedNotes]);

function recordPerformance(modeKey, correct) {
updateAnalytics((a) => {
const perf = a.subjectPerformance[currentSubjectForAnalytics] || {
totalAnswered: 0,
totalCorrect: 0,
totalWrong: 0,
quiz: { answered: 0, correct: 0, wrong: 0 },
exam: { answered: 0, correct: 0, wrong: 0 },
match: { answered: 0, correct: 0, wrong: 0 },
};

perf.totalAnswered += 1;
if (correct) perf.totalCorrect += 1;
else perf.totalWrong += 1;

if (!perf[modeKey]) {
perf[modeKey] = { answered: 0, correct: 0, wrong: 0 };
}

perf[modeKey].answered += 1;
if (correct) perf[modeKey].correct += 1;
else perf[modeKey].wrong += 1;

a.subjectPerformance[currentSubjectForAnalytics] = perf;

if (currentLoudRef.current) {
if (correct) a.focus.correlations.loudCorrect += 1;
else a.focus.correlations.loudWrong += 1;
} else {
if (correct) a.focus.correlations.quietCorrect += 1;
else a.focus.correlations.quietWrong += 1;
}

if (currentMotionRef.current) {
if (correct) a.focus.correlations.motionCorrect += 1;
else a.focus.correlations.motionWrong += 1;
} else {
if (correct) a.focus.correlations.stillCorrect += 1;
else a.focus.correlations.stillWrong += 1;
}

return a;
});
}

async function enableMediaTracking() {
try {
setMediaError("");

if (mediaStreamRef.current) {
setMediaEnabled(true);
return;
}

const stream = await navigator.mediaDevices.getUserMedia({
audio: true,
video: true,
});

mediaStreamRef.current = stream;
setMediaEnabled(true);
setMicPermission("granted");
setCameraPermission("granted");

updateAnalytics((a) => {
a.focus.trackingEnabled = true;
a.focus.micPermission = "granted";
a.focus.cameraPermission = "granted";
return a;
});

if (videoRef.current) {
videoRef.current.srcObject = stream;
await videoRef.current.play().catch(() => {});
}

setupMicrophone(stream);
setupMotionDetection();
} catch (err) {
console.error(err);
setMediaEnabled(false);
setMediaError("Mic/camera access was denied or unavailable.");
setMicPermission("denied");
setCameraPermission("denied");

updateAnalytics((a) => {
a.focus.micPermission = "denied";
a.focus.cameraPermission = "denied";
return a;
});
}
}

function stopMediaTracking() {
if (micAnimationRef.current) {
cancelAnimationFrame(micAnimationRef.current);
micAnimationRef.current = null;
}

if (motionIntervalRef.current) {
clearInterval(motionIntervalRef.current);
motionIntervalRef.current = null;
}

if (audioContextRef.current) {
audioContextRef.current.close().catch(() => {});
audioContextRef.current = null;
}

if (mediaStreamRef.current) {
mediaStreamRef.current.getTracks().forEach((track) => track.stop());
mediaStreamRef.current = null;
}

analyserRef.current = null;
currentLoudRef.current = false;
currentMotionRef.current = false;
previousMotionActiveRef.current = false;
setMediaEnabled(false);
setNoiseStatus("Quiet");
setMotionStatus("Still");
setMicLevel(0);
}

function setupMicrophone(stream) {
try {
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);

audioContextRef.current = audioContext;
analyserRef.current = analyser;

const dataArray = new Uint8Array(analyser.frequencyBinCount);

const tick = () => {
if (!analyserRef.current) return;

analyserRef.current.getByteFrequencyData(dataArray);
const avg =
dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

const normalized = avg / 255;
setMicLevel(normalized);

const loud = normalized > 0.18;
currentLoudRef.current = loud;
setNoiseStatus(loud ? "Loud" : "Quiet");

micAnimationRef.current = requestAnimationFrame(tick);
};

tick();
} catch (err) {
console.error("Microphone setup failed:", err);
}
}

function setupMotionDetection() {
if (!videoRef.current || !motionCanvasRef.current) return;

const video = videoRef.current;
const canvas = motionCanvasRef.current;
const ctx = canvas.getContext("2d", { willReadFrequently: true });

motionIntervalRef.current = setInterval(() => {
if (!video.videoWidth || !video.videoHeight || !ctx) return;

canvas.width = 160;
canvas.height = 120;

ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

if (!canvas._prevFrame) {
canvas._prevFrame = new Uint8ClampedArray(frame);
return;
}

let diffCount = 0;

for (let i = 0; i < frame.length; i += 16) {
const diff =
Math.abs(frame[i] - canvas._prevFrame[i]) +
Math.abs(frame[i + 1] - canvas._prevFrame[i + 1]) +
Math.abs(frame[i + 2] - canvas._prevFrame[i + 2]);

if (diff > 45) diffCount++;
}

const motionDetected = diffCount > 180;

currentMotionRef.current = motionDetected;
setMotionStatus(motionDetected ? "Motion Detected" : "Still");

if (motionDetected && !previousMotionActiveRef.current) {
updateAnalytics((a) => {
a.focus.camera.motionEvents += 1;
return a;
});
}

previousMotionActiveRef.current = motionDetected;
canvas._prevFrame = new Uint8ClampedArray(frame);
}, 900);
}

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

async function toggleStartPause() {
if (!isRunning && mode === "study") {
await enableMediaTracking();
}

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
if (isCorrect) a.quiz.correct += 1;
else a.quiz.wrong += 1;

if (quizIndex === quizQuestions.length - 1) {
a.quiz.completedRounds += 1;
}

return a;
});

recordPerformance("quiz", isCorrect);
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

function selectAllNotes() {
setSelectedNoteTitles(notesForSubject.map((n) => n.title));
}

function clearAllNotes() {
setSelectedNoteTitles([]);
}

function toggleNoteSelection(title) {
setSelectedNoteTitles((prev) =>
prev.includes(title)
? prev.filter((t) => t !== title)
: [...prev, title]
);
}

function submitExamAnswer() {
if (!currentExam || examSubmitted) return;

let userAnswer = "";
let isCorrect = false;

if (currentExam.type === "mc" || currentExam.type === "tf") {
if (!examSelectedChoice) return;
userAnswer = examSelectedChoice;
isCorrect = examSelectedChoice === currentExam.correctAnswer;
} else if (currentExam.type === "fill") {
if (!examTypedAnswer.trim()) return;
userAnswer = examTypedAnswer.trim();
isCorrect =
normalizeText(examTypedAnswer) === normalizeText(currentExam.correctAnswer);
}

setExamResults((prev) => [
...prev,
{
questionId: currentExam.id,
selected: userAnswer,
correctAnswer: currentExam.correctAnswer,
correct: isCorrect,
},
]);

updateAnalytics((a) => {
a.exam.answered += 1;
if (isCorrect) a.exam.correct += 1;
else a.exam.wrong += 1;

if (examIndex === examQuestions.length - 1) {
a.exam.completedRounds += 1;
}

return a;
});

recordPerformance("exam", isCorrect);
setExamSubmitted(true);
}

function nextExamQuestion() {
if (examIndex < examQuestions.length - 1) {
setExamIndex((prev) => prev + 1);
setExamSelectedChoice("");
setExamTypedAnswer("");
setExamSubmitted(false);
}
}

function restartExam() {
setExamIndex(0);
setExamSelectedChoice("");
setExamTypedAnswer("");
setExamSubmitted(false);
setExamResults([]);
}

function handleDragStart(termId) {
setDraggedTermId(termId);
}

function handleDrop(definitionId) {
if (!draggedTermId) return;

const draggedPair = matchPairs.find((p) => p.id === draggedTermId);
const targetPair = matchDefinitions.find((p) => p.id === definitionId);

if (!draggedPair || !targetPair) return;

const isCorrect = draggedPair.id === targetPair.id;

updateAnalytics((a) => {
a.match.answered += 1;
if (isCorrect) a.match.correct += 1;
else a.match.wrong += 1;
return a;
});

recordPerformance("match", isCorrect);

if (isCorrect) {
if (!matchedIds.includes(draggedPair.id)) {
const newMatched = [...matchedIds, draggedPair.id];
setMatchedIds(newMatched);
setMatchCorrectCount((prev) => prev + 1);
setMatchMessage("Correct match ✅");

if (newMatched.length === matchPairs.length) {
updateAnalytics((a) => {
a.match.completedRounds += 1;
return a;
});
}
}
} else {
setMatchWrongCount((prev) => prev + 1);
setMatchMessage("Wrong match ❌");
}

setDraggedTermId(null);
}

function restartMatchMode() {
setMatchDefinitions(shuffleArray(matchPairs.map((pair) => ({ ...pair }))));
setMatchedIds([]);
setMatchCorrectCount(0);
setMatchWrongCount(0);
setMatchMessage("");
setDraggedTermId(null);
}

return (
<div className="study-page">
<div className="study-header">
<h1 className="study-title">Study Session</h1>
<p className="study-subtitle">
Focus, review your questions, and stay on track.
</p>
</div>

<div
style={{
display: "grid",
gap: 16,
marginBottom: 20,
background: "#fff",
padding: 16,
borderRadius: 14,
boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
}}
>
<div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
<strong>Focus Tracking:</strong>
<span>Mic: {micPermission}</span>
<span>Camera: {cameraPermission}</span>
<span>Noise: {noiseStatus}</span>
<span>Motion: {motionStatus}</span>
<span>Mic Level: {(micLevel * 100).toFixed(0)}%</span>

<button type="button" onClick={enableMediaTracking}>
Enable Mic + Camera
</button>

<button type="button" onClick={stopMediaTracking}>
Stop Mic + Camera
</button>
</div>

{mediaError ? (
<div style={{ color: "#b91c1c", fontWeight: 600 }}>{mediaError}</div>
) : null}

<video
ref={videoRef}
autoPlay
playsInline
muted
style={{
width: 220,
height: 140,
borderRadius: 12,
background: "#111827",
objectFit: "cover",
}}
/>
<canvas ref={motionCanvasRef} style={{ display: "none" }} />
</div>

<div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
<div>
<label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
Select Subject
</label>
<select
value={selectedSubject}
onChange={(e) => setSelectedSubject(e.target.value)}
style={{ width: "100%", padding: 12, borderRadius: 10 }}
>
{subjects.map((subject) => (
<option key={subject} value={subject}>
{subject}
</option>
))}
</select>
</div>

<div>
<label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
Select One or More Notes
</label>

<div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
<button type="button" onClick={selectAllNotes}>
Select All
</button>
<button type="button" onClick={clearAllNotes}>
Clear All
</button>
</div>

<div
style={{
border: "1px solid #d9d9d9",
borderRadius: 12,
padding: 12,
display: "grid",
gap: 8,
background: "#fff",
}}
>
{notesForSubject.length === 0 ? (
<div style={{ opacity: 0.7 }}>No notes found for this subject.</div>
) : (
notesForSubject.map((note) => (
<label
key={note.id}
style={{ display: "flex", alignItems: "center", gap: 10 }}
>
<input
type="checkbox"
checked={selectedNoteTitles.includes(note.title)}
onChange={() => toggleNoteSelection(note.title)}
/>
<span>{note.title}</span>
</label>
))
)}
</div>
</div>
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

<button
className={studyMode === "exam" ? "active" : ""}
onClick={() => setStudyMode("exam")}
>
Practice Exam
</button>

<button
className={studyMode === "match" ? "active" : ""}
onClick={() => setStudyMode("match")}
>
Match Mode
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
No flashcards available for this subject or note set.
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
No practice questions available for this subject or note set.
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

{studyMode === "exam" && (
<div className="study-card">
<h2>Practice Exam</h2>

{notesLoading ? (
<p>Loading notes...</p>
) : examQuestions.length === 0 ? (
<p style={{ opacity: 0.7 }}>
No exam questions available for this subject or note set.
</p>
) : (
<>
<div style={{ marginBottom: 16 }}>
<strong>Correct:</strong> {examCorrectCount} &nbsp; | &nbsp;
<strong>Wrong:</strong> {examWrongCount}
</div>

<div className="practice-question">
<p style={{ fontWeight: 700 }}>
Question {examIndex + 1} of {examQuestions.length}
</p>

<p>{currentExam.question}</p>

{currentExam.type === "mc" && (
<div style={{ display: "grid", gap: 10, marginTop: 14 }}>
{currentExam.options.map((option, i) => (
<button
key={option}
type="button"
onClick={() => !examSubmitted && setExamSelectedChoice(option)}
style={{
textAlign: "left",
padding: "12px",
borderRadius: "10px",
border: "1px solid #d9d9d9",
background:
examSelectedChoice === option ? "#dff1ff" : "#fff",
}}
>
{String.fromCharCode(65 + i)}. {option}
</button>
))}
</div>
)}

{currentExam.type === "tf" && (
<div style={{ display: "grid", gap: 10, marginTop: 14 }}>
{["True", "False"].map((option) => (
<button
key={option}
type="button"
onClick={() => !examSubmitted && setExamSelectedChoice(option)}
style={{
textAlign: "left",
padding: "12px",
borderRadius: "10px",
border: "1px solid #d9d9d9",
background:
examSelectedChoice === option ? "#dff1ff" : "#fff",
}}
>
{option}
</button>
))}
</div>
)}

{currentExam.type === "fill" && (
<div style={{ marginTop: 14 }}>
<input
type="text"
value={examTypedAnswer}
onChange={(e) => setExamTypedAnswer(e.target.value)}
placeholder="Type your answer..."
style={{
width: "100%",
padding: "12px",
borderRadius: "10px",
border: "1px solid #d9d9d9",
}}
/>
</div>
)}

{!examSubmitted ? (
<button
style={{ marginTop: 14 }}
onClick={submitExamAnswer}
disabled={
(currentExam.type === "fill" && !examTypedAnswer.trim()) ||
((currentExam.type === "mc" || currentExam.type === "tf") &&
!examSelectedChoice)
}
>
Submit Answer
</button>
) : (
<div style={{ marginTop: 14 }}>
<p style={{ fontWeight: 700 }}>
{examResults[examResults.length - 1]?.correct
? "Correct ✅"
: `Wrong ❌ Correct answer: ${currentExam.correctAnswer}`}
</p>

{examIndex < examQuestions.length - 1 ? (
<button onClick={nextExamQuestion}>Next Question</button>
) : (
<button onClick={restartExam}>Restart Exam</button>
)}
</div>
)}
</div>
</>
)}
</div>
)}

{studyMode === "match" && (
<div className="study-card">
<h2>Match Mode</h2>

{notesLoading ? (
<p>Loading notes...</p>
) : matchPairs.length === 0 ? (
<p style={{ opacity: 0.7 }}>
No match pairs available for this subject or note set.
</p>
) : (
<>
<div style={{ marginBottom: 16 }}>
<strong>Correct:</strong> {matchCorrectCount} &nbsp; | &nbsp;
<strong>Wrong:</strong> {matchWrongCount}
</div>

{matchMessage ? (
<div style={{ marginBottom: 12, fontWeight: 700 }}>{matchMessage}</div>
) : null}

<div
style={{
display: "grid",
gridTemplateColumns: "1fr 1fr",
gap: 18,
}}
>
<div>
<h3 style={{ marginTop: 0 }}>Terms</h3>
<div style={{ display: "grid", gap: 10 }}>
{matchPairs.map((pair) => (
<div
key={pair.id}
draggable={!matchedIds.includes(pair.id)}
onDragStart={() => handleDragStart(pair.id)}
style={{
padding: 12,
borderRadius: 10,
border: "1px solid #d9d9d9",
background: matchedIds.includes(pair.id) ? "#dff7e8" : "#fff",
opacity: matchedIds.includes(pair.id) ? 0.6 : 1,
cursor: matchedIds.includes(pair.id) ? "default" : "grab",
}}
>
{pair.term}
</div>
))}
</div>
</div>

<div>
<h3 style={{ marginTop: 0 }}>Definitions</h3>
<div style={{ display: "grid", gap: 10 }}>
{matchDefinitions.map((pair) => (
<div
key={pair.id}
onDragOver={(e) => e.preventDefault()}
onDrop={() => handleDrop(pair.id)}
style={{
padding: 12,
borderRadius: 10,
border: "2px dashed #94a3b8",
background: matchedIds.includes(pair.id) ? "#dff7e8" : "#fff",
minHeight: 52,
}}
>
{pair.definition}
</div>
))}
</div>
</div>
</div>

<div style={{ marginTop: 18 }}>
<button onClick={restartMatchMode}>Restart Match Mode</button>
</div>
</>
)}
</div>
)}
</div>
);
}