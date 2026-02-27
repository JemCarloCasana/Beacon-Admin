import { useCallback, useMemo, useState } from "react";
import { useSOSLiveQueue } from "@/api/useSosAPI";
import { useMapIncidents } from "@/api/useIncidentsAPI";
import {
  toIncidentMarker,
  toRoutePreview,
  toSosMarker,
} from "@/models/map.model";
import { MAP_DEFAULT_CENTER } from "@/lib/mapStyle";

function byLatest(a, b) {
  const aTime = new Date(a?.updatedAt || 0).getTime();
  const bTime = new Date(b?.updatedAt || 0).getTime();
  return bTime - aTime;
}

export function useMapController() {
  const [showSos, setShowSos] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [mapCenter, setMapCenter] = useState(MAP_DEFAULT_CENTER);
  const [routePreview, setRoutePreview] = useState(null);

  const sosQuery = useSOSLiveQueue({ status: "open", limit: 500 });
  const incidentsQuery = useMapIncidents();

  const sosMarkers = useMemo(() => {
    const list = Array.isArray(sosQuery.data) ? sosQuery.data : [];
    return list.map(toSosMarker).filter(Boolean);
  }, [sosQuery.data]);

  const incidentMarkers = useMemo(() => {
    const raw = Array.isArray(incidentsQuery.data) ? incidentsQuery.data : [];
    return raw.map(toIncidentMarker).filter(Boolean);
  }, [incidentsQuery.data]);

  const visibleMarkers = useMemo(() => {
    const list = [];
    if (showSos) list.push(...sosMarkers);
    if (showIncidents) list.push(...incidentMarkers);
    return list.sort(byLatest);
  }, [showSos, showIncidents, sosMarkers, incidentMarkers]);

  const selectedMarker = useMemo(
    () => visibleMarkers.find((item) => item.id === selectedMarkerId) || null,
    [visibleMarkers, selectedMarkerId]
  );

  const isLoading = sosQuery.isLoading || incidentsQuery.isLoading;
  const isRefetching = sosQuery.isRefetching || incidentsQuery.isRefetching;
  const error = sosQuery.error || incidentsQuery.error || null;
  const hasMapData = visibleMarkers.length > 0;

  const onSelectMarker = useCallback((markerId) => {
    setSelectedMarkerId(markerId);
  }, []);

  const onClearSelection = useCallback(() => {
    setSelectedMarkerId(null);
    setRoutePreview(null);
  }, []);

  const onPreviewRoute = useCallback(() => {
    if (!selectedMarker) return;
    setRoutePreview(toRoutePreview(mapCenter, selectedMarker));
  }, [mapCenter, selectedMarker]);

  const onClearRoute = useCallback(() => {
    setRoutePreview(null);
  }, []);

  const onCenterChanged = useCallback((center) => {
    if (!center) return;
    setMapCenter(center);
  }, []);

  const onRefresh = useCallback(() => {
    sosQuery.refetch();
    incidentsQuery.refetch();
  }, [incidentsQuery, sosQuery]);

  return {
    markers: visibleMarkers,
    selectedMarker,
    routePreview,
    filters: {
      showSos,
      showIncidents,
    },
    stats: {
      sosCount: sosMarkers.length,
      incidentCount: incidentMarkers.length,
      isRefetching,
      isLive: !error,
    },
    isLoading,
    error,
    hasMapData,
    actions: {
      onToggleSos: () => setShowSos((prev) => !prev),
      onToggleIncidents: () => setShowIncidents((prev) => !prev),
      onSelectMarker,
      onClearSelection,
      onPreviewRoute,
      onClearRoute,
      onCenterChanged,
      onRefresh,
    },
  };
}

export default useMapController;
