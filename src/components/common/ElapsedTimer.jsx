import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A monotonic mm:ss counter since a timestamp.
 *
 * "About 5 minutes ago" is ambiguous and does not move. A dispatcher needs
 * to know the emergency has been open for 04:32 and that it is now 04:33.
 */
export function ElapsedTimer({ since = null, className }) {
  const [, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (since === null || since === undefined || since === "") {
    return null;
  }

  const started = new Date(since).getTime();
  if (!Number.isFinite(started)) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return <span className={cn("tabular-nums", className)}>{minutes}:{seconds}</span>;
}

export default ElapsedTimer;
