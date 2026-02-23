# 判断ログ

言語: [English](./DECISION_JOURNAL.md) | [Українська](./DECISION_JOURNAL.uk.md) | **日本語**

これは単なる変更履歴ではありません。
セッションをまたいでも文脈を失わないように、判断・理由・未実装アイデアを残すための記録です。

## 読み方

- `[D]` — 採用した判断（Decision）
- `[R]` — 理由・制約（Reasoning）
- `[I]` — 将来アイデア（Idea）
- `[X]` — 却下した案（Rejected）

## 記録フォーマット

重要な変更は次の形式で1ブロックずつ追加:

```text
### YYYY-MM-DD HH:MM — 判断タイトル
[D] 何を決めたか。
[R] なぜそうしたか。
[R] トレードオフ / リスク。
[X] 却下した案（あれば）。
[I] 後で実装できること（任意）。
[R] 検証方法（コマンド / 症状 / ログ）。
```

## ベースライン（現状）

### 2026-02-06 — 専用アプリではなくスクリプトで構成
[D] 連携の中核は shell スクリプト + `launchd` にする。
[R] シンプルさ、`config.env` での制御、依存最小化を優先。
[X] フル機能の macOS 専用アプリは複雑化が大きいため保留。

### 2026-02-06 — 運用モードを2本立てにする
[D] 手動モード（`upload_gyazo.sh`）と自動モード（`auto_dispatch.sh` + LaunchAgent）を両立。
[R] 手動は制御性、自動は日常運用の効率が高い。

### 2026-02-07 — Gyazo トークン形式を厳格化
[D] `config.env` に `GYAZO_ACCESS_TOKEN="..."` 形式で保存。
[R] 典型ミスは access token と `client_secret` の取り違え、または空変数送信。
[R] 妥当性確認は `GET /api/users/me` の `HTTP 200`。

### 2026-02-07 — LaunchAgent の `Operation not permitted`
[D] プロジェクトを `Documents` の外で運用する方針（作業パスを `~/gyazo-capture-bridge` に移動）。
[R] `Documents` 保護領域（TCC）配下では `launchd` 実行が失敗する場合がある。
[R] 症状: `last exit code = 126` と `Operation not permitted`。

### 2026-02-07 — Gyazo メタデータは最小有用セット
[D] 既定では `App` / `Window` /（ブラウザ時）`URL` のみ送る。
[R] 目的は「後で思い出せること」であり、フォレンジック用途ではない。
[X] 技術情報の全面ダンプはノイズとして却下。

### 2026-02-07 — コンテキストはイベント時点で固定
[D] 自動モードでは sleep/upload 前に即コンテキスト取得。
[R] 取得が遅いと、フォーカス移動後の別アプリ情報が混入する。
[R] 実装は `FRONTMOST_APP_OVERRIDE` / `FRONT_WINDOW_TITLE_OVERRIDE` / `BROWSER_URL_OVERRIDE` / `BROWSER_TAB_TITLE_OVERRIDE`。

### 2026-02-08 — 説明文は compact を既定に
[D] `desc` 既定を `App:/Window:/URL:` 接頭辞なしの compact にする。
[R] Gyazo フィード上で可読性が高い。
[D] `GYAZO_DESC_STYLE` 追加:
- `compact`（既定）
- `labeled`

### 2026-02-08 — タグは単語1つを既定
[D] 既定タグは `#capture`。
[R] Gyazo はハイフン付きタグを途中で切るため、1単語か `_` が安定。
[D] 属性別タグ設定を追加:
- `GYAZO_DESC_TAG_APP`
- `GYAZO_DESC_TAG_WINDOW`
- `GYAZO_DESC_TAG_URL`
- `GYAZO_DESC_TAG`

### 2026-02-08 — アクセス方針既定は private
[D] 既定を `GYAZO_ACCESS_POLICY="only_me"` に設定。
[R] 個人運用では安全側が妥当。
[R] 共有したい場合のみ `anyone` を明示。
[R] Gyazo の可視性機能は有料プラン依存の可能性があるため、`only_me` の挙動差に注意。

### 2026-02-08 — Password protected 画像
[D] 現行の公開 upload API ではアップロード時パスワード設定を行わない。
[R] Web UI にはあるが、upload API ドキュメントに該当パラメータがない。
[I] API 側で対応が出たら `config.env` に項目追加。

