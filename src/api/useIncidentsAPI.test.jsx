import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIncidentsAPI, useMapIncidents, useUpdateIncident } from "@/api/useIncidentsAPI";
import { apiGet, apiPatch } from "@/services/api";

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

  it("useIncidentsAPI sends page and limit params", async () => {
    apiGet.mockResolvedValueOnce([]);
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useIncidentsAPI({ page: 2, limit: 50, status: "pending" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenCalledWith("/admin/incidents?page=2&limit=50&status=pending");
  });

  it("useUpdateIncident sends the contract payload keys", async () => {
    apiPatch.mockResolvedValueOnce({ ok: true });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateIncident(), { wrapper });

    result.current.mutate({
      id: 123,
      status: "resolved",
      priority: "high",
      incidentType: "fire",
      assignedDepartment: "Fire Station Unit",
      resolutionNotes: "Handled",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiPatch).toHaveBeenCalledWith("/admin/incidents/123", {
      status: "resolved",
      priority: "high",
      incident_type: "fire",
      assigned_department: "Fire Station Unit",
      resolutionNotes: "Handled",
    });
  });

  it("useUpdateIncident throws for invalid assigned department", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateIncident(), { wrapper });

    result.current.mutate({
      id: 123,
      assignedDepartment: "Invalid Department",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(apiPatch).not.toHaveBeenCalled();
    expect(result.current.error?.status).toBe(400);
  });
});
