import { useState } from "react";
console.log("LOGIN FILE LOADED");

export default function Login({setUser}) {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

async function handleLogin(e) {
e.preventDefault();

const res = await fetch("http://localhost:3000/auth/login", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ email, password }),
});

const data = await res.json();
if (!res.ok) return alert(data.message || "Login failed");

// Save login (token/session)
localStorage.setItem("token", data.token);

setUser(data.token);
}

return (
<form onSubmit={handleLogin}>
<h2>Log In</h2>
<input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" />
<input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="Password" />
<button type="submit">Log In</button>
</form>
);
}