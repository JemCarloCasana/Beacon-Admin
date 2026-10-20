import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function formatAge(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Tells the operator how old the data on screen is.
 *
 * A live dashboard that silently shows two-minute-old data is lying about
 * itself, so every auto-refreshing surface carries one of these.
 */
export function FreshnessStamp({ status = "live", lastUpdatedAt = null, className }) {
  const [, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (status === "loading") {
    return <span className={cn("text-xs text-muted-foreground", className)}>Updating…</span>;
  }

  if (lastUpdatedAt === null || lastUpdatedAt === undefined) {
    return null;
  }

  const seconds = Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000));

  if (status === "stale") {
    return <span className={cn("text-xs text-warning", className)}>Stale — {formatAge(seconds)} ago</span>;
  }

  return <span className={cn("text-xs text-muted-foreground", className)}>Updated {formatAge(seconds)} ago</span>;
}

export default FreshnessStamp;
