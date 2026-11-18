"use client";
import { fetchReference } from "@/lib/reference-fetch";

import { japanToday, monthAt } from "@/lib/cash-flow";
import { fetchMonthlyHistory } from "@/lib/monthly-history-client";
import { categoryColor } from "@/lib/category-colors";

import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  CategoryKind,
  getChartCategoryNames,
  INCOME_CATEGORY_ORDER,
} from "@/lib/category-options";
import { getSharePercent } from "@/lib/chart-format";
import { CategoryMonthlyReport } from "@/components/category-monthly-report";
import { MonthlyBudgetPanel } from "@/components/monthly-budget-panel";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

const DashboardTrendPlot = dynamic(() => import("@/components/dashboard-plots").then(module => module.DashboardTrendPlot), { ssr: false, loading: () => <LoadingSpinner className="h-full" /> });
const DashboardPiePlot = dynamic(() => import("@/components/dashboard-plots").then(module => module.DashboardPiePlot), { ssr: false, loading: () => <LoadingSpinner className="h-full" /> });

interface CategoryStat {
  id: string;
  name: string;
  color: string;
  total: number;
  count: number;
}

interface MonthlyStats {
  month: string;
  total: number;
  income: number;
  categories: CategoryStat[];
  incomeCategories: CategoryStat[];
  daily: { date: string; amount: number }[];
  count: number;
}

interface MonthBar {
  month: string;
  label: string;
  expense: number;
  income: number;
  balance: number;
  categories: Record<string, number>;
  incomeCategories: Record<string, number>;
}

type ChartMode = "expense" | "income" | "balance";
type RangeMode = "monthly" | "yearly";

const CHART_CONFIGS: Record<ChartMode, { label: string; active: string; inactive: string }> = {
  expense: { label: "支出", active: "#c1432f", inactive: "#e7d0ca" },
  income: { label: "収入", active: "#3f6f51", inactive: "#d5e4d9" },
  balance: { label: "収支", active: "#245f8b", inactive: "#c8dbe8" },
};

const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;

const formatBalance = (amount: number) => {
  if (amount === 0) return "¥0";
  return `${amount > 0 ? "+" : "-"}${formatYen(Math.abs(amount))}`;
};

const toCategoryMap = (categories: CategoryStat[]) => {
  const map: Record<string, number> = {};
  for (const category of categories) {
    map[category.name] = category.total;
  }
  return map;
};

const filterIncomeCategories = (categories: CategoryStat[]) =>
  [...categories]
    .filter((category) => INCOME_CATEGORY_ORDER.includes(category.name))
    .sort(
      (a, b) =>
        INCOME_CATEGORY_ORDER.indexOf(a.name) - INCOME_CATEGORY_ORDER.indexOf(b.name)
    );

