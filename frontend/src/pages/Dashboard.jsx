import "../styles/dashboard.css";
import Study from "./Study";
import { useEffect, useRef, useState } from "react";
import Notes from "./Notes";
import { createNote } from "../api";
import { loadJSON } from "../storage";

import { Line, Bar } from "react-chartjs-2";
import {
Chart as ChartJS,
CategoryScale,
LinearScale,
BarElement,
PointElement,
LineElement,
Title,
Tooltip,
Legend,
} from "chart.js";

ChartJS.register(
CategoryScale,
LinearScale,
BarElement,
PointElement,
LineElement,
Title,
Tooltip,
Legend
);

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

function formatMinutes(seconds) {
return (seconds / 60).toFixed(1);
}

function getAccuracy(correct, answered) {
return answered > 0 ? Math.round((correct / answered) * 100) : 0;
}

function inferSubjectFromTitle(title = "") {
const clean = String(title)
.replace(/\.[^.]+$/, "")
.replace(/[_-]+/g, " ")
.toLowerCase()
.trim();

if (
clean.includes("computer science") ||
clean.includes("computer_science") ||
clean.includes("comp sci") ||
clean.includes("cs")
) {
return "Computer Science";
}
if (clean.includes("bio") || clean.includes("biology")) return "Biology";
if (clean.includes("math")) return "Math";
if (clean.includes("business")) return "Business";
if (clean.includes("psych") || clean.includes("psychology")) return "Psychology";

const firstWord = clean.split(/\s+/)[0];
if (!firstWord) return "General";
return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

function getEncouragement(analytics) {
const totalAnswered =
(analytics.quiz?.answered || 0) +
(analytics.exam?.answered || 0) +
(analytics.match?.answered || 0);

const totalCorrect =
(analytics.quiz?.correct || 0) +
(analytics.exam?.correct || 0) +
(analytics.match?.correct || 0);

const accuracy = getAccuracy(totalCorrect, totalAnswered);

const totalStudyTime =
(analytics.timeSpentSeconds.timer || 0) +
(analytics.timeSpentSeconds.flashcards || 0) +
(analytics.timeSpentSeconds.practice || 0) +
(analytics.timeSpentSeconds.exam || 0) +
(analytics.timeSpentSeconds.match || 0);

if (analytics.studySessionsCompleted >= 3 && accuracy >= 80) {
return "Excellent work. Your consistency and overall performance are strong.";
}

if (analytics.studySessionsCompleted >= 1 && totalCorrect >= 5) {
return "Nice progress. Your study routine is becoming more effective.";
}

if ((analytics.flashcardsViewed || 0) >= 5) {
return "Good review session. Flashcards are helping reinforce your memory.";
}

if (totalStudyTime >= 600) {
return "Great effort. You are putting in serious study time.";
}

return "Good start. Keep studying and the dashboard will show more personalized feedback.";
}

function getFocusInsight(analytics) {
const c = analytics.focus?.correlations || {};

const loudAnswered = (c.loudCorrect || 0) + (c.loudWrong || 0);
const quietAnswered = (c.quietCorrect || 0) + (c.quietWrong || 0);
const motionAnswered = (c.motionCorrect || 0) + (c.motionWrong || 0);
const stillAnswered = (c.stillCorrect || 0) + (c.stillWrong || 0);

const loudAccuracy = getAccuracy(c.loudCorrect || 0, loudAnswered);
const quietAccuracy = getAccuracy(c.quietCorrect || 0, quietAnswered);
const motionAccuracy = getAccuracy(c.motionCorrect || 0, motionAnswered);
const stillAccuracy = getAccuracy(c.stillCorrect || 0, stillAnswered);

if (loudAnswered >= 2 || quietAnswered >= 2) {
if (quietAccuracy > loudAccuracy) {
return "You seem to perform better in quieter environments.";
}
if (loudAccuracy > quietAccuracy) {
return "You seem to perform better when there is more background noise.";
}
}

if (motionAnswered >= 2 || stillAnswered >= 2) {
if (stillAccuracy > motionAccuracy) {
return "You perform better when camera movement is low and you stay still.";
}
if (motionAccuracy > stillAccuracy) {
return "You perform better when there is more movement during study sessions.";
}
}

return "Use a few more study sessions with mic and camera enabled to unlock stronger focus insights.";
}

function getSubjectSummaries(subjectPerformance) {
const rows = Object.entries(subjectPerformance || {}).map(([subject, stats]) => {
const answered = stats.totalAnswered || 0;
const correct = stats.totalCorrect || 0;
const wrong = stats.totalWrong || 0;
const accuracy = getAccuracy(correct, answered);

return {
subject,
answered,
correct,
wrong,
accuracy,
};
});

rows.sort((a, b) => b.accuracy - a.accuracy || b.answered - a.answered);
return rows;
}

export default function Dashboard({ onLogout }) {
const [activePage, setActivePage] = useState("Dashboard");
const [notesRefreshKey, setNotesRefreshKey] = useState(0);
const [analytics, setAnalytics] = useState(() =>
ensureAnalyticsShape(loadJSON("vssa_analytics", getDefaultAnalytics()))
);
const fileRef = useRef(null);

useEffect(() => {
const syncAnalytics = () => {
setAnalytics(
ensureAnalyticsShape(loadJSON("vssa_analytics", getDefaultAnalytics()))
);
};

syncAnalytics();

const t = setInterval(syncAnalytics, 1000);
window.addEventListener("focus", syncAnalytics);

return () => {
clearInterval(t);
window.removeEventListener("focus", syncAnalytics);
};
}, []);

function openUpload() {
fileRef.current?.click();
}

async function handleUpload(e) {
const file = e.target.files?.[0];
if (!file) return;

const name = file.name.toLowerCase();
const isText =
file.type.startsWith("text/") ||
name.endsWith(".txt") ||
name.endsWith(".md");

if (!isText) {
alert("For now, upload .txt or .md notes. (PDF next.)");
e.target.value = "";
return;
}

const content = await file.text();
const title = file.name.replace(/\.[^.]+$/, "");
const subject = inferSubjectFromTitle(file.name);

try {
await createNote({ title, content, subject });
setActivePage("Notes");
setNotesRefreshKey((k) => k + 1);
} catch (err) {
console.error(err);
alert(err.message || "Upload failed");
} finally {
e.target.value = "";
}
}

const timerMinutes = Number(formatMinutes(analytics.timeSpentSeconds.timer || 0));
const flashcardMinutes = Number(formatMinutes(analytics.timeSpentSeconds.flashcards || 0));
const practiceMinutes = Number(formatMinutes(analytics.timeSpentSeconds.practice || 0));
const examMinutes = Number(formatMinutes(analytics.timeSpentSeconds.exam || 0));
const matchMinutes = Number(formatMinutes(analytics.timeSpentSeconds.match || 0));

const totalAnswered =
(analytics.quiz?.answered || 0) +
(analytics.exam?.answered || 0) +
(analytics.match?.answered || 0);

const totalCorrect =
(analytics.quiz?.correct || 0) +
(analytics.exam?.correct || 0) +
(analytics.match?.correct || 0);

const totalWrong =
(analytics.quiz?.wrong || 0) +
(analytics.exam?.wrong || 0) +
(analytics.match?.wrong || 0);

const overallAccuracy = getAccuracy(totalCorrect, totalAnswered);

const lineData = {
labels: ["Timer", "Flashcards", "Practice Quiz", "Practice Exam", "Match Mode"],
datasets: [
{
label: "Minutes Spent",
data: [
timerMinutes,
flashcardMinutes,
practiceMinutes,
examMinutes,
matchMinutes,
],
borderColor: "#00c6ff",
backgroundColor: "rgba(0, 198, 255, 0.18)",
tension: 0.35,
pointRadius: 4,
pointHoverRadius: 6,
},
],
};

const lineOptions = {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: { display: false },
title: { display: true, text: "Time Spent by Study Activity" },
},
scales: { y: { beginAtZero: true } },
};

const barData = {
labels: ["Correct", "Wrong", "Sessions", "Flashcards", "Exams", "Matches"],
datasets: [
{
label: "Performance",
data: [
totalCorrect,
totalWrong,
analytics.studySessionsCompleted,
analytics.flashcardsViewed,
analytics.exam?.completedRounds || 0,
analytics.match?.completedRounds || 0,
],
backgroundColor: "#00c6ff",
borderRadius: 6,
},
],
};

const barOptions = {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: { display: false },
title: { display: true, text: "Study Performance Summary" },
},
scales: { y: { beginAtZero: true } },
};

