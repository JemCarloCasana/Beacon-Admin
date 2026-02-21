import { DashboardLayout } from '@/components/layout';
import { LiveSOSFeed } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSOS } from '@/hooks/useSOS';
import { Radio, Wifi, WifiOff } from 'lucide-react';

export default function LiveSOS() {
    const { sosAlerts, activeAlerts, acknowledgedAlerts, isConnected, acknowledgeAlert, resolveAlert } = useSOS();

    return (
        <DashboardLayout
            title="Live SOS"
            subtitle="Real-time emergency monitoring from Firebase"
        >
            {/* Connection Status */}
            <Card className="mb-6">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Firebase Realtime Connection</p>
                            <p className="text-sm text-muted-foreground">
                                Receiving live SOS streams from mobile devices
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
                        <div className="text-3xl font-bold">{sosAlerts.length}</div>
                        <p className="text-sm text-muted-foreground">SOS alerts received</p>
                    </CardContent>
                </Card>
            </div>

            {/* Live Feed */}
            <LiveSOSFeed
                alerts={sosAlerts}
                onAcknowledge={(id) => acknowledgeAlert(id, 'admin-1')}
                onViewDetails={(id) => console.log('View SOS:', id)}
            />
        </DashboardLayout>
    );
}
