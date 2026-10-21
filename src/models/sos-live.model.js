import { deriveSosTerminalLabel } from "@/models/sos-terminal-label";
import { resolveEmergencyCategory } from "@/config/emergency";
import { sosStatusLabel } from "@/config/constants";

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const EMERGENCY_KEYWORDS = {
  medical: ["medical", "heart", "stroke", "seizure", "faint", "injury", "bleeding", "ambulance"],
  fire: ["fire", "smoke", "burn", "flame", "nasusunog"],
  violence: ["violence", "attack", "assault", "fight", "stab", "gun", "abuse"],
};

/**
 * DISPLAY ONLY.
 *
 * Infers an emergency type from free text so a thread can be labelled. It must
 * never select a responder: the responder is fixed by the category the person
 * reported, and a guess from a message can send the wrong unit to a real
 * emergency.
 */
export function deriveEmergencyTypeFromMessage(text) {
  const normalized = String(text || "").toLowerCase();
  if (EMERGENCY_KEYWORDS.medical.some((keyword) => normalized.includes(keyword))) return "medical";
  if (EMERGENCY_KEYWORDS.fire.some((keyword) => normalized.includes(keyword))) return "fire";
  if (EMERGENCY_KEYWORDS.violence.some((keyword) => normalized.includes(keyword))) return "violence";
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
  // The reported category is the only thing allowed to name an emergency. The
  // message-derived type is a label hint and never selects a responder.
  const reportedCategory =
    resolveEmergencyCategory(item?.emergency_category) ??
    resolveEmergencyCategory(item?.category);
  const emergencyTypeSource = reportedCategory ? "payload" : null;
  const emergencyType = reportedCategory;
  const emergencyTypeFromMessage = deriveEmergencyTypeFromMessage(item?.latest_message);

  return {
    id: String(item?.sos_id ?? ""),
    status,
    statusLabel: sosStatusLabel(status),
    terminal_label: terminalLabel,
    terminalLabel,
    requires_attention: requiresAttention,
    requiresAttention,
    acknowledged_at: item?.acknowledged_at || item?.acknowledgedAt || null,
    assigned_unit: assignedUnit,
    assignedUnit,
    emergencyType,
    emergencyTypeSource,
    emergencyTypeFromMessage,
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
