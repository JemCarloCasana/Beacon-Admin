import { filterServiceAreaMarkers, isInsideServiceArea, validateServiceArea } from "./serviceArea";

const ring = [[0, 0], [8, 0], [8, 8], [4, 4], [0, 8], [0, 0]];
const hole = [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]];
const island = [[[10, 0], [12, 0], [12, 2], [10, 2], [10, 0]]];
const feature = (geometry) => ({
  type: "Feature",
  properties: { name: "Dagupan City", boundary_id: "dpwh-2022-03-dagupan" },
  geometry,
});
const area = {
  type: "FeatureCollection",
  bbox: [0, 0, 12, 8],
  features: [feature({ type: "MultiPolygon", coordinates: [[ring, hole], island] })],
};

describe("service area geometry", () => {
  it("uses the polygon rather than its bounding box, including islands and holes", () => {
    expect(validateServiceArea(area)).toBe(area);
    expect(isInsideServiceArea(area, 3, 3)).toBe(true);
    expect(isInsideServiceArea(area, 4, 7)).toBe(false); // concave gap inside bbox
    expect(isInsideServiceArea(area, 1.5, 1.5)).toBe(false);
    expect(isInsideServiceArea(area, 11, 1)).toBe(true);
    expect(isInsideServiceArea(area, 9, 1)).toBe(false);
    expect(isInsideServiceArea(area, 20, 20)).toBe(false);
  });

  it("accepts horizontal, vertical, diagonal, vertex and hole edges", () => {
    for (const [lng, lat] of [[3, 0], [0, 3], [6, 6], [8, 8], [1, 1.5], [2, 2]]) {
      expect(isInsideServiceArea(area, lng, lat), `${lng}, ${lat}`).toBe(true);
    }
  });

  it("does not treat the interior of a tiny bounding box as a polygon edge", () => {
    const tiny = { ...area, bbox: [1, 1, 1.000001, 1.000001], features: [feature({
      type: "Polygon", coordinates: [[[1, 1], [1.000001, 1], [1, 1.000001], [1, 1]]],
    })] };
    expect(isInsideServiceArea(validateServiceArea(tiny), 1.0000009, 1.0000009)).toBe(false);
    expect(isInsideServiceArea(tiny, 1.0000005, 1.0000005)).toBe(true);
  });

  it("supports Polygon features and rejects invalid coordinates", () => {
    const polygonArea = { ...area, features: [feature({ type: "Polygon", coordinates: [ring] })] };
    expect(validateServiceArea(polygonArea)).toBe(polygonArea);
    expect(isInsideServiceArea(polygonArea, 3, 3)).toBe(true);
    for (const [lng, lat] of [[NaN, 2], [3, Infinity], [181, 2], [3, -91], [null, 2], ["3", 2]]) {
      expect(isInsideServiceArea(polygonArea, lng, lat)).toBe(false);
    }
  });

  it("filters only map markers without mutating historical records or coordinates", () => {
    const markers = [{ id: "in", lng: 3, lat: 3 }, { id: "out", lng: 4, lat: 7 }, { id: "hole", lng: 1.5, lat: 1.5 }];
    const original = structuredClone(markers);
    const filtered = filterServiceAreaMarkers(markers, area);
    expect(filtered).toEqual([markers[0]]);
    expect(filtered[0]).toBe(markers[0]);
    expect(markers).toEqual(original);
    expect(filterServiceAreaMarkers(markers, null)).toEqual([]);
  });

  it.each([
    null,
    { ...area, bbox: [0, 0, Infinity, 8] },
    { ...area, bbox: [12, 0, 0, 8] },
    { ...area, features: [] },
    { ...area, features: [feature({ type: "Point", coordinates: [0, 0] })] },
    { ...area, features: [feature({ type: "Polygon", coordinates: [[[0, 0], [8, 0], [8, 8], [0, 8]]] })] },
    { ...area, features: [feature({ type: "Polygon", coordinates: [[[0, 0], [13, 0], [8, 8], [0, 0]]] })] },
    { ...area, features: [{ ...area.features[0], properties: { name: "Another city" } }] },
  ])("fails closed when the boundary payload is invalid", (invalid) => {
    expect(() => validateServiceArea(invalid)).toThrow(/invalid Dagupan City boundary/);
  });
});
