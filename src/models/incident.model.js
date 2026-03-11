import { formatDistanceToNow } from "date-fns";

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const AUTO_PRIORITY_BY_INCIDENT_TYPE = {
  medical_emergency: "critical",
  fire: "critical",
  accident: "high",
  suspicious_activity: "medium",
  harassment: "medium",
  theft: "medium",
};
const AUTO_ASSIGNED_DEPARTMENT_BY_INCIDENT_TYPE = {
  medical_emergency: "Emergency Medical Unit",
  fire: "Fire Station Unit",
  accident: "Traffic Enforcement Unit",
  suspicious_activity: "Police Personnel",
  harassment: "Police Personnel",
  theft: "Police Personnel",
};

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isValidLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function normalizeCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (isValidLatitude(lat) && isValidLongitude(lng)) {
    return { latitude: lat, longitude: lng };
  }

  if (isValidLatitude(lng) && isValidLongitude(lat)) {
    return { latitude: lng, longitude: lat };
  }

  return null;
}

function pickCoordinates(input) {
  const location = input?.location || {};
  const locationCoords = Array.isArray(location?.coordinates) ? location.coordinates : null;
  const geometryCoords = Array.isArray(input?.geometry?.coordinates) ? input.geometry.coordinates : null;

  const lat =
    toFiniteNumber(input?.latest_latitude) ??
    toFiniteNumber(input?.latest_lat) ??
    toFiniteNumber(input?.latitude) ??
    toFiniteNumber(input?.lat) ??
    toFiniteNumber(location?.latitude) ??
    toFiniteNumber(location?.lat) ??
    toFiniteNumber(locationCoords?.[1]) ??
    toFiniteNumber(geometryCoords?.[1]);
  const lng =
    toFiniteNumber(input?.latest_longitude) ??
    toFiniteNumber(input?.latest_lng) ??
    toFiniteNumber(input?.longitude) ??
    toFiniteNumber(input?.lng) ??
    toFiniteNumber(location?.longitude) ??
    toFiniteNumber(location?.lng) ??
    toFiniteNumber(locationCoords?.[0]) ??
    toFiniteNumber(geometryCoords?.[0]);

  if (lat === null || lng === null) return null;
  return normalizeCoordinates(lat, lng);
}

function unwrapIncidentPayload(payload) {
  if (!payload) return null;
  if (payload?.incident) return payload.incident;
  if (payload?.data && !Array.isArray(payload.data)) return unwrapIncidentPayload(payload.data);
  if (payload?.item) return unwrapIncidentPayload(payload.item);
  return payload;
}

function normalizeIncidentType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toBase64FromByteArray(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function byteaHexToBase64(raw) {
  const hex = raw.slice(2);
  if (!hex || hex.length % 2 !== 0) return null;
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    const value = Number.parseInt(hex.slice(i, i + 2), 16);
    if (!Number.isFinite(value)) return null;
    bytes.push(value);
  }
  return toBase64FromByteArray(bytes);
}

function detectMimeTypeFromBase64(base64, fallback = "image/jpeg") {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  if (base64.startsWith("PHN2Zy")) return "image/svg+xml";
  return fallback;
}

function isLikelyBase64ImagePayload(value) {
  if (!isNonEmptyString(value)) return false;
  const raw = value.trim();
  if (raw.length < 80 || raw.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(raw);
}

function normalizeImageSource(value, mimeTypeHint = null) {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    if (!value.length) return null;
    if (!value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255)) return null;
    const base64 = toBase64FromByteArray(value);
    const mimeType = mimeTypeHint || detectMimeTypeFromBase64(base64);
    return `data:${mimeType};base64,${base64}`;
  }

  if (typeof value === "object") {
    if (value?.type === "Buffer" && Array.isArray(value?.data)) {
      return normalizeImageSource(value.data, mimeTypeHint);
    }
    if (isNonEmptyString(value?.base64)) {
      return normalizeImageSource(value.base64, mimeTypeHint || value?.mimeType || value?.contentType);
    }
    if (isNonEmptyString(value?.url)) {
      return normalizeImageSource(value.url, mimeTypeHint || value?.mimeType || value?.contentType);
    }
    if (isNonEmptyString(value?.path)) {
      return normalizeImageSource(value.path, mimeTypeHint || value?.mimeType || value?.contentType);
    }
    if (Array.isArray(value?.bytes)) {
      return normalizeImageSource(value.bytes, mimeTypeHint || value?.mimeType || value?.contentType);
    }
    return null;
  }

  if (!isNonEmptyString(value)) return null;

  const raw = value.trim();

  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  if (/^\\x[0-9a-fA-F]+$/.test(raw)) {
    const base64 = byteaHexToBase64(raw);
    if (!base64) return null;
    const mimeType = mimeTypeHint || detectMimeTypeFromBase64(base64);
    return `data:${mimeType};base64,${base64}`;
  }

  if (isLikelyBase64ImagePayload(raw)) {
    const mimeType = mimeTypeHint || detectMimeTypeFromBase64(raw);
    return `data:${mimeType};base64,${raw}`;
  }

  const pathLike = raw.replace(/\\/g, "/");
  if (/^\/incidents\/\d+\/images\/\d+$/i.test(pathLike)) {
    return `${API_BASE_URL}/admin${pathLike}`;
  }
  if (pathLike.startsWith("/")) return `${API_BASE_URL}${pathLike}`;
  return `${API_BASE_URL}/${pathLike}`;
}

