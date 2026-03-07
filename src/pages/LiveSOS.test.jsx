import { fireEvent, render, screen } from "@testing-library/react";
import LiveSOS from "@/pages/LiveSOS";
import { useAcknowledgeSOS, useSOSDetail, useSOSLiveQueue } from "@/api/useSosAPI";

vi.mock("@/api/useSosAPI", () => ({
  useSOSLiveQueue: vi.fn(),
  useSOSDetail: vi.fn(),
  useAcknowledgeSOS: vi.fn(),
  SOS_ASSIGNED_UNITS: [
    "Emergency Medical Unit",
    "Fire Station Unit",
    "Police Personnel",
    "Traffic Enforcement Unit",
  ],
}));

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/dashboard/LiveSOSDetailsDialog", () => ({
  LiveSOSDetailsDialog: () => null,
}));

describe("LiveSOS page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSOSLiveQueue.mockReturnValue({
      data: [
        {
          sos_id: 1,
          latest_status: "active",
          requires_attention: true,
          latest_event_at: "2026-03-01T10:00:00.000Z",
          full_name: "Juan",
          latest_address: "Dagupan",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
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
  });

  it("requires assigned unit before confirming acknowledge", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useAcknowledgeSOS.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<LiveSOS />);

    fireEvent.click(screen.getByRole("button", { name: /Acknowledge/i }));

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
    useSOSLiveQueue.mockReturnValue({
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
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
    useAcknowledgeSOS.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<LiveSOS />);

    fireEvent.click(screen.getByRole("button", { name: /Acknowledge/i }));

    expect(screen.getByText(/Auto-selected from emergency type/i)).toBeInTheDocument();
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
});
