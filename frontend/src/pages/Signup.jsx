import { useState } from "react";
import { register } from "../api";
import "../styles/auth.css";

export default function Signup({ setShowSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    try {
      await register(email, password);
      alert("Account created. Please log in.");
      setShowSignup(false); // go back to login
    } catch (err) {
      alert(err.message || "Signup failed");
    }
  }

  return (
    <>
      <h1 className="auth-title">Create Account</h1>
      <p className="auth-subtitle">Start using VSSA</p>

      <form onSubmit={handleSignup} className="auth-form">
        <input
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <button className="auth-button" type="submit">
          Create Account
        </button>
      </form>
    </>
  );
}