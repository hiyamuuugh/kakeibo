"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { AlertCircle, CheckCircle2, ChevronDown, Info, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  CategoryKind,
  getChartCategoryNames,
  INCOME_CATEGORY_ORDER,
} from "@/lib/category-options";
import { buildMonthlyReport, MonthlyReport } from "@/lib/monthly-report";

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
  expense: { label: "支出", active: "#ef4444", inactive: "#fecaca" },
  income: { label: "収入", active: "#22c55e", inactive: "#bbf7d0" },
  balance: { label: "収支", active: "#3b82f6", inactive: "#bfdbfe" },
};

const REPORT_STYLE: Record<
  MonthlyReport["tone"],
  { bg: string; border: string; accent: string; icon: typeof AlertCircle }
> = {
  alert: { bg: "#fef2f2", border: "#fecaca", accent: "#dc2626", icon: AlertCircle },
  warn: { bg: "#fffbeb", border: "#fde68a", accent: "#d97706", icon: AlertCircle },
  good: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#16a34a", icon: CheckCircle2 },
  neutral: { bg: "#f8fafc", border: "#e2e8f0", accent: "#64748b", icon: Info },
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

const fetchMonthly = async (month: string): Promise<MonthlyStats> => {
  const response = await fetch(`/api/stats/monthly?month=${month}`);
  return (await response.json()) as MonthlyStats;
};

const fetchEarliestMonth = async () => {
  const response = await fetch("/api/stats/range");
  const data = (await response.json()) as { earliestMonth: string | null };
  return data.earliestMonth;
};

const getBarCategories = (bar: MonthBar, chartMode: ChartMode) =>
  chartMode === "income" ? bar.incomeCategories : bar.categories;

export default function Dashboard() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [monthBars, setMonthBars] = useState<MonthBar[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>("expense");
  const [pieMode, setPieMode] = useState<Extract<ChartMode, "expense" | "income">>("expense");
  const [rangeMode, setRangeMode] = useState<RangeMode>("monthly");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCatName, setSelectedCatName] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const loadedRef = useRef(false);
  const loadedMonthRef = useRef(month);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const monthChanged = loadedRef.current && loadedMonthRef.current !== month;
      if (!loadedRef.current || monthChanged) {
        setStatsLoading(true);
      }
      setChartLoading(true);
      const now = new Date();
      const current = await fetchMonthly(month);

      if (rangeMode === "monthly" && selectedYear !== null) {
        const lastMonth = selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;
        const months = Array.from(
          { length: lastMonth },
          (_, index) => `${selectedYear}-${String(index + 1).padStart(2, "0")}`
        );
        const results = await Promise.all(months.map(fetchMonthly));
        if (!active) return;
        setStats(current);
        setMonthBars(
          results.map((result, index) => ({
            month: months[index],
            label: `${index + 1}月`,
            expense: result.total,
            income: result.income,
            balance: result.income - result.total,
            categories: toCategoryMap(result.categories),
            incomeCategories: toCategoryMap(filterIncomeCategories(result.incomeCategories)),
          }))
        );
        loadedMonthRef.current = month;
        loadedRef.current = true;
        setStatsLoading(false);
        setChartLoading(false);
        return;
      }

      const earliestMonth = await fetchEarliestMonth();
      const earliest = earliestMonth ?? format(subMonths(now, 11), "yyyy-MM");
      let cursor = new Date(`${earliest}-01`);
      if (rangeMode === "monthly") {
        const startMin = subMonths(now, 11);
        if (cursor > startMin) cursor = startMin;
      }

      const months: string[] = [];
      while (cursor <= now) {
        months.push(format(cursor, "yyyy-MM"));
        cursor = addMonths(cursor, 1);
      }

      const results = await Promise.all(months.map(fetchMonthly));
      if (!active) return;

      setStats(current);
      if (rangeMode === "monthly") {
        setMonthBars(
          results.map((result, index) => ({
            month: months[index],
            label: format(new Date(`${months[index]}-01`), "M月", { locale: ja }),
            expense: result.total,
            income: result.income,
            balance: result.income - result.total,
            categories: toCategoryMap(result.categories),
            incomeCategories: toCategoryMap(filterIncomeCategories(result.incomeCategories)),
          }))
        );
      } else {
        const byYear = new Map<
          string,
          {
            expense: number;
            income: number;
            categories: Record<string, number>;
            incomeCategories: Record<string, number>;
          }
        >();
        months.forEach((targetMonth, index) => {
          const year = targetMonth.slice(0, 4);
          const result = results[index];
          const acc = byYear.get(year) ?? {
            expense: 0,
            income: 0,
            categories: {},
            incomeCategories: {},
          };
          acc.expense += result.total;
          acc.income += result.income;
          for (const category of result.categories) {
            acc.categories[category.name] = (acc.categories[category.name] ?? 0) + category.total;
          }
          for (const category of filterIncomeCategories(result.incomeCategories)) {
            acc.incomeCategories[category.name] =
              (acc.incomeCategories[category.name] ?? 0) + category.total;
          }
          byYear.set(year, acc);
        });

        const thisYear = now.getFullYear();
        setMonthBars(
          Array.from({ length: 10 }, (_, index) => thisYear - 9 + index).map((year) => {
            const value = byYear.get(String(year)) ?? {
              expense: 0,
              income: 0,
              categories: {},
              incomeCategories: {},
            };
            return {
              month: String(year),
              label: String(year),
              expense: value.expense,
              income: value.income,
              balance: value.income - value.expense,
              categories: value.categories,
              incomeCategories: value.incomeCategories,
            };
          })
        );
      }

      loadedMonthRef.current = month;
      loadedRef.current = true;
      setStatsLoading(false);
      setChartLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [month, rangeMode, selectedYear]);

  const balance = (stats?.income ?? 0) - (stats?.total ?? 0);
  const report = stats
    ? buildMonthlyReport(
        stats,
        rangeMode === "monthly" ? monthBars.slice(0, -1).map((bar) => bar.expense) : []
      )
    : null;
  const reportStyle = report ? REPORT_STYLE[report.tone] : null;
  const ReportIcon = reportStyle?.icon;
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
    };
  });

  const maxAbs = Math.max(...chartData.map((item) => Math.abs(item.value)), 1);
  const yDomain =
    chartMode === "balance"
      ? [-maxAbs, maxAbs]
      : [0, Math.max(...chartData.map((item) => item.value), 1)];
  const pieTabData =
    pieMode === "income"
      ? filterIncomeCategories(stats?.incomeCategories ?? [])
      : stats?.categories ?? [];

  const goToPrevMonth = () => setMonth(format(subMonths(new Date(`${month}-01`), 1), "yyyy-MM"));
  const goToNextMonth = () => setMonth(format(addMonths(new Date(`${month}-01`), 1), "yyyy-MM"));

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="px-2 text-3xl font-light text-[#3b82f6]"
        >
          ‹
        </button>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="h-10 rounded-lg border-0 bg-transparent px-3 text-center text-xl font-bold text-[#1f2937] outline-none"
        />
        <button
          type="button"
          onClick={goToNextMonth}
          className="px-2 text-3xl font-light text-[#3b82f6]"
        >
          ›
        </button>
      </div>

      {statsLoading || stats === null ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-[11px] text-[#6b7280]">収支</p>
              <p
                className="text-4xl font-extrabold"
                style={{ color: balance > 0 ? "#22c55e" : balance < 0 ? "#ef4444" : "#1f2937" }}
              >
                {formatBalance(balance)}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-4">
                <p className="mb-1 text-[11px] text-[#6b7280]">収入</p>
                <p className="text-xl font-bold text-[#22c55e]">{formatYen(stats?.income ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="mb-1 text-[11px] text-[#6b7280]">支出</p>
                <p className="text-xl font-bold text-[#ef4444]">{formatYen(stats?.total ?? 0)}</p>
              </CardContent>
            </Card>
          </div>

          {report && reportStyle && ReportIcon ? (
            <div
              className="space-y-1.5 rounded-[12px] border p-3.5"
              style={{ backgroundColor: reportStyle.bg, borderColor: reportStyle.border }}
            >
              <div className="flex items-center gap-1.5">
                <ReportIcon className="h-[18px] w-[18px]" style={{ color: reportStyle.accent }} />
                <p className="text-[11px] font-bold text-[#6b7280]">Monthly Report</p>
              </div>
              <p className="text-[15px] font-extrabold" style={{ color: reportStyle.accent }}>
                {report.headline}
              </p>
              <p className="text-[13px] leading-[19px] text-[#374151]">{report.advice}</p>
            </div>
          ) : null}

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#1f2937]">推移グラフ</p>
                <div className="flex rounded-lg bg-[#f3f4f6] p-0.5">
                  {(["monthly", "yearly"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setRangeMode(mode);
                        setSelectedYear(null);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                        rangeMode === mode ? "bg-[#3b82f6] text-white" : "text-[#6b7280]"
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
                      className="p-1 text-lg text-[#3b82f6]"
                    >
                      ‹
                    </button>
                    <select
                      value={selectedYear ?? "recent"}
                      onChange={(event) =>
                        setSelectedYear(
                          event.target.value === "recent" ? null : Number(event.target.value)
                        )
                      }
                      className="min-w-24 bg-transparent text-center text-[15px] font-bold text-[#3b82f6] outline-none"
                    >
                      <option value="recent">過去12ヶ月</option>
                      {Array.from({ length: 10 }, (_, index) => new Date().getFullYear() - index).map(
                        (year) => (
                          <option key={year} value={year}>
                            {year}年
                          </option>
                        )
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedYear((year) => {
                          const next = (year ?? new Date().getFullYear()) + 1;
                          return next >= new Date().getFullYear() ? null : next;
                        })
                      }
                      className="p-1 text-lg text-[#3b82f6]"
                    >
                      ›
                    </button>
                  </div>
                  {selectedYear !== null ? (
                    <button
                      type="button"
                      onClick={() => setSelectedYear(null)}
                      className="absolute right-0 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-xs font-bold text-[#3b82f6]"
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
                      chartMode === mode ? "bg-[#3b82f6] text-white" : "bg-[#f3f4f6] text-[#6b7280]"
                    }`}
                  >
                    {CHART_CONFIGS[mode].label}
                  </button>
                ))}
              </div>

              <div className="h-48 overflow-x-auto">
                {chartLoading ? (
                  <LoadingSpinner className="h-full" />
                ) : (
                  <div className="h-full min-w-[560px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: -20, right: 8, top: 18, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <YAxis
                          domain={yDomain}
                          tickFormatter={(value) => `¥${Math.round(Number(value) / 1000)}k`}
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                        />
                        {chartMode === "balance" ? <ReferenceLine y={0} stroke="#d1d5db" /> : null}
                        <Tooltip
                          formatter={(value) =>
                            typeof value === "number" ? formatBalance(value) : String(value)
                          }
                        />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                          {chartData.map((item) => (
                            <Cell
                              key={item.month}
                              fill={
                                chartMode === "balance"
                                  ? item.value < 0
                                    ? "#ef4444"
                                    : "#22c55e"
                                  : item.active
                                    ? CHART_CONFIGS[chartMode].active
                                    : CHART_CONFIGS[chartMode].inactive
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {categoryEnabled ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker((value) => !value)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-xs font-semibold text-[#374151]"
                  >
                    <span className="truncate">カテゴリ：{selectedCatName ?? "すべて"}</span>
                    <ChevronDown className="h-4 w-4 text-[#6b7280]" />
                  </button>
                  {showCategoryPicker ? (
                    <div className="absolute inset-x-0 top-11 z-10 max-h-64 overflow-auto rounded-[10px] border border-[#e5e7eb] bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCatName(null);
                          setShowCategoryPicker(false);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#3b82f6] hover:bg-[#eff6ff]"
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
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
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

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1f2937]">カテゴリ別</p>
                <div className="flex rounded-lg bg-[#e5e7eb] p-0.5">
                  {(["expense", "income"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPieMode(mode)}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-bold ${
                        pieMode === mode ? "bg-[#3b82f6] text-white" : "text-[#6b7280]"
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
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieTabData}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={78}
                        >
                          {pieTabData.map((category) => (
                            <Cell key={category.id} fill={category.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            typeof value === "number" ? formatYen(value) : String(value)
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {pieTabData.map((category) => (
                      <div key={category.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-[#374151]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: category.color }}
                          />
                          <span className="truncate">{category.name}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-[#1f2937]">
                          {formatYen(category.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-[#9ca3af]">データなし</p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 pb-2 pt-1 text-xs font-semibold text-[#9ca3af]">
            <TrendingUp className="h-3.5 w-3.5" />
            {stats?.count ?? 0}件の取引
          </div>
        </>
      )}
    </div>
  );
}
