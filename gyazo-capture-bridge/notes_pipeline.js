#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function env(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

function envBool(name, fallback) {
  const raw = env(name, fallback ? "true" : "false").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function envInt(name, fallback) {
  const raw = env(name, String(fallback));
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toPresetName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function applySizePreset(cfg) {
  const preset = toPresetName(cfg.sizePreset);
  if (preset === "mobile") {
    return {
      ...cfg,
      width: 900,
      borderPx: 26,
      pointSize: 29,
      lineSpacing: 10,
      radius: 18,
      pageMaxChars: 700,
    };
  }
  if (preset === "desktop") {
    return {
      ...cfg,
      width: 1280,
      borderPx: 34,
      pointSize: 31,
      lineSpacing: 11,
      radius: 20,
      pageMaxChars: 1200,
    };
  }
  return cfg;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanInlineTypography(text) {
  return text
    .replace(/(\w)'(\w)/g, "$1’$2")
    .replace(/\s-\s/g, " — ")
    .replace(/"([^"]+)"/g, "«$1»");
}

function stripInlineMarkdown(text) {
  let out = cleanInlineTypography(text);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1");
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/\*([^*]+)\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/_([^_]+)_/g, "$1");
  out = out.replace(/`([^`]+)`/g, "$1");
  return out;
}

function parseFrontMatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { meta: {}, body: normalized };
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return { meta: {}, body: normalized };
  }
  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  const meta = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) {
      continue;
    }
    meta[key] = value;
  }
  return { meta, body };
}

function sanitizeMeta(meta) {
  const out = { ...meta };
  const fields = [
    "source_app",
    "source_window",
    "source_url",
    "source_title",
    "captured_at",
    "context_note",
  ];
  for (const field of fields) {
    if (out[field] === undefined || out[field] === null) {
      out[field] = "";
      continue;
    }
    out[field] = String(out[field]).trim();
  }
  return out;
}

function toHashtag(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[\s\-./:]+/g, "_")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) {
    return "";
  }
  return `#${normalized}`;
}

function splitTagsLine(value) {
  return String(value || "")
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mergeTagsLine(baseLine, extraTag) {
  const seen = new Set();
  const merged = [];
  for (const tag of [...splitTagsLine(baseLine), ...splitTagsLine(extraTag)]) {
    if (!tag.startsWith("#")) {
      continue;
    }
    if (seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    merged.push(tag);
  }
  return merged.join(" ");
}

function buildCardText(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const chunks = [];
  let inCode = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCode = !inCode;
      if (inCode) {
        const codeLang = trimmed.slice(3).trim();
        chunks.push(codeLang ? `\`\`\`${codeLang}` : "```");
      } else {
        chunks.push("```");
      }
      chunks.push("");
      continue;
    }

    if (inCode) {
      chunks.push(line);
      continue;
    }

    if (trimmed.length === 0) {
      chunks.push("");
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      chunks.push(stripInlineMarkdown(heading[2]).toUpperCase());
      chunks.push("");
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      chunks.push(`❝ ${stripInlineMarkdown(quote[1])}`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      chunks.push(`• ${stripInlineMarkdown(bullet[1])}`);
      continue;
    }

    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numbered) {
      chunks.push(`${numbered[1]}. ${stripInlineMarkdown(numbered[2])}`);
      continue;
    }

    chunks.push(stripInlineMarkdown(line));
  }

  return chunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function runOrThrow(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...opts,
  });
  if (result.error) {
    throw new Error(`${cmd} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(`${cmd} failed (${result.status})\n${stderr || stdout}`);
  }
  return result;
}

const SWIFT_RENDER_SCRIPT = String.raw`
import Foundation
import AppKit

func parseColor(_ hex: String, fallback: NSColor) -> NSColor {
  let cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines)
  let raw = cleaned.hasPrefix("#") ? String(cleaned.dropFirst()) : cleaned
  guard raw.count == 6 || raw.count == 8 else { return fallback }
  var value: UInt64 = 0
  guard Scanner(string: raw).scanHexInt64(&value) else { return fallback }

  if raw.count == 6 {
    let r = CGFloat((value & 0xFF0000) >> 16) / 255.0
    let g = CGFloat((value & 0x00FF00) >> 8) / 255.0
    let b = CGFloat(value & 0x0000FF) / 255.0
    return NSColor(calibratedRed: r, green: g, blue: b, alpha: 1.0)
  }

  let r = CGFloat((value & 0xFF000000) >> 24) / 255.0
  let g = CGFloat((value & 0x00FF0000) >> 16) / 255.0
  let b = CGFloat((value & 0x0000FF00) >> 8) / 255.0
  let a = CGFloat(value & 0x000000FF) / 255.0
  return NSColor(calibratedRed: r, green: g, blue: b, alpha: a)
}

let args = CommandLine.arguments
guard args.count >= 14 else {
  fputs("render args missing\n", stderr)
  exit(2)
}

let textPath = args[1]
let outPath = args[2]
let width = max(640.0, Double(args[3]) ?? 1440.0)
let pointSize = max(14.0, Double(args[4]) ?? 34.0)
let lineSpacing = max(0.0, Double(args[5]) ?? 12.0)
let bgHex = args[6]
let textHex = args[7]
let borderHex = args[8]
let surfaceHex = args[9]
let borderPx = max(12.0, Double(args[10]) ?? 36.0)
let scale = max(1, Int(args[11]) ?? 2)
let radius = max(8.0, Double(args[12]) ?? 20.0)
let fontName = args[13]

let textContent = (try? String(contentsOfFile: textPath, encoding: .utf8)) ?? ""
if textContent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
  fputs("text is empty\n", stderr)
  exit(2)
}

let outerPadding = CGFloat(borderPx)
let innerPadding = max(CGFloat(24), CGFloat(borderPx * 1.45))
let canvasWidth = CGFloat(width)
let cardWidth = canvasWidth - outerPadding * 2.0
let textWidth = cardWidth - innerPadding * 2.0

if textWidth <= 40 {
  fputs("invalid width\n", stderr)
  exit(2)
}

let baseFont = NSFont.systemFont(ofSize: CGFloat(pointSize), weight: .regular)
let font = fontName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  ? baseFont
  : (NSFont(name: fontName, size: CGFloat(pointSize)) ?? baseFont)

let paragraph = NSMutableParagraphStyle()
paragraph.lineBreakMode = .byWordWrapping
paragraph.lineSpacing = CGFloat(lineSpacing)

let attrs: [NSAttributedString.Key: Any] = [
  .font: font,
  .foregroundColor: parseColor(textHex, fallback: .black),
  .paragraphStyle: paragraph,
]
let attributed = NSAttributedString(string: textContent, attributes: attrs)
let textBounds = attributed.boundingRect(
  with: NSSize(width: textWidth, height: CGFloat.greatestFiniteMagnitude),
  options: [.usesLineFragmentOrigin, .usesFontLeading]
)

let textHeight = ceil(textBounds.height)
let cardHeight = max(CGFloat(220), textHeight + innerPadding * 2.0)
let canvasHeight = ceil(cardHeight + outerPadding * 2.0)

let pixelWidth = Int(ceil(canvasWidth * CGFloat(scale)))
let pixelHeight = Int(ceil(canvasHeight * CGFloat(scale)))

guard let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: pixelWidth,
  pixelsHigh: pixelHeight,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
) else {
  fputs("bitmap init failed\n", stderr)
  exit(2)
}

