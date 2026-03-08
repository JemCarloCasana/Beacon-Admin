import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, MapPin, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useNotifications, useMarkNotificationRead } from '@/api/useNotifications';
import {
    DEFAULT_PROMOTED_ADMIN_PERMISSIONS,
    useAcceptAdminRequest,
    useRejectAdminRequest,
} from '@/api/useAdminRequests';
import { useToast } from '@/hooks/use-toast';

export function Header({ onMenuClick }) {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [invitePopupNotification, setInvitePopupNotification] = useState(null);
    const [dismissedInviteIds, setDismissedInviteIds] = useState([]);
    const [inviteActionLoading, setInviteActionLoading] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { me, logout, refreshMe } = useAuth();
    const { toast } = useToast();

    const notificationsQuery = useNotifications();
    const markReadMutation = useMarkNotificationRead();
    const acceptAdminRequestMutation = useAcceptAdminRequest();
    const rejectAdminRequestMutation = useRejectAdminRequest();

    const notifications = notificationsQuery.data || [];
    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification?.is_read).length,
        [notifications]
    );
    const hasUnread = unreadCount > 0;
    const renderedNotifications = notifications.slice(0, 8);

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        const typeCounts = notifications.reduce((acc, item) => {
            const key = String(item?.type || 'unknown');
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        console.debug('[notifications] current admin id:', me?.id ?? null);
        console.debug('[notifications] mapped count by type:', typeCounts);
        console.debug('[notifications] rendered count:', renderedNotifications.length);
    }, [me?.id, notifications, renderedNotifications.length]);

    const getActionableAdminRequestId = (notification) => {
        if (notification?.type !== 'admin_request') return null;
        const candidate = notification?.reference_id ?? notification?.metadata?.admin_request_id;
        const requestId = Number(candidate);
        return Number.isFinite(requestId) ? requestId : null;
    };

    const getRouteableId = (value) => {
        const id = Number(value);
        return Number.isFinite(id) ? id : null;
    };

    const getSosTargetId = (notification) => {
        if (notification?.type !== 'sos') return null;
        return getRouteableId(notification?.metadata?.sos_id ?? notification?.metadata?.reference_id);
    };

    const getIncidentTargetId = (notification) => {
        if (notification?.type !== 'incident') return null;
        return getRouteableId(notification?.metadata?.incident_id ?? notification?.metadata?.reference_id);
    };

    const normalizeFallbackRoute = (fallbackRoute) => {
        if (typeof fallbackRoute !== 'string') return null;
        const trimmed = fallbackRoute.trim();
        if (!trimmed.startsWith('/')) return null;
        return trimmed;
    };

    const mapBackendRouteToAppRoute = (route) => {
        if (!route) return null;

        const incidentMatch = route.match(/^\/admin\/incidents\/(\d+)(?:\/)?$/i);
        if (incidentMatch) {
            return `/incidents/${incidentMatch[1]}`;
        }
        if (/^\/admin\/incidents(?:\/)?$/i.test(route)) {
            return '/incidents';
        }

        const sosMatch = route.match(/^\/admin\/sos\/(\d+)(?:\/)?$/i);
        if (sosMatch) {
            return `/sos/${sosMatch[1]}`;
        }
        if (/^\/admin\/sos(?:\/)?$/i.test(route)) {
            return '/sos';
        }

        return route;
    };

    const isRoutableNotificationPath = (route) => {
        if (!route) return false;
        return (
            /^\/incidents(?:\/\d+)?(?:[/?#].*)?$/i.test(route) ||
            /^\/sos(?:\/\d+)?(?:[/?#].*)?$/i.test(route)
        );
    };

    const getFallbackNotificationRoute = (notification) => {
        const normalized = normalizeFallbackRoute(notification?.metadata?.fallback_route);
        const mapped = mapBackendRouteToAppRoute(normalized);
        return isRoutableNotificationPath(mapped) ? mapped : null;
    };

    const resolveNotificationRoute = (notification) => {
        const fallbackRoute = getFallbackNotificationRoute(notification);
        if (fallbackRoute) return fallbackRoute;

        if (notification?.type === 'incident') {
            const incidentId = getIncidentTargetId(notification);
            return incidentId !== null ? `/incidents/${incidentId}` : '/incidents';
        }

        if (notification?.type === 'sos') {
            const sosId = getSosTargetId(notification);
            return sosId !== null ? `/sos/${sosId}` : '/sos';
        }

        return null;
    };

    useEffect(() => {
        if (invitePopupNotification) return;
        const unreadInvite = notifications.find(
            (notification) =>
                getActionableAdminRequestId(notification) !== null &&
                !notification?.is_read &&
                !dismissedInviteIds.includes(notification?.id)
        );
        if (unreadInvite) {
            setInvitePopupNotification(unreadInvite);
        }
    }, [notifications, invitePopupNotification, dismissedInviteIds]);

    const handleNotificationOpenChange = (open) => {
        setIsNotifOpen(open);
        if (open) notificationsQuery.refetch();
    };

    const handleMarkAsRead = async (notification) => {
        if (!notification?.id || notification?.is_read) return;

        try {
            await markReadMutation.mutateAsync(notification.id);
            toast({
                title: 'Notification updated',
                description: 'Marked as read.',
            });
        } catch (error) {
            toast({
                title: 'Failed to update notification',
                description: error?.message || 'Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleNotificationClick = async (notification) => {
        const requestId = getActionableAdminRequestId(notification);
        if (requestId !== null) {
            setInvitePopupNotification({
                ...notification,
                reference_id: requestId,
            });
            return;
        }

        const targetRoute = resolveNotificationRoute(notification);
        if (targetRoute) {
            void handleMarkAsRead(notification);
            navigate(targetRoute);
            return;
        }

        await handleMarkAsRead(notification);
    };

    const handleInviteDecision = async (decision) => {
        const current = invitePopupNotification;
        if (!current) return;

        const requestId = getActionableAdminRequestId(current);
        if (requestId === null) {
            toast({
                title: 'Unable to process request',
                description: 'Notification is missing a valid admin request id.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setInviteActionLoading(true);

            if (decision === 'accept') {
                await acceptAdminRequestMutation.mutateAsync({
                    requestId,
                    role: 'admin',
                    permissions: DEFAULT_PROMOTED_ADMIN_PERMISSIONS,
                });
                await refreshMe?.();
                toast({
                    title: 'Request accepted',
                    description: 'Admin permissions granted.',
                });
            } else {
                await rejectAdminRequestMutation.mutateAsync({ requestId });
                toast({
                    title: 'Request rejected',
                    description: 'Admin request was rejected.',
                });
            }

            await handleMarkAsRead(current);
            setInvitePopupNotification(null);
            await queryClient.invalidateQueries({ queryKey: ['notifications'] });
            await queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
        } catch (error) {
            toast({
                title: `Failed to ${decision} request`,
                description: error?.message || 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setInviteActionLoading(false);
        }
    };

    const formatNotificationDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString();
    };

    const handleLogout = async () => {
        await logout();
        localStorage.removeItem('admin_token');
        // admin_me is never stored in localStorage, only token
        navigate('/login');
    };

    return (
        <>
            <Dialog
                open={!!invitePopupNotification}
                onOpenChange={(open) => {
                    if (!open && invitePopupNotification?.id) {
                        setDismissedInviteIds((prev) =>
                            prev.includes(invitePopupNotification.id)
                                ? prev
                                : [...prev, invitePopupNotification.id]
                        );
                    }
                    if (!open) setInvitePopupNotification(null);
                }}
            >
                {invitePopupNotification && (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {invitePopupNotification.title || 'Admin Invite Received'}
                            </DialogTitle>
                            <DialogDescription>
                                {invitePopupNotification.message || 'You received an admin invitation request.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
                            Type: {invitePopupNotification.type || 'admin_request'}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => handleInviteDecision('reject')}
                                disabled={inviteActionLoading}
                            >
                                Reject
                            </Button>
                            <Button
                                onClick={() => handleInviteDecision('accept')}
                                disabled={inviteActionLoading}
                            >
                                {inviteActionLoading ? 'Processing...' : 'Accept'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            <header className="flex h-16 items-center justify-between border-b bg-white px-6">
                {/* Left: System Status & Info */}
                <div className="flex items-center gap-8">
                {/* System Status */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <div className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    SYSTEM ONLINE
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />

                {/* Location */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Manila, NCR
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />

                {/* Response Time */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Avg Response: <span className="font-bold text-slate-900">4m 12s</span>
                </div>
            </div>

                {/* Right: Search & Notifications */}
                <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search logs, units..."
                        className="w-72 pl-9 bg-slate-100 border-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                </div>

                    {/* Notifications */}
                    <div className="relative">
                        <DropdownMenu open={isNotifOpen} onOpenChange={handleNotificationOpenChange}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative h-9 w-9 text-slate-500">
                                    <Bell className="h-5 w-5" />
                                    {hasUnread && (
                                        <span className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-96">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    Notifications
                                    {notificationsQuery.isFetching && (
                                        <span className="text-xs font-normal text-muted-foreground">Refreshing...</span>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {notificationsQuery.isLoading ? (
                                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                        Loading notifications...
                                    </div>
                                ) : notificationsQuery.isError ? (
                                    <div className="px-2 py-4 text-center text-sm text-destructive">
                                        Failed to load notifications.
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                        No notifications yet.
                                    </div>
                                ) : (
                                    renderedNotifications.map((notification) => (
                                        <DropdownMenuItem
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className="flex cursor-pointer flex-col items-start gap-1 py-2"
                                        >
                                            <div className="flex w-full items-center justify-between gap-2">
                                                <p className="text-sm font-semibold">
                                                    {notification.title || 'Notification'}
                                                </p>
                                                {!notification.is_read && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                                                )}
                                            </div>
                                            <p className="line-clamp-2 w-full text-xs text-muted-foreground">
                                                {notification.message || notification.body || 'No message provided.'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatNotificationDate(notification.created_at)}
                                            </p>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Logout Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="ml-2 flex items-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </header>
        </>
    );
}