const fetchMonthly = async (month: string, memberId: string | null, signal?: AbortSignal): Promise<MonthlyStats> => {
  const params = new URLSearchParams({ month });
  if (memberId) params.set("memberId", memberId);
  const response = await fetch(`/api/stats/monthly?${params.toString()}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("集計を読み込めませんでした。");
  return (await response.json()) as MonthlyStats;
};

const getBarCategories = (bar: MonthBar, chartMode: ChartMode) =>
  chartMode === "income" ? bar.incomeCategories : bar.categories;

export default function Dashboard() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [viewMode, setViewMode] = useState<"personal" | "family">("personal");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState("");
  const [memberRetry, setMemberRetry] = useState(0);
  const [memberReady, setMemberReady] = useState(false);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [statsKey, setStatsKey] = useState("");
  const [monthBars, setMonthBars] = useState<MonthBar[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>("expense");
  const [pieMode, setPieMode] = useState<Extract<ChartMode, "expense" | "income">>("expense");
  const [rangeMode, setRangeMode] = useState<RangeMode>("monthly");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCatName, setSelectedCatName] = useState<string | null>(null);
  const [selectedChartMonth, setSelectedChartMonth] = useState<string | null>(null);
  const [selectedPieName, setSelectedPieName] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [chartError, setChartError] = useState("");
  const [retry, setRetry] = useState(0);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadMember = async () => {
      setMemberError("");
      try {
        const response = await fetchReference("/api/members", { signal: controller.signal });
        if (!response.ok) throw new Error("アカウントを読み込めませんでした。");
        const members = await response.json() as { id: string }[];
        if (!Array.isArray(members)) throw new Error("アカウントを読み込めませんでした。");
        if (controller.signal.aborted) return;
        const savedMemberId = localStorage.getItem(SELECTED_MEMBER_ID_KEY);
        setSelectedMemberId(members.find(member => member.id === savedMemberId)?.id ?? members[0]?.id ?? null);
        setMemberReady(true);
      } catch (e) { if (!controller.signal.aborted) setMemberError(e instanceof Error ? e.message : "読み込めませんでした。"); }
    };
    void loadMember(); return () => controller.abort();
  }, [memberRetry]);

  useEffect(() => {
    if (!memberReady) return;
    const controller = new AbortController();
    const load = async () => {
      setStatsLoading(true); setStatsError("");
      try {
        const current = await fetchMonthly(month, viewMode === "personal" ? selectedMemberId : null, controller.signal);
        if (controller.signal.aborted) return;
        setStats(current); setStatsKey(`${month}:${viewMode}:${selectedMemberId}`);
      } catch (e) { if (!controller.signal.aborted) setStatsError(e instanceof Error ? e.message : "集計を読み込めませんでした。"); }
      finally { if (!controller.signal.aborted) setStatsLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [memberReady, month, selectedMemberId, viewMode, retry]);

  useEffect(() => {
    if (!memberReady) return;
    const controller = new AbortController();
    const load = async () => {
      setChartLoading(true); setChartError("");
      const currentMonth = japanToday().slice(0, 7), thisYear = Number(currentMonth.slice(0, 4));
      const from = rangeMode === "yearly" ? `${thisYear - 9}-01` : selectedYear === null ? monthAt(currentMonth, -11) : `${selectedYear}-01`;
      const to = rangeMode === "monthly" && selectedYear !== null && selectedYear !== thisYear ? `${selectedYear}-12` : currentMonth;
      try {
        const results = await fetchMonthlyHistory(from, to, viewMode === "personal" ? selectedMemberId : null, controller.signal);
        if (controller.signal.aborted) return;
        if (rangeMode === "monthly") {
          setMonthBars(results.map(result => ({ month: result.month, label: `${Number(result.month.slice(5))}月`, expense: result.total, income: result.income, balance: result.income - result.total, categories: toCategoryMap(result.categories), incomeCategories: toCategoryMap(filterIncomeCategories(result.incomeCategories)) })));
        } else {
          const byYear = new Map<string, MonthBar>();
          for (const result of results) {
            const year = result.month.slice(0, 4), row = byYear.get(year) ?? { month: year, label: year, expense: 0, income: 0, balance: 0, categories: {}, incomeCategories: {} };
            row.expense += result.total; row.income += result.income; row.balance += result.income - result.total;
            for (const category of result.categories) row.categories[category.name] = (row.categories[category.name] ?? 0) + category.total;
            for (const category of filterIncomeCategories(result.incomeCategories)) row.incomeCategories[category.name] = (row.incomeCategories[category.name] ?? 0) + category.total;
            byYear.set(year, row);
          }
          setMonthBars([...byYear.values()]);
        }
      } catch (e) { if (!controller.signal.aborted) { setMonthBars([]); setChartError(e instanceof Error ? e.message : "グラフを読み込めませんでした。"); } }
      finally { if (!controller.signal.aborted) setChartLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [memberReady, rangeMode, selectedMemberId, selectedYear, viewMode, retry]);

  useEffect(() => {
    const shouldScrollRight =
      rangeMode === "yearly" ||
      (rangeMode === "monthly" &&
        (selectedYear === null || selectedYear === new Date().getFullYear()));

    if (!chartLoading && shouldScrollRight) {
      const el = chartScrollRef.current;
      if (el) {
        el.scrollLeft = el.scrollWidth;
      }
    }
  }, [chartLoading, rangeMode, selectedYear]);

  const balance = (stats?.income ?? 0) - (stats?.total ?? 0);
  const categoryKind: CategoryKind = chartMode === "income" ? "income" : "expense";
  const categoryEnabled = chartMode === "expense" || chartMode === "income";
  const categoryNames = useMemo(() => {
    const totals = new Map<string, number>();
    for (const bar of monthBars) {
      for (const [name, amount] of Object.entries(getBarCategories(bar, chartMode))) {
        totals.set(name, (totals.get(name) ?? 0) + amount);
      }
    }
    return getChartCategoryNames(totals, categoryKind);
  }, [categoryKind, chartMode, monthBars]);

  const chartData = monthBars.map((bar) => {
    const value =
      selectedCatName && categoryEnabled
        ? getBarCategories(bar, chartMode)[selectedCatName] ?? 0
        : chartMode === "expense"
          ? bar.expense
          : chartMode === "income"
            ? bar.income
            : bar.balance;

    return {
      ...bar,
      value,
      active: (rangeMode === "yearly" ? month.slice(0, 4) : month) === bar.month,
      selected: selectedChartMonth === bar.month,
    };
  });
  const hasSelectedChartMonth = chartData.some((item) => item.selected);

  const maxAbs = Math.max(...chartData.map((item) => Math.abs(item.value)), 1);
  const yDomain =
    chartMode === "balance"
      ? [-maxAbs, maxAbs]
      : [0, Math.max(...chartData.map((item) => item.value), 1)];
  const pieTabData =
    pieMode === "income"
      ? filterIncomeCategories(stats?.incomeCategories ?? [])
      : stats?.categories ?? [];
  const pieTotal = pieTabData.reduce((sum, category) => sum + category.total, 0);

  const goToPrevMonth = () => setMonth(format(subMonths(new Date(`${month}-01`), 1), "yyyy-MM"));
  const goToNextMonth = () => setMonth(format(addMonths(new Date(`${month}-01`), 1), "yyyy-MM"));

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="px-2 text-3xl font-light text-[#245f8b]"
        >
          ‹
        </button>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="h-10 rounded-lg border-0 bg-transparent px-3 text-center text-xl font-bold text-[#253b4b] outline-none"
        />
        <button
          type="button"
          onClick={goToNextMonth}
          className="px-2 text-3xl font-light text-[#245f8b]"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-2 rounded-lg bg-[#e2e8ed] p-0.5">
        <button
          type="button"
          onClick={() => setViewMode("personal")}
          className={`rounded-md py-1.5 text-xs font-bold ${
            viewMode === "personal" ? "bg-[#dbe8f2] text-[#1f4f73] shadow-sm" : "text-[#72818b]"
          }`}
        >
          自分
        </button>
        <button
          type="button"
          onClick={() => setViewMode("family")}
          className={`rounded-md py-1.5 text-xs font-bold ${
            viewMode === "family" ? "bg-[#dbe8f2] text-[#1f4f73] shadow-sm" : "text-[#72818b]"
          }`}
        >
          家族全員
        </button>
      </div>

      {memberError ? <div role="alert" className="rounded-xl border border-border bg-white p-4 text-sm"><p>{memberError}</p><button type="button" onClick={() => setMemberRetry(value => value + 1)} className="mt-2 text-primary underline">再読み込み</button></div> : statsError ? <div role="alert" className="rounded-xl border border-border bg-white p-4 text-sm"><p>{statsError}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-primary underline">再読み込み</button></div> : !memberReady || statsLoading || stats === null || statsKey !== `${month}:${viewMode}:${selectedMemberId}` ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <>
          <Card>
            <CardContent className="px-3 py-2">
              <p className="text-[10px] leading-none text-[#72818b]">収支</p>
              <p
                className="text-2xl font-extrabold leading-tight"
                style={{ color: balance > 0 ? "#3f6f51" : balance < 0 ? "#c1432f" : "#253b4b" }}
              >
                {formatBalance(balance)}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="px-3 py-2">
                <p className="text-[10px] leading-none text-[#72818b]">収入</p>
                <p className="text-base font-bold leading-tight text-[#3f6f51]">{formatYen(stats?.income ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-3 py-2">
                <p className="text-[10px] leading-none text-[#72818b]">支出</p>
                <p className="text-base font-bold leading-tight text-[#c1432f]">{formatYen(stats?.total ?? 0)}</p>
              </CardContent>
            </Card>
          </div>

          <MonthlyBudgetPanel key={`budget:${month}:${viewMode}:${selectedMemberId}`} month={month} memberId={viewMode === "personal" ? selectedMemberId : null} total={stats.total} categories={stats.categories} />

          <div className="flex flex-col gap-3">
          <Card className="order-1 overflow-visible">
            <CardContent className="space-y-3 overflow-visible p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#253b4b]">推移グラフ</p>
                <div className="flex rounded-lg bg-[#edf2f6] p-0.5">
                  {(["monthly", "yearly"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setRangeMode(mode);
                        setSelectedYear(null);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                        rangeMode === mode ? "bg-[#245f8b] text-white" : "text-[#72818b]"
                      }`}
                    >
                      {mode === "monthly" ? "月別" : "年別"}
                    </button>
                  ))}
                </div>
              </div>

              {rangeMode === "monthly" ? (
                <div className="relative flex min-h-8 items-center justify-center">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedYear((year) => (year ?? new Date().getFullYear()) - 1)}
                      className="p-1 text-lg text-[#245f8b]"
                    >
                      ‹
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowYearPicker((value) => !value)}
                        className="min-w-24 bg-transparent text-center text-[15px] font-bold text-[#245f8b] outline-none"
                      >
                        {selectedYear === null ? "過去12ヶ月" : `${selectedYear}年`}
                      </button>
                      {showYearPicker ? (
                        <div className="absolute left-1/2 top-8 z-50 w-36 -translate-x-1/2 rounded-[10px] border border-[#e2e8ed] bg-white p-2 text-sm shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedYear(null);
                              setShowYearPicker(false);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left font-semibold text-[#245f8b] hover:bg-[#e9f1f7]"
                          >
                            過去12ヶ月
                          </button>
                          {Array.from({ length: 10 }, (_, index) => new Date().getFullYear() - index).map(
                            (year) => (
                              <button
                                key={year}
                                type="button"
                                onClick={() => {
                                  setSelectedYear(year);
                                  setShowYearPicker(false);
                                }}
                                className="w-full rounded-lg px-3 py-2 text-left font-semibold text-[#415665] hover:bg-[#f4f6f8]"
                              >
                                {year}年
                              </button>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedYear((year) => {
                          const next = (year ?? new Date().getFullYear()) + 1;
                          return next >= new Date().getFullYear() ? null : next;
                        })
                      }
                      className="p-1 text-lg text-[#245f8b]"
                    >
                      ›
                    </button>
                  </div>
                  {selectedYear !== null ? (
                    <button
                      type="button"
                      onClick={() => setSelectedYear(null)}
                      className="absolute right-0 rounded-md border border-[#c8dbe8] bg-[#e9f1f7] px-2.5 py-1 text-xs font-bold text-[#245f8b]"
                    >
                      最新
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-1.5">
                {(["expense", "income", "balance"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setChartMode(mode);
                      setSelectedCatName(null);
                    }}
                    className={`rounded-lg py-1.5 text-[11px] font-semibold ${
                      chartMode === mode ? "bg-[#245f8b] text-white" : "bg-[#edf2f6] text-[#72818b]"
                    }`}
                  >
                    {CHART_CONFIGS[mode].label}
                  </button>
                ))}
              </div>

              <div ref={chartScrollRef} className="h-48 overflow-x-auto">
                {chartError ? <div role="alert" className="py-10 text-center text-sm"><p>{chartError}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-primary underline">再読み込み</button></div> : chartLoading ? (
                  <LoadingSpinner className="h-full" />
                ) : (
                  <div className="h-full min-w-[560px]">
                    <DashboardTrendPlot data={chartData} domain={yDomain} mode={chartMode} color={CHART_CONFIGS[chartMode].active} selected={hasSelectedChartMonth} fadeUnselected={rangeMode === "monthly" && selectedYear === null} onSelect={month => setSelectedChartMonth(current => current === month ? null : month)} />
                  </div>
                )}
              </div>

              {categoryEnabled ? (
                <div className="relative z-20">
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker((value) => !value)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#e2e8ed] bg-[#f4f6f8] px-3 py-2 text-left text-xs font-semibold text-[#415665]"
                  >
                    <span className="truncate">カテゴリ：{selectedCatName ?? "すべて"}</span>
                    <ChevronDown className="h-4 w-4 text-[#72818b]" />
                  </button>
                  {showCategoryPicker ? (
                    <div className="absolute inset-x-0 top-11 z-50 max-h-64 overflow-auto rounded-[10px] border border-[#e2e8ed] bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCatName(null);
                          setShowCategoryPicker(false);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#245f8b] hover:bg-[#e9f1f7]"
                      >
                        すべて
                      </button>
                      {categoryNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedCatName(name);
                            setShowCategoryPicker(false);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#415665] hover:bg-[#f4f6f8]"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="order-2">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#253b4b]">カテゴリ別</p>
                <div className="flex rounded-lg bg-[#e2e8ed] p-0.5">
                  {(["expense", "income"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPieMode(mode);
                        setSelectedPieName(null);
                      }}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-bold ${
                        pieMode === mode ? "bg-[#245f8b] text-white" : "text-[#72818b]"
                      }`}
                    >
                      {mode === "expense" ? "支出" : "収入"}
                    </button>
                  ))}
                </div>
              </div>
              {pieTabData.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-[220px,1fr]">
                  <div className="h-[220px]">
                    <DashboardPiePlot categories={pieTabData} total={pieTotal} selectedName={selectedPieName} onSelect={name => setSelectedPieName(current => current === name ? null : name)} />
                  </div>
                  <div className="space-y-2">
                    {pieTabData.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() =>
                          setSelectedPieName((current) =>
                            current === category.name ? null : category.name
                          )
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-md text-left text-sm ${
                          selectedPieName && selectedPieName !== category.name ? "opacity-40" : ""
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2 text-[#415665]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: categoryColor(category.name) }}
                          />
                          <span className="truncate">{category.name}</span>
                        </span>
                        <span className="shrink-0 text-right font-semibold text-[#253b4b]">
                          {formatYen(category.total)}
                          <span className="ml-1 text-xs text-[#72818b]">
                            {getSharePercent(category.total, pieTotal)}%
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-[#8a97a1]">データなし</p>
              )}
            </CardContent>
          </Card>

          <CategoryMonthlyReport key={`report:${month}:${viewMode}:${selectedMemberId}`} current={stats} memberId={viewMode === "personal" ? selectedMemberId : null} />
          </div>
        </>
      )}
    </div>
  );
}
