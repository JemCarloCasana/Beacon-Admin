import { DashboardLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Layers, Radio, AlertTriangle, Navigation } from 'lucide-react';
import { useIncidents } from '@/hooks/useIncidents';
import { useSOS } from '@/hooks/useSOS';

export default function MapView() {
    const { incidents } = useIncidents();
    const { activeAlerts } = useSOS();

    return (
        <DashboardLayout
            title="Map View"
            subtitle="Geographic visualization with MapLibre"
        >
            {/* Map Controls */}
            <Card className="mb-4">
                <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Layers className="mr-2 h-4 w-4" />
                            Layers
                        </Button>
                        <Button variant="outline" size="sm">
                            <Navigation className="mr-2 h-4 w-4" />
                            Center
                        </Button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full bg-emergency" />
                            <span className="text-sm">SOS ({activeAlerts.length})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full bg-warning" />
                            <span className="text-sm">Incidents ({incidents.length})</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card className="flex-1">
                <CardContent className="flex h-[600px] items-center justify-center p-0">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <MapIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">MapLibre Integration</h3>
                        <p className="mb-4 max-w-md text-muted-foreground">
                            Real-time map visualization will display here. Requires MapLibre GL JS
                            integration with OpenStreetMap or custom tiles.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Badge variant="outline">
                                <Radio className="mr-1 h-3 w-3" />
                                {activeAlerts.length} Active SOS
                            </Badge>
                            <Badge variant="outline">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                {incidents.filter(i => i.status !== 'closed').length} Open Incidents
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
