import { useEffect, useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import { ping } from "./api";
import "./styles/auth.css";

export default function App() {
  const [user, setUser] = useState(localStorage.getItem("token"));
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    ping()
      .then((res) => console.log("Backend:", res))
      .catch((err) => console.error("Backend error:", err));
  }, []);

  if (!user) {
    return (
      <div className="auth-page">
  
        {/* animated background grid */}
        <div className="auth-grid" />
  
        <div className="auth-card">
          {showSignup ? (
            <Signup setShowSignup={setShowSignup} />
          ) : (
            <Login setUser={setUser} />
          )}
  
          <button
            className="auth-switch-btn"
            onClick={() => setShowSignup((p) => !p)}
            type="button"
          >
            {showSignup ? "Back to Login" : "Create an account"}
          </button>
        </div>
  
      </div>
    );
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return <Dashboard onLogout={handleLogout} />;
}