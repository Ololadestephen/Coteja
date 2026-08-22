#!/usr/bin/env python3
"""Messy-input dossier fixtures: rotated, noisy, low-light, JPEG-compressed scans.

Test-fixture tooling only — no inference.
"""

import os
import random
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter, ImageOps

ROOT = os.path.join(os.path.dirname(__file__), "..", "dossiers", "messy")
FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
W, H = 1400, 1800
MARGIN = 90
TITLE_SIZE = 46
BODY_SIZE = 34


def font(size: int) -> "ImageFont.FreeTypeFont":
    return ImageFont.truetype(FONT, size)


def render_clean(title: str, lines: list[str]) -> Image.Image:
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    y = MARGIN
    draw.text((MARGIN, y), title, fill="black", font=font(TITLE_SIZE))
    y += TITLE_SIZE + 40
    body = font(BODY_SIZE)
    max_width = W - 2 * MARGIN
    for line in lines:
        if line == "":
            y += BODY_SIZE + 10
            continue
        words = line.split(" ")
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if draw.textlength(candidate, font=body) <= max_width:
                current = candidate
            else:
                draw.text((MARGIN, y), current, fill="black", font=body)
                y += BODY_SIZE + 22
                current = word
        if current:
            draw.text((MARGIN, y), current, fill="black", font=body)
            y += BODY_SIZE + 22
    return img


def add_uneven_lighting(img: Image.Image, strength: int = 90) -> Image.Image:
    width, height = img.size
    gradient = Image.new("L", (width, height))
    gdraw = ImageDraw.Draw(gradient)
    for x in range(width):
        value = 255 - int(strength * (x / width) ** 1.5)
        gdraw.line([(x, 0), (x, height)], fill=value)
    from PIL import ImageChops
    scale = gradient.point(lambda v: max(v, 160))
    return ImageChops.multiply(img, Image.merge("RGB", (scale, scale, scale)))


def add_noise(img: Image.Image, alpha: float, seed: int) -> Image.Image:
    noise = Image.effect_noise(img.size, 48).convert("RGB")
    return Image.blend(img, noise, alpha)


def degrade(
    img: Image.Image,
    rotate_deg: float = 0.0,
    blur_radius: float = 0.0,
    noise_alpha: float = 0.0,
    brightness: float = 1.0,
    contrast: float = 1.0,
    uneven_light: bool = False,
    seed: int = 7,
) -> Image.Image:
    out = img
    if rotate_deg != 0.0:
        out = out.rotate(rotate_deg, expand=True, resample=Image.BICUBIC, fillcolor=(224, 222, 218))
    if uneven_light:
        out = add_uneven_lighting(out)
    if contrast != 1.0:
        out = ImageEnhance.Contrast(out).enhance(contrast)
    if brightness != 1.0:
        out = ImageEnhance.Brightness(out).enhance(brightness)
    if blur_radius > 0:
        out = out.filter(ImageFilter.GaussianBlur(blur_radius))
    if noise_alpha > 0:
        out = add_noise(out, noise_alpha, seed)
    return out


LC_LINES = [
    "Issuing bank: STANDARD CHARTER BANK",
    "Credit number: LC-2026-04417",
    "Date of issue: 2026-04-10",
    "",
    "Applicant: GLOBAL IMPORT GMBH, Hamburg, Germany",
    "Beneficiary: ANDINA EXPORT S.A., Buenos Aires, Argentina",
    "Currency and amount: USD 252600.00",
    "Latest date of shipment: 2026-05-15",
    "Expiry date: 2026-06-01",
    "",
    "Documents required:",
    "1. Signed commercial invoice",
    "2. Packing list",
    "3. Full set bill of lading",
]

INVOICE_LINES = [
    "Invoice number: CI-118",
    "Seller: ANDINA EXPORT S.A.",
    "Buyer: GLOBAL IMPORT GMBH",
    "Date: 2026-05-02",
    "Currency: USD",
    "",
    "Items:",
    "Item 1 description: Malting barley, grade A",
    "Item 1 quantity: 1200 MT",
    "Item 1 unit price: USD 210.50",
    "Item 1 line total: USD 252600.00",
    "",
    "Shipment date: 2026-05-02",
    "Grand total: USD 252600.00",
    "Beneficiary account: 0720-14488901",
]

PACKING_LINES = [
    "List number: PL-121",
    "Shipper: ANDINA EXPORT S.A.",
    "Consignee: GLOBAL IMPORT GMBH",
    "",
    "Items:",
    "Item 1 description: Malting barley, grade A",
    "Item 1 quantity: 1150 MT",
    "",
    "Total packages: 46 containers",
]

BOL_LINES = [
    "B/L number: MSCU-8841310",
    "Shipper: ANDINA EXPORT S.A.",
    "Carrier: MSC Mediterranean Shipping Co",
    "Vessel: MSC Aurora V.126W",
    "Port of loading: Buenos Aires",
    "Port of discharge: Hamburg",
    "Shipped on board date: 2026-05-02",
]


def main() -> None:
    os.makedirs(ROOT, exist_ok=True)

    lc = degrade(render_clean("IRREVOCABLE DOCUMENTARY LETTER OF CREDIT", LC_LINES),
                 rotate_deg=-2.0, brightness=0.93, noise_alpha=0.08, seed=11)
    lc.save(os.path.join(ROOT, "lc.png"))

    inv = degrade(render_clean("COMMERCIAL INVOICE", INVOICE_LINES),
                  rotate_deg=2.8, blur_radius=1.1, noise_alpha=0.14,
                  brightness=0.86, contrast=0.8, uneven_light=True, seed=22)
    inv.save(os.path.join(ROOT, "invoice.jpg"), quality=52)

    packing = degrade(render_clean("PACKING LIST", PACKING_LINES),
                      rotate_deg=-1.6, noise_alpha=0.1, contrast=0.84, seed=33)
    packing.save(os.path.join(ROOT, "packing-list.jpg"), quality=58)

    bol = degrade(render_clean("BILL OF LADING", BOL_LINES),
                  rotate_deg=2.3, brightness=0.9, noise_alpha=0.09, seed=44)
    bol.save(os.path.join(ROOT, "bol.jpg"), quality=55)

    print("ok messy: 4 degraded documents")


if __name__ == "__main__":
    main()
