import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useIncidents } from '@/hooks/useIncidents';
import { PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from '@/config/constants';
import { formatDistanceToNow } from 'date-fns';
import { Search, Filter, Plus, MapPin } from 'lucide-react';
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

export default function Incidents() {
    const { incidents, isLoading } = useIncidents();

    return (
        <DashboardLayout
            title="Incidents"
            subtitle="Manage and track all reported incidents"
        >
            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="flex flex-wrap items-center gap-4 py-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search incidents..." className="pl-9" />
                    </div>
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Incident
                    </Button>
                </CardContent>
            </Card>

            {/* Incidents Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Incident</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Reported</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incidents.map((incident) => (
                                <TableRow key={incident.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{incident.title}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {incident.description}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {CATEGORY_CONFIG[incident.category].label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(priorityStyles[incident.priority])}>
                                            {PRIORITY_CONFIG[incident.priority].label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(statusStyles[incident.status])}>
                                            {STATUS_CONFIG[incident.status].label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span className="max-w-[150px] truncate">
                                                {incident.location.address || 'Unknown'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
