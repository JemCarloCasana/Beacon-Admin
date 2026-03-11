function hasCancelledPrefix(value) {
  return /^\s*cancelled\s*:/i.test(String(value || ""));
}

function normalizeTerminalStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "cancelled" || normalized === "safe" ? normalized : null;
}

export function deriveSosTerminalLabel({ status, terminal_status, message, events = [] }) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (normalizedStatus === "cancelled") return "Cancelled SOS";
  if (normalizedStatus !== "resolved") return null;

  const normalizedTerminalStatus = normalizeTerminalStatus(terminal_status);
  if (normalizedTerminalStatus === "cancelled") return "Cancelled SOS";

  if (hasCancelledPrefix(message)) return "Cancelled SOS";

  const hasCancelledResolveEvent = Array.isArray(events)
    && events.some((event) => {
      const eventStatus = String(event?.status || "").trim().toLowerCase();
      return eventStatus === "resolved" && hasCancelledPrefix(event?.message);
    });

  return hasCancelledResolveEvent ? "Cancelled SOS" : "Resolved";
}
