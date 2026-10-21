import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ActiveIncidentsList } from "@/components/dashboard/ActiveIncidentsList";

const incidentA = {
  id: 1,
  title: "Medical Emergency",
  categoryLabel: "Medical Emergency",
  priority: "critical",
  status: "pending",
  statusLabel: "Pending",
  timeAgo: "15 minutes ago",
  address: "A Street",
};

const incidentB = {
  id: 2,
  title: "Traffic Accident",
  categoryLabel: "Traffic Accident",
  priority: "high",
  status: "dispatched",
  statusLabel: "Dispatched",
  timeAgo: "30 minutes ago",
  address: "B Street",
};

function renderList(props = {}) {
  return render(
    <MemoryRouter>
      <ActiveIncidentsList incidents={[incidentA, incidentB]} {...props} />
    </MemoryRouter>
  );
}

describe("ActiveIncidentsList", () => {
  it("selects an incident from the keyboard", () => {
    const onSelect = vi.fn();
    renderList({ onSelect });

    const row = screen.getByRole("button", { name: /select incident 1/i });
    fireEvent.click(row);

    expect(onSelect).toHaveBeenCalledWith(incidentA);
  });

  it("announces which incident is selected", () => {
    renderList({ selectedId: 2 });

    expect(screen.getByRole("button", { name: /select incident 2/i })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(screen.getByRole("button", { name: /select incident 1/i })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("does not render priority badges below 12px", () => {
    const { container } = renderList();

    expect(container.querySelector('[class*="text-[9px]"]')).toBeNull();
    expect(container.querySelector('[class*="text-[10px]"]')).toBeNull();
    expect(container.querySelector('[class*="text-[11px]"]')).toBeNull();
  });

  it("names the status filter", () => {
    renderList();

    expect(screen.getByRole("combobox", { name: /status/i })).toBeInTheDocument();
  });

  it("keeps a stable Priority label and shows the pressed state", () => {
    const onTogglePrioritySort = vi.fn();
    renderList({ sortByPriority: true, onTogglePrioritySort });

    const button = screen.getByRole("button", { name: "Priority" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(onTogglePrioritySort).toHaveBeenCalled();
  });

  it("offers a link to the full incident list", () => {
    renderList();

    expect(screen.getByRole("link", { name: /view all incidents/i })).toHaveAttribute(
      "href",
      "/incidents"
    );
  });

  it("shows an error with a retry instead of an empty list", () => {
    const onRetry = vi.fn();
    renderList({ incidents: [], error: new Error("list unavailable"), onRetry });

    expect(screen.getByText("list unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No active incidents found.")).not.toBeInTheDocument();
  });
});
