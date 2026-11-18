/** Nice bounds based on only the visible time window; values remain absolute yen. */
export function cashFlowAxis(values: number[]) {
  const finite = values.filter(Number.isFinite);
  const min = finite.length ? Math.min(...finite) : 0, max = finite.length ? Math.max(...finite) : 0;
  const span = Math.max(max - min, 10000);
  const padding = span * 0.08;
  const rawStep = (span + padding * 2) / 4;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map(value => value * power).find(value => value >= rawStep)!;
  const low = Math.floor((min - padding) / step) * step;
  const high = Math.ceil((max + padding) / step) * step;
  const ticks = Array.from({ length: Math.round((high - low) / step) + 1 }, (_, i) => low + step * i);
  return { domain: [low, high] as [number, number], ticks };
}
export function visibleCashFlowRange(scrollLeft: number, viewport: number, width: number, count: number) {
  if (count < 2) return { start: 0, end: Math.max(0, count - 1) };
  const plotWidth = Math.max(1, width - 24);
  return { start: Math.max(0, Math.floor(scrollLeft / plotWidth * (count - 1)) - 1), end: Math.min(count - 1, Math.ceil((scrollLeft + viewport) / plotWidth * (count - 1)) + 1) };
}

/** Keep compact ticks for a narrow window around a large absolute balance. */
export function cashFlowAxisOffset(domain: [number, number], zoomed: boolean) {
  return zoomed && Math.max(Math.abs(domain[0]), Math.abs(domain[1])) >= 100000000 && domain[1] - domain[0] < 100000000 ? domain[0] : 0;
}
