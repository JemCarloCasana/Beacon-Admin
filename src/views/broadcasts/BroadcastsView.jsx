import { useState } from "react";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Megaphone, RefreshCw, Send } from "lucide-react";
import { SEVERITY_OPTIONS, severityLabel } from "@/config/constants";

const severityStyles = {
  announcement: "bg-info text-info-foreground",
  info: "bg-info text-info-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-destructive text-destructive-foreground",
  all_clear: "bg-success text-success-foreground",
};

// The severity vocabulary, with a label and an icon so severity is never
// carried by colour alone. It lives in @/config/constants so every screen
// names a severity the same way.

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
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

function BroadcastTable({ items, isDraft, sending, canManageBroadcasts, canDeleteBroadcasts, actions }) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <p>{isDraft ? "No draft broadcasts." : "No sent broadcasts."}</p>
        {isDraft && (
          <p className="mt-1">
            Use "New broadcast" above to compose one. It will be a draft until you send it.
          </p>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">
        {isDraft
          ? "Broadcast drafts, one row per draft. Nothing here has been sent."
          : "Broadcasts that have been sent, one row per broadcast."}
      </TableCaption>
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
              <Badge className={severityStyles[item.severity] || "bg-muted text-foreground"}>
                {severityLabel(item.severity)}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{toAudienceLabel(item)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDateTime(isDraft ? item.created_at : item.sent_at)}
            </TableCell>
            <TableCell className="text-right">
              {isDraft ? (
                canManageBroadcasts ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={sending} onClick={() => actions.onOpenEditDialog(item)}>Edit</Button>
                    {canDeleteBroadcasts && <Button size="sm" variant="destructive" disabled={sending} onClick={() => actions.onOpenDeleteDialog(item)}>Delete</Button>}
                    <Button
                      size="sm"
                      onClick={() => actions.onOpenSendDialog(item)}
                      disabled={sending}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Read-only</span>
                )
              ) : (
                <span className="text-sm text-muted-foreground">Sent</span>
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
  canViewBroadcasts = canManageBroadcasts,
  canDeleteBroadcasts = false,
  editingBroadcast, editForm, pendingDeleteBroadcast, mutationError, updating, deleting, busy,
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
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <DashboardLayout>
      {!canViewBroadcasts ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You do not have permission to view broadcasts.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 p-4 md:p-6">
          {canManageBroadcasts ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Create Broadcast Draft
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm((previous) => !previous)}
              >
                {showCreateForm ? "Hide composer" : "New broadcast"}
              </Button>
            </CardHeader>
            {showCreateForm && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Title</p>
                  <Input
                    value={form.title}
                    aria-label="Title"
                    maxLength={200}
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
                    <SelectTrigger id="broadcast-severity" aria-label="Severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="danger">Danger</SelectItem>
                      <SelectItem value="all_clear">All clear</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Body</p>
                <Textarea
                  id="broadcast-body"
                  value={form.body}
                  aria-label="Body"
                  maxLength={5000}
                  rows={4}
                  placeholder="Classes are suspended due to weather conditions."
                  onChange={(e) => actions.onFormChange("body", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {(form.body || "").length} of 5000 characters used.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Audience Type</p>
                  <Select
                    value={form.audience_type}
                    onValueChange={(value) => actions.onFormChange("audience_type", value)}
                  >
                    <SelectTrigger id="broadcast-audience-type" aria-label="Audience type">
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
                      <SelectTrigger id="broadcast-audience-role" aria-label="Audience role">
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
                <Button onClick={actions.onCreateDraft} disabled={busy || creating}>
                  {creating ? "Creating..." : "Create Draft"}
                </Button>
              </div>
            </CardContent>
            )}
          </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                You have read-only access to broadcasts. Composing, editing and sending
                require the manage_broadcasts permission.
              </CardContent>
            </Card>
          )}

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
                  <p className="text-muted-foreground">Recipients</p>
                  <p className="font-medium">{lastSendResult.delivered_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Push delivered / failed</p>
                  <p className="font-medium">
                    {lastSendResult.push?.successCount ?? 0} delivered /{" "}
                    {lastSendResult.push?.failureCount ?? 0} failed
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Removed Tokens</p>
                  <p className="font-medium">{lastSendResult.push?.removedTokensCount ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {lastSendResult?.ok && (lastSendResult.push?.error || lastSendResult.push?.unknownCount > 0) && (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>
              Broadcast saved as sent. Some push notifications could not be confirmed. Do not resend.
              {lastSendResult.push?.unknownCount > 0 && ` Unconfirmed notifications: ${lastSendResult.push.unknownCount}.`}
            </AlertDescription></Alert>
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
                  sending={busy || sending}
                  canManageBroadcasts={canManageBroadcasts}
                canDeleteBroadcasts={canDeleteBroadcasts}
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
                  sending={busy || sending}
                  canManageBroadcasts={canManageBroadcasts}
                canDeleteBroadcasts={canDeleteBroadcasts}
                  actions={actions}
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={!!editingBroadcast} onOpenChange={(open) => { if (!open) actions.onCloseEditDialog(); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Broadcast Draft</DialogTitle><DialogDescription>Update the message. Its audience stays unchanged.</DialogDescription></DialogHeader>
              <label htmlFor="edit-broadcast-title">Title</label>
              <Input id="edit-broadcast-title" value={editForm?.title || ""} maxLength={200} disabled={updating} onChange={(event) => actions.onEditFormChange("title", event.target.value)} />
              <label htmlFor="edit-broadcast-body">Body</label>
              <Textarea id="edit-broadcast-body" value={editForm?.body || ""} maxLength={5000} disabled={updating} onChange={(event) => actions.onEditFormChange("body", event.target.value)} />
              <label htmlFor="edit-broadcast-severity">Severity</label>
              <Select value={editForm?.severity || "announcement"} disabled={updating} onValueChange={(value) => actions.onEditFormChange("severity", value)}>
                <SelectTrigger id="edit-broadcast-severity"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="announcement">Announcement</SelectItem><SelectItem value="info">Information</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="danger">Danger</SelectItem><SelectItem value="all_clear">All clear</SelectItem></SelectContent>
              </Select>
              {mutationError && <p role="alert" className="text-sm text-destructive">{mutationError}</p>}
              <DialogFooter><Button variant="outline" disabled={updating} onClick={actions.onCloseEditDialog}>Cancel</Button><Button disabled={updating} onClick={actions.onSaveDraft}>{updating ? "Saving..." : "Save Changes"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={!!pendingDeleteBroadcast} onOpenChange={(open) => { if (!open) actions.onCloseDeleteDialog(); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Delete Broadcast Draft</DialogTitle><DialogDescription>Delete “{pendingDeleteBroadcast?.title}”? This cannot be undone.</DialogDescription></DialogHeader>
              {mutationError && <p role="alert" className="text-sm text-destructive">{mutationError}</p>}
              <DialogFooter><Button variant="outline" disabled={deleting} onClick={actions.onCloseDeleteDialog}>Cancel</Button><Button variant="destructive" disabled={deleting} onClick={actions.onConfirmDelete}>{deleting ? "Deleting..." : "Confirm Delete"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
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
                  <span className="font-medium">Title:</span> {pendingSendBroadcast?.title || "—"}
                </p>
                <p>
                  <span className="font-medium">Severity:</span> {severityLabel(pendingSendBroadcast?.severity)}
                </p>
                <p>
                  <span className="font-medium">Audience:</span>{" "}
                  {toAudienceLabel(pendingSendBroadcast)}
                </p>
                <div className="border-t pt-2">
                  <p className="font-medium">Message:</p>
                  <p className="whitespace-pre-wrap">{pendingSendBroadcast?.body || "-"}</p>
                </div>
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
