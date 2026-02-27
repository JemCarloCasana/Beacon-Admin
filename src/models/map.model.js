function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pickCoordinates(input) {
  const lat =
    toFiniteNumber(input?.latest_latitude) ??
    toFiniteNumber(input?.latitude) ??
    toFiniteNumber(input?.lat) ??
    toFiniteNumber(input?.location?.latitude) ??
    toFiniteNumber(input?.location?.lat);
  const lng =
    toFiniteNumber(input?.latest_longitude) ??
    toFiniteNumber(input?.longitude) ??
    toFiniteNumber(input?.lng) ??
    toFiniteNumber(input?.location?.longitude) ??
    toFiniteNumber(input?.location?.lng);

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function parseTime(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function toSosMarker(input) {
  const coords = pickCoordinates(input);
  if (!coords) return null;

  return {
    id: `sos-${input?.sos_id ?? input?.id ?? input?.user_id ?? "unknown"}`,
    entityId: String(input?.sos_id ?? input?.id ?? ""),
    userId: String(input?.user_id ?? ""),
    type: "sos",
    lat: coords.lat,
    lng: coords.lng,
    title: input?.full_name || input?.user_name || `SOS User #${input?.user_id ?? "Unknown"}`,
    subtitle:
      input?.latest_address ||
      input?.latest_message ||
      input?.address ||
      input?.message ||
      "Active SOS",
    status: String(input?.latest_status || input?.status || "active"),
    severity: "critical",
    updatedAt: input?.latest_event_at || input?.created_at || null,
    raw: input,
  };
}

export function toIncidentMarker(input) {
  const coords = pickCoordinates(input);
  if (!coords) return null;

  const id = input?.id ?? input?.incident_id ?? "unknown";
  const title = input?.title || input?.incident_type || `Incident #${id}`;
  return {
    id: `incident-${id}`,
    entityId: String(id),
    type: "incident",
    lat: coords.lat,
    lng: coords.lng,
    title,
    subtitle: input?.address || input?.description || "Incident reported",
    status: String(input?.status || "pending"),
    severity: String(input?.severity || input?.priority || "medium"),
    updatedAt: input?.updated_at || input?.created_at || null,
    raw: input,
  };
}

export function dedupeLatestSosByUser(items) {
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const userId = String(item?.user_id ?? "");
    if (!userId) return;
    const prev = map.get(userId);
    const itemTime = parseTime(item?.latest_event_at || item?.created_at);
    const prevTime = parseTime(prev?.latest_event_at || prev?.created_at);
    if (!prev || itemTime > prevTime) {
      map.set(userId, item);
    }
  });
  return Array.from(map.values());
}

export function toRoutePreview(from, marker) {
  const fromLat = toFiniteNumber(from?.lat);
  const fromLng = toFiniteNumber(from?.lng);
  const toLat = toFiniteNumber(marker?.lat);
  const toLng = toFiniteNumber(marker?.lng);

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return null;
  }

  return {
    from: { lat: fromLat, lng: fromLng },
    to: { lat: toLat, lng: toLng },
    line: [
      [fromLng, fromLat],
      [toLng, toLat],
    ],
  };
}
