/** Distinct, restrained presentation colors for category controls, lists and legends. */
const categoryColors: Record<string, string> = {
  食費: "#587343", 日用品: "#397370", 子ども: "#8b692f", お小遣い: "#756085",
  交通費: "#426e91", 娯楽: "#975b40", 医療: "#8a5c72", 固定費: "#52616f",
  その他: "#796949", 未分類: "#68756c", 給料: "#3f7190", 補助金: "#68713e",
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
