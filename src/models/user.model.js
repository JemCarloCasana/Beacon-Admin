/**
 * @typedef {Object} UserModel
 * @property {string|number} id
 * @property {string} full_name
 * @property {string} email
 */

/**
 * Normalize a raw user/admin item.
 * @param {any} input
 * @returns {UserModel}
 */
export function toUserModel(input) {
  return {
    id: input?.id ?? "",
    full_name: input?.full_name ?? "",
    email: input?.email ?? "",
  };
}

/**
 * Normalize a list of raw user/admin items.
 * @param {any} input
 * @returns {UserModel[]}
 */
export function toUserListModel(input) {
  if (!Array.isArray(input)) return [];
  return input.map(toUserModel);
}

