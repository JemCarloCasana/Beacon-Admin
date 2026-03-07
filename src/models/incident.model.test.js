import { toIncidentListViewModel, toIncidentMapMarker, toIncidentViewModel } from "@/models/incident.model";

describe("incident.model", () => {
  it("normalizes legacy incident fields and string coordinates", () => {
    const incident = toIncidentViewModel({
      id: 10,
      incident_type: "Theft",
      assigned_department: "Police Personnel",
      description: "Missing phone",
      latitude: "16.0778",
      longitude: "120.3406",
      address: "Dagupan",
      created_at: "2026-03-01T01:00:00.000Z",
      updated_at: "2026-03-01T02:00:00.000Z",
      status: "pending",
    });

    expect(incident.title).toBe("Theft");
    expect(incident.incidentType).toBe("Theft");
    expect(incident.category).toBe("Theft");
    expect(incident.assignedDepartment).toBe("Police Personnel");
    expect(incident.location.latitude).toBe(16.0778);
    expect(incident.location.longitude).toBe(120.3406);
    expect(incident.createdAt).toBe("2026-03-01T01:00:00.000Z");
    expect(incident.updatedAt).toBe("2026-03-01T02:00:00.000Z");
  });

  it("normalizes image_url and exposes imageUrl/imageUrls", () => {
    const incident = toIncidentViewModel({
      id: 11,
      image_url: "https://cdn.example.com/a.jpg",
    });

    expect(incident.imageUrl).toBe("https://cdn.example.com/a.jpg");
    expect(incident.imageUrls).toEqual(["https://cdn.example.com/a.jpg"]);
  });

  it("uses images[] as fallback for incident image", () => {
    const incident = toIncidentViewModel({
      id: 12,
      images: ["https://cdn.example.com/b.jpg", "https://cdn.example.com/c.jpg"],
    });

    expect(incident.imageUrl).toBe("https://cdn.example.com/b.jpg");
    expect(incident.imageUrls).toEqual([
      "https://cdn.example.com/b.jpg",
      "https://cdn.example.com/c.jpg",
    ]);
  });

  it("uses attachments[] as fallback for incident image", () => {
    const incident = toIncidentViewModel({
      id: 13,
      attachments: [{ url: "https://cdn.example.com/d.jpg" }],
    });

    expect(incident.imageUrl).toBe("https://cdn.example.com/d.jpg");
    expect(incident.imageUrls).toEqual(["https://cdn.example.com/d.jpg"]);
  });

  it("normalizes postgres base64 image payload into data URI", () => {
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5f2mYAAAAASUVORK5CYII=";
    const incident = toIncidentViewModel({
      id: 14,
      image_data: base64Png,
      image_mime_type: "image/png",
    });

    expect(incident.imageUrl).toBe(`data:image/png;base64,${base64Png}`);
    expect(incident.imageUrls).toEqual([`data:image/png;base64,${base64Png}`]);
  });

  it("normalizes postgres bytea hex image payload into data URI", () => {
    const incident = toIncidentViewModel({
      id: 15,
      image_data: "\\x89504e470d0a1a0a",
      image_mime_type: "image/png",
    });

    expect(incident.imageUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("normalizes incident_images rows with bytea buffer and content_type", () => {
    const incident = toIncidentViewModel({
      id: 16,
      incident_images: [
        {
          image_data: { type: "Buffer", data: [137, 80, 78, 71, 13, 10, 26, 10] },
          content_type: "image/png",
        },
      ],
    });

    expect(incident.imageUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(incident.imageUrls).toEqual(["data:image/png;base64,iVBORw0KGgo="]);
  });

  it("rewrites /incidents/:id/images/:imageId paths to admin image route", () => {
    const incident = toIncidentViewModel({
      id: 17,
      image_url: "/incidents/5/images/2",
    });

    expect(incident.imageUrl).toBe("http://localhost:3000/admin/incidents/5/images/2");
  });

  it("unwraps detail payload wrappers and uses fallback title", () => {
    const incident = toIncidentViewModel({
      data: {
        incident: {
          id: 77,
          notes: "no description",
          status: "dispatched",
        },
      },
    });

    expect(incident.id).toBe(77);
    expect(incident.title).toBe("Incident #77");
    expect(incident.description).toBe("no description");
  });

  it("normalizes list and creates map marker only with valid coordinates", () => {
    const list = toIncidentListViewModel([
      { id: 1, title: "A", lat: 14.6, lng: 121.0 },
      { id: 2, title: "B" },
    ]);

    const markerA = toIncidentMapMarker(list[0]);
    const markerB = toIncidentMapMarker(list[1]);

    expect(list).toHaveLength(2);
    expect(markerA).toMatchObject({ id: "incident-1", type: "incident", lat: 14.6, lng: 121.0 });
    expect(markerB).toBeNull();
  });

  it("auto-derives priority from incident type for non-others", () => {
    const fireIncident = toIncidentViewModel({
      id: 21,
      category: "fire",
      priority: "medium",
    });

    const othersIncident = toIncidentViewModel({
      id: 22,
      category: "others",
      priority: "low",
    });

    expect(fireIncident.priority).toBe("critical");
    expect(othersIncident.priority).toBe("low");
  });

  it("auto-derives assigned department from incident type for non-others", () => {
    const fireIncident = toIncidentViewModel({
      id: 23,
      category: "fire",
      assigned_department: null,
    });

    const othersIncident = toIncidentViewModel({
      id: 24,
      category: "others",
      assigned_department: "Police Personnel",
    });

    expect(fireIncident.assignedDepartment).toBe("Fire Station Unit");
    expect(othersIncident.assignedDepartment).toBe("Police Personnel");
  });
});
