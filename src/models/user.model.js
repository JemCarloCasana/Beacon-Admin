/**
 * @typedef {Object} UserModel
 * @property {string|number} id
 * @property {string|number|null} statusTargetId
 * @property {string} full_name
 * @property {string} email
 * @property {string} role
 * @property {string[]|null} permissions The grant the server reported, or
 *   null when the server did not report one.
 */

/**
 * Normalize a raw user/admin item.
 * @param {any} input
 * @returns {UserModel}
 */
export function toUserModel(input) {
  const explicitRole =
    input?.role ??
    input?.role_id ??
    input?.roleId ??
    input?.user_role ??
    input?.user_role_id ??
    input?.userRole ??
    input?.userRoleId ??
    input?.account_role ??
    input?.account_role_id ??
    input?.accountRole ??
    input?.accountRoleId;
  const nestedRole =
    input?.admin?.role ??
    input?.admin?.role_id ??
    input?.admin?.roleId ??
    input?.user?.role ??
    input?.user?.role_id ??
    input?.user?.roleId ??
    input?.profile?.role ??
    input?.profile?.role_id ??
    input?.profile?.roleId ??
    input?.meta?.role ??
    input?.meta?.role_id ??
    input?.meta?.roleId ??
    input?.data?.role ??
    input?.role?.name ??
    input?.role?.value ??
    input?.role?.label ??
    input?.role?.id ??
    input?.role?.role ??
    input?.roles?.[0]?.name ??
    input?.roles?.[0]?.value ??
    input?.roles?.[0]?.label ??
    input?.roles?.[0]?.id ??
    input?.user?.role?.name ??
    input?.user?.role?.id ??
    input?.profile?.role?.name ??
    input?.profile?.role?.id;

  const normalizedRole = String(
    explicitRole ??
      nestedRole ??
      ""
  )
    .trim()
    .toLowerCase();

  const permissions = Array.isArray(input?.permissions) ? input.permissions : [];
  const rolePermissions = Array.isArray(input?.role_permissions) ? input.role_permissions : [];
  const mergedPermissions = [...permissions, ...rolePermissions].map((p) => String(p || "").toLowerCase());
  const hasAdminPermissions =
    mergedPermissions.includes("manage_admins") ||
    mergedPermissions.includes("manage_users");

  // What the server said this account may do. null means the server did
  // not report it - which is not the same as reporting that it may do
  // nothing, and the two must not be collapsed into one another.
  const reportedPermissions = Array.isArray(input?.permissions) ? [...input.permissions] : null;

  const isTruthyAdminFlag = (value) =>
    value === true || value === 1 || value === "1" || String(value || "").toLowerCase() === "true";

  const isAdminFlag =
    isTruthyAdminFlag(input?.is_admin) ||
    isTruthyAdminFlag(input?.isAdmin) ||
    input?.admin === true ||
    String(input?.account_type ?? input?.accountType ?? "").toLowerCase() === "admin" ||
    String(input?.type ?? "").toLowerCase() === "admin";

  const isAdminRoleText =
    normalizedRole === "admin" ||
    normalizedRole === "administrator" ||
    normalizedRole.endsWith("_admin") ||
    normalizedRole.includes("admin");

  const roleNumber = Number(
    explicitRole ??
      nestedRole ??
      input?.account_type ??
      input?.accountType ??
      input?.type ??
      input?.user_type ??
      input?.userType ??
      input?.roles?.[0]?.id
  );
  const hasNumericRole = Number.isFinite(roleNumber);
  const isAdminRoleCode = hasNumericRole && roleNumber === 1;
  const isPersonnelRoleCode = hasNumericRole && roleNumber === 2;
  const isNumericRoleText = normalizedRole !== "" && !Number.isNaN(Number(normalizedRole));

  // The server's own role is the truth about the record. The
  // permission-derived guess is only a fallback for a payload that
  // carries no role at all - a personnel account that holds
  // manage_users is still a personnel account.
  const hasExplicitServerRole = normalizedRole === "admin" || normalizedRole === "personnel";

  const role =
    hasExplicitServerRole
      ? normalizedRole
      : isAdminRoleText || isAdminFlag || hasAdminPermissions || isAdminRoleCode
        ? "admin"
        : normalizedRole === "user" || isPersonnelRoleCode
          ? "personnel"
          : normalizedRole && !isNumericRoleText
            ? normalizedRole
            : "personnel";

  const normalizedStatus = String(input?.status || "").trim().toLowerCase();
  const status = normalizedStatus === "deactivated" ? "deactivated" : "active";
  const statusTargetId =
    input?.id ??
    input?.user_id ??
    input?.userId ??
    input?._id ??
    null;

  return {
    id: input?.id ?? "",
    statusTargetId,
    full_name: input?.full_name ?? "",
    email: input?.email ?? "",
    role,
    status,
    permissions: reportedPermissions,
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
