import { useEffect, useMemo, useState } from "react";
import { loadJSON, saveJSON } from "../storage";

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

export default function Study() {

  // durations in minutes
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

  // Keep timer display synced
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

  // Switch mode when timer hits 0
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
  // Questions
  // -------------------------------

  const [questions, setQuestions] = useState(() =>
    loadJSON("vssa_questions", [])
  );
  const [questionText, setQuestionText] = useState("");

  useEffect(() => {
    saveJSON("vssa_questions", questions);
  }, [questions]);

  function addQuestion() {
    const q = questionText.trim();
    if (!q) return;

    setQuestions((prev) => [
      { id: crypto.randomUUID(), text: q },
      ...prev,
    ]);

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

    const existing = new Set(
      questions.map((q) => q.text.toLowerCase())
    );

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
        .map((line) =>
          line.split(",")[0]?.replace(/^"|"$/g, "").trim()
        )
        .filter(Boolean);

      importQuestionsFromText(firstCol.join("\n"));
    } else {
      importQuestionsFromText(text);
    }

    e.target.value = "";
  }

  // -----------------------------------------
  // Random question per session
  // -----------------------------------------

  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [sessionQueue, setSessionQueue] = useState([]);

  useEffect(() => {
    if (!activeQuestionId) return;
    const stillExists = questions.some(
      (q) => q.id === activeQuestionId
    );
    if (!stillExists) setActiveQuestionId(null);
  }, [questions, activeQuestionId]);

  const activeQuestion = useMemo(() => {
    if (!activeQuestionId) return null;
    return (
      questions.find((q) => q.id === activeQuestionId) || null
    );
  }, [questions, activeQuestionId]);

  function startStudyQuestionSession() {
    if (mode !== "study") return;
    if (questions.length === 0) {
      setActiveQuestionId(null);
      setSessionQueue([]);
      return;
    }

    const ids = shuffleArray(questions.map((q) => q.id));
    setSessionQueue(ids);
    setActiveQuestionId(ids[0] ?? null);
  }

  function toggleStartPause() {
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
      <h1>Study Session</h1>

      <div className="row">
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

      <div className="timer">{formatTime(secondsLeft)}</div>

      <div className="row">
        <button onClick={toggleStartPause}>
          {isRunning ? "Pause" : "Start"}
        </button>
        <button onClick={handleReset}>Reset</button>
      </div>

      {/* Question during session */}
      {mode === "study" && isRunning && activeQuestion && (
        <div style={{ marginTop: 16 }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Current question
          </div>
          <div style={{ fontWeight: 600 }}>
            {activeQuestion.text}
          </div>
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      <h2>Study Questions</h2>

      <div className="row" style={{ gap: 10 }}>
        <input
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Type a study question..."
        />
        <button onClick={addQuestion}>Add</button>
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          type="file"
          accept=".txt,.csv"
          onChange={handleFileUpload}
        />
      </div>

      <ul style={{ marginTop: 16 }}>
        {questions.map((q) => (
          <li key={q.id}>
            {q.text}
            <button onClick={() => deleteQuestion(q.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}