import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Bell, Plus, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data
const mockAlerts = [
    {
        id: '1',
        title: 'Typhoon Warning - Signal #2',
        message: 'Tropical storm approaching Metro Manila. Expect heavy rainfall and strong winds.',
        type: 'warning',
        scope: 'regional',
        affectedAreas: ['Metro Manila', 'Cavite', 'Laguna'],
        isActive: true,
        createdBy: 'admin-1',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
    {
        id: '2',
        title: 'Road Closure - EDSA Northbound',
        message: 'Construction work in progress. Expect heavy traffic.',
        type: 'info',
        scope: 'local',
        affectedAreas: ['Quezon City'],
        isActive: true,
        createdBy: 'admin-2',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
        id: '3',
        title: 'Fire Incident Resolved - Tondo',
        message: 'Fire has been extinguished. Residents may return.',
        type: 'all_clear',
        scope: 'local',
        affectedAreas: ['Tondo, Manila'],
        isActive: false,
        createdBy: 'admin-1',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
];

const typeConfig = {
    warning: { icon: AlertTriangle, color: 'bg-warning text-warning-foreground' },
    danger: { icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
    info: { icon: Info, color: 'bg-info text-info-foreground' },
    all_clear: { icon: CheckCircle, color: 'bg-success text-success-foreground' },
};

export default function SafetyAlerts() {
    return (
        <DashboardLayout
            title="Safety Alerts"
            subtitle="Broadcast and manage public safety notifications"
        >
            {/* Actions */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-success text-success">
                        {mockAlerts.filter((a) => a.isActive).length} Active
                    </Badge>
                    <Badge variant="outline">
                        {mockAlerts.length} Total
                    </Badge>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Alert
                </Button>
            </div>

            {/* Alerts Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        All Safety Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Scope</TableHead>
                                <TableHead>Affected Areas</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockAlerts.map((alert) => {
                                const TypeIcon = typeConfig[alert.type].icon;
                                return (
                                    <TableRow key={alert.id}>
                                        <TableCell>
                                            <Badge className={cn(typeConfig[alert.type].color)}>
                                                <TypeIcon className="mr-1 h-3 w-3" />
                                                {alert.type.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{alert.title}</p>
                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                    {alert.message}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {alert.scope}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {alert.affectedAreas.slice(0, 2).map((area) => (
                                                    <Badge key={area} variant="secondary" className="text-xs">
                                                        {area}
                                                    </Badge>
                                                ))}
                                                {alert.affectedAreas.length > 2 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{alert.affectedAreas.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {alert.isActive ? (
                                                <Badge className="bg-success text-success-foreground">Active</Badge>
                                            ) : (
                                                <Badge variant="outline">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
