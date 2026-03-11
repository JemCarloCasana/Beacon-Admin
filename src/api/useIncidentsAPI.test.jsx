import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIncidentsAPI, useMapIncidents, useReporterDetail, useUpdateIncident } from "@/api/useIncidentsAPI";
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

  it("useReporterDetail fetches reporter from primary endpoint", async () => {
    apiGet.mockResolvedValueOnce({
      id: 44,
      full_name: "Primary Reporter",
      phone_number: "+639171111111",
      email: "primary@example.com",
    });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useReporterDetail(44), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenCalledWith("/admin/users/44");
    expect(result.current.data).toMatchObject({
      id: 44,
      name: "Primary Reporter",
      phone: "+639171111111",
      email: "primary@example.com",
    });
  });

  it("useReporterDetail falls back through personnel/admin endpoints on 404-style errors", async () => {
    apiGet
      .mockRejectedValueOnce({ status: 404 })
      .mockRejectedValueOnce({ status: 405 })
      .mockResolvedValueOnce({
        data: {
          admin: {
            id: 88,
            full_name: "Admin Reporter",
            phone: "+639172222222",
            email: "admin@example.com",
          },
        },
      });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useReporterDetail(88), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenNthCalledWith(1, "/admin/users/88");
    expect(apiGet).toHaveBeenNthCalledWith(2, "/admin/personnel/88");
    expect(apiGet).toHaveBeenNthCalledWith(3, "/admin/admins/88");
    expect(result.current.data).toMatchObject({
      id: 88,
      name: "Admin Reporter",
      phone: "+639172222222",
      email: "admin@example.com",
    });
  });

  it("useReporterDetail keeps error state when all fallback endpoints fail", async () => {
    apiGet
      .mockRejectedValueOnce({ status: 404, message: "Not found" })
      .mockRejectedValueOnce({ status: 422, message: "Invalid" })
      .mockRejectedValueOnce({ status: 404, message: "Not found" });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useReporterDetail(999), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(apiGet).toHaveBeenCalledTimes(3);
    expect(result.current.error?.status).toBe(404);
  });
});