guard let ctx = NSGraphicsContext(bitmapImageRep: rep) else {
  fputs("graphics context failed\n", stderr)
  exit(2)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ctx
ctx.cgContext.setAllowsAntialiasing(true)
ctx.cgContext.setShouldAntialias(true)
ctx.cgContext.scaleBy(x: CGFloat(scale), y: CGFloat(scale))

let background = parseColor(bgHex, fallback: NSColor(calibratedWhite: 0.95, alpha: 1.0))
background.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight)).fill()

let cardRect = NSRect(x: outerPadding, y: outerPadding, width: cardWidth, height: cardHeight)
let cardPath = NSBezierPath(roundedRect: cardRect, xRadius: CGFloat(radius), yRadius: CGFloat(radius))

NSGraphicsContext.saveGraphicsState()
let shadow = NSShadow()
shadow.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.12)
shadow.shadowBlurRadius = 22
shadow.shadowOffset = NSSize(width: 0, height: -4)
shadow.set()
parseColor(surfaceHex, fallback: NSColor.white).setFill()
cardPath.fill()
NSGraphicsContext.restoreGraphicsState()

parseColor(borderHex, fallback: NSColor(calibratedWhite: 0.8, alpha: 1.0)).setStroke()
cardPath.lineWidth = 2.0
cardPath.stroke()

let textRect = NSRect(
  x: cardRect.minX + innerPadding,
  y: cardRect.minY + innerPadding,
  width: textWidth,
  height: cardHeight - innerPadding * 2.0
)
attributed.draw(with: textRect, options: [.usesLineFragmentOrigin, .usesFontLeading])

NSGraphicsContext.restoreGraphicsState()

guard let pngData = rep.representation(using: .png, properties: [:]) else {
  fputs("png encode failed\n", stderr)
  exit(2)
}

do {
  try pngData.write(to: URL(fileURLWithPath: outPath))
} catch {
  fputs("write failed\n", stderr)
  exit(2)
}
`;

const PYTHON_RENDER_SCRIPT = String.raw`
import os
import re
import sys

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except Exception as e:
    print(f"Pillow import failed: {e}", file=sys.stderr)
    sys.exit(2)

if len(sys.argv) < 15:
    print("render args missing", file=sys.stderr)
    sys.exit(2)

