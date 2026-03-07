import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/services/api";

export const USER_STATUSES = ["active", "deactivated", "all"];

function normalizeUsersPayload(payload) {
  if (Array.isArray(payload)) return payload;

  const lists = [];
  if (Array.isArray(payload?.data)) lists.push(payload.data);
  if (Array.isArray(payload?.users)) lists.push(payload.users);
  if (Array.isArray(payload?.admins)) lists.push(payload.admins);
  if (Array.isArray(payload?.personnel)) lists.push(payload.personnel);

  if (lists.length === 0) return [];

  const merged = lists.flat();
  const seen = new Set();
  const unique = [];
  for (const item of merged) {
    const id = item?.id ?? item?._id ?? item?.user_id ?? item?.userId ?? JSON.stringify(item);
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function buildAdminsUrl(status = "all") {
  const normalizedStatus = String(status || "all").trim().toLowerCase();
  const params = new URLSearchParams();
  if (USER_STATUSES.includes(normalizedStatus)) {
    params.set("status", normalizedStatus);
  }
  const query = params.toString();
  return `/admin/admins${query ? `?${query}` : ""}`;
}

async function fetchUsersFromApi(status = "all") {
  const endpoints = [buildAdminsUrl(status)];
  const errors = [];
  const byId = new Map();
  let hasSuccess = false;

  for (const endpoint of endpoints) {
    try {
      const response = await apiGet(endpoint);
      const users = normalizeUsersPayload(response);
      hasSuccess = true;

      for (const user of users) {
        const id = user?.id ?? user?._id ?? user?.user_id ?? user?.userId;
        const key = id == null ? JSON.stringify(user) : String(id);
        const existing = byId.get(key);

        // Prefer later endpoint fields when values are present.
        byId.set(
          key,
          existing
            ? {
                ...existing,
                ...Object.fromEntries(
                  Object.entries(user || {}).filter(([, value]) => value !== null && value !== undefined && value !== "")
                ),
              }
            : user
        );
      }
    } catch (error) {
      errors.push(error);
    }
  }

  if (byId.size > 0) return Array.from(byId.values());

  if (!hasSuccess) {
    const lastError = errors[errors.length - 1];
    if (lastError) throw lastError;
  }

  return [];
}

export async function updateUserStatus(userId, status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (!USER_STATUSES.includes(normalizedStatus) || normalizedStatus === "all") {
    const error = new Error('Invalid status. Must be "active" or "deactivated".');
    error.status = 400;
    throw error;
  }

  return apiPatch(`/admin/users/${userId}`, { status: normalizedStatus });
}

/**
 * Hook to fetch all personnel/admin accounts
 */
export const useUsers = (options = {}) => {
  const { status = "all", ...queryOptions } = options;
  const normalizedStatus = USER_STATUSES.includes(String(status || "").toLowerCase())
    ? String(status).toLowerCase()
    : "all";

  return useQuery({
    queryKey: ["users", normalizedStatus],
    queryFn: () => fetchUsersFromApi(normalizedStatus),
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...queryOptions,
  });
};

export default useUsers;
