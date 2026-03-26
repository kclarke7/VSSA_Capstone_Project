require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** ---------------------------
 *  JWT Middleware (ONE version)
 *  --------------------------- */
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

/** ---------------------------
 *  Health routes
 *  --------------------------- */
app.get("/", (req, res) => res.send("Backend running"));
app.get("/ping", (req, res) => {
  console.log("PING HIT");
  res.json({ ok: true });
});

/** ---------------------------
 *  DB init
 *  --------------------------- */
async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function ensureNotesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

(async () => {
  try {
    await ensureUsersTable();
    await ensureNotesTable();
    console.log("DB tables ensured ✅");
  } catch (e) {
    console.error("DB init error:", e);
  }
})();

/** ---------------------------
 *  Auth routes
 *  --------------------------- */
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase(), password_hash]
    );

    return res.json({ user: result.rows[0] });
  } catch (err) {
    if (String(err).includes("duplicate key")) {
      return res.status(409).json({ message: "Email already exists" });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email.toLowerCase(),
    ]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/** ---------------------------
 *  Notes routes (Postgres + JWT)
 *  --------------------------- */

// Get all notes for current user
app.get("/notes", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      "SELECT id, title, content, created_at FROM notes WHERE user_id=$1 ORDER BY created_at DESC",
      [userId]
    );

    return res.json({ notes: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Create a note
app.post("/notes", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "title and content are required" });
    }

    const result = await pool.query(
      "INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING id, title, content, created_at",
      [userId, title, content]
    );

    return res.json({ note: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete a note
app.delete("/notes/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = Number(req.params.id);

    const result = await pool.query(
      "DELETE FROM notes WHERE id=$1 AND user_id=$2 RETURNING id",
      [noteId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));