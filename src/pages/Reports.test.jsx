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
      report_key: "daily_incident_summary",
      title: "Daily Incident Summary",
      description: "Overview of all incidents reported in the last 24 hours",
      last_generated_at: "2026-03-01T07:00:00.000Z",
    },
    {
      report_key: "weekly_response_analysis",
      title: "Weekly Response Analysis",
      description: "Response times and resolution rates for the past week",
      last_generated_at: "2026-03-01T06:00:00.000Z",
    },
    {
      report_key: "monthly_safety_report",
      title: "Monthly Safety Report",
      description: "Comprehensive monthly report with trends and insights",
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

    expect(screen.getByText("Daily Incident Summary")).toBeInTheDocument();
    expect(screen.getByText("Weekly Response Analysis")).toBeInTheDocument();
    expect(screen.getByText("Monthly Safety Report")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("clicking Generate calls generate endpoint with report_key", async () => {
    const generateSpy = vi.fn().mockResolvedValue({ ok: true });
    useGenerateReport.mockReturnValue({ mutateAsync: generateSpy });
    render(<Reports />);

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);

    await waitFor(() =>
      expect(generateSpy).toHaveBeenCalledWith({
        reportKey: "daily_incident_summary",
        timezone: "Asia/Manila",
      })
    );
  });

  it("clicking Download calls csv export with mapped range", async () => {
    const exportSpy = vi.fn().mockResolvedValue("a,b\n1,2");
    useExportReportCsv.mockReturnValue({ mutateAsync: exportSpy });
    render(<Reports />);

    fireEvent.click(screen.getByRole("button", { name: /Download Daily Incident Summary/i }));

    await waitFor(() =>
      expect(exportSpy).toHaveBeenCalledWith({
        range: "24h",
        timezone: "Asia/Manila",
      })
    );
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
