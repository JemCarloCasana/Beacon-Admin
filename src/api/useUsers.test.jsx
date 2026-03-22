import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createUser, useUsers, updateUserStatus } from "@/api/useUsers";
import { apiGet, apiPatch, apiPost } from "@/services/api";

vi.mock("@/services/api", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches admins with status filter", async () => {
    apiGet.mockResolvedValueOnce([{ id: 1, full_name: "A", email: "a@example.com" }]);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUsers({ status: "active" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenCalledWith("/admin/admins?status=active");
  });

  it("uses all status by default", async () => {
    apiGet.mockResolvedValueOnce([]);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenCalledWith("/admin/admins?status=all");
  });

  it("patches user status with valid payload", async () => {
    apiPatch.mockResolvedValueOnce({ id: 9, status: "deactivated" });
    await updateUserStatus(9, "deactivated");
    expect(apiPatch).toHaveBeenCalledWith("/admin/users/9", { status: "deactivated" });
  });

  it("throws for invalid status", async () => {
    await expect(updateUserStatus(9, "archived")).rejects.toMatchObject({ status: 400 });
    expect(apiPatch).not.toHaveBeenCalled();
  });

  it("creates user with expected payload", async () => {
    apiPost.mockResolvedValueOnce({ id: 10 });
    await createUser({
      full_name: "New User",
      email: "new@example.com",
      password: "Passcode12!",
      role: "admin",
    });
    expect(apiPost).toHaveBeenCalledWith("/admin/admins", {
      full_name: "New User",
      email: "new@example.com",
      password: "Passcode12!",
      role: "admin",
    });
  });
});