text_path = sys.argv[1]
out_path = sys.argv[2]
width = max(640, int(float(sys.argv[3])))
point_size = max(14, int(float(sys.argv[4])))
line_spacing = max(0, int(float(sys.argv[5])))
bg_hex = sys.argv[6]
fg_hex = sys.argv[7]
border_hex = sys.argv[8]
surface_hex = sys.argv[9]
border_px = max(12, int(float(sys.argv[10])))
scale = max(1, int(float(sys.argv[11])))
radius = max(8, int(float(sys.argv[12])))
font_hint = sys.argv[13].strip()
window_dots = sys.argv[14].strip().lower() in ("1", "true", "yes", "on")

with open(text_path, "r", encoding="utf-8") as f:
    raw_text = f.read().strip()

if not raw_text:
    print("text is empty", file=sys.stderr)
    sys.exit(2)

def parse_hex(value, fallback):
    v = value.strip().lstrip("#")
    if len(v) == 6:
        try:
            return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16), 255)
        except Exception:
            return fallback
    if len(v) == 8:
        try:
            return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16), int(v[6:8], 16))
        except Exception:
            return fallback
    return fallback

def pick_font(size):
    candidates = []
    if font_hint:
        candidates.append(font_hint)
        if not os.path.splitext(font_hint)[1]:
            candidates.append(f"{font_hint}.ttf")
            candidates.append(f"{font_hint}.ttc")
    candidates.extend([
        "SFMono-Regular.otf",
        "SFMono-Regular.ttf",
        "Menlo.ttc",
        "Monaco.ttf",
        "Courier New.ttf",
        "Courier.ttc",
        "Helvetica.ttc",
        "Arial.ttf",
        "SFNS.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Menlo.ttc",
        "/System/Library/Fonts/Supplemental/Monaco.ttf",
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ])
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            pass
    return ImageFont.load_default()

font = pick_font(point_size * scale)
bg = parse_hex(bg_hex, (160, 173, 188, 255))
fg = parse_hex(fg_hex, (44, 47, 56, 255))
border = parse_hex(border_hex, (230, 230, 235, 255))
surface = parse_hex(surface_hex, (246, 247, 250, 255))

palette = {
    "default": parse_hex(fg_hex, (44, 47, 56, 255)),
    "keyword": (185, 74, 70, 255),
    "identifier": (93, 145, 178, 255),
    "function": (209, 122, 58, 255),
    "number": (171, 109, 184, 255),
    "string": (164, 138, 72, 255),
    "comment": (126, 136, 148, 255),
    "punct": (53, 56, 63, 255),
}

canvas_w = width * scale
outer = border_px * scale
inner = max(24 * scale, int(border_px * 1.35 * scale))
radius_px = radius * scale
line_gap = line_spacing * scale
header_h = int(44 * scale) if window_dots else 0

text_area_w = canvas_w - outer * 2 - inner * 2
if text_area_w <= 60:
    print("invalid width", file=sys.stderr)
    sys.exit(2)

measure_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
measure_draw = ImageDraw.Draw(measure_img)
line_height = font.getbbox("Ag")[3] - font.getbbox("Ag")[1]

def text_width(value):
    return measure_draw.textlength(value, font=font)

def wrap_chunks(chunks):
    if not chunks:
        return [""]
    out = []
    cur = ""
    for chunk in chunks:
        trial = f"{cur}{chunk}"
        if cur and text_width(trial) > text_area_w:
            out.append(cur.rstrip())
            cur = chunk.lstrip()
        else:
            cur = trial
    out.append(cur.rstrip())
    return out

def wrap_plain_line(line):
    parts = re.findall(r"\S+\s*|\s+", line)
    return wrap_chunks(parts)

def wrap_code_line(line):
    parts = re.findall(r"\s+|[^\s]+", line)
    return wrap_chunks(parts)

line_items = []
in_code = False
for raw_line in raw_text.split("\n"):
    trimmed = raw_line.strip()
    if trimmed.startswith(chr(96) * 3):
        in_code = not in_code
        continue
    if raw_line.strip() == "":
        line_items.append(("", False))
        continue
    if in_code:
        for piece in wrap_code_line(raw_line):
            line_items.append((piece, True))
    else:
        for piece in wrap_plain_line(raw_line):
            line_items.append((piece, False))

if not line_items:
    line_items = [(raw_text, False)]

text_h = len(line_items) * line_height + max(0, len(line_items) - 1) * line_gap
card_h = max(int(180 * scale), text_h + inner * 2 + header_h)
canvas_h = card_h + outer * 2

img = Image.new("RGBA", (canvas_w, canvas_h), bg)
draw = ImageDraw.Draw(img)

card_x0 = outer
card_y0 = outer
card_x1 = canvas_w - outer
card_y1 = outer + card_h

if canvas_h > 20:
    for y in range(canvas_h):
        mix = y / max(1, canvas_h - 1)
        c = (
            int(bg[0] * (1.0 - 0.08 * mix)),
            int(bg[1] * (1.0 - 0.08 * mix)),
            int(bg[2] * (1.0 - 0.08 * mix)),
            255,
        )
        draw.line([(0, y), (canvas_w, y)], fill=c)

