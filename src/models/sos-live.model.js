export function toSosFeedAlert(item) {
  return {
    id: String(item?.sos_id ?? ""),
    status: String(item?.latest_status || "active"),
    timestamp: item?.latest_event_at || item?.opened_at || new Date().toISOString(),
    userName: item?.full_name || `User #${item?.user_id ?? "Unknown"}`,
    userPhone: item?.phone_number || null,
    message: item?.latest_message || null,
    location: {
      latitude: item?.latest_latitude ?? null,
      longitude: item?.latest_longitude ?? null,
      address: item?.latest_address || null,
    },
    raw: item,
  };
}
