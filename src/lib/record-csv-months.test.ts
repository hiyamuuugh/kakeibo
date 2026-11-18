import { beforeEach, expect, it, vi } from "vitest";
const createMany = vi.hoisted(() => vi.fn());
vi.mock("./prisma", () => ({ prisma: { csvImportMonth: { createMany } } }));
import { recordCsvMonths } from "./record-csv-months";
beforeEach(() => vi.resetAllMocks());
it("deduplicates months and ignores invalid dates while preserving account scope", async () => {
  await recordCsvMonths("paypay", "a", [null, new Date("invalid"), new Date("2026-10-01Z"), new Date("2026-10-20Z"), new Date("2026-09-01Z")]);
  expect(createMany).toHaveBeenCalledWith({ data: [{ source: "paypay", memberScope: "member:a", month: "2026-10" }, { source: "paypay", memberScope: "member:a", month: "2026-09" }], skipDuplicates: true });
});
it("does not mark an empty CSV as imported", async () => {
  await recordCsvMonths("paypay", null, []);
  expect(createMany).not.toHaveBeenCalled();
});
