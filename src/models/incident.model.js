import { formatDistanceToNow } from "date-fns";

/**
 * Normalize and shape incident data for dashboard UI.
 * @param {any} incident
 * @returns {object}
 */
export function toDashboardIncidentModel(incident) {
  try {
    const date = incident?.createdAt ? new Date(incident.createdAt) : new Date();
    const status = incident?.status || "pending";

    return {
      ...incident,
      id: incident?.id ?? "",
      title: incident?.title ?? "Incident",
      priority: incident?.priority ?? "medium",
      status,
      timeAgo: formatDistanceToNow(date, { addSuffix: true }).replace("about ", ""),
      categoryLabel: incident?.title?.split(" - ")[1] || incident?.title || "Incident",
      address: incident?.location?.address || "Location unavailable",
      statusLabel: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
    };
  } catch (_error) {
    return {
      ...incident,
      id: incident?.id ?? "",
      title: incident?.title ?? "Incident",
      priority: incident?.priority ?? "medium",
      status: incident?.status ?? "pending",
      timeAgo: "recently",
      categoryLabel: incident?.title || "Incident",
      address: "Location unavailable",
      statusLabel: "Pending",
    };
  }
}

/**
 * Normalize incident collection for dashboard UI.
 * @param {any} incidents
 * @returns {object[]}
 */
export function toDashboardIncidentListModel(incidents) {
  if (!Array.isArray(incidents)) return [];
  return incidents.map(toDashboardIncidentModel);
}

