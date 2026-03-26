// src/api.js
const API_URL = "http://localhost:3000";

/**
 * Low-level request helper:
 * - Adds JSON headers
 * - Adds Authorization header if token exists
 * - Throws useful errors when backend responds with a failure
 */
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

  // Try to parse JSON either way (many APIs return JSON for errors too)
  let data = null;
  try {
    data = await res.json();
  } catch {
    // If server returned non-JSON
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

// ---------- Auth ----------
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

  // backend returns { token }
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


// ---------- Notes (Protected) ----------
export async function createNote({ title, content }) {
    return request("/notes", {
      method: "POST",
      body: { title, content },
    });
  }
  
  export async function getNotes() {
    return request("/notes");
  }
  
  export async function deleteNote(id) {
    return request(`/notes/${id}`, { method: "DELETE" });
  }