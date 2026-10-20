import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, getMapStyleConfig } from "@/lib/mapStyle";
import { MARKER_TYPES, markerLabel } from "@/lib/mapMarkerStyles";
import { apiGet } from "@/services/api";
import { Button } from "@/components/ui/button";
import { filterServiceAreaMarkers, isInsideServiceArea, validateServiceArea } from "@/lib/serviceArea";

export const MapCanvas = forwardRef(function MapCanvas(
  { markers, selectedMarker, onSelectMarker, onCenterChanged, heightClassName = "h-full" },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const maplibreRef = useRef(null);
  const markerRefs = useRef(new Map());
  const latestRef = useRef(null);
  const styleConfig = useMemo(() => getMapStyleConfig(), []);
  const [runtimeError, setRuntimeError] = useState(null);
  const [serviceArea, setServiceArea] = useState(null);
  const [boundaryError, setBoundaryError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [outsideFocus, setOutsideFocus] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [droppedCount, setDroppedCount] = useState(0);
  latestRef.current = { markers, selectedMarker, onSelectMarker, onCenterChanged, serviceArea };

  useEffect(() => {
    let cancelled = false;
    setServiceArea(null);
    setBoundaryError(null);
    apiGet("/service-area")
      .then(validateServiceArea)
      .then((area) => { if (!cancelled) setServiceArea(area); })
      .catch(() => {
        if (!cancelled) setBoundaryError("Dagupan City boundary could not be loaded. Check the backend connection, then retry.");
      });
    return () => { cancelled = true; };
  }, [retry]);

  const focusMarker = useCallback((marker, zoom = 14) => {
    const area = latestRef.current.serviceArea;
    if (!marker || !area) return;
    const inside = isInsideServiceArea(area, marker.lng, marker.lat);
    setOutsideFocus(!inside);
    if (!inside || !mapRef.current) return;
    mapRef.current.flyTo({ center: [marker.lng, marker.lat], zoom: Math.max(mapRef.current.getZoom(), zoom) });
  }, []);

  useImperativeHandle(ref, () => ({
    centerDefault() {
      if (!mapRef.current || !isInsideServiceArea(latestRef.current.serviceArea, MAP_DEFAULT_CENTER.lng, MAP_DEFAULT_CENTER.lat)) return;
      setOutsideFocus(false);
      mapRef.current.flyTo({
        center: [MAP_DEFAULT_CENTER.lng, MAP_DEFAULT_CENTER.lat],
        zoom: Math.max(MAP_DEFAULT_ZOOM, mapRef.current.getMinZoom()),
      });
    },
    focusMarker,
  }), [focusMarker]);

  useEffect(() => {
    if (!containerRef.current || !styleConfig.isValid || !serviceArea) return undefined;
    let cancelled = false;
    let localMap = null;
    let observer = null;
    setRuntimeError(null);

    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled) return;
        maplibreRef.current = maplibre;
        const bounds = [[serviceArea.bbox[0], serviceArea.bbox[1]], [serviceArea.bbox[2], serviceArea.bbox[3]]];
        localMap = new maplibre.Map({
          container: containerRef.current,
          style: styleConfig.styleUrl,
          center: [MAP_DEFAULT_CENTER.lng, MAP_DEFAULT_CENTER.lat],
          zoom: MAP_DEFAULT_ZOOM,
          maxBounds: bounds,
          renderWorldCopies: false,
          attributionControl: false,
        });
        mapRef.current = localMap;
        localMap.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");
        localMap.addControl(new maplibre.NavigationControl({ showCompass: true }), "top-right");
        const syncMinZoom = () => {
          const camera = localMap.cameraForBounds(bounds, { padding: 24 });
          if (Number.isFinite(camera?.zoom)) localMap.setMinZoom(camera.zoom);
        };
        syncMinZoom();
        localMap.on("resize", syncMinZoom);
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => localMap.resize());
          observer.observe(containerRef.current);
        }

        localMap.on("styleimagemissing", (event) => {
          const missingId = typeof event?.id === "string" ? event.id : "";
          // Some remote styles request an invalid blank icon id (" ").
          if (!missingId || missingId.trim() !== "" || localMap.hasImage(missingId)) return;
          try {
            localMap.addImage(missingId, { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) });
          } catch (_error) {
            // Ignore duplicate/invalid image registration noise.
          }
        });
        localMap.on("error", (event) => {
          if (!cancelled) setRuntimeError(event?.error?.message || event?.error?.statusText || "Map failed to load resources.");
        });

        // Remote style reloads remove custom sources and layers.
        localMap.on("style.load", () => {
          if (cancelled) return;
          if (!localMap.getSource("dagupan-city")) {
            localMap.addSource("dagupan-city", { type: "geojson", data: serviceArea });
          }
          if (!localMap.getLayer("dagupan-city-outline")) {
            localMap.addLayer({
              id: "dagupan-city-outline",
              type: "line",
              source: "dagupan-city",
              paint: { "line-color": "hsl(var(--primary))", "line-width": 2 },
            });
          }
        });
        localMap.on("load", () => {
          if (cancelled) return;
          setMapReady(true);
          focusMarker(latestRef.current.selectedMarker, 15);
        });
        localMap.on("moveend", () => {
          const center = localMap.getCenter();
          latestRef.current.onCenterChanged?.({ lat: center.lat, lng: center.lng });
        });
      } catch (error) {
        if (!cancelled) setRuntimeError(error?.message || "Map failed to initialize. Reload the page to retry.");
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      markerRefs.current.forEach((entry) => entry.marker.remove());
      markerRefs.current.clear();
      localMap?.remove();
      if (mapRef.current === localMap) mapRef.current = null;
      setMapReady(false);
    };
  }, [serviceArea, focusMarker, styleConfig.isValid, styleConfig.styleUrl]);

  // Markers are DOM elements rather than map layers, so their shape, colour
  // and focus ring are ordinary CSS, and each one is a real button.
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!mapReady || !map || !maplibre || !serviceArea) return;

    const visible = filterServiceAreaMarkers(markers || [], serviceArea);
    const visibleIds = new Set(visible.map((item) => item.id));

    markerRefs.current.forEach((entry, id) => {
      if (visibleIds.has(id)) return;
      entry.marker.remove();
      markerRefs.current.delete(id);
    });

    visible.forEach((item) => {
      let entry = markerRefs.current.get(item.id);
      if (!entry) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = `beacon-marker beacon-marker--${item.type === "sos" ? "sos" : "incident"}`;
        element.addEventListener("click", () => latestRef.current.onSelectMarker?.(item.id));
        const marker = new maplibre.Marker({ element, anchor: "center" })
          .setLngLat([item.lng, item.lat])
          .addTo(map);
        entry = { marker, element };
        markerRefs.current.set(item.id, entry);
      }
      entry.marker.setLngLat([item.lng, item.lat]);
      entry.element.setAttribute(
        "aria-label",
        markerLabel(item.type, item.title)
      );
    });

    const dropped = (markers || []).length - visible.length;
    setDroppedCount(dropped > 0 ? dropped : 0);
  }, [mapReady, markers, serviceArea]);

  useEffect(() => {
    mapRef.current?.resize();
  }, [heightClassName]);

  useEffect(() => {
    setOutsideFocus(false);
    focusMarker(selectedMarker);
  }, [selectedMarker, serviceArea, focusMarker]);

  if (!styleConfig.isValid) {
    return (
      <div className={`flex ${heightClassName} items-center justify-center p-6 text-sm text-destructive`}>
        {styleConfig.error}
      </div>
    );
  }

  const outsideSelected = selectedMarker && serviceArea &&
    !isInsideServiceArea(serviceArea, selectedMarker.lng, selectedMarker.lat);
  return (
    <div className={`relative ${heightClassName} w-full`}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Map of incidents and SOS threads in Dagupan City"
        className="h-full w-full"
      />
      {(boundaryError || runtimeError || !serviceArea) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background p-6 text-sm" role={boundaryError || runtimeError ? "alert" : "status"}>
          <p>{boundaryError || runtimeError || "Loading Dagupan City boundary..."}</p>
          {boundaryError && (
            <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
              Retry
            </Button>
          )}
        </div>
      )}
      {droppedCount > 0 && !boundaryError && !runtimeError && (
        <p className="absolute left-3 bottom-3 rounded border bg-background/90 p-2 text-xs text-muted-foreground">
          {droppedCount} {droppedCount === 1 ? "marker is" : "markers are"} outside Dagupan City and not
          shown.
        </p>
      )}
      {!boundaryError && !runtimeError && serviceArea && (outsideSelected || outsideFocus) && (
        <p role="status" className="absolute left-3 right-3 top-3 rounded border bg-background p-3 text-sm">
          This location is outside Dagupan City and cannot be shown on this map.
        </p>
      )}
    </div>
  );
});

export default MapCanvas;
