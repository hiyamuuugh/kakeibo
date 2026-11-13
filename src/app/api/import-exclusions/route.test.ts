import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma";
const db = vi.hoisted(() => ({ importExclusion: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { GET, POST, DELETE } from "./route";
const request = (body: unknown, method = "POST") => new NextRequest("https://example.test/api/import-exclusions", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("source-specific CSV exclusions", () => {
  beforeEach(() => vi.resetAllMocks());
  it("loads source information without caching", async () => {
    db.importExclusion.findMany.mockResolvedValue([{ id: "a", name: "証券", source: "mufg" }]);
    const response = await GET();
    expect((await response.json())[0].source).toBe("mufg");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("stores a trimmed name under the selected source", async () => {
    db.importExclusion.create.mockResolvedValue({ id: "a", name: "証券", source: "mufg" });
    expect((await POST(request({ name: " 証券 ", source: "mufg" }))).status).toBe(201);
    expect(db.importExclusion.create).toHaveBeenCalledWith({ data: { name: "証券", source: "mufg" } });
  });
  it.each([{}, { name: "a" }, { name: "a", source: "all" }, { name: "", source: "paypay" }, { name: "x".repeat(201), source: "paypay" }])("rejects invalid input %j", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(db.importExclusion.create).not.toHaveBeenCalled();
  });
  it("reports a duplicate within the same source", async () => {
    db.importExclusion.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7" }));
    expect((await POST(request({ name: "証券", source: "mufg" }))).status).toBe(409);
  });
  it("deletes only the selected source's record", async () => {
    db.importExclusion.deleteMany.mockResolvedValue({ count: 0 });
    expect((await DELETE(request({ id: "a", source: "smbc" }, "DELETE"))).status).toBe(404);
    expect(db.importExclusion.deleteMany).toHaveBeenCalledWith({ where: { id: "a", source: "smbc" } });
  });
  it("reports save failures", async () => {
    db.importExclusion.create.mockRejectedValue(new Error("offline"));
    expect((await POST(request({ name: "証券", source: "mufg" }))).status).toBe(503);
  });
});
