import { detectPriority } from "@/lib/priorityDetector";

describe("priorityDetector", () => {
  it("returns null for empty input", () => {
    expect(detectPriority("")).toBeNull();
    expect(detectPriority(null)).toBeNull();
    expect(detectPriority(undefined)).toBeNull();
  });

  it("matches keywords case-insensitively", () => {
    const result = detectPriority("Large FIRE spotted near market");
    expect(result).toEqual({
      priority: "critical",
      keyword: "fire",
    });
  });

  it("returns the highest severity when multiple severities match", () => {
    const result = detectPriority("Suspicious person seen during a fire incident");
    expect(result?.priority).toBe("critical");
  });

  it("maps accident-related text to high", () => {
    const result = detectPriority("Two-car accident with injuries");
    expect(result?.priority).toBe("high");
  });

  it("maps suspicious, harassment, and theft terms to medium", () => {
    expect(detectPriority("Suspicious activity near school")?.priority).toBe("medium");
    expect(detectPriority("Harassment complaint at terminal")?.priority).toBe("medium");
    expect(detectPriority("Theft reported at convenience store")?.priority).toBe("medium");
  });

  it("detects fire in Filipino and repeated-letter text variants", () => {
    expect(detectPriority("May sunog sa palengke")?.priority).toBe("critical");
    expect(detectPriority("hala sonoooog")?.priority).toBe("critical");
  });

  it("returns null when no known keyword exists", () => {
    expect(detectPriority("Routine patrol update")).toBeNull();
  });
});