function pickIncidentImageUrls(incident) {
  const urls = [];
  const imageMimeType =
    incident?.image_mime_type ||
    incident?.imageMimeType ||
    incident?.mime_type ||
    incident?.mimeType ||
    incident?.content_type ||
    incident?.contentType ||
    null;

  function pushImageSource(candidate, mimeTypeHint = imageMimeType) {
    const normalized = normalizeImageSource(candidate, mimeTypeHint);
    if (normalized) urls.push(normalized);
  }

  pushImageSource(incident?.image_url);
  pushImageSource(incident?.imageUrl);
  pushImageSource(incident?.image_path);
  pushImageSource(incident?.photo_url);
  pushImageSource(incident?.image_data);
  pushImageSource(incident?.imageData);
  pushImageSource(incident?.photo_data);
  pushImageSource(incident?.photoData);

  if (Array.isArray(incident?.images)) {
    incident.images.forEach((entry) => {
      if (isNonEmptyString(entry)) pushImageSource(entry);
      pushImageSource(entry?.url, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.path, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.base64, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.data, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.bytes, entry?.mimeType || entry?.contentType || imageMimeType);
    });
  }

  if (Array.isArray(incident?.attachments)) {
    incident.attachments.forEach((entry) => {
      if (isNonEmptyString(entry)) pushImageSource(entry);
      pushImageSource(entry?.url, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.path, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.base64, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.data, entry?.mimeType || entry?.contentType || imageMimeType);
      pushImageSource(entry?.bytes, entry?.mimeType || entry?.contentType || imageMimeType);
    });
  }

  if (Array.isArray(incident?.incident_images)) {
    incident.incident_images.forEach((entry) => {
      const entryMimeType =
        entry?.content_type ||
        entry?.contentType ||
        entry?.mime_type ||
        entry?.mimeType ||
        imageMimeType;
      pushImageSource(entry?.image_data, entryMimeType);
      pushImageSource(entry?.imageData, entryMimeType);
      pushImageSource(entry?.url, entryMimeType);
      pushImageSource(entry?.path, entryMimeType);
      pushImageSource(entry?.base64, entryMimeType);
      pushImageSource(entry?.data, entryMimeType);
      pushImageSource(entry?.bytes, entryMimeType);
    });
  }

  return Array.from(
    new Set(
      urls.filter(Boolean)
    )
  );
}

function toReporterId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function pickReporterFromSource(source = {}, fallbackId = null) {
  const id =
    toReporterId(source?.id) ??
    toReporterId(source?.user_id) ??
    toReporterId(source?.userId) ??
    toReporterId(source?._id) ??
    toReporterId(fallbackId);

  const name =
    source?.full_name ??
    source?.fullName ??
    source?.name ??
    source?.display_name ??
    source?.displayName ??
    "";

  const phone =
    source?.phone ??
    source?.phone_number ??
    source?.phoneNumber ??
    source?.mobile ??
    source?.mobile_number ??
    source?.mobileNumber ??
    "";

  const email = source?.email ?? source?.email_address ?? source?.emailAddress ?? "";

  return {
    id,
    name: String(name || ""),
    phone: String(phone || ""),
    email: String(email || ""),
    raw: source,
  };
}

