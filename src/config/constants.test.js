import { describe, it, expect } from "vitest";
import {
  sosStatusLabel,
  roleLabel,
  accountStatusLabel,
  rangeLabel,
  TIMEZONE_LABEL,
} from "@/config/constants";

describe("sosStatusLabel", () => {
  it("names every SOS status an operator can see", () => {
    expect(sosStatusLabel("active")).toBe("Active");
    expect(sosStatusLabel("acknowledged")).toBe("Acknowledged");
    expect(sosStatusLabel("responding")).toBe("Responding");
    expect(sosStatusLabel("dispatched")).toBe("Dispatched");
    expect(sosStatusLabel("cancelled")).toBe("Cancelled");
    expect(sosStatusLabel("resolved")).toBe("Resolved");
  });

  it("falls back to Unknown for a status it does not know", () => {
    expect(sosStatusLabel("something_new")).toBe("Unknown");
    expect(sosStatusLabel(undefined)).toBe("Unknown");
  });
});

describe("roleLabel", () => {
  it("names the account roles", () => {
    expect(roleLabel("admin")).toBe("Administrator");
    expect(roleLabel("personnel")).toBe("Personnel");
  });

  it("falls back to Personnel", () => {
    expect(roleLabel(undefined)).toBe("Personnel");
  });
});

describe("accountStatusLabel", () => {
  it("names the account states", () => {
    expect(accountStatusLabel("active")).toBe("Active");
    expect(accountStatusLabel("deactivated")).toBe("Deactivated");
  });

  it("falls back to Active", () => {
    expect(accountStatusLabel(undefined)).toBe("Active");
  });
});

describe("rangeLabel", () => {
  it("names the report ranges in words", () => {
    expect(rangeLabel("24h")).toBe("Last 24 hours");
    expect(rangeLabel("7d")).toBe("Last 7 days");
    expect(rangeLabel("30d")).toBe("Last 30 days");
  });
});

describe("TIMEZONE_LABEL", () => {
  it("names the timezone instead of printing its identifier", () => {
    expect(TIMEZONE_LABEL).toBe("Philippine Standard Time");
  });
});
