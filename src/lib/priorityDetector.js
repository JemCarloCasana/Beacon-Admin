export const PRIORITY_KEYWORDS = {
  critical: [
    "medical emergency",
    "heart attack",
    "cardiac arrest",
    "stroke",
    "unconscious",
    "fire",
    "sunog",
    "sonog",
    "nasusunog",
    "may sunog",
    "burning",
    "flames",
    "smoke",
  ],
  high: [
    "accident",
    "collision",
    "crash",
    "hit and run",
    "vehicle rollover",
  ],
  medium: [
    "suspicious activity",
    "suspicious",
    "harassment",
    "theft",
    "stolen",
    "snatching",
    "shoplifting",
  ],
  low: [
    "others",
    "other concern",
    "minor issue",
    "non-urgent",
    "noise complaint",
  ],
};

const PRIORITY_ORDER = ["critical", "high", "medium", "low"];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/([a-z])\1{2,}/g, "$1")
    .trim();
}

export function detectPriority(text) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return null;

  for (const priority of PRIORITY_ORDER) {
    const keywords = PRIORITY_KEYWORDS[priority] || [];
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;
      if (normalizedText.includes(normalizedKeyword)) {
        return {
          priority,
          keyword: keyword,
        };
      }
    }
  }

  return null;
}

export default detectPriority;
