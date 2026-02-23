# Decision Journal

Language: **English** | [Українська](./DECISION_JOURNAL.uk.md) | [日本語](./DECISION_JOURNAL.ja.md)

This is not a changelog.
This is a decision log with reasoning and unrealized ideas, so context survives between sessions.

## How to read this

- `[D]` — accepted decision.
- `[R]` — reasoning / constraints.
- `[I]` — future idea.
- `[X]` — rejected option.

## Entry format

Each significant step is added as one block:

```text
### YYYY-MM-DD HH:MM — Decision title
[D] What we decided.
[R] Why this approach.
[R] Tradeoffs / risks.
[X] What was rejected (if any).
[I] What can be added later (optional).
[R] How we validated (command / symptom / log).
```

## Baseline (current state)

### 2026-02-06 — Choose scripts, not a separate app
[D] Core integration is shell scripts + `launchd`.
[R] We need simplicity, `config.env` control, and minimum dependencies.
[X] Full standalone macOS app postponed as unnecessary complexity.

### 2026-02-06 — Two operation modes
[D] Keep both manual mode (`upload_gyazo.sh`) and auto mode (`auto_dispatch.sh` + LaunchAgent).
[R] Manual mode is needed for control; auto mode is needed for daily flow.

### 2026-02-07 — Gyazo token: strict format rules
[D] Token is stored as `GYAZO_ACCESS_TOKEN="..."` in `config.env`.
[R] Common mistake: confusing access token with `client_secret` or passing an empty variable.
[R] Validity check: `GET /api/users/me` returns `HTTP 200`.

### 2026-02-07 — LaunchAgent `Operation not permitted`
[D] Recommend running project outside `Documents` (working path moved to `~/gyazo-capture-bridge`).
[R] `launchd` failed to execute scripts from protected `Documents` area (TCC/permissions context).
[R] Symptom: `last exit code = 126` and `Operation not permitted` in launchd stderr.

### 2026-02-07 — Gyazo metadata: useful minimum only
[D] Send only useful context by default: `App`, `Window`, and `URL` (for browsers).
[R] Best fit for “remember later” use case, not forensic logging.
[X] Full technical metadata dump rejected as noise.

### 2026-02-07 — Capture context at file event time
[D] In auto mode, capture context immediately, before sleep/upload.
[R] Otherwise description can contain the wrong app if user switched focus.
[R] Implementation: overrides `FRONTMOST_APP_OVERRIDE`, `FRONT_WINDOW_TITLE_OVERRIDE`, `BROWSER_URL_OVERRIDE`, `BROWSER_TAB_TITLE_OVERRIDE`.

### 2026-02-08 — Description format: compact by default
[D] Default `desc` format is compact, without `App:/Window:/URL:` labels.
[R] Better readability in Gyazo feed.
[D] Added `GYAZO_DESC_STYLE` switch:
- `compact` (default)
- `labeled`

### 2026-02-08 — Gyazo tags: single-word default
[D] Default final tag is `#capture`.
[R] Gyazo truncates tags with hyphens; one word or `_` is stable.
[D] Added flexible attribute tagging:
- `GYAZO_DESC_TAG_APP`
- `GYAZO_DESC_TAG_WINDOW`
- `GYAZO_DESC_TAG_URL`
- `GYAZO_DESC_TAG`

### 2026-02-08 — Default access policy: private
[D] Default `GYAZO_ACCESS_POLICY="only_me"`.
[R] Safer default for personal use.
[R] For link sharing, set `anyone` explicitly.
[R] Gyazo help docs note visibility features may depend on paid plans, which can affect `only_me` behavior.

### 2026-02-08 — Password protected images
[D] Current public upload API path does not set a password on upload.
[R] Web UI has this option, but upload API docs do not expose password params.
[I] If Gyazo adds an API endpoint for password protection, add config params.

### 2026-02-08 — Notes pipeline: inbox-first
[D] Notes flow is `inbox -> render -> upload -> archive -> index`.
[R] Separates text capture from upload moment and does not interfere with the main capture flow.
[R] Enables manual notes by dropping `.md/.txt` files into inbox.
[R] Sidecar `.meta.json` + front matter stores context (`app/window/url/title/time`) without extra DB.

