import { useState } from "react";
import { login } from "../api";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password); // from api.js

      // api.js already saved token to localStorage (if you used my updated api.js)
      // but we still set state so App rerenders immediately
      if (!data?.token) {
        throw new Error("No token returned from server.");
      }

      setUser(data.token);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} style={{ maxWidth: 360 }}>
      <h2>Log In</h2>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
      />

      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password"
        autoComplete="current-password"
      />

      <button type="submit" disabled={loading || !email || !password}>
        {loading ? "Logging in..." : "Log In"}
      </button>

      {error && (
        <div style={{ marginTop: 10, color: "salmon", fontSize: 13 }}>
          {error}
        </div>
      )}
    </form>
  );
}