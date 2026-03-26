import { useState } from "react";
import { register } from "../api";

export default function Signup({ setShowSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await register(email, password); // from api.js
      setSuccess("Account created! You can now log in.");

      // Switch back to login screen if parent provided function
      if (setShowSignup) {
        setTimeout(() => setShowSignup(false), 1000);
      }
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSignup} style={{ maxWidth: 360 }}>
      <h2>Create Account</h2>

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
        autoComplete="new-password"
      />

      <button type="submit" disabled={loading || !email || !password}>
        {loading ? "Creating..." : "Sign Up"}
      </button>

      {error && (
        <div style={{ marginTop: 10, color: "salmon", fontSize: 13 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: 10, color: "lightgreen", fontSize: 13 }}>
          {success}
        </div>
      )}
    </form>
  );
}