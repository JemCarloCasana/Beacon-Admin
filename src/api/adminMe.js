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
  if (!token) {
    const error = new Error("NO_TOKEN");
    error.status = 401;
    throw error;
  }

  const requestOptions = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
  };

  let res = await fetch(`${API_BASE}/admin/me`, requestOptions);
  let data = await res.json().catch(() => ({}));

  if (res.status === 304) {
    res = await fetch(`${API_BASE}/admin/me?_=${Date.now()}`, requestOptions);
    data = await res.json().catch(() => ({}));
  }

  if (res.status === 401) {
    const error = new Error(data?.message || "UNAUTHORIZED");
    error.status = 401;
    error.data = data;
    throw error;
  }
  if (!res.ok) {
    const error = new Error(data?.message || "Failed to fetch /admin/me");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}
