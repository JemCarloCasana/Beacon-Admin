import { render, screen, within } from "@testing-library/react";
import { forwardRef } from "react";
import MapViewScreen from "@/views/map/MapViewScreen";
import { MAP_MARKER_TYPE_STYLES } from "@/lib/mapMarkerStyles";

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/map/MapCanvas", () => ({
  default: forwardRef(function MockMapCanvas(_props, _ref) {
    return <div data-testid="map-canvas">map</div>;
  }),
}));

function createProps(overrides = {}) {
  return {
    markers: [],
    selectedMarker: null,
    legendItems: [{ type: "sos" }, { type: "incident" }],
    filters: {
      showSos: true,
      showIncidents: true,
    },
    stats: {
      sosCount: 1,
      incidentCount: 2,
      isRefetching: false,
      isLive: true,
    },
    isLoading: false,
    error: null,
    hasMapData: true,
    actions: {
      onToggleSos: vi.fn(),
      onToggleIncidents: vi.fn(),
      onSelectMarker: vi.fn(),
      onCenterChanged: vi.fn(),
      onClearSelection: vi.fn(),
      onRefresh: vi.fn(),
    },
    ...overrides,
  };
}

describe("MapViewScreen", () => {
  it("renders map legend with marker type labels", () => {
    render(<MapViewScreen {...createProps()} />);

    const legendHeading = screen.getByRole("heading", { name: "Map Legend" });
    const legendCard = legendHeading.closest(".rounded-lg");
    expect(legendHeading).toBeInTheDocument();
    expect(legendCard).not.toBeNull();
    expect(within(legendCard).getByText("SOS")).toBeInTheDocument();
    expect(within(legendCard).getByText("Incidents")).toBeInTheDocument();
  });

  it("uses configured marker colors for legend swatches", () => {
    render(<MapViewScreen {...createProps()} />);

    expect(screen.getByTestId("map-legend-swatch-sos")).toHaveStyle({
      backgroundColor: MAP_MARKER_TYPE_STYLES.sos.color,
    });
    expect(screen.getByTestId("map-legend-swatch-incident")).toHaveStyle({
      backgroundColor: MAP_MARKER_TYPE_STYLES.incident.color,
    });
  });

  it("renders only visible marker types in the legend", () => {
    render(<MapViewScreen {...createProps({ legendItems: [{ type: "sos" }] })} />);

    const legendHeading = screen.getByRole("heading", { name: "Map Legend" });
    const legendCard = legendHeading.closest(".rounded-lg");

    expect(within(legendCard).getByText("SOS")).toBeInTheDocument();
    expect(within(legendCard).queryByText("Incidents")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-legend-swatch-incident")).not.toBeInTheDocument();
  });

  it("shows an empty-state message when no marker types are visible", () => {
    render(<MapViewScreen {...createProps({ legendItems: [] })} />);

    expect(screen.getByText("No visible marker types.")).toBeInTheDocument();
  });
});
