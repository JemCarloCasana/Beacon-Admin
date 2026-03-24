import { useRef } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Navigation, Radio, RefreshCw } from "lucide-react";
import MapCanvas from "@/components/map/MapCanvas";
import { MAP_MARKER_TYPE_STYLES } from "@/lib/mapMarkerStyles";

export default function MapViewScreen({
  markers,
  selectedMarker,
  legendItems = [],
  filters,
  stats,
  isLoading,
  error,
  hasMapData,
  actions,
}) {
  const mapRef = useRef(null);

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={filters.showSos} onCheckedChange={actions.onToggleSos} />
                <span className="text-sm">SOS</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={filters.showIncidents} onCheckedChange={actions.onToggleIncidents} />
                <span className="text-sm">Incidents</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => mapRef.current?.centerDefault()}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Center
              </Button>
              <Button size="sm" variant="outline" onClick={actions.onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="flex min-h-[420px] flex-col lg:h-full lg:min-h-0">
            <CardContent className="min-h-0 flex-1 p-0">
              <MapCanvas
                ref={mapRef}
                markers={markers}
                selectedMarker={selectedMarker}
                onSelectMarker={actions.onSelectMarker}
                onCenterChanged={actions.onCenterChanged}
                heightClassName="h-full"
              />
            </CardContent>
          </Card>

          <div className="space-y-4 lg:overflow-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Live Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Badge variant="outline" className="mr-2">
                  <Radio className="mr-1 h-3 w-3 text-red-500" />
                  SOS {stats.sosCount}
                </Badge>
                <Badge variant="outline">
                  <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
                  Incidents {stats.incidentCount}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Status: {stats.isRefetching ? "Refreshing..." : stats.isLive ? "Live" : "Error"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Map Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {legendItems.length === 0 ? (
                  <p className="text-muted-foreground">No visible marker types.</p>
                ) : (
                  legendItems.map((item) => {
                    const markerStyle = MAP_MARKER_TYPE_STYLES[item.type];
                    if (!markerStyle) return null;

                    return (
                      <div key={item.type} className="flex items-center gap-3">
                        <span
                          data-testid={`map-legend-swatch-${item.type}`}
                          className="h-3 w-3 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: markerStyle.color }}
                          aria-hidden="true"
                        />
                        <span>{markerStyle.label}</span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Selected Marker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedMarker ? (
                  <p className="text-sm text-muted-foreground">Click a marker to view details.</p>
                ) : (
                  <>
                    <div>
                      <p className="font-medium">{selectedMarker.title}</p>
                      <p className="text-sm text-muted-foreground">{selectedMarker.subtitle}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Type: {selectedMarker.type.toUpperCase()}</p>
                      <p>Status: {selectedMarker.status || "-"}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mapRef.current?.focusMarker(selectedMarker)}
                      >
                        Focus
                      </Button>
                      <Button size="sm" variant="ghost" onClick={actions.onClearSelection}>
                        Clear
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {isLoading && (
          <Alert>
            <AlertDescription>Loading map data...</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error?.message || "Failed to load map data."}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && !hasMapData && (
          <Alert>
            <AlertDescription>No SOS or incident markers found for current filters.</AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
