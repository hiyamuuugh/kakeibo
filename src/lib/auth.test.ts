import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  isAuthConfigured,
  isValidPassword,
  verifySessionToken,
} from "@/lib/auth";

describe("auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports configured only when both auth env vars exist", () => {
    vi.stubEnv("APP_PASSWORD", "family-pass");
    expect(isAuthConfigured()).toBe(false);

    vi.stubEnv("APP_SESSION_SECRET", "secret");
    expect(isAuthConfigured()).toBe(true);
  });

  it("validates password against configured secret", async () => {
    vi.stubEnv("APP_PASSWORD", "family-pass");

    await expect(isValidPassword("family-pass")).resolves.toBe(true);
    await expect(isValidPassword("wrong-pass")).resolves.toBe(false);
  });

  it("creates and verifies a signed session token", async () => {
    vi.stubEnv("APP_SESSION_SECRET", "secret");

    const token = await createSessionToken(1000);

    await expect(verifySessionToken(token, 1001)).resolves.toBe(true);
    await expect(
      verifySessionToken(token, 1000 + 1000 * 60 * 60 * 24 * 30 + 1)
    ).resolves.toBe(false);
  });

  it("rejects tampered tokens", async () => {
    vi.stubEnv("APP_SESSION_SECRET", "secret");

    const token = await createSessionToken(1000);
    const [expiresAt] = token.split(".");

    await expect(verifySessionToken(`${expiresAt}.tampered`, 1001)).resolves.toBe(
      false
    );
  });
});
