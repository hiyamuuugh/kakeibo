import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface PayPayRow {
  [key: string]: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  食費: ["スーパー", "コンビニ", "ファミリーマート", "ファミマ", "ローソン", "セブン", "マクドナルド", "マック", "スタバ", "スターバックス", "すき家", "吉野家", "松屋", "サイゼリヤ", "ガスト", "ドトール", "カフェ", "レストラン", "フード", "食堂", "弁当", "ラーメン", "そば", "うどん", "焼肉", "寿司", "イオン", "西友", "ライフ", "業務スーパー"],
  交通費: ["交通", "電車", "バス", "タクシー", "Suica", "PASMO", "鉄道", "駅", "モバイルSuica", "JR", "東急", "小田急", "京王", "阪急", "地下鉄"],
  日用品: ["ドラッグ", "マツキヨ", "ウエルシア", "ツルハ", "ダイソー", "セリア", "ニトリ", "無印", "東急ハンズ", "ホームセンター", "コーナン", "カインズ", "ドン・キホーテ", "ドンキ"],
  娯楽: ["映画", "カラオケ", "ゲーム", "Netflix", "Spotify", "Disney", "アマゾン", "Amazon", "iTunes", "ブック", "漫画", "遊園地", "ボウリング"],
  衣類: ["ユニクロ", "GU", "ZARA", "H&M", "しまむら", "アダストリア", "ワークマン", "洋服"],
  医療: ["病院", "クリニック", "薬局", "歯科", "内科", "外科", "皮膚科", "眼科", "整形", "調剤"],
  光熱費: ["電気", "ガス", "水道", "東京電力", "関西電力", "東京ガス", "大阪ガス"],
  通信費: ["ドコモ", "au", "ソフトバンク", "楽天モバイル", "LINE", "通信", "インターネット", "NTT"],
};

function guessCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return catName;
  }
  return undefined;
}

function parsePayPayDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim().replace(/\//g, "-");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(amountStr: string): number {
  return Math.abs(parseInt(amountStr.replace(/[^0-9-]/g, ""), 10) || 0);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  let rows: PayPayRow[] = [];
  let parseErrors: Papa.ParseError[] = [];

  Papa.parse<PayPayRow>(text, {
    header: true,
    skipEmptyLines: true,
    complete(result) {
      rows = result.data;
      parseErrors = result.errors;
    },
  });

  if (parseErrors.length > 0 && rows.length === 0) {
    return NextResponse.json({ error: "CSV parse failed", details: parseErrors }, { status: 400 });
  }
  if (rows.length === 0) return NextResponse.json({ imported: 0, skipped: 0 });

  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  const headers = Object.keys(rows[0]);

  const dateKey =
    headers.find((h) => h.includes("日時") || h.includes("日付") || h.includes("年月日") || h.toLowerCase().includes("date")) ?? headers[0];

  // 入金・出金が別カラムの場合と、単一金額カラムの場合に対応
  const incomeKey = headers.find((h) => h.includes("入金金額") || h.includes("入金"));
  const expenseKey = headers.find((h) => h.includes("出金金額") || h.includes("出金"));
  const amountKey =
    (!incomeKey && !expenseKey)
      ? (headers.find((h) => h.includes("金額") || h.includes("利用金額") || h.toLowerCase().includes("amount")) ?? headers[1])
      : null;

  // 取引先 / 利用先 = merchant/store name (PayPay CSV の主要列)
  const merchantKey =
    headers.find((h) => h.includes("取引先") || h.includes("利用先") || h.includes("店舗名") || h.includes("加盟店")) ??
    headers.find((h) => h.includes("内容") || h.includes("店舗") || h.toLowerCase().includes("desc")) ??
    headers[2];

  const typeKey = headers.find((h) => h.includes("種別") || h.includes("タイプ") || h.toLowerCase().includes("type"));

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const dateStr = row[dateKey];
    const merchant = (row[merchantKey] ?? "").trim();

    if (!dateStr) { skipped++; continue; }

    const date = parsePayPayDate(dateStr);
    if (!date) { skipped++; continue; }

    // 入金・出金カラムが分かれている場合
    let amount: number;
    let isIncome = false;

    if (incomeKey && expenseKey) {
      const incomeAmt = parseAmount(row[incomeKey] ?? "");
      const expenseAmt = parseAmount(row[expenseKey] ?? "");
      if (incomeAmt > 0) { amount = incomeAmt; isIncome = true; }
      else if (expenseAmt > 0) { amount = expenseAmt; }
      else { skipped++; continue; }
    } else if (incomeKey) {
      amount = parseAmount(row[incomeKey] ?? "");
      isIncome = true;
      if (amount === 0) { skipped++; continue; }
    } else {
      const amountStr = row[amountKey!] ?? "";
      if (!amountStr) { skipped++; continue; }
      amount = parseAmount(amountStr);
      if (amount === 0) { skipped++; continue; }

      if (typeKey) {
        const type = (row[typeKey] ?? "").trim();
        if (type.includes("チャージ") || type.includes("受取") || type.includes("還元")) {
          skipped++;
          continue;
        }
      }
    }

    // 収入はマイナス値で保存（UI で isIncome 判定に使用）
    const storedAmount = isIncome ? -amount : amount;

    const catName = guessCategory(merchant);
    const categoryId = catName ? (categoryMap.get(catName) ?? null) : null;

    await prisma.transaction.create({
      data: {
        date,
        amount: storedAmount,
        description: merchant || (isIncome ? "PayPay入金" : "PayPay支払い"),
        store: null,
        source: "paypay",
        categoryId,
      },
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
