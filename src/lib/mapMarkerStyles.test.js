import { MAP_MARKER_LEGEND_ITEMS, MAP_MARKER_TYPE_STYLES } from "@/lib/mapMarkerStyles";

describe("mapMarkerStyles", () => {
  it("defines marker colors and radius by type", () => {
    expect(MAP_MARKER_TYPE_STYLES.sos).toMatchObject({
      label: "SOS",
      color: "#ef4444",
      radius: 8,
    });
    expect(MAP_MARKER_TYPE_STYLES.incident).toMatchObject({
      label: "Incidents",
      color: "#f59e0b",
      radius: 7,
    });
  });

  it("exports legend items from the same marker style source", () => {
    expect(MAP_MARKER_LEGEND_ITEMS).toEqual([
      { type: "sos", ...MAP_MARKER_TYPE_STYLES.sos },
      { type: "incident", ...MAP_MARKER_TYPE_STYLES.incident },
    ]);
  });
});
