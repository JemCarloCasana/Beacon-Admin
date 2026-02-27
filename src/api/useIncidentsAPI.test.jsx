import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMapIncidents } from "@/api/useIncidentsAPI";
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

describe("useIncidentsAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useMapIncidents normalizes wrapped payloads", async () => {
    apiGet.mockResolvedValueOnce({
      incidents: [{ id: 1, latest_latitude: 14.5, latest_longitude: 121.0 }],
    });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMapIncidents(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1, latest_latitude: 14.5, latest_longitude: 121.0 }]);
    expect(apiGet).toHaveBeenCalledWith("/admin/incidents");
  });
});

