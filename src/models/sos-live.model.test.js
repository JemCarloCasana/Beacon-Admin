import { toSosFeedAlert } from "@/models/sos-live.model";

describe("sos-live.model", () => {
  it("maps SosThread to LiveSOSFeed-compatible shape", () => {
    const result = toSosFeedAlert({
      sos_id: 123,
      user_id: 45,
      full_name: "Juan Dela Cruz",
      phone_number: "+639171234567",
      latest_status: "active",
      latest_message: "Need help",
      latest_latitude: 16.0431,
      latest_longitude: 120.3333,
      latest_address: "Dagupan City",
      latest_event_at: "2026-02-27T10:01:12.000Z",
    });

    expect(result).toEqual({
      id: "123",
      status: "active",
      timestamp: "2026-02-27T10:01:12.000Z",
      userName: "Juan Dela Cruz",
      userPhone: "+639171234567",
      message: "Need help",
      location: {
        latitude: 16.0431,
        longitude: 120.3333,
        address: "Dagupan City",
      },
      raw: expect.any(Object),
    });
  });

  it("handles null-safe fallbacks", () => {
    const result = toSosFeedAlert({
      user_id: 9,
      latest_status: null,
      latest_message: null,
      latest_address: null,
      latest_latitude: null,
      latest_longitude: null,
      latest_event_at: null,
    });

    expect(result.status).toBe("active");
    expect(result.userName).toBe("User #9");
    expect(result.location).toEqual({
      latitude: null,
      longitude: null,
      address: null,
    });
  });

  it("normalizes invalid latest coordinates to null", () => {
    const result = toSosFeedAlert({
      sos_id: 10,
      latest_latitude: "bad-latitude",
      latest_longitude: "120.12",
    });

    expect(result.location).toEqual({
      latitude: null,
      longitude: 120.12,
      address: null,
    });
  });
});
