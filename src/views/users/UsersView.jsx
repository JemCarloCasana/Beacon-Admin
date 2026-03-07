import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, AlertCircle, ChevronDown } from "lucide-react";

const UsersSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 rounded border p-4">
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

export default function UsersView({
  canManageUsers,
  searchQuery,
  users,
  usersLoading,
  usersError,
  sendingAdminRequestId,
  statusFilter,
  statusUpdatingUserId,
  editingUserId,
  isEditDialogOpen,
  editForm,
  actions,
}) {
  return (
    <DashboardLayout>
      {!canManageUsers ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You do not have permission to manage users.
          </CardContent>
        </Card>
      ) : (
        <>
          <Dialog open={isEditDialogOpen} onOpenChange={actions.onEditDialogOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update the user details below.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Full name</p>
                  <Input
                    value={editForm?.full_name || ""}
                    onChange={(e) => actions.onEditFormChange?.("full_name", e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Email</p>
                  <Input
                    type="email"
                    value={editForm?.email || ""}
                    onChange={(e) => actions.onEditFormChange?.("email", e.target.value)}
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => actions.onCancelEditUser?.()}
                  disabled={editingUserId === editForm?.id}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => actions.onSaveEditedUser?.()}
                  disabled={!editForm?.id || editingUserId === editForm?.id}
                >
                  {editingUserId === editForm?.id ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="mb-6">
            <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by email or name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => actions.setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-52">
                <Select value={statusFilter} onValueChange={(value) => actions.setStatusFilter?.(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deactivated">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {usersError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {usersError?.message || "Failed to load users. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <UsersSkeleton />
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {searchQuery ? "No users match your search." : "No users found."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {user.full_name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {user.role || "personnel"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "deactivated" ? "secondary" : "outline"}>
                            {user.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role?.toLowerCase() !== "admin" && user.status !== "deactivated" && (
                                <DropdownMenuItem
                                  onClick={() => actions.onSendAdminRequest?.(user)}
                                  disabled={sendingAdminRequestId === user.id}
                                >
                                  {sendingAdminRequestId === user.id ? "Sending..." : "Send Admin Request"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => actions.onEditUser?.(user)}
                                disabled={editingUserId === user.id}
                              >
                                {editingUserId === user.id ? "Saving..." : "Edit User"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  user.status === "deactivated"
                                    ? actions.onReactivateUser?.(user)
                                    : actions.onDeactivateUser?.(user)
                                }
                                disabled={statusUpdatingUserId === user.id}
                              >
                                {statusUpdatingUserId === user.id
                                  ? "Updating..."
                                  : user.status === "deactivated"
                                    ? "Reactivate"
                                    : "Deactivate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
