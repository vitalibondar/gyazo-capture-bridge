# Forgot Everything Quickstart

Language: **English** | [Українська](./FORGOT_EVERYTHING_QUICKSTART.uk.md) | [日本語](./FORGOT_EVERYTHING_QUICKSTART.ja.md)

A short cheat sheet for the “I forgot what this folder does” moment.

## 30 Seconds

- Your capture tool saves screenshots or images to a folder.
- These scripts upload screenshots to Gyazo.
- Main command: `./upload_gyazo.sh`.
- Main settings: `./config.env`.
- For text notes: `./notes_capture_from_clipboard.sh` + `./notes_process_inbox.sh`.

## Bring It Back Fast

1. Go to the project folder:

```bash
cd /path/to/gyazo-capture-bridge
```

2. Open config:

```bash
open -e ./config.env
```

3. Check your token:
- `GYAZO_ACCESS_TOKEN` must not be a placeholder.
- Format in `./config.env`: `GYAZO_ACCESS_TOKEN="your_token_here"` (double quotes recommended).

4. Check capture folder:
- `CAPTURE_DIR` must point to the folder where screenshots are saved.

5. Health check:

```bash
./upload_gyazo.sh
```

6. Expected result:
- Gyazo URL appears in terminal
- URL is copied to clipboard
- a new row is written to `$LOG_FILE`

Find your log path:

```bash
source ./config.env
echo "$LOG_FILE"
ls -la "$LOG_FILE"
```

## Get Gyazo Token (Quick)

1. Login: [https://gyazo.com/login](https://gyazo.com/login)
2. API page: [https://gyazo.com/api](https://gyazo.com/api)
3. Apps dashboard: [https://gyazo.com/oauth/applications](https://gyazo.com/oauth/applications)
4. Create app: [https://gyazo.com/oauth/applications/new](https://gyazo.com/oauth/applications/new)
5. Generate Access Token and paste it into `./config.env`

Minimal token check:

```bash
TOKEN="your_access_token"
curl -i -sS https://api.gyazo.com/api/users/me -H "Authorization: Bearer $TOKEN"
```

If you see `HTTP/2 200`, the token works.

## Auto Mode

Enable:

```bash
source ./config.env
./install_launch_agent.sh "$CAPTURE_DIR"
```

Soft disable:
- set `ENABLE_AUTO_UPLOAD="false"` in `./config.env`

Full uninstall:

```bash
./uninstall_launch_agent.sh
```

## Notes In 1 Minute

Capture selected text from clipboard to inbox:

```bash
./notes_capture_from_clipboard.sh
```

Capture explicit text (without clipboard):

```bash
./notes_capture_from_clipboard.sh "Test note"
```

Process inbox (render image + upload to Gyazo):

```bash
./notes_process_inbox.sh
```

Where to check results:

```bash
source ./config.env
echo "$NOTES_ARCHIVE_DIR"
echo "$NOTES_RENDERED_DIR"
echo "$NOTES_INDEX_FILE"
```

Minimal notes defaults:
- `NOTES_GYAZO_ACCESS_POLICY="only_me"`
- `NOTES_GYAZO_DESC_TAG="#notes"`
- `NOTES_DESC_STYLE="compact"`
- `NOTES_PROCESS_AFTER_CAPTURE="false"`
- `NOTES_OSASCRIPT_TIMEOUT_SEC="2"`
- `NOTES_RENDER_ENGINE="auto"`
- `NOTES_RENDER_SCALE="2"`
- `NOTES_COPY_URL_TO_CLIPBOARD="true"`
- `NOTES_SIZE_PRESET="mobile"` (`desktop` for laptop, `custom` for manual values)
- `NOTES_RENDER_WIDTH="430"` (used only in `custom`)
- `NOTES_RENDER_WINDOW_DOTS="false"` (set `true` to show the top dots)
- `NOTES_COLOR_MODE="random_sticky"` (random soft theme without repeat)
- `NOTES_PAGE_MAX_CHARS="900"` (long notes split automatically)
- `NOTES_PAGE_LABEL="true"` (page marker like `1/3`)
- `NOTES_PAGE_UNIFORM_SIZE="true"` (all pages same image size)
- `NOTES_UPLOAD_LAST_PAGE_FIRST="true"` (feed-friendly in Gyazo)
- `NOTES_GYAZO_SEND_CREATED_AT="false"` (keeps feed order stable)

## Useful Gyazo Metadata Settings (`./config.env`)

- `GYAZO_SEND_APP_METADATA="true"`: send active app name.
- `GYAZO_SEND_TITLE_METADATA="true"`: send readable `title` (tab/window title).
- `GYAZO_TITLE_BROWSER_MODE="url"`: browser `Source` uses URL (`"tab"` uses tab title).
- `GYAZO_SEND_DESC_METADATA="true"`: send readable multiline description.
- `GYAZO_SEND_CREATED_AT="true"`: send file time as `created_at`.
- `GYAZO_ACCESS_POLICY="only_me"` (default, private) or `"anyone"` (public link).
- note: `only_me` may depend on your plan visibility features.
- `GYAZO_CONTEXT_NOTE=""`: optional extra context in `desc`.
- `GYAZO_DESC_TAG="#capture"`: final tag line in `desc` (single word recommended).
- `GYAZO_DESC_TAG_APP="true"`: app as tag (`#Safari` in compact mode).
- `GYAZO_DESC_TAG_WINDOW="false"`: make window title a tag.
- `GYAZO_DESC_TAG_URL="false"`: make URL domain a tag.
- `GYAZO_DESC_STYLE="compact"`: no `App:/Window:/URL:` prefixes (`labeled` restores labels).
- Gyazo docs: [Tagging images and videos](https://help.gyazo.com/hc/en-us/articles/360022774792-Tagging-images-and-videos)

## Common Breakages

`Set GYAZO_ACCESS_TOKEN in ./config.env`
- token is missing.

`You are not authorized.`
- `client_secret` was used instead of access token, or `$TOKEN` is empty.

`Capture file not found`
- no file in `CAPTURE_DIR`, or path is wrong.

`No text input found (args/stdin/clipboard).`
- `notes_capture_from_clipboard.sh` received no text from args, stdin, or clipboard.

`No notes in inbox.`
- no `.md` / `.txt` files in `NOTES_INBOX_DIR`.

`magick failed to start`
- install ImageMagick so `magick` exists in `PATH`.

Note looks blurry
- set `NOTES_RENDER_ENGINE="python"` in `config.env`.
- set `NOTES_RENDER_SCALE="2"` or `"3"`.

Command hangs with no output
- check macOS permission popups (`Accessibility` / `Automation`).
- reduce `CURL_MAX_TIME_SEC` in `config.env`.
- reduce `NOTES_OSASCRIPT_TIMEOUT_SEC` in `config.env`.

Link is not shareable
- set `GYAZO_ACCESS_POLICY="anyone"` for public links.

System asks for permissions (`Accessibility` / `Automation` / `Files and Folders`)
- this is expected for reading `App`, `Window`, and `URL`.
- add your terminal app to `Accessibility`.
- if prompted for `env`, allow `/usr/bin/env`.

Auto mode does not trigger
- check:

```bash
launchctl print "gui/$(id -u)/com.gyazo-capture-bridge" >/dev/null && echo "loaded" || echo "not loaded"
```

Wrong `App`/`Window` in description
- verify `Accessibility` / `Automation` permissions.

## Full Manuals

- `../README.md`
- `./NOTES_PRACTICAL_GUIDE.md`
- `./DECISION_JOURNAL.md`
