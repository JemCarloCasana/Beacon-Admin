import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Megaphone, RefreshCw, Send } from "lucide-react";

const severityStyles = {
  info: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function toAudienceLabel(item) {
  if (item?.audience_type === "all") return "All users";
  const roles = Array.isArray(item?.audience_roles)
    ? item.audience_roles
        .map((role) => String(role || "").trim().toLowerCase())
        .filter((role) => role === "citizen" || role === "student")
    : [];
  if (roles.length === 0) return "Selected roles";
  const labels = roles.map((role) => role.charAt(0).toUpperCase() + role.slice(1));
  return `Roles: ${labels.join(", ")}`;
}

function BroadcastTable({ items, isDraft, sending, actions }) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {isDraft ? "No draft broadcasts." : "No sent broadcasts."}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Audience</TableHead>
          <TableHead>{isDraft ? "Created" : "Sent"}</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge className={severityStyles[item.severity] || "bg-slate-100 text-slate-700"}>
                {item.severity || "info"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{toAudienceLabel(item)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDateTime(isDraft ? item.created_at : item.sent_at)}
            </TableCell>
            <TableCell className="text-right">
              {isDraft ? (
                <Button
                  size="sm"
                  onClick={() => actions.onOpenSendDialog(item)}
                  disabled={sending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Delivered</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BroadcastsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded border p-4">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-2 h-3 w-80" />
        </div>
      ))}
    </div>
  );
}

export default function BroadcastsView({
  canManageBroadcasts,
  form,
  drafts,
  sent,
  pendingSendBroadcast,
  lastSendResult,
  loading,
  error,
  creating,
  sending,
  actions,
}) {
  return (
    <DashboardLayout>
      {!canManageBroadcasts ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You do not have permission to manage broadcasts.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Create Broadcast Draft
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Title</p>
                  <Input
                    value={form.title}
                    placeholder="Campus Advisory"
                    onChange={(e) => actions.onFormChange("title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Severity</p>
                  <Select
                    value={form.severity}
                    onValueChange={(value) => actions.onFormChange("severity", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Body</p>
                <Textarea
                  value={form.body}
                  rows={4}
                  placeholder="Classes are suspended due to weather conditions."
                  onChange={(e) => actions.onFormChange("body", e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Audience Type</p>
                  <Select
                    value={form.audience_type}
                    onValueChange={(value) => actions.onFormChange("audience_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="role">By role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.audience_type === "role" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Audience Role</p>
                    <Select
                      value={form.audience_role}
                      onValueChange={(value) => actions.onFormChange("audience_role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="citizen">Citizen</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select one role. Required when audience is role-based.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={actions.onCreateDraft} disabled={creating}>
                  {creating ? "Creating..." : "Create Draft"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {lastSendResult?.ok && (
            <Card>
              <CardHeader>
                <CardTitle>Last Send Result</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Broadcast ID</p>
                  <p className="font-medium">{lastSendResult.broadcast_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivered (DB)</p>
                  <p className="font-medium">{lastSendResult.delivered_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">FCM Success/Failure</p>
                  <p className="font-medium">
                    {lastSendResult.push?.successCount ?? 0}/{lastSendResult.push?.failureCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Removed Tokens</p>
                  <p className="font-medium">{lastSendResult.push?.removedTokensCount ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error?.message || "Failed to load broadcasts."}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Draft Broadcasts ({drafts.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={actions.onRefresh} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <BroadcastsSkeleton />
              ) : (
                <BroadcastTable
                  items={drafts}
                  isDraft
                  sending={sending}
                  actions={actions}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sent Broadcasts ({sent.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <BroadcastsSkeleton />
              ) : (
                <BroadcastTable
                  items={sent}
                  isDraft={false}
                  sending={sending}
                  actions={actions}
                />
              )}
            </CardContent>
          </Card>

          <Dialog
            open={!!pendingSendBroadcast}
            onOpenChange={(open) => {
              if (!open) actions.onCloseSendDialog();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Broadcast</DialogTitle>
                <DialogDescription>
                  This will push the broadcast to Android users and mark it as sent.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 rounded border p-3 text-sm">
                <p>
                  <span className="font-medium">Title:</span> {pendingSendBroadcast?.title || "-"}
                </p>
                <p>
                  <span className="font-medium">Severity:</span> {pendingSendBroadcast?.severity || "-"}
                </p>
                <p>
                  <span className="font-medium">Audience:</span>{" "}
                  {toAudienceLabel(pendingSendBroadcast)}
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={actions.onCloseSendDialog}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button onClick={actions.onConfirmSend} disabled={sending}>
                  {sending ? "Sending..." : "Confirm Send"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </DashboardLayout>
  );
}
