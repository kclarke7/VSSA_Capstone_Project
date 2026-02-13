import { useState } from "react";

export default function Signup() {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

async function handleSignup(e) {
e.preventDefault();

const res = await fetch("http://localhost:3000/auth/register", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ email, password }),
});

const data = await res.json();
if (!res.ok) return alert(data.message || "Signup failed");

alert("Account created. Now log in.");
window.location.href = "/login";
}

return (
<form onSubmit={handleSignup}>
<h2>Create Account</h2>
<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
<input
value={password}
onChange={(e) => setPassword(e.target.value)}
type="password"
placeholder="Password"
/>
<button type="submit">Sign Up</button>
</form>
);
}