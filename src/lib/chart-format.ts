export const formatShortYen = (amount: number) => {
  const rounded = Math.round(Math.abs(amount));

  if (rounded === 0) return "¥0";
  if (rounded >= 10000) {
    const man = Math.round(rounded / 1000) / 10;
    return `¥${man.toLocaleString("ja-JP")}万`;
  }

  return `¥${rounded.toLocaleString("ja-JP")}`;
};

export const getSharePercent = (amount: number, total: number) => {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 100);
};
