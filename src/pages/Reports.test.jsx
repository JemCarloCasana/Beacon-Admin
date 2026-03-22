import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Reports from "@/pages/Reports";
import {
  useExportReportCsv,
  useGenerateReport,
  useReportsOverview,
} from "@/api/useReportsAPI";

vi.mock("@/api/useReportsAPI", () => ({
  useReportsOverview: vi.fn(),
  useGenerateReport: vi.fn(),
  useExportReportCsv: vi.fn(),
}));

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }) => <div>{children}</div>,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("recharts", () => ({
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
  Legend: () => null,
}));

const overviewResponse = {
  generated_at: "2026-03-01T08:00:00.000Z",
  range: "7d",
  timezone: "Asia/Manila",
  cards: [
    {
      report_key: "daily_safety_report",
      title: "Daily Safety Report",
      description: "Combined incident and SOS report for the last 24 hours",
      last_generated_at: "2026-03-01T07:00:00.000Z",
    },
    {
      report_key: "weekly_safety_report",
      title: "Weekly Safety Report",
      description: "Combined incident and SOS report for the past 7 days",
      last_generated_at: "2026-03-01T06:00:00.000Z",
    },
    {
      report_key: "monthly_safety_report",
      title: "Monthly Safety Report",
      description: "Comprehensive combined incident and SOS report for the past 30 days",
      last_generated_at: "2026-03-01T05:00:00.000Z",
    },
  ],
  kpis: {
    total_incidents: 12,
    active_incidents: 5,
    resolved_incidents: 7,
    active_sos: 2,
    avg_response_seconds: 65,
    avg_resolution_seconds: 3600,
  },
  charts: {
    incidents_by_status: [{ label: "pending", value: 2 }],
    incidents_by_priority: [{ label: "high", value: 4 }],
    incidents_trend: [{ bucket: "2026-03-01T00:00:00.000Z", incidents: 2, sos: 1 }],
    response_time_trend: [
      { bucket: "2026-03-01T00:00:00.000Z", avg_response_seconds: 50, avg_resolution_seconds: 100 },
    ],
    incident_categories_frequency: [
      { label: "Fire", value: 6 },
      { label: "Medical Emergency", value: 4 },
    ],
    sos_categories_frequency: [
      { label: "Medical", value: 5 },
      { label: "Violence", value: 2 },
    ],
  },
};

describe("Reports page", () => {
  let anchorClickSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    useReportsOverview.mockReturnValue({
      data: overviewResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    });
    useGenerateReport.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
    });
    useExportReportCsv.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue("a,b\n1,2"),
    });
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy?.mockRestore();
  });

  it("renders backend cards and KPI values", () => {
    render(<Reports />);

    expect(screen.getByText("Report Exports")).toBeInTheDocument();
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Operational KPIs")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download /i })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Analytics range 7 Days" })).toHaveAttribute("data-state", "on");
    expect(screen.getByText("Daily Safety Report")).toBeInTheDocument();
    expect(screen.getByText("Weekly Safety Report")).toBeInTheDocument();
    expect(screen.getByText("Monthly Safety Report")).toBeInTheDocument();
    expect(screen.queryByText("Daily Incident Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily SOS Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly SOS Safety Report")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly Response Analysis")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly SOS Response Analysis")).not.toBeInTheDocument();
    expect(screen.getByText("Most Reported Incident Categories")).toBeInTheDocument();
    expect(screen.getByText("Most Reported SOS Categories")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("clicking Generate generates then exports csv for incident reports", async () => {
    const generateSpy = vi.fn().mockResolvedValue({ ok: true });
    const exportSpy = vi.fn().mockResolvedValue("a,b\n1,2");
    const refetchSpy = vi.fn().mockResolvedValue({});
    useGenerateReport.mockReturnValue({ mutateAsync: generateSpy });
    useExportReportCsv.mockReturnValue({ mutateAsync: exportSpy });
    useReportsOverview.mockReturnValue({
      data: overviewResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchSpy,
    });
    render(<Reports />);

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);

    await waitFor(() =>
      expect(generateSpy).toHaveBeenCalledWith({
        reportKey: "daily_safety_report",
        timezone: "Asia/Manila",
      })
    );

    await waitFor(() =>
      expect(exportSpy).toHaveBeenCalledWith({
        range: "24h",
        timezone: "Asia/Manila",
      })
    );

    await waitFor(() => expect(refetchSpy).toHaveBeenCalledTimes(1));
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: "Analytics range 7 Days" })).toHaveAttribute("data-state", "on");
  });

  it("supports generating and downloading SOS report cards", async () => {
    const generateSpy = vi.fn().mockResolvedValue({ ok: true });
    const exportSpy = vi.fn().mockResolvedValue("a,b\n1,2");
    const refetchSpy = vi.fn().mockResolvedValue({});
    useGenerateReport.mockReturnValue({ mutateAsync: generateSpy });
    useExportReportCsv.mockReturnValue({ mutateAsync: exportSpy });
    useReportsOverview.mockReturnValue({
      data: overviewResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchSpy,
    });
    render(<Reports />);

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[1]);

    await waitFor(() =>
      expect(generateSpy).toHaveBeenCalledWith({
        reportKey: "weekly_safety_report",
        timezone: "Asia/Manila",
      })
    );

    await waitFor(() =>
      expect(exportSpy).toHaveBeenCalledWith({
        range: "7d",
        timezone: "Asia/Manila",
      })
    );

    await waitFor(() => expect(refetchSpy).toHaveBeenCalledTimes(1));
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("changing analytics range refetches overview data for that range", async () => {
    render(<Reports />);

    fireEvent.click(screen.getByRole("radio", { name: "Analytics range 24 Hours" }));

    await waitFor(() =>
      expect(useReportsOverview).toHaveBeenLastCalledWith({ range: "24h", timezone: "Asia/Manila" })
    );

    expect(screen.getByRole("radio", { name: "Analytics range 24 Hours" })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("radio", { name: "Analytics range 7 Days" })).toHaveAttribute("data-state", "off");
  });

  it("shows loading, error, and empty states", () => {
    useReportsOverview.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const { rerender } = render(<Reports />);
    expect(screen.getByText("Loading reports...")).toBeInTheDocument();

    useReportsOverview.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: "unsupported timezone" },
      refetch: vi.fn(),
    });
    rerender(<Reports />);
    expect(screen.getByText("unsupported timezone")).toBeInTheDocument();

    useReportsOverview.mockReturnValueOnce({
      data: {
        ...overviewResponse,
        charts: {
          incidents_by_status: [],
          incidents_by_priority: [],
          incidents_trend: [],
          response_time_trend: [],
          incident_categories_frequency: [],
          sos_categories_frequency: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    rerender(<Reports />);
    expect(screen.getByText("No analytics data available for selected range.")).toBeInTheDocument();
  });
});
