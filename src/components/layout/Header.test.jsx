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
  Dialog: ({ children }) => <div>{children}</div>,
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
          message: "Please review",
          metadata: { admin_request_id: 55 },
          reference_id: 55,
          is_read: true,
          created_at: "2026-03-07T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<Header />);
    fireEvent.click(screen.getByText("Admin Access Request"));

    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(mockMarkRead).not.toHaveBeenCalled();
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
});
