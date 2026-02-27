import { dedupeLatestSosByUser, toIncidentMarker, toRoutePreview, toSosMarker } from "@/models/map.model";

describe("map.model", () => {
  it("normalizes SOS marker coordinates from latest_latitude/latest_longitude", () => {
    const marker = toSosMarker({
      sos_id: 10,
      user_id: 7,
      full_name: "Juan Dela Cruz",
      latest_latitude: 16.04,
      latest_longitude: 120.33,
      latest_address: "Dagupan City",
      latest_status: "acknowledged",
      latest_event_at: "2026-02-27T12:00:00.000Z",
    });

    expect(marker).toBeTruthy();
    expect(marker.type).toBe("sos");
    expect(marker.lat).toBe(16.04);
    expect(marker.lng).toBe(120.33);
    expect(marker.title).toBe("Juan Dela Cruz");
    expect(marker.status).toBe("acknowledged");
    expect(marker.updatedAt).toBe("2026-02-27T12:00:00.000Z");
  });

  it("falls back to legacy SOS keys when latest_* fields are missing", () => {
    const marker = toSosMarker({
      id: 5,
      user_id: 8,
      user_name: "Legacy User",
      latitude: 14.7,
      longitude: 121.03,
      address: "Legacy Address",
      status: "active",
      created_at: "2026-02-27T00:00:00.000Z",
    });

    expect(marker).toBeTruthy();
    expect(marker.title).toBe("Legacy User");
    expect(marker.subtitle).toBe("Legacy Address");
    expect(marker.status).toBe("active");
    expect(marker.updatedAt).toBe("2026-02-27T00:00:00.000Z");
  });

  it("returns null marker for invalid SOS coordinates", () => {
    const marker = toSosMarker({
      sos_id: 1,
      user_id: 9,
      latest_latitude: null,
      latest_longitude: null,
    });

    expect(marker).toBeNull();
  });

  it("normalizes incident marker coordinates from nested location", () => {
    const marker = toIncidentMarker({
      id: 3,
      title: "Traffic",
      location: { lat: 14.6, lng: 121.01 },
      status: "pending",
    });

    expect(marker).toBeTruthy();
    expect(marker.type).toBe("incident");
    expect(marker.lat).toBe(14.6);
    expect(marker.lng).toBe(121.01);
  });

  it("dedupes SOS points by latest latest_event_at per user", () => {
    const result = dedupeLatestSosByUser([
      { id: 1, user_id: 99, latest_event_at: "2026-02-27T01:00:00.000Z" },
      { id: 2, user_id: 99, latest_event_at: "2026-02-27T02:00:00.000Z" },
      { id: 3, user_id: 1, latest_event_at: "2026-02-27T01:30:00.000Z" },
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.user_id === 99).id).toBe(2);
  });

  it("builds route preview line", () => {
    const route = toRoutePreview(
      { lat: 14.5, lng: 121.0 },
      { lat: 14.7, lng: 121.2 }
    );

    expect(route).toEqual({
      from: { lat: 14.5, lng: 121.0 },
      to: { lat: 14.7, lng: 121.2 },
      line: [
        [121.0, 14.5],
        [121.2, 14.7],
      ],
    });
  });
});
