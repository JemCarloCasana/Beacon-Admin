import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IncidentDetailPanel } from "@/components/dashboard/IncidentDetailPanel";

vi.mock("@/components/map/MapCanvas", () => ({
  default: () => <div data-testid="incident-map">map</div>,
}));

const incident = {
  id: 7,
  title: "Medical Emergency",
  priority: "low",
  priorityProposal: "critical",
  status: "pending",
  statusLabel: "Pending",
  categoryLabel: "Medical Emergency",
  description: "Chest pain reported by the caller.",
  address: "A Street",
  location: { address: "A Street", latitude: null, longitude: null },
  assignedDepartment: "Police Personnel",
  reportedByUserId: 42,
  reporter: { id: 42, name: "Ana Reporter", phone: "+639181234567" },
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:05:00.000Z",
  resolutionNotes: "",
};

function renderPanel(props = {}) {
  return render(
    <IncidentDetailPanel
      incident={incident}
      mapState={{ hasValidMap: false, error: "No valid coordinates to display on map.", marker: null }}
      actions={{ onGoToIncidentWorkspace: vi.fn(), onContactReporter: vi.fn(), onOpenMap: vi.fn() }}
      {...props}
    />
  );
}

describe("IncidentDetailPanel", () => {
  it("keeps the incident title outside the scrolling body", () => {
    renderPanel();

    const title = screen.getByRole("heading", { name: "Medical Emergency" });
    expect(title.closest(".overflow-y-auto")).toBeNull();
  });

  it("shows the server's priority rather than a black pill", () => {
    const { container } = renderPanel();

    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(container.querySelector(".bg-slate-900")).toBeNull();
  });

  it("suggests the category priority without asserting it", () => {
    renderPanel({ incident: { ...incident, priority: null, priorityProposal: "critical" } });

    expect(screen.getByText(/suggested from incident type/i)).toBeInTheDocument();
  });

  it("does not suggest a priority the server already set", () => {
    renderPanel();

    expect(screen.queryByText(/suggested from incident type/i)).not.toBeInTheDocument();
  });

  it("names the reporter rather than a user id", () => {
    renderPanel();

    expect(screen.getByText("Ana Reporter")).toBeInTheDocument();
  });

  it("calls the incident description by its own name", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Description" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Notes" })).not.toBeInTheDocument();
  });

  it("does not render section headings below 12px", () => {
    const { container } = renderPanel();

    expect(container.querySelector('[class*="text-[10px]"]')).toBeNull();
  });

  it("shows a dash when there are no coordinates", () => {
    renderPanel();

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("announces a selection change", () => {
    const { container } = renderPanel();

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});
