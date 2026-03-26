import { useEffect, useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { ping } from "./api";
import Dashboard from "./pages/Dashboard";

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
        <div style={{ padding: 24 }}>
          {showSignup ? (
            <Signup setShowSignup={setShowSignup} />
          ) : (
            <Login setUser={setUser} />
          )}
          <button onClick={() => setShowSignup((p) => !p)} style={{ marginTop: 12 }}>
            {showSignup ? "Back to Login" : "Create an account"}
          </button>
        </div>
      );
    }
  
    function handleLogout() {
      localStorage.removeItem("token");
      setUser(null);
    }
  
    return <Dashboard onLogout={handleLogout} />;
  }