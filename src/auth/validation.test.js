import {
  authValidationConfig,
  normalizeEmail,
  normalizeName,
  passwordClassCount,
  validateLogin,
  validateSignup,
} from "@/auth/validation";

describe("auth validation", () => {
  it("normalizes email and name", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
    expect(normalizeName("  Juan    Dela   Cruz  ")).toBe("Juan Dela Cruz");
  });

  it("counts password classes", () => {
    expect(passwordClassCount("abcdefghij")).toBe(1);
    expect(passwordClassCount("Abcdefghij")).toBe(2);
    expect(passwordClassCount("Abcdefg123")).toBe(3);
    expect(passwordClassCount("Abcdefg1!@")).toBe(4);
  });

  it("validates login fields", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Email is required.",
      password: "Password is required.",
    });

    expect(validateLogin({ email: "bad-email", password: "secret" })).toEqual({
      email: "Please enter a valid email address.",
    });

    expect(validateLogin({ email: "valid@example.com", password: "secret" })).toEqual({});
  });

  it("validates signup full_name and email", () => {
    expect(
      validateSignup({
        full_name: "J",
        email: "bad-email",
        password: "Password1!",
      })
    ).toEqual({
      full_name: "Full name must be between 2 and 100 characters.",
      email: "Please enter a valid email address.",
    });

    expect(
      validateSignup({
        full_name: "Juan123",
        email: "user@example.com",
        password: "Password1!",
      })
    ).toEqual({
      full_name: "Full name can only contain letters, spaces, apostrophes, periods, and hyphens.",
    });
  });

  it("enforces signup password policy", () => {
    expect(
      validateSignup({
        full_name: "Juan Dela Cruz",
        email: "user@example.com",
        password: "Abc1!",
      })
    ).toEqual({
      password: `Password must be at least ${authValidationConfig.minPasswordLength} characters.`,
    });

    expect(
      validateSignup({
        full_name: "Juan Dela Cruz",
        email: "user@example.com",
        password: "abcdefghij",
      })
    ).toEqual({
      password: "Password must include at least 3 of: uppercase, lowercase, number, special character.",
    });

    expect(
      validateSignup({
        full_name: "Juan Dela Cruz",
        email: "user@example.com",
        password: "Passcode12!",
      })
    ).toEqual({});
  });
});
