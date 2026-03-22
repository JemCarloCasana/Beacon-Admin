import { deriveSosTerminalLabel } from "@/models/sos-terminal-label";

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

function hasCancelledPrefix(value) {
  return /^\s*cancelled\s*:/i.test(String(value || ""));
}

function pickActorName(event) {
  const candidates = [
    event?.full_name,
    event?.actor_name,
    event?.admin_name,
    event?.personnel_name,
    event?.user_name,
    event?.actor?.full_name,
    event?.admin?.full_name,
    event?.personnel?.full_name,
    event?.user?.full_name,
    event?.name,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (normalized) return normalized;
  }

  return null;
}

function toActorLabel(event) {
  const actorName = pickActorName(event);
  if (actorName) return actorName;

  const actorType = String(event?.actor_type || "").trim().toLowerCase();
  if (actorType === "admin") return "Admin";
  if (actorType === "system") return "System";
  return "User";
}

function toEventLabel(event, isOldestEvent) {
  const status = String(event?.status || "active").trim().toLowerCase();
  const message = String(event?.message || "").trim();

  if (status === "resolved") return hasCancelledPrefix(message) ? "Cancelled" : "Resolved";
  if (status === "acknowledged") return "Acknowledged";
  if (status === "responding") return "Responding";
  if (status === "active" && isOldestEvent) return "Created";
  if (status === "active") return "Active";
  return status ? status.toUpperCase() : "ACTIVE";
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
  const status = String(thread?.latest_status || "active");
  const latitude = toFiniteNumber(thread?.latest_latitude);
  const longitude = toFiniteNumber(thread?.latest_longitude);

  const emergencyTypeFromThread =
    normalizeEmergencyCategory(thread?.emergency_category) ||
    normalizeEmergencyCategory(thread?.category);
  const emergencyTypeSource = pickEmergencyTypeText(thread, events);
  const emergencyType = emergencyTypeFromThread || deriveEmergencyType(emergencyTypeSource);

  const requiresAttention = computeRequiresAttention(thread);
  const terminalLabel = deriveSosTerminalLabel({
    status,
    terminal_status: thread?.terminal_status,
    message: thread?.latest_message,
    events,
  });

  const descendingTimeline = [...events].sort(
    (a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
  );
  const oldestEvent = [...events].sort(
    (a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime()
  )[0] || null;

  const timeline = descendingTimeline.map((event) => {
    const isOldestEvent = oldestEvent
      ? (event?.id != null && oldestEvent?.id != null)
        ? event.id === oldestEvent.id
        : String(event?.created_at || "") === String(oldestEvent?.created_at || "")
      : false;

    return {
      ...event,
      eventLabel: toEventLabel(event, isOldestEvent),
      actorLabel: toActorLabel(event),
    };
  });

  return {
    id: thread?.sos_id ? String(thread.sos_id) : "",
    status,
    terminal_label: terminalLabel,
    terminalLabel,
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
    timeline,
    raw: data,
  };
}
