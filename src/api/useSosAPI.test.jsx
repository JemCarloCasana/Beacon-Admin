import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAcknowledgeSOS, useActiveSOSMap, useResolveSOS } from "@/api/useSosAPI";
import { apiGet, apiPost } from "@/services/api";

vi.mock("@/services/api", () => ({
  apiGet: vi.fn(),
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

describe("useSosAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useActiveSOSMap fetches only /admin/sos/live-map", async () => {
    apiGet.mockResolvedValueOnce([{ sos_id: 1, latest_latitude: 1, latest_longitude: 2 }]);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useActiveSOSMap(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith("/admin/sos/live-map");
  });

  it("useActiveSOSMap normalizes wrapped payloads", async () => {
    apiGet.mockResolvedValueOnce({
      points: [{ sos_id: 1, latest_latitude: 1, latest_longitude: 2 }],
    });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useActiveSOSMap(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ sos_id: 1, latest_latitude: 1, latest_longitude: 2 }]);
  });

  it("useActiveSOSMap surfaces live-map errors", async () => {
    apiGet.mockRejectedValueOnce(new Error("boom"));
    const wrapper = createWrapper();
    const { result } = renderHook(() => useActiveSOSMap(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
  });

  it("acknowledge and resolve mutations call new live-ops endpoints", async () => {
    apiPost.mockResolvedValue({ ok: true });
    const wrapper = createWrapper();
    const { result: ackHook } = renderHook(() => useAcknowledgeSOS(), { wrapper });
    const { result: resolveHook } = renderHook(() => useResolveSOS(), { wrapper });

    await ackHook.current.mutateAsync({
      sosId: 123,
      assigned_unit: "Police Personnel",
      note: "ack",
    });
    await resolveHook.current.mutateAsync({ sosId: 123, note: "resolve" });

    expect(apiPost).toHaveBeenCalledWith("/admin/sos/123/acknowledge", {
      assigned_unit: "Police Personnel",
      note: "ack",
    });
    expect(apiPost).toHaveBeenCalledWith("/admin/sos/123/resolve", { note: "resolve" });
  });

  it("resolve prefixes note with CANCELLED when terminal outcome is cancelled", async () => {
    apiPost.mockResolvedValue({ ok: true });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useResolveSOS(), { wrapper });

    await result.current.mutateAsync({ sosId: 123, terminalOutcome: "cancelled", note: "duplicate trigger" });

    expect(apiPost).toHaveBeenCalledWith("/admin/sos/123/resolve", {
      note: "CANCELLED: duplicate trigger",
    });
  });

  it("acknowledge mutation throws when assigned_unit is missing", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAcknowledgeSOS(), { wrapper });

    await expect(result.current.mutateAsync({ sosId: 123, note: "ack" })).rejects.toMatchObject({
      status: 400,
    });
    expect(apiPost).not.toHaveBeenCalled();
  });
});
