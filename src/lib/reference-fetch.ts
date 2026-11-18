/** Coalesce concurrent reference reads only; never retain a result across requests. */
const pending = new Map<string, Promise<Response>>();
export async function fetchReference(url: "/api/members" | "/api/categories", init?: { signal?: AbortSignal; cache?: RequestCache }) {
  if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  let request = pending.get(url);
  if (!request) {
    request = fetch(url, { cache: "no-store" });
    pending.set(url, request);
    const current = request;
    void request.finally(() => { if (pending.get(url) === current) pending.delete(url); }).catch(() => {});
  }
  const response = await request;
  if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return response.clone();
}
