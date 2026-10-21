import { act, renderHook, waitFor } from "@testing-library/react";
import { useDashboardController } from "@/controllers/useDashboardController";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useIncidentsAPI, useReporterDetail } from "@/api/useIncidentsAPI";
import { useSOSLiveQueue, useAcknowledgeSOS } from "@/api/useSosAPI";
import { useReportsOverview } from "@/api/useReportsAPI";

const mockNavigate = vi.fn();
const mockAcknowledgeMutateAsync = vi.fn().mockResolvedValue({ ok: true });

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/auth/AdminAuthProvider", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("@/api/useIncidentsAPI", () => ({
  useIncidentsAPI: vi.fn(),
  useReporterDetail: vi.fn(),
}));

vi.mock("@/api/useSosAPI", () => ({
  useSOSLiveQueue: vi.fn(),
  useAcknowledgeSOS: vi.fn(),
}));

vi.mock("@/api/useReportsAPI", () => ({
  useReportsOverview: vi.fn(),
}));

describe("useDashboardController", () => {
  let incidentsData;

  beforeEach(() => {
    vi.clearAllMocks();
    incidentsData = [
      {
        id: 1,
        title: "Medical Emergency",
        incident_type: "medical_emergency",
        status: "pending",
        priority: "critical",
        created_at: "2026-03-01T10:00:00.000Z",
        location: { address: "A Street", latitude: 14.6, longitude: 121.0 },
      },
      {
        id: 2,
        title: "Traffic Accident",
        incident_type: "traffic_accident",
        status: "dispatched",
        priority: "high",
        created_at: "2026-03-01T09:00:00.000Z",
        location: { address: "B Street", latitude: 14.7, longitude: 121.1 },
      },
    ];

    useAdminAuth.mockReturnValue({
      me: { id: 7, full_name: "Default Admin", role: "admin", permissions: [] },
      loading: false,
      hasPermission: vi.fn(() => true),
    });

    useIncidentsAPI.mockImplementation(() => ({
      data: incidentsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));
    useReporterDetail.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    useSOSLiveQueue.mockReturnValue({
      data: [
        {
          sos_id: 101,
          user_id: 10,
          full_name: "Maria",
          latest_status: "active",
          latest_event_at: "2026-03-01T10:10:00.000Z",
          latest_message: "Need help",
          latest_address: "SOS Street",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    useAcknowledgeSOS.mockReturnValue({
      mutateAsync: mockAcknowledgeMutateAsync,
      isPending: false,
    });

    useReportsOverview.mockReturnValue({
      data: {
        kpis: {
          active_incidents: 5,
          active_sos: 2,
          avg_response_seconds: 90,
          resolved_incidents: 20,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

  });

  it("assigns the fixed responder without navigating away", async () => {
    useSOSLiveQueue.mockReturnValue({
      data: [
        {
          sos_id: 101,
          user_id: 10,
          full_name: "Maria",
          latest_status: "active",
          emergency_category: "medical",
          latest_event_at: "2026-03-01T10:10:00.000Z",
          latest_message: "Need help",
          latest_address: "SOS Street",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardController());

    await act(async () => {
      await result.current.actions.onDispatchSos("101");
    });

    expect(mockAcknowledgeMutateAsync).toHaveBeenCalledWith({
      sosId: "101",
      assigned_unit: "Emergency Medical Unit",
      note: "Acknowledged and assigned to Emergency Medical Unit",
    });
    expect(mockNavigate).not.toHaveBeenCalledWith("/sos");
  });

  it("assigns no unit when the emergency type was not reported", async () => {
    useSOSLiveQueue.mockReturnValue({
      data: [
        {
          sos_id: 102,
          user_id: 10,
          full_name: "Ana",
          latest_status: "active",
          emergency_category: "i dont know",
          latest_event_at: "2026-03-01T10:10:00.000Z",
          latest_message: "Something is wrong",
          latest_address: "SOS Street",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardController());

    await act(async () => {
      await result.current.actions.onDispatchSos("102");
    });

    expect(mockAcknowledgeMutateAsync).not.toHaveBeenCalled();
    expect(result.current.pendingUnitAssignment).toBe("102");
  });

  it("assigns the unit the operator chose when the type was not reported", async () => {
    useSOSLiveQueue.mockReturnValue({
      data: [
        {
          sos_id: 102,
          user_id: 10,
          full_name: "Ana",
          latest_status: "active",
          emergency_category: "i dont know",
          latest_event_at: "2026-03-01T10:10:00.000Z",
          latest_message: "Something is wrong",
          latest_address: "SOS Street",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardController());

    await act(async () => {
      await result.current.actions.onAssignUnit("102", "Police Personnel");
    });

    expect(mockAcknowledgeMutateAsync).toHaveBeenCalledWith({
      sosId: "102",
      assigned_unit: "Police Personnel",
      note: "Acknowledged and assigned to Police Personnel",
    });
  });

  it("selects first active incident and keeps priority sort enabled by default", async () => {
    const { result } = renderHook(() => useDashboardController());

    await waitFor(() => {
      expect(result.current.selectedIncident?.id).toBe(1);
    });

    expect(result.current.filters.sortByPriority).toBe(true);
    expect(result.current.incidents[0].priority).toBe("critical");
    expect(result.current.kpis.avgResponseSeconds).toBe(90);
  });

  it("reselects first incident when current selection disappears", async () => {
    const { result, rerender } = renderHook(() => useDashboardController());

    await waitFor(() => {
      expect(result.current.selectedIncident?.id).toBe(1);
    });

    act(() => {
      result.current.actions.onSelectIncident({ id: 2 });
    });

    await waitFor(() => {
      expect(result.current.selectedIncident?.id).toBe(2);
    });

    incidentsData = [incidentsData[0]];
    rerender();

    await waitFor(() => {
      expect(result.current.selectedIncident?.id).toBe(1);
    });
  });

  it("returns incidents even when permission checks are false", async () => {
    useAdminAuth.mockReturnValue({
      me: { id: 7, full_name: "Default Admin", role: "admin", permissions: [] },
      loading: false,
      hasPermission: vi.fn(() => false),
    });

    const { result } = renderHook(() => useDashboardController());

    await waitFor(() => {
      expect(result.current.incidents.length).toBeGreaterThan(0);
    });
  });

  it("opens reporter dialog when Contact Reporter is clicked", async () => {
    const { result } = renderHook(() => useDashboardController());

    await waitFor(() => {
      expect(result.current.selectedIncident?.id).toBe(1);
    });

    act(() => {
      result.current.actions.onContactReporter();
    });

    expect(result.current.reporterDialog.open).toBe(true);
    expect(result.current.reporterDialog.incidentId).toBe(1);
    expect(result.current.reporterDialog.baseReporter?.id).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalledWith("/incidents");

    act(() => {
      result.current.actions.onCloseReporterDialog();
    });

    expect(result.current.reporterDialog.open).toBe(false);
  });
});
