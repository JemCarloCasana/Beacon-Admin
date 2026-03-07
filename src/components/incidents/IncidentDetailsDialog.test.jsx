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
});
