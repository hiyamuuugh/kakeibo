export interface MonthlyReportStats {
  total: number;
  income: number;
  categories: { name: string; total: number }[];
}

export interface MonthlyReport {
  tone: "alert" | "warn" | "good" | "neutral";
  headline: string;
  advice: string;
}

const TONE_ORDER: Record<MonthlyReport["tone"], number> = {
  alert: 0,
  warn: 1,
  neutral: 2,
  good: 3,
};

export const buildMonthlyReport = (
  stats: MonthlyReportStats,
  prevExpenses: number[]
): MonthlyReport => {
  const candidates: MonthlyReport[] = [];
  const balance = stats.income - stats.total;

  if (balance < 0) {
    candidates.push({
      tone: "alert",
      headline: `今月は ¥${Math.abs(balance).toLocaleString("ja-JP")} の赤字です`,
      advice: "支出が収入を上回っています。大きな出費を見直してみましょう。",
    });
  }

  const prev = prevExpenses[prevExpenses.length - 1] ?? 0;
  if (prev > 0 && stats.total > prev) {
    const rate = Math.round(((stats.total - prev) / prev) * 100);
    if (rate >= 20) {
      candidates.push({
        tone: "warn",
        headline: `先月より支出が ${rate}% 増えています`,
        advice: "増えた分の使いみちを振り返ると節約のヒントが見つかります。",
      });
    }
  }

  const valid = prevExpenses.filter((expense) => expense > 0);
  if (valid.length >= 2) {
    const avg = valid.reduce((sum, expense) => sum + expense, 0) / valid.length;
    if (avg > 0 && stats.total > avg * 1.15) {
      const rate = Math.round(((stats.total - avg) / avg) * 100);
      candidates.push({
        tone: "warn",
        headline: `直近平均より ${rate}% 多く使っています`,
        advice: "いつもの月より出費が多めです。固定費以外の支出をチェックしましょう。",
      });
    }
  }

  const top = stats.categories[0];
  if (top && stats.total > 0) {
    const share = Math.round((top.total / stats.total) * 100);
    if (share >= 40) {
      candidates.push({
        tone: "warn",
        headline: `「${top.name}」が支出の ${share}% を占めています`,
        advice: `${top.name}に偏っています。内訳を見直すと効果的です。`,
      });
    }
  }

  if (balance >= 0 && (prev === 0 || stats.total <= prev)) {
    candidates.push({
      tone: "good",
      headline: "今月は順調です",
      advice: "支出を抑えられています。この調子を維持しましょう。",
    });
  }

  if (candidates.length === 0) {
    return {
      tone: "neutral",
      headline: "今月のレポート",
      advice: "まだデータが少なめです。取引を取り込むと傾向が分かります。",
    };
  }

  candidates.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
  return candidates[0];
};
