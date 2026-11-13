import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const db = vi.hoisted(() => ({ category: { findMany: vi.fn() }, merchantRule: { findMany: vi.fn() }, importExclusion: { findMany: vi.fn() }, transaction: { findFirst: vi.fn(), create: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { POST as paypay } from "./paypay/route";
import { POST as paypayCard } from "./paypay-card/route";
import { POST as rakuten } from "./rakuten/route";
import { POST as saison } from "./saison/route";
import { POST as mufg } from "./mufg/route";
import { POST as smbc } from "./smbc/route";
const cases = [
  { source: "paypay", handler: paypay, csv: "日時,金額,取引先\n2026/11/01,100,証券振替\n2026/11/02,200,スーパー" },
  ...[{ source: "paypay-card", handler: paypayCard }, { source: "rakuten", handler: rakuten }, { source: "saison", handler: saison }].map(item => ({ ...item, csv: "利用日,ご利用店名及び商品名,利用金額\n2026/11/01,証券振替,100\n2026/11/02,スーパー,200" })),
  { source: "mufg", handler: mufg, csv: "日付,摘要,摘要内容,お支払い金額（円）,お預かり金額（円）,残高（円）\n2026/11/01,振替,証券振替,100,,1000\n2026/11/02,支払い,スーパー,200,,800" },
  { source: "smbc", handler: smbc, csv: "年月日,お引出し,お預入れ,お取り扱い内容,残高,メモ,\n2026/11/01,100,,証券振替,1000,,\n2026/11/02,200,,スーパー,800,," },
];
function request(csv: string) {
  const form = new FormData(); form.set("file", new File([csv], "sample.csv", { type: "text/csv" }));
  return new NextRequest("https://example.test/api/import/test", { method: "POST", body: form });
}
describe("CSV import exclusion isolation across all six sources", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.category.findMany.mockResolvedValue([]);
    db.merchantRule.findMany.mockResolvedValue([]);
    db.transaction.findFirst.mockResolvedValue(null);
    db.transaction.create.mockResolvedValue({ id: "saved" });
  });
  it.each(cases)("applies only $source exclusions", async ({ source, handler, csv }) => {
    db.importExclusion.findMany.mockImplementation(async ({ where }) => where.source === source ? [{ name: "証券" }] : []);
    expect(await (await handler(request(csv))).json()).toEqual({ imported: 1, skipped: 1 });
    expect(db.importExclusion.findMany).toHaveBeenCalledWith({ where: { source }, select: { name: true } });
    expect(db.transaction.create).toHaveBeenCalledTimes(1);
  });
  it.each(cases)("does not apply another source's words to $source", async ({ source, handler, csv }) => {
    const other = source === "mufg" ? "smbc" : "mufg";
    db.importExclusion.findMany.mockImplementation(async ({ where }) => where.source === other ? [{ name: "証券" }] : []);
    expect(await (await handler(request(csv))).json()).toEqual({ imported: 2, skipped: 0 });
  });
});
