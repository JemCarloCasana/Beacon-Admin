import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, getMapStyleConfig } from "@/lib/mapStyle";

function markersToGeoJson(markers) {
  return {
    type: "FeatureCollection",
    features: (Array.isArray(markers) ? markers : []).map((item) => ({
      type: "Feature",
      properties: {
        id: item.id,
        type: item.type,
        title: item.title,
      },
      geometry: {
        type: "Point",
        coordinates: [item.lng, item.lat],
      },
    })),
  };
}

export const MapCanvas = forwardRef(function MapCanvas(
  { markers, selectedMarker, onSelectMarker, onCenterChanged, heightClassName = "h-full" },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerSourceReadyRef = useRef(false);
  const selectedMarkerRef = useRef(selectedMarker);
  const markersRef = useRef(markers);
  const styleConfig = useMemo(() => getMapStyleConfig(), []);
  const [runtimeError, setRuntimeError] = useState(null);

  useEffect(() => {
    selectedMarkerRef.current = selectedMarker;
  }, [selectedMarker]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useImperativeHandle(ref, () => ({
    centerDefault() {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [MAP_DEFAULT_CENTER.lng, MAP_DEFAULT_CENTER.lat],
        zoom: MAP_DEFAULT_ZOOM,
      });
    },
    focusMarker(marker) {
      if (!mapRef.current || !marker) return;
      mapRef.current.flyTo({
        center: [marker.lng, marker.lat],
        zoom: Math.max(mapRef.current.getZoom(), 14),
      });
    },
  }));

  useEffect(() => {
    if (!containerRef.current || !styleConfig.isValid || mapRef.current) return undefined;

    let cancelled = false;
    let localMap = null;
    let styleImageMissingHandler = null;

    (async () => {
      let maplibre = null;
      try {
        maplibre = await import("maplibre-gl");
      } catch (error) {
        if (!cancelled) {
          setRuntimeError(error?.message || "MapLibre failed to load.");
        }
        return;
      }
      if (cancelled) return;

      localMap = new maplibre.Map({
        container: containerRef.current,
        style: styleConfig.styleUrl,
        center: [MAP_DEFAULT_CENTER.lng, MAP_DEFAULT_CENTER.lat],
        zoom: MAP_DEFAULT_ZOOM,
      });
      mapRef.current = localMap;
      const transparentPixel = {
        width: 1,
        height: 1,
        data: new Uint8Array([0, 0, 0, 0]),
      };
      styleImageMissingHandler = (event) => {
        const missingId = typeof event?.id === "string" ? event.id : "";
        // Some remote styles request an invalid blank icon id (" ").
        // Register a transparent placeholder so rendering can proceed.
        if (!missingId || missingId.trim() !== "") return;
        if (localMap.hasImage(missingId)) return;
        try {
          localMap.addImage(missingId, transparentPixel);
        } catch (_error) {
          // Ignore duplicate/invalid image registration noise.
        }
      };
      localMap.on("styleimagemissing", styleImageMissingHandler);
      localMap.on("error", (event) => {
        if (cancelled) return;
        const message =
          event?.error?.message ||
          event?.error?.statusText ||
          "Map failed to load resources.";
        setRuntimeError(message);
      });

      localMap.on("load", () => {
        if (cancelled) return;

        if (!localMap.getSource("markers")) {
          localMap.addSource("markers", {
            type: "geojson",
            data: markersToGeoJson(markersRef.current),
          });
        }
        if (!localMap.getLayer("sos-points")) {
          localMap.addLayer({
            id: "sos-points",
            type: "circle",
            source: "markers",
            filter: ["==", ["get", "type"], "sos"],
            paint: {
              "circle-radius": 8,
              "circle-color": "#ef4444",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#fff",
            },
          });
        }
        if (!localMap.getLayer("incident-points")) {
          localMap.addLayer({
            id: "incident-points",
            type: "circle",
            source: "markers",
            filter: ["==", ["get", "type"], "incident"],
            paint: {
              "circle-radius": 7,
              "circle-color": "#f59e0b",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#fff",
            },
          });
        }
        markerSourceReadyRef.current = true;

        // Ensure first render in detail modals starts focused on selected SOS marker.
        const initialSelectedMarker = selectedMarkerRef.current;
        if (
          initialSelectedMarker &&
          Number.isFinite(initialSelectedMarker.lat) &&
          Number.isFinite(initialSelectedMarker.lng)
        ) {
          localMap.flyTo({
            center: [initialSelectedMarker.lng, initialSelectedMarker.lat],
            zoom: Math.max(localMap.getZoom(), 15),
          });
        }

        const handlePointClick = (event) => {
          const feature = event?.features?.[0];
          const markerId = feature?.properties?.id;
          if (markerId) onSelectMarker?.(markerId);
        };
        localMap.on("click", "sos-points", handlePointClick);
        localMap.on("click", "incident-points", handlePointClick);
        localMap.on("mouseenter", "sos-points", () => {
          localMap.getCanvas().style.cursor = "pointer";
        });
        localMap.on("mouseenter", "incident-points", () => {
          localMap.getCanvas().style.cursor = "pointer";
        });
        localMap.on("mouseleave", "sos-points", () => {
          localMap.getCanvas().style.cursor = "";
        });
        localMap.on("mouseleave", "incident-points", () => {
          localMap.getCanvas().style.cursor = "";
        });
      });

      localMap.on("moveend", () => {
        const center = localMap.getCenter();
        onCenterChanged?.({ lat: center.lat, lng: center.lng });
      });

    })();

    return () => {
      cancelled = true;
      markerSourceReadyRef.current = false;
      if (mapRef.current) {
        if (styleImageMissingHandler) {
          mapRef.current.off("styleimagemissing", styleImageMissingHandler);
        }
        mapRef.current.remove();
        mapRef.current = null;
      } else if (localMap) {
        if (styleImageMissingHandler) {
          localMap.off("styleimagemissing", styleImageMissingHandler);
        }
        localMap.remove();
      }
    };
  }, [onCenterChanged, onSelectMarker, styleConfig.isValid, styleConfig.styleUrl]);

  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return undefined;

    const resizeMap = () => mapRef.current?.resize();
    resizeMap();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        resizeMap();
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", resizeMap);
    return () => window.removeEventListener("resize", resizeMap);
  }, [heightClassName]);

  useEffect(() => {
    const source = mapRef.current?.getSource("markers");
    if (!source || !markerSourceReadyRef.current) return;
    source.setData(markersToGeoJson(markers));
  }, [markers]);

  useEffect(() => {
    if (!selectedMarker || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedMarker.lng, selectedMarker.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14),
    });
  }, [selectedMarker]);

  if (!styleConfig.isValid) {
    return (
      <div className={`flex ${heightClassName} items-center justify-center p-6 text-sm text-destructive`}>
        {styleConfig.error}
      </div>
    );
  }

  if (runtimeError) {
    return (
      <div className={`flex ${heightClassName} items-center justify-center p-6 text-sm text-destructive`}>
        {runtimeError}
      </div>
    );
  }

  return <div ref={containerRef} className={`${heightClassName} w-full`} />;
});

export default MapCanvas;
