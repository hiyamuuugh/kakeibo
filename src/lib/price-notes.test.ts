import { describe, expect, it } from "vitest";
import { cheapest, parsePriceInput, unitLabel, usesUnitComparison, type PriceRecord } from "./price-notes";
const valid = { name: "牛乳", category: "食品", store: "スーパー", price: 200, shipping: 0, quantity: 1, unit: "L", date: "2026-11-12" };
const record = (overrides: Partial<PriceRecord> = {}): PriceRecord => ({ id: "1", store: "A", price: 200, shipping: 0, quantity: 1000, date: "2026-11-12", createdAt: "2026-11-12T00:00:00Z", ...overrides });
describe("price notes", () => {
  it("normalizes litres and kilograms to comparable units", () => {
    expect(parsePriceInput(valid)).toMatchObject({ unit: "ml", quantity: 1000 });
    expect(parsePriceInput({ ...valid, unit: "kg", quantity: 2.5 })).toMatchObject({ unit: "g", quantity: 2500 });
  });
  it("uses shipping-inclusive unit price rather than package price", () => {
    const small = record({ id: "small", price: 150, quantity: 500 });
    const large = record({ id: "large", price: 200, quantity: 1000 });
    const shipped = record({ id: "online", price: 100, shipping: 300, quantity: 1000 });
    expect(cheapest([small, shipped, large]).id).toBe("large");
    expect(unitLabel("ml", large)).toBe("100ml あたり ¥20");
    expect(unitLabel("個", record({ price: 198, quantity: 10 }))).toBe("1個 あたり ¥19.8");
  });
  it("accepts missing quantities and optional shipping without inventing a package size", () => {
    for (const quantity of [null, undefined, ""]) {
      expect(parsePriceInput({ ...valid, quantity, shipping: "" })).toMatchObject({ quantity: null, shipping: 0 });
    }
  });
  it("compares total prices when one quantity is unknown and never displays a guessed unit price", () => {
    const unknown = record({ id: "unknown", quantity: null, price: 150 });
    const known = record({ id: "known", quantity: 1000, price: 200 });
    expect(usesUnitComparison([unknown, known])).toBe(false);
    expect(cheapest([known, unknown]).id).toBe("unknown");
    expect(unitLabel("ml", unknown)).toBe("");
    expect(unitLabel("ml", unknown)).not.toMatch(/NaN|Infinity|¥/);
  });
  it("prefers a recent record when unit prices are equal", () => {
    expect(cheapest([record({ id: "old", date: "2026-10-01" }), record({ id: "new" })]).id).toBe("new");
  });
  it.each([{ quantity: 0 }, { quantity: -1 }, { quantity: Infinity }, { quantity: "1" }, { price: 1.5 }, { shipping: -1 }, { price: 2147483648 }, { date: "2026-02-30" }, { date: "bad" }, { name: " " }, { store: "" }, { category: "その他" }, { unit: "unknown" }])("rejects invalid input %j", (change) => {
    expect(() => parsePriceInput({ ...valid, ...change })).toThrow();
  });
});
