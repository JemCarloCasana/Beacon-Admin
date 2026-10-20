import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useIncidentsAPI } from "@/api/useIncidentsAPI";
import { useSOSLiveQueue } from "@/api/useSosAPI";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/api/useIncidentsAPI", () => ({ useIncidentsAPI: vi.fn() }));
vi.mock("@/api/useSosAPI", () => ({ useSOSLiveQueue: vi.fn() }));

describe("CommandPalette", () => {
  beforeAll(() => {
    // cmdk scrolls the active item into view; jsdom does not implement it.
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useIncidentsAPI.mockReturnValue({
      data: [
        {
          id: 7,
          title: "Medical Emergency",
          incident_type: "medical_emergency",
          status: "pending",
          priority: "critical",
          created_at: "2026-03-01T10:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useSOSLiveQueue.mockReturnValue({
      data: [
        {
          sos_id: 101,
          user_id: 10,
          full_name: "Maria",
          latest_status: "active",
          latest_event_at: "2026-03-01T10:10:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("does not load the lists until it is opened", () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    expect(useIncidentsAPI).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });

  it("jumps to an incident by its title", () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByText("Medical Emergency"));

    expect(mockNavigate).toHaveBeenCalledWith("/incidents/7");
  });

  it("jumps to a live SOS thread", () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByText(/Maria — SOS #101/));

    expect(mockNavigate).toHaveBeenCalledWith("/sos/101");
  });

  it("jumps to a page", () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getAllByRole("option", { name: "Incidents" })[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/incidents");
  });
});
