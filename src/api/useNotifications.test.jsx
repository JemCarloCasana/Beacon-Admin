import React from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useNotifications } from "@/api/useNotifications";
import { apiGet } from "@/services/api";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn(actual.useQuery),
  };
});

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

  it("keeps the reference_id the server sent", async () => {
    apiGet.mockResolvedValueOnce([
      {
        id: 1,
        type: "incident",
        reference_id: "42",
        metadata: { incident_id: "42" },
        is_read: false,
      },
    ]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.reference_id).toBe("42");
  });

  it("leaves reference_id null when the server sent none", async () => {
    apiGet.mockResolvedValueOnce([
      {
        id: 2,
        type: "incident",
        metadata: { incident_id: "7" },
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
            type: "incident",
            reference_id: "77",
            metadata: { incident_id: "77" },
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
    expect(result.current.data?.[0]?.reference_id).toBe("77");
  });

  it("reads notifications from deeper wrapper payload", async () => {
    apiGet.mockResolvedValueOnce({
      data: {
        data: {
          notifications: [
            {
              id: 4,
              type: "incident",
              reference_id: "88",
              metadata: { incident_id: "88" },
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
    expect(result.current.data?.[0]?.reference_id).toBe("88");
  });

  it("configures polling and focus behavior on the notifications query", () => {
    const wrapper = createWrapper();
    renderHook(() => useNotifications(), { wrapper });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 1000 * 30,
        refetchInterval: 5000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
      })
    );
  });

  it("allows callers to override query options", () => {
    const wrapper = createWrapper();
    renderHook(() => useNotifications({ refetchInterval: 10000 }), { wrapper });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: 10000,
      })
    );
  });
});
