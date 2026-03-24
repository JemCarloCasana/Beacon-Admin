import { useCallback, useMemo, useState } from "react";
import { useSOSLiveQueue } from "@/api/useSosAPI";
import { useMapIncidents } from "@/api/useIncidentsAPI";
import {
  toIncidentMarker,
  toSosMarker,
} from "@/models/map.model";

const ACTIVE_INCIDENT_STATUSES = new Set(["pending", "dispatched", "in_progress"]);

function byLatest(a, b) {
  const aTime = new Date(a?.updatedAt || 0).getTime();
  const bTime = new Date(b?.updatedAt || 0).getTime();
  return bTime - aTime;
}

export function useMapController() {
  const [showSos, setShowSos] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);

  const sosQuery = useSOSLiveQueue({ status: "open", limit: 500 });
  const incidentsQuery = useMapIncidents();

  const sosMarkers = useMemo(() => {
    const list = Array.isArray(sosQuery.data) ? sosQuery.data : [];
    return list.map(toSosMarker).filter(Boolean);
  }, [sosQuery.data]);

  const incidentMarkers = useMemo(() => {
    const raw = Array.isArray(incidentsQuery.data) ? incidentsQuery.data : [];
    return raw
      .filter((item) => ACTIVE_INCIDENT_STATUSES.has(String(item?.status || "").toLowerCase()))
      .map(toIncidentMarker)
      .filter(Boolean);
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
  const legendItems = useMemo(() => {
    const markerTypes = new Set(visibleMarkers.map((item) => item.type));
    const items = [];

    if (showSos && markerTypes.has("sos")) {
      items.push({ type: "sos" });
    }

    if (showIncidents && markerTypes.has("incident")) {
      items.push({ type: "incident" });
    }

    return items;
  }, [showIncidents, showSos, visibleMarkers]);

  const isLoading = sosQuery.isLoading || incidentsQuery.isLoading;
  const isRefetching = sosQuery.isRefetching || incidentsQuery.isRefetching;
  const error = sosQuery.error || incidentsQuery.error || null;
  const hasMapData = visibleMarkers.length > 0;

  const onSelectMarker = useCallback((markerId) => {
    setSelectedMarkerId(markerId);
  }, []);

  const onClearSelection = useCallback(() => {
    setSelectedMarkerId(null);
  }, []);

  const onCenterChanged = useCallback(() => {
    // Reserved for future map interactions.
  }, []);

  const onRefresh = useCallback(() => {
    sosQuery.refetch();
    incidentsQuery.refetch();
  }, [incidentsQuery, sosQuery]);

  return {
    markers: visibleMarkers,
    selectedMarker,
    legendItems,
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
      onCenterChanged,
      onRefresh,
    },
  };
}

export default useMapController;
