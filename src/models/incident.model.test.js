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
    expect(incident.reporter).toMatchObject({
      id: null,
      name: "",
      phone: "",
      email: "",
    });
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

    expect(incident.imageUrl).toBe(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/admin/incidents/5/images/2`);
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

  it("normalizes reporter details from flat incident payload fields", () => {
    const incident = toIncidentViewModel({
      id: 30,
      reported_by_user_id: 77,
      reporter_name: "Juan Dela Cruz",
      reporter_phone: "+639171234567",
      reporter_email: "juan@example.com",
    });

    expect(incident.reportedByUserId).toBe(77);
    expect(incident.reporter).toMatchObject({
      id: 77,
      name: "Juan Dela Cruz",
      phone: "+639171234567",
      email: "juan@example.com",
    });
  });

  it("normalizes reporter details from nested reporter object", () => {
    const incident = toIncidentViewModel({
      id: 31,
      reported_by_user_id: 70,
      reporter: {
        user_id: 91,
        full_name: "Ana Reporter",
        phone_number: "+639181234567",
        email: "ana@example.com",
      },
    });

    expect(incident.reporter).toMatchObject({
      id: 91,
      name: "Ana Reporter",
      phone: "+639181234567",
      email: "ana@example.com",
    });
  });

  it("uses reportedByUserId fallback when reporter profile fields are missing", () => {
    const incident = toIncidentViewModel({
      id: 32,
      reported_by_user_id: 111,
    });

    expect(incident.reportedByUserId).toBe(111);
    expect(incident.reporter).toMatchObject({
      id: 111,
      name: "",
      phone: "",
      email: "",
    });
  });
});
