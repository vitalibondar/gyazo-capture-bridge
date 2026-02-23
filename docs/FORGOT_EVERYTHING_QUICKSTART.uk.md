# Швидкий Старт Після Паузи

Мова: [English](./FORGOT_EVERYTHING_QUICKSTART.md) | **Українська** | [日本語](./FORGOT_EVERYTHING_QUICKSTART.ja.md)

Коротка шпаргалка, якщо ти давно не відкривав цей проєкт.

## 30 Секунд

- Твій інструмент захоплення зберігає картинки в теку.
- Ці скрипти відправляють скріни в Gyazo.
- Основний запуск: `./upload_gyazo.sh`.
- Основні налаштування: `./config.env`.
- Для текстових нотаток: `./notes_capture_from_clipboard.sh` + `./notes_process_inbox.sh`.

## Як Швидко Оживити

1. Перейди в папку:

```bash
cd /path/to/gyazo-capture-bridge
```

2. Відкрий конфіг:

```bash
open -e ./config.env
```

3. Перевір ключ:
- `GYAZO_ACCESS_TOKEN` не має бути плейсхолдером.
- Формат у `./config.env`: `GYAZO_ACCESS_TOKEN="тут_токен"` (рекомендовано в подвійних лапках).

4. Перевір теку захоплень:
- `CAPTURE_DIR` має вказувати на папку зі скрінами (актуальне значення дивись у `./config.env`).

5. Швидка перевірка:

```bash
./upload_gyazo.sh
```

6. Очікувано:
- у терміналі з'являється Gyazo URL
- URL копіюється в буфер
- у `$LOG_FILE` з'являється новий рядок

Де саме лог:

```bash
source ./config.env
echo "$LOG_FILE"
ls -la "$LOG_FILE"
```

## Як Швидко Отримати Токен Доступу Gyazo (access token)