shadow = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
shadow_draw = ImageDraw.Draw(shadow)
shadow_draw.rounded_rectangle(
    [card_x0, card_y0 + 6 * scale, card_x1, card_y1 + 6 * scale],
    radius=radius_px,
    fill=(0, 0, 0, 75),
)
shadow = shadow.filter(ImageFilter.GaussianBlur(radius=10 * scale))
img.alpha_composite(shadow)

draw.rounded_rectangle(
    [card_x0, card_y0, card_x1, card_y1],
    radius=radius_px,
    fill=surface,
    outline=border,
    width=max(2, scale),
)

if window_dots:
    dot_r = max(6, 7 * scale)
    dot_y = card_y0 + max(16 * scale, inner // 2)
    dot_x = card_x0 + max(16 * scale, inner // 2)
    gap = dot_r * 3
    draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=(255, 95, 86, 255))
    draw.ellipse([dot_x - dot_r + gap, dot_y - dot_r, dot_x + dot_r + gap, dot_y + dot_r], fill=(255, 189, 46, 255))
    draw.ellipse([dot_x - dot_r + gap * 2, dot_y - dot_r, dot_x + dot_r + gap * 2, dot_y + dot_r], fill=(39, 201, 63, 255))

KEYWORDS = {
    "const", "let", "var", "return", "if", "else", "for", "while", "function",
    "class", "import", "from", "export", "new", "try", "catch", "throw",
    "switch", "case", "break", "continue", "await", "async", "def", "lambda",
}
token_re = re.compile(r"//.*$|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|\\b\\d+(?:\\.\\d+)?\\b|\\b[A-Za-z_][A-Za-z0-9_]*\\b|===|==|=>|!=|<=|>=|&&|\\|\\||[{}()\\[\\].,;:+\\-*/%=&|<>!?]|\\s+")

def render_code_line(x, y, line):
    pos = x
    idx = 0
    for match in token_re.finditer(line):
        start, end = match.span()
        if start > idx:
            raw = line[idx:start]
            draw.text((pos, y), raw, font=font, fill=palette["default"])
            pos += text_width(raw)
        token = match.group(0)
        color = palette["default"]
        if token.isspace():
            color = palette["default"]
        elif token.startswith("//"):
            color = palette["comment"]
        elif token[0] in ("'", "\"", chr(96)):
            color = palette["string"]
        elif token in KEYWORDS:
            color = palette["keyword"]
        elif re.fullmatch(r"\\d+(?:\\.\\d+)?", token):
            color = palette["number"]
        elif re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", token):
            tail = line[end:].lstrip()
            color = palette["function"] if tail.startswith("(") else palette["identifier"]
        elif re.fullmatch(r"[{}()\\[\\].,;:+\\-*/%=&|<>!?]+", token):
            color = palette["punct"]
        draw.text((pos, y), token, font=font, fill=color)
        pos += text_width(token)
        idx = end
    if idx < len(line):
        rest = line[idx:]
        draw.text((pos, y), rest, font=font, fill=palette["default"])

x = card_x0 + inner
y = card_y0 + inner + header_h
for line, is_code in line_items:
    if is_code:
        render_code_line(x, y, line)
    else:
        draw.text((x, y), line, font=font, fill=fg)
    y += line_height + line_gap

img.save(out_path, format="PNG", optimize=True)
`;

function buildMagickArgs(cfg, textPath, renderedPath, withFont) {
  const args = [
    "-background",
    cfg.background,
    "-fill",
    cfg.foreground,
  ];

  if (withFont && cfg.fontFamily.trim()) {
    args.push("-font", cfg.fontFamily.trim());
  }

  args.push(
    "-pointsize",
    String(cfg.pointSize),
    "-interline-spacing",
    String(cfg.lineSpacing),
    "-size",
    `${cfg.width}x`,
    `caption:@${textPath}`,
    "-bordercolor",
    cfg.borderColor,
    "-border",
    String(cfg.borderPx),
    renderedPath,
  );
  return args;
}

function renderCardWithMagick(cfg, textPath, renderedPath) {
  const attempts = [];
  if (cfg.fontFamily.trim()) {
    attempts.push(buildMagickArgs(cfg, textPath, renderedPath, true));
  }
  attempts.push(buildMagickArgs(cfg, textPath, renderedPath, false));

  let lastError = null;
  for (const args of attempts) {
    try {
      runOrThrow("magick", args);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("render failed");
}

function renderCardWithSwift(cfg, textPath, renderedPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gyazo-note-swift-"));
  const swiftPath = path.join(tmpDir, "render.swift");
  fs.writeFileSync(swiftPath, `${SWIFT_RENDER_SCRIPT}\n`, "utf8");
  try {
    runOrThrow(cfg.swiftCmd, [
      swiftPath,
      textPath,
      renderedPath,
      String(cfg.width),
      String(cfg.pointSize),
      String(cfg.lineSpacing),
      cfg.background,
      cfg.foreground,
      cfg.borderColor,
      cfg.surfaceColor,
      String(cfg.borderPx),
      String(cfg.scale),
      String(cfg.radius),
      cfg.fontFamily.trim(),
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function renderCardWithPython(cfg, textPath, renderedPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gyazo-note-python-"));
  const pyPath = path.join(tmpDir, "render.py");
  fs.writeFileSync(pyPath, `${PYTHON_RENDER_SCRIPT}\n`, "utf8");
  try {
    runOrThrow(cfg.pythonCmd, [
      pyPath,
      textPath,
      renderedPath,
      String(cfg.width),
      String(cfg.pointSize),
      String(cfg.lineSpacing),
      cfg.background,
      cfg.foreground,
      cfg.borderColor,
      cfg.surfaceColor,
      String(cfg.borderPx),
      String(cfg.scale),
      String(cfg.radius),
      cfg.fontFamily.trim(),
      cfg.windowDots ? "true" : "false",
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function renderCard(cfg, textPath, renderedPath) {
  const mode = cfg.renderEngine.trim().toLowerCase();
  if (mode === "python") {
    renderCardWithPython(cfg, textPath, renderedPath);
    return;
  }
  if (mode === "swift") {
    renderCardWithSwift(cfg, textPath, renderedPath);
    return;
  }
  if (mode === "magick") {
    renderCardWithMagick(cfg, textPath, renderedPath);
    return;
  }

  try {
    renderCardWithPython(cfg, textPath, renderedPath);
    return;
  } catch (pythonErr) {
    try {
      renderCardWithSwift(cfg, textPath, renderedPath);
      return;
    } catch (swiftErr) {
      try {
        renderCardWithMagick(cfg, textPath, renderedPath);
        return;
      } catch (magickErr) {
        throw new Error(
          `python render failed: ${pythonErr.message}\nswift render failed: ${swiftErr.message}\nmagick render failed: ${magickErr.message}`
        );
      }
    }
  }
}

function uniquePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return targetPath;
  }
  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const base = path.basename(targetPath, ext);
  let i = 1;
  while (true) {
    const candidate = path.join(dir, `${base}-${i}${ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    i += 1;
  }
}

