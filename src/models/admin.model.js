/**
 * @typedef {Object} AdminModel
 * @property {string|number|null} id
 * @property {string} full_name
 * @property {string} email
 * @property {string} role
 * @property {string[]} permissions
 */

/**
 * Normalize raw /admin/me payload into a stable admin model.
 * @param {any} input
 * @returns {AdminModel|null}
 */
export function toAdminModel(input) {
  if (!input || typeof input !== "object") return null;

  return {
    id: input.id ?? null,
    full_name: input.full_name ?? "",
    email: input.email ?? "",
    role: input.role ?? "",
    permissions: Array.isArray(input.permissions) ? input.permissions : [],
  };
}

