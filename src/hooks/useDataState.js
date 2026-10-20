import { useEffect, useMemo, useState } from "react";

/**
 * The status a query can be in, from the operator's point of view.
 *
 * - loading: nothing has arrived yet
 * - error:   the fetch failed and there is nothing to show
 * - empty:   the fetch succeeded and there is genuinely nothing
 * - stale:   we have data, but it is old, or a refetch failed
 * - live:    the data is current
 */
export const DATA_STATUSES = ["loading", "error", "empty", "stale", "live"];

const DEFAULT_STALE_AFTER_MS = 15000;

/**
 * Normalise a React Query result into one honest display state.
 *
 * The point of this hook is that a screen can never accidentally render an
 * empty state while it is still loading, or render a zero because the request
 * failed. The caller decides what "empty" means for its data.
 */
export function useDataState(query, options = {}) {
  const { isEmpty: isEmptyPredicate, staleAfterMs = DEFAULT_STALE_AFTER_MS } = options;

  const data = query?.data;
  const isLoading = Boolean(query?.isLoading);
  const isError = Boolean(query?.isError);
  const error = query?.error ?? null;
  const lastUpdatedAt = query?.dataUpdatedAt ?? null;
  const refetch = query?.refetch;

  // Tick so staleness appears without waiting for the next refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const hasData = data !== undefined && data !== null;
    const isEmpty = hasData && isEmptyPredicate ? Boolean(isEmptyPredicate(data)) : false;
    const isStale =
      hasData &&
      (isError || (lastUpdatedAt !== null && now - lastUpdatedAt > staleAfterMs));

    let status = "live";
    if (isLoading && !hasData) {
      status = "loading";
    } else if (isError && !hasData) {
      status = "error";
    } else if (hasData && isEmpty) {
      status = "empty";
    } else if (isStale) {
      status = "stale";
    }

    return {
      status,
      isLoading,
      isError,
      isEmpty,
      isStale,
      hasData,
      lastUpdatedAt,
      error,
      refetch,
    };
  }, [
    data,
    isLoading,
    isError,
    error,
    lastUpdatedAt,
    refetch,
    isEmptyPredicate,
    staleAfterMs,
    now,
  ]);
}

export default useDataState;
