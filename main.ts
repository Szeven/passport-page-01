// The Passport Page of Valdoria — an open passport spread for a country
// that does not exist. Draws /output/entry.png (1024x1024) in pure Node 22,
// zero dependencies: a hand-rolled RGBA canvas, a 5x7 bitmap font, an ICAO
// MRZ with check digits computed in code, and a minimal PNG encoder.
// Deterministic: no clock, no randomness — two runs are byte-identical.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const INK = [28, 43, 58, 255]; // dark blue-grey ink
const INK_SOFT = [74, 92, 110, 255];
const TEAL = [14, 90, 90, 255];
const TEAL_DK = [9, 58, 58, 255];
const GOLD = [176, 141, 62, 255];
const CREAM = [246, 241, 227, 255];
const CREAM_DK = [232, 224, 203, 255];
const PAGE_EDGE = [214, 203, 178, 255];
const DESK = [35, 42, 49, 255];
const DESK_LT = [48, 57, 66, 255];
const SKIN = [224, 184, 150, 255];
const SKIN_DK = [198, 152, 118, 255];
const HAIR = [58, 38, 26, 255];
const STAMP_BLUE = [36, 69, 126, 215];
const STAMP_RED = [163, 51, 39, 210];
const STAMP_GREEN = [32, 96, 74, 205];
const GUILLOCHE = [120, 160, 158, 60];

// ------------------------------------------------------------ 5x7 font
// Each glyph: 7 rows, each a 5-bit mask (bit 4 = leftmost pixel).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "*": [0, 0x15, 0x0e, 0x15, 0, 0, 0],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
};

// ------------------------------------------------------------------ canvas
class Canvas {
  w: number;
  h: number;
  px: Uint8Array; // RGBA
  constructor(w: number, h: number, bg: number[]) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 4] = bg[0];
      this.px[i * 4 + 1] = bg[1];
      this.px[i * 4 + 2] = bg[2];
      this.px[i * 4 + 3] = bg[3];
    }
  }
  set(x: number, y: number, c: number[]) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const sa = c[3] / 255;
    const da = this.px[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) {
      this.px[i + k] = Math.round((c[k] * sa + this.px[i + k] * da * (1 - sa)) / oa);
    }
    this.px[i + 3] = Math.round(oa * 255);
  }
  rect(x: number, y: number, w: number, h: number, c: number[]) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  hline(x0: number, x1: number, y: number, c: number[], th = 1) {
    for (let t = 0; t < th; t++) for (let x = x0; x <= x1; x++) this.set(x, y + t, c);
  }
  vline(x: number, y0: number, y1: number, c: number[], th = 1) {
    for (let t = 0; t < th; t++) for (let y = y0; y <= y1; y++) this.set(x + t, y, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number[], th = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let s = 0; s <= n; s++) {
      const x = Math.round(x0 + (dx * s) / n);
      const y = Math.round(y0 + (dy * s) / n);
      for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) this.set(x + a, y + b, c);
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number[]) {
    for (let y = -ry; y <= ry; y++) {
      const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      for (let x = -span; x <= span; x++) this.set(cx + x, cy + y, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: number[]) {
    this.ellipse(cx, cy, r, r, c);
  }
  ring(cx: number, cy: number, r: number, c: number[], th = 2) {
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      for (let t = 0; t < th; t++) {
        this.set(Math.round(cx + (r + t) * Math.cos(rad)), Math.round(cy + (r + t) * Math.sin(rad)), c);
      }
    }
  }
  text(str: string, x: number, y: number, scale: number, c: number[], align: "l" | "c" | "r" = "l") {
    const w = this.textWidth(str, scale);
    let cx = x;
    if (align === "c") cx = x - Math.floor(w / 2);
    if (align === "r") cx = x - w;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row] & (1 << (4 - col))) {
            this.rect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }
  textWidth(str: string, scale: number): number {
    return str.length === 0 ? 0 : str.length * 6 * scale - scale;
  }
  // MRZ strip: 44 chars across the data page. Glyphs are 5x2 px blocks on a
  // 10.4 px advance, so the full line fits the page width.
  textMRZ(str: string, x: number, y: number, c: number[]) {
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]] ?? FONT["?"];
      const bx = Math.round(x + i * 10.4);
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row] & (1 << (4 - col))) this.rect(bx + col * 2, y + row * 2, 2, 2, c);
        }
      }
    }
  }
  // Blit another canvas rotated by `deg` degrees around its centre onto (cx, cy).
  blitRotated(src: Canvas, cx: number, cy: number, deg: number) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const scx = src.w / 2;
    const scy = src.h / 2;
    const diag = Math.ceil(Math.sqrt(src.w * src.w + src.h * src.h));
    for (let y = -diag / 2; y < diag / 2; y++) {
      for (let x = -diag / 2; x < diag / 2; x++) {
        const sx = Math.round(x * cos + y * sin + scx);
        const sy = Math.round(-x * sin + y * cos + scy);
        if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
        const si = (sy * src.w + sx) * 4;
        if (src.px[si + 3] === 0) continue;
        this.set(Math.round(cx + x), Math.round(cy + y), [
          src.px[si],
          src.px[si + 1],
          src.px[si + 2],
          src.px[si + 3],
        ]);
      }
    }
  }
}

