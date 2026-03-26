import { useEffect, useMemo, useState } from "react";
import { loadJSON, saveJSON } from "../storage";
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

export default function Study() {
  const [studyMode, setStudyMode] = useState("timer");
  const [flipped, setFlipped] = useState(false);

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
  const [sessionQueue, setSessionQueue] = useState([]);

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
    setMode((prev) => (prev === "study" ? "break" : "study"));
  }, [secondsLeft, isRunning]);

  useEffect(() => {
    if (!activeQuestionId) return;
    const stillExists = questions.some((q) => q.id === activeQuestionId);
    if (!stillExists) setActiveQuestionId(null);
  }, [questions, activeQuestionId]);

  const activeQuestion = useMemo(() => {
    if (!activeQuestionId) return null;
    return questions.find((q) => q.id === activeQuestionId) || null;
  }, [questions, activeQuestionId]);

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
    if (!isRunning && mode === "study") {
      startStudyQuestionSession();
    }
    setIsRunning((prev) => !prev);
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

          <div
            className={`flashcard ${flipped ? "flipped" : ""}`}
            onClick={() => setFlipped(!flipped)}
          >
            <div className="flashcard-inner">
              <div className="flashcard-front">
                What is a process in operating systems?
                <p className="flashcard-hint">Click to flip</p>
              </div>

              <div className="flashcard-back">
                A process is a program that is currently executing in memory.
              </div>
            </div>
          </div>

          <p className="flashcard-info">
            Flashcards will be automatically generated from uploaded notes.
          </p>
        </div>
      )}

      {studyMode === "practice" && (
        <div className="study-card">
          <h2>Practice Questions</h2>

          <div className="practice-question">
            <p>Which scheduling algorithm always chooses the shortest job first?</p>
            <button>Show Answer</button>
          </div>

          <p style={{ marginTop: 12, opacity: 0.7 }}>
            Questions will be generated automatically from uploaded notes.
          </p>
        </div>
      )}
    </div>
  );
}