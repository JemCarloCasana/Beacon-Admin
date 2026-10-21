/**
 * The permission catalogue, and the presets the console grants.
 *
 * This is the single source of truth for permissions in the app. The
 * backend accepts a closed set of eight and rejects anything else
 * (adminAuthValidation.js), so nothing here may invent a ninth.
 */

/** Every permission the backend accepts, in catalogue order. */
export const PERMISSION_CATALOG = [
  "manage_users",
  "manage_admins",
  "manage_broadcasts",
  "view_broadcasts",
  "view_incidents",
  "manage_incidents",
  "manage_sos",
  "manage_reports",
];

/** A human label for each permission, for the screens that offer them. */
export const PERMISSION_LABELS = {
  manage_users: "Manage users",
  manage_admins: "Manage admins",
  manage_broadcasts: "Send broadcasts",
  view_broadcasts: "View broadcasts",
  view_incidents: "View incidents",
  manage_incidents: "Manage incidents",
  manage_sos: "Respond to SOS alerts",
  manage_reports: "Reports and exports",
};

/**
 * The features of the console itself: the screens an operator works.
 * A personnel account gets these and nothing else.
 */
export const CONSOLE_FEATURE_PERMISSIONS = [
  "manage_sos",
  "view_incidents",
  "manage_incidents",
  "view_broadcasts",
  "manage_broadcasts",
  "manage_reports",
];

/**
 * The permissions that manage accounts rather than the console.
 * These are the levers that decide who else can do what, so they are
 * held only by admins.
 */
export const ACCOUNT_MANAGEMENT_PERMISSIONS = ["manage_users", "manage_admins"];

/**
 * The grant a role carries by default.
 *
 * "admin" adds the account-management permissions to the console
 * features. Any other role - including an unrecognised one - gets the
 * console features alone, so an unknown role can never be a way to
 * acquire the account-management levers.
 *
 * Returns a new array each call: a caller that mutates the result must
 * not be able to change the preset for everyone else.
 */
export function rolePermissionPreset(role) {
  const normalized = String(role ?? "").trim().toLowerCase();
  if (normalized === "admin") {
    return [...CONSOLE_FEATURE_PERMISSIONS, ...ACCOUNT_MANAGEMENT_PERMISSIONS];
  }
  return [...CONSOLE_FEATURE_PERMISSIONS];
}

/**
 * What accepting an admin request grants.
 *
 * The accept route lets the request target accept their own request
 * (adminAdminsRoutes.js), and the notification that opens the invite
 * popup goes to the account being promoted - so the person clicking
 * "Accept" is the person being promoted. That surface is a
 * self-service grant, and it must not hand out the account-management
 * levers: manage_users and manage_admins are granted deliberately, by
 * an administrator who already holds them, from Manage Users.
 */
export const DEFAULT_ACCEPT_PERMISSIONS = [...CONSOLE_FEATURE_PERMISSIONS];
