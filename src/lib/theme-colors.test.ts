import { describe, expect, it } from "vitest";
import { paletteColor, categoryChipStyle, themePalette } from "./theme-colors";
function contrastOnWhite(hex: string) {
  const linear = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 1.05 / (linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 + 0.05);
}
describe("shared earth-tone palette", () => {
  it.each(["#ff0000", "#00ff00", "#0000ff", "#f59e0b", "#db2777", "#8b5cf6"])("uses a palette color for %s instead of desaturating its original hue", value => {
    const output = paletteColor(value);
    expect(Object.values(themePalette)).toContain(output);
    expect(contrastOnWhite(output)).toBeGreaterThan(4.5);
  });
  it("keeps the chosen colors unchanged instead of lowering their saturation", () => {
    for (const color of Object.values(themePalette)) expect(paletteColor(color)).toBe(color);
  });
  it("uses one selection palette and tolerates invalid saved colors", () => {
    expect(categoryChipStyle("#ff0000", true)).toEqual(categoryChipStyle("#00ff00", true));
    expect(paletteColor(null)).toBe(themePalette.green);
    expect(paletteColor("invalid")).toBe(themePalette.green);
  });
});
