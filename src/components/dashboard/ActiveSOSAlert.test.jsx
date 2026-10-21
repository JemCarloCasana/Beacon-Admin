import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActiveSOSAlert } from "@/components/dashboard/ActiveSOSAlert";

const medicalAlert = {
  id: "101",
  name: "Maria",
  description: "Chest pain",
  emergencyType: "medical",
  timestamp: "2026-03-01T10:00:00.000Z",
  userPhone: "09171234567",
  message: "Chest pain",
  location: { address: "A Street", latitude: 14.6, longitude: 121.0 },
  requires_attention: true,
};

const unreportedAlert = {
  ...medicalAlert,
  id: "102",
  emergencyType: null,
  emergencyTypeSource: null,
};

function renderBanner(props = {}) {
  return render(
    <ActiveSOSAlert
      alert={medicalAlert}
      loading={false}
      error={null}
      onRetry={() => {}}
      onDispatch={() => {}}
      onAssignUnit={() => {}}
      onOpenDetails={() => {}}
      onClose={() => {}}
      {...props}
    />
  );
}

describe("ActiveSOSAlert", () => {
  it("dispatches the reported emergency in one click", () => {
    const onDispatch = vi.fn();
    const onOpenDetails = vi.fn();
    renderBanner({ onDispatch, onOpenDetails });

    fireEvent.click(screen.getByRole("button", { name: /assign emergency medical unit/i }));

    expect(onDispatch).toHaveBeenCalledWith("101");
    expect(onOpenDetails).not.toHaveBeenCalled();
  });

  it("names the unit it is about to assign", () => {
    renderBanner();

    expect(
      screen.getByRole("button", { name: /assign emergency medical unit/i })
    ).toBeInTheDocument();
  });

  it("shows the emergency type as the person reported it", () => {
    renderBanner({ alert: unreportedAlert });

    expect(screen.getByText("Emergency type not reported")).toBeInTheDocument();
  });

  it("offers a unit choice when the emergency type was not reported", () => {
    const onAssignUnit = vi.fn();
    renderBanner({ alert: unreportedAlert, onAssignUnit });

    fireEvent.click(screen.getByRole("button", { name: /choose response unit/i }));

    const combo = screen.getByRole("combobox");
    fireEvent.click(combo);
    fireEvent.click(screen.getAllByText("Police Personnel").at(-1));
    fireEvent.click(screen.getByRole("button", { name: /^assign$/i }));

    expect(onAssignUnit).toHaveBeenCalledWith("102", "Police Personnel");
  });

  it("does not offer a permanently disabled acknowledge button", () => {
    renderBanner();

    expect(screen.queryByRole("button", { name: /acknowledge/i })).not.toBeInTheDocument();
  });

  it("keeps a single secondary action to open the details", () => {
    const onOpenDetails = vi.fn();
    renderBanner({ onOpenDetails });

    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    expect(onOpenDetails).toHaveBeenCalledWith("101");
  });

  it("gives the dismiss button an accessible name", () => {
    renderBanner();

    expect(screen.getByRole("button", { name: /dismiss alert/i })).toBeInTheDocument();
  });

  it("does not render the emergency state in 10px type", () => {
    const { container } = renderBanner();

    expect(container.querySelector('[class*="text-[10px]"]')).toBeNull();
  });

  it("shows the elapsed time rather than a relative timestamp", () => {
    renderBanner();

    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("shows a loading state instead of an all-clear banner", () => {
    renderBanner({ alert: null, loading: true });

    expect(screen.queryByText(/no sos alerts requiring immediate attention/i)).not.toBeInTheDocument();
  });

  it("shows an error with a retry instead of an all-clear banner", () => {
    const onRetry = vi.fn();
    renderBanner({ alert: null, error: new Error("queue down"), onRetry });

    expect(screen.getByText("queue down")).toBeInTheDocument();
    expect(screen.queryByText(/no sos alerts requiring immediate attention/i)).not.toBeInTheDocument();
  });
});
