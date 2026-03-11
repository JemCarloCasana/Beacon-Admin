import { render, screen } from "@testing-library/react";
import { ReporterDetailsDialog } from "@/components/dashboard/ReporterDetailsDialog";

describe("ReporterDetailsDialog", () => {
  it("shows fallback state when there is no linked reporter id", () => {
    render(
      <ReporterDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={12}
        incidentTitle="Fire Incident"
        baseReporter={{ id: null, name: "", phone: "", email: "" }}
        detailQuery={{ isLoading: false, isError: false, data: null, error: null }}
      />
    );

    expect(screen.getByText(/No linked reporter profile was found/i)).toBeInTheDocument();
    expect(screen.getAllByText("Not available")).toHaveLength(3);
  });

  it("renders reporter details and action links when phone/email exist", () => {
    render(
      <ReporterDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={99}
        incidentTitle="Medical Emergency"
        baseReporter={{ id: 7, name: "Base Name", phone: "", email: "" }}
        detailQuery={{
          isLoading: false,
          isError: false,
          error: null,
          data: {
            id: 7,
            name: "Maria Santos",
            phone: "+639191112233",
            email: "maria@example.com",
          },
        }}
      />
    );

    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("+639191112233")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+639191112233");
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:maria@example.com");
  });

  it("hides quick-action links when phone and email are missing", () => {
    render(
      <ReporterDetailsDialog
        open
        onOpenChange={() => {}}
        incidentId={13}
        incidentTitle="Incident"
        baseReporter={{ id: 100, name: "Reporter", phone: "", email: "" }}
        detailQuery={{ isLoading: false, isError: false, data: null, error: null }}
      />
    );

    expect(screen.queryByRole("link", { name: "Call" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Email" })).not.toBeInTheDocument();
  });
});
