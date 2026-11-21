#!/usr/bin/env python3
"""Passport spread of the Republic of Kestrelia — a country that isn't there.

Draws an open passport spread (data page + visa page) at 1024x1024 and writes
it to /output/entry.png. Everything is drawn from constants in this file;
the only external asset is portrait.png, the holder's photo, read from this
file's own directory. Deterministic: no randomness, no network, no clock.
"""
import os
import math
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1024, 1024

# ---------------------------------------------------------------- country
COUNTRY = "REPUBLIC OF KESTRELIA"
CODE = "KST"
CAPITAL = "ALDHAVEN"
CURRENCY = "kestrel crown"
HOLDER = {
    "surname": "VOSS",
    "given": "MARA ELLIN",
    "nationality": "KESTRELIAN",
    "dob": "14 JUN 1994",
    "sex": "F",
    "pob": "ALDHAVEN",
    "occupation": "CARTOGRAPHER",
    "number": "KST 482913",
    "issued": "12 MAR 2023",
    "expiry": "11 MAR 2033",
    "authority": "MINISTRY OF THE INTERIOR",
}
# Stamps: (kind, country, place, date, ink colour) — all after the issue
# date 12 MAR 2023 and before the expiry 11 MAR 2033, in travel order.
STAMPS = [
    ("EXIT", "KESTRELIA", "Aldhaven Airport", "08 APR 2023", (38, 80, 140)),
    ("ENTRY", "MAROVIA", "Northgate Crossing", "09 APR 2023", (150, 40, 40)),
    ("EXIT", "MAROVIA", "Northgate Crossing", "21 APR 2023", (150, 40, 40)),
    ("ENTRY", "DRENLAND", "Port Dren", "22 APR 2023", (30, 110, 70)),
    ("EXIT", "DRENLAND", "Port Dren", "30 APR 2023", (30, 110, 70)),
    ("ENTRY", "KESTRELIA", "Aldhaven Airport", "01 MAY 2023", (38, 80, 140)),
    ("ENTRY", "SUTHMERE", "Suthmere Border Post", "14 SEP 2024", (110, 60, 140)),
    ("EXIT", "SUTHMERE", "Suthmere Border Post", "28 SEP 2024", (110, 60, 140)),
]
FEE_STAMP = ("VISA FEE PAID", "DRENLAND — 40 KCR", "22 APR 2023")

# ---------------------------------------------------------------- fonts
_SERIF = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
]
_SERIF_R = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
]
_SANS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]
_SANS_B = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
_MONO = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
]


def font(cands, size):
    for p in cands:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


# ---------------------------------------------------------------- MRZ (ICAO TD3)
_VALUES = {c: i for i, c in enumerate("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<")}
_VALUES["<"] = 0  # ICAO 9303: filler counts as zero, not 36
_WEIGHTS = (7, 3, 1)


def check_digit(s):
    total = 0
    for i, ch in enumerate(s):
        total += _VALUES[ch] * _WEIGHTS[i % 3]
    return str(total % 10)


def mrz_lines():
    line1 = ("P<" + CODE + HOLDER["surname"] + "<<" + "MARA" + "<" + "ELLIN")
    line1 = (line1 + "<" * 44)[:44]
    doc = "KST482913"
    dob = "940614"
    exp = "330311"
    personal = "<" * 14
    body = (doc + check_digit(doc) + CODE + dob + check_digit(dob) + "F"
            + exp + check_digit(exp) + personal + check_digit(personal))
    line2 = body + check_digit(body)
    assert len(line1) == 44 and len(line2) == 44
    return line1, line2


# ---------------------------------------------------------------- drawing helpers
NAVY = (31, 45, 74)
GOLD = (146, 110, 52)
INK = (24, 24, 24)
GREY = (110, 108, 96)
PAGE = (247, 241, 222)
PAGE_LINE = (122, 106, 79)


def guilloche(draw, box, colour, step=9, amp=5):
    """Fine wavy security lines across a page, clipped to the box."""
    x0, y0, x1, y1 = box
    for y in range(y0 + 14, y1 - 10, step):
        pts = []
        for x in range(x0, x1 + 1, 8):
            pts.append((x, y + amp * math.sin((x - x0) / 46.0 + y / 30.0)))
        draw.line(pts, fill=colour, width=1)


