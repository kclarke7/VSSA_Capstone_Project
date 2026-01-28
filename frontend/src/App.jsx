import { useEffect, useMemo, useState } from "react";

function formatTime(totalSeconds) {
const m = Math.floor(totalSeconds / 60);
const s = totalSeconds % 60;
return `${m}:${String(s).padStart(2, "0")}`;
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

// If user changes mode or preset while NOT running, update the clock
useEffect(() => {
if (!isRunning) setSecondsLeft(initialSeconds);
}, [initialSeconds, isRunning]);

// Countdown
useEffect(() => {
if (!isRunning) return;

const id = setInterval(() => {
setSecondsLeft((prev) => {
if (prev <= 1) return 0;
return prev - 1;
});
}, 1000);

return () => clearInterval(id);
}, [isRunning]);

// When timer hits 0, stop
useEffect(() => {
if (secondsLeft === 0 && isRunning) {
setIsRunning(false);
}
}, [secondsLeft, isRunning]);

const title = mode === "study" ? "Study Session" : "Break";
const done = secondsLeft === 0;

function start() {
if (secondsLeft === 0) setSecondsLeft(initialSeconds);
setIsRunning(true);
}

function pause() {
setIsRunning(false);
}

function reset() {
setIsRunning(false);
setSecondsLeft(initialSeconds);
}

function switchMode(newMode) {
setIsRunning(false);
setMode(newMode);
// secondsLeft will update via initialSeconds effect
}

return (
<div style={{ fontFamily: "system-ui, Arial", padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
<h1>VSSA</h1>

<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
<button onClick={() => switchMode("study")} disabled={mode === "study"}>
Study
</button>
<button onClick={() => switchMode("break")} disabled={mode === "break"}>
Break
</button>
</div>

<h2 style={{ marginTop: 0 }}>{title}</h2>

<div style={{ fontSize: "4rem", fontWeight: 700, margin: "1rem 0" }}>
{formatTime(secondsLeft)}
</div>

{done && (
<p style={{ marginTop: 0 }}>
✅ Timer finished. Hit <b>Start</b> to run again or switch modes.
</p>
)}

<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
{!isRunning ? (
<button onClick={start}>Start</button>
) : (
<button onClick={pause}>Pause</button>
)}
<button onClick={reset}>Reset</button>
</div>

<div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
<div>
<h3>Study Preset</h3>
<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
{STUDY_PRESETS.map((m) => (
<button
key={m}
onClick={() => {
setStudyMinutes(m);
if (mode === "study" && !isRunning) setSecondsLeft(m * 60);
}}
disabled={mode === "study" && studyMinutes === m}
>
{m} min
</button>
))}
</div>
</div>

<div>
<h3>Break Preset</h3>
<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
{BREAK_PRESETS.map((m) => (
<button
key={m}
onClick={() => {
setBreakMinutes(m);
if (mode === "break" && !isRunning) setSecondsLeft(m * 60);
}}
disabled={mode === "break" && breakMinutes === m}
>
{m} min
</button>
))}
</div>
</div>
</div>

<hr style={{ margin: "2rem 0" }} />
<p style={{ opacity: 0.7, margin: 0 }}>
Tip: keep your terminal running (<code>npm run dev</code>) so the page auto-refreshes when you save.
</p>
</div>
);
}