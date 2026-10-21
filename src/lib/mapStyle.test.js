import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_HQ_COORDINATES, resolveThemeColor } from "@/lib/mapStyle";

describe("mapStyle constants", () => {
  it("uses HQ as map default center", () => {
    expect(MAP_HQ_COORDINATES).toEqual({
      lat: 16.043502806506392,
      lng: 120.3354064229617,
    });
    expect(MAP_DEFAULT_CENTER).toEqual(MAP_HQ_COORDINATES);
  });

  it("uses city-focused default zoom", () => {
    expect(MAP_DEFAULT_ZOOM).toBe(13);
  });
});

describe("resolveThemeColor", () => {
  it("resolves an hsl token to a colour MapLibre can parse", () => {
    document.documentElement.style.setProperty("--primary", "221 83% 53%");
    const resolved = resolveThemeColor("--primary", "#2563eb");

    expect(resolved).toBe("hsl(221 83% 53%)");
    // MapLibre's colour parser rejects var(), so it must not survive.
    expect(resolved).not.toContain("var(");
    document.documentElement.style.removeProperty("--primary");
  });

  it("falls back when the token is missing", () => {
    expect(resolveThemeColor("--no-such-token", "#2563eb")).toBe("#2563eb");
  });
});
