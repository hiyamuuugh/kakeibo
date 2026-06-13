# kakeibo (Web)

PayPay・各種クレジットカード・銀行のCSVをインポートして支出を管理する家計簿アプリのWeb版。
モバイル版は [kakeibo-app](https://github.com/hiyamuuugh/kakeibo-app)。

- 本番: https://kakeibo-mu-two.vercel.app

## 技術スタック

| 分類 | 採用技術 |
|------|----------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| スタイル | Tailwind CSS + shadcn/ui (base-ui ベース) |
| DB / ORM | Neon (PostgreSQL) + Prisma 7 |
| グラフ / CSV | recharts / papaparse / react-dropzone |
| 日付 | date-fns |
| テスト | vitest |

## セットアップ

```bash
npm install
cp .env.example .env   # 無ければ手動作成。DATABASE_URL(Neon接続文字列)を設定
npm run db:seed        # デフォルトカテゴリを投入
```

> Prisma Client の出力先は `src/generated/prisma`（gitignore済み）。`npm run build` で自動生成される。

## フォルダ構成

```
src/
├── app/                  # App Router
│   ├── api/              # APIルート (transactions, import, stats, members, categories ...)
│   ├── import/           # CSV取込画面
│   ├── transactions/     # 取引一覧
│   └── budgets/          # 予算
├── components/           # UIコンポーネント
├── lib/
│   ├── import/           # CSV取込パーサ (paypay/rakuten/mufg/smbc ...)
│   ├── normalize.ts      # 摘要の正規化
│   └── prisma.ts         # Prismaクライアント
└── generated/prisma/     # Prisma生成物 (gitignore)
```

## ローカルでの確認方法

```bash
npm run dev        # http://localhost:3000
npm test           # vitest
npx tsc --noEmit   # 型チェック
npm run lint       # ESLint
npm run build      # prisma generate + next build (本番と同等)
```

## デプロイ

`master` への push で Vercel が自動ビルド＆本番デプロイ（production branch = master）。
`DATABASE_URL` 等の機密は Vercel/GitHub の環境変数・Secrets で管理する。

## ハマったこと

原因がすぐ分からず切り分けが必要だった事象は GitHub Issue に「詰まりログ」として記録する。
詳細は各Issueを参照。

- [Issues (label: stuck-log)](https://github.com/hiyamuuugh/kakeibo/issues?q=label%3Astuck-log)

## 開発の進め方

- 機能追加・バグ修正はブランチを切ってPR。master直接コミットは禁止、マージはオーナー承認後。
- 詰まった点は上記のとおり stuck-log Issue に記録する（READMEには概要のみ）。
- 使い方・設定・コマンドが変わったら README を必ず更新する。

## 開発に使用したAIモデル

- Claude Opus 4.8 (Claude Code) — SMBC/MUFG取込、非公開分の合計算入、テスト・ビルド整備など (2026-06-13)