def emblem(draw, cx, cy, r):
    """Stylised kestrel in a ring — the arms of Kestrelia."""
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD, width=3)
    draw.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6],
                 outline=GOLD, width=1)
    # bird: body, swept wings, tail, head
    draw.polygon([(cx - 4, cy + 16), (cx + 4, cy + 16), (cx + 2, cy - 6),
                  (cx - 2, cy - 6)], fill=NAVY)
    draw.polygon([(cx - 2, cy - 2), (cx - r + 8, cy - 22), (cx - r + 18, cy - 2)],
                 fill=NAVY)
    draw.polygon([(cx + 2, cy - 2), (cx + r - 8, cy - 22), (cx + r - 18, cy - 2)],
                 fill=NAVY)
    draw.polygon([(cx - 4, cy + 14), (cx + 4, cy + 14), (cx + 7, cy + r - 6),
                  (cx - 7, cy + r - 6)], fill=NAVY)
    draw.ellipse([cx - 5, cy - 12, cx + 5, cy - 2], fill=NAVY)
    draw.polygon([(cx + 3, cy - 8), (cx + 10, cy - 6), (cx + 3, cy - 4)],
                 fill=GOLD)


def stamp_layer(size, angle, colour, lines):
    """One ink stamp, drawn on its own layer and rotated."""
    w, h = size
    layer = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = (w + 40) // 2, (h + 40) // 2
    ink = colour + (205,)
    d.rounded_rectangle([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2],
                        radius=14, outline=ink, width=3)
    d.rounded_rectangle([cx - w // 2 + 5, cy - h // 2 + 5,
                         cx + w // 2 - 5, cy + h // 2 - 5],
                        radius=10, outline=ink, width=1)
    f_big = font(_SANS_B, 17)
    f_med = font(_SANS_B, 13)
    f_sml = font(_SANS, 11)
    fonts = [f_big, f_med, f_sml, f_sml]
    y = cy - h // 2 + 12
    for i, text in enumerate(lines):
        f = fonts[min(i, len(fonts) - 1)]
        tw = d.textlength(text, font=f)
        d.text((cx - tw / 2, y), text, font=f, fill=ink)
        y += 22 if i == 0 else 19
    return layer.rotate(angle, resample=Image.BICUBIC, center=(cx, cy))


def field(draw, x, y, label, value, vsize=17, label_w=132):
    f_lab = font(_SANS, 12)
    f_val = font(_SERIF, vsize)
    draw.text((x, y), label, font=f_lab, fill=GREY)
    draw.text((x, y + 15), value, font=f_val, fill=INK)


def build():
    img = Image.new("RGB", (W, H), (35, 44, 62))
    draw = ImageDraw.Draw(img)
    # soft vignette on the cover background
    for i in range(0, 90, 6):
        draw.rectangle([i, i, W - i, H - i], outline=(35 + i // 3, 44 + i // 3, 62 + i // 3))
    pages = [(36, 36, 498, 988), (526, 36, 988, 988)]
    for box in pages:
        draw.rounded_rectangle(box, radius=6, fill=PAGE, outline=(20, 26, 40), width=3)
        guilloche(draw, (box[0] + 8, box[1] + 8, box[2] - 8, box[3] - 8),
                  (224, 228, 210), step=12, amp=3)
        draw.rounded_rectangle([box[0] + 10, box[1] + 10, box[2] - 10, box[3] - 10],
                               radius=4, outline=PAGE_LINE, width=1)

    # ---------------------------------------------------------- data page
    x0, y0, x1, y1 = pages[0]
    cx = (x0 + x1) // 2
    emblem(draw, cx, 108, 34)
    f_title = font(_SERIF, 25)
    t = COUNTRY
    tw = draw.textlength(t, font=f_title)
    draw.text((cx - tw / 2, 152), t, font=f_title, fill=NAVY)
    f_sub = font(_SANS, 15)
    t2 = "P A S S P O R T"
    tw = draw.textlength(t2, font=f_sub)
    draw.text((cx - tw / 2, 184), t2, font=f_sub, fill=GOLD)
    draw.line([x0 + 40, 214, x1 - 40, 214], fill=PAGE_LINE, width=1)

    # portrait, top left
    photo = Image.open(os.path.join(HERE, "portrait.png")).convert("RGB")
    pw, ph = 150, 190
    iw, ih = photo.size
    target = pw / ph
    if iw / ih > target:
        nw = int(ih * target)
        off = (iw - nw) // 2
        photo = photo.crop((off, 0, off + nw, ih))
    else:
        nh = int(iw / target)
        off = (ih - nh) // 2
        photo = photo.crop((0, off, iw, off + nh))
    photo = photo.resize((pw, ph), Image.LANCZOS)
    px, py = x0 + 34, 236
    img.paste(photo, (px, py))
    draw.rectangle([px, py, px + pw, py + ph], outline=NAVY, width=2)
    draw.text((px, py + ph + 8), "PHOTOGRAPH", font=font(_SANS, 10), fill=GREY)

    # data fields, right of the photo
    fx = px + pw + 24
    field(draw, fx, 236, "TYPE", "P")
    field(draw, fx + 70, 236, "CODE", CODE)
    field(draw, fx, 292, "PASSPORT NO.", HOLDER["number"], vsize=17)
    field(draw, fx, 348, "SURNAME", HOLDER["surname"], vsize=19)
    field(draw, fx, 404, "GIVEN NAMES", HOLDER["given"], vsize=19)
    field(draw, fx, 460, "NATIONALITY", HOLDER["nationality"])
    field(draw, fx, 516, "DATE OF BIRTH", HOLDER["dob"])
    field(draw, fx + 170, 516, "SEX", HOLDER["sex"])
    # lower block, full width
    field(draw, x0 + 34, 566, "PLACE OF BIRTH", HOLDER["pob"])
    field(draw, x0 + 260, 566, "OCCUPATION", HOLDER["occupation"])
    field(draw, x0 + 34, 622, "DATE OF ISSUE", HOLDER["issued"])
    field(draw, x0 + 260, 622, "DATE OF EXPIRY", HOLDER["expiry"])
    field(draw, x0 + 34, 678, "AUTHORITY", HOLDER["authority"], vsize=14)
    # holder's signature
    draw.text((x0 + 34, 724), "SIGNATURE OF HOLDER", font=font(_SANS, 12), fill=GREY)
    sig = [(x0 + 40 + i * 6,
            756 + 5 * math.sin(i / 2.1) + 2.5 * math.sin(i / 0.9) - i * 0.35)
           for i in range(30)]
    draw.line(sig, fill=INK, width=2)
    draw.line([x0 + 34, 768, x0 + 240, 768], fill=PAGE_LINE, width=1)
    # note of issue
    f_note = font(_SERIF_R, 13)
    draw.text((x0 + 260, 724),
              "This passport remains the\nproperty of the Republic\nof Kestrelia.",
              font=f_note, fill=GREY)
    # MRZ band
    draw.rectangle([x0 + 24, y1 - 118, x1 - 24, y1 - 28], fill=(238, 232, 210))
    draw.rectangle([x0 + 24, y1 - 118, x1 - 24, y1 - 28], outline=PAGE_LINE, width=1)
    f_mrz = font(_MONO, 15)
    l1, l2 = mrz_lines()
    draw.text((x0 + 34, y1 - 106), l1, font=f_mrz, fill=INK)
    draw.text((x0 + 34, y1 - 78), l2, font=f_mrz, fill=INK)

    # ---------------------------------------------------------- visa page
    vx0, vy0, vx1, vy1 = pages[1]
    vcx = (vx0 + vx1) // 2
    f_vt = font(_SERIF, 24)
    t = "VISAS"
    tw = draw.textlength(t, font=f_vt)
    draw.text((vcx - tw / 2, 64), t, font=f_vt, fill=NAVY)
    f_vs = font(_SANS, 12)
    t = "PAGES 7 — 8"
    tw = draw.textlength(t, font=f_vs)
    draw.text((vcx - tw / 2, 96), t, font=f_vs, fill=GREY)
    draw.line([vx0 + 40, 124, vx1 - 40, 124], fill=PAGE_LINE, width=1)

    # 8 stamps in 2 columns x 4 rows
    angles = [-4, 3, 5, -3, 2, -5, 4, -2]
    for i, (kind, country, place, date, colour) in enumerate(STAMPS):
        col = i % 2
        row = i // 2
        cx_s = vx0 + 118 + col * 226
        cy_s = 200 + row * 168
        st = stamp_layer((196, 108), angles[i], colour,
                         [country, kind, date, place])
        img.paste(st, (cx_s - st.width // 2, cy_s - st.height // 2), st)

    # fee stamp — the telling paperwork detail
    fee = stamp_layer((300, 92), -3, (150, 40, 40),
                      [FEE_STAMP[0], FEE_STAMP[1], FEE_STAMP[2], ""])
    img.paste(fee, (vcx - fee.width // 2, 872 - fee.height // 2), fee)
    f_bot = font(_SERIF_R, 11)
    t = "Holder must present this passport with a valid travel\npermit at the Suthmere border."
    draw.text((vcx - 190, 936), t, font=f_bot, fill=GREY)
    return img


def main():
    out_dir = os.environ.get("MAKEFUN_OUTPUT_DIR", "/output")
    os.makedirs(out_dir, exist_ok=True)
    img = build()
    path = os.path.join(out_dir, "entry.png")
    img.save(path, optimize=True)
    print("wrote", path, img.size, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
