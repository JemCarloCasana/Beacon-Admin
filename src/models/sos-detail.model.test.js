import { deriveEmergencyType, toSosDetailViewModel } from "@/models/sos-detail.model";

describe("sos-detail.model", () => {
  it("classifies medical emergencies from keywords", () => {
    expect(deriveEmergencyType("Patient having heart pain and bleeding")).toBe("medical");
  });

  it("classifies fire emergencies from keywords", () => {
    expect(deriveEmergencyType("There is smoke and fire in the room")).toBe("fire");
  });

  it("classifies violence emergencies from keywords", () => {
    expect(deriveEmergencyType("Possible attack with a gun nearby")).toBe("violence");
  });

  it("falls back to unknown when no keywords are present", () => {
    expect(deriveEmergencyType("Need urgent help")).toBe("unknown");
    expect(deriveEmergencyType("")).toBe("unknown");
  });

  it("builds SOS detail view model with name fallback and sorted timeline", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 55,
        user_id: 9,
        full_name: "",
        latest_status: "active",
        latest_message: null,
        latest_latitude: "16.123",
        latest_longitude: "120.456",
        latest_address: null,
        latest_event_at: "2026-02-27T10:04:00.000Z",
      },
      events: [
        { id: 2, message: "Need help", created_at: "2026-02-27T10:00:00.000Z", status: "active" },
        { id: 3, message: "There is fire", created_at: "2026-02-27T10:05:00.000Z", status: "active" },
      ],
    });

    expect(result.id).toBe("55");
    expect(result.requires_attention).toBe(true);
    expect(result.userName).toBe("User #9");
    expect(result.emergencyType).toBe("fire");
    expect(result.location.latitude).toBe(16.123);
    expect(result.location.longitude).toBe(120.456);
    expect(result.timeline.map((event) => event.id)).toEqual([3, 2]);
    expect(result.timeline.map((event) => event.eventLabel)).toEqual(["Active", "Created"]);
  });

  it("honors explicit requires_attention value", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 56,
        latest_status: "active",
        acknowledged_at: "2026-03-01T04:00:00.000Z",
        requires_attention: false,
      },
      events: [],
    });

    expect(result.requires_attention).toBe(false);
  });

  it("prefers emergency_category from SOS thread when available", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 57,
        latest_status: "active",
        emergency_category: "medical",
        latest_message: "There is fire outside",
      },
      events: [],
    });

    expect(result.emergencyType).toBe("medical");
  });

  it("maps assigned unit on detail thread when present", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 58,
        latest_status: "active",
        assigned_unit: "Emergency Medical Unit",
      },
      events: [],
    });

    expect(result.assigned_unit).toBe("Emergency Medical Unit");
    expect(result.assignedUnit).toBe("Emergency Medical Unit");
  });

  it("derives Cancelled SOS terminal label for resolved detail via note convention", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 59,
        latest_status: "resolved",
        latest_message: "CANCELLED: false alarm",
      },
      events: [],
    });

    expect(result.terminal_label).toBe("Cancelled SOS");
    expect(result.terminalLabel).toBe("Cancelled SOS");
  });

  it("derives Resolved label for resolved detail without cancelled markers", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 60,
        latest_status: "resolved",
        latest_message: "SAFE: user confirmed",
      },
      events: [],
    });

    expect(result.terminal_label).toBe("Resolved");
    expect(result.terminalLabel).toBe("Resolved");
  });

  it("derives Cancelled SOS label when detail status is cancelled", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 62,
        latest_status: "cancelled",
        latest_message: "User cancelled request",
      },
      events: [],
    });

    expect(result.terminal_label).toBe("Cancelled SOS");
    expect(result.terminalLabel).toBe("Cancelled SOS");
  });

  it("normalizes timeline labels for cancelled and acknowledged events", () => {
    const result = toSosDetailViewModel({
      thread: {
        sos_id: 61,
        latest_status: "resolved",
      },
      events: [
        { id: 1, status: "active", created_at: "2026-03-01T08:00:00.000Z", actor_type: "user", message: "Need help" },
        { id: 2, status: "acknowledged", created_at: "2026-03-01T08:05:00.000Z", actor_type: "admin", message: "Assigned" },
        { id: 3, status: "resolved", created_at: "2026-03-01T08:10:00.000Z", actor_type: "admin", message: "CANCELLED: duplicate" },
      ],
    });

    expect(result.timeline.map((event) => event.eventLabel)).toEqual(["Cancelled", "Acknowledged", "Created"]);
    expect(result.timeline.map((event) => event.actorLabel)).toEqual(["Admin", "Admin", "User"]);
  });
});
