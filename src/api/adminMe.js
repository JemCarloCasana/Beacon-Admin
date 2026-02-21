const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function getToken() {
  return localStorage.getItem("admin_token");
}

export function clearSession() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_me"); // optional if you ever stored it
}

export async function fetchAdminMe() {
  const token = getToken();
  if (!token) throw new Error("NO_TOKEN");

  const res = await fetch(`${API_BASE}/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearSession();
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) throw new Error(data.message || "Failed to fetch /admin/me");

  return data;
}
