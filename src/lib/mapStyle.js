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

export const MAP_DEFAULT_CENTER = MAP_HQ_COORDINATES;
export const MAP_DEFAULT_ZOOM = 13;