// ------------------------------------------------------------- ICAO MRZ
function mrzVal(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return 0; // '<' and anything else
}
function mrzCheck(s: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += mrzVal(s[i]) * w[i % 3];
  return sum % 10;
}
function padRight(s: string, n: number): string {
  return (s + "<".repeat(n)).slice(0, n);
}

const DOC_NO = "VD4839201";
const NATIONALITY = "VAL";
const DOB = "910314"; // 14 MAR 1991
const SEX = "F";
const EXPIRY = "340611"; // 11 JUN 2034
const PERSONAL = padRight("1403914827", 14);
const CD_DOC = String(mrzCheck(DOC_NO));
const CD_DOB = String(mrzCheck(DOB));
const CD_EXP = String(mrzCheck(EXPIRY));
const CD_PER = String(mrzCheck(PERSONAL));
const CD_COMP = String(
  mrzCheck(DOC_NO + CD_DOC + NATIONALITY + DOB + CD_DOB + SEX + EXPIRY + CD_EXP + PERSONAL + CD_PER),
);
const MRZ1 = "P<" + NATIONALITY + padRight("SORIN<<ELENA", 39);
const MRZ2 =
  DOC_NO + CD_DOC + NATIONALITY + DOB + CD_DOB + SEX + EXPIRY + CD_EXP + PERSONAL + CD_PER + CD_COMP;
// Sanity: both lines must be exactly 44 characters.
if (MRZ1.length !== 44 || MRZ2.length !== 44) throw new Error("MRZ length wrong");

