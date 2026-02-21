import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { PRIORITY_CONFIG, CATEGORY_CONFIG, STATUS_CONFIG } from '@/config/constants';
import { cn } from '@/lib/utils';

const priorityStyles = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-warning text-warning-foreground',
    medium: 'bg-caution text-caution-foreground',
    low: 'bg-muted text-muted-foreground',
};

const statusStyles = {
    pending: 'bg-muted text-muted-foreground',
    dispatched: 'bg-info text-info-foreground',
    in_progress: 'bg-warning text-warning-foreground',
    resolved: 'bg-success text-success-foreground',
    closed: 'bg-muted text-muted-foreground',
};

export function RecentIncidents({ incidents, onViewAll, onViewIncident }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Incidents</CardTitle>
                <Button variant="ghost" size="sm" onClick={onViewAll}>
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <div className="space-y-1 p-4 pt-0">
                        {incidents.map((incident) => (
                            <div
                                key={incident.id}
                                className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                                onClick={() => onViewIncident?.(incident.id)}
                            >
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-medium leading-tight">{incident.title}</h4>
                                        <div className="flex gap-1.5">
                                            <Badge className={cn('text-xs', priorityStyles[incident.priority])}>
                                                {PRIORITY_CONFIG[incident.priority].label}
                                            </Badge>
                                            <Badge className={cn('text-xs', statusStyles[incident.status])}>
                                                {STATUS_CONFIG[incident.status].label}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {incident.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {incident.location.address || 'Location unavailable'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
