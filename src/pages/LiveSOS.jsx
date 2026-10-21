import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout';
import { LiveSOSDetailsDialog, LiveSOSFeed } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAcknowledgeSOS, useResolveSOS, SOS_ASSIGNED_UNITS, useSOSDetail, useSOSLiveQueue } from '@/api/useSosAPI';
import { toSosFeedAlert } from '@/models/sos-live.model';
import { emergencyLabel } from '@/config/emergency';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Radio, Wifi, WifiOff } from 'lucide-react';

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
    const { toast } = useToast();
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
    const [resolveOutcome, setResolveOutcome] = useState("safe");
    const [activeTab, setActiveTab] = useState(() => getValidTab(searchParams.get('tab')));

    const liveQueueQuery = useSOSLiveQueue({ status: 'open', limit: 100 });
    const cancelledQueueQuery = useSOSLiveQueue({ status: 'cancelled', limit: 100 });
    const resolvedQueueQuery = useSOSLiveQueue({ status: 'resolved', limit: 100 });
    const acknowledgeMutation = useAcknowledgeSOS();
    const resolveMutation = useResolveSOS();
    const detailQuery = useSOSDetail(selectedSosId, {
        enabled: isDetailOpen && Boolean(selectedSosId),
    });

    useEffect(() => {
        const queryTab = getValidTab(searchParams.get('tab'));
        setActiveTab((previous) => previous === queryTab ? previous : queryTab);
    }, [searchParams]);

    useEffect(() => {
        // The route is the single source of truth for which thread is open, so
        // the browser's back button closes the detail dialog.
        setSelectedSosId(routeSosId ?? null);
        setIsDetailOpen(Boolean(routeSosId));
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
        const sosId = String(id ?? '');
        if (!sosId) return;
        const alert = alertById.get(sosId);
        const emergencyType = String(alert?.emergencyType || "").trim().toLowerCase();
        const autoUnit = ASSIGNED_UNIT_BY_EMERGENCY_TYPE[emergencyType] || "";
        setAckTargetId(sosId);
        setAckAssignedUnit(autoUnit);
    };

    const handleOpenDetails = (id) => {
        const sosId = String(id ?? '');
        if (!sosId) return;
        setSelectedSosId(sosId);
        setIsDetailOpen(true);
        navigate({
            pathname: `/sos/${encodeURIComponent(sosId)}`,
            search: location.search,
        });
    };

    const updateTabRoute = (nextTab) => {
        const normalizedTab = getValidTab(nextTab);
        const params = new URLSearchParams(location.search);
        params.set('tab', normalizedTab);
        const pathname = routeSosId ? `/sos/${encodeURIComponent(routeSosId)}` : '/sos';
        navigate({
            pathname,
            search: `?${params.toString()}`,
        }, { replace: true });
        setActiveTab(normalizedTab);
    };

    const handleOpenResolveDialog = (detail) => {
        const sosId = String(detail?.id ?? selectedSosId ?? '');
        if (!sosId) return;
        setResolveTarget({
            id: sosId,
            userName: detail?.userName || alertById.get(sosId)?.userName || 'Unknown user',
        });
        setResolveNote("");
    };

    const handleConfirmAcknowledge = async () => {
        const sosId = String(ackTargetId ?? '');
        const assignedUnit = String(ackAssignedUnit || "").trim();
        if (!sosId || !assignedUnit) return;
        const nowIso = new Date().toISOString();

        try {
            await acknowledgeMutation.mutateAsync({
                sosId,
                assigned_unit: assignedUnit,
                note: `Acknowledged and assigned to ${assignedUnit}`,
            });
            setOptimisticById((previous) => ({
                ...previous,
                [sosId]: {
                    requires_attention: false,
                    acknowledged_at: nowIso,
                    assigned_unit: assignedUnit,
                    assignedUnit,
                },
            }));
            setAckTargetId(null);
            setAckAssignedUnit("");
        } catch (error) {
            toast({
                title: "Failed to acknowledge the request",
                description: error?.message || "Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleConfirmResolve = async () => {
        const sosId = String(resolveTarget?.id ?? '');
        if (!sosId) return;

        try {
            await resolveMutation.mutateAsync({
                sosId,
                terminalOutcome: resolveOutcome,
                note: resolveNote,
            });
            setResolveTarget(null);
            setResolveNote("");
            setResolveOutcome("safe");
            setIsDetailOpen(false);
            setSelectedSosId(null);
        } catch (error) {
            toast({
                title: "Failed to resolve the request",
                description: error?.message || "Please try again.",
                variant: "destructive",
            });
        }
    };

    const isQueueLoading = liveQueueQuery.isLoading || cancelledQueueQuery.isLoading || resolvedQueueQuery.isLoading;
    const queueError = liveQueueQuery.error || cancelledQueueQuery.error || resolvedQueueQuery.error || null;

    return (
        <DashboardLayout
            title="SOS Requests"
            subtitle="Live triage of new, dispatched, cancelled, and resolved emergency requests"
        >
            <div className="flex flex-col p-6">
            <Card className="mb-5 shrink-0">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Live connection</p>
                            <p className="text-sm text-muted-foreground">
                                {isQueueLoading
                                    ? "Connecting to the live queue..."
                                    : "Polling SOS queues every 5 seconds"}
                            </p>
                            {queueError && (
                                <p className="text-xs text-destructive">
                                    {queueError?.message || "Failed to load SOS queues."}
                                </p>
                            )}
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

            <Tabs value={activeTab} onValueChange={updateTabRoute} className="flex flex-col">
                <TabsList className="mb-4 w-full shrink-0 justify-start">
                    <TabsTrigger value="live">Needs dispatch ({liveAlerts.length})</TabsTrigger>
                    <TabsTrigger value="dispatched">Dispatched ({dispatchedAlerts.length})</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled ({cancelledAlerts.length})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolved ({resolvedAlerts.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="live" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={liveAlerts}
                        loading={liveQueueQuery.isLoading}
                        error={liveQueueQuery.error || null}
                        onRetry={() => liveQueueQuery.refetch()}
                        title="Open SOS Requests"
                        emptyTitle="No open SOS requests"
                        emptySubtitle="New requests appear here the moment a citizen sends one."
                        onAcknowledge={handleAcknowledge}
                        onViewDetails={handleOpenDetails}
                        actionMode="live"
                        contentHeightClassName="h-[calc(100vh-18rem)] min-h-[320px] max-h-[calc(100vh-18rem)]"
                    />
                    {attentionAlerts.length === 0 && liveAlerts.length > 0 && (
                        <p className="mt-3 shrink-0 text-xs text-muted-foreground">All visible SOS requests are acknowledged and waiting for a response unit.</p>
                    )}
                </TabsContent>

                <TabsContent value="dispatched" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={dispatchedAlerts}
                        loading={liveQueueQuery.isLoading}
                        error={liveQueueQuery.error || null}
                        onRetry={() => liveQueueQuery.refetch()}
                        title="Dispatched Requests"
                        emptyTitle="No dispatched requests"
                        emptySubtitle="Requests with a response unit assigned appear here."
                        onResolve={handleOpenResolveDialog}
                        onViewDetails={handleOpenDetails}
                        actionMode="dispatch"
                        contentHeightClassName="h-[calc(100vh-18rem)] min-h-[320px] max-h-[calc(100vh-18rem)]"
                    />
                </TabsContent>

                <TabsContent value="cancelled" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={cancelledAlerts}
                        loading={cancelledQueueQuery.isLoading}
                        error={cancelledQueueQuery.error || null}
                        onRetry={() => cancelledQueueQuery.refetch()}
                        title="Cancelled Requests"
                        emptyTitle="No cancelled requests"
                        emptySubtitle="Requests the caller withdrew appear here."
                        actionMode="readonly"
                        onViewDetails={handleOpenDetails}
                        contentHeightClassName="h-[calc(100vh-18rem)] min-h-[320px] max-h-[calc(100vh-18rem)]"
                    />
                </TabsContent>

                <TabsContent value="resolved" className="mt-0 flex flex-col">
                    <LiveSOSFeed
                        alerts={resolvedAlerts}
                        loading={resolvedQueueQuery.isLoading}
                        error={resolvedQueueQuery.error || null}
                        onRetry={() => resolvedQueueQuery.refetch()}
                        title="Resolved Requests"
                        emptyTitle="No resolved requests"
                        emptySubtitle="Resolved requests appear here."
                        actionMode="readonly"
                        onViewDetails={handleOpenDetails}
                        contentHeightClassName="h-[calc(100vh-18rem)] min-h-[320px] max-h-[calc(100vh-18rem)]"
                    />
                </TabsContent>
            </Tabs>
            </div>

            <Dialog
                open={Boolean(ackTargetId)}
                onOpenChange={(open) => {
                    if (!open) {
                        setAckTargetId(null);
                        setAckAssignedUnit("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Acknowledge SOS request</DialogTitle>
                        <DialogDescription>
                            Choose the response unit that is taking this request.
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
                                Auto-selected from emergency type: <span className="font-medium">{emergencyLabel(alert.emergencyType)}</span>
                            </p>
                        );
                    })()}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Response unit</p>
                        <Select value={ackAssignedUnit} onValueChange={setAckAssignedUnit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select response unit" />
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
                            {acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(resolveTarget?.id)}
                onOpenChange={(open) => {
                    if (!open && !resolveMutation.isPending) {
                        setResolveTarget(null);
                        setResolveNote("");
                        setResolveOutcome("safe");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolve SOS request</DialogTitle>
                        <DialogDescription>
                            Resolve this SOS request? It leaves the live queue once the update is recorded.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This moves the SOS request out of the live queue once the backend confirms the update.
                    </p>
                    {resolveTarget?.userName && (
                        <p className="text-xs text-muted-foreground">
                            Caller: <span className="font-medium">{resolveTarget.userName}</span>
                        </p>
                    )}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Outcome</p>
                        <RadioGroup value={resolveOutcome} onValueChange={setResolveOutcome}>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="safe" id="resolve-outcome-safe" />
                                <Label htmlFor="resolve-outcome-safe">Safe</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="cancelled" id="resolve-outcome-cancelled" />
                                <Label htmlFor="resolve-outcome-cancelled">Caller cancelled</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="false_alarm" id="resolve-outcome-false-alarm" />
                                <Label htmlFor="resolve-outcome-false-alarm">False alarm</Label>
                            </div>
                        </RadioGroup>
                    </div>
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
                                setResolveOutcome("safe");
                            }}
                            disabled={resolveMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmResolve}
                            disabled={resolveMutation.isPending}
                        >
                            {resolveMutation.isPending ? "Resolving..." : "Resolve request"}
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