function listInboxFiles(inboxDir) {
  if (!fs.existsSync(inboxDir)) {
    return [];
  }
  const allowed = new Set([".md", ".txt"]);
  const entries = fs
    .readdirSync(inboxDir)
    .filter((name) => allowed.has(path.extname(name).toLowerCase()))
    .map((name) => {
      const full = path.join(inboxDir, name);
      return { full, stat: fs.statSync(full) };
    })
    .sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);
  return entries.map((item) => item.full);
}

function parseJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function readPngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) {
    throw new Error(`invalid png (too small): ${filePath}`);
  }
  if (buf.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`invalid png signature: ${filePath}`);
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function padPngToSizeWithPython(cfg, filePath, targetWidth, targetHeight) {
  const py = String.raw`
import sys
from PIL import Image

path = sys.argv[1]
tw = int(sys.argv[2])
th = int(sys.argv[3])

img = Image.open(path).convert("RGBA")
w, h = img.size
if w == tw and h == th:
    sys.exit(0)

sample_x = min(max(w // 2, 0), w - 1)
sample_y = max(h - 1, 0)
bg = img.getpixel((sample_x, sample_y))

canvas = Image.new("RGBA", (tw, th), bg)
canvas.paste(img, (0, 0))
canvas.save(path, format="PNG", optimize=True)
`;
  runOrThrow(cfg.pythonCmd, ["-c", py, filePath, String(targetWidth), String(targetHeight)]);
}

function normalizeRenderedPagesSize(cfg, renderedPages) {
  if (!cfg.uniformPageSize || renderedPages.length < 2) {
    return;
  }

  let sized = [];
  try {
    sized = renderedPages.map((page) => ({
      ...page,
      ...readPngSize(page.renderedPath),
    }));
  } catch {
    return;
  }
  const targetWidth = Math.max(...sized.map((p) => p.width));
  const targetHeight = Math.max(...sized.map((p) => p.height));

  for (const page of sized) {
    if (page.width === targetWidth && page.height === targetHeight) {
      continue;
    }
    try {
      padPngToSizeWithPython(cfg, page.renderedPath, targetWidth, targetHeight);
    } catch {
      return;
    }
  }
}

const STICKY_THEMES = [
  {
    name: "mist-blue",
    background: "#A0ADBC",
    foreground: "#2C2F38",
    borderColor: "#E7E7EC",
    surfaceColor: "#F6F7FA",
  },
  {
    name: "warm-cream",
    background: "#B9B08E",
    foreground: "#3B372C",
    borderColor: "#E8DEC4",
    surfaceColor: "#FBF6E8",
  },
  {
    name: "soft-mint",
    background: "#9FB9AF",
    foreground: "#2F3E36",
    borderColor: "#D9EADF",
    surfaceColor: "#EEF7F2",
  },
  {
    name: "dusty-peach",
    background: "#C5AAA4",
    foreground: "#41312E",
    borderColor: "#EFDCD5",
    surfaceColor: "#FBF2EF",
  },
];

