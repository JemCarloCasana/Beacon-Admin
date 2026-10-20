import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import {
  DEFAULT_PROMOTED_ADMIN_PERMISSIONS,
  useAcceptAdminRequest,
  useAdminRequests,
  useRejectAdminRequest,
} from "@/api/useAdminRequests";
import { AlertCircle, Check, Search, X } from "lucide-react";

const statusClasses = {
  pending: "bg-warning text-warning-foreground",
  approved: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-foreground",
};

function RequestsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded border p-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-3 h-3 w-72" />
        </div>
      ))}
    </div>
  );
}

export default function AdminRequests() {
  const { toast } = useToast();
  const { me, refreshMe } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [notesById, setNotesById] = useState({});
  const [workingId, setWorkingId] = useState(null);
  const [pendingReject, setPendingReject] = useState(null);

  const requestsQuery = useAdminRequests();
  const acceptMutation = useAcceptAdminRequest();
  const rejectMutation = useRejectAdminRequest();

  const requests = requestsQuery.data || [];
  const currentAdminId = String(me?.id ?? "");
  const inboxRequests = useMemo(() => {
    if (!currentAdminId) return [];
    return requests.filter((item) => {
      const targetPersonnelId = String(item?.personnel_id ?? item?.personnelId ?? "");
      return targetPersonnelId === currentAdminId;
    });
  }, [requests, currentAdminId]);

  const sentRequests = useMemo(() => {
    if (!currentAdminId) return [];
    return requests.filter((item) => {
      const requestedById = String(item?.requested_by_admin_id ?? item?.requestedByAdminId ?? "");
      return requestedById === currentAdminId;
    });
  }, [requests, currentAdminId]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return inboxRequests;

    return inboxRequests.filter((item) => {
      const personnelName = item?.personnel_name || item?.personnel?.full_name || "";
      const personnelEmail = item?.personnel_email || item?.personnel?.email || "";
      const status = item?.status || "";
      return (
        String(item?.id || "").includes(query) ||
        personnelName.toLowerCase().includes(query) ||
        personnelEmail.toLowerCase().includes(query) ||
        status.toLowerCase().includes(query)
      );
    });
  }, [inboxRequests, searchQuery]);

  const handleDecision = async (type, requestId) => {
    if (!requestId) return;
    const decisionNote = notesById[requestId] || "";
    try {
      setWorkingId(requestId);
      if (type === "accept") {
        await acceptMutation.mutateAsync({
          requestId,
          note: decisionNote,
          role: "admin",
          permissions: DEFAULT_PROMOTED_ADMIN_PERMISSIONS,
        });
        await refreshMe();
        toast({
          title: "Request accepted",
          description: "Personnel has been promoted to admin.",
        });
      } else {
        await rejectMutation.mutateAsync({ requestId, note: decisionNote });
        toast({
          title: "Request rejected",
          description: "Admin request has been rejected.",
        });
      }
      setNotesById((previous) => {
        const next = { ...previous };
        delete next[requestId];
        return next;
      });
    } catch (error) {
      toast({
        title: `Failed to ${type} request`,
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-request-search"
              aria-label="Search admin requests"
              placeholder="Search by request id, personnel, email, status..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {requestsQuery.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {requestsQuery.error?.message || "Failed to load admin requests."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Requests about me ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsQuery.isLoading ? (
            <RequestsSkeleton />
          ) : filteredRequests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No admin requests found.</div>
          ) : (
            <Table>
              <TableCaption className="sr-only">
                Admin access requests about the signed-in operator, one row per request.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Personnel</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((item) => {
                  const isPending = String(item?.status || "").toLowerCase() === "pending";
                  const loading = workingId === item.id;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item?.personnel_name || item?.personnel?.full_name || `User #${item?.personnel_id || item?.personnelId || ""}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item?.personnel_email || item?.personnel?.email || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{item?.requested_by_admin_id || item?.requestedByAdminId || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusClasses[item?.status] || "bg-muted text-foreground"}>
                          {item?.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                        {item?.note || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              aria-label={`Decision note for request ${item.id}`}
                              placeholder="Decision note (optional)"
                              className="h-8 w-48 text-xs"
                              value={notesById[item.id] || ""}
                              onChange={(event) =>
                                setNotesById((previous) => ({
                                  ...previous,
                                  [item.id]: event.target.value,
                                }))
                              }
                              disabled={loading}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleDecision("accept", item.id)}
                              disabled={loading}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              {loading ? "Processing..." : "Accept"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPendingReject(item)}
                              disabled={loading}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Decided</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests I sent ({sentRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sentRequests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              You have not sent any admin requests.
            </div>
          ) : (
            <Table>
              <TableCaption className="sr-only">
                Admin access requests sent by the signed-in operator, one row per request.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Personnel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentRequests.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {item?.personnel_name || item?.personnel?.full_name || `User #${item?.personnel_id || item?.personnelId || ""}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item?.personnel_email || item?.personnel?.email || ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusClasses[item?.status] || "bg-muted text-foreground"}>
                        {item?.status || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                      {item?.note || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(pendingReject)}
        onOpenChange={(open) => {
          if (!open) setPendingReject(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this admin request?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReject?.personnel_name || pendingReject?.personnel?.full_name || "This person"}{" "}
              will not be granted admin access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingReject;
                setPendingReject(null);
                if (target) handleDecision("reject", target.id);
              }}
            >
              Reject request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
