import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import MapCanvas from "./MapCanvas";
import { apiGet } from "@/services/api";
import { MAP_DEFAULT_CENTER } from "@/lib/mapStyle";

const state = vi.hoisted(() => ({ maps: [] }));
vi.mock("@/services/api", () => ({ apiGet: vi.fn() }));
vi.mock("@/lib/mapStyle", async (importOriginal) => ({
  ...await importOriginal(),
  getMapStyleConfig: () => ({ isValid: true, styleUrl: "https://example.test/style.json" }),
}));
vi.mock("maplibre-gl", () => ({
  AttributionControl: class {},
  NavigationControl: class {},
  Marker: class {
    constructor(options) {
      this.options = options;
      this.element = options.element;
      this.lngLat = null;
      this.removed = false;
    }
    setLngLat(lngLat) { this.lngLat = lngLat; return this; }
    addTo(map) {
      (map.markers ||= []).push(this);
      // The real Marker appends its element to the map container.
      map.options.container?.appendChild(this.element);
      return this;
    }
    remove() {
      this.removed = true;
      this.element?.remove();
    }
  },
  Map: class {
    constructor(options) {
      this.options = options;
      this.sources = {};
      this.layers = {};
      this.handlers = {};
      this.minZoom = 0;
      this.flyTo = vi.fn();
      this.remove = vi.fn();
      this.resize = vi.fn(() => this.emit("resize"));
      this.cameraForBounds = vi.fn(() => ({ zoom: 12.25 }));
      this.setMinZoom = vi.fn((zoom) => { this.minZoom = zoom; });
      state.maps.push(this);
    }
    addControl() {}
    getZoom() { return 13; }
    getMinZoom() { return this.minZoom; }
    getCenter() { return { lat: 16.04, lng: 120.33 }; }
    getCanvas() { return { style: {} }; }
    getSource(id) { return this.sources[id]; }
    addSource(id, source) {
      this.sources[id] = { ...source, setData: vi.fn((data) => { this.sources[id].data = data; }) };
    }
    getLayer(id) { return this.layers[id]; }
    addLayer(layer) { this.layers[layer.id] = layer; }
    on(event, layerOrHandler, handler) {
      const key = handler ? `${event}:${layerOrHandler}` : event;
      (this.handlers[key] ||= []).push(handler || layerOrHandler);
    }
    emit(event, data) { this.handlers[event]?.forEach((handler) => handler(data)); }
  },
}));

const area = {
  type: "FeatureCollection",
  bbox: [120.30, 16.00, 120.38, 16.12],
  features: [{
    type: "Feature",
    properties: { name: "Dagupan City", boundary_id: "dpwh-2022-03-dagupan" },
    geometry: { type: "Polygon", coordinates: [
      [[120.30, 16.00], [120.38, 16.00], [120.38, 16.12], [120.30, 16.12], [120.30, 16.00]],
      [[120.31, 16.01], [120.32, 16.01], [120.32, 16.02], [120.31, 16.02], [120.31, 16.01]],
    ] },
  }],
};
const inside = { id: "sos-in", type: "sos", lng: 120.335, lat: 16.04 };
const edge = { id: "incident-edge", type: "incident", lng: 120.30, lat: 16.04 };
const outside = { id: "sos-out", type: "sos", lng: 120.4, lat: 16.04 };
const hole = { id: "incident-hole", type: "incident", lng: 120.315, lat: 16.015 };

async function loadedMap() {
  await waitFor(() => expect(state.maps).toHaveLength(1));
  const map = state.maps[0];
  act(() => { map.emit("style.load"); map.emit("load"); });
  return map;
}

beforeEach(() => {
  state.maps.length = 0;
  apiGet.mockReset().mockResolvedValue(area);
});

