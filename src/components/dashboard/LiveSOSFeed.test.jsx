import { fireEvent, render, screen } from "@testing-library/react";
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

  it("hides acknowledge action in readonly mode", () => {
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
        actionMode="readonly"
      />
    );

    expect(screen.queryByRole("button", { name: /Acknowledge/i })).not.toBeInTheDocument();
  });

  it("renders non-attention live alerts as full cards with details action", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "4",
            status: "active",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Liza",
            userPhone: "09171234567",
            assigned_unit: "Emergency Medical Unit",
            location: { address: "Binmaley", latitude: null, longitude: null },
            message: "Chest pain reported",
          },
        ]}
      />
    );

    expect(screen.getByText("Liza")).toBeInTheDocument();
    expect(screen.getByText("Emergency Medical Unit")).toBeInTheDocument();
    expect(screen.getByText("\"Chest pain reported\"")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View details/i })).toBeInTheDocument();
  });

  it("applies the provided scroll area height class", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "5",
            status: "active",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Paolo",
            userPhone: null,
            location: { address: "Lingayen", latitude: null, longitude: null },
            message: null,
          },
        ]}
        contentHeightClassName="h-[40rem]"
      />
    );

    expect(screen.getByTestId("live-sos-feed-scroll-area")).toHaveClass("h-[40rem]");
  });

  it("shows dispatch primary action instead of acknowledge", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "6",
            status: "active",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Nica",
            assigned_unit: "Police Personnel",
            location: { address: "Calasiao", latitude: null, longitude: null },
            message: null,
          },
        ]}
        actionMode="dispatch"
      />
    );

    expect(screen.getByRole("button", { name: /Resolve request/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Acknowledge/i })).not.toBeInTheDocument();
  });

  it("fires the dispatch resolve callback", () => {
    const onResolve = vi.fn();

    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "7",
            status: "active",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Joan",
            assigned_unit: "Emergency Medical Unit",
            location: { address: "Lingayen", latitude: null, longitude: null },
            message: null,
          },
        ]}
        actionMode="dispatch"
        onResolve={onResolve}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Resolve request/i }));
    expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({ id: "7" }));
  });

  it("shows the loading state instead of 'no alerts' while the queue loads", () => {
    render(
      <LiveSOSFeed
        alerts={[]}
        loading
        error={null}
        emptyTitle="No open SOS requests"
        emptySubtitle="Monitoring for emergencies..."
      />
    );

    expect(screen.queryByText("No open SOS requests")).not.toBeInTheDocument();
    expect(screen.getByTestId("live-sos-feed-skeleton")).toBeInTheDocument();
  });

  it("shows the error with a retry action instead of the empty state", () => {
    const onRetry = vi.fn();
    render(
      <LiveSOSFeed
        alerts={[]}
        loading={false}
        error={new Error("queue unavailable")}
        onRetry={onRetry}
        emptyTitle="No open SOS requests"
      />
    );

    expect(screen.getByText("queue unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No open SOS requests")).not.toBeInTheDocument();
  });

  it("does not render a Connected badge", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "10",
            status: "active",
            requires_attention: true,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Juan",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
  });

  it("labels an active thread as Active, not Acknowledged", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "11",
            status: "active",
            requires_attention: false,
            acknowledged_at: null,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Juan",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.queryByText("ACKNOWLEDGED")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("labels an acknowledged request in words, not in capitals", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "13",
            status: "acknowledged",
            requires_attention: false,
            acknowledged_at: "2026-02-27T10:00:00.000Z",
            timestamp: "2026-02-27T10:01:00.000Z",
            userName: "Ana",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.queryByText("ACKNOWLEDGED")).not.toBeInTheDocument();
    expect(screen.getByText("Acknowledged")).toBeInTheDocument();
  });

  it("makes the phone number a tappable link", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "12",
            status: "active",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Joan",
            userPhone: "09171234567",
            location: { address: "Lingayen", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "09171234567" })).toHaveAttribute(
      "href",
      "tel:09171234567"
    );
  });

  it("shows the newest thread first", () => {
    render(
      <LiveSOSFeed
        alerts={[
          {
            id: "old",
            status: "active",
            requires_attention: false,
            timestamp: "2026-02-27T09:00:00.000Z",
            userName: "OlderThread",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
          {
            id: "new",
            status: "active",
            requires_attention: false,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "NewerThread",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    const names = screen.getAllByText(/Thread$/, { selector: "span" }).map((el) => el.textContent);
    expect(names).toEqual(["NewerThread", "OlderThread"]);
  });

  it("does not pulse the whole card", () => {
    const { container } = render(
      <LiveSOSFeed
        alerts={[
          {
            id: "13",
            status: "active",
            requires_attention: true,
            timestamp: "2026-02-27T10:00:00.000Z",
            userName: "Juan",
            userPhone: null,
            location: { address: "Dagupan City", latitude: null, longitude: null },
            message: null,
          },
        ]}
      />
    );

    expect(container.querySelector(".animate-pulse")).toBeNull();
  });
});
