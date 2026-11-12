# kakeibo

家族で使うためのブラウザ家計簿アプリです。取引一覧、直接入力、月別ダッシュボード、CSV 取込、カテゴリマッピングを Web でまとめて扱います。

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
│   ├── budgets/          # 予算画面（メニュー非表示）
│   ├── dashboard/        # ダッシュボード
│   ├── import/           # CSV 取込画面（PayPay / PayPayカード / 楽天カード / MUFG / SMBC）
│   ├── login/            # 家族用ログイン画面
│   ├── settings/         # カテゴリマッピング
│   └── transactions/     # 取引一覧 / 直接入力
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

トップページ `/` は直接入力画面 `/transactions/new` に遷移します。ダッシュボードは `/dashboard` です。

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

### 底値帖と画面の配色

- PC のメニューバーとスマホの下部メニューの「入力」の右隣に「底値帖」を表示します。
- 「底値帖」はアプリ内の `/price-notes` を開きます。家計簿と同じログインで利用できます。
- 商品名・カテゴリ・単位で商品をまとめ、購入店、税込価格、送料、内容量、購入日を PostgreSQL に保存します。
- 内容量と送料は任意入力です。空欄の内容量は未入力として保存し、送料は0円として扱います。任意の入力欄には `(任意)` を表示します。
- 商品のすべての記録に内容量がある場合は、送料込みの単価で比較します。内容量未入力の記録を含む場合は、送料込みの価格で比較します。内容量が空欄のときは、内容量や単価の表示自体を省きます。kg／g、L／mlは自動換算します。異なる単位（個とgなど）は別商品として扱います。
- 検索、カテゴリ絞り込み、並べ替え、履歴の表示・追加・編集・削除に対応します。購入先の区分は入力・表示しません。食品・日用品タブでは各行のカテゴリ名を省きます。履歴の削除はゴミ箱アイコン、編集はその左の鉛筆アイコンから行います。商品名・カテゴリ・内容量・単位・お店・価格・送料・購入日を変更できます。実データは空から始まり、以前のデモサイトのブラウザ保存データは自動移行しません。
- スマホのメニュー文字は省略せず折り返して表示します。デスクトップメニューは横幅が十分な1,024px以上で表示します。

#### 底値帖のデータベース

`PriceProduct` と `PriceRecord` の2テーブルを追加します。既存の家計簿テーブル・レコードは変更しません。

```bash
npm run db:price-notes
```

このコマンドは新規テーブルとインデックスだけを作る再実行可能なSQLです。`DATABASE_URL` が必要です。Vercel本番ビルド（`VERCEL_ENV=production`）では同じSQLを自動実行し、失敗時はデプロイを停止します。ローカルやプレビュー用DBでは上記コマンドを先に実行してください。内容量をNULLで保存できるようにするマイグレーションも適用します。既存の内容量は保持します。通常のPrismaマイグレーション用にも同じSQLを `prisma/migrations/20261112000000_add_price_notes/` に含めています。
- 全画面の基本配色は底値帖に合わせた深いグリーン、生成りの背景、白いカードです。カテゴリの選択肢や一覧・凡例には、緑・青・黄土・紫・赤茶などを区別できる落ち着いた色を使います。家族全員と自分のタブは同じ選択色です。プラスの金額・収入・収支がプラスの棒グラフは落ち着いた青系、支出は落ち着いた赤系で表示します。アカウントの保存済み色データは保持します。

### 取込・入力

- CSV 取込: PayPay、PayPayカード、楽天カード、三菱UFJ銀行、三井住友銀行
- 直接入力: 支出 / 収入の切替、レシートOCR、カテゴリ選択
- カテゴリマッピング: 店舗名ルールの追加、削除、既存取引への再適用

### OCR

`/api/ocr` は Google Cloud Vision を使います。`GOOGLE_VISION_API_KEY` 未設定時は `503` を返します。

## ハマったこと

切り分けに時間がかかった内容は `stuck-log` ラベル付きの GitHub Issue に残します。README には概要だけを書き、詳細は Issue を見ます。

- [Issues (label: stuck-log)](https://github.com/hiyamuuugh/kakeibo/issues?q=label%3Astuck-log)
- [#18 Web版にアプリ同等の入力・取込・カテゴリマッピングを追加](https://github.com/hiyamuuugh/kakeibo/issues/18)

## 開発の進め方

- 使い方、設定、画面仕様が変わったら README も更新する
- 詰まった内容は `stuck-log` Issue に記録する
- 機能追加とバグ修正ではテストを追加・更新する
