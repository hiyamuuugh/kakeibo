/** A shared earth-tone palette: choose colors directly instead of reducing saturation. */
export const themePalette = {
  green: "#285d4d",
  forest: "#3f6849",
  olive: "#6f6b35",
  brown: "#82582f",
  brick: "#874b35",
  slate: "#385b65",
  walnut: "#6d583d",
} as const;

export function paletteColor(value?: string | null): string {
  if (!value || !/^#[\da-f]{6}$/i.test(value)) return themePalette.green;
  const hex = value.toLowerCase();
  if (Object.values(themePalette).some(color => color === hex)) return hex;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (delta < 0.05) return themePalette.walnut;
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 25 || hue >= 330) return themePalette.brick;
  if (hue < 55) return themePalette.brown;
  if (hue < 95) return themePalette.olive;
  if (hue < 165) return themePalette.forest;
  if (hue < 260) return themePalette.slate;
  return themePalette.walnut;
}
export function categoryChipStyle(color: string | undefined, selected: boolean) {
  return { color: selected ? themePalette.green : paletteColor(color), borderColor: selected ? "#6f8d77" : "#dce3d7", backgroundColor: selected ? "#eaf1e9" : "#fafbf7" };
}
