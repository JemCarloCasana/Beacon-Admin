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

export const MAP_DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };
export const MAP_DEFAULT_ZOOM = 11;
