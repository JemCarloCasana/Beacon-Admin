function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function computeRequiresAttention(item) {
  const explicit = item?.requires_attention;
  if (explicit === true || explicit === false) return explicit;

  const latestStatus = String(item?.latest_status || item?.status || "active").toLowerCase();
  const acknowledgedAt = item?.acknowledged_at || item?.acknowledgedAt || null;
  return latestStatus === "active" && !acknowledgedAt;
}

export function toSosFeedAlert(item) {
  const requiresAttention = computeRequiresAttention(item);

  return {
    id: String(item?.sos_id ?? ""),
    status: String(item?.latest_status || "active"),
    requires_attention: requiresAttention,
    requiresAttention,
    acknowledged_at: item?.acknowledged_at || item?.acknowledgedAt || null,
    timestamp: item?.latest_event_at || item?.opened_at || new Date().toISOString(),
    userName: item?.full_name || `User #${item?.user_id ?? "Unknown"}`,
    userPhone: item?.phone_number || null,
    message: item?.latest_message || null,
    location: {
      latitude: toFiniteNumber(item?.latest_latitude),
      longitude: toFiniteNumber(item?.latest_longitude),
      address: item?.latest_address || null,
    },
    raw: item,
  };
}
