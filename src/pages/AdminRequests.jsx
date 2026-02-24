import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
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
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
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
  const [note, setNote] = useState("");
  const [workingId, setWorkingId] = useState(null);

  const requestsQuery = useAdminRequests();
  const acceptMutation = useAcceptAdminRequest();
  const rejectMutation = useRejectAdminRequest();

  const requests = requestsQuery.data || [];
  const currentAdminId = Number(me?.id);
  const inboxRequests = useMemo(() => {
    if (!Number.isInteger(currentAdminId) || currentAdminId <= 0) return [];
    return requests.filter((item) => {
      const targetPersonnelId = Number(item?.personnel_id ?? item?.personnelId);
      return targetPersonnelId === currentAdminId;
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
    try {
      setWorkingId(requestId);
      if (type === "accept") {
        await acceptMutation.mutateAsync({
          requestId,
          note,
          role: "admin",
          permissions: DEFAULT_PROMOTED_ADMIN_PERMISSIONS,
        });
        await refreshMe();
        toast({
          title: "Request accepted",
          description: "Personnel has been promoted to admin.",
        });
      } else {
        await rejectMutation.mutateAsync({ requestId, note });
        toast({
          title: "Request rejected",
          description: "Admin request has been rejected.",
        });
      }
      setNote("");
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
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by request id, personnel, email, status..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Input
            placeholder="Decision note (optional)"
            className="w-72"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </CardContent>
      </Card>

      {requestsQuery.isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {requestsQuery.error?.message || "Failed to load admin requests."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Admin Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsQuery.isLoading ? (
            <RequestsSkeleton />
          ) : filteredRequests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No admin requests found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Personnel</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
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
                        <Badge className={statusClasses[item?.status] || "bg-slate-100 text-slate-700"}>
                          {item?.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                        {item?.note || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleDecision("accept", item.id)}
                            disabled={!isPending || loading}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            {loading ? "Processing..." : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecision("reject", item.id)}
                            disabled={!isPending || loading}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
