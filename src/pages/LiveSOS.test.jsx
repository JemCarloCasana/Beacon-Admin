import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LiveSOS from "@/pages/LiveSOS";
import { useAcknowledgeSOS, useResolveSOS, useSOSDetail, useSOSLiveQueue } from "@/api/useSosAPI";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

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
        <div>Caller: Liza</div>
        <button type="button" onClick={() => onMarkResolved?.({ id: "1", userName: "Juan" })}>
          Resolve request
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
              sos_id: "11",
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
              sos_id: "11",
              latest_status: "resolved",
              latest_message: "CANCELLED: duplicate trigger",
              latest_event_at: "2026-03-01T09:00:00.000Z",
              full_name: "Maria",
              latest_address: "Calasiao",
            },
            {
              sos_id: "12",
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
            sos_id: "1",
            latest_status: "active",
            requires_attention: true,
            latest_event_at: "2026-03-01T10:00:00.000Z",
            full_name: "Juan",
            latest_address: "Dagupan",
          },
          {
            sos_id: "2",
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

    expect(screen.getByRole("heading", { name: "SOS Requests" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Needs dispatch \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Dispatched \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Cancelled \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Resolved \(1\)/i })).toBeInTheDocument();
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

    const confirmButton = screen.getByRole("button", { name: /Acknowledge request/i });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Police Personnel"));
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sosId: "1",
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
            sos_id: "2",
            latest_status: "active",
            requires_attention: true,
            emergency_category: "fire",
            latest_event_at: "2026-03-01T10:00:00.000Z",
            full_name: "Pedro",
            latest_address: "Bonuan",
          },
          {
            sos_id: "3",
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
    const confirmButton = screen.getByRole("button", { name: /Acknowledge request/i });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sosId: "2",
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

    fireEvent.click(screen.getByRole("button", { name: /View details/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Resolve request$/i }));

    expect(
      screen.getByText(/Resolve this SOS request\?/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Add context for why this SOS is resolved/i), {
      target: { value: "User confirmed safe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Resolve request/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      sosId: "1",
      terminalOutcome: "safe",
      note: "User confirmed safe",
    });
  });

  it("activating a tab reflects in the url", () => {
    renderPage();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Dispatched \(1\)/i }));

    expect(screen.getByRole("tab", { name: /Dispatched \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("renders one set of tab counts", () => {
    renderPage();

    expect(screen.getAllByText(/Needs dispatch \(1\)/i)).toHaveLength(1);
  });

  it("closes the detail dialog when the route loses its sos id", async () => {
    function BackButton() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/sos")}>
          back
        </button>
      );
    }

    render(
      <MemoryRouter initialEntries={["/sos/1"]}>
        <Routes>
          {/* One route, so navigating does not remount LiveSOS. */}
          <Route
            path="/sos/:sosId?"
            element={
              <>
                <LiveSOS />
                <BackButton />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Caller: Liza")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "back" }));

    await waitFor(() => {
      expect(screen.queryByText("Caller: Liza")).not.toBeInTheDocument();
    });
  });

  it("tells the operator when acknowledging fails instead of doing nothing", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error("network down"));
    useAcknowledgeSOS.mockReturnValue({ mutateAsync, isPending: false });
    mockToast.mockClear();

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Acknowledge/i }));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Police Personnel"));
    fireEvent.click(screen.getByRole("button", { name: /Acknowledge request/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed to acknowledge the request", variant: "destructive" })
      );
    });
  });

  it("tells the operator when resolving fails instead of doing nothing", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error("network down"));
    useResolveSOS.mockReturnValue({ mutateAsync, isPending: false });
    mockToast.mockClear();

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /View details/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Resolve request$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Resolve request/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed to resolve the request", variant: "destructive" })
      );
    });
  });

  it("resolves a thread as cancelled when the operator picks that outcome", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useResolveSOS.mockReturnValue({ mutateAsync, isPending: false });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /View details/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Resolve request$/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Caller cancelled" }));
    fireEvent.click(screen.getByRole("button", { name: /Resolve request/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ terminalOutcome: "cancelled" })
      );
    });
  });

  it("reads the active tab from the URL query", () => {
    renderPage(["/sos?tab=cancelled"]);

    expect(screen.getByRole("tab", { name: /Cancelled \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("reads the dispatched tab from the URL query", () => {
    renderPage(["/sos?tab=dispatched"]);

    expect(screen.getByRole("tab", { name: /Dispatched \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("falls back to live tab for invalid tab query", () => {
    renderPage(["/sos?tab=unknown"]);

    expect(screen.getByRole("tab", { name: /Needs dispatch \(1\)/i })).toHaveAttribute("data-state", "active");
  });

  it("passes a viewport-sized height to the live feed", () => {
    renderPage();

    expect(screen.getByTestId("live-sos-feed-scroll-area")).toHaveClass(
      "h-[calc(100vh-18rem)]"
    );
    expect(screen.getByTestId("live-sos-feed-scroll-area")).toHaveClass("min-h-[320px]");
  });

  it("moves assigned open sos threads into dispatch", async () => {
    renderPage();

    expect(screen.getByRole("tab", { name: /Needs dispatch \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Dispatched \(1\)/i })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Dispatched \(1\)/i }));
    expect(await screen.findByText("Liza")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resolve request/i })).toBeInTheDocument();
  });

  it("opens the resolve confirmation from the dispatch list", () => {
    renderPage(["/sos?tab=dispatched"]);

    fireEvent.click(screen.getByRole("button", { name: /Resolve request/i }));

    expect(
      screen.getByText(/Resolve this SOS request\?/i)
    ).toBeInTheDocument();
  });
});
