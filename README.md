# kakeibo

家族で使うためのブラウザ家計簿アプリです。取引一覧、月別ダッシュボード、CSV 取込、予算管理を Web でまとめて扱います。

- 本番: https://kakeibo-mu-two.vercel.app
- モバイル版リポジトリ: https://github.com/hiyamuuugh/kakeibo-app

## セットアップ

```bash
npm install
copy .env.example .env
npm run db:seed
```

`.env` では少なくとも次を設定します。

- `DATABASE_URL`: Neon / PostgreSQL 接続先
- `APP_PASSWORD`: 家族共通のログインパスワード
- `APP_SESSION_SECRET`: セッション署名用の長いランダム文字列
- `GOOGLE_VISION_API_KEY`: レシート OCR を使う場合のみ

## 技術スタック

| 分類 | 採用技術 |
|------|----------|
| フレームワーク | Next.js 16 (App Router) / React / TypeScript |
| UI | Tailwind CSS / shadcn/ui / lucide-react |
| DB / ORM | Neon (PostgreSQL) / Prisma 7 |
| グラフ / CSV | recharts / papaparse / react-dropzone |
| テスト | Vitest |

## フォルダ構成

```text
src/
├── app/                  # App Router と API Route
│   ├── api/              # transactions, stats, import, auth など
│   ├── budgets/          # 予算画面
│   ├── import/           # CSV 取込画面
│   ├── login/            # 家族用ログイン画面
│   └── transactions/     # 取引一覧
├── components/           # UI / ナビゲーション / ログインフォーム
├── lib/                  # Prisma, import, auth, 集計ロジック
└── generated/prisma/     # Prisma 生成物
```

## ローカルでの確認方法

```bash
npm run dev
npm test
npx tsc --noEmit
npm run lint
npm run build
```

開発 URL は `http://localhost:3000` です。

## デプロイ関連

`master` への反映で Vercel がデプロイされます。アプリはブラウザ利用前提で、iOS アプリ配布は行いません。

### 身内のみアクセス

認証はアプリ内ログイン画面で行います。未ログイン状態では画面と API の両方を `middleware` でブロックします。

本番で必要な環境変数:

- `APP_PASSWORD`
- `APP_SESSION_SECRET`
- `DATABASE_URL`
- `GOOGLE_VISION_API_KEY`（OCR を使う場合）

Vercel の Environment Variables に同じ値を設定してください。

### PWA

このアプリはブラウザ版をホーム画面追加しやすいようにしてあります。

- `manifest.webmanifest` を配信
- `appleWebApp` / `themeColor` を設定
- `ホーム画面に追加` ボタンを対応ブラウザで表示

オフライン対応までは入れていません。主目的はスマホからアプリっぽく開きやすくすることです。

### OCR

`/api/ocr` は Google Cloud Vision を使います。`GOOGLE_VISION_API_KEY` 未設定時は `503` を返します。

## ハマったこと

切り分けに時間がかかった内容は `stuck-log` ラベル付きの GitHub Issue に残します。README には概要だけを書き、詳細は Issue を見ます。

- [Issues (label: stuck-log)](https://github.com/hiyamuuugh/kakeibo/issues?q=label%3Astuck-log)

## 開発の進め方

- 使い方、設定、画面仕様が変わったら README も更新する
- 詰まった内容は `stuck-log` Issue に記録する
- 機能追加とバグ修正ではテストを追加・更新する
