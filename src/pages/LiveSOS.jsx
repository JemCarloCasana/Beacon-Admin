import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout';
import { LiveSOSDetailsDialog, LiveSOSFeed } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAcknowledgeSOS, useResolveSOS, SOS_ASSIGNED_UNITS, useSOSDetail, useSOSLiveQueue } from '@/api/useSosAPI';
import { toSosFeedAlert } from '@/models/sos-live.model';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const ASSIGNED_UNIT_BY_EMERGENCY_TYPE = {
    medical: "Emergency Medical Unit",
    fire: "Fire Station Unit",
    violence: "Police Personnel",
};

const SOS_TAB_KEYS = new Set(['live', 'dispatched', 'cancelled', 'resolved']);

function getValidTab(value) {
    return SOS_TAB_KEYS.has(value) ? value : 'live';
}

function toSosId(thread) {
    if (!thread) return '';
    return String(thread?.sos_id ?? thread?.id ?? '');
}

function applySnapshot(_previous, snapshotThreads) {
    const map = new Map();
    for (const thread of Array.isArray(snapshotThreads) ? snapshotThreads : []) {
        const id = toSosId(thread);
        if (!id) continue;
        map.set(id, thread);
    }
    return Array.from(map.values());
}

function isCancelledAlert(alert) {
    const status = String(alert?.status || '').trim().toLowerCase();
    const terminalStatus = String(alert?.raw?.terminal_status || alert?.terminal_status || '').trim().toLowerCase();
    const label = String(alert?.terminal_label || alert?.terminalLabel || '').trim().toLowerCase();
    const message = String(alert?.message || alert?.raw?.latest_message || '').trim().toLowerCase();
    return (
        status === 'cancelled'
        || terminalStatus === 'cancelled'
        || label === 'cancelled sos'
        || /^cancelled\s*:/.test(message)
    );
}

function dedupeAlertsById(alerts) {
    const map = new Map();
    for (const alert of alerts) {
        const id = String(alert?.id || '');
        if (!id) continue;
        map.set(id, alert);
    }
    return Array.from(map.values());
}

