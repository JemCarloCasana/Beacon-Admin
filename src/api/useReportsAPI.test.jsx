import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExportReportCsv, useGenerateReport, useReportsOverview } from "@/api/useReportsAPI";
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

describe("useReportsAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useReportsOverview sends range/timezone query params", async () => {
    apiGet.mockResolvedValueOnce({ generated_at: "2026-03-01T00:00:00.000Z" });
    const wrapper = createWrapper();

    const { result } = renderHook(
      () => useReportsOverview({ range: "24h", timezone: "Asia/Manila" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenCalledWith("/admin/reports/overview?range=24h&timezone=Asia%2FManila");
  });

  it("useGenerateReport sends report_key payload", async () => {
    apiPost.mockResolvedValueOnce({ ok: true });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGenerateReport(), { wrapper });

    await result.current.mutateAsync({
      reportKey: "weekly_safety_report",
      timezone: "Asia/Manila",
    });

    expect(apiPost).toHaveBeenCalledWith("/admin/reports/generate", {
      report_key: "weekly_safety_report",
      timezone: "Asia/Manila",
    });
  });

  it("useExportReportCsv fetches csv text for range", async () => {
    apiGet.mockResolvedValueOnce("header1,header2\na,b");
    const wrapper = createWrapper();
    const { result } = renderHook(() => useExportReportCsv(), { wrapper });

    const csv = await result.current.mutateAsync({ range: "30d", timezone: "Asia/Manila" });
    expect(csv).toContain("header1,header2");
    expect(apiGet).toHaveBeenCalledWith("/admin/reports/export.csv?range=30d&timezone=Asia%2FManila");
  });

  it("useExportReportCsv surfaces API errors", async () => {
    apiGet.mockRejectedValueOnce(new Error("boom"));
    const wrapper = createWrapper();
    const { result } = renderHook(() => useExportReportCsv(), { wrapper });

    await expect(
      result.current.mutateAsync({ range: "7d", timezone: "Asia/Manila" })
    ).rejects.toThrow("boom");
  });
});
