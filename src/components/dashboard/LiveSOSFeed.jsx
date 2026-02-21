import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Phone, User, CheckCircle, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusStyles = {
    active: 'bg-emergency text-emergency-foreground pulse-emergency',
    acknowledged: 'bg-warning text-warning-foreground',
    responding: 'bg-info text-info-foreground',
    resolved: 'bg-success text-success-foreground',
};

export function LiveSOSFeed({ alerts, onAcknowledge, onViewDetails }) {
    const activeAlerts = alerts.filter((a) => a.status === 'active');
    const otherAlerts = alerts.filter((a) => a.status !== 'active');

    return (
        <Card className="border-emergency/20">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-emergency" />
                    <CardTitle>Live SOS Feed</CardTitle>
                    {activeAlerts.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                            {activeAlerts.length} Active
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success status-dot-active" />
                    <span className="text-xs text-muted-foreground">Connected</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <div className="space-y-2 p-4 pt-0">
                        {/* Active alerts first */}
                        {activeAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={cn(
                                    'rounded-lg border-2 border-emergency/50 bg-emergency/5 p-4',
                                    'animate-pulse'
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge className={statusStyles.active}>SOS ACTIVE</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{alert.userName}</span>
                                    </div>
                                    {alert.userPhone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{alert.userPhone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{alert.location.address || 'Fetching location...'}</span>
                                    </div>
                                    {alert.message && (
                                        <p className="mt-2 rounded bg-background/50 p-2 text-sm italic">
                                            "{alert.message}"
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => onAcknowledge?.(alert.id)}
                                    >
                                        <CheckCircle className="mr-1 h-4 w-4" />
                                        Acknowledge
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onViewDetails?.(alert.id)}
                                    >
                                        Details
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Other alerts */}
                        {otherAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                                onClick={() => onViewDetails?.(alert.id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn('text-xs', statusStyles[alert.status])}>
                                            {alert.status.toUpperCase()}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span>{alert.userName}</span>
                                    <span className="text-muted-foreground">•</span>
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate text-muted-foreground">
                                        {alert.location.address}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {alerts.length === 0 && (
                            <div className="py-8 text-center text-muted-foreground">
                                <Radio className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                <p>No active SOS alerts</p>
                                <p className="text-sm">Monitoring for emergencies...</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
