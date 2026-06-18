import { describe, it, expect } from "vitest";

import { loginSchema } from "@/app/(auth)/login/schema/login.schema";

describe("loginSchema", () => {
  it("should succeed with valid email and password >= 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("should fail with invalid email format and return appropriate message", () => {
    const result = loginSchema.safeParse({
      email: "invalid-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailErrors = result.error.flatten().fieldErrors.email;
      expect(emailErrors).toContain("Valid email required");
    }
  });

  it("should fail with password under 8 characters and return appropriate message", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordErrors = result.error.flatten().fieldErrors.password;
      expect(passwordErrors).toContain("Password must be at least 8 characters");
    }
  });

  it("should fail with empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailErrors = result.error.flatten().fieldErrors.email;
      expect(emailErrors).toBeDefined();
      expect(emailErrors?.length).toBeGreaterThan(0);
    }
  });

  it("should fail with empty password and return 'Password required'", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordErrors = result.error.flatten().fieldErrors.password;
      expect(passwordErrors).toContain("Password required");
    }
  });

  it("should succeed when rememberMe is provided as true, false, or omitted", () => {
    const withTrue = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      rememberMe: true,
    });
    expect(withTrue.success).toBe(true);

    const withFalse = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      rememberMe: false,
    });
    expect(withFalse.success).toBe(true);

    const withoutRememberMe = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(withoutRememberMe.success).toBe(true);
  });
});
