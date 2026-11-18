import type { MonthlyStats } from "./monthly-stats";
export async function fetchMonthlyHistory(from: string, to: string, memberId: string | null, signal?: AbortSignal): Promise<MonthlyStats[]> {
  const params = new URLSearchParams({ from, to }); if (memberId) params.set("memberId", memberId);
  const response = await fetch(`/api/stats/history?${params}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("過去の集計を読み込めませんでした。");
  const data = await response.json();
  if (!Array.isArray(data.months)) throw new Error("過去の集計を読み込めませんでした。");
  return data.months;
}
