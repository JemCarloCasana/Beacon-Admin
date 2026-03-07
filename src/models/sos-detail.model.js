const EMERGENCY_TYPES = {
  medical: ["medical", "heart", "stroke", "seizure", "faint", "injury", "bleeding", "ambulance"],
  fire: ["fire", "smoke", "burn", "flame", "nasusunog"],
  violence: ["violence", "attack", "assault", "fight", "stab", "gun", "abuse"],
};

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDisplayName(thread) {
  const fullName = String(thread?.full_name || "").trim();
  if (fullName) return fullName;
  if (thread?.user_id != null) return `User #${thread.user_id}`;
  return "Unknown user";
}

function computeRequiresAttention(thread) {
  const explicit = thread?.requires_attention;
  if (explicit === true || explicit === false) return explicit;

  const status = String(thread?.latest_status || "active").toLowerCase();
  const acknowledgedAt = thread?.acknowledged_at || thread?.acknowledgedAt || null;
  return status === "active" && !acknowledgedAt;
}

function pickEmergencyTypeText(thread, events) {
  const threadMessage = String(thread?.latest_message || "").trim();
  if (threadMessage) return threadMessage;

  const latestEventWithMessage = (Array.isArray(events) ? events : [])
    .filter((event) => String(event?.message || "").trim())
    .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())[0];

  return String(latestEventWithMessage?.message || "").trim();
}

function normalizeEmergencyCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === "medical" || normalized === "fire" || normalized === "violence" || normalized === "unknown") {
    return normalized;
  }

  if (normalized === "i dont know" || normalized === "i don't know") return "unknown";
  return null;
}

export function deriveEmergencyType(text) {
  const normalized = String(text || "").toLowerCase();

  if (EMERGENCY_TYPES.medical.some((keyword) => normalized.includes(keyword))) return "medical";
  if (EMERGENCY_TYPES.fire.some((keyword) => normalized.includes(keyword))) return "fire";
  if (EMERGENCY_TYPES.violence.some((keyword) => normalized.includes(keyword))) return "violence";
  return "unknown";
}

export function toSosDetailViewModel(data) {
  const thread = data?.thread || null;
  const events = Array.isArray(data?.events) ? data.events : [];
  const latitude = toFiniteNumber(thread?.latest_latitude);
  const longitude = toFiniteNumber(thread?.latest_longitude);

  const emergencyTypeFromThread =
    normalizeEmergencyCategory(thread?.emergency_category) ||
    normalizeEmergencyCategory(thread?.category);
  const emergencyTypeSource = pickEmergencyTypeText(thread, events);
  const emergencyType = emergencyTypeFromThread || deriveEmergencyType(emergencyTypeSource);

  const requiresAttention = computeRequiresAttention(thread);

  return {
    id: thread?.sos_id ? String(thread.sos_id) : "",
    status: String(thread?.latest_status || "active"),
    requires_attention: requiresAttention,
    requiresAttention,
    acknowledged_at: thread?.acknowledged_at || thread?.acknowledgedAt || null,
    assigned_unit: thread?.assigned_unit || thread?.assignedUnit || null,
    assignedUnit: thread?.assigned_unit || thread?.assignedUnit || null,
    userName: toDisplayName(thread),
    userPhone: thread?.phone_number || null,
    role: thread?.role || null,
    message: thread?.latest_message || null,
    timestamp: thread?.latest_event_at || thread?.opened_at || null,
    emergencyType,
    location: {
      latitude,
      longitude,
      address: thread?.latest_address || null,
    },
    timeline: [...events].sort(
      (a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
    ),
    raw: data,
  };
}
