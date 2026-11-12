/** Keep category hues recognizable, with restrained saturation and readable text. */
export function mutedColor(value?: string | null): string {
  if (!value || !/^#[\da-f]{6}$/i.test(value)) return "#748172";
  const rgb = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min;
  const originalLightness = (max + min) / 2;
  let hue = 0;
  if (delta) {
    if (max === rgb[0]) hue = ((rgb[1] - rgb[2]) / delta) % 6;
    else if (max === rgb[1]) hue = (rgb[2] - rgb[0]) / delta + 2;
    else hue = (rgb[0] - rgb[1]) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = delta ? Math.min(0.18, delta / (1 - Math.abs(2 * originalLightness - 1))) : 0;
  const lightness = Math.min(0.42, Math.max(0.34, originalLightness));
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1)), m = lightness - chroma / 2;
  const channels = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return "#" + channels.map(c => Math.round((c + m) * 255).toString(16).padStart(2, "0")).join("");
}
export function categoryChipStyle(color: string | undefined, selected: boolean) {
  return { color: selected ? "#285d4d" : mutedColor(color), borderColor: selected ? "#6f8d77" : "#dce3d7", backgroundColor: selected ? "#eaf1e9" : "#fafbf7" };
}
