import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useAdminAuth } from '@/auth/AdminAuthProvider';
import { useIncidentsAPI } from '@/api/useIncidentsAPI';
import { IncidentDetailsDialog } from '@/components/incidents';
import { PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from '@/config/constants';
import { formatDistanceToNow } from 'date-fns';
import { Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toIncidentListViewModel } from '@/models/incident.model';
import { ProtectedIncidentImage } from '@/components/ProtectedIncidentImage';

const priorityStyles = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-warning text-warning-foreground',
    medium: 'bg-caution text-caution-foreground',
    low: 'bg-muted text-muted-foreground',
    unknown: 'bg-muted text-muted-foreground',
};

const statusStyles = {
    pending: 'bg-muted text-muted-foreground',
    dispatched: 'bg-info text-info-foreground',
    in_progress: 'bg-warning text-warning-foreground',
    resolved: 'bg-success text-success-foreground',
    unknown: 'bg-muted text-muted-foreground',
};

export default function Incidents() {
    const { me, loading: authLoading, hasPermission } = useAdminAuth();
    const canManageIncidents = hasPermission('manage_incidents');
    const canViewIncidents = hasPermission('view_incidents') || canManageIncidents;
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);
    const [selectedIncidentPreview, setSelectedIncidentPreview] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const incidentsQuery = useIncidentsAPI(
        {
            page,
            limit: pageSize,
            status: statusFilter === 'all' ? '' : statusFilter,
        },
        {
            enabled: !authLoading && !!me && canViewIncidents,
        }
    );
    const incidents = useMemo(
        () => toIncidentListViewModel(incidentsQuery.data),
        [incidentsQuery.data]
    );
    const filteredIncidents = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return incidents.filter((incident) => {
            if (priorityFilter !== 'all' && incident.priority !== priorityFilter) return false;
            if (!term) return true;

            const haystack = [
                incident.title,
                incident.description,
                incident.category,
                incident.location?.address,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(term);
        });
    }, [incidents, priorityFilter, searchTerm]);
    const canGoPreviousPage = page > 1;
    const canGoNextPage = incidents.length === pageSize;

    const openDetails = (incident) => {
        if (!incident?.id) return;
        setSelectedIncidentId(incident.id);
        setSelectedIncidentPreview(incident);
        setIsDetailOpen(true);
    };

    const handleDetailOpenChange = (open) => {
        setIsDetailOpen(open);
        if (!open) {
            setSelectedIncidentId(null);
            setSelectedIncidentPreview(null);
        }
    };

    const getPriorityKey = (value) => (PRIORITY_CONFIG[value] ? value : 'unknown');
    const getStatusKey = (value) => (STATUS_CONFIG[value] ? value : 'unknown');
    const getPriorityLabel = (value) => PRIORITY_CONFIG[value]?.label || 'Unknown';
    const getStatusLabel = (value) => STATUS_CONFIG[value]?.label || 'Unknown';
    const getCategoryLabel = (value) => CATEGORY_CONFIG[value]?.label || value || 'Other';
    const getReportedLabel = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return formatDistanceToNow(date, { addSuffix: true });
    };

    return (
        <DashboardLayout
            title="Incidents"
            subtitle="Manage and track all reported incidents"
        >
            {!authLoading && !canViewIncidents && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                        403 Forbidden: You do not have permission to view incidents.
                    </AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="flex flex-wrap items-center gap-4 py-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search incidents..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            disabled={!canViewIncidents}
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                            setStatusFilter(value);
                            setPage(1);
                        }}
                        disabled={!canViewIncidents}
                    >
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
                    <Select
                        value={priorityFilter}
                        onValueChange={setPriorityFilter}
                        disabled={!canViewIncidents}
                    >
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
                                <TableHead>Image</TableHead>
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
                            {(authLoading || incidentsQuery.isLoading) && canViewIncidents && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                                        Loading incidents...
                                    </TableCell>
                                </TableRow>
                            )}

                            {!authLoading && canViewIncidents && incidentsQuery.isError && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-destructive">
                                        {incidentsQuery.error?.status === 403
                                            ? '403 Forbidden: You do not have permission to view incidents.'
                                            : incidentsQuery.error?.message || 'Failed to load incidents.'}
                                    </TableCell>
                                </TableRow>
                            )}

                            {!authLoading && canViewIncidents && !incidentsQuery.isLoading && !incidentsQuery.isError && filteredIncidents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                                        No incidents found.
                                    </TableCell>
                                </TableRow>
                            )}

                            {!authLoading && canViewIncidents && !incidentsQuery.isLoading && !incidentsQuery.isError && filteredIncidents.map((incident) => (
                                <TableRow key={incident.id}>
                                    <TableCell>
                                        {incident.imageUrl ? (
                                            <ProtectedIncidentImage
                                                imageUrl={incident.imageUrl}
                                                alt={`Incident ${incident.id || ''} thumbnail`.trim()}
                                                className="h-12 w-12 rounded-md border object-cover"
                                                loadingClassName="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/20 text-[10px] text-muted-foreground"
                                                fallbackClassName="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/30 text-[10px] text-muted-foreground"
                                                fallbackText="No image"
                                                loadingText="..."
                                            />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{incident.title}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {incident.description || 'No description provided.'}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {getCategoryLabel(incident.category)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(priorityStyles[getPriorityKey(incident.priority)])}>
                                            {getPriorityLabel(incident.priority)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(statusStyles[getStatusKey(incident.status)])}>
                                            {getStatusLabel(incident.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span className="max-w-[150px] truncate">
                                                {incident.location?.address || 'Unknown'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {getReportedLabel(incident.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openDetails(incident)}>
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {canViewIncidents && (
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={!canGoPreviousPage || incidentsQuery.isFetching}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">Page {page}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((prev) => prev + 1)}
                                disabled={!canGoNextPage || incidentsQuery.isFetching}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <IncidentDetailsDialog
                open={isDetailOpen}
                onOpenChange={handleDetailOpenChange}
                incidentId={selectedIncidentId}
                incidentPreview={selectedIncidentPreview}
                canManageIncidents={canManageIncidents}
            />
        </DashboardLayout>
    );
}
