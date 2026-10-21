import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MapViewScreen from "@/views/map/MapViewScreen";

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/map/MapCanvas", () => ({
  default: () => <div data-testid="map">map</div>,
}));

const baseProps = {
  markers: [],
  selectedMarker: null,
  legendItems: [],
  filters: { showSos: true, showIncidents: true },
  stats: { sosCount: 3, incidentCount: 12, isLive: true, isRefetching: false },
  isLoading: false,
  error: null,
  hasMapData: true,
  permissions: { canViewSos: true, canViewIncidents: true },
  actions: {
    onToggleSos: vi.fn(),
    onToggleIncidents: vi.fn(),
    onRefresh: vi.fn(),
    onSelectMarker: vi.fn(),
    onCenterChanged: vi.fn(),
  },
};

describe("MapViewScreen permissions", () => {
  it("hides the incidents switch when the operator cannot view incidents", () => {
    render(
      <MapViewScreen
        {...baseProps}
        permissions={{ canViewSos: true, canViewIncidents: false }}
      />
    );

    expect(
      screen.queryByRole("switch", { name: /incident layer/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /sos layer/i })).toBeInTheDocument();
  });

  it("shows the incidents count only when incidents are visible", () => {
    render(
      <MapViewScreen
        {...baseProps}
        permissions={{ canViewSos: true, canViewIncidents: false }}
      />
    );

    expect(screen.queryByText(/Incidents 12/)).not.toBeInTheDocument();
    expect(screen.getByText(/SOS 3/)).toBeInTheDocument();
  });

  it("explains why a layer is missing", () => {
    render(
      <MapViewScreen
        {...baseProps}
        permissions={{ canViewSos: true, canViewIncidents: false }}
      />
    );

    expect(
      screen.getByText(/do not have permission to view incidents/i)
    ).toBeInTheDocument();
  });

  it("shows both layers when the operator can see both", () => {
    render(<MapViewScreen {...baseProps} />);

    expect(screen.getByRole("switch", { name: /incident layer/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /sos layer/i })).toBeInTheDocument();
    expect(screen.getByText(/Incidents 12/)).toBeInTheDocument();
  });
});
