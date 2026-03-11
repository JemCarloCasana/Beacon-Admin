export const MAP_MARKER_TYPE_STYLES = {
  sos: {
    label: "SOS",
    color: "#ef4444",
    radius: 8,
  },
  incident: {
    label: "Incidents",
    color: "#f59e0b",
    radius: 7,
  },
};

export const MAP_MARKER_LEGEND_ITEMS = [
  { type: "sos", ...MAP_MARKER_TYPE_STYLES.sos },
  { type: "incident", ...MAP_MARKER_TYPE_STYLES.incident },
];
