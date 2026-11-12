import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
const upstream = vi.fn();
function imageRequest(type = "image/jpeg", size = 10) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(size)], "receipt.jpg", { type }));
  return new NextRequest("https://example.test/api/ocr", { method: "POST", body: form });
}
describe("receipt OCR endpoint", () => {
  beforeEach(() => { vi.stubEnv("GOOGLE_VISION_API_KEY", "test-key"); vi.stubGlobal("fetch", upstream); upstream.mockReset(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("returns recognized text lines with a Japanese hint", async () => {
    upstream.mockResolvedValue(Response.json({ responses: [{ fullTextAnnotation: { text: " 店名 \n 合計 ¥1,200\n\n" } }] }));
    const res = await POST(imageRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lines: ["店名", "合計 ¥1,200"] });
    expect(JSON.parse(upstream.mock.calls[0][1].body).requests[0]).toMatchObject({ features: [{ type: "DOCUMENT_TEXT_DETECTION" }], imageContext: { languageHints: ["ja"] } });
  });
  it("falls back to the whole-text annotation", async () => {
    upstream.mockResolvedValue(Response.json({ responses: [{ textAnnotations: [{ description: "レシート\n合計 198円" }] }] }));
    expect((await POST(imageRequest())).status).toBe(200);
  });
  it("reports missing configuration without contacting Google", async () => {
    vi.stubEnv("GOOGLE_VISION_API_KEY", "");
    expect((await POST(imageRequest())).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("rejects malformed form data instead of throwing a server error", async () => {
    expect((await POST(new NextRequest("https://example.test/api/ocr", { method: "POST" }))).status).toBe(400);
  });
  it("rejects an oversized upload before sending it upstream", async () => {
    expect((await POST(imageRequest("image/jpeg", 3 * 1024 * 1024 + 1))).status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("rejects a non-image file entry", async () => {
    const form = new FormData(); form.append("file", "not-a-photo");
    expect((await POST(new NextRequest("https://example.test/api/ocr", { method: "POST", body: form }))).status).toBe(400);
  });
  it("rejects an unconverted HEIC with an actionable message", async () => {
    const res = await POST(imageRequest("image/heic"));
    expect(res.status).toBe(415);
    expect((await res.json()).message).toContain("JPEG");
    expect(upstream).not.toHaveBeenCalled();
  });
  it("handles a quota error nested in an HTTP 200 response", async () => {
    upstream.mockResolvedValue(Response.json({ responses: [{ error: { code: 8, message: "RESOURCE_EXHAUSTED" } }] }));
    expect((await POST(imageRequest())).status).toBe(429);
  });
  it("distinguishes permission errors without leaking raw upstream messages", async () => {
    upstream.mockResolvedValue(Response.json({ error: { code: 7, message: "private-detail PERMISSION_DENIED" } }, { status: 403 }));
    const res = await POST(imageRequest());
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("private-detail");
  });
  it("does not report an empty result as a successful scan", async () => {
    upstream.mockResolvedValue(Response.json({ responses: [{ fullTextAnnotation: { text: "\n" } }] }));
    expect((await POST(imageRequest())).status).toBe(422);
  });
  it("reports network failures and timeouts cleanly", async () => {
    upstream.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await POST(imageRequest())).status).toBe(502);
    upstream.mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"));
    expect((await POST(imageRequest())).status).toBe(504);
  });
});
