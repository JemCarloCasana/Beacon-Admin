import { apiPost } from "@/services/api";

/**
 * Send an admin-role invitation/request to an existing personnel account.
 * Endpoint assumption: POST /admin/admin-requests
 */
export async function sendAdminRequest({ personnelId }) {
  return apiPost("/admin/admin-requests", {
    personnel_id: personnelId,
  });
}

export default sendAdminRequest;
