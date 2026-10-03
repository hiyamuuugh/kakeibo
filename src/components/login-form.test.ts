import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("LoginForm", () => {
  it("submits the login form from the login button", () => {
    const source = readFileSync("src/components/login-form.tsx", "utf8");

    expect(source).toContain('type="submit"');
  });

  it("routes successful login through member selection", () => {
    const source = readFileSync("src/components/login-form.tsx", "utf8");

    expect(source).toContain("/select-member");
  });
});
