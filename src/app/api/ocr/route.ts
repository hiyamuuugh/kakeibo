import { NextRequest, NextResponse } from "next/server";

// レシート画像をGoogle Cloud Vision(DOCUMENT_TEXT_DETECTION)に投げ、
// 認識テキストを行配列で返す。APIキーは環境変数 GOOGLE_VISION_API_KEY に置く。
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR is not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ja"] },
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: `Vision API error: ${res.status}`, detail }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
  const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  return NextResponse.json({ lines });
}