function pickIncidentReporter(incident) {
  const fallbackId = incident?.reportedByUserId ?? incident?.reported_by_user_id ?? null;
  const nestedReporter =
    incident?.reporter ??
    incident?.reported_by ??
    incident?.reportedBy ??
    incident?.user ??
    incident?.reporter_profile ??
    null;

  const flatSource = {
    id: incident?.reporter_id ?? incident?.reporterId ?? fallbackId,
    full_name:
      incident?.reporter_name ??
      incident?.reporter_full_name ??
      incident?.reported_by_name ??
      incident?.reporterName ??
      incident?.reporterFullName,
    phone:
      incident?.reporter_phone ??
      incident?.reporter_phone_number ??
      incident?.reported_by_phone ??
      incident?.phone_number ??
      incident?.reporterPhone,
    email:
      incident?.reporter_email ??
      incident?.reported_by_email ??
      incident?.email ??
      incident?.reporterEmail,
  };

  if (nestedReporter && typeof nestedReporter === "object") {
    const nested = pickReporterFromSource(nestedReporter, fallbackId);
    if (nested.id !== null || nested.name || nested.phone || nested.email) {
      return nested;
    }
  }

  return pickReporterFromSource(flatSource, fallbackId);
}

export function toIncidentViewModel(input) {
  const incident = unwrapIncidentPayload(input) || {};
  const id = incident?.id ?? incident?.incident_id ?? "";
  const coords = pickCoordinates(incident);
  const imageUrls = pickIncidentImageUrls(incident);
  const incidentType = incident?.incident_type || incident?.category || "other";
  const normalizedIncidentType = normalizeIncidentType(incidentType);
  const typeBasedPriority = AUTO_PRIORITY_BY_INCIDENT_TYPE[normalizedIncidentType] || null;
  const effectivePriority = typeBasedPriority || incident?.priority || null;
  const typeBasedAssignedDepartment =
    AUTO_ASSIGNED_DEPARTMENT_BY_INCIDENT_TYPE[normalizedIncidentType] || null;
  const effectiveAssignedDepartment =
    typeBasedAssignedDepartment ||
    incident?.assignedDepartment ||
    incident?.assigned_department ||
    null;
  const location = {
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    address: incident?.location?.address || incident?.address || incident?.latest_address || "",
  };
  const reporter = pickIncidentReporter(incident);

  return {
    id,
    title: incident?.title || incident?.incident_type || `Incident #${id || "Unknown"}`,
    description: incident?.description || incident?.notes || "",
    incidentType,
    category: incident?.category || incident?.incident_type || "other",
    priority: effectivePriority,
    status: incident?.status || null,
    imageUrl: imageUrls[0] || "",
    imageUrls,
    location,
    createdAt: incident?.createdAt || incident?.created_at || null,
    updatedAt: incident?.updatedAt || incident?.updated_at || null,
    dispatchedAt: incident?.dispatchedAt || incident?.dispatched_at || null,
    resolvedAt: incident?.resolvedAt || incident?.resolved_at || null,
    reportedByUserId: incident?.reportedByUserId ?? incident?.reported_by_user_id ?? null,
    reporter,
    assignedDepartment: effectiveAssignedDepartment,
    assignedAdminId: incident?.assignedAdminId ?? incident?.assigned_admin_id ?? null,
    resolutionNotes: incident?.resolutionNotes || incident?.resolution_notes || "",
    raw: incident,
  };
}

export function toIncidentListViewModel(items) {
  if (!Array.isArray(items)) return [];
  return items.map(toIncidentViewModel);
}

export function toIncidentMapMarker(input) {
  const incident = toIncidentViewModel(input);
  const { latitude, longitude } = incident.location;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: `incident-${incident.id || "unknown"}`,
    type: "incident",
    title: incident.title,
    lat: latitude,
    lng: longitude,
  };
}

/**
 * Normalize and shape incident data for dashboard UI.
 * @param {any} incident
 * @returns {object}
 */
export function toDashboardIncidentModel(incident) {
  try {
    const date = incident?.createdAt ? new Date(incident.createdAt) : new Date();
    const status = incident?.status || "pending";
    const incidentType = String(incident?.incidentType || incident?.category || "other");
    const incidentTypeLabel = incidentType
      .split("_")
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");

    return {
      ...incident,
      id: incident?.id ?? "",
      title: incident?.title ?? "Incident",
      priority: incident?.priority ?? "medium",
      status,
      timeAgo: formatDistanceToNow(date, { addSuffix: true }).replace("about ", ""),
      categoryLabel: incidentTypeLabel || "Other",
      address: incident?.location?.address || "",
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
      categoryLabel: "Other",
      address: "",
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