function chooseNoteTheme(cfg) {
  const mode = (cfg.colorMode || "random_sticky").trim().toLowerCase();
  if (mode !== "random_sticky") {
    return {
      name: "fixed",
      background: cfg.background,
      foreground: cfg.foreground,
      borderColor: cfg.borderColor,
      surfaceColor: cfg.surfaceColor,
    };
  }

  let prevIndex = -1;
  try {
    prevIndex = Number.parseInt(fs.readFileSync(cfg.themeStateFile, "utf8").trim(), 10);
  } catch {
    prevIndex = -1;
  }

  const indices = STICKY_THEMES.map((_, i) => i);
  const candidates = indices.filter((i) => i !== prevIndex);
  const pool = candidates.length > 0 ? candidates : indices;
  const chosenIndex = pool[Math.floor(Math.random() * pool.length)];
  const chosen = STICKY_THEMES[chosenIndex];

  try {
    ensureDir(path.dirname(cfg.themeStateFile));
    fs.writeFileSync(cfg.themeStateFile, `${chosenIndex}\n`, "utf8");
  } catch {
    // non-fatal
  }

  return chosen;
}

function splitCardTextPages(cardText, maxChars) {
  const text = cardText.trim();
  if (!text) {
    return [];
  }
  if (maxChars <= 0 || text.length <= maxChars) {
    return [text];
  }

  const pages = [];
  let rest = text;
  const minCut = Math.floor(maxChars * 0.45);

  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf("\n\n", maxChars);
    if (cut < minCut) {
      cut = rest.lastIndexOf("\n", maxChars);
    }
    if (cut < minCut) {
      cut = rest.lastIndexOf(" ", maxChars);
    }
    if (cut < 1) {
      cut = maxChars;
    }

    const page = rest.slice(0, cut).trim();
    if (page) {
      pages.push(page);
    }
    rest = rest.slice(cut).trimStart();
  }

  if (rest.trim()) {
    pages.push(rest.trim());
  }

  return pages.length > 0 ? pages : [text];
}

function addPageLabel(text, pageNo, totalPages, enabled) {
  if (!enabled || totalPages <= 1) {
    return text;
  }
  return `${text}\n\n${pageNo}/${totalPages}`;
}

