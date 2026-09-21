import { fireEvent, render, screen } from "@testing-library/react";
import LiveSOS from "@/pages/LiveSOS";
import { useAcknowledgeSOS, useResolveSOS, useSOSDetail, useSOSLiveQueue } from "@/api/useSosAPI";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/api/useSosAPI", () => ({
  useSOSLiveQueue: vi.fn(),
  useSOSDetail: vi.fn(),
  useAcknowledgeSOS: vi.fn(),
  useResolveSOS: vi.fn(),
  SOS_ASSIGNED_UNITS: [
    "Emergency Medical Unit",
    "Fire Station Unit",
    "Police Personnel",
    "Traffic Enforcement Unit",
  ],
}));

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ title, children }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/dashboard/LiveSOSDetailsDialog", () => ({
  LiveSOSDetailsDialog: ({ open, onMarkResolved }) =>
    open ? (
      <div>
        <div>Reporter: Liza</div>
        <button type="button" onClick={() => onMarkResolved?.({ id: "1", userName: "Juan" })}>
          Mark Resolved
        </button>
      </div>
    ) : null,
}));

describe("LiveSOS page", () => {
  function renderPage(initialEntries = ["/sos"]) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/sos" element={<LiveSOS />} />
          <Route path="/sos/:sosId" element={<LiveSOS />} />
        </Routes>
      </MemoryRouter>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    useSOSLiveQueue.mockImplementation(({ status }) => {
      if (status === "cancelled") {
        return {
          data: [
            {
              sos_id: 11,
              latest_status: "cancelled",
              latest_message: "CANCELLED: duplicate trigger",
              latest_event_at: "2026-03-01T09:00:00.000Z",
              full_name: "Maria",
              latest_address: "Calasiao",
            },
          ],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      if (status === "resolved") {
        return {
          data: [
            {
              sos_id: 11,
              latest_status: "resolved",
              latest_message: "CANCELLED: duplicate trigger",
              latest_event_at: "2026-03-01T09:00:00.000Z",
              full_name: "Maria",
              latest_address: "Calasiao",
            },
            {
              sos_id: 12,
              latest_status: "resolved",
              latest_message: "SAFE: assisted user",
              latest_event_at: "2026-03-01T08:00:00.000Z",
              full_name: "Ana",
              latest_address: "Dagupan",
            },
          ],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        data: [
          {
            sos_id: 1,
            latest_status: "active",
            requires_attention: true,
            latest_event_at: "2026-03-01T10:00:00.000Z",
            full_name: "Juan",
            latest_address: "Dagupan",
          },
          {
            sos_id: 2,
            latest_status: "active",
            acknowledged_at: "2026-03-01T10:05:00.000Z",
            assigned_unit: "Emergency Medical Unit",
            latest_event_at: "2026-03-01T10:06:00.000Z",
            full_name: "Liza",
            latest_address: "Binmaley",
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    useSOSDetail.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    useAcknowledgeSOS.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    });
    useResolveSOS.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    });
  });

  it("renders SOS Screen with live/dispatched/cancelled/resolved tabs", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "SOS Screen" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Live SOS \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Dispatch \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Cancelled SOS \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Resolved SOS \(1\)/i })).toBeInTheDocument();
  });

  it("requires assigned unit before confirming acknowledge", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useAcknowledgeSOS.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Acknowledge/i }));
    expect(
      screen.getByText(/After acknowledgement succeeds, accepted Beacon friends will be notified/i)
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: /Confirm Acknowledge/i });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Police Personnel"));
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sosId: 1,
        assigned_unit: "Police Personnel",
      })
    );
  });

  it("auto-selects assigned unit from emergency type when available", () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useSOSLiveQueue.mockImplementation(({ status }) => {
      if (status === "cancelled") {
        return {
          data: [],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      if (status === "resolved") {
        return {
          data: [],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        data: [
          {
            sos_id: 2,
            latest_status: "active",
            requires_attention: true,
            emergency_category: "fire",
            latest_event_at: "2026-03-01T10:00:00.000Z",
            full_name: "Pedro",
            latest_address: "Bonuan",
          },
          {
            sos_id: 3,
            latest_status: "active",
            assigned_unit: "Emergency Medical Unit",
            latest_event_at: "2026-03-01T10:01:00.000Z",
            full_name: "Liza",
            latest_address: "Binmaley",
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    useAcknowledgeSOS.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Acknowledge/i }));

    expect(screen.getByText(/Auto-selected from emergency type/i)).toBeInTheDocument();
    expect(
      screen.getByText(/admin success here remains authoritative even if push delivery is not visible/i)
    ).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: /Confirm Acknowledge/i });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sosId: 2,
        assigned_unit: "Fire Station Unit",
      })
    );
  });

  it("opens a confirmation modal before resolving and submits safe outcome", () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useResolveSOS.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Details/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Mark Resolved$/i }));

    expect(
      screen.getByText(/Are you sure you want to mark this SOS as resolved\?/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Add context for why this SOS is resolved/i), {
      target: { value: "User confirmed safe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Resolve/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      sosId: 1,
      terminalOutcome: "safe",
      note: "User confirmed safe",
    });
  });

  it("clicking summary cards activates the matching tab", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Dispatch\s+1\s+Assigned SOS threads/i }));
    expect(screen.getByRole("tab", { name: /Dispatch \(1\)/i })).toHaveAttribute("data-state", "active");

    fireEvent.click(screen.getByRole("button", { name: /Cancelled SOS\s+1\s+Cancelled outcomes/i }));
    expect(screen.getByRole("tab", { name: /Cancelled SOS \(1\)/i })).toHaveAttribute("data-state", "active");

    fireEvent.click(screen.getByRole("button", { name: /Resolved SOS\s+1\s+Resolved outcomes/i }));
    expect(screen.getByRole("tab", { name: /Resolved SOS \(1\)/i })).toHaveAttribute("data-state", "active");

    fireEvent.click(screen.getByRole("button", { name: /Live SOS\s+1\s+Unassigned open SOS threads/i }));
    expect(screen.getByRole("tab", { name: /Live SOS \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("reads the active tab from the URL query", () => {
    renderPage(["/sos?tab=cancelled"]);

    expect(screen.getByRole("tab", { name: /Cancelled SOS \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("reads the dispatched tab from the URL query", () => {
    renderPage(["/sos?tab=dispatched"]);

    expect(screen.getByRole("tab", { name: /Dispatch \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("falls back to live tab for invalid tab query", () => {
    renderPage(["/sos?tab=unknown"]);

    expect(screen.getByRole("tab", { name: /Live SOS \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("passes a 5-card-sized viewport height to the live feed", () => {
    renderPage();

    expect(screen.getByTestId("live-sos-feed-scroll-area")).toHaveClass("h-[40rem]");
    expect(screen.getByTestId("live-sos-feed-scroll-area")).toHaveClass("min-h-[34rem]");
  });

  it("moves assigned open sos threads into dispatch", async () => {
    renderPage();

    expect(screen.getByRole("tab", { name: /Live SOS \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Dispatch \(1\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Dispatch\s+1\s+Assigned SOS threads/i }));
    expect(await screen.findByText("Liza")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark as Resolved/i })).toBeInTheDocument();
  });

  it("opens the resolve confirmation from the dispatch list", () => {
    renderPage(["/sos?tab=dispatched"]);

    fireEvent.click(screen.getByRole("button", { name: /Mark as Resolved/i }));

    expect(
      screen.getByText(/Are you sure you want to mark this SOS as resolved\?/i)
    ).toBeInTheDocument();
  });
});
