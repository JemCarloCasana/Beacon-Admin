import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Search, Plus, Users as UsersIcon, Shield, UserCog, AlertCircle } from 'lucide-react';
import { useUsers } from '@/api';
import { fetchAdminMe } from '@/api/adminMe';

const roleConfig = {
    admin: { label: 'Admin', icon: Shield, color: 'bg-destructive text-destructive-foreground' },
    supervisor: { label: 'Supervisor', icon: UserCog, color: 'bg-primary text-primary-foreground' },
    dispatcher: { label: 'Dispatcher', icon: UsersIcon, color: 'bg-info text-info-foreground' },
};

// Skeleton loader for the users table
const UsersSkeleton = () => (
    <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
            </div>
        ))}
    </div>
);

export default function Users() {
    const [searchQuery, setSearchQuery] = useState('');
    const [me, setMe] = useState(null);
    const [meLoading, setMeLoading] = useState(true);

    const { data: users = [], isLoading, error, isError } = useUsers();

    // Fetch /admin/me on mount - always get fresh permissions from backend
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const data = await fetchAdminMe();
                if (mounted) setMe(data);
            } catch (e) {
                // Token missing/expired - already handled by fetchAdminMe
                if (mounted) setMe(null);
            } finally {
                if (mounted) setMeLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    // Filter users based on search query
    const filteredUsers = users.filter(
        (user) =>
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout me={me} meLoading={meLoading}>
            {/* Search & Actions */}
            <Card className="mb-6">
                <CardContent className="flex items-center gap-4 py-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search users by email or name..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </CardContent>
            </Card>

            {/* Error State */}
            {isError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error?.message || 'Failed to load users. Please try again.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Users ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <UsersSkeleton />
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? 'No users match your search.' : 'No users found.'}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback>
                                                        {user.full_name
                                                            ?.split(' ')
                                                            .map((n) => n[0])
                                                            .join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{user.full_name}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {user.email}
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
                    )}
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
