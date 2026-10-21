import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Renders the right thing for a data status.
 *
 * The point is that a screen can never accidentally show an empty state
 * while it is still loading, or show a "nothing here" message because the
 * request failed. The status comes from `useDataState`.
 */
export function DataState({
  status = "live",
  error = null,
  onRetry = null,
  emptyTitle = "Nothing here yet",
  emptyDescription = "",
  emptyAction = null,
  skeleton = null,
  children = null,
}) {
  if (status === "loading") {
    return skeleton ? <div>{skeleton}</div> : null;
  }

  if (status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load this data</AlertTitle>
        <AlertDescription>
          <span className="block">{error?.message || "Something went wrong."}</span>
          {onRetry ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => onRetry()}>
              Retry
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "empty") {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        {emptyDescription ? (
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        ) : null}
        {emptyAction ? (
          <Button size="sm" className="mt-3" onClick={() => emptyAction.onClick?.()}>
            {emptyAction.label}
          </Button>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}

export default DataState;