const subjectRows = getSubjectSummaries(analytics.subjectPerformance);
const bestSubject = subjectRows.length ? subjectRows[0] : null;
const weakestSubject = subjectRows.length ? subjectRows[subjectRows.length - 1] : null;

return (
<div className="vssa">
<aside className="vssa__sidebar">
<div className="vssa__brand">VSSA</div>

<nav className="vssa__nav">
{["Dashboard", "Notes", "Study", "Settings", "Help"].map((item) => (
<button
key={item}
className={`vssa__navItem ${activePage === item ? "is-active" : ""}`}
type="button"
onClick={() => setActivePage(item)}
>
{item}
</button>
))}
</nav>

<button className="vssa__logout" type="button" onClick={onLogout}>
Log out
</button>
</aside>

<main className="vssa__main">
<header className="vssa__header">
<h1 className="vssa__title">VSSA Dashboard</h1>

<button className="vssa__cta" type="button" onClick={openUpload}>
+ Upload Notes
</button>

<input
ref={fileRef}
type="file"
accept=".txt,.md"
style={{ display: "none" }}
onChange={handleUpload}
/>

<div className="vssa__profile">
<span className="vssa__name">Jane Doe</span>
<img
className="vssa__avatar"
src="https://i.pravatar.cc/44"
alt="Profile"
/>
</div>
</header>

<section className="vssa__content">
{activePage === "Notes" ? (
<Notes refreshKey={notesRefreshKey} />
) : activePage === "Study" ? (
<Study />
) : (
<div className="vssa__grid">
<div className="card card--big">
<div className="card__header">
<h2 className="card__title">Report &amp; Analysis</h2>
</div>
<div className="card__chart card__chart--big">
<Line data={lineData} options={lineOptions} />
</div>
</div>

<div className="card">
<div className="card__header">
<h2 className="card__title">Study Patterns</h2>
</div>
<div className="card__chart card__chart--small">
<Bar data={barData} options={barOptions} />
</div>
</div>

<div className="card card--wide">
<div className="card__header">
<h2 className="card__title">Encouragement</h2>
</div>

<div className="encourage">
<div className="encourage__rating">
<span className="encourage__star">⭐</span>
<span>
Daily Rating:{" "}
{overallAccuracy >= 80
? "5/5"
: overallAccuracy >= 60
? "4/5"
: totalAnswered > 0 || analytics.studySessionsCompleted > 0
? "3/5"
: "2/5"}
</span>
</div>

<p className="encourage__quote">{getEncouragement(analytics)}</p>
</div>
</div>

<div className="card card--wide">
<div className="card__header">
<h2 className="card__title">Study Activity Breakdown</h2>
</div>

<div
style={{
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
gap: 14,
}}
>
<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Timer Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.timeSpentSeconds.timer || 0)} min
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Flashcard Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.timeSpentSeconds.flashcards || 0)} min
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Practice Quiz Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.timeSpentSeconds.practice || 0)} min
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Practice Exam Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.timeSpentSeconds.exam || 0)} min
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Match Mode Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.timeSpentSeconds.match || 0)} min
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Overall Accuracy</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{overallAccuracy}%
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Completed Sessions</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{analytics.studySessionsCompleted}
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Exams Completed</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{analytics.exam?.completedRounds || 0}
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Matches Completed</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{analytics.match?.completedRounds || 0}
</div>
</div>
</div>
</div>

