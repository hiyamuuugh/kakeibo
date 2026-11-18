import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const db = vi.hoisted(() => ({ monthlyBudgetPlan: { findUnique: vi.fn(), upsert: vi.fn() }, budget: { findMany: vi.fn() }, category: { findMany: vi.fn() }, member: { findUnique: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { GET, PUT } from "./route";
const plan = { version: 1, totalAmount: 100000, categories: [{ categoryId: "food", amount: 30000 }] };
const req = (query = "", body: unknown = plan) => new NextRequest(`https://example.test/api/budget-plan${query}`, { method: "PUT", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); db.monthlyBudgetPlan.findUnique.mockResolvedValue(null); db.budget.findMany.mockResolvedValue([]); db.category.findMany.mockResolvedValue([{ id: "food", name: "食費", type: "expense" }]); db.member.findUnique.mockResolvedValue({ id: "a" }); db.monthlyBudgetPlan.upsert.mockResolvedValue({ scope: "family", data: plan });
});
describe("monthly budget API", () => {
  it("returns an unset budget instead of inventing a limit", async () => {
    const response = await GET(new NextRequest("https://example.test/api/budget-plan"));
    expect(response.status).toBe(200);
    expect((await response.json()).plan).toEqual({ version: 1, totalAmount: null, categories: [] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("isolates family and member plans and writes the whole plan atomically", async () => {
    expect((await PUT(req("?memberId=a"))).status).toBe(200);
    expect(db.monthlyBudgetPlan.upsert).toHaveBeenCalledWith({ where: { scope: "member:a" }, create: { scope: "member:a", data: plan }, update: { data: plan } });
    await GET(new NextRequest("https://example.test/api/budget-plan?memberId=a&month=2026-11"));
    expect(db.monthlyBudgetPlan.findUnique).toHaveBeenCalledWith({ where: { scope: "member:a" } });
    expect(db.budget.findMany).not.toHaveBeenCalled();
    await PUT(req()); expect(db.monthlyBudgetPlan.upsert.mock.calls[1][0].where.scope).toBe("family");
  });
  it("preserves legacy family month overrides without copying them to personal settings", async () => {
    db.monthlyBudgetPlan.findUnique.mockResolvedValue({ data: plan });
    db.budget.findMany.mockResolvedValue([{ categoryId: "food", amount: 50000 }, { categoryId: "other", amount: 10000 }]);
    const response = await GET(new NextRequest("https://example.test/api/budget-plan?month=2026-11"));
    expect(await response.json()).toMatchObject({ monthlyOverrides: true, plan: { totalAmount: 100000, categories: [{ categoryId: "food", amount: 50000 }, { categoryId: "other", amount: 10000 }] } });
    expect(db.budget.findMany).toHaveBeenCalledWith({ where: { month: "2026-11" }, select: { categoryId: true, amount: true } });
  });
  it.each(["?month=bad", "?month=2026-13", "?memberId="])("rejects malformed query %s", async query => {
    expect((await GET(new NextRequest(`https://example.test/api/budget-plan${query}`))).status).toBe(400);
    expect(db.monthlyBudgetPlan.findUnique).not.toHaveBeenCalled();
  });
  it("rejects negative values, unknown members, income and nonexistent categories", async () => {
    expect((await PUT(req("", { ...plan, totalAmount: -1 }))).status).toBe(400);
    db.member.findUnique.mockResolvedValue(null);
    expect((await PUT(req("?memberId=missing"))).status).toBe(400);
    db.category.findMany.mockResolvedValue([{ id: "food", name: "給料", type: "income" }]);
    expect((await PUT(req())).status).toBe(400);
    db.category.findMany.mockResolvedValue([]);
    expect((await PUT(req())).status).toBe(400);
    expect(db.monthlyBudgetPlan.upsert).not.toHaveBeenCalled();
  });
  it("returns save/read failures without reporting false success", async () => {
    db.monthlyBudgetPlan.upsert.mockRejectedValue(new Error("db"));
    expect((await PUT(req())).status).toBe(503);
    db.monthlyBudgetPlan.findUnique.mockRejectedValue(new Error("db"));
    expect((await GET(new NextRequest("https://example.test/api/budget-plan"))).status).toBe(503);
  });
});
