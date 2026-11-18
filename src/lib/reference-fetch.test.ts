import { afterEach, expect, it, vi } from "vitest";
import { fetchReference } from "./reference-fetch";
afterEach(() => vi.unstubAllGlobals());
it("coalesces concurrent reference reads with independently readable bodies and no stale cache", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "a" }]))); vi.stubGlobal("fetch", fetch);
  const [a, b] = await Promise.all([fetchReference("/api/members"), fetchReference("/api/members")]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await a.json()).toEqual(await b.json());
  fetch.mockResolvedValue(new Response(JSON.stringify([{ id: "b" }])));
  expect(await (await fetchReference("/api/members")).json()).toEqual([{ id: "b" }]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("retries failures and keeps separate endpoints independent", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(new Response("[]")); vi.stubGlobal("fetch", fetch);
  await expect(fetchReference("/api/members")).rejects.toThrow("offline");
  const results = await Promise.all([fetchReference("/api/members"), fetchReference("/api/categories")]);
  expect(results.every(result => result.ok)).toBe(true); expect(fetch).toHaveBeenCalledTimes(3);
});
it("aborting one subscriber does not cancel other subscribers", async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  const controller = new AbortController();
  const a = fetchReference("/api/members", { signal: controller.signal }), b = fetchReference("/api/members");
  controller.abort(); resolve(new Response("[]"));
  await expect(a).rejects.toMatchObject({ name: "AbortError" }); expect((await b).ok).toBe(true);
});
