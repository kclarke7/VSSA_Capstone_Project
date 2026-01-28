import { useState } from "react";
import "./App.css";

function App() {
const [studyMinutes, setStudyMinutes] = useState(25);
const [isStudying, setIsStudying] = useState(false);

const startStudy = () => {
setIsStudying(true);
};

const stopStudy = () => {
setIsStudying(false);
};

return (
<div style={{ padding: "2rem", fontFamily: "Arial" }}>
<h1>📚 VSSA – Virtual Smart Study Assistant</h1>

<p>
Current Study Time: <strong>{studyMinutes} minutes</strong>
</p>

{!isStudying ? (
<button onClick={startStudy}>Start Studying</button>
) : (
<button onClick={stopStudy}>Stop Studying</button>
)}

<div style={{ marginTop: "1rem" }}>
<button onClick={() => setStudyMinutes(15)}>15 min</button>{" "}
<button onClick={() => setStudyMinutes(25)}>25 min</button>{" "}
<button onClick={() => setStudyMinutes(50)}>50 min</button>
</div>

{isStudying && <p style={{ marginTop: "1rem" }}>⏳ Study session in progress...</p>}
</div>
);
}

export default App;