### 2026-02-08 — ノートは inbox-first フロー
[D] フローを `inbox -> render -> upload -> archive -> index` に統一。
[R] テキスト取得とアップロードを分離でき、メインのキャプチャフローを汚さない。
[R] `.md/.txt` を inbox に置くだけで手動ノートも処理できる。
[R] `.meta.json` + front matter で `app/window/url/title/time` を DB なしで保持。

### 2026-02-08 — ノートも upload スクリプト経由で統一
[D] `notes_pipeline.js` は Gyazo へ直接送らず、`upload_gyazo.sh` を `UPLOAD_*` 上書き付きで呼ぶ。
[R] API・タグ・アクセス方針・ログの実装を1か所に集約できる。
[X] 別スクリプトで curl 実装を重複させる案は却下。

### 2026-02-08 — ノートのレンダリングは過剰実装を避ける
[D] ImageMagick `caption:@file` + 軽量 markdown-to-text を採用。
[R] 依存を増やさず起動が速い。
[X] HTML/CSS や headless browser レンダラーは現時点で過剰。
[R] コードブロックはプレーンテキスト描画（シンタックスハイライトなし）。

### 2026-02-08 — フォント未対応時の安全フォールバック
[D] `NOTES_FONT_FAMILY` が未対応なら `-font` なしで自動再実行。
[R] 一部環境では system font 指定で `magick` が失敗するが、既定フォントなら描画可能。
[R] フォールバック経路での致命停止を防ぐ。

### 2026-02-08 — 修正: `No notes in inbox` 誤発生
[D] `notes_process_inbox.sh` で `source config.env` 前に `set -a` を有効化し、`NOTES_*` を Node 環境へ export。
[R] 以前は capture 側が設定済み inbox に書く一方、pipeline 側は既定 `./notes-data/inbox` を読んでいた。
[R] 症状: capture 後に `No notes in inbox.`。

### 2026-02-08 — 修正: `notes_capture_from_clipboard.sh` の無言終了
[D] `note_id` 生成を `tr | head` から `hexdump` へ変更。
[R] `set -euo pipefail` 下で SIGPIPE が発生し、ファイル作成前に静かに終了していた。
[R] 空/非プレーンテキスト時の明示エラーも追加。

### 2026-02-08 — ハング防止ガード
[D] Notes 文脈取得に `NOTES_OSASCRIPT_TIMEOUT_SEC`（既定 `2`）を追加。
[R] TCC/Automation ダイアログで `osascript` が詰まってもノート取得は継続させる。
[D] アップロードに `CURL_CONNECT_TIMEOUT_SEC` と `CURL_MAX_TIME_SEC` を追加。
[R] ネットワーク待ちの無限ハングを防ぐ。

### 2026-02-08 — 入力取得のフォールバック強化
[D] `notes_capture_from_clipboard.sh` は `args -> stdin -> clipboard` の順で入力を受ける。
[R] `pbcopy` 前提の脆い手順を減らし、検証を簡単にした。
[R] クリップボードが空でも「何も起きない」状態を減らせる。

### 2026-02-08 — レンダリング品質の改善
[D] `NOTES_RENDER_ENGINE=auto` 時の優先順を `python (Pillow) -> swift -> magick` に変更。
[R] 現環境の ImageMagick は freetype 非対応で文字が荒くなりやすい。
[R] Pillow は滑らかな文字、角丸カード、可読性向上を実現。
[D] 追加設定: `NOTES_RENDER_SURFACE_COLOR`, `NOTES_RENDER_RADIUS`, `NOTES_RENDER_SCALE`。

### 2026-02-08 — CLI 実行時のメタデータノイズ抑制
[D] `args/stdin` モードでは `source_app=manual` を明示。
[R] 端末起動ノートで `#ghostty` などの不要タグ混入を防ぐ。
[R] 実アプリ文脈（app/window/url）は引数なしクリップボード実行時のみ取得。

### 2026-02-08 — ノートでも URL クリップボード動作を統一
[D] `NOTES_COPY_URL_TO_CLIPBOARD=true` を既定有効化。
[R] スクリーンショットと同じ体験（アップロード直後に共有URLが使える）。
[D] `source_app=manual` の場合は app 行・app metadata を description から除外。
[R] `#ghostty` / `#manual` のようなノイズを除去。

