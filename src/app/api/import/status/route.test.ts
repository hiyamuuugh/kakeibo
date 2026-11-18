import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const db = vi.hoisted(() => ({ transaction: { findMany: vi.fn(), groupBy: vi.fn() }, csvImportMonth: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { GET } from "./route";
describe("CSV reminder account scope", () => {
  beforeEach(() => { vi.resetAllMocks(); db.transaction.findMany.mockResolvedValue([]); db.transaction.groupBy.mockResolvedValue([]); db.csvImportMonth.findMany.mockResolvedValue([]); });
  it("restricts both historic records and import logs to the selected account", async () => {
    const res = await GET(new NextRequest("https://example.test/api/import/status?memberId=member-a"));
    expect(res.status).toBe(200);
    expect(db.transaction.findMany.mock.calls[0][0].where.memberId).toBe("member-a");
    expect(db.transaction.groupBy.mock.calls[0][0].where.memberId).toBe("member-a");
    expect(db.csvImportMonth.findMany.mock.calls[0][0].where).toEqual({ memberScope: "member:member-a" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
  it("supports unassigned imports and rejects empty account IDs", async () => {
    await GET(new NextRequest("https://example.test/api/import/status"));
    expect(db.transaction.findMany.mock.calls[0][0].where.memberId).toBeNull();
    expect((await GET(new NextRequest("https://example.test/api/import/status?memberId="))).status).toBe(400);
  });
  it("does not invent a missing-month result on database failure", async () => {
    db.csvImportMonth.findMany.mockRejectedValue(new Error("offline"));
    const res = await GET(new NextRequest("https://example.test/api/import/status"));
    expect(res.status).toBe(503);
    expect(await res.json()).not.toHaveProperty("missingMonths");
  });
});
