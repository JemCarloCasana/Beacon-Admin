const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export function toApiUrl(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  const normalizedPath = raw.replace(/\\/g, "/");
  if (normalizedPath.startsWith("/")) return `${API_BASE_URL}${normalizedPath}`;
  return `${API_BASE_URL}/${normalizedPath}`;
}

export default toApiUrl;
