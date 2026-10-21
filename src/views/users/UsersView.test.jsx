import { fireEvent, render, screen, within } from "@testing-library/react";
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

describe("UsersView", () => {
  const baseProps = {
    canManageUsers: true,
    canCreateUsers: true,
    canManageAdmins: true,
    me: { id: 99, full_name: "Root Admin", email: "root@example.com", role: "admin" },
    searchQuery: "",
    statusFilter: "all",
    users: [
      {
        id: 1,
        full_name: "Active User",
        email: "active@example.com",
        role: "personnel",
        status: "active",
        permissions: ["manage_sos", "view_incidents"],
      },
      {
        id: 2,
        full_name: "Deactivated User",
        email: "deac@example.com",
        role: "personnel",
        status: "deactivated",
        permissions: [],
      },
    ],
    usersLoading: false,
    usersError: null,
    sendingAdminRequestId: null,
    statusUpdatingUserId: null,
    creatingUser: false,
    editingUserId: null,
    isCreateDialogOpen: false,
    isEditDialogOpen: false,
    createForm: {
      full_name: "",
      email: "",
      password: "",
      role: "personnel",
      permissions: ["manage_sos", "view_incidents"],
    },
    editForm: { id: null, full_name: "", email: "", permissions: [] },
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

  it("labels the search field", () => {
    render(<UsersView {...baseProps} />);

    expect(screen.getByLabelText(/search users by email or name/i)).toBeInTheDocument();
  });

  it("names the row action menu after the user it belongs to", () => {
    render(<UsersView {...baseProps} />);

    expect(screen.getByRole("button", { name: /actions for active user/i })).toBeInTheDocument();
  });

  it("confirms a deactivation in the app's own dialog", () => {
    const actions = { ...baseProps.actions, onDeactivateUser: vi.fn() };
    render(<UsersView {...baseProps} actions={actions} />);

    // Nothing happens until the operator confirms.
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(actions.onDeactivateUser).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate account" }));
    expect(actions.onDeactivateUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 })
    );
  });

  it("renders a caption and scoped headers for the roster", () => {
    render(<UsersView {...baseProps} />);

    expect(screen.getByText(/one row per account/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toHaveAttribute("scope", "col");
  });

  it("shows the filtered count against the loaded count", () => {
    render(<UsersView {...baseProps} users={baseProps.users.slice(0, 1)} usersTotal={2} />);

    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
  });

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
        createForm={{ full_name: "", email: "", password: "", role: "personnel", permissions: [] }}
      />
    );

    expect(screen.getAllByText("Create User")).toHaveLength(2);
    expect(screen.getByPlaceholderText("Enter full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByText("Personnel")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows the permissions each account holds", () => {
    render(<UsersView {...baseProps} />);

    const row = screen.getByText("Active User").closest("tr");
    expect(within(row).getByText("manage_sos")).toBeInTheDocument();
    expect(within(row).getByText("view_incidents")).toBeInTheDocument();
  });

  it("says an account holds no permissions", () => {
    render(<UsersView {...baseProps} />);

    const row = screen.getByText("Deactivated User").closest("tr");
    expect(within(row).getByText("No access")).toBeInTheDocument();
  });

  it("says the server did not report the permissions", () => {
    render(
      <UsersView
        {...baseProps}
        users={[
          {
            id: 3,
            full_name: "Unreported User",
            email: "unreported@example.com",
            role: "personnel",
            status: "active",
            permissions: null,
          },
        ]}
      />
    );

    const row = screen.getByText("Unreported User").closest("tr");
    expect(within(row).getByText("Not reported")).toBeInTheDocument();
    expect(within(row).queryByText("No access")).not.toBeInTheDocument();
  });

  it("offers the permission picker in the create dialog", () => {
    render(<UsersView {...baseProps} isCreateDialogOpen />);

    expect(screen.getByText("Permissions to grant")).toBeInTheDocument();
    expect(screen.getByLabelText("manage_sos")).toBeChecked();
  });

  it("offers the permission picker in the edit dialog", () => {
    render(
      <UsersView
        {...baseProps}
        isEditDialogOpen
        editForm={{ id: 1, full_name: "Active User", email: "active@example.com", permissions: ["manage_sos"] }}
      />
    );

    expect(screen.getByText("Permissions to grant")).toBeInTheDocument();
    expect(screen.getByLabelText("manage_sos")).toBeChecked();
    expect(screen.getByLabelText("view_incidents")).not.toBeChecked();
  });

  it("will not let an operator change their own permissions", () => {
    render(
      <UsersView
        {...baseProps}
        isEditDialogOpen
        me={{ id: 1, full_name: "Active User", email: "active@example.com", role: "admin" }}
        editForm={{ id: 1, full_name: "Active User", email: "active@example.com", permissions: ["manage_sos"] }}
      />
    );

    expect(screen.getByLabelText("manage_sos")).toBeDisabled();
    expect(screen.getByText(/your own permissions/i)).toBeInTheDocument();
  });

  it("will not offer the permission picker for an account whose grant the server did not report", () => {
    render(
      <UsersView
        {...baseProps}
        isEditDialogOpen
        editForm={{ id: 3, full_name: "Unreported User", email: "unreported@example.com", permissions: null }}
      />
    );

    expect(screen.queryByText("Permissions to grant")).not.toBeInTheDocument();
    expect(screen.getByText(/did not report/i)).toBeInTheDocument();
  });

  it("hides the edit action without manage_admins", () => {
    render(<UsersView {...baseProps} canManageAdmins={false} />);

    expect(screen.queryByText("Edit User")).not.toBeInTheDocument();
  });

  it("hides the admin request action without manage_admins", () => {
    render(<UsersView {...baseProps} canManageAdmins={false} />);

    expect(screen.queryByText("Send Admin Request")).not.toBeInTheDocument();
  });

  it("hides the deactivate action for an admin account", () => {
    render(
      <UsersView
        {...baseProps}
        users={[
          {
            id: 4,
            full_name: "Admin Account",
            email: "admin@example.com",
            role: "admin",
            status: "active",
            permissions: ["manage_sos"],
          },
        ]}
      />
    );

    const row = screen.getByText("Admin Account").closest("tr");
    expect(within(row).queryByText("Deactivate")).not.toBeInTheDocument();
  });
});
