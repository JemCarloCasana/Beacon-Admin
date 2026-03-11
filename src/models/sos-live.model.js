import { deriveSosTerminalLabel } from "@/models/sos-terminal-label";

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const EMERGENCY_TYPES = {
  medical: ["medical", "heart", "stroke", "seizure", "faint", "injury", "bleeding", "ambulance"],
  fire: ["fire", "smoke", "burn", "flame", "nasusunog"],
  violence: ["violence", "attack", "assault", "fight", "stab", "gun", "abuse"],
};

function normalizeEmergencyCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "medical" || normalized === "fire" || normalized === "violence" || normalized === "unknown") {
    return normalized;
  }
  if (normalized === "i dont know" || normalized === "i don't know") return "unknown";
  return null;
}

function deriveEmergencyType(text) {
  const normalized = String(text || "").toLowerCase();
  if (EMERGENCY_TYPES.medical.some((keyword) => normalized.includes(keyword))) return "medical";
  if (EMERGENCY_TYPES.fire.some((keyword) => normalized.includes(keyword))) return "fire";
  if (EMERGENCY_TYPES.violence.some((keyword) => normalized.includes(keyword))) return "violence";
  return "unknown";
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
  const status = String(item?.latest_status || "active");
  const terminalLabel = deriveSosTerminalLabel({
    status,
    terminal_status: item?.terminal_status,
    message: item?.latest_message,
  });
  const assignedUnit = item?.assigned_unit || item?.assignedUnit || null;
  const emergencyTypeFromPayload =
    normalizeEmergencyCategory(item?.emergency_category) || normalizeEmergencyCategory(item?.category);
  const emergencyType = emergencyTypeFromPayload || deriveEmergencyType(item?.latest_message);

  return {
    id: String(item?.sos_id ?? ""),
    status,
    terminal_label: terminalLabel,
    terminalLabel,
    requires_attention: requiresAttention,
    requiresAttention,
    acknowledged_at: item?.acknowledged_at || item?.acknowledgedAt || null,
    assigned_unit: assignedUnit,
    assignedUnit,
    emergencyType,
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
