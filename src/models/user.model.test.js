import { toUserModel } from "@/models/user.model";

describe("user.model", () => {
  it("defaults status to active when missing", () => {
    const result = toUserModel({
      id: 1,
      full_name: "Juan Dela Cruz",
      email: "juan@example.com",
      role: "personnel",
    });

    expect(result.status).toBe("active");
  });

  it("maps deactivated status when provided", () => {
    const result = toUserModel({
      id: 2,
      full_name: "Ana Reyes",
      email: "ana@example.com",
      role: "personnel",
      status: "deactivated",
    });

    expect(result.status).toBe("deactivated");
  });

  it("uses id as statusTargetId when available", () => {
    const result = toUserModel({
      id: 11,
      user_id: 101,
      userId: 102,
      _id: 103,
      full_name: "Personnel One",
      email: "one@example.com",
    });

    expect(result.statusTargetId).toBe(11);
  });

  it("falls back statusTargetId to user_id, then userId, then _id", () => {
    const byUserId = toUserModel({
      user_id: 101,
      full_name: "A",
      email: "a@example.com",
    });
    const byUserIdCamel = toUserModel({
      userId: 102,
      full_name: "B",
      email: "b@example.com",
    });
    const byUnderscoreId = toUserModel({
      _id: 103,
      full_name: "C",
      email: "c@example.com",
    });

    expect(byUserId.statusTargetId).toBe(101);
    expect(byUserIdCamel.statusTargetId).toBe(102);
    expect(byUnderscoreId.statusTargetId).toBe(103);
  });

  it("exposes the permissions the server reported", () => {
    const result = toUserModel({
      id: 1,
      full_name: "A",
      email: "a@example.com",
      role: "personnel",
      permissions: ["manage_sos"],
    });

    expect(result.permissions).toEqual(["manage_sos"]);
  });

  it("reports no permissions as an empty list", () => {
    const result = toUserModel({
      id: 1,
      full_name: "A",
      email: "a@example.com",
      role: "personnel",
      permissions: [],
    });

    expect(result.permissions).toEqual([]);
  });

  it("reports permissions the server did not send as null", () => {
    const result = toUserModel({
      id: 1,
      full_name: "A",
      email: "a@example.com",
      role: "personnel",
    });

    // "not reported" and "no access" are different facts.
    expect(result.permissions).toBeNull();
  });

  it("keeps the role the server reported", () => {
    const result = toUserModel({
      id: 1,
      full_name: "A",
      email: "a@example.com",
      role: "personnel",
      permissions: ["manage_users"],
    });

    expect(result.role).toBe("personnel");
  });
});