### 2026-02-08 — Notes metadata via upload overrides
[D] `notes_pipeline.js` does not call Gyazo directly; it invokes `upload_gyazo.sh` with `UPLOAD_*` overrides.
[R] One integration point for API, tags, access policy, and logging.
[X] Duplicating curl logic in another script rejected.

### 2026-02-08 — Notes render without overengineering
[D] Render uses ImageMagick `caption:@file` + lightweight markdown-to-text.
[R] Minimum dependencies and fast startup.
[X] Full HTML/CSS or headless-browser renderer postponed as overkill.
[R] Code blocks are rendered as plain text (no syntax highlighting).

### 2026-02-08 — Notes font: safe fallback
[D] If `NOTES_FONT_FAMILY` is unsupported by local ImageMagick build, pipeline retries render without `-font`.
[R] On some systems `magick` fails on system fonts (`delegate/freetype`), while default render still works.
[R] This avoids fatal failure in fallback scenario.

### 2026-02-08 — Fixed: `No notes in inbox` even when notes exist
[D] Enabled `set -a` before `source config.env` in `notes_process_inbox.sh` so `NOTES_*` exports to env for Node.
[R] Previously `notes_capture_from_clipboard.sh` wrote to configured `NOTES_INBOX_DIR`, while `notes_pipeline.js` read default `./notes-data/inbox`.
[R] User symptom: capture looked silent, then `./notes_process_inbox.sh` returned `No notes in inbox.`.

### 2026-02-08 — Fixed: silent exit in `notes_capture_from_clipboard.sh`
[D] Switched `note_id` generation from `tr | head` pipeline to `hexdump`.
[R] With `set -euo pipefail`, pipeline hit SIGPIPE and exited silently before file creation.
[R] Also added explicit error message for empty / non-plain clipboard.

### 2026-02-08 — Anti-hang guardrails
[D] Added `NOTES_OSASCRIPT_TIMEOUT_SEC` (default `2`) for notes context capture.
[R] `osascript` can block on TCC/Automation prompts; note capture should not be lost.
[D] Added `CURL_CONNECT_TIMEOUT_SEC` and `CURL_MAX_TIME_SEC` for uploads.
[R] Network or endpoint hang now ends in controlled timeout instead of infinite wait.

### 2026-02-08 — Capture input fallback: args/stdin/clipboard
[D] `notes_capture_from_clipboard.sh` accepts text from 3 sources: args -> stdin -> clipboard.
[R] Removes dependence on fragile manual `pbcopy` flow and simplifies validation.
[R] Reduces “nothing happened” cases when clipboard is empty/unavailable.

### 2026-02-08 — Notes renderer quality upgrade
[D] Notes render order changed to `python (Pillow) -> swift -> magick` when `NOTES_RENDER_ENGINE=auto`.
[R] Current environment ImageMagick is built without freetype and produces rough bitmap text.
[R] Python + Pillow gives smooth text, rounded cards, and better readability without complex dependencies.
[D] Added style params: `NOTES_RENDER_SURFACE_COLOR`, `NOTES_RENDER_RADIUS`, `NOTES_RENDER_SCALE`.

### 2026-02-08 — Metadata noise fix for CLI note capture
[D] In `args/stdin` mode, `notes_capture_from_clipboard.sh` marks source as `manual`.
[R] Prevents noisy tags like `#ghostty` from terminal-driven tests.
[R] Active app/window/URL context is kept only for clipboard mode without args.

### 2026-02-08 — Notes UX parity with screenshots
[D] Enabled `NOTES_COPY_URL_TO_CLIPBOARD=true` by default.
[R] Expected behavior should match screenshot uploads: link is ready in clipboard immediately.
[D] For `source_app=manual`, app line and app metadata are removed from description via upload overrides.
[R] Removes noisy tags (`#ghostty`, `#manual`) from CLI-created notes.

