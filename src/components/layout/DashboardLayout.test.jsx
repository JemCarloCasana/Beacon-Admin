import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => <nav aria-label="Main">sidebar</nav>,
}));

vi.mock("@/components/layout/Header", () => ({
  Header: ({ onMenuClick, title }) => (
    <header>
      <button type="button" onClick={onMenuClick}>
        Open menu
      </button>
      <span>{title}</span>
    </header>
  ),
}));

describe("DashboardLayout", () => {
  it("renders the page title as a heading", () => {
    render(
      <DashboardLayout title="Reports" subtitle="Generate and export operational reports">
        <div>content</div>
      </DashboardLayout>
    );

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("Generate and export operational reports")).toBeInTheDocument();
  });

  it("renders no page header when a page has no title", () => {
    render(
      <DashboardLayout>
        <div>content</div>
      </DashboardLayout>
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("opens the mobile navigation", () => {
    render(
      <DashboardLayout title="Overview">
        <div>content</div>
      </DashboardLayout>
    );

    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu).toBeInTheDocument();
  });
});
