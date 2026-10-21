import { CommandPalette } from './CommandPalette';
import { useEffect, useMemo, useState } from 'react';
import { Bell, LogOut, Menu, SunMoon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
import { useAcceptAdminRequest, useRejectAdminRequest } from '@/api/useAdminRequests';
import PermissionPicker from '@/components/common/PermissionPicker';
import { CONSOLE_FEATURE_PERMISSIONS, DEFAULT_ACCEPT_PERMISSIONS } from '@/config/permissions';
import { useToast } from '@/hooks/use-toast';

export function Header({ onMenuClick, title }) {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [invitePopupNotification, setInvitePopupNotification] = useState(null);
    const [dismissedInviteRequestIds, setDismissedInviteRequestIds] = useState([]);
    const [inviteActionLoading, setInviteActionLoading] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { me, logout, refreshMe } = useAuth();
    const { theme, setTheme, resolvedTheme } = useTheme();
    // What the operator is about to hand over. Pre-selected with the least
    // privilege, and widened only by a deliberate click.
    const [grantedPermissions, setGrantedPermissions] = useState(
        () => DEFAULT_ACCEPT_PERMISSIONS
    );
    const { toast } = useToast();

    const notificationsQuery = useNotifications();
    const markReadMutation = useMarkNotificationRead();
    const acceptAdminRequestMutation = useAcceptAdminRequest();
    const rejectAdminRequestMutation = useRejectAdminRequest();

    const notifications = notificationsQuery.data || [];
    const unreadNotifications = useMemo(
        () => notifications.filter((notification) => !notification?.is_read),
        [notifications]
    );
    const unreadCount = useMemo(
        () => unreadNotifications.length,
        [unreadNotifications]
    );
    const hasUnread = unreadCount > 0;
    const visibleNotifications = useMemo(() => {
        if (showAllNotifications) return notifications;
        return notifications.slice(0, 5);
    }, [notifications, showAllNotifications]);
    const canShowAllNotifications = notifications.length > 5;

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        const typeCounts = notifications.reduce((acc, item) => {
            const key = String(item?.type || 'unknown');
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        console.debug('[notifications] current admin id:', me?.id ?? null);
        console.debug('[notifications] mapped count by type:', typeCounts);
        console.debug('[notifications] rendered count:', notifications.length);
    }, [me?.id, notifications]);

    const getActionableAdminRequestId = (notification) => {
        if (notification?.type !== 'admin_request') return null;
        const candidate = notification?.reference_id ?? notification?.metadata?.admin_request_id;
        return candidate == null || candidate === '' ? null : String(candidate);
    };

    const dismissInviteNotification = (notification) => {
        const requestId = getActionableAdminRequestId(notification);
        if (requestId === null) return;
        setDismissedInviteRequestIds((prev) =>
            prev.includes(requestId) ? prev : [...prev, requestId]
        );
    };

    const getRouteableId = (value) => {
        return value == null || value === '' ? null : String(value);
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
                !dismissedInviteRequestIds.includes(getActionableAdminRequestId(notification))
        );
        if (unreadInvite) {
            // Each invite starts from the console features. A widened
            // selection from an earlier invite must not carry over.
            setGrantedPermissions(DEFAULT_ACCEPT_PERMISSIONS);
            setInvitePopupNotification(unreadInvite);
        }
    }, [notifications, invitePopupNotification, dismissedInviteRequestIds]);

    const handleNotificationOpenChange = (open) => {
        setIsNotifOpen(open);
        if (open) {
            notificationsQuery.refetch();
            return;
        }
        setShowAllNotifications(false);
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

    const handleMarkAllAsRead = async () => {
        if (unreadNotifications.length === 0 || markReadMutation.isPending) return;

        try {
            await Promise.all(
                unreadNotifications
                    .filter((notification) => notification?.id)
                    .map((notification) => markReadMutation.mutateAsync(notification.id))
            );
            setShowAllNotifications(true);
            toast({
                title: 'Notifications updated',
                description: 'All unread notifications were marked as read.',
            });
            await queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (error) {
            toast({
                title: 'Failed to update notifications',
                description: error?.message || 'Please try again.',
                variant: 'destructive',
            });
        }
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
                    permissions: grantedPermissions,
                });
                await refreshMe?.();
                toast({
                    title: 'Request accepted',
                    description: `Admin permissions granted: ${grantedPermissions.join(', ') || 'none'}.`,
                });
            } else {
                await rejectAdminRequestMutation.mutateAsync({ requestId });
                toast({
                    title: 'Request rejected',
                    description: 'Admin request was rejected.',
                });
            }

            dismissInviteNotification(current);
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
        // logout() calls the backend, then clears the local session and
        // navigates to /login. Clearing the token here as well would race it.
        await logout();
    };

    const initials = String(me?.full_name || "")
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const toggleTheme = () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    return (
        <>
            <CommandPalette />
            <Dialog
                open={!!invitePopupNotification}
                onOpenChange={(open) => {
                    if (!open && invitePopupNotification) {
                        dismissInviteNotification(invitePopupNotification);
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
                                {invitePopupNotification.message || 'An admin access request is awaiting your review. Accept or reject it below.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Permissions to grant</p>
                            <p className="text-xs text-muted-foreground">
                                You are accepting this request for yourself, so these are the
                                permissions you will hold. manage_users and manage_admins are not
                                offered here: an administrator with manage_admins grants those
                                from Manage Users.
                            </p>
                            <PermissionPicker
                                permissions={CONSOLE_FEATURE_PERMISSIONS}
                                value={grantedPermissions}
                                onChange={setGrantedPermissions}
                                idPrefix="accept-permission"
                            />
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

            <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMenuClick}
                        aria-label="Open menu"
                        className="h-9 w-9 lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    {title ? (
                        <span className="truncate text-sm font-semibold text-foreground lg:hidden">
                            {title}
                        </span>
                    ) : null}
                </div>

                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <div className="relative">
                        <DropdownMenu open={isNotifOpen} onOpenChange={handleNotificationOpenChange}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-9 w-9 text-muted-foreground">
                                    <Bell className="h-5 w-5" />
                                    {hasUnread && (
                                        <span
                                            aria-label={`${unreadCount} unread notifications`}
                                            className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold leading-4 text-white"
                                        >
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
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-2 pt-2 text-xs">
                                            <span className="text-muted-foreground">
                                                {showAllNotifications
                                                    ? `Showing all notifications (${notifications.length})`
                                                    : `Showing 5 newest notifications${notifications.length > 0 ? ` (${Math.min(notifications.length, 5)} of ${notifications.length})` : ''}`}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {hasUnread && (
                                                    <button
                                                        type="button"
                                                        onClick={handleMarkAllAsRead}
                                                        disabled={markReadMutation.isPending}
                                                        className="font-medium text-primary transition hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                                                    >
                                                        {markReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
                                                    </button>
                                                )}
                                                {showAllNotifications ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAllNotifications(false)}
                                                        className="font-medium text-foreground transition hover:text-foreground"
                                                    >
                                                        Show less
                                                    </button>
                                                ) : canShowAllNotifications ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAllNotifications(true)}
                                                        className="font-medium text-foreground transition hover:text-foreground"
                                                    >
                                                        Show all
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                        {visibleNotifications.map((notification) => (
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
                                                        <span className="h-2 w-2 rounded-full bg-primary" />
                                                    )}
                                                </div>
                                                <p className="line-clamp-2 w-full text-xs text-muted-foreground">
                                                    {notification.message || notification.body || 'No message provided.'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatNotificationDate(notification.created_at)}
                                                </p>
                                            </DropdownMenuItem>
                                        ))}
                                        </div>
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Admin menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                    {initials}
                                </span>
                                <span className="hidden text-left sm:block">
                                    <span className="block text-sm font-medium leading-tight text-foreground">
                                        {me?.full_name || "Operator"}
                                    </span>
                                    <span className="block text-xs leading-tight text-muted-foreground">
                                        {me?.role || ""}
                                    </span>
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{me?.full_name || "Operator"}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={toggleTheme}>
                                <SunMoon className="mr-2 h-4 w-4" />
                                {resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
        </>
    );
}
