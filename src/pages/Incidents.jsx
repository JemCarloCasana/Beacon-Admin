import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
    TableCaption,
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
    const navigate = useNavigate();
    const { incidentId: routeIncidentId } = useParams();
    const { me, hasPermission, loading: authLoading } = useAdminAuth();
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
    const [priorityFilter, setPriorityFilter] = useState(() => searchParams.get('priority') || 'all');
    const appliedParamsRef = useRef(searchParams.toString());
    const [page, setPage] = useState(1);
    const pageSize = 20;
    // The backend caps a page at 100 and returns no total, so the widest
    // honest result set we can show is the 100 most recent matching rows.
    const maxLoaded = 100;
    const incidentsQuery = useIncidentsAPI(
        {
            page: 1,
            limit: maxLoaded,
            status: statusFilter === 'all' ? '' : statusFilter,
        },
        {
            enabled: !authLoading && !!me,
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
    const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visibleIncidents = filteredIncidents.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );
    const canGoPreviousPage = currentPage > 1;
    const canGoNextPage = currentPage < totalPages;
    const isFiltered = searchTerm.trim() !== '' || priorityFilter !== 'all' || statusFilter !== 'all';

    // The filters live in the URL, so a filtered view can be shared, and it
    // survives a refresh.
    useEffect(() => {
        const next = new URLSearchParams();
        if (searchTerm.trim()) next.set('q', searchTerm);
        if (statusFilter !== 'all') next.set('status', statusFilter);
        if (priorityFilter !== 'all') next.set('priority', priorityFilter);
        const serialized = next.toString();
        if (serialized === appliedParamsRef.current) return;
        appliedParamsRef.current = serialized;
        setSearchParams(next, { replace: true });
    }, [searchTerm, statusFilter, priorityFilter, setSearchParams]);

    useEffect(() => {
        if (!routeIncidentId) return;
        setSelectedIncidentId(routeIncidentId);
        setIsDetailOpen(true);
    }, [routeIncidentId]);

    const openDetails = (incident) => {
        if (!incident?.id) return;
        navigate(`/incidents/${incident.id}`);
    };

    const handleDetailOpenChange = (open) => {
        setIsDetailOpen(open);
        if (!open) {
            setSelectedIncidentId(null);
            if (routeIncidentId) {
                navigate('/incidents', { replace: true });
            }
        }
    };

    const getPriorityKey = (value) => (PRIORITY_CONFIG[value] ? value : 'unknown');
    const getStatusKey = (value) => (STATUS_CONFIG[value] ? value : 'unknown');
    const getPriorityLabel = (value) => PRIORITY_CONFIG[value]?.label || 'Unknown';
    const getStatusLabel = (value) => STATUS_CONFIG[value]?.label || 'Unknown';
    const getCategoryLabel = (value) => CATEGORY_CONFIG[value]?.label || value || 'Other';
    const getReportedLabel = (value) => {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return formatDistanceToNow(date, { addSuffix: true });
    };

    return (
        <DashboardLayout
            title="Incidents"
            subtitle="Manage and track all reported incidents"
        >
            <div className="space-y-6 p-4 md:p-6">
            {/* Filters */}
            <Card>
                <CardContent className="flex flex-wrap items-center gap-4 py-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="incident-search"
                            aria-label="Search incidents"
                            placeholder="Search incidents..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                            setStatusFilter(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger id="incident-status-filter" aria-label="Filter by status" className="w-[150px]">
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
                    >
                        <SelectTrigger id="incident-priority-filter" aria-label="Filter by priority" className="w-[150px]">
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
                <p className="px-4 pb-3 text-xs text-muted-foreground">
                    Searching the {maxLoaded} most recent incidents. The server returns no
                    total, so anything older is not reachable from here.
                </p>
            </Card>

            {/* Incidents Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Incidents
                        {isFiltered ? (
                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                                Showing {filteredIncidents.length} of {incidents.length} loaded
                            </span>
                        ) : null}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption className="sr-only">
                            Reported incidents, newest first, from the most recent {maxLoaded} loaded.
                        </TableCaption>
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
                            {(authLoading || incidentsQuery.isLoading) && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                                        Loading incidents...
                                    </TableCell>
                                </TableRow>
                            )}

                            {!authLoading && incidentsQuery.isError && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-destructive">
                                        {incidentsQuery.error?.message || 'Failed to load incidents.'}
                                    </TableCell>
                                </TableRow>
                            )}

                            {!authLoading && !incidentsQuery.isLoading && !incidentsQuery.isError && filteredIncidents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                                        No incidents match these filters.
                                    </TableCell>
                                </TableRow>
                            )}

                            {!authLoading && !incidentsQuery.isLoading && !incidentsQuery.isError && visibleIncidents.map((incident) => (
                                <TableRow key={incident.id}>
                                    <TableCell>
                                        {incident.imageUrl ? (
                                            <ProtectedIncidentImage
                                                imageUrl={incident.imageUrl}
                                                alt={incident.id ? `Incident ${incident.id} thumbnail` : "Incident thumbnail"}
                                                className="h-12 w-12 rounded-md border object-cover"
                                                loadingClassName="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground"
                                                fallbackClassName="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/30 text-xs text-muted-foreground"
                                                fallbackText="No image"
                                                loadingText="..."
                                            />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
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
                                                {incident.location?.address || 'Location unavailable'}
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
                    <div className="mt-4 flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={!canGoPreviousPage || incidentsQuery.isFetching}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => prev + 1)}
                            disabled={!canGoNextPage || incidentsQuery.isFetching}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <IncidentDetailsDialog
                open={isDetailOpen}
                onOpenChange={handleDetailOpenChange}
                incidentId={selectedIncidentId}
                incidentPreview={null}
                canManage={hasPermission?.("manage_incidents") === true}
            />
            </div>
        </DashboardLayout>
    );
}