export default function LiveSOS() {
    const navigate = useNavigate();
    const location = useLocation();
    const { sosId: routeSosId } = useParams();
    const [searchParams] = useSearchParams();
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedSosId, setSelectedSosId] = useState(null);
    const [streamThreads, setStreamThreads] = useState([]);
    const [optimisticById, setOptimisticById] = useState({});
    const [ackTargetId, setAckTargetId] = useState(null);
    const [ackAssignedUnit, setAckAssignedUnit] = useState("");
    const [resolveTarget, setResolveTarget] = useState(null);
    const [resolveNote, setResolveNote] = useState("");
    const [activeTab, setActiveTab] = useState(() => getValidTab(searchParams.get('tab')));

    const liveQueueQuery = useSOSLiveQueue({ status: 'open', limit: 100 });
    const cancelledQueueQuery = useSOSLiveQueue({ status: 'cancelled', limit: 100 });
    const resolvedQueueQuery = useSOSLiveQueue({ status: 'resolved', limit: 100 });
    const acknowledgeMutation = useAcknowledgeSOS();
    const resolveMutation = useResolveSOS();
    const detailQuery = useSOSDetail(selectedSosId, {
        enabled: isDetailOpen && Number.isFinite(selectedSosId),
    });

    useEffect(() => {
        const queryTab = getValidTab(searchParams.get('tab'));
        setActiveTab((previous) => previous === queryTab ? previous : queryTab);
    }, [searchParams]);

    useEffect(() => {
        const parsedId = Number(routeSosId);
        if (!Number.isFinite(parsedId)) return;
        setSelectedSosId(parsedId);
        setIsDetailOpen(true);
    }, [routeSosId]);

    useEffect(() => {
        if (!Array.isArray(liveQueueQuery.data)) return;
        setStreamThreads((previous) => {
            const next = applySnapshot(previous, liveQueueQuery.data);
            return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
        });
        setOptimisticById((previous) => {
            const next = { ...previous };
            for (const thread of liveQueueQuery.data) {
                const status = String(thread?.latest_status || thread?.status || '').toLowerCase();
                const hasServerAttentionFlag = Object.prototype.hasOwnProperty.call(thread || {}, 'requires_attention');
                const hasAcknowledgedAt = Boolean(thread?.acknowledged_at || thread?.acknowledgedAt);
                if (!hasServerAttentionFlag && !hasAcknowledgedAt && status === 'active') continue;
                delete next[toSosId(thread)];
            }
            return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
        });
    }, [liveQueueQuery.data]);

    const openAlerts = useMemo(() => {
        return streamThreads.map((thread) => {
            const normalized = toSosFeedAlert(thread);
            const optimistic = optimisticById[normalized.id];
            return optimistic ? { ...normalized, ...optimistic } : normalized;
        });
    }, [streamThreads, optimisticById]);

    const liveAlerts = useMemo(
        () => openAlerts.filter((alert) => !alert?.assigned_unit && !alert?.assignedUnit),
        [openAlerts]
    );

    const dispatchedAlerts = useMemo(
        () => openAlerts.filter((alert) => Boolean(alert?.assigned_unit || alert?.assignedUnit)),
        [openAlerts]
    );

    const cancelledPoolAlerts = useMemo(() => {
        const rows = Array.isArray(cancelledQueueQuery.data) ? cancelledQueueQuery.data : [];
        return rows.map((thread) => toSosFeedAlert(thread));
    }, [cancelledQueueQuery.data]);

    const resolvedPoolAlerts = useMemo(() => {
        const rows = Array.isArray(resolvedQueueQuery.data) ? resolvedQueueQuery.data : [];
        return rows.map((thread) => toSosFeedAlert(thread));
    }, [resolvedQueueQuery.data]);

    const cancelledAlerts = useMemo(
        () => dedupeAlertsById([
            ...cancelledPoolAlerts.filter((alert) => isCancelledAlert(alert)),
            ...resolvedPoolAlerts.filter((alert) => isCancelledAlert(alert)),
        ]),
        [cancelledPoolAlerts, resolvedPoolAlerts]
    );
    const resolvedAlerts = useMemo(
        () => resolvedPoolAlerts.filter((alert) => !isCancelledAlert(alert)),
        [resolvedPoolAlerts]
    );

    const attentionAlerts = liveAlerts.filter((a) => a.requires_attention === true);
    const isConnected = !liveQueueQuery.isError && !cancelledQueueQuery.isError && !resolvedQueueQuery.isError;

    const alertById = useMemo(() => {
        const map = new Map();
        for (const alert of [...liveAlerts, ...dispatchedAlerts, ...cancelledAlerts, ...resolvedAlerts]) {
            map.set(String(alert.id), alert);
        }
        return map;
    }, [liveAlerts, dispatchedAlerts, cancelledAlerts, resolvedAlerts]);

    const handleAcknowledge = (id) => {
        const parsedId = Number(id);
        if (!Number.isFinite(parsedId)) return;
        const alert = alertById.get(String(parsedId));
        const emergencyType = String(alert?.emergencyType || "").trim().toLowerCase();
        const autoUnit = ASSIGNED_UNIT_BY_EMERGENCY_TYPE[emergencyType] || "";
        setAckTargetId(parsedId);
        setAckAssignedUnit(autoUnit);
    };

    const handleOpenDetails = (id) => {
        const parsedId = Number(id);
        if (!Number.isFinite(parsedId)) return;
        setSelectedSosId(parsedId);
        setIsDetailOpen(true);
        navigate({
            pathname: `/sos/${parsedId}`,
            search: location.search,
        });
    };

    const updateTabRoute = (nextTab) => {
        const normalizedTab = getValidTab(nextTab);
        const params = new URLSearchParams(location.search);
        params.set('tab', normalizedTab);
        const pathname = Number.isFinite(Number(routeSosId)) ? `/sos/${routeSosId}` : '/sos';
        navigate({
            pathname,
            search: `?${params.toString()}`,
        }, { replace: true });
        setActiveTab(normalizedTab);
    };

    const handleOpenResolveDialog = (detail) => {
        const parsedId = Number(detail?.id ?? selectedSosId);
        if (!Number.isFinite(parsedId)) return;
        setResolveTarget({
            id: parsedId,
            userName: detail?.userName || alertById.get(String(parsedId))?.userName || 'Unknown user',
        });
        setResolveNote("");
    };

    const handleConfirmAcknowledge = async () => {
        const parsedId = Number(ackTargetId);
        const assignedUnit = String(ackAssignedUnit || "").trim();
        if (!Number.isFinite(parsedId) || !assignedUnit) return;
        const nowIso = new Date().toISOString();

        try {
            await acknowledgeMutation.mutateAsync({
                sosId: parsedId,
                assigned_unit: assignedUnit,
                note: `Acknowledged and assigned to ${assignedUnit}`,
            });
            setOptimisticById((previous) => ({
                ...previous,
                [String(parsedId)]: {
                    requires_attention: false,
                    acknowledged_at: nowIso,
                    assigned_unit: assignedUnit,
                    assignedUnit,
                },
            }));
            setAckTargetId(null);
            setAckAssignedUnit("");
        } catch (_error) {
            // Keep existing server-driven state on mutation failure.
        }
    };

    const handleConfirmResolve = async () => {
        const parsedId = Number(resolveTarget?.id);
        if (!Number.isFinite(parsedId)) return;

        try {
            await resolveMutation.mutateAsync({
                sosId: parsedId,
                terminalOutcome: "safe",
                note: resolveNote,
            });
            setResolveTarget(null);
            setResolveNote("");
            setIsDetailOpen(false);
            setSelectedSosId(null);
        } catch (_error) {
            // Keep current UI state so the admin can retry or adjust the note.
        }
    };

    const isQueueLoading = liveQueueQuery.isLoading || cancelledQueueQuery.isLoading || resolvedQueueQuery.isLoading;
    const queueError = liveQueueQuery.error || cancelledQueueQuery.error || resolvedQueueQuery.error || null;

    return (
        <DashboardLayout
            title="SOS Screen"
            subtitle="Real-time monitoring of live, dispatched, cancelled, and resolved SOS threads"
        >
            <div className="flex flex-col p-6">
            <Card className="mb-5 shrink-0">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Backend SOS Queue Connection</p>
                            <p className="text-sm text-muted-foreground">
                                Polling SOS queues every 5 seconds
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

            <div className="mb-5 grid shrink-0 gap-4 md:grid-cols-4">
                <button
                    type="button"
                    onClick={() => updateTabRoute('live')}
                    className="text-left"
                    aria-pressed={activeTab === 'live'}
                >
                    <Card className={cn(
                        "border-emergency/20 bg-emergency/5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        activeTab === 'live' && "ring-2 ring-emergency/30 shadow-md"
                    )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Live SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emergency">
                            {liveAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Unassigned open SOS threads</p>
                    </CardContent>
                    </Card>
                </button>
                <button
                    type="button"
                    onClick={() => updateTabRoute('dispatched')}
                    className="text-left"
                    aria-pressed={activeTab === 'dispatched'}
                >
                    <Card className={cn(
                        "transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        activeTab === 'dispatched' && "ring-2 ring-primary/30 shadow-md"
                    )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Dispatch
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            {dispatchedAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Assigned SOS threads</p>
                    </CardContent>
                    </Card>
                </button>
                <button
                    type="button"
                    onClick={() => updateTabRoute('cancelled')}
                    className="text-left"
                    aria-pressed={activeTab === 'cancelled'}
                >
                    <Card className={cn(
                        "transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        activeTab === 'cancelled' && "ring-2 ring-warning/30 shadow-md"
                    )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Cancelled SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-warning">
                            {cancelledAlerts.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Cancelled outcomes</p>
                    </CardContent>
                    </Card>
                </button>
                <button
                    type="button"
                    onClick={() => updateTabRoute('resolved')}
                    className="text-left"
                    aria-pressed={activeTab === 'resolved'}
                >
                    <Card className={cn(
                        "transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        activeTab === 'resolved' && "ring-2 ring-success/30 shadow-md"
                    )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Resolved SOS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-success">{resolvedAlerts.length}</div>
                        <p className="text-sm text-muted-foreground">Resolved outcomes</p>
                    </CardContent>
                    </Card>
                </button>
            </div>

            {isQueueLoading && (
                <Alert className="mb-5 shrink-0">
                    <AlertDescription>Loading SOS queues...</AlertDescription>
                </Alert>
            )}

            {queueError && (
                <Alert variant="destructive" className="mb-5 shrink-0">
                    <AlertDescription>
                        {queueError?.message || 'Failed to load SOS queues.'}
                    </AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={updateTabRoute} className="flex flex-col">
                <TabsList className="mb-4 w-full shrink-0 justify-start">
                    <TabsTrigger value="live">Live SOS ({liveAlerts.length})</TabsTrigger>
                    <TabsTrigger value="dispatched">Dispatch ({dispatchedAlerts.length})</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled SOS ({cancelledAlerts.length})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved SOS ({resolvedAlerts.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="live" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={liveAlerts}
                        title="Live SOS Feed"
                        emptyTitle="No live SOS alerts"
                        emptySubtitle="Monitoring for emergencies..."
                        onAcknowledge={handleAcknowledge}
                        onViewDetails={handleOpenDetails}
                        actionMode="live"
                        contentHeightClassName="h-[40rem] max-h-[calc(100vh-24rem)] min-h-[34rem]"
                    />
                    {attentionAlerts.length === 0 && liveAlerts.length > 0 && (
                        <p className="mt-3 shrink-0 text-xs text-muted-foreground">All visible live SOS threads are acknowledged and waiting for assignment.</p>
                    )}
                </TabsContent>

                <TabsContent value="dispatched" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={dispatchedAlerts}
                        title="Dispatch Queue"
                        emptyTitle="No dispatched SOS"
                        emptySubtitle="Assigned SOS threads will appear here."
                        onResolve={handleOpenResolveDialog}
                        onViewDetails={handleOpenDetails}
                        actionMode="dispatch"
                        contentHeightClassName="h-[40rem] max-h-[calc(100vh-24rem)] min-h-[34rem]"
                    />
                </TabsContent>

                <TabsContent value="cancelled" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={cancelledAlerts}
                        title="Cancelled SOS"
                        emptyTitle="No cancelled SOS"
                        emptySubtitle="Cancelled outcomes will appear here."
                        actionMode="readonly"
                        onViewDetails={handleOpenDetails}
                        contentHeightClassName="h-[calc(100vh-22rem)] min-h-[420px]"
                    />
                </TabsContent>

                <TabsContent value="resolved" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={resolvedAlerts}
                        title="Resolved SOS"
                        emptyTitle="No resolved SOS"
                        emptySubtitle="Resolved outcomes will appear here."
                        actionMode="readonly"
                        onViewDetails={handleOpenDetails}
                        contentHeightClassName="h-[calc(100vh-22rem)] min-h-[420px]"
                    />
                </TabsContent>
            </Tabs>
            </div>

            <Dialog
                open={ackTargetId !== null && Number.isFinite(Number(ackTargetId))}
                onOpenChange={(open) => {
                    if (!open) {
                        setAckTargetId(null);
                        setAckAssignedUnit("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Acknowledge SOS</DialogTitle>
                        <DialogDescription>
                            Select the assigned unit before confirming acknowledgement.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        After acknowledgement succeeds, accepted Beacon friends will be notified and may see the
                        assigned unit. Admin success here remains authoritative even if push delivery is not visible.
                    </p>
                    {(() => {
                        const alert = ackTargetId ? alertById.get(String(ackTargetId)) : null;
                        if (!alert?.emergencyType || alert.emergencyType === "unknown") return null;
                        return (
                            <p className="text-xs text-muted-foreground">
                                Auto-selected from emergency type: <span className="font-medium capitalize">{alert.emergencyType}</span>
                            </p>
                        );
                    })()}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Assigned Unit</p>
                        <Select value={ackAssignedUnit} onValueChange={setAckAssignedUnit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select assigned unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {SOS_ASSIGNED_UNITS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                        {unit}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAckTargetId(null);
                                setAckAssignedUnit("");
                            }}
                            disabled={acknowledgeMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmAcknowledge}
                            disabled={!ackAssignedUnit || acknowledgeMutation.isPending}
                        >
                            {acknowledgeMutation.isPending ? "Acknowledging..." : "Confirm Acknowledge"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={resolveTarget !== null && Number.isFinite(Number(resolveTarget?.id))}
                onOpenChange={(open) => {
                    if (!open && !resolveMutation.isPending) {
                        setResolveTarget(null);
                        setResolveNote("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark SOS as Resolved</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to mark this SOS as resolved?
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will move the SOS thread out of the live queue and into resolved outcomes after the backend confirms the update.
                    </p>
                    {resolveTarget?.userName && (
                        <p className="text-xs text-muted-foreground">
                            Reporter: <span className="font-medium">{resolveTarget.userName}</span>
                        </p>
                    )}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Resolution note (optional)</p>
                        <Textarea
                            value={resolveNote}
                            onChange={(event) => setResolveNote(event.target.value)}
                            placeholder="Add context for why this SOS is resolved"
                            disabled={resolveMutation.isPending}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setResolveTarget(null);
                                setResolveNote("");
                            }}
                            disabled={resolveMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmResolve}
                            disabled={resolveMutation.isPending}
                        >
                            {resolveMutation.isPending ? "Resolving..." : "Confirm Resolve"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <LiveSOSDetailsDialog
                open={isDetailOpen}
                detailQuery={detailQuery}
                detailOverride={selectedSosId ? optimisticById[String(selectedSosId)] : null}
                onMarkResolved={handleOpenResolveDialog}
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) {
                        setSelectedSosId(null);
                        navigate({
                            pathname: '/sos',
                            search: location.search,
                        }, { replace: true });
                        if (!resolveMutation.isPending) {
                            setResolveTarget(null);
                            setResolveNote("");
                        }
                    }
                }}
            />
        </DashboardLayout>
    );
}
