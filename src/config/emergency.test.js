import { describe, it, expect } from "vitest";
import {
  RESPONSE_UNITS,
  resolveEmergencyCategory,
  unitForEmergencyCategory,
  emergencyLabel,
} from "./emergency";

describe("resolveEmergencyCategory", () => {
  it("maps the four values the phone sends", () => {
    expect(resolveEmergencyCategory("medical")).toBe("medical");
    expect(resolveEmergencyCategory("fire")).toBe("fire");
    expect(resolveEmergencyCategory("violence")).toBe("violence");
    expect(resolveEmergencyCategory("i dont know")).toBe("unknown");
    expect(resolveEmergencyCategory("i don't know")).toBe("unknown");
  });

  it("returns null for a category the phone cannot send", () => {
    expect(resolveEmergencyCategory("traffic_accident")).toBeNull();
    expect(resolveEmergencyCategory("")).toBeNull();
    expect(resolveEmergencyCategory(null)).toBeNull();
  });
});

describe("unitForEmergencyCategory", () => {
  it("returns the fixed responder for the three determinate categories", () => {
    expect(unitForEmergencyCategory("medical")).toBe("Emergency Medical Unit");
    expect(unitForEmergencyCategory("fire")).toBe("Fire Station Unit");
    expect(unitForEmergencyCategory("violence")).toBe("Police Personnel");
  });

  it("returns null for unknown because the operator must assign it", () => {
    expect(unitForEmergencyCategory("unknown")).toBeNull();
  });
});

describe("RESPONSE_UNITS", () => {
  it("is exactly the four units the acknowledge endpoint accepts", () => {
    expect(RESPONSE_UNITS).toEqual([
      "Emergency Medical Unit",
      "Fire Station Unit",
      "Police Personnel",
      "Traffic Enforcement Unit",
    ]);
  });
});

describe("emergencyLabel", () => {
  it("names the emergency the person reported", () => {
    expect(emergencyLabel("medical")).toBe("Medical Emergency");
    expect(emergencyLabel("fire")).toBe("Fire");
    expect(emergencyLabel("violence")).toBe("Violence");
  });

  it("states plainly when the emergency was not reported", () => {
    expect(emergencyLabel("unknown")).toBe("Emergency type not reported");
  });

  it("falls back to a neutral label for an unrecognised category", () => {
    expect(emergencyLabel(null)).toBe("Unknown");
    expect(emergencyLabel("traffic_accident")).toBe("Unknown");
  });
});
