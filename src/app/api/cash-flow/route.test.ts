import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const db = vi.hoisted(() => ({ transaction: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { GET } from "./route";
import { middleware } from "../../../../middleware";
const request = (query = "") => new NextRequest(`https://example.test/api/cash-flow${query}`);
describe("cash flow read-only endpoint", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T03:00:00Z")); db.transaction.findMany.mockResolvedValue([]); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  it("filters the selected member and reads only aggregate inputs through the reference date", async () => {
    const res = await GET(request("?month=2026-11&memberId=m1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(db.transaction.findMany).toHaveBeenCalledWith({ where: { date: { lt: new Date("2026-11-13T00:00:00Z") }, memberId: "m1" }, select: { date: true, amount: true, source: true }, orderBy: { date: "asc" } });
  });
  it("separates family totals and unassigned legacy records", async () => {
    await GET(request("?month=2026-11&memberId=all"));
    expect(db.transaction.findMany.mock.calls[0][0].where).not.toHaveProperty("memberId");
    await GET(request("?month=2026-11&memberId=unassigned"));
    expect(db.transaction.findMany.mock.calls[1][0].where.memberId).toBeNull();
  });
  it.each(["2026-13", "bad", "2027-01"])("rejects invalid or future month %s before querying the database", async month => {
    expect((await GET(request(`?month=${month}`))).status).toBe(400);
    expect(db.transaction.findMany).not.toHaveBeenCalled();
  });
  it("returns a usable error response on database failure", async () => {
    db.transaction.findMany.mockRejectedValue(new Error("offline"));
    expect((await GET(request())).status).toBe(503);
  });
  it("requires the existing family login", async () => {
    vi.stubEnv("APP_PASSWORD", "test"); vi.stubEnv("APP_SESSION_SECRET", "test");
    expect((await middleware(request())).status).toBe(401);
  });
});
