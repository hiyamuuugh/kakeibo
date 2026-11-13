import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ transaction: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { GET } from "./route";
describe("family history baseline", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-13T03:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it("reads all family history without individual descriptions and returns uncached aggregates", async () => {
    db.transaction.findMany.mockResolvedValue([{ date: "2026-10-01", amount: -300000 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(db.transaction.findMany).toHaveBeenCalledWith({ where: { date: { lt: new Date("2026-11-14T00:00:00.000Z") } }, select: { date: true, amount: true, category: { select: { name: true } } }, orderBy: { date: "asc" } });
    expect((await response.json()).history.averageNet).toBe(300000);
  });
  it("reports a failure instead of silently substituting zero", async () => {
    db.transaction.findMany.mockRejectedValue(new Error("offline"));
    expect((await GET()).status).toBe(503);
  });
});
