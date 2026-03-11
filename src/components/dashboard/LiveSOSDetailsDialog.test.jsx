import { render, screen } from "@testing-library/react";
import { LiveSOSDetailsDialog } from "@/components/dashboard/LiveSOSDetailsDialog";

vi.mock("@/components/map/MapCanvas", () => ({
  default: () => <div data-testid="sos-map">map</div>,
}));

describe("LiveSOSDetailsDialog", () => {
  it("shows assigned unit and acknowledged timestamp when present", () => {
    render(
      <LiveSOSDetailsDialog
        open
        onOpenChange={() => {}}
        detailQuery={{
          data: {
            thread: {
              sos_id: 100,
              latest_status: "active",
              full_name: "Juan Dela Cruz",
              latest_event_at: "2026-03-01T10:00:00.000Z",
              acknowledged_at: "2026-03-01T10:05:00.000Z",
              assigned_unit: "Police Personnel",
            },
            events: [],
          },
          isLoading: false,
          isError: false,
          error: null,
        }}
      />
    );

    expect(screen.getByText("Police Personnel")).toBeInTheDocument();
    expect(screen.getByText(/Acknowledged:/i)).toBeInTheDocument();
  });

  it("shows Cancelled SOS label for resolved cancelled outcomes", () => {
    render(
      <LiveSOSDetailsDialog
        open
        onOpenChange={() => {}}
        detailQuery={{
          data: {
            thread: {
              sos_id: 101,
              latest_status: "resolved",
              latest_message: "CANCELLED: accidental trigger",
              full_name: "Ana",
              latest_event_at: "2026-03-01T11:00:00.000Z",
            },
            events: [],
          },
          isLoading: false,
          isError: false,
          error: null,
        }}
      />
    );

    expect(screen.getByText("Cancelled SOS")).toBeInTheDocument();
  });

  it("renders normalized timeline event labels", () => {
    render(
      <LiveSOSDetailsDialog
        open
        onOpenChange={() => {}}
        detailQuery={{
          data: {
            thread: {
              sos_id: 102,
              latest_status: "resolved",
              full_name: "Lia",
              latest_event_at: "2026-03-01T11:00:00.000Z",
            },
            events: [
              { id: 1, status: "active", created_at: "2026-03-01T09:00:00.000Z", actor_type: "user", message: "Need help" },
              { id: 2, status: "acknowledged", created_at: "2026-03-01T09:05:00.000Z", actor_type: "admin", message: "Assigned unit" },
              { id: 3, status: "resolved", created_at: "2026-03-01T09:10:00.000Z", actor_type: "admin", message: "CANCELLED: false trigger" },
            ],
          },
          isLoading: false,
          isError: false,
          error: null,
        }}
      />
    );

    expect(screen.getByText("Timeline Logs")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Acknowledged")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });
});
