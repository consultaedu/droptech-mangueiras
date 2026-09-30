"""Generate separate, content-addressed WebP variants. Requires Pillow and numpy.

Run from the repository root. Originals are only read. No cleanup is performed.
"""
from pathlib import Path
import hashlib
import io
import json
import re

import numpy as np
from PIL import Image, ImageOps

ROOT = Path.cwd()
OUTPUT = ROOT / 'assets/optimized'
OUTPUT.mkdir(parents=True, exist_ok=True)
refs = set()
sources = list(ROOT.glob('*.html')) + list((ROOT / 'conteudo').glob('*.json'))
sources.append(ROOT / 'assets/js/app.js')
for source in sources:
    text = source.read_text(encoding='utf-8')
    refs.update(ref.lstrip('/') for ref in re.findall(
        r'''/?assets/[^"'<>`]+?\.(?:jpg|jpeg|png|webp)''', text, re.I)
        if not ref.lstrip('/').startswith('assets/optimized/'))

manifest = {}
for ref in sorted(refs):
    source = ROOT / ref
    if not source.is_file():
        raise ValueError(f'Missing source: {ref}')
    raw = source.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    with Image.open(source) as opened:
        real_format = opened.format
        image = ImageOps.exif_transpose(opened).convert(
            'RGBA' if 'A' in opened.getbands() else 'RGB')
    width, height = image.size
    record = dict(width=width, height=height, bytes=len(raw), sha256=digest,
                  format=real_format, variants=[])
    manifest[ref] = record
    if max(width, height) <= 1000:
        continue
    # Logo has a 230 CSS px slot; preserve its alpha exactly at each resized size.
    bounds = [230, 460] if ref.endswith('logo-droptech.png') else sorted(
        set([400, 800, 1200, 1600, min(1600, max(width, height))]))
    for bound in bounds:
        if bound > max(width, height):
            continue
        scale = bound / (width if ref.endswith('logo-droptech.png') else max(width, height))
        size = (max(1, round(width * scale)), max(1, round(height * scale)))
        if size[0] > width or size[1] > height:
            continue
        resized = image.resize(size, Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        alpha = image.mode == 'RGBA'
        resized.save(encoded, 'WEBP', quality=92, method=6, lossless=alpha, exact=alpha)
        data = encoded.getvalue()
        # Already optimized sources should never receive heavier alternatives.
        if len(data) >= len(raw):
            continue
        name = f'{digest[:16]}-{size[0]}w.webp'
        target = OUTPUT / name
        if target.exists():
            if target.read_bytes() != data:
                raise ValueError(f'Refusing to replace existing derivative: {target}')
        else:
            target.write_bytes(data)
        with Image.open(io.BytesIO(data)) as decoded:
            actual = np.asarray(decoded.convert(image.mode)).astype(np.float64)
        expected = np.asarray(resized).astype(np.float64)
        mse = float(np.mean((actual[:, :, :3] - expected[:, :, :3]) ** 2))
        psnr = round(float(10 * np.log10(255 ** 2 / mse)), 2) if mse else None
        if alpha:
            assert np.array_equal(actual[:, :, 3], expected[:, :, 3]), ref
            assert np.array_equal(actual, expected), ref
        record['variants'].append(dict(path='assets/optimized/' + name,
                                       width=size[0], height=size[1], bytes=len(data),
                                       psnr=psnr, lossless=alpha))

(OUTPUT / 'manifest.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
variants = {v['path']: v for record in manifest.values() for v in record['variants']}
print(json.dumps(dict(referenced=len(manifest), originalBytes=sum(r['bytes'] for r in manifest.values()),
                      optimizedSources=sum(bool(r['variants']) for r in manifest.values()),
                      variants=len(variants), variantBytes=sum(v['bytes'] for v in variants.values())), indent=2))
