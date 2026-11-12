/** Presentation colors for category lists and their chart legends only. */
const categoryColors: Record<string, string> = {
  食費: "#58734d",
  日用品: "#49766a",
  子ども: "#8a7054",
  お小遣い: "#686d4a",
  交通費: "#506b7c",
  娯楽: "#7d6755",
  医療: "#88655b",
  固定費: "#657369",
  その他: "#77715e",
  未分類: "#748172",
  給料: "#486a86",
  補助金: "#647e6b",
};
export const categoryColor = (name: string) => categoryColors[name] ?? "#647568";
