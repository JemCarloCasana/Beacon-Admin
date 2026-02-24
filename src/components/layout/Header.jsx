import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, MapPin, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    const { logout, refreshMe } = useAuth();
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

    useEffect(() => {
        if (invitePopupNotification) return;
        const unreadInvite = notifications.find(
            (notification) =>
                notification?.type === 'admin_request' &&
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
        if (notification?.type === 'admin_request') {
            setInvitePopupNotification(notification);
            return;
        }
        await handleMarkAsRead(notification);
    };

    const normalizeId = (value) => {
        if (value === null || value === undefined) return null;
        const text = String(value).trim();
        if (!text) return null;
        return text;
    };

    const parseObjectLike = (value) => {
        if (!value) return {};
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch {
                return {};
            }
        }
        return {};
    };

    const resolveRequestId = (notification) => {
        const nestedData = parseObjectLike(notification?.data);
        const nestedPayload = parseObjectLike(notification?.payload);
        const nestedMeta = parseObjectLike(notification?.meta);
        const nestedMetadata = parseObjectLike(notification?.metadata);
        const preferredCandidates = [
            nestedMetadata?.admin_request_id,
            nestedMetadata?.adminRequestId,
            nestedMetadata?.request_id,
            notification?.admin_request_id,
        ];

        const candidates = [
            ...preferredCandidates,
            notification?.adminRequestId,
            notification?.request_id,
            notification?.requestId,
            notification?.resource_id,
            notification?.resourceId,
            notification?.source_id,
            notification?.sourceId,
            notification?.entity_id,
            notification?.entityId,
            notification?.target_id,
            notification?.targetId,
            notification?.reference_id,
            notification?.referenceId,
            nestedData?.admin_request_id,
            nestedData?.adminRequestId,
            nestedData?.request_id,
            nestedData?.requestId,
            nestedData?.resource_id,
            nestedData?.resourceId,
            nestedData?.source_id,
            nestedData?.sourceId,
            nestedData?.entity_id,
            nestedData?.entityId,
            nestedData?.target_id,
            nestedData?.targetId,
            nestedData?.reference_id,
            nestedData?.referenceId,
            nestedPayload?.admin_request_id,
            nestedPayload?.adminRequestId,
            nestedPayload?.request_id,
            nestedPayload?.requestId,
            nestedMeta?.admin_request_id,
            nestedMeta?.adminRequestId,
            nestedMeta?.request_id,
            nestedMeta?.requestId,
            nestedMetadata?.requestId,
        ];

        const found = candidates.find((value) => normalizeId(value));
        if (found) return normalizeId(found);

        const searchableText = [
            notification?.title,
            notification?.message,
            notification?.body,
            notification?.data,
            notification?.payload,
            notification?.meta,
            notification?.metadata,
            nestedData?.title,
            nestedData?.message,
            nestedData?.body,
            nestedPayload?.title,
            nestedPayload?.message,
            nestedPayload?.body,
            nestedMeta?.title,
            nestedMeta?.message,
            nestedMeta?.body,
            nestedMetadata?.title,
            nestedMetadata?.message,
            nestedMetadata?.body,
        ]
            .filter(Boolean)
            .join(' ');

        if (!searchableText) return null;

        const strictMatch = searchableText.match(
            /(?:request[_\s-]?id|admin[_\s-]?request)\D{0,8}([a-zA-Z0-9-]{2,64})/i
        );
        if (strictMatch?.[1]) return normalizeId(strictMatch[1]);

        const hashMatch = searchableText.match(/#([a-zA-Z0-9-]{2,64})/);
        if (hashMatch?.[1]) return normalizeId(hashMatch[1]);

        // Last fallback: some backends use notification.id as request id.
        return normalizeId(notification?.id);
    };

    const handleInviteDecision = async (decision) => {
        const current = invitePopupNotification;
        if (!current) return;

        const requestId = resolveRequestId(current);
        if (!requestId) {
            console.error('Missing admin request id in notification payload:', current);
            const availableKeys = Object.keys(current || {}).slice(0, 12).join(', ');
            toast({
                title: 'Unable to process request',
                description: availableKeys
                    ? `Missing request id. Available fields: ${availableKeys}`
                    : 'Missing request id in the notification payload.',
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
            notificationsQuery.refetch();
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
        navigate('/');
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
                                    notifications.slice(0, 8).map((notification) => (
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
