import { describe, expect, it } from "vitest";
import { formatShortYen, getSharePercent } from "@/lib/chart-format";

describe("chart-format", () => {
  it("formats yen values for compact chart labels", () => {
    expect(formatShortYen(0)).toBe("¥0");
    expect(formatShortYen(980)).toBe("¥980");
    expect(formatShortYen(12345)).toBe("¥1.2万");
    expect(formatShortYen(-98765)).toBe("¥9.9万");
  });

  it("calculates rounded share percentages", () => {
    expect(getSharePercent(25, 100)).toBe(25);
    expect(getSharePercent(1, 3)).toBe(33);
    expect(getSharePercent(10, 0)).toBe(0);
  });
});
