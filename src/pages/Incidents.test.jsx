import { fireEvent, render, screen } from "@testing-library/react";
import Incidents from "@/pages/Incidents";
import { useIncidentDetail, useIncidentsAPI, useUpdateIncident } from "@/api/useIncidentsAPI";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

vi.mock("@/api/useIncidentsAPI", () => ({
  useIncidentsAPI: vi.fn(),
  useIncidentDetail: vi.fn(),
  useUpdateIncident: vi.fn(),
}));

vi.mock("@/auth/AdminAuthProvider", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/map/MapCanvas", () => ({
  default: () => <div data-testid="incident-map">map</div>,
}));

describe("Incidents page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminAuth.mockReturnValue({
      me: { id: 1 },
      loading: false,
      hasPermission: () => false,
    });
    useIncidentsAPI.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    useIncidentDetail.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    useUpdateIncident.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    });
  });

  it("renders incidents from API and removes New Incident button", () => {
    useIncidentsAPI.mockReturnValue({
      data: [
        {
          id: 1,
          title: "Fire Incident",
          description: "Smoke reported",
          category: "fire",
          priority: "high",
          status: "pending",
          location: { address: "Main Street" },
          createdAt: "2026-03-01T01:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<Incidents />);

    expect(screen.getByText("Fire Incident")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new incident/i })).not.toBeInTheDocument();
  });

  it("shows Unknown badges for out-of-contract priority/status", () => {
    useIncidentsAPI.mockReturnValue({
      data: [
        {
          id: 2,
          title: "Unknown Severity",
          priority: "urgent",
          status: "triaged",
          createdAt: "2026-03-01T01:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<Incidents />);

    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(2);
  });

  it("opens details modal and shows map fallback for missing coordinates", () => {
    useIncidentsAPI.mockReturnValue({
      data: [
        {
          id: 3,
          title: "Theft Report",
          description: "Wallet stolen",
          priority: "medium",
          status: "dispatched",
          location: { address: "Barangay Hall" },
          created_at: "2026-03-01T01:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<Incidents />);
    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByText("Incident #3 details and reported location.")).toBeInTheDocument();
    expect(screen.getByText("No valid coordinates to display on map.")).toBeInTheDocument();
  });

  it("shows loading, error, and empty states", () => {
    useIncidentsAPI.mockReturnValueOnce({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    });
    const { rerender } = render(<Incidents />);
    expect(screen.getByText("Loading incidents...")).toBeInTheDocument();

    useIncidentsAPI.mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: true,
      error: { message: "boom" },
    });
    rerender(<Incidents />);
    expect(screen.getByText("boom")).toBeInTheDocument();

    useIncidentsAPI.mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    rerender(<Incidents />);
    expect(screen.getByText("No incidents found.")).toBeInTheDocument();
  });
});
