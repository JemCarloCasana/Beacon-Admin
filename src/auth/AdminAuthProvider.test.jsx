import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AdminAuthProvider, useAdminAuth } from "@/auth/AdminAuthProvider";
import { adminLogout } from "@/api/adminAuth";
import { fetchAdminMe, getToken, clearSession } from "@/api/adminMe";

vi.mock("@/api/adminMe", () => ({
  fetchAdminMe: vi.fn(),
  clearSession: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock("@/api/adminAuth", () => ({ adminLogout: vi.fn() }));

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

it("explicit logout invalidates the server session and always clears local access",async()=>{
  fetchAdminMe.mockResolvedValue({id:"account",permissions:[]});
  adminLogout.mockRejectedValue(new Error("offline"));
  clearSession.mockImplementation(()=>getToken.mockReturnValue(null));
  getToken.mockReturnValue("token123");
  const {result}=renderHook(()=>useAdminAuth(),{wrapper:createWrapper()});
  await waitFor(()=>expect(result.current.me).not.toBeNull());
  await act(async()=>{await result.current.logout();});
  expect(adminLogout).toHaveBeenCalledWith("token123");
  expect(clearSession).toHaveBeenCalled(); expect(result.current.me).toBeNull();
});
it("a temporary provider failure retains the loaded administrator",async()=>{
  getToken.mockReturnValue("token123");
  fetchAdminMe.mockResolvedValueOnce({id:"account",permissions:["view_incidents"]});
  const {result}=renderHook(()=>useAdminAuth(),{wrapper:createWrapper()});
  await waitFor(()=>expect(result.current.loading).toBe(false));
  fetchAdminMe.mockRejectedValueOnce(Object.assign(new Error("temporary"),{status:503}));
  await act(async()=>{await result.current.refreshMe().catch(()=>{});});
  expect(result.current.me.id).toBe("account");
});
