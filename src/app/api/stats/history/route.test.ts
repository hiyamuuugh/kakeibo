import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { transaction: { findMany } } }));
import { GET } from "./route";
beforeEach(() => { vi.resetAllMocks(); findMany.mockResolvedValue([]); });
it("reads a whole year with one bounded account-scoped query and minimal fields", async () => {
  const response = await GET(new NextRequest("https://example.test/api/stats/history?from=2026-01&to=2026-12&memberId=a"));
  expect(response.status).toBe(200);
  expect((await response.json()).months).toHaveLength(12);
  expect(findMany).toHaveBeenCalledTimes(1);
  const query = findMany.mock.calls[0][0];
  expect(query.where).toEqual({ memberId: "a", date: { gte: new Date("2026-01-01Z"), lt: new Date("2027-01-01Z") } });
  expect(query.select).not.toHaveProperty("description");
  expect(query.select).not.toHaveProperty("memo");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("supports the family scope and ten years without month-by-month queries", async () => {
  const response = await GET(new NextRequest("https://example.test/api/stats/history?from=2017-01&to=2026-12"));
  expect((await response.json()).months).toHaveLength(120);
  expect(findMany.mock.calls[0][0].where).not.toHaveProperty("memberId");
});
it.each(["from=bad&to=2026-11", "from=2026-12&to=2026-11", "from=2016-12&to=2026-12", "from=2026-01&to=2026-02&memberId="])("rejects invalid range or scope %s", async query => {
  expect((await GET(new NextRequest("https://example.test/api/stats/history?" + query))).status).toBe(400);
  expect(findMany).not.toHaveBeenCalled();
});
it("surfaces DB failures rather than returning fake zero totals", async () => {
  findMany.mockRejectedValue(new Error("offline"));
  expect((await GET(new NextRequest("https://example.test/api/stats/history?from=2026-01&to=2026-02"))).status).toBe(503);
});
