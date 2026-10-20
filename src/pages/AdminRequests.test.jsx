import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminRequests from "@/pages/AdminRequests";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { useAdminRequests, useAcceptAdminRequest, useRejectAdminRequest } from "@/api/useAdminRequests";

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }) => <h2>{children}</h2>,
  AlertDialogAction: ({ children, onClick }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }) => <button type="button">{children}</button>,
}));

vi.mock("@/auth/AdminAuthProvider", () => ({ useAdminAuth: vi.fn() }));
vi.mock("@/api/useAdminRequests", () => ({
  useAdminRequests: vi.fn(),
  useAcceptAdminRequest: vi.fn(),
  useRejectAdminRequest: vi.fn(),
  DEFAULT_PROMOTED_ADMIN_PERMISSIONS: ["view_incidents"],
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("AdminRequests", () => {
  const requests = [
    {
      id: 1,
      status: "pending",
      personnel_id: 7,
      personnel_name: "Ana Requester",
      personnel_email: "ana@example.com",
      requested_by_admin_id: 3,
      note: "Needs incident access",
    },
    {
      id: 2,
      status: "pending",
      personnel_id: 7,
      personnel_name: "Ben Requester",
      personnel_email: "ben@example.com",
      requested_by_admin_id: 3,
      note: "Also pending",
    },
    {
      id: 3,
      status: "approved",
      personnel_id: 7,
      personnel_name: "Cara Requester",
      personnel_email: "cara@example.com",
      requested_by_admin_id: 3,
      note: "Already decided",
    },
  ];

  let mockAccept;
  let mockReject;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccept = vi.fn().mockResolvedValue({ ok: true });
    mockReject = vi.fn().mockResolvedValue({ ok: true });

    useAdminAuth.mockReturnValue({
      me: { id: 7, full_name: "Current Admin" },
      refreshMe: vi.fn().mockResolvedValue(undefined),
    });
    useAdminRequests.mockReturnValue({ data: requests, isLoading: false, isError: false, error: null });
    useAcceptAdminRequest.mockReturnValue({ mutateAsync: mockAccept, isPending: false });
    useRejectAdminRequest.mockReturnValue({ mutateAsync: mockReject, isPending: false });
  });

  it("keeps the decision note with the request it belongs to", async () => {
    render(<AdminRequests />);

    const noteField = screen.getByLabelText("Decision note for request 1");
    fireEvent.change(noteField, { target: { value: "Granted for incident duty" } });

    // A second request's note starts empty - the first note is not reused.
    expect(screen.getByLabelText("Decision note for request 2")).toHaveValue("");
  });

  it("only offers the decision on a pending request", () => {
    render(<AdminRequests />);

    // Two pending requests, one already decided.
    expect(screen.getAllByRole("button", { name: /^Accept$/ })).toHaveLength(2);
  });

  it("shows requests about me and requests I sent separately", () => {
    render(<AdminRequests />);

    expect(screen.getByText(/Requests about me \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Requests I sent \(0\)/)).toBeInTheDocument();
  });

  it("confirms a rejection before sending it", async () => {
    render(<AdminRequests />);

    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ })[0]);
    expect(mockReject).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /reject request/i }));
    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith({ requestId: 1, note: "" });
    });
  });
});
