import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ cashFlowPlan: { findUnique: vi.fn(), upsert: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { GET, PUT } from "./route";
import { defaultCashPlan } from "@/lib/cash-flow-plan";
const request = (body: unknown) => new Request("https://example.test/api/cash-flow/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("saved cash-flow simulation", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns empty settings for a new family without inventing an age", async () => {
    db.cashFlowPlan.findUnique.mockResolvedValue(null);
    const response = await GET();
    expect(await response.json()).toMatchObject({ plan: { startAge: null, rules: [] } });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("saves and restores a validated family plan", async () => {
    const plan = { ...defaultCashPlan(), startAge: 30, initialCash: 123456, initialOtherAssets: 654321 };
    db.cashFlowPlan.upsert.mockResolvedValue({ data: plan, updatedAt: "2026-11-13T00:00:00Z" });
    expect((await PUT(request(plan))).status).toBe(200);
    expect(db.cashFlowPlan.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { scope: "family" }, update: { data: plan } }));
    db.cashFlowPlan.findUnique.mockResolvedValue({ data: plan, updatedAt: "2026-11-13T00:00:00Z" });
    expect((await (await GET()).json()).plan).toEqual(plan);
  });
  it("shares one family plan and lets the last save replace a stale earlier plan", async () => {
    let shared = defaultCashPlan();
    db.cashFlowPlan.upsert.mockImplementation(async ({ update, where }) => {
      expect(where).toEqual({ scope: "family" });
      shared = update.data;
      return { data: shared, updatedAt: "2026-11-13T00:00:00Z" };
    });
    db.cashFlowPlan.findUnique.mockImplementation(async ({ where }) => {
      expect(where).toEqual({ scope: "family" });
      return { data: shared, updatedAt: "2026-11-13T00:00:00Z" };
    });
    const first = { ...defaultCashPlan(), initialCash: 100 };
    const second = { ...defaultCashPlan(), initialCash: 200 };
    await Promise.all([PUT(request(first)), PUT(request(second))]);
    expect((await (await GET()).json()).plan.initialCash).toBe(200);
    await PUT(request(first));
    expect((await (await GET()).json()).plan.initialCash).toBe(100);
  });
  it("rejects invalid settings before any write", async () => {
    expect((await PUT(request({ ...defaultCashPlan(), endAge: -1 }))).status).toBe(400);
    expect(db.cashFlowPlan.upsert).not.toHaveBeenCalled();
  });
  it("reports a database error rather than a successful save", async () => {
    db.cashFlowPlan.upsert.mockRejectedValue(new Error("offline"));
    expect((await PUT(request(defaultCashPlan()))).status).toBe(503);
  });
});
