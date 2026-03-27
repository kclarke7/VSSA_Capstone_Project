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

function formatMinutes(seconds) {
  return (seconds / 60).toFixed(1);
}

function getEncouragement(analytics) {
  const accuracy =
    analytics.quiz.answered > 0
      ? Math.round((analytics.quiz.correct / analytics.quiz.answered) * 100)
      : 0;

  const totalStudyTime =
    analytics.timeSpentSeconds.timer +
    analytics.timeSpentSeconds.flashcards +
    analytics.timeSpentSeconds.practice;

  if (analytics.studySessionsCompleted >= 3 && accuracy >= 80) {
    return "Excellent work. Your consistency and quiz accuracy are both strong.";
  }

  if (analytics.studySessionsCompleted >= 1 && analytics.quiz.correct >= 3) {
    return "Nice progress. You are building a strong study routine.";
  }

  if (analytics.flashcardsViewed >= 5) {
    return "Good review session. Your flashcard practice is paying off.";
  }

  if (totalStudyTime >= 300) {
    return "Great effort. You are spending meaningful time studying.";
  }

  return "Good start. Upload notes, review flashcards, and keep building momentum.";
}

export default function Dashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [analytics, setAnalytics] = useState(() =>
    loadJSON("vssa_analytics", getDefaultAnalytics())
  );
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user")) || null;
  });

  const fileRef = useRef(null);

  useEffect(() => {
    const syncAnalytics = () => {
      setAnalytics(loadJSON("vssa_analytics", getDefaultAnalytics()));
    };

    syncAnalytics();

    const t = setInterval(syncAnalytics, 1000);
    window.addEventListener("focus", syncAnalytics);

    return () => {
      clearInterval(t);
      window.removeEventListener("focus", syncAnalytics);
    };
  }, []);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) {
      setUser(savedUser);
    }
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
      alert("For now, upload .txt or .md notes. (PDF/DOCX next.)");
      e.target.value = "";
      return;
    }

    const content = await file.text();
    const title = file.name.replace(/\.[^.]+$/, "");

    try {
      await createNote({ title, content });
      setActivePage("Notes");
      setNotesRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert(err.message || "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  const timerMinutes = Number(formatMinutes(analytics.timeSpentSeconds.timer));
  const flashcardMinutes = Number(formatMinutes(analytics.timeSpentSeconds.flashcards));
  const practiceMinutes = Number(formatMinutes(analytics.timeSpentSeconds.practice));

  const accuracy =
    analytics.quiz.answered > 0
      ? Math.round((analytics.quiz.correct / analytics.quiz.answered) * 100)
      : 0;

  const lineData = {
    labels: ["Timer", "Flashcards", "Practice Quiz"],
    datasets: [
      {
        label: "Minutes Spent",
        data: [timerMinutes, flashcardMinutes, practiceMinutes],
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
    labels: ["Correct", "Wrong", "Sessions", "Flashcards"],
    datasets: [
      {
        label: "Performance",
        data: [
          analytics.quiz.correct,
          analytics.quiz.wrong,
          analytics.studySessionsCompleted,
          analytics.flashcardsViewed,
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
            <span className="vssa__name">
              {user ? `${user.firstName} ${user.lastName}` : "Student User"}
            </span>
            <img
              className="vssa__avatar"
              src={user?.avatar || "/avatars/default.png"}
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
                      {accuracy >= 80
                        ? "5/5"
                        : accuracy >= 60
                        ? "4/5"
                        : analytics.quiz.answered > 0 || analytics.studySessionsCompleted > 0
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
                  <div
                    style={{
                      background: "#f7f8fc",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Timer Time</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {formatMinutes(analytics.timeSpentSeconds.timer)} min
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f7f8fc",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Flashcard Time</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {formatMinutes(analytics.timeSpentSeconds.flashcards)} min
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f7f8fc",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Practice Quiz Time</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {formatMinutes(analytics.timeSpentSeconds.practice)} min
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f7f8fc",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Quiz Accuracy</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{accuracy}%</div>
                  </div>

                  <div
                    style={{
                      background: "#f7f8fc",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Completed Sessions</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {analytics.studySessionsCompleted}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f7f8fc",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Flashcards Viewed</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {analytics.flashcardsViewed}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
} 