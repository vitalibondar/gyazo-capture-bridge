# Gyazo Capture Bridge (macOS)

言語: [English](../README.md) | [Українська](./README.uk.md) | **日本語**
まず読む: [このプロジェクトの目的](./WHY.ja.md) | [Why This Exists](./WHY.md) | [Навіщо це](./WHY.uk.md)

Gyazo へ画像キャプチャをアップロードするための小さな macOS ブリッジです。
画像をフォルダ保存できるキャプチャ手段なら何でも使えます。例: Shottr、macOS標準スクリーンショット、CleanShot X、Flameshot、独自スクリプト。

## 主な機能

- 手動アップロード（`upload_gyazo.sh`）
- `launchd` による自動アップロード（`auto_dispatch.sh` + `install_launch_agent.sh`）
- Gyazo メタデータ制御（app, source/title, description, tags, access policy）
- ノート機能（`notes_capture_from_clipboard.sh` + `notes_pipeline.js`）
- ノート表示プリセット（`mobile`, `desktop`, `custom`）と複数ページ対応

## ファイル構成

- `config.env` - ローカル実行設定（コミットしない）
- `config.env.example` - 設定テンプレート
- `upload_gyazo.sh` - Gyazo へ画像アップロード
- `auto_dispatch.sh` - 自動アップロード用ディスパッチャ
- `install_launch_agent.sh` / `uninstall_launch_agent.sh` - 自動モード導入・解除
- `com.gyazo-capture-bridge.plist.template` - LaunchAgent テンプレート
- `notes_capture_from_clipboard.sh` - テキストをノート受信フォルダに保存
- `notes_process_inbox.sh` - ノート受信フォルダを処理
- `notes_pipeline.js` - カード描画・アップロード・アーカイブ・インデックス
- `WHY.ja.md` - 目的と思想の短い説明
- `FORGOT_EVERYTHING_QUICKSTART.md` - 復帰用クイックチェック
- `NOTES_PRACTICAL_GUIDE.md` - ノート実用ガイド
- `DECISION_JOURNAL.md` - 実装判断ログ
- `TRADEMARKS.ja.md` - 法務/商標メモ

## 要件

- macOS
- `curl`, `plutil`, `osascript`, `pbcopy`
- `node`（notes pipeline 用）
- `python3` + Pillow（ノート描画品質向上に推奨）
- 画像ファイルを `CAPTURE_DIR` に保存できる任意のキャプチャ手段

## クイックセットアップ

1. プロジェクトに移動:

```bash
cd /path/to/gyazo-capture-bridge
```

2. ローカル設定を作成:

```bash
cp ./config.env.example ./config.env
```

3. 設定を編集:

```bash
open -e ./config.env
```

4. `GYAZO_ACCESS_TOKEN` と `CAPTURE_DIR` を設定。

## Gyazo アクセストークン取得

1. ログイン: [Gyazo Login](https://gyazo.com/login)
2. API ページ: [Gyazo API](https://gyazo.com/api)
3. アプリ管理: [Gyazo OAuth Apps](https://gyazo.com/oauth/applications)
4. 新規作成: [New OAuth App](https://gyazo.com/oauth/applications/new)
5. アクセストークンを発行し `config.env` に貼り付け

`config.env` 形式:

```bash
GYAZO_ACCESS_TOKEN="YOUR_REAL_TOKEN"
```

`Bearer` は `config.env` に書かないでください。

トークン確認:

```bash
TOKEN="YOUR_REAL_TOKEN"
curl -sS https://api.gyazo.com/api/users/me -H "Authorization: Bearer $TOKEN"
```

## 手動アップロード

`CAPTURE_DIR` の最新ファイルをアップロード:

```bash
./upload_gyazo.sh
```

ファイル指定アップロード:

```bash
./upload_gyazo.sh "$CAPTURE_DIR/example.png"
```

## 自動アップロードモード

LaunchAgent をインストール:

```bash
source ./config.env
./install_launch_agent.sh "$CAPTURE_DIR"
```

アンインストール:

```bash
./uninstall_launch_agent.sh
```

## ノート機能

クリップボードから取り込み（`NOTES_PROCESS_AFTER_CAPTURE=true` なら即処理）:

```bash
./notes_capture_from_clipboard.sh
```

テキスト指定取り込み:

```bash
./notes_capture_from_clipboard.sh "My note $(date)"
```

受信フォルダを手動処理:

```bash
./notes_process_inbox.sh
```

## 重要なメタデータ設定

- `GYAZO_ACCESS_POLICY`: `only_me` / `anyone`
- `GYAZO_TITLE_BROWSER_MODE`: `url` / `tab`
- `GYAZO_DESC_TAG`: 説明文末尾タグ（単語1つ推奨）
- `GYAZO_DESC_STYLE`: `compact` / `labeled`
- `CAPTURE_DIR`: 監視対象フォルダ

## macOS 権限

必要になる可能性がある権限:

- アクセシビリティ（前面 app/window 検出）
- オートメーション（ブラウザ URL/title 取得）
- ファイルとフォルダ（Pictures/Documents へのアクセス）

## 自動化ツール（任意）

ノート取り込みは任意の自動化ツール、またはターミナル実行で使えます。

## トラブルシューティング

`You are not authorized.`
- トークン値が不正（`client_secret` を入れているケースが多い）

`Capture file not found: <empty>`
- `CAPTURE_DIR` が不正、またはファイルがない

`No text input found (args/stdin/clipboard).`
- args/stdin/clipboard がすべて空

`No notes in inbox.`
- `NOTES_INBOX_DIR` に `.md` / `.txt` がない

## 法務

このプロジェクトは独立した非公式実装であり、Gyazo / Helpfeel Inc. とは提携・公認関係にありません。
詳細は [TRADEMARKS.ja.md](./TRADEMARKS.ja.md) を参照してください。

## ライセンス

MIT。`[LICENSE](../LICENSE)` を参照。
