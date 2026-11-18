import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const db = vi.hoisted(() => ({ member: { update: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { PATCH } from "./route";
const request = (birthDate: unknown) => new NextRequest("https://example.test/api/members/a", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthDate }) });
const context = { params: Promise.resolve({ id: "a" }) };
describe("profile birthday", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-18T03:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it("saves the date without changing other profile fields", async () => {
    db.member.update.mockResolvedValue({ id: "a", birthDate: new Date("1998-05-20T00:00:00Z") });
    expect((await PATCH(request("1998-05-20"), context)).status).toBe(200);
    expect(db.member.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { birthDate: new Date("1998-05-20T00:00:00.000Z") } });
  });
  it.each(["2026-02-30", "2027-01-01", "invalid", 42])("rejects invalid date %j before write", async date => {
    expect((await PATCH(request(date), context)).status).toBe(400);
    expect(db.member.update).not.toHaveBeenCalled();
  });
  it("allows clearing a birthday and reports a database failure", async () => {
    db.member.update.mockResolvedValue({ id: "a", birthDate: null });
    expect((await PATCH(request(null), context)).status).toBe(200);
    expect(db.member.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { birthDate: null } });
    db.member.update.mockRejectedValue(new Error("offline"));
    expect((await PATCH(request("1998-05-20"), context)).status).toBe(503);
  });
});
