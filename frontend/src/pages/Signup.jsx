import { useState } from "react";
import { register } from "../api";
import "../styles/auth.css";

const avatarOptions = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
];

export default function Signup({ setShowSignup }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(avatarOptions[0]);

  async function handleSignup(e) {
    e.preventDefault();

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        avatar,
      });

      alert("Account created. Please log in.");
      setShowSignup(false);
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
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          required
        />

        <input
          className="auth-input"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name"
          required
        />

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

        <label className="auth-label">Choose an Avatar</label>
        <div className="avatar-picker">
          {avatarOptions.map((option) => (
            <img
              key={option}
              src={option}
              alt="Avatar option"
              className={`avatar-option ${avatar === option ? "selected" : ""}`}
              onClick={() => setAvatar(option)}
            />
          ))}
        </div>

        <button className="auth-button" type="submit">
          Create Account
        </button>
      </form>
    </>
  );
}