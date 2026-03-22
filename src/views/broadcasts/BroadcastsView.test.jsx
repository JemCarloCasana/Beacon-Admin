import { render, screen } from "@testing-library/react";
import BroadcastsView from "@/views/broadcasts/BroadcastsView";

vi.mock("@/components/layout", () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}));

describe("BroadcastsView", () => {
  const baseProps = {
    canManageBroadcasts: true,
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
});
