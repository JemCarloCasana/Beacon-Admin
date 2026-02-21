const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export async function adminLogin({ email, password }) {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseJson(res);
}

export async function adminSignup({ full_name, email, password, role }) {
  const res = await fetch(`${API_BASE}/admin/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name, email, password, role }),
  });

  return parseJson(res);
}
