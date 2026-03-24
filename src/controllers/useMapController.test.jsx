import { act, renderHook } from "@testing-library/react";
import { useMapController } from "@/controllers/useMapController";
import { useMapIncidents } from "@/api/useIncidentsAPI";
import { useSOSLiveQueue } from "@/api/useSosAPI";

vi.mock("@/api/useSosAPI", () => ({
  useSOSLiveQueue: vi.fn(),
}));

vi.mock("@/api/useIncidentsAPI", () => ({
  useMapIncidents: vi.fn(),
}));

function mockDataHooks() {
  useSOSLiveQueue.mockReturnValue({
    data: [
      {
        sos_id: 11,
        user_id: 5,
        full_name: "SOS User",
        latest_latitude: 14.609,
        latest_longitude: 120.99,
        latest_event_at: "2026-02-27T10:00:00.000Z",
      },
    ],
    isLoading: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(),
  });

  useMapIncidents.mockReturnValue({
    data: [
      {
        id: 22,
        title: "Flood",
        lat: 14.61,
        lng: 121.0,
        status: "pending",
        updated_at: "2026-02-27T10:01:00.000Z",
      },
    ],
    isLoading: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe("useMapController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDataHooks();
  });

  it("selects and clears a marker", () => {
    const { result } = renderHook(() => useMapController());

    expect(result.current.selectedMarker).toBeNull();

    act(() => {
      result.current.actions.onSelectMarker("sos-11");
    });
    expect(result.current.selectedMarker?.id).toBe("sos-11");

    act(() => {
      result.current.actions.onClearSelection();
    });
    expect(result.current.selectedMarker).toBeNull();
  });

  it("toggles marker filters", () => {
    const { result } = renderHook(() => useMapController());

    expect(result.current.filters.showSos).toBe(true);
    expect(result.current.filters.showIncidents).toBe(true);
    expect(result.current.legendItems).toEqual([{ type: "sos" }, { type: "incident" }]);

    act(() => {
      result.current.actions.onToggleSos();
    });
    expect(result.current.filters.showSos).toBe(false);
    expect(result.current.legendItems).toEqual([{ type: "incident" }]);

    act(() => {
      result.current.actions.onToggleIncidents();
    });
    expect(result.current.filters.showIncidents).toBe(false);
    expect(result.current.legendItems).toEqual([]);
  });

  it("refreshes both map data queries", () => {
    const sosRefetch = vi.fn();
    const incidentsRefetch = vi.fn();
    useSOSLiveQueue.mockReturnValue({
      data: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: sosRefetch,
    });
    useMapIncidents.mockReturnValue({
      data: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: incidentsRefetch,
    });

    const { result } = renderHook(() => useMapController());
    act(() => {
      result.current.actions.onRefresh();
    });

    expect(sosRefetch).toHaveBeenCalledTimes(1);
    expect(incidentsRefetch).toHaveBeenCalledTimes(1);
  });

  it("excludes resolved incidents from markers, counts, and legend items", () => {
    useMapIncidents.mockReturnValue({
      data: [
        {
          id: 22,
          title: "Resolved Flood",
          lat: 14.61,
          lng: 121.0,
          status: "resolved",
          updated_at: "2026-02-27T10:01:00.000Z",
        },
      ],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useMapController());

    expect(result.current.markers.map((item) => item.type)).toEqual(["sos"]);
    expect(result.current.stats.incidentCount).toBe(0);
    expect(result.current.legendItems).toEqual([{ type: "sos" }]);
  });
});
