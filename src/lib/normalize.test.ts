import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("半角カタカナを全角に変換する", () => {
    expect(normalize("ｻﾐｯﾄﾈｯﾄｽｰﾊﾟｰ")).toBe("サミットネットスーパー");
  });

  it("濁点・半濁点の結合を処理する", () => {
    expect(normalize("ｼﾞｪﾙ")).toBe("ジェル");
    expect(normalize("ﾊﾟﾝ")).toBe("パン");
  });

  it("全角英数を半角に変換する", () => {
    expect(normalize("Ｓｕｉｃａ")).toBe("suica");
    expect(normalize("１２３")).toBe("123");
  });

  it("小文字化する", () => {
    expect(normalize("Suica")).toBe("suica");
    expect(normalize("PAYPAY")).toBe("paypay");
  });

  it("通常の全角カタカナはそのまま（小文字化のみ）", () => {
    expect(normalize("スターバックス")).toBe("スターバックス");
  });

  it("混在文字列を正規化する", () => {
    // 半角カナ「ｻﾐｯﾄ」+ 全角英字「ネットスーパー」の混在
    expect(normalize("ｻﾐｯﾄネットスーパー")).toBe("サミットネットスーパー");
  });

  it("空白を除去する（区切られた摘要をルールと一致させる）", () => {
    expect(normalize("振込　ｼﾞﾄﾞｳﾃｱﾃ ｺﾀﾞｲﾗｼ")).toBe("振込ジドウテアテコダイラシ");
    expect(normalize("振込　ｼﾞﾄﾞｳﾃｱﾃ ｺﾀﾞｲﾗｼ")).toContain(normalize("ジドウテアテコダイラシ"));
  });
});
