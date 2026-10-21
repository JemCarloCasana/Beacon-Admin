import { render, screen } from "@testing-library/react";
import { TimelineLog } from "@/components/incidents/TimelineLog";

describe("TimelineLog", () => {
  it("shows the resolution note on the resolved event", () => {
    render(
      <TimelineLog
        incident={{
          status: "resolved",
          resolved_at: "2026-03-01T01:20:00.000Z",
          resolutionNotes: "Patient transported to hospital",
        }}
      />
    );

    expect(screen.getByText("Patient transported to hospital")).toBeInTheDocument();
  });

  it("shows the resolution note when given a raw incident payload", () => {
    render(
      <TimelineLog
        incident={{
          status: "resolved",
          resolved_at: "2026-03-01T01:20:00.000Z",
          resolution_notes: "Case closed and scene secured.",
        }}
      />
    );

    expect(screen.getByText("Case closed and scene secured.")).toBeInTheDocument();
  });
});