### 2026-02-08 — ノートカードの mobile-first 既定
[D] `NOTES_RENDER_WIDTH=430`、`NOTES_RENDER_WINDOW_DOTS=false` を既定化。
[R] スマホ縦閲覧で読みやすく、window controls は必要時のみ有効にできる。

### 2026-02-08 — ノート専用の実用ガイドを分離
[D] `NOTES_PRACTICAL_GUIDE.md` を追加（コピペ中心、最小説明）。
[R] 大きな README を読まずに日次運用へ復帰できる。
[R] Gyazo `App` フィールドで `manual` と clipboard モード差分を明示。

### 2026-02-10 — 複数ページノート + sticky 配色
[D] `NOTES_PAGE_MAX_CHARS` による自動ページ分割を追加（`0` で無効）。
[D] `NOTES_PAGE_LABEL=true` で `1/3` 形式のページ番号を表示。
[D] 複数ページアップロード既定順を `最後 -> 最初`（`NOTES_UPLOAD_LAST_PAGE_FIRST=true`）に設定。
[R] Gyazo フィードは新しい順なので、この順序だとページ送りが自然。
[D] `NOTES_COLOR_MODE=random_sticky` を追加し、前回テーマの連続再利用を回避。
[D] 前回テーマ記録用に `NOTES_THEME_STATE_FILE` を追加。
[R] フィードでノート単位の見分けがつきやすくなり、同一ノート内は同色でまとまる。

### 2026-02-10 — フィード順とページサイズ統一の修正
[D] ノート既定で `NOTES_GYAZO_SEND_CREATED_AT=false` を設定。
[R] `created_at`（mtime）送信で複数ページの並びが崩れる場合がある。
[D] `NOTES_PAGE_UNIFORM_SIZE=true` を追加し、全ページを同じキャンバス寸法へ揃える。
[R] Gyazo でページ送りしたときのサイズジャンプを解消。

### 2026-02-10 — ノートサイズプリセット（`mobile` / `desktop`）
[D] `NOTES_SIZE_PRESET` に `mobile` / `desktop` / `custom` を実装。
[D] `mobile` と `desktop` は幅・タイポグラフィ・`NOTES_PAGE_MAX_CHARS` を一括で整合させる。
[R] スマホ・ノートPCの「スクロールなし」閲覧を、手動調整なしで実現。

### 2026-02-10 — Gyazo `Source` のブラウザモード（URL / タブ名）
[D] `GYAZO_TITLE_BROWSER_MODE`（`url` / `tab`）を追加。
[D] `config.env` 既定は `url`。
[R] Web 情報はタブ名より URL のほうが後で参照しやすい。

### 2026-02-11 — まず目的を示す: 3言語 `WHY` ページ
[D] プロジェクトの狙いを短く説明する `WHY.md` / `WHY.uk.md` / `WHY.ja.md` を追加。
[D] すべての README 先頭に `WHY` へのリンクを配置し、セットアップ前に意図が読める構成にした。
[R] 公開時に最初に出る質問は「公式アプリがあるのに、なぜ必要か」であり、即答できる導線が必要。
[R] GitHub 上での理解速度と説明の一貫性を上げるため。

## 未実装だが有用なアイデア

### [I] Firefox の URL を拡張機能で取得
[R] AppleScript 経由の URL 取得は Safari/Chromium より Firefox で不安定。
[I] 最小限の拡張機能でローカル受け渡しすれば安定性向上が見込める。

### [I] 軽量プライバシープロファイル
[I] `config.env` に即切替プリセットを持たせる:
- `private`（`only_me`, `metadata_is_public=false`）
- `share`（`anyone`, メタデータ最小）

### [I] ログローテーション
[I] `gyazo-upload.log` が一定サイズを超えたら自動アーカイブする。

## 今後の運用ルール

スクリプト挙動や既定値を変更したら:
- このファイルにテンプレート形式で1ブロック追加;
- `README.md` の該当箇所を更新;
- 日次運用に影響する変更なら `FORGOT_EVERYTHING_QUICKSTART.md` も更新。
