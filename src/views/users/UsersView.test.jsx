import { render, screen } from "@testing-library/react";
import UsersView from "@/views/users/UsersView";

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled, className }) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

describe("UsersView", () => {
  const baseProps = {
    canManageUsers: true,
    searchQuery: "",
    statusFilter: "all",
    users: [
      { id: 1, full_name: "Active User", email: "active@example.com", role: "personnel", status: "active" },
      { id: 2, full_name: "Deactivated User", email: "deac@example.com", role: "personnel", status: "deactivated" },
    ],
    usersLoading: false,
    usersError: null,
    sendingAdminRequestId: null,
    statusUpdatingUserId: null,
    editingUserId: null,
    isEditDialogOpen: false,
    editForm: { id: null, full_name: "", email: "" },
    actions: {
      setSearchQuery: vi.fn(),
      setStatusFilter: vi.fn(),
      onSendAdminRequest: vi.fn(),
      onEditUser: vi.fn(),
      onDeactivateUser: vi.fn(),
      onReactivateUser: vi.fn(),
      onEditDialogOpenChange: vi.fn(),
      onEditFormChange: vi.fn(),
      onCancelEditUser: vi.fn(),
      onSaveEditedUser: vi.fn(),
    },
  };

  it("renders status filter and status column", () => {
    render(<UsersView {...baseProps} />);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("deactivated")).toBeInTheDocument();
  });

  it("shows Deactivate action for active users", () => {
    render(<UsersView {...baseProps} />);
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
    expect(screen.getByText("Send Admin Request")).toBeInTheDocument();
  });

  it("shows Reactivate action and hides admin request for deactivated users", () => {
    render(<UsersView {...baseProps} />);
    expect(screen.getByText("Reactivate")).toBeInTheDocument();
    const deactivatedRow = screen.getByText("Deactivated User").closest("tr");
    expect(deactivatedRow).toBeInTheDocument();
    expect(deactivatedRow).not.toHaveTextContent("Send Admin Request");
  });
});
