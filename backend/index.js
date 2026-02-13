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

app.get("/", (req, res) => res.send("Backend running"));
app.get("/ping", (req, res) => {
    console.log("PING HIT");
    res.json({ok: true});
});

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
ensureUsersTable().catch((e) => console.error("DB init error:", e));

app.post("/auth/register", async (req, res) => {
try {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ message: "Email and password required" });

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
if (!email || !password) return res.status(400).json({ message: "Email and password required" });

const result = await pool.query("SELECT * FROM users WHERE email=$1", [email.toLowerCase()]);
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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));