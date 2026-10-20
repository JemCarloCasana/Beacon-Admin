import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DataState } from "./DataState";

describe("DataState", () => {
  it("renders the skeleton while loading and never the empty message", () => {
    render(
      <DataState
        status="loading"
        error={null}
        onRetry={() => {}}
        emptyTitle="No alerts"
        skeleton={<div data-testid="skeleton" />}
      >
        <div>content</div>
      </DataState>
    );

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByText("No alerts")).not.toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders an error with a retry action instead of an empty state", () => {
    const onRetry = vi.fn();
    render(
      <DataState
        status="error"
        error={new Error("boom")}
        onRetry={onRetry}
        emptyTitle="No alerts"
        skeleton={<div />}
      >
        <div>content</div>
      </DataState>
    );

    expect(screen.getByText("boom")).toBeInTheDocument();
    expect(screen.queryByText("No alerts")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders the empty state with its action", () => {
    const onClick = vi.fn();
    render(
      <DataState
        status="empty"
        error={null}
        onRetry={() => {}}
        emptyTitle="No alerts"
        emptyDescription="Nothing has come in yet."
        emptyAction={{ label: "Create one", onClick }}
        skeleton={<div />}
      >
        <div>content</div>
      </DataState>
    );

    expect(screen.getByText("No alerts")).toBeInTheDocument();
    expect(screen.getByText("Nothing has come in yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create one" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders the children when the data is live", () => {
    render(
      <DataState status="live" error={null} onRetry={() => {}} emptyTitle="No alerts" skeleton={<div />}>
        <div>content</div>
      </DataState>
    );

    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("still renders the children when the data is stale", () => {
    render(
      <DataState status="stale" error={null} onRetry={() => {}} emptyTitle="No alerts" skeleton={<div />}>
        <div>content</div>
      </DataState>
    );

    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