describe("Dagupan map restrictions", () => {
  it("waits for the boundary, constrains the camera and renders only city markers", async () => {
    let resolveBoundary;
    apiGet.mockImplementation(() => new Promise((resolve) => { resolveBoundary = resolve; }));
    const ref = createRef();
    const markers = [inside, edge, outside, hole];
    render(<MapCanvas ref={ref} markers={markers} selectedMarker={inside} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Dagupan City boundary");
    expect(state.maps).toHaveLength(0);
    expect(apiGet).toHaveBeenCalledWith("/service-area");
    await act(async () => resolveBoundary(area));
    const map = await loadedMap();
    expect(map.options.maxBounds).toEqual([[120.30, 16.00], [120.38, 16.12]]);
    expect(map.options.renderWorldCopies).toBe(false);
    expect(map.cameraForBounds).toHaveBeenCalledWith(map.options.maxBounds, expect.any(Object));
    expect(map.getMinZoom()).toBe(12.25);
    expect(map.getSource("dagupan-city").data).toBe(area);
    expect(map.getLayer("dagupan-city-outline").source).toBe("dagupan-city");
    expect([...document.querySelectorAll(".beacon-marker")].map((el) => el.getAttribute("aria-label")))
      .toEqual(["SOS", "Incidents"]);
    expect(markers).toEqual([inside, edge, outside, hole]);
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [inside.lng, inside.lat] }));
    map.cameraForBounds.mockReturnValue({ zoom: 14 });
    act(() => map.emit("resize"));
    expect(map.getMinZoom()).toBe(14);
    act(() => ref.current.centerDefault());
    expect(map.flyTo).toHaveBeenLastCalledWith({ center: [MAP_DEFAULT_CENTER.lng, MAP_DEFAULT_CENTER.lat], zoom: 14 });
  });

  it("blocks initial, selected and imperative outside focus without changing coordinates", async () => {
    const ref = createRef();
    const { rerender } = render(<MapCanvas ref={ref} markers={[outside]} selectedMarker={outside} />);
    const map = await loadedMap();
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("outside Dagupan City");
    act(() => ref.current.focusMarker(hole));
    expect(map.flyTo).not.toHaveBeenCalled();
    rerender(<MapCanvas ref={ref} markers={[inside, hole]} selectedMarker={hole} />);
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".beacon-marker")).toHaveLength(1);
    rerender(<MapCanvas ref={ref} markers={[inside, edge]} selectedMarker={inside} />);
    expect(screen.queryByText(/outside Dagupan City/)).not.toBeInTheDocument();
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [inside.lng, inside.lat] }));
    act(() => ref.current.focusMarker(edge));
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [edge.lng, edge.lat] }));
    expect(outside.lng).toBe(120.4);
    expect(hole.lng).toBe(120.315);
  });

  it("restores the outline and filtered markers after style reload without duplicating handlers", async () => {
    const oldSelect = vi.fn();
    const newSelect = vi.fn();
    const { rerender } = render(<MapCanvas markers={[inside]} onSelectMarker={oldSelect} />);
    const map = await loadedMap();
    rerender(<MapCanvas markers={[edge, outside]} onSelectMarker={newSelect} />);
    act(() => {
      map.sources = {};
      map.layers = {};
      map.emit("style.load");
      map.emit("style.load");
    });
    expect(state.maps).toHaveLength(1);
    expect(map.getSource("dagupan-city").data).toBe(area);
    expect(map.getLayer("dagupan-city-outline")).toBeDefined();
    expect(document.querySelectorAll(".beacon-marker")).toHaveLength(1);

    // The marker is a real button, so it selects on click.
    fireEvent.click(document.querySelector(".beacon-marker"));
    expect(newSelect).toHaveBeenCalledExactlyOnceWith(edge.id);
    expect(oldSelect).not.toHaveBeenCalled();
    expect(map.options.maxBounds).toEqual([[120.30, 16.00], [120.38, 16.12]]);
  });

  it("gives the map an accessible name and a zoom control", async () => {
    render(<MapCanvas markers={[inside]} />);
    await loadedMap();

    expect(screen.getByRole("application", { name: /map of incidents and sos threads/i })).toBeInTheDocument();
  });

  it("reports the markers the service area drops instead of showing a blank map", async () => {
    render(<MapCanvas markers={[inside, outside]} />);
    await loadedMap();

    expect(document.querySelectorAll(".beacon-marker")).toHaveLength(1);
    expect(screen.getByText(/outside Dagupan City and not shown/i)).toBeInTheDocument();
  });

  it.each([new Error("offline"), null])("fails closed and lets the operator retry a missing or invalid boundary", async (failure) => {
    if (failure) apiGet.mockRejectedValueOnce(failure);
    else apiGet.mockResolvedValueOnce({ ...area, features: [] });
    render(<MapCanvas markers={[inside]} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Check the backend connection, then retry");
    expect(state.maps).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await loadedMap();
    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not construct a map if unmounted while fetching the boundary", async () => {
    let resolveBoundary;
    apiGet.mockImplementation(() => new Promise((resolve) => { resolveBoundary = resolve; }));
    const { unmount } = render(<MapCanvas markers={[inside]} />);
    unmount();
    await act(async () => resolveBoundary(area));
    expect(state.maps).toHaveLength(0);
  });
});
