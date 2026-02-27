import { DashboardLayout } from '@/components/layout';
import { LiveSOSFeed } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAcknowledgeSOS, useSOSLiveQueue } from '@/api/useSosAPI';
import { toSosFeedAlert } from '@/models/sos-live.model';
import { Radio, Wifi, WifiOff } from 'lucide-react';

export default function LiveSOS() {
    const queueQuery = useSOSLiveQueue({ status: 'open', limit: 100 });
    const acknowledgeMutation = useAcknowledgeSOS();
    const feedAlerts = Array.isArray(queueQuery.data) ? queueQuery.data.map(toSosFeedAlert) : [];
    const activeAlerts = feedAlerts.filter((a) => a.status === 'active');
    const acknowledgedAlerts = feedAlerts.filter((a) => a.status === 'acknowledged');
    const isConnected = !queueQuery.isError;

    return (
        <DashboardLayout
            title="Live SOS"
            subtitle="Real-time emergency monitoring from backend live queue"
        >
            {/* Connection Status */}
            <Card className="mb-6">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Backend Live Queue Connection</p>
                            <p className="text-sm text-muted-foreground">
                                Polling SOS live queue every 5 seconds
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <Wifi className="h-4 w-4 text-success" />
                                <Badge variant="outline" className="border-success text-success">
                                    Connected
                                </Badge>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-4 w-4 text-destructive" />
                                <Badge variant="outline" className="border-destructive text-destructive">
                                    Disconnected
                                </Badge>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <Card className="border-emergency/20 bg-emergency/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emergency">
                            {activeAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Requiring immediate response</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Acknowledged
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-warning">
                            {acknowledgedAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Being processed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{feedAlerts.length}</div>
                        <p className="text-sm text-muted-foreground">SOS alerts received</p>
                    </CardContent>
                </Card>
            </div>

            {queueQuery.isLoading && (
                <Alert className="mb-6">
                    <AlertDescription>Loading live SOS queue...</AlertDescription>
                </Alert>
            )}

            {queueQuery.isError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                        {queueQuery.error?.message || 'Failed to load live SOS queue.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Live Feed */}
            <LiveSOSFeed
                alerts={feedAlerts}
                onAcknowledge={(id) =>
                    acknowledgeMutation.mutate({ sosId: Number(id), note: 'Acknowledged from live feed' })
                }
                onViewDetails={(id) => console.log('View SOS:', id)}
            />
        </DashboardLayout>
    );
}
