# Notes Practical Guide

言語: [English](./NOTES_PRACTICAL_GUIDE.md) | [Українська](./NOTES_PRACTICAL_GUIDE.uk.md) | **日本語**

余計な説明なしの実用ガイドです。
コマンドはそのまま貼り付けて使えます。
開始前にプロジェクトへ移動:

```bash
cd ./gyazo-capture-bridge
```

## 1) まずは1コマンド（最頻パターン）

```bash
./notes_capture_from_clipboard.sh "My note $(date)"
```

期待結果:
- ターミナルに Gyazo リンクが表示
- リンクがクリップボードへコピー
- Gyazo に新しい画像が追加

## 2) すでにクリップボードに文字列がある場合

```bash
./notes_capture_from_clipboard.sh
```

このモードはクリップボード文字列を使い、アクティブアプリの文脈取得も試みます。

## 3) Gyazo の App フィールドが空になる理由

`manual` モードでは正常です:
- 引数あり実行（`./notes_capture_from_clipboard.sh "..."`）時、`source_app=manual` になる;
- このケースでは `manual` / `ghostty` のようなノイズを避けるため `app` を Gyazo に送らない;
- そのため Gyazo 側に `Input name of App` が表示される。

実アプリ名を入れたい場合:
- テキストをクリップボードに置く;
- 対象アプリを前面にして、引数なしで `./notes_capture_from_clipboard.sh` を実行。

notes の description レイアウト:
- Gyazo コメントの1行目は内容（タイトル/本文）を優先;
- アプリタグは最終タグ行に追加（例: `#notes #Safari`）。

## 4) 生存確認（最短）

```bash
source ./config.env
./notes_capture_from_clipboard.sh "health check $(date)"
tail -n 5 "$LOG_FILE"
tail -n 1 "$NOTES_INDEX_FILE"
```

`LOG_FILE` に `OK` が出れば正常。

## 5) 見た目設定（mobile-first）

現在の既定:
- `NOTES_SIZE_PRESET="mobile"`（スマホ向け）
- `NOTES_RENDER_WIDTH="430"`（`NOTES_SIZE_PRESET="custom"` のときのみ有効）
- `NOTES_RENDER_WINDOW_DOTS="false"`（上部の空白ヘッダなし）
- `NOTES_COLOR_MODE="random_sticky"`（柔らかい配色をランダム適用）
- `NOTES_COPY_URL_TO_CLIPBOARD="true"`
- `NOTES_PAGE_MAX_CHARS="900"`（長文自動分割）
- `NOTES_PAGE_UNIFORM_SIZE="true"`（全ページ同寸法）
- `NOTES_UPLOAD_LAST_PAGE_FIRST="true"`（Gyazo フィード順に最適化）
- `NOTES_GYAZO_SEND_CREATED_AT="false"`（フィード順の崩れ防止）

上部ドットを有効化:

```bash
sed -i '' 's/^NOTES_RENDER_WINDOW_DOTS=.*/NOTES_RENDER_WINDOW_DOTS="true"/' ./config.env
```

desktop プリセットへ切替:

```bash
sed -i '' 's/^NOTES_SIZE_PRESET=.*/NOTES_SIZE_PRESET="desktop"/' ./config.env
```

mobile プリセットへ戻す:

```bash
sed -i '' 's/^NOTES_SIZE_PRESET=.*/NOTES_SIZE_PRESET="mobile"/' ./config.env
```

文字を小さくする:

```bash
sed -i '' 's/^NOTES_RENDER_POINT_SIZE=.*/NOTES_RENDER_POINT_SIZE="22"/' ./config.env
sed -i '' 's/^NOTES_RENDER_LINE_SPACING=.*/NOTES_RENDER_LINE_SPACING="8"/' ./config.env
```

カードを広くする（`custom` 想定）:

```bash
sed -i '' 's/^NOTES_RENDER_WIDTH=.*/NOTES_RENDER_WIDTH="520"/' ./config.env
```

ページ分割を無効化（1枚の長いカード）:

```bash
sed -i '' 's/^NOTES_PAGE_MAX_CHARS=.*/NOTES_PAGE_MAX_CHARS="0"/' ./config.env
```

ランダム配色をやめて固定色にする:

```bash
sed -i '' 's/^NOTES_COLOR_MODE=.*/NOTES_COLOR_MODE="fixed"/' ./config.env
```

## 6) コマンド運用ルール

`#` で始まる行は shell に貼り付けない。
人向けコメントであり、ターミナル実行コマンドではありません。
