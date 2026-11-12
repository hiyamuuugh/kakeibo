import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  priceRecord: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  priceProduct: { upsert: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { PATCH } from "./route";
const body = { name: "北海道牛乳", category: "食品", store: "西友", price: 188, shipping: 0, quantity: 1, unit: "L", date: "2026-11-12" };
const request = (data: unknown) => new Request("https://example.test/api/price-notes/r1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
const params = () => ({ params: Promise.resolve({ id: "r1" }) });
describe("price record editing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.$transaction.mockImplementation(work => work(db));
    db.priceRecord.findUnique.mockResolvedValue({ id: "r1", productId: "old" });
    db.priceProduct.upsert.mockResolvedValue({ id: "target" });
    db.priceProduct.findUnique.mockResolvedValue({ id: "target", records: [{ id: "r1", price: 188 }] });
  });
  it("updates the selected record in one transaction and can move it to another product", async () => {
    const res = await PATCH(request(body), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ previousProductId: "old", product: { id: "target", records: [{ id: "r1", price: 188 }] } });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.priceRecord.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { store: "西友", price: 188, shipping: 0, quantity: 1000, date: new Date("2026-11-12"), productId: "target" } });
    expect(db.priceRecord.delete).not.toHaveBeenCalled();
  });
  it("keeps an omitted quantity optional during an edit", async () => {
    expect((await PATCH(request({ ...body, quantity: null }), params())).status).toBe(200);
    expect(db.priceRecord.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantity: null }) }));
  });
  it("does not start a transaction for invalid input", async () => {
    expect((await PATCH(request({ ...body, price: -1 }), params())).status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("reports a stale deleted record without creating a new product", async () => {
    db.priceRecord.findUnique.mockResolvedValue(null);
    expect((await PATCH(request(body), params())).status).toBe(404);
    expect(db.priceProduct.upsert).not.toHaveBeenCalled();
    expect(db.priceRecord.update).not.toHaveBeenCalled();
  });
  it("reports transaction failure rather than a successful update", async () => {
    db.$transaction.mockRejectedValue(new Error("database unavailable"));
    expect((await PATCH(request(body), params())).status).toBe(503);
  });
});
