import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDataState } from "./useDataState";

const base = {
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
  dataUpdatedAt: 0,
  refetch: () => {},
};

describe("useDataState", () => {
  it("reports loading while the first fetch is in flight", () => {
    const { result } = renderHook(() => useDataState(base));
    expect(result.current.status).toBe("loading");
  });

  it("reports error instead of empty when the fetch failed", () => {
    const { result } = renderHook(() =>
      useDataState({ ...base, isLoading: false, isError: true, error: new Error("boom") })
    );
    expect(result.current.status).toBe("error");
    expect(result.current.isEmpty).toBe(false);
  });

  it("reports empty only after a successful fetch that returned nothing", () => {
    const { result } = renderHook(() =>
      useDataState({ ...base, isLoading: false, data: [] }, { isEmpty: (d) => d.length === 0 })
    );
    expect(result.current.status).toBe("empty");
  });

  it("reports stale when the last successful fetch is older than the threshold", () => {
    const { result } = renderHook(() =>
      useDataState({ ...base, isLoading: false, data: [1], dataUpdatedAt: Date.now() - 60000 })
    );
    expect(result.current.status).toBe("stale");
  });

  it("reports live for a fresh successful fetch", () => {
    const { result } = renderHook(() =>
      useDataState({ ...base, isLoading: false, data: [1], dataUpdatedAt: Date.now() })
    );
    expect(result.current.status).toBe("live");
  });

  it("keeps showing the data as stale rather than empty when a refetch fails", () => {
    const { result } = renderHook(() =>
      useDataState({
        ...base,
        isLoading: false,
        isError: true,
        data: [1],
        dataUpdatedAt: Date.now(),
      })
    );
    expect(result.current.status).toBe("stale");
    expect(result.current.hasData).toBe(true);
  });

  it("exposes the last updated timestamp and the refetch function", () => {
    const updatedAt = Date.now() - 5000;
    const refetch = () => {};
    const { result } = renderHook(() =>
      useDataState({ ...base, isLoading: false, data: [1], dataUpdatedAt: updatedAt, refetch })
    );
    expect(result.current.lastUpdatedAt).toBe(updatedAt);
    expect(result.current.refetch).toBe(refetch);
  });
});
