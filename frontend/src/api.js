const API_URL = "http://localhost:3000";

async function request(path, { method = "GET", body, token } = {}) {
const headers = {
"Content-Type": "application/json",
};

const authToken = token ?? localStorage.getItem("token");
if (authToken) {
headers.Authorization = `Bearer ${authToken}`;
}

const res = await fetch(`${API_URL}${path}`, {
method,
headers,
body: body ? JSON.stringify(body) : undefined,
});

let data = null;
try {
data = await res.json();
} catch {
data = null;
}

if (!res.ok) {
const msg =
(data && (data.message || data.error)) ||
`Request failed: ${res.status} ${res.statusText}`;
throw new Error(msg);
}

return data;
}

export async function register(email, password) {
return request("/auth/register", {
method: "POST",
body: { email, password },
});
}

export async function login(email, password) {
const data = await request("/auth/login", {
method: "POST",
body: { email, password },
});

if (data?.token) {
localStorage.setItem("token", data.token);
}
return data;
}

export function logout() {
localStorage.removeItem("token");
}

export async function ping() {
return request("/ping");
}

export async function createNote({ title, content, subject }) {
return request("/notes", {
method: "POST",
body: { title, content, subject },
});
}

export async function getNotes() {
return request("/notes");
}

export async function deleteNote(id) {
return request(`/notes/${id}`, { method: "DELETE" });
}
