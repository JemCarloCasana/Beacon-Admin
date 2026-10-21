import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SidebarView from "@/views/layout/SidebarView";

const visibleNavItems = [
  {
    category: "COMMAND",
    items: [
      { path: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
      { path: "/incidents", label: "Incidents", icon: "AlertTriangle" },
      { path: "/personnel", label: "Manage Users", icon: "Users" },
    ],
  },
];

function renderSidebar(pathname) {
  return render(
    <MemoryRouter>
      <SidebarView pathname={pathname} visibleNavItems={visibleNavItems} profile={{ fullName: "Admin", role: "admin" }} />
    </MemoryRouter>
  );
}

describe("SidebarView", () => {
  it("highlights the section while you are inside it", () => {
    renderSidebar("/incidents/123");

    expect(screen.getByRole("link", { name: /incidents/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /overview/i })).not.toHaveAttribute("aria-current");
  });

  it("highlights the exact page when you are on it", () => {
    renderSidebar("/incidents");

    expect(screen.getByRole("link", { name: /incidents/i })).toHaveAttribute("aria-current", "page");
  });

  it("shows the operator identity", () => {
    renderSidebar("/dashboard");

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });
});
