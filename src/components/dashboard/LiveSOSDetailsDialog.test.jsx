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
});