// ------------------------------------------------------------ PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(cv.h * (1 + cv.w * 4));
  for (let y = 0; y < cv.h; y++) {
    raw[y * (1 + cv.w * 4)] = 0;
    Buffer.from(cv.px.buffer, y * cv.w * 4, cv.w * 4).copy(raw, y * (1 + cv.w * 4) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- guilloche
function guilloche(cv: Canvas, x0: number, y0: number, x1: number, y1: number, c: number[]) {
  for (let x = x0; x < x1; x += 2) {
    const y = y0 + Math.round(6 * Math.sin((x - x0) / 26) + 3 * Math.sin((x - x0) / 9));
    if (y >= y0 && y <= y1) cv.set(x, y, c);
    const y2 = y1 - Math.round(6 * Math.sin((x - x0) / 22) + 3 * Math.cos((x - x0) / 11));
    if (y2 >= y0 && y2 <= y1) cv.set(x, y2, c);
  }
}

// -------------------------------------------------------------- portrait
function drawPortrait(cv: Canvas, x: number, y: number, w: number, h: number) {
  // Photo background: pale northern sky bands.
  for (let j = 0; j < h; j++) {
    const t = j / h;
    const r = Math.round(178 + 30 * t);
    const g = Math.round(196 + 22 * t);
    const b = Math.round(198 + 8 * t);
    cv.rect(x, y + j, w, 1, [r, g, b, 255]);
  }
  // Shoulders / jacket in Valdorian teal, kept inside the photo frame.
  cv.rect(x + w / 2 - 70, y + h - 44, 140, 44, TEAL);
  cv.ellipse(x + w / 2, y + h - 44, 70, 26, TEAL);
  // Shirt V + collar.
  cv.line(x + w / 2 - 12, y + h - 34, x + w / 2, y + h - 12, CREAM, 3);
  cv.line(x + w / 2 + 12, y + h - 34, x + w / 2, y + h - 12, CREAM, 3);
  // Neck.
  cv.rect(x + w / 2 - 11, y + 96, 22, 26, SKIN_DK);
  cv.rect(x + w / 2 - 11, y + 96, 22, 18, SKIN);
  // Head.
  cv.ellipse(x + w / 2, y + 66, 33, 41, SKIN);
  // Hair: dark cap with side strands framing the face.
  cv.ellipse(x + w / 2, y + 34, 35, 26, HAIR);
  cv.ellipse(x + w / 2 - 30, y + 62, 9, 30, HAIR);
  cv.ellipse(x + w / 2 + 30, y + 62, 9, 30, HAIR);
  cv.ellipse(x + w / 2, y + 30, 33, 14, HAIR);
  // Brows, eyes, nose, mouth.
  cv.line(x + w / 2 - 22, y + 58, x + w / 2 - 8, y + 56, HAIR, 2);
  cv.line(x + w / 2 + 8, y + 56, x + w / 2 + 22, y + 58, HAIR, 2);
  cv.ellipse(x + w / 2 - 15, y + 64, 4, 3, INK);
  cv.ellipse(x + w / 2 + 15, y + 64, 4, 3, INK);
  cv.line(x + w / 2, y + 66, x + w / 2 - 2, y + 80, SKIN_DK, 2);
  cv.line(x + w / 2 - 7, y + 88, x + w / 2 + 7, y + 88, [150, 90, 80, 255], 2);
  // Frame.
  cv.rect(x, y, w, 3, INK);
  cv.rect(x, y + h - 3, w, 3, INK);
  cv.rect(x, y, 3, h, INK);
  cv.rect(x + w - 3, y, 3, h, INK);
}

// ----------------------------------------------------------- coat of arms
function drawArms(cv: Canvas, cx: number, cy: number, r: number) {
  cv.ring(cx, cy, r, GOLD, 3);
  cv.ring(cx, cy, r - 5, TEAL, 1);
  // Mountain.
  cv.line(cx - r + 9, cy + r - 12, cx, cy - r + 12, TEAL, 3);
  cv.line(cx, cy - r + 12, cx + r - 9, cy + r - 12, TEAL, 3);
  // Star above the peak.
  cv.circle(cx, cy - r + 4, 3, GOLD);
  // Three sea waves.
  for (let k = 0; k < 3; k++) {
    const wy = cy + r - 20 + k * 5;
    for (let x = cx - r + 12; x < cx + r - 11; x++) {
      const yy = wy + Math.round(2 * Math.sin((x - cx) / 7));
      cv.set(x, yy, TEAL);
    }
  }
}

// ----------------------------------------------------------------- stamps
function makeStamp(w: number, h: number, lines: { t: string; s: number }[], c: number[], border = 3): Canvas {
  const cv = new Canvas(w, h, [0, 0, 0, 0]);
  cv.rect(0, 0, w, border, c);
  cv.rect(0, h - border, w, border, c);
  cv.rect(0, 0, border, h, c);
  cv.rect(w - border, 0, border, h, c);
  const total = lines.reduce((a, ln) => a + 7 * ln.s + 5, -5);
  let y = Math.floor((h - total) / 2);
  for (const ln of lines) {
    cv.text(ln.t, w / 2, y, ln.s, c, "c");
    y += 7 * ln.s + 5;
  }
  return cv;
}

// ------------------------------------------------------------------ pages
function drawDataPage(cv: Canvas, x0: number, y0: number, x1: number, y1: number) {
  cv.rect(x0, y0, x1 - x0, y1 - y0, CREAM);
  cv.rect(x0, y0, x1 - x0, y1 - y0, PAGE_EDGE); // thin edge tint via overlay lines below
  cv.rect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, CREAM);
  guilloche(cv, x0 + 14, y0 + 118, x1 - 14, y0 + 138, GUILLOCHE);
  guilloche(cv, x0 + 14, y1 - 150, x1 - 14, y1 - 132, GUILLOCHE);

  // Header: arms + country name.
  drawArms(cv, x0 + 44, y0 + 52, 30);
  cv.text("REPUBLIC OF VALDORIA", x0 + 88, y0 + 30, 3, TEAL_DK);
  cv.text("REPUBLIKA VALDORIJA", x0 + 88, y0 + 56, 2, INK_SOFT);
  cv.text("PASSPORT  .  PASEPORT", x0 + 88, y0 + 76, 2, INK_SOFT);
  cv.hline(x0 + 14, x1 - 14, y0 + 104, TEAL, 2);
  cv.hline(x0 + 14, x1 - 14, y0 + 108, GOLD, 1);

  // Portrait, left.
  const px = x0 + 22;
  const py = y0 + 150;
  drawPortrait(cv, px, py, 150, 188);

  // Fields, right of portrait.
  const fx = px + 168;
  const field = (labelVal: string, labelEn: string, value: string, y: number, vs = 3) => {
    cv.text(labelVal + " / " + labelEn, fx, y, 1, INK_SOFT);
    cv.text(value, fx, y + 12, vs, INK);
  };
  // Two-column top row: TYPE | CODE.
  cv.text("VRSTA / TYPE", fx, y0 + 150, 1, INK_SOFT);
  cv.text("P", fx, y0 + 162, 3, INK);
  cv.text("DRZAVA / CODE", fx + 90, y0 + 150, 1, INK_SOFT);
  cv.text("VAL", fx + 90, y0 + 162, 3, INK);
  // Passport number, full width of the column.
  cv.text("ST. POTNICE / PASSPORT NO.", fx, y0 + 196, 1, INK_SOFT);
  cv.text(DOC_NO, fx, y0 + 208, 3, INK);

  field("PREZIME", "SURNAME", "SORIN", y0 + 252);
  field("IME", "GIVEN NAMES", "ELENA", y0 + 296);
  field("DRZAVLJANSTVO", "NATIONALITY", "VALDORIAN", y0 + 340);
  field("RODJENJE", "DATE OF BIRTH", "14 MAR 1991", y0 + 384);
  field("MJESTO RODJENJA", "PLACE OF BIRTH", "TARNOVIA, VALDORIA", y0 + 428, 2);

  // Bottom section, full width: issue / expiry, personal data, authority,
  // property note, UV note, and the holder's signature.
  const bx = x0 + 22;
  // Row A: issue (left) | expiry (right).
  cv.text("IZDAVANJE / DATE OF ISSUE", bx, y0 + 470, 1, INK_SOFT);
  cv.text("12 JUN 2024", bx, y0 + 482, 3, INK);
  cv.text("VRIJEDI DO / DATE OF EXPIRY", bx + 232, y0 + 470, 1, INK_SOFT);
  cv.text("11 JUN 2034", bx + 232, y0 + 482, 3, INK);
  // Row B: personal no. | eyes | sex | height.
  cv.text("OSOBNI BROJ / PERSONAL NO.", bx, y0 + 514, 1, INK_SOFT);
  cv.text("1403914827", bx, y0 + 526, 3, INK);
  cv.text("OCI / EYES", bx + 232, y0 + 514, 1, INK_SOFT);
  cv.text("GREEN", bx + 232, y0 + 526, 2, INK);
  cv.text("SEX", bx + 340, y0 + 514, 1, INK_SOFT);
  cv.text("F", bx + 340, y0 + 526, 3, INK);
  cv.text("HEIGHT", bx + 387, y0 + 514, 1, INK_SOFT);
  cv.text("168 CM", bx + 387, y0 + 526, 2, INK);
  // Row C: issuing authority, one line.
  cv.text("TIJELO / AUTHORITY", bx, y0 + 560, 1, INK_SOFT);
  cv.text("MINISTRY OF THE INTERIOR - TARNOVIA", bx, y0 + 572, 2, INK);
  // Row D: property note.
  cv.text("NAPOMENA / NOTE", bx, y0 + 606, 1, INK_SOFT);
  cv.text("THIS PASSPORT REMAINS THE PROPERTY OF", bx, y0 + 618, 2, INK);
  cv.text("THE REPUBLIC OF VALDORIA.", bx, y0 + 634, 2, INK);
  // Row E: UV security note.
  cv.text("UV 365 NM: AURORA GUILLOCHE OVER", bx, y0 + 664, 2, TEAL);
  cv.text("THE DATA PAGE.", bx, y0 + 680, 2, TEAL);
  // Holder's signature: a hand-drawn squiggle above a rule.
  cv.text("POTPIS / SIGNATURE OF HOLDER", bx, y0 + 712, 1, INK_SOFT);
  cv.line(bx + 8, y0 + 748, bx + 60, y0 + 726, INK, 2);
  cv.line(bx + 60, y0 + 726, bx + 110, y0 + 750, INK, 2);
  cv.line(bx + 110, y0 + 750, bx + 150, y0 + 730, INK, 2);
  cv.line(bx + 150, y0 + 730, bx + 210, y0 + 748, INK, 2);
  cv.hline(bx, bx + 220, y0 + 756, INK_SOFT, 1);

  // MRZ.
  const mz = y1 - 92;
  cv.hline(x0 + 14, x1 - 14, mz - 10, INK_SOFT, 1);
  cv.textMRZ(MRZ1, x0 + 10, mz + 2, INK);
  cv.textMRZ(MRZ2, x0 + 10, mz + 40, INK);
}

function drawVisaPage(cv: Canvas, x0: number, y0: number, x1: number, y1: number) {
  cv.rect(x0, y0, x1 - x0, y1 - y0, CREAM);
  cv.rect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, CREAM);
  guilloche(cv, x0 + 14, y0 + 96, x1 - 14, y0 + 114, GUILLOCHE);
  cv.text("VIZE / VISAS", x0 + 22, y0 + 28, 3, TEAL_DK);
  cv.text("STRANICA 12 / PAGE 12", x0 + 22, y0 + 54, 2, INK_SOFT);
  cv.hline(x0 + 14, x1 - 14, y0 + 84, TEAL, 2);
  cv.hline(x0 + 14, x1 - 14, y0 + 88, GOLD, 1);

  // Stamp 1: Ostmark entry, blue, tilted -7 deg.
  const s1 = makeStamp(330, 120, [
    { t: "REPUBLIC OF OSTMARK", s: 2 },
    { t: "ENTRY", s: 3 },
    { t: "03 SEP 2024 - KRAJINA", s: 2 },
  ], STAMP_BLUE);
  cv.blitRotated(s1, x0 + 190, y0 + 210, -7);

  // Stamp 2: Caldara admitted, red, tilted +6 deg.
  const s2 = makeStamp(300, 120, [
    { t: "CALDARA", s: 3 },
    { t: "ADMITTED", s: 3 },
    { t: "19 NOV 2024 - PORT CALDA", s: 2 },
  ], STAMP_RED);
  cv.blitRotated(s2, x0 + 250, y0 + 360, 6);

  // Stamp 3: Isle of Brenn departure, green, tilted -5 deg.
  const s3 = makeStamp(330, 120, [
    { t: "ISLE OF BRENN", s: 2 },
    { t: "DEPARTED", s: 3 },
    { t: "02 FEB 2025 - BRENN", s: 2 },
  ], STAMP_GREEN);
  cv.blitRotated(s3, x0 + 200, y0 + 510, -5);

  // Stamp 4: Valdoria re-entry, dark blue, tilted +4 deg.
  const s4 = makeStamp(330, 120, [
    { t: "REPUBLIC OF VALDORIA", s: 2 },
    { t: "RE-ENTRY", s: 3 },
    { t: "14 FEB 2025 - TARNOVIA", s: 2 },
  ], STAMP_BLUE);
  cv.blitRotated(s4, x0 + 240, y0 + 655, 4);

  // Fee stamp, red box, small tilt.
  const fee = makeStamp(290, 64, [{ t: "VISA FEE PAID - 40 VDR", s: 2 }], STAMP_RED, 2);
  cv.blitRotated(fee, x0 + 240, y0 + 760, -3);

  // The telling detail: visa condition box.
  const bx = x0 + 22;
  const by = y1 - 130;
  cv.rect(bx, by, x1 - x0 - 44, 108, [255, 255, 255, 90]);
  cv.rect(bx, by, x1 - x0 - 44, 2, TEAL);
  cv.rect(bx, by + 106, x1 - x0 - 44, 2, TEAL);
  cv.text("UVJETI / CONDITIONS", bx + 10, by + 8, 2, TEAL_DK);
  cv.text("THE HOLDER MAY NOT TAKE PAID", bx + 10, by + 30, 2, INK);
  cv.text("WORK IN THE NORTHERN", bx + 10, by + 46, 2, INK);
  cv.text("FISHERIES. A WORK PERMIT V-7", bx + 10, by + 62, 2, INK);
  cv.text("IS REQUIRED ON VALDORIAN", bx + 10, by + 78, 2, INK);
  cv.text("VESSELS. - MINISTRY OF LABOUR", bx + 10, by + 94, 2, INK);
}

// -------------------------------------------------------------------- main
function main() {
  const cv = new Canvas(W, H, DESK);
  // Desk shading: faint vignette bands.
  for (let j = 0; j < H; j += 4) cv.hline(0, W - 1, j, DESK_LT, 1);
  // Spread shadow + pages.
  cv.rect(12, 44, 996, 936, [12, 16, 20, 255]);
  drawDataPage(cv, 16, 48, 508, 976);
  drawVisaPage(cv, 516, 48, 1008, 976);
  // Centre gutter shadow.
  cv.rect(508, 48, 8, 928, [0, 0, 0, 60]);
  cv.vline(511, 48, 976, [0, 0, 0, 90], 2);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  // Clear only the contents of the output dir, never the dir itself.
  for (const f of fs.readdirSync(outDir)) {
    fs.rmSync(path.join(outDir, f), { recursive: true, force: true });
  }
  const png = encodePNG(cv);
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
