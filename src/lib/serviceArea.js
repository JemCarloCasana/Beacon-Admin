const EPSILON = 1e-9;

function isPosition(point) {
  return Array.isArray(point) && point.length >= 2 &&
    Number.isFinite(point[0]) && Math.abs(point[0]) <= 180 &&
    Number.isFinite(point[1]) && Math.abs(point[1]) <= 90;
}

export function validateServiceArea(area) {
  const bbox = area?.bbox;
  const validRing = (ring) => Array.isArray(ring) && ring.length >= 4 &&
    ring.every((point) => isPosition(point) &&
      point[0] >= bbox[0] - EPSILON && point[0] <= bbox[2] + EPSILON &&
      point[1] >= bbox[1] - EPSILON && point[1] <= bbox[3] + EPSILON) &&
    ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
  const validPolygon = (polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every(validRing);

  if (area?.type !== "FeatureCollection" || !Array.isArray(bbox) || bbox.length !== 4 ||
    !isPosition(bbox.slice(0, 2)) || !isPosition(bbox.slice(2)) ||
    bbox[0] >= bbox[2] || bbox[1] >= bbox[3] ||
    !Array.isArray(area.features) || !area.features.length ||
    !area.features.every((feature) => {
      if (feature?.type !== "Feature" || feature.properties?.name !== "Dagupan City" ||
        feature.properties?.boundary_id !== "dpwh-2022-03-dagupan") return false;
      const geometry = feature.geometry;
      if (geometry?.type === "Polygon") return validPolygon(geometry.coordinates);
      return geometry?.type === "MultiPolygon" && Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length > 0 && geometry.coordinates.every(validPolygon);
    })) {
    throw new Error("The backend returned an invalid Dagupan City boundary.");
  }
  return area;
}

// -1 outside, 0 on an edge, 1 inside. Edges of outer rings and holes are accepted.
function ringLocation(lng, lat, ring) {
  let inside = false;
  for (let i = 1; i < ring.length; i += 1) {
    const [ax, ay] = ring[i - 1];
    const [bx, by] = ring[i];
    const dx = bx - ax;
    const dy = by - ay;
    if (Math.abs((lng - ax) * dy - (lat - ay) * dx) <= EPSILON * Math.hypot(dx, dy) &&
      lng >= Math.min(ax, bx) - EPSILON && lng <= Math.max(ax, bx) + EPSILON &&
      lat >= Math.min(ay, by) - EPSILON && lat <= Math.max(ay, by) + EPSILON) return 0;
    if ((ay > lat) !== (by > lat) && lng < ax + (lat - ay) * dx / dy) inside = !inside;
  }
  return inside ? 1 : -1;
}

function inPolygon(lng, lat, polygon) {
  const outer = ringLocation(lng, lat, polygon[0]);
  if (outer <= 0) return outer === 0;
  for (const hole of polygon.slice(1)) {
    const location = ringLocation(lng, lat, hole);
    if (location === 0) return true;
    if (location === 1) return false;
  }
  return true;
}

export function isInsideServiceArea(area, lng, lat) {
  if (!area || !isPosition([lng, lat])) return false;
  const [west, south, east, north] = area.bbox;
  if (lng < west - EPSILON || lng > east + EPSILON || lat < south - EPSILON || lat > north + EPSILON) return false;
  return area.features.some(({ geometry }) => geometry.type === "Polygon"
    ? inPolygon(lng, lat, geometry.coordinates)
    : geometry.coordinates.some((polygon) => inPolygon(lng, lat, polygon)));
}

export function filterServiceAreaMarkers(markers, area) {
  return (Array.isArray(markers) ? markers : []).filter((marker) =>
    marker && isInsideServiceArea(area, marker.lng, marker.lat));
}
