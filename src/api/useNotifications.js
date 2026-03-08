import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/services/api";

function parseObjectLike(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeNotification(item) {
  const metadata = parseObjectLike(item?.metadata);
  const adminRequestId = Number(metadata?.admin_request_id);
  const reference_id = Number.isFinite(adminRequestId) ? adminRequestId : null;

  return {
    ...item,
    metadata,
    reference_id,
  };
}

function isLikelyNotificationItem(item) {
  if (!item || typeof item !== "object") return false;
  return (
    Object.prototype.hasOwnProperty.call(item, "id") ||
    Object.prototype.hasOwnProperty.call(item, "type") ||
    Object.prototype.hasOwnProperty.call(item, "title") ||
    Object.prototype.hasOwnProperty.call(item, "message") ||
    Object.prototype.hasOwnProperty.call(item, "is_read") ||
    Object.prototype.hasOwnProperty.call(item, "created_at")
  );
}

function isLikelyNotificationArray(value) {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  return value.some(isLikelyNotificationItem);
}

function extractNotificationsList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const preferredKeys = ["notifications", "data", "rows", "items", "results", "list"];
  const queue = [payload];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const key of preferredKeys) {
      const candidate = current[key];
      if (Array.isArray(candidate) && isLikelyNotificationArray(candidate)) {
        return candidate;
      }
    }

    for (const value of Object.values(current)) {
      if (Array.isArray(value) && isLikelyNotificationArray(value)) {
        return value;
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return [];
}

function normalizeNotificationsPayload(payload) {
  const list = extractNotificationsList(payload);

  if (!Array.isArray(list)) return [];

  return list.map(normalizeNotification);
}

export function useNotifications(options = {}) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiGet("/admin/notifications");
      const normalized = normalizeNotificationsPayload(response);

      if (import.meta.env.DEV) {
        const rawList = extractNotificationsList(response);
        const sample = rawList.slice(0, 3).map((item) => ({
          id: item?.id ?? null,
          type: item?.type ?? null,
          metadata: item?.metadata ?? null,
        }));
        const typeCounts = normalized.reduce((acc, item) => {
          const key = String(item?.type || "unknown");
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        console.debug("[notifications] raw length:", rawList.length, "sample:", sample);
        console.debug("[notifications] normalized length:", normalized.length, "type counts:", typeCounts);
      }

      return normalized;
    },
    staleTime: 1000 * 30,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
    ...options,
  });
}

export function useMarkNotificationRead(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      return apiPatch(`/admin/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    ...options,
  });
}
