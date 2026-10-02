export interface ParsedReceipt {
  amount: number | null;
  date: Date | null;
  store: string | null;
}

const AMOUNT_KEYWORDS = ["合計", "合 計", "total", "お買上", "お買い上げ", "計"];
const EXCLUDE_NEAR = ["小計", "お預", "お預り", "預り", "おつり", "お釣", "釣", "現金", "ポイント", "税抜"];

const toHalf = (value: string) =>
  value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/，/g, ",")
    .replace(/￥/g, "¥");

const parseAmountToken = (line: string): number | null => {
  const matches = toHalf(line).match(/[¥\\]?\s*([0-9][0-9,]*)\s*円?/g);
  if (!matches) return null;

  const amounts = matches
    .map((token) => Number.parseInt(token.replace(/[^0-9]/g, ""), 10))
    .filter((amount) => !Number.isNaN(amount) && amount > 0);

  return amounts.length > 0 ? Math.max(...amounts) : null;
};

export const normalizeStoreName = (raw: string) => {
  for (const alias of STORE_ALIASES) {
    if (alias.match.test(raw)) return alias.name;
  }

  return raw
    .replace(/^[\s0-9#*・.,-]+/, "")
    .replace(/([ァ-ヴ])[\s-]+([ァ-ヴ])/g, "$1$2")
    .trim();
};

export const parseReceipt = (lines: string[]): ParsedReceipt => {
  const cleaned = lines.map((line) => line.trim()).filter((line) => line.length > 0);

  let amount: number | null = null;
  for (const line of cleaned) {
    const lower = line.toLowerCase();
    if (EXCLUDE_NEAR.some((keyword) => line.includes(keyword))) continue;
    if (AMOUNT_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      amount = parseAmountToken(line);
      if (amount !== null) break;
    }
  }

  if (amount === null) {
    const amounts = cleaned
      .filter((line) => !EXCLUDE_NEAR.some((keyword) => line.includes(keyword)))
      .map(parseAmountToken)
      .filter((value): value is number => value !== null);
    if (amounts.length > 0) amount = Math.max(...amounts);
  }

  let date: Date | null = null;
  for (const line of cleaned) {
    const text = toHalf(line);
    let match = text.match(/(\d{4})[\/年.-](\d{1,2})[\/月.-](\d{1,2})/);
    if (match) {
      const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
        break;
      }
    }

    match = text.match(/(\d{1,2})[\/月](\d{1,2})[日]?/);
    if (match && !date) {
      const now = new Date();
      const parsed = new Date(now.getFullYear(), Number(match[1]) - 1, Number(match[2]));
      if (!Number.isNaN(parsed.getTime())) date = parsed;
    }
  }

  let store: string | null = null;
  for (const line of cleaned.slice(0, 5)) {
    const hasDigitOnly = /^[\d¥\\,円\s\/年月日.-]+$/.test(toHalf(line));
    if (hasDigitOnly) continue;
    if (AMOUNT_KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()))) continue;
    if (line.length < 2) continue;
    store = normalizeStoreName(line);
    break;
  }

  return { amount, date, store };
};

const STORE_ALIASES: { match: RegExp; name: string }[] = [
  { match: /セブン[\s-]?イレブン|seven[\s-]?eleven|ｾﾌﾞﾝ/i, name: "セブンイレブン" },
  { match: /ファミリ?ー[\s-]?マート|familymart|ﾌｧﾐﾘｰﾏｰﾄ/i, name: "ファミリーマート" },
  { match: /ローソン|lawson|ﾛｰｿﾝ/i, name: "ローソン" },
  { match: /ミニストップ|ministop/i, name: "ミニストップ" },
  { match: /スターバックス|starbucks/i, name: "スターバックス" },
  { match: /マクドナルド|mcdonald/i, name: "マクドナルド" },
  { match: /イオン|aeon/i, name: "イオン" },
  { match: /マツモトキヨシ|マツキヨ/i, name: "マツモトキヨシ" },
  { match: /ウエルシア|welcia/i, name: "ウエルシア" },
  { match: /ドン[\s.・]?キホーテ|ドンキ/i, name: "ドン・キホーテ" },
  { match: /ニトリ|nitori/i, name: "ニトリ" },
  { match: /ユニクロ|uniqlo/i, name: "ユニクロ" },
];
