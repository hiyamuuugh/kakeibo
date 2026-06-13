# kakeibo (Web)

PayPay・各種クレジットカード・銀行のCSVをインポートして支出を管理する家計簿アプリのWeb版。
モバイル版は [kakeibo-app](https://github.com/hiyamuuugh/kakeibo-app)。

- 本番: https://kakeibo-mu-two.vercel.app

## 技術スタック

- Next.js 16 + TypeScript + Tailwind CSS
- shadcn/ui (base-ui ベース)
- Prisma 7 + Neon (PostgreSQL)
- recharts / papaparse / react-dropzone / date-fns
- テスト: vitest

## 開発

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npm run build    # prisma generate + next build
```

`.env` に `DATABASE_URL`（Neon接続文字列）が必要。DBシードは `npm run db:seed`。

## CSV取込

`/import` から取込。対応: PayPay / PayPayカード / 楽天カード / 三菱UFJ / 三井住友(SMBC)。
取込ロジックは `src/lib/import/`、APIは `src/app/api/import/<source>/`。

## デプロイ

`master` への push で Vercel が自動ビルド＆本番デプロイ（production branch = master）。

## 開発の進め方（このプロジェクトの運用ルール）

- 機能追加・バグ修正はブランチを切ってPR。master直接コミットは禁止。
- master へのマージはオーナー承認後。
- **詰まった点（原因がすぐ分からず切り分けが必要だった事象）は GitHub Issue に「詰まりログ」として記録する。** READMEには概要のみ、詳細はIssueを参照する。
  - 過去の詰まりログ: [Issues (label: stuck-log)](https://github.com/hiyamuuugh/kakeibo/issues?q=label%3Astuck-log)
- README は変更で使い方・設定・コマンドが変わったら必ず更新する。

## 開発に使用したAIモデル

- Claude Opus 4.8 (Claude Code) — SMBC/MUFG取込、非公開分の合計算入、テスト基盤・ビルド整備など (2026-06-13)
