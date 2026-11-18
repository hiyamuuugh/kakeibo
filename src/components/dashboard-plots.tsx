"use client";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatShortAmount, getSharePercent } from "@/lib/chart-format";
import { categoryColor } from "@/lib/category-colors";
const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;
const formatBalance = (amount: number) => amount === 0 ? "¥0" : `${amount > 0 ? "+" : "-"}${formatYen(Math.abs(amount))}`;
const getBalanceColor = (amount: number) => amount > 0 ? "#3f6f51" : amount < 0 ? "#c1432f" : "#245f8b";
const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) => {
  if (!active || !payload?.[0] || typeof payload[0].value !== "number") {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#e2e8ed] bg-white px-3 py-2 text-xs shadow">
      <p className="font-semibold text-[#415665]">{label}</p>
      <p className="mt-1 font-bold text-[#253b4b]">{formatBalance(payload[0].value)}</p>
    </div>
  );
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number.NaN;
};

const BarValueLabel = (props: unknown) => {
  const { x, y, width, value } = props as {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    value?: number | string;
  };
  const labelX = toNumber(x);
  const labelY = toNumber(y);
  const labelWidth = toNumber(width);
  const labelHeight = toNumber((props as { height?: number | string }).height);
  const amount = toNumber(value);

  if (
    !Number.isFinite(labelX) ||
    !Number.isFinite(labelY) ||
    !Number.isFinite(labelWidth) ||
    !Number.isFinite(labelHeight) ||
    !Number.isFinite(amount) ||
    amount === 0
  ) {
    return null;
  }

  return (
    <text
      x={labelX + labelWidth / 2}
      y={amount < 0 ? labelY + labelHeight + 12 : labelY - 5}
      textAnchor="middle"
      className="fill-[#415665] text-[10px] font-bold"
    >
      {amount < 0 ? `-${formatShortAmount(amount)}` : formatShortAmount(amount)}
    </text>
  );
};

const PieTooltip = ({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  total: number;
}) => {
  if (!active || !payload?.[0] || typeof payload[0].value !== "number") {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#e2e8ed] bg-white px-3 py-2 text-xs shadow">
      <p className="font-semibold text-[#415665]">{payload[0].name}</p>
      <p className="mt-1 font-bold text-[#253b4b]">
        {formatYen(payload[0].value)} / {getSharePercent(payload[0].value, total)}%
      </p>
    </div>
  );
};


export function DashboardTrendPlot({ data, domain, mode, color, selected, fadeUnselected, onSelect }: {
  data: { month: string; label: string; value: number; active: boolean; selected: boolean }[];
  domain: number[]; mode: "expense" | "income" | "balance"; color: string; selected: boolean; fadeUnselected: boolean; onSelect: (month: string) => void;
}) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: -20, right: 8, top: 28, bottom: 18 }}>
    <CartesianGrid vertical={false} stroke="#edf2f6" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a97a1" }} /><YAxis domain={domain} tickFormatter={value => formatShortAmount(Number(value))} tick={{ fontSize: 10, fill: "#8a97a1" }} />
    {mode === "balance" && <ReferenceLine y={0} stroke="#cbd5de" />}<Tooltip content={<ChartTooltip />} cursor={false} /><Bar dataKey="value" radius={[3, 3, 0, 0]}><LabelList dataKey="value" content={BarValueLabel} />{data.map(item => <Cell key={item.month} fill={mode === "balance" ? getBalanceColor(item.value) : color} opacity={selected ? item.selected ? 1 : 0.28 : fadeUnselected ? item.active ? 1 : 0.28 : 1} onClick={() => onSelect(item.month)} className="cursor-pointer" />)}</Bar>
  </BarChart></ResponsiveContainer>;
}
export function DashboardPiePlot({ categories, total, selectedName, onSelect }: { categories: { id: string; name: string; total: number }[]; total: number; selectedName: string | null; onSelect: (name: string | null) => void }) {
  return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={78} onClick={(data: unknown) => onSelect((data as { name?: string }).name ?? null)}>{categories.map(category => <Cell key={category.id} fill={categoryColor(category.name)} opacity={selectedName && selectedName !== category.name ? 0.28 : 1} className="cursor-pointer" />)}</Pie><Tooltip content={<PieTooltip total={total} />} /></PieChart></ResponsiveContainer>;
}
