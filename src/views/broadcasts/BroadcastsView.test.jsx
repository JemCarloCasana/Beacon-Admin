import { render, screen } from "@testing-library/react";
import BroadcastsView from "@/views/broadcasts/BroadcastsView";

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

describe("BroadcastsView", () => {
  const baseProps = {
    canManageBroadcasts: true,
    canDeleteBroadcasts: true,
    editingBroadcast: null,
    editForm: { title: "", body: "", severity: "announcement" },
    pendingDeleteBroadcast: null,
    mutationError: "",
    updating: false,
    deleting: false,
    busy: false,
    form: {
      title: "",
      body: "",
      severity: "announcement",
      audience_type: "all",
      audience_role: "",
    },
    drafts: [],
    sent: [],
    pendingSendBroadcast: null,
    lastSendResult: null,
    loading: false,
    error: null,
    creating: false,
    sending: false,
    actions: {
      onFormChange: vi.fn(),
      onCreateDraft: vi.fn(),
      onOpenEditDialog: vi.fn(),
      onCloseEditDialog: vi.fn(),
      onEditFormChange: vi.fn(),
      onSaveDraft: vi.fn(),
      onOpenDeleteDialog: vi.fn(),
      onCloseDeleteDialog: vi.fn(),
      onConfirmDelete: vi.fn(),
      onOpenSendDialog: vi.fn(),
      onCloseSendDialog: vi.fn(),
      onConfirmSend: vi.fn(),
      onRefresh: vi.fn(),
    },
  };

  it("shows audience roles from audience_roles values", () => {
    render(
      <BroadcastsView
        {...baseProps}
        drafts={[
          {
            id: 1,
            title: "Role-targeted",
            body: "Body",
            severity: "warning",
            audience_type: "role",
            audience_roles: ["citizen", "student"],
            created_at: "2026-03-11T00:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByText("Roles: Citizen, Student")).toBeInTheDocument();
  });

  it("uses selected roles fallback when legacy record has no audience_roles", () => {
    render(
      <BroadcastsView
        {...baseProps}
        drafts={[
          {
            id: 2,
            title: "Legacy role ids",
            body: "Body",
            severity: "announcement",
            audience_type: "role",
            audience_role_ids: [1, 2],
            created_at: "2026-03-11T00:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByText("Selected roles")).toBeInTheDocument();
    expect(screen.queryByText(/Role IDs:/i)).not.toBeInTheDocument();
  });

  it("renders new broadcast severity labels", () => {
    render(
      <BroadcastsView
        {...baseProps}
        drafts={[
          {
            id: 3,
            title: "Emergency broadcast",
            body: "Body",
            severity: "danger",
            audience_type: "all",
            created_at: "2026-03-11T00:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByText("danger")).toBeInTheDocument();
  });

  it("shows edit for drafts but no edit/delete controls for sent records", () => {
    render(
      <BroadcastsView
        {...baseProps}
        drafts={[
          {
            id: 4,
            title: "Draft one",
            body: "Body",
            severity: "warning",
            audience_type: "all",
            created_at: "2026-03-11T00:00:00.000Z",
          },
        ]}
        sent={[
          {
            id: 5,
            title: "Sent one",
            body: "Body",
            severity: "announcement",
            audience_type: "all",
            sent_at: "2026-03-12T00:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getAllByText("Sent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sent one")).toBeInTheDocument();
    expect(screen.queryByText("Delivered")).not.toBeInTheDocument();
  });

  it("hides delete when the role cannot delete broadcasts", () => {
    render(
      <BroadcastsView
        {...baseProps}
        canDeleteBroadcasts={false}
        drafts={[
          {
            id: 6,
            title: "Draft two",
            body: "Body",
            severity: "warning",
            audience_type: "all",
            created_at: "2026-03-11T00:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("warns when push delivery is unconfirmed but keeps the sent result", () => {
    render(
      <BroadcastsView
        {...baseProps}
        lastSendResult={{
          ok: true,
          broadcast_id: 7,
          delivered_count: 10,
          push: { error: "partial", successCount: 8, failureCount: 2, unknownCount: 2 },
        }}
      />
    );

    expect(screen.getByText(/could not be confirmed/i)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