function processOne(notePath, cfg) {
  const baseName = path.basename(notePath);
  const ext = path.extname(baseName);
  const stem = baseName.slice(0, -ext.length);
  const metaPath = path.join(path.dirname(notePath), `${stem}.meta.json`);
  const textRaw = fs.readFileSync(notePath, "utf8");
  const front = parseFrontMatter(textRaw);
  const noteBody = front.body.trimEnd();
  if (!noteBody.trim()) {
    throw new Error(`note is empty: ${notePath}`);
  }

  const stat = fs.statSync(notePath);
  const nowIso = new Date().toISOString();
  const defaults = {
    id: stem,
    captured_at: new Date(stat.mtimeMs).toISOString(),
    source_app: "manual",
    source_window: "",
    source_url: "",
    source_title: "",
    context_note: "",
  };

  const mergedMeta = sanitizeMeta({
    ...defaults,
    ...(fs.existsSync(metaPath) ? parseJsonSafe(metaPath) : {}),
    ...front.meta,
  });
  if (!mergedMeta.captured_at) {
    mergedMeta.captured_at = nowIso;
  }

  const cardText = buildCardText(noteBody);
  const pages = splitCardTextPages(cardText, cfg.pageMaxChars);
  const pageCount = pages.length;
  const noteTheme = chooseNoteTheme(cfg);
  const renderCfg = {
    ...cfg,
    background: noteTheme.background,
    foreground: noteTheme.foreground,
    borderColor: noteTheme.borderColor,
    surfaceColor: noteTheme.surfaceColor,
  };

  ensureDir(cfg.renderedDir);
  const renderedPages = [];
  for (let i = 0; i < pageCount; i += 1) {
    const pageNo = i + 1;
    const renderedPath =
      pageCount > 1
        ? path.join(cfg.renderedDir, `${stem}-p${String(pageNo).padStart(2, "0")}.png`)
        : path.join(cfg.renderedDir, `${stem}.png`);
    const textForPage = addPageLabel(pages[i], pageNo, pageCount, cfg.pageLabelEnabled);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gyazo-note-"));
    const textPath = path.join(tmpDir, `note-p${pageNo}.txt`);
    fs.writeFileSync(textPath, `${textForPage}\n`, "utf8");
    try {
      renderCard(renderCfg, textPath, renderedPath);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    renderedPages.push({ pageNo, renderedPath });
  }
  normalizeRenderedPagesSize(cfg, renderedPages);

  const sourceApp = mergedMeta.source_app || "manual";
  const includeAppInDesc = sourceApp.toLowerCase() !== "manual";
  const includeAppMetadata = sourceApp.toLowerCase() !== "manual";
  const sourceAppTag = includeAppInDesc && cfg.descTagApp ? toHashtag(sourceApp) : "";
  const notesDescTagLine = mergeTagsLine(cfg.gyazoDescTag, sourceAppTag);
  const uploadOrder = cfg.uploadLastPageFirst ? [...renderedPages].reverse() : [...renderedPages];
  const uploadRowsByPage = new Map();
  for (const page of uploadOrder) {
    const pageNote =
      cfg.includePageInDesc && pageCount > 1 ? `Page ${page.pageNo}/${pageCount}` : "";
    const contextLines = [];
    const contextBase = mergedMeta.context_note || cfg.gyazoContextNote || "";
    if (contextBase) {
      contextLines.push(contextBase);
    }
    if (pageNote) {
      contextLines.push(pageNote);
    }
    const contextNote = contextLines.join("\n");

    const uploadEnv = {
      ...process.env,
      CONFIG_FILE: cfg.configFile,
      FRONTMOST_APP_OVERRIDE: sourceApp,
      FRONT_WINDOW_TITLE_OVERRIDE: mergedMeta.source_window || "",
      BROWSER_URL_OVERRIDE: mergedMeta.source_url || "",
      BROWSER_TAB_TITLE_OVERRIDE: mergedMeta.source_title || "",
      UPLOAD_GYAZO_ACCESS_POLICY: cfg.gyazoAccessPolicy,
      UPLOAD_GYAZO_DESC_TAG: notesDescTagLine,
      UPLOAD_GYAZO_CONTEXT_NOTE: contextNote,
      UPLOAD_GYAZO_DESC_TAG_APP: "false",
      UPLOAD_GYAZO_DESC_TAG_WINDOW: cfg.descTagWindow ? "true" : "false",
      UPLOAD_GYAZO_DESC_TAG_URL: cfg.descTagUrl ? "true" : "false",
      UPLOAD_INCLUDE_APP_IN_DESC: "false",
      UPLOAD_GYAZO_SEND_APP_METADATA: includeAppMetadata ? "true" : "false",
      UPLOAD_GYAZO_SEND_CREATED_AT: cfg.sendCreatedAt ? "true" : "false",
      UPLOAD_GYAZO_DESC_STYLE: cfg.descStyle,
      UPLOAD_COPY_TO_CLIPBOARD: cfg.copyUrlToClipboard ? "true" : "false",
      UPLOAD_OPEN_IN_BROWSER: "false",
      UPLOAD_DELETE_AFTER_UPLOAD: "false",
    };

    const uploadResult = runOrThrow(cfg.uploadScript, [page.renderedPath], { env: uploadEnv });
    const lines = (uploadResult.stdout || "").split(/\r?\n/).map((line) => line.trim());
    const gyazoUrl = lines.reverse().find((line) => line.startsWith("http"));
    if (!gyazoUrl) {
      throw new Error(`upload did not return URL for ${notePath} page ${page.pageNo}/${pageCount}`);
    }
    const gyazoIdMatch = gyazoUrl.match(/\/([a-f0-9]{32})(?:$|[/?#])/i);
    const gyazoId = gyazoIdMatch ? gyazoIdMatch[1] : "";
    uploadRowsByPage.set(page.pageNo, {
      page_no: page.pageNo,
      pages_total: pageCount,
      rendered_file: page.renderedPath,
      gyazo_url: gyazoUrl,
      gyazo_id: gyazoId,
    });
  }

  const uploadedPages = renderedPages.map((page) => uploadRowsByPage.get(page.pageNo)).filter(Boolean);
  const firstPageRow = uploadedPages[0];
  if (!firstPageRow || !firstPageRow.gyazo_url) {
    throw new Error(`upload did not produce page 1 URL for ${notePath}`);
  }

  ensureDir(cfg.archiveDir);
  const archivedNotePath = uniquePath(path.join(cfg.archiveDir, baseName));
  fs.renameSync(notePath, archivedNotePath);
  if (fs.existsSync(metaPath)) {
    fs.rmSync(metaPath, { force: true });
  }

  const archivedStem = path.basename(archivedNotePath, ext);
  const archivedMetaPath = path.join(cfg.archiveDir, `${archivedStem}.meta.json`);
  const finalMeta = {
    ...mergedMeta,
    id: archivedStem,
    source_file: archivedNotePath,
    rendered_file: firstPageRow.rendered_file,
    gyazo_url: firstPageRow.gyazo_url,
    gyazo_id: firstPageRow.gyazo_id,
    page_count: pageCount,
    pages: uploadedPages,
    theme_name: noteTheme.name,
    uploaded_at: nowIso,
  };
  fs.writeFileSync(archivedMetaPath, `${JSON.stringify(finalMeta, null, 2)}\n`, "utf8");

  ensureDir(path.dirname(cfg.indexFile));
  const indexRow = {
    id: archivedStem,
    captured_at: finalMeta.captured_at,
    uploaded_at: finalMeta.uploaded_at,
    source_app: finalMeta.source_app,
    source_window: finalMeta.source_window,
    source_url: finalMeta.source_url,
    gyazo_url: finalMeta.gyazo_url,
    gyazo_id: finalMeta.gyazo_id,
    page_count: finalMeta.page_count,
    pages: finalMeta.pages,
    note_file: archivedNotePath,
    meta_file: archivedMetaPath,
    rendered_file: firstPageRow.rendered_file,
  };
  fs.appendFileSync(cfg.indexFile, `${JSON.stringify(indexRow)}\n`, "utf8");

  return { notePath, gyazoUrl: firstPageRow.gyazo_url, archivedNotePath };
}

function main() {
  const scriptDir = __dirname;
  let cfg = {
    configFile: env("CONFIG_FILE", path.join(scriptDir, "config.env")),
    uploadScript: env("NOTES_UPLOAD_SCRIPT", path.join(scriptDir, "upload_gyazo.sh")),
    inboxDir: env("NOTES_INBOX_DIR", path.join(scriptDir, "notes-data", "inbox")),
    archiveDir: env("NOTES_ARCHIVE_DIR", path.join(scriptDir, "notes-data", "archive")),
    renderedDir: env("NOTES_RENDERED_DIR", path.join(scriptDir, "notes-data", "rendered")),
    indexFile: env("NOTES_INDEX_FILE", path.join(scriptDir, "notes-data", "index.jsonl")),
    width: envInt("NOTES_RENDER_WIDTH", 1440),
    background: env("NOTES_RENDER_BACKGROUND", "#F6F2E9"),
    foreground: env("NOTES_RENDER_FOREGROUND", "#1A1A1A"),
    borderColor: env("NOTES_RENDER_BORDER_COLOR", "#DDD2BF"),
    surfaceColor: env("NOTES_RENDER_SURFACE_COLOR", "#FFFDF8"),
    borderPx: envInt("NOTES_RENDER_BORDER_PX", 36),
    pointSize: envInt("NOTES_RENDER_POINT_SIZE", 32),
    lineSpacing: envInt("NOTES_RENDER_LINE_SPACING", 10),
    radius: envInt("NOTES_RENDER_RADIUS", 20),
    scale: envInt("NOTES_RENDER_SCALE", 2),
    sizePreset: env("NOTES_SIZE_PRESET", "mobile"),
    renderEngine: env("NOTES_RENDER_ENGINE", "auto"),
    swiftCmd: env("NOTES_SWIFT_CMD", "swift"),
    pythonCmd: env("NOTES_PYTHON_CMD", "python3"),
    fontFamily: env("NOTES_FONT_FAMILY", "SF Pro Text"),
    windowDots: envBool("NOTES_RENDER_WINDOW_DOTS", true),
    colorMode: env("NOTES_COLOR_MODE", "random_sticky"),
    themeStateFile: env(
      "NOTES_THEME_STATE_FILE",
      path.join(os.homedir(), "Library", "Application Support", "gyazo-capture-bridge", "notes-theme.state")
    ),
    pageMaxChars: envInt("NOTES_PAGE_MAX_CHARS", 900),
    pageLabelEnabled: envBool("NOTES_PAGE_LABEL", true),
    uniformPageSize: envBool("NOTES_PAGE_UNIFORM_SIZE", true),
    uploadLastPageFirst: envBool("NOTES_UPLOAD_LAST_PAGE_FIRST", true),
    includePageInDesc: envBool("NOTES_INCLUDE_PAGE_IN_DESC", true),
    sendCreatedAt: envBool("NOTES_GYAZO_SEND_CREATED_AT", false),
    gyazoAccessPolicy: env("NOTES_GYAZO_ACCESS_POLICY", "only_me"),
    gyazoDescTag: env("NOTES_GYAZO_DESC_TAG", "#notes"),
    gyazoContextNote: env("NOTES_GYAZO_CONTEXT_NOTE", ""),
    descTagApp: envBool("NOTES_DESC_TAG_APP", true),
    descTagWindow: envBool("NOTES_DESC_TAG_WINDOW", false),
    descTagUrl: envBool("NOTES_DESC_TAG_URL", false),
    descStyle: env("NOTES_DESC_STYLE", "compact"),
    copyUrlToClipboard: envBool("NOTES_COPY_URL_TO_CLIPBOARD", true),
  };
  cfg = applySizePreset(cfg);

  ensureDir(cfg.inboxDir);
  ensureDir(cfg.archiveDir);
  ensureDir(cfg.renderedDir);
  ensureDir(path.dirname(cfg.indexFile));

  const notes = listInboxFiles(cfg.inboxDir);
  if (notes.length === 0) {
    console.log("No notes in inbox.");
    return;
  }

  let failed = 0;
  for (const notePath of notes) {
    try {
      const result = processOne(notePath, cfg);
      console.log(`OK\t${result.archivedNotePath}\t${result.gyazoUrl}`);
    } catch (error) {
      failed += 1;
      console.error(`ERROR\t${notePath}\t${error.message}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main();