<div className="card card--wide">
<div className="card__header">
<h2 className="card__title">Focus Analytics</h2>
</div>

<div
style={{
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
gap: 14,
}}
>
<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Mic Permission</div>
<div style={{ fontSize: 24, fontWeight: 800 }}>
{analytics.focus?.micPermission || "unknown"}
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Camera Permission</div>
<div style={{ fontSize: 24, fontWeight: 800 }}>
{analytics.focus?.cameraPermission || "unknown"}
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Loud Background Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.focus?.mic?.loudSeconds || 0)} min
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Quiet Background Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.focus?.mic?.quietSeconds || 0)} min
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Camera Motion Events</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{analytics.focus?.camera?.motionEvents || 0}
</div>
</div>

<div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16 }}>
<div style={{ fontSize: 13, opacity: 0.7 }}>Still Time</div>
<div style={{ fontSize: 28, fontWeight: 800 }}>
{formatMinutes(analytics.focus?.camera?.stillSeconds || 0)} min
</div>
</div>
</div>

<p style={{ marginTop: 16, fontWeight: 700 }}>
{getFocusInsight(analytics)}
</p>
</div>

<div className="card card--wide">
<div className="card__header">
<h2 className="card__title">Subject Performance</h2>
</div>

{subjectRows.length === 0 ? (
<p style={{ opacity: 0.7 }}>
Start answering questions to unlock subject performance insights.
</p>
) : (
<>
<div style={{ marginBottom: 16 }}>
<strong>Best Subject:</strong>{" "}
{bestSubject ? `${bestSubject.subject} (${bestSubject.accuracy}%)` : "N/A"}
<br />
<strong>Needs Most Work:</strong>{" "}
{weakestSubject
? `${weakestSubject.subject} (${weakestSubject.accuracy}%)`
: "N/A"}
</div>

<div style={{ display: "grid", gap: 10 }}>
{subjectRows.map((row) => (
<div
key={row.subject}
style={{
background: "#f7f8fc",
borderRadius: 12,
padding: 14,
display: "flex",
justifyContent: "space-between",
flexWrap: "wrap",
gap: 10,
}}
>
<strong>{row.subject}</strong>
<span>Answered: {row.answered}</span>
<span>Correct: {row.correct}</span>
<span>Wrong: {row.wrong}</span>
<span>Accuracy: {row.accuracy}%</span>
</div>
))}
</div>
</>
)}
</div>
</div>
)}
</section>
</main>
</div>
);
}
