const DEFAULT_STYLE_ID = "streets-v2";

export function getMapStyleConfig() {
  const apiKey = String(import.meta.env.VITE_MAPTILER_API_KEY || "").trim();
  const styleId = String(import.meta.env.VITE_MAPTILER_STYLE_ID || DEFAULT_STYLE_ID).trim();

  if (!apiKey) {
    return {
      isValid: false,
      error: "Missing VITE_MAPTILER_API_KEY. Add it to your environment to render the map.",
      styleUrl: null,
    };
  }

  return {
    isValid: true,
    error: null,
    styleUrl: `https://api.maptiler.com/maps/${styleId}/style.json?key=${apiKey}`,
  };
}

export const MAP_HQ_COORDINATES = {
  lat: 16.043502806506392,
  lng: 120.3354064229617,
};

/**
 * Resolve a theme token to a literal colour MapLibre can parse.
 *
 * MapLibre parses paint properties with its own colour parser, in a worker
 * that has no access to the document's CSS custom properties. Passing
 * "hsl(var(--primary))" to it fails with `color expected`, so the token is
 * resolved here, in the page, and the literal value is handed over.
 */
export function resolveThemeColor(variable, fallback) {
  if (typeof window === "undefined" || typeof document === "undefined") return fallback;

  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();

  if (!raw) return fallback;

  // The tokens hold HSL components ("221 83% 53%"), which need the hsl()
  // wrapper. A value that is already a colour is used as it is.
  return raw.includes("(") || raw.startsWith("#") ? raw : `hsl(${raw})`;
}

export const MAP_DEFAULT_CENTER = MAP_HQ_COORDINATES;
export const MAP_DEFAULT_ZOOM = 13;
