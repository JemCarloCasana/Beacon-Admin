import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { FreshnessStamp } from "./FreshnessStamp";

describe("FreshnessStamp", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the age of the last successful fetch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

    render(<FreshnessStamp status="live" lastUpdatedAt={Date.now() - 4000} />);

    expect(screen.getByText("Updated 4s ago")).toBeInTheDocument();
  });

  it("says so plainly when the data is stale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

    render(<FreshnessStamp status="stale" lastUpdatedAt={Date.now() - 45000} />);

    expect(screen.getByText("Stale — 45s ago")).toBeInTheDocument();
  });

  it("shows that it is updating while the first fetch is in flight", () => {
    render(<FreshnessStamp status="loading" lastUpdatedAt={null} />);

    expect(screen.getByText("Updating…")).toBeInTheDocument();
  });

  it("shows nothing when there is no data and no error", () => {
    const { container } = render(<FreshnessStamp status="error" lastUpdatedAt={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
