# Gyazo Capture Bridge (macOS)

Мова: [English](./README.md) | **Українська** | [日本語](./README.ja.md)
Почни звідси: [Навіщо це](./WHY.uk.md) | [English](./WHY.md) | [日本語](./WHY.ja.md)

Невеликий міст для macOS, який вивантажує файли-захоплення екрана в Gyazo.
Працює з будь-яким інструментом, що зберігає картинки в теку: Shottr, системна Screenshot у macOS, CleanShot X, Flameshot або твій скрипт.

## Що вміє

- Ручний аплоад (`upload_gyazo.sh`)
- Автоаплоад через `launchd` (`auto_dispatch.sh` + `install_launch_agent.sh`)
- Керовані метадані Gyazo (app, source/title, description, tags, access policy)
- Пайплайн нотаток (`notes_capture_from_clipboard.sh` + `notes_pipeline.js`): текст -> картинка -> Gyazo
- Пресети нотаток (`mobile`, `desktop`, `custom`) і багатосторінковість

## Файли проєкту

- `config.env` - локальні runtime-налаштування (не комітити)
- `config.env.example` - шаблон
- `upload_gyazo.sh` - вивантаження картинки в Gyazo
- `auto_dispatch.sh` - диспетчер автоаплоаду
- `install_launch_agent.sh` / `uninstall_launch_agent.sh` - увімкнення/вимкнення авто-режиму
- `com.vb.gyazo-capture-bridge.plist.template` - шаблон LaunchAgent
- `notes_capture_from_clipboard.sh` - захоплення тексту в notes inbox
- `notes_process_inbox.sh` - обробка notes inbox
- `notes_pipeline.js` - рендер карток, аплоад, архів, індекс
- `WHY.uk.md` - коротко про мотивацію і філософію проєкту
- `FORGOT_EVERYTHING_QUICKSTART.md` - коротка recovery-шпаргалка
- `NOTES_PRACTICAL_GUIDE.md` - практичний notes-гайд
- `DECISION_JOURNAL.md` - журнал рішень і аргументів
- `TRADEMARKS.uk.md` - юридична примітка про торгові марки

## Вимоги

- macOS
- `curl`, `plutil`, `osascript`, `pbcopy`
- `node` (для notes pipeline)
- `python3` + Pillow бажано для кращої якості рендеру нотаток
- будь-який інструмент захоплення, що зберігає картинки в `CAPTURE_DIR`

## Швидкий старт

1. Зайди в папку проєкту:

```bash
cd /path/to/gyazo-capture-bridge
```

2. Створи локальний конфіг:

```bash
cp ./config.env.example ./config.env
```

3. Відкрий конфіг:

```bash
open -e ./config.env
```

4. Заповни `GYAZO_ACCESS_TOKEN` і `CAPTURE_DIR`.

## Як отримати Gyazo access token

1. Логін: [Gyazo Login](https://gyazo.com/login)
2. API-сторінка: [Gyazo API](https://gyazo.com/api)
3. Dashboard застосунків: [Gyazo OAuth Apps](https://gyazo.com/oauth/applications)
4. Створення застосунку: [New OAuth App](https://gyazo.com/oauth/applications/new)
5. Згенеруй access token і встав у `config.env`

Формат у `config.env`:

```bash
GYAZO_ACCESS_TOKEN="YOUR_REAL_TOKEN"
```

`Bearer` у `config.env` не додавай.

Швидка перевірка токена:

```bash
TOKEN="YOUR_REAL_TOKEN"
curl -sS https://api.gyazo.com/api/users/me -H "Authorization: Bearer $TOKEN"
```

## Ручний аплоад

Завантажити останній файл із `CAPTURE_DIR`:

```bash
./upload_gyazo.sh
```

Завантажити конкретний файл:

```bash
./upload_gyazo.sh "$CAPTURE_DIR/example.png"
```

## Авто-режим

Встановити launch agent:

```bash
source ./config.env
./install_launch_agent.sh "$CAPTURE_DIR"
```

Видалити:

```bash
./uninstall_launch_agent.sh
```

## Notes pipeline

Захопити текст із буфера (і за потреби одразу обробити, якщо `NOTES_PROCESS_AFTER_CAPTURE=true`):

```bash
./notes_capture_from_clipboard.sh
```

Захопити явний текст:

```bash
./notes_capture_from_clipboard.sh "Моя нотатка $(date)"
```

Обробити inbox вручну:

```bash
./notes_process_inbox.sh
```

## Важливі налаштування метаданих

- `GYAZO_ACCESS_POLICY`: `only_me` або `anyone`
- `GYAZO_TITLE_BROWSER_MODE`: `url` або `tab`
- `GYAZO_DESC_TAG`: фінальний хештег (одне слово)
- `GYAZO_DESC_STYLE`: `compact` або `labeled`
- `CAPTURE_DIR`: тека, яку скрипт моніторить на нові картинки

## Важливі дозволи macOS

Можуть знадобитися:

- Accessibility (визначення активної апки/вікна)
- Automation (читання URL/назви вкладки браузера)
- Files and Folders (доступ до Pictures/Documents)

## Автоматизація (опційно)

Можеш запускати захоплення нотаток з будь-якого інструмента автоматизації або просто з терміналу.

## Troubleshooting

`You are not authorized.`
- неправильний токен (часто вставляють `client_secret` замість access token)

`Capture file not found: <empty>`
- невірний `CAPTURE_DIR` або в теці немає файлів

`No text input found (args/stdin/clipboard).`
- скрипт notes не отримав тексту з args/stdin/clipboard

`No notes in inbox.`
- у `NOTES_INBOX_DIR` немає `.md` / `.txt`

## Юридично

Цей проєкт незалежний і не афілійований з Gyazo / Helpfeel Inc.
Деталі: [TRADEMARKS.uk.md](./TRADEMARKS.uk.md).

## Ліцензія

MIT. Дивись [LICENSE](./LICENSE).
