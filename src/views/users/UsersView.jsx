import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { PAGINATION } from "@/config/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  TableCaption,
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
import { Search, AlertCircle, ChevronDown, Plus } from "lucide-react";

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
  canCreateUsers,
  searchQuery,
  users,
  usersLoading,
  usersError,
  usersTotal,
  sendingAdminRequestId,
  statusFilter,
  statusUpdatingUserId,
  creatingUser,
  editingUserId,
  isCreateDialogOpen,
  isEditDialogOpen,
  createForm,
  editForm,
  actions,
}) {
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [page, setPage] = useState(1);

  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = users.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
      {!canManageUsers ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You do not have permission to manage users.
          </CardContent>
        </Card>
      ) : (
        <>
          <Dialog open={isCreateDialogOpen} onOpenChange={actions.onCreateDialogOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
                <DialogDescription>
                  Add a new user account and assign a role.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="createForm-full_name" className="text-sm font-medium">Full name</Label>
                  <Input id="createForm-full_name"
                    value={createForm?.full_name || ""}
                    onChange={(e) => actions.onCreateFormChange?.("full_name", e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createForm-email" className="text-sm font-medium">Email</Label>
                  <Input id="createForm-email"
                    type="email"
                    value={createForm?.email || ""}
                    onChange={(e) => actions.onCreateFormChange?.("email", e.target.value)}
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createForm-password" className="text-sm font-medium">Password</Label>
                  <Input id="createForm-password"
                    type="password"
                    value={createForm?.password || ""}
                    onChange={(e) => actions.onCreateFormChange?.("password", e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createForm-role" className="text-sm font-medium">Role</Label>
                  <Select value={createForm?.role || "personnel"} onValueChange={(value) => actions.onCreateFormChange?.("role", value)}>
                    <SelectTrigger id="createForm-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personnel">Personnel</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => actions.onCancelCreateUser?.()} disabled={creatingUser}>
                  Cancel
                </Button>
                <Button onClick={() => actions.onCreateUser?.()} disabled={creatingUser}>
                  {creatingUser ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                  <Label htmlFor="editForm-full_name" className="text-sm font-medium">Full name</Label>
                  <Input id="editForm-full_name"
                    value={editForm?.full_name || ""}
                    onChange={(e) => actions.onEditFormChange?.("full_name", e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editForm-email" className="text-sm font-medium">Email</Label>
                  <Input id="editForm-email"
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

          <Card>
            <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Label htmlFor="user-search" className="sr-only">
                  Search users by email or name
                </Label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="user-search"
                  placeholder="Search users by email or name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => actions.setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-52">
                <Label htmlFor="user-status-filter" className="sr-only">
                  Filter users by status
                </Label>
                <Select value={statusFilter} onValueChange={(value) => actions.setStatusFilter?.(value)}>
                  <SelectTrigger id="user-status-filter">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deactivated">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {canCreateUsers && (
                <Button className="w-full md:w-auto" onClick={() => actions.onOpenCreateUser?.()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              )}
              {(searchQuery || (statusFilter && statusFilter !== "all")) && (
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => {
                    actions.setSearchQuery?.("");
                    actions.setStatusFilter?.("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>

          {usersError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {usersError?.message || "Failed to load users. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Users ({users.length}
                {typeof usersTotal === "number" && usersTotal !== users.length ? ` of ${usersTotal}` : ""})
              </CardTitle>
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
                  <TableCaption className="sr-only">
                    Beacon personnel, one row per account.
                  </TableCaption>
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
                    {visibleUsers.map((user) => (
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
                          <Badge
                            variant="outline"
                            className={
                              user.status === "deactivated"
                                ? "border-destructive/40 text-destructive"
                                : "border-success/40 text-success"
                            }
                          >
                            {user.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Actions for ${user.full_name || user.email || user.id}`}
                              >
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
                                  setPendingStatusChange({
                                    user,
                                    nextStatus: user.status === "deactivated" ? "active" : "deactivated",
                                  })
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
              {users.length > pageSize && (
                <div className="flex items-center justify-end gap-3 border-t pt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <AlertDialog
        open={Boolean(pendingStatusChange)}
        onOpenChange={(open) => {
          if (!open) setPendingStatusChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusChange?.nextStatus === "deactivated" ? "Deactivate" : "Reactivate"}{" "}
              {pendingStatusChange?.user?.full_name || pendingStatusChange?.user?.email || "this account"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange?.nextStatus === "deactivated"
                ? "They will lose access to the admin console immediately. You can reactivate them later."
                : "They will be able to sign in to the admin console again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingStatusChange;
                setPendingStatusChange(null);
                if (!target) return;
                if (target.nextStatus === "deactivated") {
                  actions.onDeactivateUser?.(target.user);
                } else {
                  actions.onReactivateUser?.(target.user);
                }
              }}
            >
              {pendingStatusChange?.nextStatus === "deactivated" ? "Deactivate account" : "Reactivate account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
