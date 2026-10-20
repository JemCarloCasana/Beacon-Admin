import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, getMapStyleConfig } from "@/lib/mapStyle";
import { MAP_MARKER_TYPE_STYLES } from "@/lib/mapMarkerStyles";
import { apiGet } from "@/services/api";
import { filterServiceAreaMarkers, isInsideServiceArea, validateServiceArea } from "@/lib/serviceArea";

function markersToGeoJson(markers, area) {
  return {
    type: "FeatureCollection",
    features: filterServiceAreaMarkers(markers, area).map((item) => ({
      type: "Feature",
      properties: { id: item.id, type: item.type, title: item.title },
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
    })),
  };
}

export const MapCanvas = forwardRef(function MapCanvas(
  { markers, selectedMarker, onSelectMarker, onCenterChanged, heightClassName = "h-full" },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const latestRef = useRef(null);
  const styleConfig = useMemo(() => getMapStyleConfig(), []);
  const [runtimeError, setRuntimeError] = useState(null);
  const [serviceArea, setServiceArea] = useState(null);
  const [boundaryError, setBoundaryError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [outsideFocus, setOutsideFocus] = useState(false);
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
              paint: { "line-color": "#2563eb", "line-width": 2 },
            });
          }
          if (!localMap.getSource("markers")) {
            localMap.addSource("markers", { type: "geojson", data: markersToGeoJson(latestRef.current.markers, serviceArea) });
          }
          for (const type of ["sos", "incident"]) {
            if (localMap.getLayer(`${type}-points`)) continue;
            localMap.addLayer({
              id: `${type}-points`,
              type: "circle",
              source: "markers",
              filter: ["==", ["get", "type"], type],
              paint: {
                "circle-radius": MAP_MARKER_TYPE_STYLES[type].radius,
                "circle-color": MAP_MARKER_TYPE_STYLES[type].color,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
              },
            });
          }
        });
        localMap.on("load", () => {
          if (!cancelled) focusMarker(latestRef.current.selectedMarker, 15);
        });
        // Bind interactions once; style reloads only rebuild the layers above.
        for (const type of ["sos", "incident"]) {
          localMap.on("click", `${type}-points`, (event) => {
            const markerId = event?.features?.[0]?.properties?.id;
            if (markerId) latestRef.current.onSelectMarker?.(markerId);
          });
          localMap.on("mouseenter", `${type}-points`, () => { localMap.getCanvas().style.cursor = "pointer"; });
          localMap.on("mouseleave", `${type}-points`, () => { localMap.getCanvas().style.cursor = ""; });
        }
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
      localMap?.remove();
      if (mapRef.current === localMap) mapRef.current = null;
    };
  }, [serviceArea, focusMarker, styleConfig.isValid, styleConfig.styleUrl]);

  useEffect(() => {
    mapRef.current?.resize();
  }, [heightClassName]);

  useEffect(() => {
    mapRef.current?.getSource("markers")?.setData(markersToGeoJson(markers, serviceArea));
  }, [markers, serviceArea]);

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
      <div ref={containerRef} className="h-full w-full" />
      {(boundaryError || runtimeError || !serviceArea) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background p-6 text-sm" role={boundaryError || runtimeError ? "alert" : "status"}>
          <p>{boundaryError || runtimeError || "Loading Dagupan City boundary..."}</p>
          {boundaryError && <button className="rounded border px-3 py-2" onClick={() => setRetry((value) => value + 1)}>Retry</button>}
        </div>
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
