# Notes Practical Guide

Language: **English** | [Українська](./NOTES_PRACTICAL_GUIDE.uk.md) | [日本語](./NOTES_PRACTICAL_GUIDE.ja.md)

This is the shortest practical guide, no extra theory.
Copy commands as-is.
Before starting, enter project folder:

```bash
cd ./gyazo-capture-bridge
```

## 1) One-command run (most common)

```bash
./notes_capture_from_clipboard.sh "My note $(date)"
```

Expected result:
- Gyazo link appears in terminal
- link is copied to clipboard
- new image appears in Gyazo

## 2) If text is already in clipboard

```bash
./notes_capture_from_clipboard.sh
```

This mode takes text from clipboard and tries to capture active app context.

## 3) Why Gyazo App field is sometimes empty

This is expected in `manual` mode:
- if you pass an argument (`./notes_capture_from_clipboard.sh "..."`), script sets `source_app=manual`;
- for this case, we do not send `app` to Gyazo (to avoid noise like `manual`/`ghostty`);
- Gyazo then shows `Input name of App` placeholder.

If you want real app metadata:
- keep text in clipboard;
- run `./notes_capture_from_clipboard.sh` with no argument while target app is active.

Description layout for notes:
- first line in Gyazo comment stays content-focused (title/text);
- app tag is appended to the final tags line (for example: `#notes #Safari`).

## 4) Quick health check

```bash
source ./config.env
./notes_capture_from_clipboard.sh "health check $(date)"
tail -n 5 "$LOG_FILE"
tail -n 1 "$NOTES_INDEX_FILE"
```

Look for `OK` in `LOG_FILE`.

## 5) Appearance settings (mobile-first)

Current default:
- `NOTES_SIZE_PRESET="mobile"` (phone-friendly)
- `NOTES_RENDER_WIDTH="430"` (used only when `NOTES_SIZE_PRESET="custom"`)
- `NOTES_RENDER_WINDOW_DOTS="false"` (no top blank header)
- `NOTES_COLOR_MODE="random_sticky"` (random soft color theme)
- `NOTES_COPY_URL_TO_CLIPBOARD="true"`
- `NOTES_PAGE_MAX_CHARS="900"` (auto split for long notes)
- `NOTES_PAGE_UNIFORM_SIZE="true"` (all pages have same dimensions)
- `NOTES_UPLOAD_LAST_PAGE_FIRST="true"` (Gyazo feed order)
- `NOTES_GYAZO_SEND_CREATED_AT="false"` (keeps page order stable in feed)

Enable window dots:

```bash
sed -i '' 's/^NOTES_RENDER_WINDOW_DOTS=.*/NOTES_RENDER_WINDOW_DOTS="true"/' ./config.env
```

Switch to desktop preset:

```bash
sed -i '' 's/^NOTES_SIZE_PRESET=.*/NOTES_SIZE_PRESET="desktop"/' ./config.env
```

Switch back to mobile preset:

```bash
sed -i '' 's/^NOTES_SIZE_PRESET=.*/NOTES_SIZE_PRESET="mobile"/' ./config.env
```

Make text smaller:

```bash
sed -i '' 's/^NOTES_RENDER_POINT_SIZE=.*/NOTES_RENDER_POINT_SIZE="22"/' ./config.env
sed -i '' 's/^NOTES_RENDER_LINE_SPACING=.*/NOTES_RENDER_LINE_SPACING="8"/' ./config.env
```

Make card wider (`custom` preset):

```bash
sed -i '' 's/^NOTES_RENDER_WIDTH=.*/NOTES_RENDER_WIDTH="520"/' ./config.env
```

Disable pagination (single long card):

```bash
sed -i '' 's/^NOTES_PAGE_MAX_CHARS=.*/NOTES_PAGE_MAX_CHARS="0"/' ./config.env
```

Use fixed color instead of random themes:

```bash
sed -i '' 's/^NOTES_COLOR_MODE=.*/NOTES_COLOR_MODE="fixed"/' ./config.env
```

## 6) Important command rule

Do not paste lines that start with `#` into shell.
They are comments for humans, not terminal commands.
