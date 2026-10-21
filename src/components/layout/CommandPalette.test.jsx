import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useIncidentsAPI } from "@/api/useIncidentsAPI";
import { useSOSLiveQueue } from "@/api/useSosAPI";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/api/useIncidentsAPI", () => ({ useIncidentsAPI: vi.fn() }));
vi.mock("@/api/useSosAPI", () => ({ useSOSLiveQueue: vi.fn() }));
vi.mock("@/auth/AdminAuthProvider", () => ({ useAdminAuth: vi.fn() }));

describe("CommandPalette", () => {
  beforeAll(() => {
    // cmdk scrolls the active item into view; jsdom does not implement it.
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAdminAuth.mockReturnValue({
      hasPermission: () => true,
    });
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
    fireEvent.click(screen.getByText(/Maria - SOS request #101/));

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

  it("does not offer pages the operator cannot open", () => {
    useAdminAuth.mockReturnValue({ hasPermission: () => false });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.getByRole("option", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Manage Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Reports" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "SOS Requests" })).not.toBeInTheDocument();
  });

  it("does not query incidents or SOS without the matching permission", async () => {
    useAdminAuth.mockReturnValue({ hasPermission: () => false });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    await waitFor(() => {
      expect(
        useIncidentsAPI.mock.calls.every(([, options]) => options?.enabled === false)
      ).toBe(true);
      expect(
        useSOSLiveQueue.mock.calls.every(([, options]) => options?.enabled === false)
      ).toBe(true);
    });

    expect(screen.queryByText("Medical Emergency")).not.toBeInTheDocument();
    expect(screen.queryByText(/Maria/)).not.toBeInTheDocument();
  });

  it("offers incidents but not SOS when only view_incidents is granted", async () => {
    useAdminAuth.mockReturnValue({
      hasPermission: (permission) => permission === "view_incidents",
    });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.getByText("Medical Emergency")).toBeInTheDocument();
    expect(screen.queryByText(/Maria/)).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Manage Users" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(useIncidentsAPI).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ enabled: true })
      );
      expect(
        useSOSLiveQueue.mock.calls.every(([, options]) => options?.enabled === false)
      ).toBe(true);
    });
  });

  it("offers Map View when the operator holds either map permission", () => {
    useAdminAuth.mockReturnValue({
      hasPermission: (permission) => permission === "view_incidents",
    });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.getByRole("option", { name: "Map View" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Incidents" })).toBeInTheDocument();
  });

  it("does not offer Map View without either map permission", () => {
    useAdminAuth.mockReturnValue({ hasPermission: () => false });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.queryByRole("option", { name: "Map View" })).not.toBeInTheDocument();
  });
});
