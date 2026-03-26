import { useEffect, useState } from "react";
import { deleteNote, getNotes } from "../api";

export default function Notes({ refreshKey = 0 }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getNotes();
      setNotes(data.notes || []);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function handleDelete(id) {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
      alert(e.message || "Delete failed");
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ marginTop: 0 }}>Notes</h1>

      {loading ? (
        <div style={{ opacity: 0.7 }}>Loading…</div>
      ) : notes.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No notes yet. Upload a .txt or .md file.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 980 }}>
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 16,
                boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{n.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>

                <pre
                  style={{
                    marginTop: 10,
                    background: "#f7f8fc",
                    padding: 12,
                    borderRadius: 10,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 220,
                    overflow: "auto",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 13,
                  }}
                >
                  {n.content}
                </pre>
              </div>

              <button
                onClick={() => handleDelete(n.id)}
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "transparent",
                  padding: "8px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}