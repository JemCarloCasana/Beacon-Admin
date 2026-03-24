import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Header } from "@/components/layout/Header";
import { useNotifications, useMarkNotificationRead } from "@/api/useNotifications";
import { useAcceptAdminRequest, useRejectAdminRequest } from "@/api/useAdminRequests";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const mockNavigate = vi.fn();
const mockMarkRead = vi.fn();
const mockAccept = vi.fn();
const mockReject = vi.fn();
const mockToast = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/api/useNotifications", () => ({
  useNotifications: vi.fn(),
  useMarkNotificationRead: vi.fn(),
}));

vi.mock("@/api/useAdminRequests", () => ({
  DEFAULT_PROMOTED_ADMIN_PERMISSIONS: ["manage_admins", "manage_users"],
  useAcceptAdminRequest: vi.fn(),
  useRejectAdminRequest: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick, className }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));

function renderWithQueryClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Header notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({
      me: { id: 1, full_name: "Admin" },
      loading: false,
      logout: vi.fn().mockResolvedValue(undefined),
      refreshMe: vi.fn().mockResolvedValue(undefined),
    });
    useToast.mockReturnValue({ toast: mockToast });

    useMarkNotificationRead.mockReturnValue({
      mutateAsync: mockMarkRead.mockResolvedValue({}),
    });
    useAcceptAdminRequest.mockReturnValue({
      mutateAsync: mockAccept.mockResolvedValue({}),
    });
    useRejectAdminRequest.mockReturnValue({
      mutateAsync: mockReject.mockResolvedValue({}),
    });
  });

  it("opens decision modal only for actionable admin_request notification", async () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 1,
          type: "admin_request",
          title: "Admin Access Request",
          metadata: { admin_request_id: 55 },
          reference_id: 55,
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getAllByText("Admin Access Request").at(-1));

    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(
      screen.getByText("An admin access request is awaiting your review. Accept or reject it below.")
    ).toBeInTheDocument();
    expect(screen.getByText("Request type: Admin access request")).toBeInTheDocument();
    expect(screen.queryByText("Type: admin_request")).not.toBeInTheDocument();
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("renders backend-provided admin_request message when available", () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 10,
          type: "admin_request",
          title: "Admin Access Request",
          message: "Please review this elevated access request.",
          metadata: { admin_request_id: 58 },
          reference_id: 58,
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);

    expect(screen.getAllByText("Please review this elevated access request.").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("An admin access request is awaiting your review. Accept or reject it below.")
    ).not.toBeInTheDocument();
  });

  it("keeps accepted admin_request modal closed after notifications refresh", async () => {
    const notifications = [
      {
        id: 8,
        type: "admin_request",
        title: "Admin Access Request",
        message: "Please review",
        metadata: { admin_request_id: 56 },
        reference_id: 56,
        is_read: false,
        created_at: "2026-03-07T00:00:00.000Z",
      },
    ];

    useNotifications.mockImplementation(() => ({
      data: notifications,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }));

    const view = renderWithQueryClient(<Header />);

    expect(screen.getByText("Accept")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Accept"));

    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith({
        requestId: 56,
        role: "admin",
        permissions: ["manage_admins", "manage_users"],
      });
      expect(mockMarkRead).toHaveBeenCalledWith(8);
    });

    expect(screen.queryByText("Accept")).not.toBeInTheDocument();

    view.rerender(
      <QueryClientProvider
        client={new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })}
      >
        <Header />
      </QueryClientProvider>
    );

    expect(screen.queryByText("Accept")).not.toBeInTheDocument();
  });

  it("keeps rejected admin_request modal closed after notifications refresh", async () => {
    const notifications = [
      {
        id: 9,
        type: "admin_request",
        title: "Admin Access Request",
        message: "Please review",
        metadata: { admin_request_id: 57 },
        reference_id: 57,
        is_read: false,
        created_at: "2026-03-07T00:00:00.000Z",
      },
    ];

    useNotifications.mockImplementation(() => ({
      data: notifications,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }));

    const view = renderWithQueryClient(<Header />);

    expect(screen.getByText("Reject")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Reject"));

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith({ requestId: 57 });
      expect(mockMarkRead).toHaveBeenCalledWith(9);
    });

    expect(screen.queryByText("Reject")).not.toBeInTheDocument();

    view.rerender(
      <QueryClientProvider
        client={new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })}
      >
        <Header />
      </QueryClientProvider>
    );

    expect(screen.queryByText("Reject")).not.toBeInTheDocument();
  });

  it("treats non-actionable admin_request notification as general and marks read", async () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 2,
          type: "admin_request",
          title: "Old Notification",
          message: "Missing request id",
          metadata: { admin_request_id: "not-a-number" },
          reference_id: null,
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("Old Notification"));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(2);
    });
    expect(screen.queryByText("Accept")).not.toBeInTheDocument();
  });

  it("routes SOS notification to /sos/:id using sos_id priority and marks read", async () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 3,
          type: "sos",
          title: "New SOS Alert",
          message: "SOS created",
          metadata: { reference_id: 901, sos_id: 900 },
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("New SOS Alert"));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(3);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/sos/900");
  });

  it("routes incident notification to /incidents/:id and marks read", async () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 4,
          type: "incident",
          title: "New Incident Report",
          message: "Incident created",
          metadata: { incident_id: 777 },
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("New Incident Report"));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(4);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/incidents/777");
  });

  it("uses valid fallback_route first for incident notifications", async () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 5,
          type: "incident",
          title: "Incident via fallback route",
          message: "Open details",
          metadata: {
            incident_id: 222,
            reference_id: 222,
            fallback_route: "/admin/incidents/222",
          },
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("Incident via fallback route"));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(5);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/incidents/222");
  });

  it("falls back to /incidents when incident id and fallback route are missing", async () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 6,
          type: "incident",
          title: "Incident missing target",
          message: "No routeable id",
          metadata: {
            incident_id: "not-a-number",
            reference_id: null,
            fallback_route: "/admin/unknown/123",
          },
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("Incident missing target"));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(6);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/incidents");
  });

  it("shows unread badge after notifications refresh without opening bell", async () => {
    let notificationState = [];
    useNotifications.mockImplementation(() => ({
      data: notificationState,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }));

    const view = renderWithQueryClient(<Header />);
    expect(view.container.querySelector("span.bg-red-500")).toBeNull();

    notificationState = [
      {
        id: 7,
        type: "incident",
        title: "Unread Incident",
        message: "New incident",
        metadata: { incident_id: 701 },
        is_read: false,
        created_at: "2026-03-07T00:00:00.000Z",
      },
    ];

    view.rerender(
      <QueryClientProvider
        client={new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })}
      >
        <Header />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(view.container.querySelector("span.bg-red-500")).not.toBeNull();
    });
  });

  it("renders all notifications inside a scrollable container", () => {
    const notifications = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      type: "incident",
      title: `Notification ${index + 1}`,
      message: `Message ${index + 1}`,
      metadata: { incident_id: index + 100 },
      is_read: index % 2 === 0,
      created_at: "2026-03-07T00:00:00.000Z",
    }));

    useNotifications.mockReturnValue({
      data: notifications,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    const view = renderWithQueryClient(<Header />);

    expect(screen.getByText("Notification 1")).toBeInTheDocument();
    expect(screen.getByText("Notification 5")).toBeInTheDocument();
    expect(screen.queryByText("Notification 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Notification 12")).not.toBeInTheDocument();
    expect(screen.getByText("Show all")).toBeInTheDocument();
    expect(view.container.querySelector(".max-h-96.overflow-y-auto")).not.toBeNull();
  });

  it("expands from 5 newest notifications to the full list", () => {
    const notifications = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      type: "incident",
      title: `Notification ${index + 1}`,
      message: `Message ${index + 1}`,
      metadata: { incident_id: index + 100 },
      is_read: index >= 5,
      created_at: "2026-03-07T00:00:00.000Z",
    }));

    useNotifications.mockReturnValue({
      data: notifications,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);

    expect(screen.getByText("Notification 5")).toBeInTheDocument();
    expect(screen.queryByText("Notification 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Show all"));

    expect(screen.getByText("Notification 8")).toBeInTheDocument();
    expect(screen.getByText("Show less")).toBeInTheDocument();
  });

  it("marks all unread notifications as read without touching read items", async () => {
    useNotifications.mockReturnValue({
      data: [
        {
          id: 1,
          type: "incident",
          title: "Unread 1",
          message: "Message 1",
          metadata: { incident_id: 1 },
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
        {
          id: 2,
          type: "incident",
          title: "Read 2",
          message: "Message 2",
          metadata: { incident_id: 2 },
          is_read: true,
          created_at: "2026-03-07T00:00:00.000Z",
        },
        {
          id: 3,
          type: "incident",
          title: "Unread 3",
          message: "Message 3",
          metadata: { incident_id: 3 },
          is_read: false,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("Mark all as read"));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(1);
      expect(mockMarkRead).toHaveBeenCalledWith(3);
    });
    expect(mockMarkRead).not.toHaveBeenCalledWith(2);
  });

  it("keeps notifications visible after mark all as read", async () => {
    const notifications = [
      {
        id: 1,
        type: "incident",
        title: "Unread 1",
        message: "Message 1",
        metadata: { incident_id: 1 },
        is_read: false,
        created_at: "2026-03-07T00:00:00.000Z",
      },
      {
        id: 2,
        type: "incident",
        title: "Read 2",
        message: "Message 2",
        metadata: { incident_id: 2 },
        is_read: true,
        created_at: "2026-03-07T00:00:00.000Z",
      },
    ];

    useNotifications.mockImplementation(() => ({
      data: notifications,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }));

    const view = renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("Mark all as read"));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(1);
    });

    notifications[0] = { ...notifications[0], is_read: true };

    view.rerender(
      <QueryClientProvider
        client={new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })}
      >
        <Header />
      </QueryClientProvider>
    );

    expect(screen.getByText("Unread 1")).toBeInTheDocument();
    expect(screen.getByText("Read 2")).toBeInTheDocument();
    expect(screen.queryByText("Show all")).not.toBeInTheDocument();
    expect(screen.getByText("Show less")).toBeInTheDocument();
  });

  it("show less returns to the 5 newest notifications", () => {
    const notifications = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      type: "incident",
      title: `Notification ${index + 1}`,
      message: `Message ${index + 1}`,
      metadata: { incident_id: index + 1 },
      is_read: true,
      created_at: "2026-03-07T00:00:00.000Z",
    }));

    useNotifications.mockReturnValue({
      data: notifications,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);

    fireEvent.click(screen.getByText("Show all"));
    expect(screen.getByText("Notification 7")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show less"));

    expect(screen.getByText("Notification 5")).toBeInTheDocument();
    expect(screen.queryByText("Notification 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Notification 7")).not.toBeInTheDocument();
  });
});