### 2026-02-08 — Mobile-first defaults for notes cards
[D] Changed default `NOTES_RENDER_WIDTH` to `430` (mobile-first) and `NOTES_RENDER_WINDOW_DOTS` to `false`.
[R] Card is more readable in vertical phone view; window controls stay optional.

### 2026-02-08 — Separate notes quick guide
[D] Added `NOTES_PRACTICAL_GUIDE.md` with copy/paste commands and no extra context.
[R] Faster recovery without reading a large README.
[R] Explicitly documents the difference between `manual` and clipboard modes for Gyazo `App` field.

### 2026-02-10 — Multi-page notes + sticky palettes
[D] Added automatic pagination via `NOTES_PAGE_MAX_CHARS` (`0` disables).
[D] Added page marker in card (`NOTES_PAGE_LABEL=true`, format `1/3`).
[D] Default multi-page upload order is `last -> first` (`NOTES_UPLOAD_LAST_PAGE_FIRST=true`).
[R] Gyazo feed sorts newest first; this order makes left/right browsing feel natural.
[D] Added soft sticky-note palette mode (`NOTES_COLOR_MODE=random_sticky`) without repeating previous theme.
[D] Added state file `NOTES_THEME_STATE_FILE` to remember previous theme.
[R] Different notes are easier to distinguish in feed; all pages of one note keep the same color.

### 2026-02-10 — Feed order + uniform page size fix
[D] Added `NOTES_GYAZO_SEND_CREATED_AT=false` by default for notes uploads.
[R] Sending `created_at` (file mtime) can break expected multi-page order in Gyazo feed.
[D] Added `NOTES_PAGE_UNIFORM_SIZE=true`: after render, pages are normalized to one canvas size.
[R] Removes size “jumping” while paging through note cards in Gyazo.

### 2026-02-10 — Notes size presets (`mobile` / `desktop`)
[D] Added `NOTES_SIZE_PRESET` with three modes: `mobile`, `desktop`, `custom`.
[D] `mobile` and `desktop` presets set coherent width, typography, and `NOTES_PAGE_MAX_CHARS`.
[R] Gives stable no-scroll UX for phone and laptop scenarios without tuning many variables manually.

### 2026-02-10 — Browser `Source` mode in Gyazo: URL vs tab title
[D] Added `GYAZO_TITLE_BROWSER_MODE` (`url` or `tab`).
[D] Default in `config.env` is `url`.
[R] For web content, direct URL in Gyazo `Source` is more useful than tab title.

### 2026-02-11 — Philosophy first: tri-language `WHY` page
[D] Added a short project rationale document in 3 languages: `WHY.md`, `WHY.uk.md`, `WHY.ja.md`.
[D] Placed `WHY` links at the top of all readmes, so first-time readers see purpose before setup details.
[R] Main public question is “why this exists if official app exists”; answer must be immediate and consistent.
[R] This reduces onboarding friction and aligns messaging for GitHub presentation.

## Unrealized but useful ideas

### [I] Universal text-capture hotkey (no Keyboard Maestro dependency)
[I] Add a native macOS capture path based on Quick Action + AppleScript wrapper:
- trigger `Cmd+C`;
- read selected text from clipboard;
- call `notes_capture_from_clipboard.sh`.
[R] Makes note capture available without paid automation tools and keeps one shared script path.

### [I] Firefox URL via extension
[R] AppleScript URL extraction is less stable in Firefox than Safari/Chromium browsers.
[I] A minimal browser extension can provide more stable local URL handoff.

### [I] Simple privacy profiles
[I] Preset profiles in `config.env`:
- `private` (`only_me`, `metadata_is_public=false`)
- `share` (`anyone`, minimal metadata)

### [I] Log rotation
[I] Auto-archive `gyazo-upload.log` when file exceeds a configured size.

## Ongoing process

For each meaningful change in script behavior or default settings:
- add one entry block here using the template;
- update related sections in `README.md`;
- if daily usage changed, update `FORGOT_EVERYTHING_QUICKSTART.md` too.
