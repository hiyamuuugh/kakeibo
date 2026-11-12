import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
const fail = (error: string, message: string, status: number) => NextResponse.json({ error, message }, { status });
const supported = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"]);
function visionFailure(status: number, code: number | undefined, detail: string) {
  if (status === 429 || code === 8 || /RESOURCE_EXHAUSTED|quota/i.test(detail)) return fail("quota_exceeded", "OCRの利用上限に達しています。時間をおいてお試しください。", 429);
  if (status === 403 || code === 7 || /API_KEY|API key|PERMISSION_DENIED|billing/i.test(detail)) return fail("ocr_permission", "OCR側の認証・利用設定を確認する必要があります。", 503);
  if (status === 400 || code === 3) return fail("invalid_image", "画像を読み取れませんでした。JPEGまたはPNGで撮影し直してください。", 422);
  return fail("ocr_upstream_error", "読み取りサービスに接続できませんでした。時間をおいて再度お試しください。", 502);
}
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return fail("ocr_not_configured", "OCR設定が未完了です。管理者による設定が必要です。", 503);
  let entry: FormDataEntryValue | null;
  try { entry = (await req.formData()).get("file"); }
  catch { return fail("invalid_form", "写真を選び直してください。", 400); }
  if (!(entry instanceof File) || !entry.size) return fail("missing_image", "写真を選択してください。", 400);
  if (entry.size > 3 * 1024 * 1024) return fail("image_too_large", "画像が大きすぎます。レシート部分だけ撮影してください。", 413);
  if (!supported.has(entry.type)) return fail("unsupported_image", "JPEGまたはPNGの写真を選んでください。", 415);
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ requests: [{ image: { content: Buffer.from(await entry.arrayBuffer()).toString("base64") }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }], imageContext: { languageHints: ["ja"] } }] }),
    });
    const data = await res.json().catch(() => null) as { error?: { code?: number; message?: string }; responses?: { error?: { code?: number; message?: string }; fullTextAnnotation?: { text?: string }; textAnnotations?: { description?: string }[] }[] } | null;
    if (!res.ok) return visionFailure(res.status, data?.error?.code, data?.error?.message ?? "");
    const result = data?.responses?.[0];
    if (!result) return fail("invalid_ocr_response", "読み取り結果を取得できませんでした。もう一度お試しください。", 502);
    if (result.error) return visionFailure(200, result.error.code, result.error.message ?? "");
    const text = result.fullTextAnnotation?.text ?? result.textAnnotations?.[0]?.description ?? "";
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) return fail("no_text", "文字を検出できませんでした。明るい場所でレシートを正面から撮影してください。", 422);
    return NextResponse.json({ lines });
  } catch (error) {
    if (error instanceof Error && /Timeout|Abort/.test(error.name)) return fail("ocr_timeout", "読み取りがタイムアウトしました。もう一度お試しください。", 504);
    return fail("ocr_network_error", "読み取りサービスに接続できませんでした。通信状態を確認して再度お試しください。", 502);
  }
}
