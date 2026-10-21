import {
  PERMISSION_CATALOG,
  PERMISSION_LABELS,
  CONSOLE_FEATURE_PERMISSIONS,
  ACCOUNT_MANAGEMENT_PERMISSIONS,
  rolePermissionPreset,
  DEFAULT_ACCEPT_PERMISSIONS,
} from "@/config/permissions";

describe("permissions config", () => {
  it("lists the eight permissions the backend accepts", () => {
    expect(PERMISSION_CATALOG).toEqual([
      "manage_users",
      "manage_admins",
      "manage_broadcasts",
      "view_broadcasts",
      "view_incidents",
      "manage_incidents",
      "manage_sos",
      "manage_reports",
    ]);
  });

  it("labels every permission in the catalogue", () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(typeof PERMISSION_LABELS[permission]).toBe("string");
      expect(PERMISSION_LABELS[permission].length).toBeGreaterThan(0);
    }
  });

  it("gives personnel the console features and no account management", () => {
    expect(rolePermissionPreset("personnel")).toEqual(CONSOLE_FEATURE_PERMISSIONS);
    expect(rolePermissionPreset("personnel")).toContain("manage_sos");
    expect(rolePermissionPreset("personnel")).toContain("view_incidents");
    expect(rolePermissionPreset("personnel")).not.toContain("manage_users");
    expect(rolePermissionPreset("personnel")).not.toContain("manage_admins");
  });

  it("gives admin the console features plus account management", () => {
    const adminPreset = rolePermissionPreset("admin");
    for (const permission of PERMISSION_CATALOG) {
      expect(adminPreset).toContain(permission);
    }
    expect(adminPreset).toHaveLength(PERMISSION_CATALOG.length);
  });

  it("treats an unknown role as personnel", () => {
    expect(rolePermissionPreset("superuser")).toEqual(rolePermissionPreset("personnel"));
    expect(rolePermissionPreset(undefined)).toEqual(rolePermissionPreset("personnel"));
  });

  it("grants only console features when an admin request is accepted", () => {
    expect(DEFAULT_ACCEPT_PERMISSIONS).toEqual(CONSOLE_FEATURE_PERMISSIONS);
    expect(DEFAULT_ACCEPT_PERMISSIONS).not.toContain("manage_users");
    expect(DEFAULT_ACCEPT_PERMISSIONS).not.toContain("manage_admins");
  });

  it("splits the catalogue into console features and account management", () => {
    expect([...CONSOLE_FEATURE_PERMISSIONS, ...ACCOUNT_MANAGEMENT_PERMISSIONS].sort()).toEqual(
      [...PERMISSION_CATALOG].sort()
    );
    expect(ACCOUNT_MANAGEMENT_PERMISSIONS).toEqual(["manage_users", "manage_admins"]);
  });

  it("hands out a fresh array so one caller cannot change another's grant", () => {
    const first = rolePermissionPreset("admin");
    first.push("manage_something_else");

    expect(rolePermissionPreset("admin")).toHaveLength(PERMISSION_CATALOG.length);
    expect(CONSOLE_FEATURE_PERMISSIONS).not.toContain("manage_something_else");
  });
});
