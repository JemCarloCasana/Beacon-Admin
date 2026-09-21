import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { renderHook, waitFor } from "@testing-library/react";
import { AdminAuthProvider, useAdminAuth } from "@/auth/AdminAuthProvider";
import { fetchAdminMe, getToken } from "@/api/adminMe";

vi.mock("@/api/adminMe", () => ({
  fetchAdminMe: vi.fn(),
  clearSession: vi.fn(),
  getToken: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

describe("AdminAuthProvider permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockReturnValue("token123");
  });

  it("does not grant permissions to admin role without backend grants", async () => {
    fetchAdminMe.mockResolvedValueOnce({ id: 1, role: "admin", permissions: [] });
    const { result } = renderHook(() => useAdminAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission("manage_users")).toBe(false);
    expect(result.current.hasPermission("manage_broadcasts")).toBe(false);
  });

  it("respects backend-granted permissions without injection", async () => {
    fetchAdminMe.mockResolvedValueOnce({
      id: 2,
      role: "personnel",
      permissions: ["manage_broadcasts"],
    });
    const { result } = renderHook(() => useAdminAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission("manage_broadcasts")).toBe(true);
    expect(result.current.hasPermission("manage_users")).toBe(false);
  });
});
