import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/auth/ProtectedRoute";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

vi.mock("@/auth/AdminAuthProvider", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual };
});

function renderRoute(requiredPermissions) {
  return render(
    <MemoryRouter initialEntries={["/map"]}>
      <Routes>
        <Route
          path="/map"
          element={
            <ProtectedRoute requiredPermissions={requiredPermissions}>
              <div>map content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a route when the operator holds any one of the required permissions", () => {
    useAdminAuth.mockReturnValue({
      me: { id: 1, full_name: "Admin" },
      loading: false,
      hasPermission: (permission) => permission === "manage_sos",
    });

    renderRoute(["manage_sos", "view_incidents"]);

    expect(screen.getByText("map content")).toBeInTheDocument();
  });

  it("denies a route when the operator holds none of the required permissions", () => {
    useAdminAuth.mockReturnValue({
      me: { id: 1, full_name: "Admin" },
      loading: false,
      hasPermission: () => false,
    });

    renderRoute(["manage_sos", "view_incidents"]);

    expect(screen.queryByText("map content")).not.toBeInTheDocument();
    expect(screen.getByText(/do not have access to this page/i)).toBeInTheDocument();
  });

  it("says which permission is missing instead of silently redirecting", () => {
    useAdminAuth.mockReturnValue({
      me: { id: 1, full_name: "Admin", role: "admin" },
      loading: false,
      hasPermission: () => false,
    });

    renderRoute(["manage_sos", "view_incidents"]);

    expect(screen.getByText(/do not have access to this page/i)).toBeInTheDocument();
    expect(screen.getByText("manage_sos")).toBeInTheDocument();
    expect(screen.getByText("view_incidents")).toBeInTheDocument();
    expect(screen.getByText(/ask an administrator with manage_admins/i)).toBeInTheDocument();
  });
});
