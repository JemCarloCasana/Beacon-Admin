/**
 * The map's marker vocabulary.
 *
 * A marker's SHAPE carries the meaning as much as its colour does: a
 * red/amber colour-vision deficiency must not be required to tell an SOS
 * from an incident. SOS markers are triangles, incident markers are circles.
 */
export const MARKER_TYPES = {
  sos: {
    label: "SOS",
    color: "hsl(var(--emergency))",
    shape: "triangle",
    radius: 11,
  },
  incident: {
    label: "Incidents",
    color: "hsl(var(--warning))",
    shape: "circle",
    radius: 9,
  },
};

// Kept under the previous name for existing importers.
export const MAP_MARKER_TYPE_STYLES = MARKER_TYPES;

export const MAP_MARKER_LEGEND_ITEMS = [
  { type: "sos", ...MARKER_TYPES.sos },
  { type: "incident", ...MARKER_TYPES.incident },
];

export function markerLabel(type, title) {
  const base = MARKER_TYPES[type]?.label || "Marker";
  return title ? `${base}, ${title}` : base;
}
