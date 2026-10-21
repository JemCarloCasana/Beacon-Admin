import { MAP_MARKER_LEGEND_ITEMS, MAP_MARKER_TYPE_STYLES, MARKER_TYPES, markerLabel } from "@/lib/mapMarkerStyles";

describe("mapMarkerStyles", () => {
  it("defines marker colours, shapes and radius by type", () => {
    expect(MAP_MARKER_TYPE_STYLES.sos).toMatchObject({
      label: "SOS",
      color: "hsl(var(--emergency))",
      shape: "triangle",
    });
    expect(MAP_MARKER_TYPE_STYLES.incident).toMatchObject({
      label: "Incidents",
      color: "hsl(var(--warning))",
      shape: "circle",
    });
  });

  it("gives each marker type a shape as well as a colour", () => {
    expect(MARKER_TYPES.sos.shape).not.toBe(MARKER_TYPES.incident.shape);
  });

  it("uses theme tokens rather than raw hex", () => {
    for (const type of Object.values(MARKER_TYPES)) {
      expect(type.color).not.toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("exports legend items from the same marker style source", () => {
    expect(MAP_MARKER_LEGEND_ITEMS).toEqual([
      { type: "sos", ...MAP_MARKER_TYPE_STYLES.sos },
      { type: "incident", ...MAP_MARKER_TYPE_STYLES.incident },
    ]);
  });

  it("names a marker by its type and title", () => {
    expect(markerLabel("sos", "Medical Emergency")).toBe("SOS, Medical Emergency");
    expect(markerLabel("incident")).toBe("Incidents");
  });
});
