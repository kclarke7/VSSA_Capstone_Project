import "../styles/dashboard.css";

import { useRef, useState } from "react";
import Notes from "./Notes";
import { createNote } from "../api";

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

export default function Dashboard({ onLogout }) {
    const [activePage, setActivePage] = useState("Dashboard");
    const [notesRefreshKey, setNotesRefreshKey] = useState(0);
    const fileRef = useRef(null);
  
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
  const lineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Study Hours",
        data: [2, 3, 1.5, 4, 3, 2, 5],
        borderColor: "#00c6ff",
        backgroundColor: "rgba(0, 198, 255, 0.18)",
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Weekly Study Hours" },
    },
    scales: { y: { beginAtZero: true } },
  };

  const barData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Sessions Completed",
        data: [3, 4, 2, 5, 3, 1, 4],
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
      title: { display: true, text: "Weekly Study Sessions" },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="vssa">
      {/* Sidebar */}
      <aside className="vssa__sidebar">
        <div className="vssa__brand">VSSA</div>

        <nav className="vssa__nav">
        {["Dashboard", "Notes", "Study","Settings", "Help"].map((item) => (
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

      {/* Main */}
      <main className="vssa__main">
        {/* Header */}
        <header className="vssa__header">
          <h1 className="vssa__title">VSSA Dashboard</h1>

          <button className="vssa__cta" type="button" onClick={openUpload}>
            + Upload Notes </button>

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

        {/* Content */}
        <section className="vssa__content">
  {activePage === "Notes" ? (
    <Notes refreshKey={notesRefreshKey} />
  ) : (
    <div className="vssa__grid">
      {/* Big left chart */}
      <div className="card card--big">
        <div className="card__header">
          <h2 className="card__title">Report &amp; Analysis</h2>
        </div>
        <div className="card__chart card__chart--big">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* Right chart */}
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Study Patterns</h2>
        </div>
        <div className="card__chart card__chart--small">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      {/* Encouragement spans left column */}
      <div className="card card--wide">
        <div className="card__header">
          <h2 className="card__title">Encouragement</h2>
        </div>

        <div className="encourage">
          <div className="encourage__rating">
            <span className="encourage__star">⭐</span>
            <span>Daily Rating: 4/5</span>
          </div>

          <p className="encourage__quote">
            “Great job! Keep up your consistent study streak!”
          </p>
        </div>
      </div>
    </div>
  )}
</section>
      </main>
    </div>
  );
}