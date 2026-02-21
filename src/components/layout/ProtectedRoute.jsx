import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAdminMe } from '@/api/adminMe';

/**
 * ProtectedRoute Component
 * 
 * Guards access to a route based on user permissions.
 * Always fetches /admin/me as the source of truth.
 * 
 * Usage:
 * <ProtectedRoute requiredPermission="manage_users">
 *   <UsersPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
    children,
    requiredPermission,
}) {
    const [me, setMe] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const { hasPermission } = usePermissions(me);

    // Refresh permissions from /admin/me on mount to ensure they're current
    useEffect(() => {
        let mounted = true;

        const refreshPermissions = async () => {
            try {
                const data = await fetchAdminMe();
                if (mounted) {
                    setMe(data);
                    // Note: Only token is stored in localStorage, not admin_me
                    // admin_me is always fetched fresh from /admin/me endpoint
                }
            } catch (e) {
                // Token expired or invalid - will redirect to auth
                if (mounted) {
                    localStorage.removeItem('admin_token');
                    setMe(null);
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        refreshPermissions();

        return () => {
            mounted = false;
        };
    }, []);

    // While loading permissions, show a loading skeleton
    // This prevents privilege flash - sensitive content won't show until permissions are verified
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="space-y-4 w-full max-w-2xl px-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-3/4" />
                    <p className="text-sm text-slate-500 text-center mt-8">
                        Loading permissions...
                    </p>
                </div>
            </div>
        );
    }

    // If no permission required, render immediately
    if (!requiredPermission) {
        return children;
    }

    // If no user found (token expired/invalid), redirect to auth
    if (!me) {
        return <Navigate to="/" replace />;
    }

    // Check if user has required permission
    if (!hasPermission(requiredPermission)) {
        // Redirect to dashboard if permission check fails
        return <Navigate to="/dashboard" replace />;
    }

    // Render protected content if permission check passes
    return children;
}
