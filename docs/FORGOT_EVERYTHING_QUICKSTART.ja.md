# すぐ復帰するためのクイックスタート

言語: [English](./FORGOT_EVERYTHING_QUICKSTART.md) | [Українська](./FORGOT_EVERYTHING_QUICKSTART.uk.md) | **日本語**

「このフォルダ何だっけ？」となったとき用の最短チートシート。

## 30秒要約

- 使っているキャプチャ手段が画像をフォルダ保存する。
- このスクリプト群が Gyazo へ送る。
- 基本コマンドは `./upload_gyazo.sh`。
- 基本設定は `./config.env`。
- テキストノートは `./notes_capture_from_clipboard.sh` + `./notes_process_inbox.sh`。

## 最短で復帰する手順

1. プロジェクトフォルダへ移動:

```bash
cd /path/to/gyazo-capture-bridge
```

2. 設定を開く:

```bash
open -e ./config.env
```

3. トークン確認:
- `GYAZO_ACCESS_TOKEN` がプレースホルダーのままになっていないこと。
- `./config.env` の形式: `GYAZO_ACCESS_TOKEN="ここにトークン"`（ダブルクォート推奨）。

4. キャプチャ保存先フォルダ確認:
- `CAPTURE_DIR` が実際の保存先を指していること。

5. ヘルスチェック:

```bash
./upload_gyazo.sh
```

6. 正常時の結果:
- ターミナルに Gyazo URL が出る
- URL がクリップボードに入る
- `$LOG_FILE` に新しい行が追記される

ログ場所の確認:

```bash
source ./config.env
echo "$LOG_FILE"
ls -la "$LOG_FILE"
```

## Gyazo トークン取得（最短）

