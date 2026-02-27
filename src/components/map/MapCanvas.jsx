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

function routeToGeoJson(routePreview) {
  if (!routePreview?.line?.length) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routePreview.line,
        },
      },
    ],
  };
}

export const MapCanvas = forwardRef(function MapCanvas(
  { markers, selectedMarker, routePreview, onSelectMarker, onCenterChanged },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerSourceReadyRef = useRef(false);
  const routeSourceReadyRef = useRef(false);
  const styleConfig = useMemo(() => getMapStyleConfig(), []);
  const [runtimeError, setRuntimeError] = useState(null);

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
          localMap.addSource("markers", { type: "geojson", data: markersToGeoJson([]) });
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
        if (!localMap.getSource("route")) {
          localMap.addSource("route", { type: "geojson", data: routeToGeoJson(null) });
        }
        if (!localMap.getLayer("route-line")) {
          localMap.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: {
              "line-color": "#2563eb",
              "line-width": 4,
              "line-opacity": 0.8,
            },
          });
        }

        markerSourceReadyRef.current = true;
        routeSourceReadyRef.current = true;

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
      routeSourceReadyRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      } else if (localMap) {
        localMap.remove();
      }
    };
  }, [onCenterChanged, onSelectMarker, styleConfig.isValid, styleConfig.styleUrl]);

  useEffect(() => {
    const source = mapRef.current?.getSource("markers");
    if (!source || !markerSourceReadyRef.current) return;
    source.setData(markersToGeoJson(markers));
  }, [markers]);

  useEffect(() => {
    const source = mapRef.current?.getSource("route");
    if (!source || !routeSourceReadyRef.current) return;
    source.setData(routeToGeoJson(routePreview));
  }, [routePreview]);

  useEffect(() => {
    if (!selectedMarker || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedMarker.lng, selectedMarker.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14),
    });
  }, [selectedMarker]);

  if (!styleConfig.isValid) {
    return (
      <div className="flex h-[560px] items-center justify-center p-6 text-sm text-destructive">
        {styleConfig.error}
      </div>
    );
  }

  if (runtimeError) {
    return (
      <div className="flex h-[560px] items-center justify-center p-6 text-sm text-destructive">
        {runtimeError}
      </div>
    );
  }

  return <div ref={containerRef} className="h-[560px] w-full" />;
});

export default MapCanvas;
