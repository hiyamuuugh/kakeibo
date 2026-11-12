import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ priceProduct: { findMany: vi.fn(), upsert: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { GET, POST } from "./route";
import { middleware } from "../../../../middleware";
import { NextRequest } from "next/server";
const input = { name: "牛乳", category: "食品", store: "イオン", unit: "L", quantity: 1, price: 198, shipping: 0, online: false, date: "2026-11-12" };
const request = (body: unknown) => new Request("https://example.test/api/price-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("price notes API", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("rejects unauthenticated requests to records and delete routes", async () => {
    vi.stubEnv("APP_PASSWORD", "test"); vi.stubEnv("APP_SESSION_SECRET", "test-secret");
    try {
      for (const path of ["/api/price-notes", "/api/price-notes/record-1"]) {
        const res = await middleware(new NextRequest(`https://example.test${path}`));
        expect(res.status).toBe(401);
      }
    } finally { vi.unstubAllEnvs(); }
  });
  it("rejects bad input before accessing the database", async () => {
    expect((await POST(request({ ...input, quantity: 0 }))).status).toBe(400);
    expect(db.priceProduct.upsert).not.toHaveBeenCalled();
  });
  it("atomically adds a converted record to an existing product", async () => {
    db.priceProduct.upsert.mockResolvedValue({ id: "p", records: [] });
    const res = await POST(request(input));
    expect(res.status).toBe(201);
    expect(db.priceProduct.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { name_category_unit: { name: "牛乳", category: "食品", unit: "ml" } },
      update: { records: { create: { store: "イオン", price: 198, shipping: 0, quantity: 1000, online: false, date: new Date("2026-11-12") } } },
    }));
  });
  it("stores an omitted quantity as null and defaults shipping to zero", async () => {
    db.priceProduct.upsert.mockResolvedValue({ id: "p", records: [] });
    const { quantity: _quantity, shipping: _shipping, ...withoutOptional } = input;
    expect((await POST(request(withoutOptional))).status).toBe(201);
    expect(db.priceProduct.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { records: { create: expect.objectContaining({ quantity: null, shipping: 0 }) } },
    }));
  });
  it("returns persisted records without caching", async () => {
    db.priceProduct.findMany.mockResolvedValue([{ id: "p", records: [{ id: "r" }] }]);
    const res = await GET();
    expect(await res.json()).toEqual([{ id: "p", records: [{ id: "r" }] }]);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
  it("reports database errors instead of reporting a successful save", async () => {
    db.priceProduct.upsert.mockRejectedValue(new Error("connection"));
    expect((await POST(request(input))).status).toBe(503);
  });
});
