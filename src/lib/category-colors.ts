/** Distinct, restrained presentation colors for category controls, lists and legends. */
const categoryColors: Record<string, string> = {
  食費: "#4f732f", 日用品: "#1e756f", 子ども: "#96651a", お小遣い: "#71498b",
  交通費: "#285f8f", 娯楽: "#a04d2c", 医療: "#8a455d", 固定費: "#385c75",
  その他: "#7b5d2e", 未分類: "#58715c", 給料: "#226589", 補助金: "#66762f",
};
const extraColors = Object.values(categoryColors);
export function categoryColor(name: string): string {
  if (Object.hasOwn(categoryColors, name)) return categoryColors[name];
  const hash = [...name].reduce((value, char) => (value * 31 + char.codePointAt(0)!) >>> 0, 0);
  return extraColors[hash % extraColors.length];
}
export function categoryChoiceStyle(name: string, selected: boolean) {
  const color = categoryColor(name);
  return { color, borderColor: selected ? color : `${color}55`, backgroundColor: selected ? `${color}1f` : "#ffffff" };
}
