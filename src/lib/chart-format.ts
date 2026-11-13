export const formatShortAmount = (amount: number) => {
  const rounded = Math.round(Math.abs(amount));

  if (rounded === 0) return "0";
  if (rounded >= 100000000) {
    // Round once before splitting, so 9999.999万 carries into 1億.
    const compact = Math.round(rounded / 1000) * 1000;
    const cho = Math.floor(compact / 1000000000000);
    const oku = Math.floor(compact % 1000000000000 / 100000000);
    const man = compact % 100000000 / 10000;
    return `${cho ? `${cho}兆` : ""}${oku ? `${oku}億` : ""}${man ? `${man}万` : ""}`;
  }
  if (rounded >= 10000) {
    const man = Math.round(rounded / 1000) / 10;
    return `${man.toLocaleString("ja-JP")}万`;
  }

  return rounded.toLocaleString("ja-JP");
};

export const getSharePercent = (amount: number, total: number) => {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 100);
};
