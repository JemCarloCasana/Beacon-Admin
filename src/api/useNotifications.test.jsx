import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useNotifications } from "@/api/useNotifications";
import { apiGet } from "@/services/api";

vi.mock("@/services/api", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps reference_id from numeric metadata.admin_request_id", async () => {
    apiGet.mockResolvedValueOnce([
      {
        id: 1,
        type: "admin_request",
        metadata: { admin_request_id: "42" },
        is_read: false,
      },
    ]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.reference_id).toBe(42);
  });

  it("keeps non-numeric admin_request_id non-actionable", async () => {
    apiGet.mockResolvedValueOnce([
      {
        id: 2,
        type: "admin_request",
        metadata: { admin_request_id: "abc" },
        is_read: false,
      },
    ]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.reference_id).toBeNull();
  });

  it("reads notifications from nested data.notifications payload", async () => {
    apiGet.mockResolvedValueOnce({
      data: {
        notifications: [
          {
            id: 3,
            type: "admin_request",
            metadata: { admin_request_id: 77 },
            is_read: false,
          },
        ],
      },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe(3);
    expect(result.current.data?.[0]?.reference_id).toBe(77);
  });

  it("reads notifications from deeper wrapper payload", async () => {
    apiGet.mockResolvedValueOnce({
      data: {
        data: {
          notifications: [
            {
              id: 4,
              type: "admin_request",
              metadata: { admin_request_id: "88" },
              is_read: false,
            },
          ],
        },
      },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe(4);
    expect(result.current.data?.[0]?.reference_id).toBe(88);
  });
});
