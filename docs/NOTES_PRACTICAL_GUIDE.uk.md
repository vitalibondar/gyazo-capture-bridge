# Практичний Посібник Для Нотаток

Мова: [English](./NOTES_PRACTICAL_GUIDE.md) | **Українська** | [日本語](./NOTES_PRACTICAL_GUIDE.ja.md)

Це найпростіша інструкція без зайвого.
Копіюй команди блоками як є.
Перед стартом перейди в папку проєкту:

```bash
cd /path/to/gyazo-capture-bridge
```

## 1) Один запуск (найчастіший сценарій)

```bash
./notes_capture_from_clipboard.sh "Моя нотатка $(date)"
```

Що має статись:
- з'являється лінк Gyazo в терміналі;
- цей лінк копіюється в буфер обміну;
- у Gyazo з'являється нова картинка.

## 2) Якщо текст уже в буфері (без аргументів)

```bash
./notes_capture_from_clipboard.sh
```

Цей режим бере текст із буфера й намагається зчитати контекст активного застосунку.

## 3) Чому в Gyazo поле `App` інколи порожнє

Це нормально для режиму `manual`:
- якщо запускаєш з аргументом (`./notes_capture_from_clipboard.sh "..."`), скрипт ставить `source_app=manual`;
- для такого кейсу ми не відправляємо поле `app` в Gyazo (щоб не було сміття типу `manual`/`ghostty`);
- тому в інтерфейсі Gyazo бачиш заглушку `Input name of App`.

Якщо хочеш бачити реальний застосунок у metadata:
- зроби текст у буфері;
- запусти `./notes_capture_from_clipboard.sh` без аргументів, коли потрібний застосунок активний.

Формат `desc` для нотаток:
- перший рядок у коментарі Gyazo лишається змістовним (заголовок/текст);
- тег застосунку додається в останній рядок із тегами (наприклад: `#notes #Safari`).

## 4) Швидка перевірка, що все живе

```bash
source ./config.env
./notes_capture_from_clipboard.sh "health check $(date)"
tail -n 5 "$LOG_FILE"
tail -n 1 "$NOTES_INDEX_FILE"
```

В `LOG_FILE` шукай `OK`.

## 5) Налаштування вигляду (mobile-first)

Поточний дефолт:
- `NOTES_SIZE_PRESET="mobile"` (пресет під читання на телефоні)
- `NOTES_RENDER_WIDTH="430"` (лише якщо `NOTES_SIZE_PRESET="custom"`)
- `NOTES_RENDER_WINDOW_DOTS="false"` (без верхнього blank-відступу)
- `NOTES_COLOR_MODE="random_sticky"` (випадкова м'яка тема)
- `NOTES_COPY_URL_TO_CLIPBOARD="true"`
- `NOTES_PAGE_MAX_CHARS="900"` (довгі нотатки діляться на сторінки)
- `NOTES_PAGE_UNIFORM_SIZE="true"` (всі сторінки однієї нотатки однакові за розміром)
- `NOTES_UPLOAD_LAST_PAGE_FIRST="true"` (у Gyazo спочатку летить остання сторінка)
- `NOTES_GYAZO_SEND_CREATED_AT="false"` (feed-порядок не псується mtime)

Повернути точки-контроли у верхньому рядку:

```bash
sed -i '' 's/^NOTES_RENDER_WINDOW_DOTS=.*/NOTES_RENDER_WINDOW_DOTS="true"/' ./config.env
```

Перемкнутися на desktop-пресет (ширша "сторінка" для ноутбука):

```bash
sed -i '' 's/^NOTES_SIZE_PRESET=.*/NOTES_SIZE_PRESET="desktop"/' ./config.env
```

Повернутися на mobile-пресет:

```bash
sed -i '' 's/^NOTES_SIZE_PRESET=.*/NOTES_SIZE_PRESET="mobile"/' ./config.env
```

Зробити текст дрібнішим:

```bash
sed -i '' 's/^NOTES_RENDER_POINT_SIZE=.*/NOTES_RENDER_POINT_SIZE="22"/' ./config.env
sed -i '' 's/^NOTES_RENDER_LINE_SPACING=.*/NOTES_RENDER_LINE_SPACING="8"/' ./config.env
```

Зробити картку ширшою:

```bash
sed -i '' 's/^NOTES_RENDER_WIDTH=.*/NOTES_RENDER_WIDTH="520"/' ./config.env
```

Вимкнути пагінацію (завжди одна довга картка):

```bash
sed -i '' 's/^NOTES_PAGE_MAX_CHARS=.*/NOTES_PAGE_MAX_CHARS="0"/' ./config.env
```

Фіксований колір замість випадкових тем:

```bash
sed -i '' 's/^NOTES_COLOR_MODE=.*/NOTES_COLOR_MODE="fixed"/' ./config.env
```

## 6) Важливе правило про команди

Не вставляй у shell рядки, що починаються з `#`.
Це коментарі для людини, а не команда для термінала.