1. Вхід: [https://gyazo.com/login](https://gyazo.com/login)
2. API-сторінка: [https://gyazo.com/api](https://gyazo.com/api)
3. Панель застосунків: [https://gyazo.com/oauth/applications](https://gyazo.com/oauth/applications)
4. Створення застосунку: [https://gyazo.com/oauth/applications/new](https://gyazo.com/oauth/applications/new)
5. Згенеруй Access Token і встав його в `./config.env`

Мінімальна перевірка токена:

```bash
TOKEN="встав_свій_access_token"
curl -i -sS https://api.gyazo.com/api/users/me -H "Authorization: Bearer $TOKEN"
```

Якщо бачиш `HTTP/2 200`, токен робочий.

## Авто-Режим

Увімкнути:

```bash
source ./config.env
./install_launch_agent.sh "$CAPTURE_DIR"
```

Вимкнути м'яко:
- `ENABLE_AUTO_UPLOAD="false"` у `./config.env`

Вимкнути повністю:

```bash
./uninstall_launch_agent.sh
```

## Нотатки За 1 Хвилину

Захопити виділений текст із буфера у вхідну теку:

```bash
./notes_capture_from_clipboard.sh
```

Захопити текст напряму (без буфера):

```bash
./notes_capture_from_clipboard.sh "Тестова нотатка"
```

Обробити вхідну теку (рендер у картинку + завантаження в Gyazo):

```bash
./notes_process_inbox.sh
```

Де дивитись результати:

```bash
source ./config.env
echo "$NOTES_ARCHIVE_DIR"
echo "$NOTES_RENDERED_DIR"
echo "$NOTES_INDEX_FILE"
```

Мінімальні дефолтні налаштування для нотаток:
- `NOTES_GYAZO_ACCESS_POLICY="only_me"`
- `NOTES_GYAZO_DESC_TAG="#notes"`
- `NOTES_DESC_STYLE="compact"`
- `NOTES_PROCESS_AFTER_CAPTURE="false"`
- `NOTES_OSASCRIPT_TIMEOUT_SEC="2"`
- `NOTES_RENDER_ENGINE="auto"`
- `NOTES_RENDER_SCALE="2"`
- `NOTES_COPY_URL_TO_CLIPBOARD="true"`
- `NOTES_SIZE_PRESET="mobile"` (`desktop` для ноутбука, `custom` для ручних значень)
- `NOTES_RENDER_WIDTH="430"` (використовується в `custom`)
- `NOTES_RENDER_WINDOW_DOTS="false"` (опційно ввімкни `true`; при `false` верхній blank-header не додається)
- `NOTES_COLOR_MODE="random_sticky"` (випадкові спокійні теми без повтору)
- `NOTES_PAGE_MAX_CHARS="900"` (довгі нотатки автоматично діляться)
- `NOTES_PAGE_LABEL="true"` (підпис типу `1/3`)
- `NOTES_PAGE_UNIFORM_SIZE="true"` (усі сторінки одного розміру)
- `NOTES_UPLOAD_LAST_PAGE_FIRST="true"` (для Gyazo-feed)
- `NOTES_GYAZO_SEND_CREATED_AT="false"` (щоб порядок не ламався через mtime файлів)

## Корисні Метадані Gyazo (через `./config.env`)

- `GYAZO_SEND_APP_METADATA="true"`: назва активного застосунку.
- `GYAZO_SEND_TITLE_METADATA="true"`: читабельний `title` (назва вкладки/вікна).
- `GYAZO_TITLE_BROWSER_MODE="url"`: для браузера в полі Source буде URL (або `"tab"` для назви вкладки).
- `GYAZO_SEND_DESC_METADATA="true"`: читабельний `desc` з App/Window/URL.
- `GYAZO_SEND_CREATED_AT="true"`: час файлу в `created_at`.
- `GYAZO_ACCESS_POLICY="only_me"` (за замовчуванням, приватно) або `"anyone"` (публічне посилання).
- примітка: `only_me` може залежати від тарифу акаунту (див. документацію про visibility).
- `GYAZO_CONTEXT_NOTE=""`: додатковий контекст (проєкт/тема) для `desc`.
- `GYAZO_DESC_TAG="#capture"`: тег у кінці `desc` (одне слово, для розділення використовуй `_`).
- `GYAZO_DESC_TAG_APP="true"`: `App` як тег (`#Safari` у compact-режимі).
- `GYAZO_DESC_TAG_WINDOW="false"`: чи робити `Window` тегом.
- `GYAZO_DESC_TAG_URL="false"`: чи робити `URL` тегом (по домену).
- `GYAZO_DESC_STYLE="compact"`: формат `desc` без префіксів (`labeled` повертає `App:/Window:/URL:`).
- Gyazo docs: [Tagging images and videos](https://help.gyazo.com/hc/en-us/articles/360022774792-Tagging-images-and-videos)

## Найчастіші Поломки

`Set GYAZO_ACCESS_TOKEN in ./config.env`
- ключ не задано.

`You are not authorized.`
- ти вставив `client_secret` замість `access token`, або `$TOKEN` порожній.

`Capture file not found`
- нема файлу в `CAPTURE_DIR`, або невірний шлях.

`No text input found (args/stdin/clipboard).`
- `notes_capture_from_clipboard.sh` нічого не зберігає, якщо немає тексту в аргументах, stdin або буфері.

`No notes in inbox.`
- у `NOTES_INBOX_DIR` немає `.md/.txt`.

`magick failed to start`
- встанови ImageMagick так, щоб команда `magick` була в `PATH`.

Нотатка виглядає "мильно"
- постав `NOTES_RENDER_ENGINE="python"` у `config.env`.
- постав `NOTES_RENDER_SCALE="2"` або `3`.

Команда зависає без виводу
- перевір системні попапи доступів (`Accessibility` / `Automation`).
- для мережі: зменш `CURL_MAX_TIME_SEC` у `config.env`.
- для збору контексту notes: зменш `NOTES_OSASCRIPT_TIMEOUT_SEC` у `config.env`.

Посилання не відкривається для інших:
- для публічного посилання постав `GYAZO_ACCESS_POLICY="anyone"`.

Система просить доступи (`Accessibility` / `Automation` / `Files and Folders`):
- це нормальна поведінка для читання `App`, `Window`, `URL`.
- додай свій термінал у `Accessibility`.
- якщо просить `env`, додай `/usr/bin/env`.

Авто не тригериться:
- перевір:

```bash
launchctl print "gui/$(id -u)/com.gyazo-capture-bridge" >/dev/null && echo "loaded" || echo "not loaded"
```

У `desc` неправильний `App`/`Window`:
- перевір доступи `Accessibility` / `Automation`.

## Повна Документація

- `../README.md`
- `./NOTES_PRACTICAL_GUIDE.md` (простий посібник по нотатках)
- `./DECISION_JOURNAL.md` (чому рішення саме такі, ідеї на потім)
