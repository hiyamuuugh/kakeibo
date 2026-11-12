import { describe, expect, it } from "vitest";
import { mutedColor, categoryChipStyle } from "./theme-colors";
function colorStats(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(...rgb), min = Math.min(...rgb), lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  const linear = rgb.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return { saturation, contrastOnWhite: 1.05 / (luminance + 0.05) };
}
describe("quiet category colors", () => {
  it.each(["#ff0000", "#00ff00", "#0000ff", "#f59e0b", "#db2777", "#8b5cf6"])("reduces %s saturation while retaining readable contrast", value => {
    const output = mutedColor(value);
    expect(colorStats(output).saturation).toBeLessThan(0.2);
    expect(colorStats(output).contrastOnWhite).toBeGreaterThan(4.5);
  });
  it("uses one consistent selection palette and tolerates invalid saved colors", () => {
    expect(categoryChipStyle("#ff0000", true)).toEqual(categoryChipStyle("#00ff00", true));
    expect(mutedColor(null)).toMatch(/^#[a-f0-9]{6}$/);
    expect(mutedColor("invalid")).toBe(mutedColor(null));
  });
});
