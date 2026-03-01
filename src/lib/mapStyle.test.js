import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_HQ_COORDINATES } from "@/lib/mapStyle";

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
