import { render, screen } from "@testing-library/react";
import { LiveSOSFeed } from "@/components/dashboard/LiveSOSFeed";

describe("LiveSOSFeed", () => {
  it("shows address when available", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "1",
            status: "active",
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Juan",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.getByText("Dagupan City")).toBeInTheDocument();
  });

  it("shows coordinate fallback when address is missing", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "1",
            status: "active",
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Juan",
            userPhone: null,
            location: { address: null, latitude: 16.0431, longitude: 120.3333 },
            message: null,
          },
        ]}
      />
    );

    expect(screen.getByText("Lat 16.04310, Lng 120.33330")).toBeInTheDocument();
  });

  it("shows unavailable location when address and coordinates are missing", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "1",
            status: "active",
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Juan",
            userPhone: null,
            location: { address: null, latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.getByText("Location unavailable")).toBeInTheDocument();
  });

  it("shows assigned unit badge when present", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "1",
            status: "active",
            requires_attention: true,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Juan",
            userPhone: null,
            assigned_unit: "Police Personnel",
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.getByText("Police Personnel")).toBeInTheDocument();
  });

  it("shows Cancelled SOS label for resolved rows marked as cancelled", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "2",
            status: "resolved",
            terminal_label: "Cancelled SOS",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Maria",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.getByText("Cancelled SOS")).toBeInTheDocument();
  });

  it("hides acknowledge action when showAcknowledge is false", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "3",
            status: "resolved",
            terminal_label: "Resolved",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Jose",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
        showAcknowledge={false}
      />
    );

    expect(screen.queryByRole("button", { name: /Acknowledge/i })).not.toBeInTheDocument();
  });
});
