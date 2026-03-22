import { render, screen } from "@testing-library/react";
import UsersView from "@/views/users/UsersView";

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
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
    canCreateUsers: true,
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
    creatingUser: false,
    editingUserId: null,
    isCreateDialogOpen: false,
    isEditDialogOpen: false,
    createForm: { full_name: "", email: "", password: "", role: "personnel" },
    editForm: { id: null, full_name: "", email: "" },
    actions: {
      setSearchQuery: vi.fn(),
      setStatusFilter: vi.fn(),
      onSendAdminRequest: vi.fn(),
      onOpenCreateUser: vi.fn(),
      onCreateDialogOpenChange: vi.fn(),
      onCreateFormChange: vi.fn(),
      onCancelCreateUser: vi.fn(),
      onCreateUser: vi.fn(),
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

  it("renders add user button for managers", () => {
    render(<UsersView {...baseProps} />);
    expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument();
  });

  it("hides add user button without create permission", () => {
    render(<UsersView {...baseProps} canCreateUsers={false} />);
    expect(screen.queryByRole("button", { name: /add user/i })).not.toBeInTheDocument();
  });

  it("renders create user dialog fields when open", () => {
    render(
      <UsersView
        {...baseProps}
        isCreateDialogOpen
        createForm={{ full_name: "", email: "", password: "", role: "personnel" }}
      />
    );

    expect(screen.getAllByText("Create User")).toHaveLength(2);
    expect(screen.getByPlaceholderText("Enter full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByText("Personnel")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
