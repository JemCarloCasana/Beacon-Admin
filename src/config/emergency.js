/**
 * The canonical emergency taxonomy.
 *
 * This module is the single source of truth for:
 *   - the emergency categories the phone can report,
 *   - the responder unit each category maps to,
 *   - the default priority and display label for each category.
 *
 * The responder for a reported emergency is FIXED by the category the person
 * chose on their phone. "I don't know" is a real category and has no fixed
 * responder: the operator assigns that one.
 *
 * A client-side keyword guess must never select a responder. Ids and labels
 * come from the payload; nothing here infers them.
 */

export const RESPONSE_UNITS = [
  "Emergency Medical Unit",
  "Fire Station Unit",
  "Police Personnel",
  "Traffic Enforcement Unit",
];

export const EMERGENCY_TYPES = {
  medical:  { label: "Medical Emergency", unit: "Emergency Medical Unit", priority: "critical", icon: "Heart" },
  fire:     { label: "Fire",              unit: "Fire Station Unit",       priority: "critical", icon: "Flame" },
  violence: { label: "Violence",          unit: "Police Personnel",        priority: "high",     icon: "Shield" },
  unknown:  { label: "Emergency type not reported", unit: null,             priority: "high",     icon: "HelpCircle" },
};

/**
 * The incident-side category vocabulary. These are PROPOSALS: a suggestion
 * shown when the server has no value yet. They are never written over the
 * server's own priority or assigned department.
 */
export const INCIDENT_CATEGORY_PROPOSALS = {
  medical_emergency:     { unit: "Emergency Medical Unit",  priority: "critical" },
  fire:                  { unit: "Fire Station Unit",        priority: "critical" },
  crime:                 { unit: "Police Personnel",         priority: "high" },
  traffic_accident:      { unit: "Traffic Enforcement Unit", priority: "high" },
  natural_disaster:      { unit: "Fire Station Unit",        priority: "high" },
  public_disturbance:    { unit: "Police Personnel",         priority: "medium" },
  other:                 { unit: null,                      priority: "medium" },
  // The payload uses both spellings for the catch-all category.
  others:                { unit: null,                      priority: "medium" },
};

const UNKNOWN_CATEGORY_ALIASES = new Set(["i dont know", "i don't know"]);

/**
 * Normalise a raw emergency category from the payload to a canonical key.
 * Returns null for anything the phone cannot report — never a guess.
 */
export function resolveEmergencyCategory(raw) {
  if (raw === null || raw === undefined) return null;

  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === "medical" || normalized === "fire" || normalized === "violence") {
    return normalized;
  }
  if (normalized === "unknown" || UNKNOWN_CATEGORY_ALIASES.has(normalized)) {
    return "unknown";
  }
  return null;
}

export function unitForEmergencyCategory(category) {
  if (!category) return null;
  return EMERGENCY_TYPES[category]?.unit ?? null;
}

export function priorityForEmergencyCategory(category) {
  if (!category) return null;
  return EMERGENCY_TYPES[category]?.priority ?? null;
}

export function emergencyLabel(category) {
  if (!category) return "Unknown";
  return EMERGENCY_TYPES[category]?.label ?? "Unknown";
}
