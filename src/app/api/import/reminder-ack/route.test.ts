import { afterEach, beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ member: { findUnique: vi.fn() }, csvReminderAcknowledgement: { upsert: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { POST } from "./route";
const request = (body: unknown) => new Request("https://example.test/api/import/reminder-ack", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-18T03:00:00Z")); db.member.findUnique.mockResolvedValue({ id: "a" }); db.csvReminderAcknowledgement.upsert.mockResolvedValue({}); });
afterEach(() => vi.useRealTimers());
it("persists only this account and current notification month; repeats are idempotent", async () => {
  for (let i = 0; i < 2; i++) expect((await POST(request({ memberId: "a", month: "2026-11" }))).status).toBe(200);
  expect(db.csvReminderAcknowledgement.upsert).toHaveBeenCalledWith({ where: { memberScope_month: { memberScope: "member:a", month: "2026-11" } }, create: { memberScope: "member:a", month: "2026-11" }, update: {} });
  await POST(request({ memberId: "b", month: "2026-11" }));
  expect(db.csvReminderAcknowledgement.upsert.mock.calls[2][0].create.memberScope).toBe("member:b");
});
it("uses the new month after Japanese midnight without hiding the following month's notification", async () => {
  vi.setSystemTime(new Date("2026-11-30T15:00:00Z"));
  expect((await POST(request({ memberId: "a", month: "2026-11" }))).status).toBe(400);
  expect((await POST(request({ memberId: "a", month: "2026-12" }))).status).toBe(200);
  expect(db.csvReminderAcknowledgement.upsert.mock.calls[0][0].create.month).toBe("2026-12");
});
it.each([{}, null, { memberId: "", month: "2026-11" }, { memberId: "a", month: "2026-10" }, { memberId: "a", month: "2026-12" }])("rejects invalid requests %j", async body => {
  expect((await POST(request(body))).status).toBe(400);
  expect(db.csvReminderAcknowledgement.upsert).not.toHaveBeenCalled();
});
it("rejects nonexistent accounts and reports persistence failures", async () => {
  db.member.findUnique.mockResolvedValue(null);
  expect((await POST(request({ memberId: "a", month: "2026-11" }))).status).toBe(400);
  db.csvReminderAcknowledgement.upsert.mockRejectedValue(new Error("offline"));
  const res = await POST(request({ memberId: "unassigned", month: "2026-11" }));
  expect(res.status).toBe(503);
  expect(await res.json()).not.toHaveProperty("acknowledged");
});
