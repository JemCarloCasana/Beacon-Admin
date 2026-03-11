import { Mail, Phone, UserRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function valueOrFallback(value) {
  const text = String(value || "").trim();
  return text || "Not available";
}

export function ReporterDetailsDialog({
  open,
  onOpenChange,
  incidentId,
  incidentTitle,
  baseReporter,
  detailQuery,
}) {
  const queryReporter = detailQuery?.data || null;
  const reporter = {
    id: queryReporter?.id ?? baseReporter?.id ?? null,
    name: queryReporter?.name ?? baseReporter?.name ?? "",
    phone: queryReporter?.phone ?? baseReporter?.phone ?? "",
    email: queryReporter?.email ?? baseReporter?.email ?? "",
  };
  const hasReporterLink = reporter.id !== null && reporter.id !== undefined;
  const hasPhone = Boolean(String(reporter.phone || "").trim());
  const hasEmail = Boolean(String(reporter.email || "").trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reporter Details</DialogTitle>
          <DialogDescription>
            Incident #{incidentId || "-"} {incidentTitle ? `- ${incidentTitle}` : ""}
          </DialogDescription>
        </DialogHeader>

        {detailQuery?.isLoading && hasReporterLink && (
          <Alert>
            <AlertDescription>Loading reporter details...</AlertDescription>
          </Alert>
        )}

        {detailQuery?.isError && (
          <Alert variant="destructive">
            <AlertDescription>{detailQuery?.error?.message || "Failed to load reporter details."}</AlertDescription>
          </Alert>
        )}

        {!hasReporterLink && (
          <Alert>
            <AlertDescription>No linked reporter profile was found for this incident.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{valueOrFallback(reporter.name)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="truncate text-sm font-medium">{valueOrFallback(reporter.phone)}</p>
            </div>
            {hasPhone && (
              <Button asChild size="sm" variant="outline">
                <a href={`tel:${reporter.phone}`}>Call</a>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="truncate text-sm font-medium">{valueOrFallback(reporter.email)}</p>
            </div>
            {hasEmail && (
              <Button asChild size="sm" variant="outline">
                <a href={`mailto:${reporter.email}`}>Email</a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReporterDetailsDialog;