1. ログイン: [https://gyazo.com/login](https://gyazo.com/login)
2. API: [https://gyazo.com/api](https://gyazo.com/api)
3. アプリ管理: [https://gyazo.com/oauth/applications](https://gyazo.com/oauth/applications)
4. 新規アプリ作成: [https://gyazo.com/oauth/applications/new](https://gyazo.com/oauth/applications/new)
5. Access Token を発行し `./config.env` に貼る

最小トークン確認:

```bash
TOKEN="your_access_token"
curl -i -sS https://api.gyazo.com/api/users/me -H "Authorization: Bearer $TOKEN"
```

`HTTP/2 200` が出れば有効。

## 自動モード

有効化:

```bash
source ./config.env
./install_launch_agent.sh "$CAPTURE_DIR"
```

一時停止:
- `./config.env` の `ENABLE_AUTO_UPLOAD="false"`

完全停止:

```bash
./uninstall_launch_agent.sh
```

## ノートを1分で

クリップボードのテキストを受信フォルダへ:

```bash
./notes_capture_from_clipboard.sh
```

テキストを直接渡して保存:

```bash
./notes_capture_from_clipboard.sh "テストノート"
```

受信フォルダ処理（画像化 + Gyazoアップロード）:

```bash
./notes_process_inbox.sh
```

出力先確認:

```bash
source ./config.env
echo "$NOTES_ARCHIVE_DIR"
echo "$NOTES_RENDERED_DIR"
echo "$NOTES_INDEX_FILE"
```

主要なデフォルト:
- `NOTES_GYAZO_ACCESS_POLICY="only_me"`
- `NOTES_GYAZO_DESC_TAG="#notes"`
- `NOTES_DESC_STYLE="compact"`
- `NOTES_PROCESS_AFTER_CAPTURE="false"`
- `NOTES_OSASCRIPT_TIMEOUT_SEC="2"`
- `NOTES_RENDER_ENGINE="auto"`
- `NOTES_RENDER_SCALE="2"`
- `NOTES_COPY_URL_TO_CLIPBOARD="true"`
- `NOTES_SIZE_PRESET="mobile"`（`desktop` はノートPC向け、`custom` は手動）
- `NOTES_RENDER_WIDTH="430"`（`custom` のときのみ有効）
- `NOTES_RENDER_WINDOW_DOTS="false"`（`true` で上部ドット表示）
- `NOTES_COLOR_MODE="random_sticky"`（柔らかい配色をランダム、連続重複なし）
- `NOTES_PAGE_MAX_CHARS="900"`（長文を自動分割）
- `NOTES_PAGE_LABEL="true"`（`1/3` のページ表示）
- `NOTES_PAGE_UNIFORM_SIZE="true"`（全ページ同サイズ）
- `NOTES_UPLOAD_LAST_PAGE_FIRST="true"`（Gyazo フィード向けの並び順）
- `NOTES_GYAZO_SEND_CREATED_AT="false"`（フィード順序を安定化）

## Gyazo メタデータ設定（`./config.env`）

- `GYAZO_SEND_APP_METADATA="true"`: アクティブアプリ名を送る
- `GYAZO_SEND_TITLE_METADATA="true"`: 読みやすい `title` を送る
- `GYAZO_TITLE_BROWSER_MODE="url"`: ブラウザ時に `Source` へ URL（`"tab"` でタブ名）
- `GYAZO_SEND_DESC_METADATA="true"`: 複数行 description を送る
- `GYAZO_SEND_CREATED_AT="true"`: ファイル時刻を `created_at` として送る
- `GYAZO_ACCESS_POLICY="only_me"`（既定・非公開）または `"anyone"`（公開リンク）
- `only_me` はプランの可視性機能に依存する場合あり
- `GYAZO_CONTEXT_NOTE=""`: description に任意の補足
- `GYAZO_DESC_TAG="#capture"`: description 最終行タグ（1単語推奨）
- `GYAZO_DESC_TAG_APP="true"`: アプリ名をタグ化（例 `#Safari`）
- `GYAZO_DESC_TAG_WINDOW="false"`: ウィンドウ名をタグ化
- `GYAZO_DESC_TAG_URL="false"`: URL ドメインをタグ化
- `GYAZO_DESC_STYLE="compact"`: `App:/Window:/URL:` 接頭辞なし（`labeled` で接頭辞あり）
- Gyazo docs: [Tagging images and videos](https://help.gyazo.com/hc/en-us/articles/360022774792-Tagging-images-and-videos)

## よくあるエラー

`Set GYAZO_ACCESS_TOKEN in ./config.env`
- トークン未設定。

`You are not authorized.`
- access token ではなく `client_secret` を入れている、または `$TOKEN` が空。

`Capture file not found`
- `CAPTURE_DIR` に画像がない、またはパス不正。

`No text input found (args/stdin/clipboard).`
- args/stdin/clipboard のすべてが空。

`No notes in inbox.`
- `NOTES_INBOX_DIR` に `.md/.txt` がない。

`magick failed to start`
- `magick` コマンドが `PATH` にない。

ノートがぼやける
- `NOTES_RENDER_ENGINE="python"` を設定。
- `NOTES_RENDER_SCALE="2"` または `"3"` に上げる。

コマンドが無反応で止まる
- macOS 権限ポップアップ（`Accessibility` / `Automation`）を確認。
- `CURL_MAX_TIME_SEC` を小さくする。
- `NOTES_OSASCRIPT_TIMEOUT_SEC` を小さくする。

共有リンクにならない
- `GYAZO_ACCESS_POLICY="anyone"` に変更。

権限要求が出る（`Accessibility` / `Automation` / `Files and Folders`）
- `App` / `Window` / `URL` 取得のため正常な挙動。
- 利用中ターミナルを `Accessibility` に追加。
- `env` が表示されたら `/usr/bin/env` を許可。

自動モードが動かない
- 次で確認:

```bash
launchctl print "gui/$(id -u)/com.gyazo-capture-bridge" >/dev/null && echo "loaded" || echo "not loaded"
```

description の `App` / `Window` がずれる
- `Accessibility` / `Automation` 権限を再確認。

## 詳細マニュアル

- `../README.md`
- `./NOTES_PRACTICAL_GUIDE.md`
- `./DECISION_JOURNAL.md`
