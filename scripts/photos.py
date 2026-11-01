"""Фото товаров: photos/sources.json → photos/<модель>/<цвет>.webp + photos/index.json.

Все снимки приводятся к одному виду: товар без фона (прозрачный), обрезан по контуру и вписан
по центру квадрата 1000×1000 с одинаковым полем — на сайте все лежат на одном фоне.

Источник — официальные снимки производителей: «apple:<имя>» — packshot из магазина Apple
(прозрачный PNG), иначе прямой URL. "cutout": true — у снимка есть фон, его вырезает rembg;
"crop": [x0, y0, x1, y1] — сначала кадрировать (доли кадра); "rotate": градусы;
"size": размер запроса к магазину Apple (у мелких снимков товар занимает малую часть кадра).

Запуск: python3 scripts/photos.py [модель ...]   (rembg нужен только для "cutout": pip install "rembg[cpu]")
"""
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / 'photos'
SIZE, FILL = 1000, 0.86  # холст и доля, которую занимает товар по большей стороне
APPLE = 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/{0}?wid={1}&hei={1}&fmt=png-alpha'

_session = None


def cutout(im):
    global _session
    from rembg import new_session, remove

    _session = _session or new_session('isnet-general-use')
    return remove(im.convert('RGB'), session=_session)


def fetch(src, size=1400):
    url = APPLE.format(src[6:], size) if src.startswith('apple:') else src
    req = urllib.request.Request(url, headers={'User-Agent': 'appleshop-photos/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return Image.open(io.BytesIO(r.read()))


def normalize(im, need_cutout, crop=None, rotate=0):
    im = im.convert('RGBA')
    if crop:  # доли кадра [x0, y0, x1, y1] — убрать надписи с промо-снимка
        w, h = im.size
        im = im.crop((round(crop[0] * w), round(crop[1] * h), round(crop[2] * w), round(crop[3] * h)))
    if need_cutout or im.getchannel('A').getextrema()[0] == 255:
        im = cutout(im)
    if rotate:
        im = im.rotate(rotate, resample=Image.BICUBIC, expand=True)
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        raise ValueError('на снимке не нашлось товара')
    im = im.crop(box)
    k = SIZE * FILL / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
    return canvas


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'main'


def main(only):
    sources = json.loads((PHOTOS / 'sources.json').read_text())
    cache = {}
    for model, cfg in sources.items():
        if only and model not in only:
            continue
        jobs = {'main': cfg['src']} if 'src' in cfg else {}
        jobs.update(cfg.get('colors', {}))
        for key, src in jobs.items():
            out = PHOTOS / model / f'{slug(key)}.webp'
            if src not in cache:
                cache[src] = normalize(fetch(src, cfg.get('size', 1400)), cfg.get('cutout', False), cfg.get('crop'), cfg.get('rotate', 0))
            out.parent.mkdir(parents=True, exist_ok=True)
            cache[src].save(out, 'WEBP', quality=86, method=6)
        print(f'{model}: {len(jobs)}', flush=True)
    # Индекс собирается заново из sources.json и готовых файлов — запуск по части моделей его не портит.
    index = {}
    for model, cfg in sources.items():
        keys = (['main'] if 'src' in cfg else []) + list(cfg.get('colors', {}))
        files = {k: f'{model}/{slug(k)}.webp' for k in keys if (PHOTOS / model / f'{slug(k)}.webp').exists()}
        if files:
            colors = {k: v for k, v in files.items() if k != 'main'}
            index[model] = {'main': files.get('main') or next(iter(colors.values())), 'colors': colors}
    (PHOTOS / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
    print(f'index: {len(index)} моделей', flush=True)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
