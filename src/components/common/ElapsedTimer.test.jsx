import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ElapsedTimer } from "./ElapsedTimer";

describe("ElapsedTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts up from the given timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

    render(<ElapsedTimer since={Date.now() - 272000} />);

    expect(screen.getByText("04:32")).toBeInTheDocument();
  });

  it("counts from a zero elapsed time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

    render(<ElapsedTimer since={Date.now()} />);

    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("renders nothing without a usable timestamp", () => {
    const { container } = render(<ElapsedTimer since={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
