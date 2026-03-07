import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { IncidentDetailsDialog } from "@/components/incidents/IncidentDetailsDialog";
import { useIncidentDetail, useUpdateIncident } from "@/api/useIncidentsAPI";

vi.mock("@/api/useIncidentsAPI", () => ({
  useIncidentDetail: vi.fn(),
  useUpdateIncident: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/map/MapCanvas", () => ({
  default: () => <div data-testid="incident-map">map</div>,
}));

vi.mock("@/components/ProtectedIncidentImage", () => ({
  ProtectedIncidentImage: ({ imageUrl, alt, className }) => (
    <img src={imageUrl} alt={alt} className={className} />
  ),
}));

describe("IncidentDetailsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIncidentDetail.mockReturnValue({
      data: {
        id: 7,
        title: "Fire Incident",
        description: "Smoke visible",
        category: "fire",
        priority: "medium",
        status: "pending",
        image_url: "https://cdn.example.com/incident.jpg",
        created_at: "2026-03-01T01:00:00.000Z",
      },
      isLoading: false,
      isError: false,
      error: null,
    });
    useUpdateIncident.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    });
  });

  it("renders incident image when image URL exists", () => {
    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={7}
      />
    );

    const image = screen.getByRole("img", { name: /incident 7 fire incident/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://cdn.example.com/incident.jpg");
    expect(screen.getByText("Incident Type")).toBeInTheDocument();
    expect(screen.getByText("Assign Department")).toBeInTheDocument();
    expect(screen.queryByText(/Assigned Admin ID/i)).not.toBeInTheDocument();
  });

  it("does not render image section when no image URL exists", () => {
    useIncidentDetail.mockReturnValue({
      data: {
        id: 8,
        title: "Medical Incident",
        category: "medical_emergency",
        priority: "medium",
        status: "pending",
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={8}
      />
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows assign department dropdown options", () => {
    useIncidentDetail.mockReturnValue({
      data: {
        id: 7,
        title: "General Incident",
        description: "Smoke visible",
        category: "others",
        priority: "medium",
        status: "pending",
        image_url: "https://cdn.example.com/incident.jpg",
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={7}
      />
    );

    fireEvent.click(screen.getByLabelText("Assign Department"));
    expect(screen.getByText("Emergency Medical Unit")).toBeInTheDocument();
    expect(screen.getByText("Fire Station Unit")).toBeInTheDocument();
    expect(screen.getByText("Police Personnel")).toBeInTheDocument();
    expect(screen.getByText("Traffic Enforcement Unit")).toBeInTheDocument();
  });

  it("renders timeline milestones and resolved notes when present", () => {
    useIncidentDetail.mockReturnValue({
      data: {
        id: 9,
        title: "Resolved Incident",
        status: "resolved",
        created_at: "2026-03-01T01:00:00.000Z",
        dispatched_at: "2026-03-01T01:05:00.000Z",
        updated_at: "2026-03-01T01:10:00.000Z",
        resolved_at: "2026-03-01T01:20:00.000Z",
        resolution_notes: "Case closed and scene secured.",
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={9}
      />
    );

    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Reported")).toBeInTheDocument();
    expect(screen.getByText("Dispatched")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getAllByText("Resolved").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Resolution Notes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Case closed and scene secured.").length).toBeGreaterThanOrEqual(1);
  });

  it("skips missing timeline milestones", () => {
    useIncidentDetail.mockReturnValue({
      data: {
        id: 10,
        title: "Partially Tracked Incident",
        status: "pending",
        created_at: "2026-03-01T01:00:00.000Z",
        updated_at: "2026-03-01T01:05:00.000Z",
        dispatched_at: null,
        resolved_at: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={10}
      />
    );

    expect(screen.getByText("Reported")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.queryByText("Dispatched")).not.toBeInTheDocument();
    expect(screen.queryByText("Resolved")).not.toBeInTheDocument();
  });

  it("auto-assigns priority based on incident type", () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useUpdateIncident.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    useIncidentDetail.mockReturnValue({
      data: {
        id: 11,
        title: "Fire Report",
        description: "Large fire reported near market.",
        category: "fire",
        priority: "medium",
        status: "pending",
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={11}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 11,
        priority: "critical",
      })
    );
  });

  it("keeps manual priority selection for 'others' incidents", () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useUpdateIncident.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    useIncidentDetail.mockReturnValue({
      data: {
        id: 12,
        title: "Misc Report",
        description: "General concern in the area.",
        category: "others",
        priority: "low",
        status: "pending",
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={12}
      />
    );

    fireEvent.click(screen.getByLabelText("Priority"));
    fireEvent.click(screen.getAllByText("High").at(-1));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        priority: "high",
      })
    );
  });

  it("auto-assigns department based on incident type", () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useUpdateIncident.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    useIncidentDetail.mockReturnValue({
      data: {
        id: 14,
        title: "Fire Report",
        category: "fire",
        priority: "medium",
        assigned_department: null,
        status: "pending",
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <IncidentDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={14}
      />
    );

    expect(screen.getByText("Auto-assigned from incident type: Fire Station Unit.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 14,
        assignedDepartment: "Fire Station Unit",
      })
    );
  });
});
