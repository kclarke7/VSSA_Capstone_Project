import { useState } from "react";
import { login } from "../api";
import "../styles/auth.css";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const data = await login(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
    } catch (err) {
      alert(err.message || "Login failed");
    }
  }

  return (
    <>
      <h1 className="auth-title">VSSA</h1>
      <p className="auth-subtitle">Virtual Smart Study Assistant</p>

      <form onSubmit={handleLogin} className="auth-form">
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />

        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />

        <button className="auth-button" type="submit">
          Log In
        </button>
      </form>
    </>
  );
}