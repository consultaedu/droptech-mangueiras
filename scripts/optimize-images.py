"""Incremental WebP generation. Originals are read only; no cleanup is performed."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import re

import numpy as np
import PIL
from PIL import Image, ImageOps, features

VARIANT_PATH = re.compile(r'^assets/optimized/[a-z0-9-]+\.webp$')


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def write_if_changed(target, data):
    if not target.is_file() or target.read_bytes() != data:
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(target.suffix + '.tmp')
        temporary.write_bytes(data)
        temporary.replace(target)


def references(root):
    """Decode CMS JSON strings, including escaped slashes and Unicode paths."""
    refs = set()

    def add(value):
        if not isinstance(value, str):
            return
        ref = value.lstrip('/').replace('\\', '/')
        if not ref.startswith('assets/') or ref.startswith('assets/optimized/'):
            return
        if Path(ref).suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
            return
        if '..' in Path(ref).parts or not (root / ref).resolve().is_relative_to(root):
            raise ValueError(f'Unsafe image reference: {ref}')
        refs.add(ref)

    def walk(value):
        if isinstance(value, dict):
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
        else:
            add(value)

    for source in sorted((root / 'conteudo').glob('*.json')):
        walk(json.loads(source.read_text(encoding='utf-8')))
    sources = sorted(root.glob('*.html')) + [root / 'assets/js/app.js']
    for source in sources:
        for ref in re.findall(r'''/?assets/[^"'<>`]+?\.(?:jpg|jpeg|png|webp)''',
                              source.read_text(encoding='utf-8'), re.I):
            add(ref)
    return sorted(refs)


def source_info(source):
    raw = source.read_bytes()
    with Image.open(source) as image:
        width, height = image.size
        if image.getexif().get(274) in (5, 6, 7, 8):
            width, height = height, width
        alpha = 'A' in image.getbands() or 'transparency' in image.info
        real_format = image.format
    return dict(width=width, height=height, bytes=len(raw), sha256=sha256(raw),
                format=real_format), alpha


def parameters(ref, alpha):
    return dict(version=1, quality=92, method=6, lossless=alpha, exact=alpha,
                resampling='LANCZOS', orientation='exif-transpose', minSide=1000,
                bounds=[230, 460] if ref.endswith('logo-droptech.png') else [400, 800, 1200, 1600],
                role='logo' if ref.endswith('logo-droptech.png') else 'photo',
                pillow=PIL.__version__, numpy=np.__version__, webp=features.version('webp'))


def planned_sizes(info, recipe):
    width, height = info['width'], info['height']
    if max(width, height) <= recipe['minSide']:
        return []
    bounds = recipe['bounds'][:]
    if recipe['role'] != 'logo':
        bounds.append(min(1600, max(width, height)))
    result = []
    for bound in sorted(set(bounds)):
        if bound > max(width, height):
            continue
        scale = bound / (width if recipe['role'] == 'logo' else max(width, height))
        size = max(1, round(width * scale)), max(1, round(height * scale))
        if size[0] <= width and size[1] <= height and size not in result:
            result.append(size)
    return result


def valid_record(root, record, info, recipe, cache_files=None):
    """Verify recipe, coverage, hashes, dimensions and full WebP decoding, without encoding."""
    if not isinstance(record, dict) or any(record.get(k) != v for k, v in info.items()):
        return False
    if record.get('parameters') != recipe:
        return False
    variants, omitted = record.get('variants'), record.get('omitted')
    if not isinstance(variants, list) or not isinstance(omitted, list):
        return False
    covered = []
    try:
        for variant in variants:
            if not VARIANT_PATH.fullmatch(variant['path']):
                return False
            target = root / variant['path'] if cache_files is None else cache_files / Path(variant['path']).name
            data = target.read_bytes()
            if len(data) != variant['bytes'] or sha256(data) != variant['sha256']:
                return False
            if variant['lossless'] != recipe['lossless']:
                return False
            with Image.open(io.BytesIO(data)) as image:
                image.load()
                if image.format != 'WEBP' or image.size != (variant['width'], variant['height']):
                    return False
            covered.append((variant['width'], variant['height']))
        for item in omitted:
            if item['reason'] != 'not-smaller' or ('bytes' in item and item['bytes'] < info['bytes']):
                return False
            covered.append((item['width'], item['height']))
    except (OSError, ValueError, KeyError, TypeError):
        return False
    return len(covered) == len(set(covered)) and set(covered) == set(planned_sizes(info, recipe))


def encode(root, ref, info, recipe):
    record = {**info, 'parameters': recipe, 'variants': [], 'omitted': []}
    sizes = planned_sizes(info, recipe)
    if not sizes:
        return record, 0
    with Image.open(root / ref) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGBA' if recipe['lossless'] else 'RGB')
    recipe_hash = sha256(json_bytes(recipe))[:12]
    for width, height in sizes:
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        resized.save(encoded, 'WEBP', quality=recipe['quality'], method=recipe['method'],
                     lossless=recipe['lossless'], exact=recipe['exact'])
        data = encoded.getvalue()
        if len(data) >= info['bytes']:
            record['omitted'].append(dict(width=width, height=height, bytes=len(data), reason='not-smaller'))
            continue
        digest = sha256(data)
        name = f'{info["sha256"][:16]}-{recipe_hash}-{width}w-{digest[:12]}.webp'
        target = root / 'assets/optimized' / name
        if target.exists() and target.read_bytes() != data:
            raise ValueError(f'Refusing to replace an existing derivative: {target}')
        write_if_changed(target, data)
        with Image.open(io.BytesIO(data)) as decoded:
            actual = np.asarray(decoded.convert(image.mode)).astype(np.float64)
        expected = np.asarray(resized).astype(np.float64)
        mse = float(np.mean((actual[:, :, :3] - expected[:, :, :3]) ** 2))
        psnr = round(float(10 * np.log10(255 ** 2 / mse)), 2) if mse else None
        if recipe['lossless'] and not np.array_equal(actual, expected):
            raise ValueError(f'Lossless/alpha comparison failed: {ref}')
        record['variants'].append(dict(path='assets/optimized/' + name, width=width, height=height,
                                       bytes=len(data), sha256=digest, psnr=psnr, lossless=recipe['lossless']))
    return record, len(sizes)


def generate(root, cache=None, check=False):
    root = root.resolve()
    manifest_file = root / 'assets/optimized/manifest.json'
    previous = json.loads(manifest_file.read_text(encoding='utf-8')) if manifest_file.is_file() else {}
    if not isinstance(previous, dict):
        raise ValueError('Image manifest must be an object')
    manifest, encoded_count, reused, restored = {}, 0, 0, 0
    for ref in references(root):
        source = root / ref
        if not source.is_file():
            raise ValueError(f'Missing source: {ref}')
        info, alpha = source_info(source)
        recipe = parameters(ref, alpha)
        key = info['sha256'] + '-' + sha256(json_bytes(recipe))
        record = previous.get(ref)
        if valid_record(root, record, info, recipe):
            reused += 1
        elif check:
            raise ValueError(f'Stale, incomplete or invalid image manifest: {ref}')
        else:
            cached_file = cache / (key + '.json') if cache else None
            cached = None
            if cached_file and cached_file.is_file():
                try:
                    candidate = json.loads(cached_file.read_text(encoding='utf-8'))
                    if valid_record(root, candidate, info, recipe, cache / 'files'):
                        cached = candidate
                except (OSError, ValueError):
                    pass
            if cached is not None:
                record = cached
                for variant in record['variants']:
                    target = root / variant['path']
                    data = (cache / 'files' / target.name).read_bytes()
                    if target.exists() and target.read_bytes() != data:
                        raise ValueError(f'Refusing to replace an existing derivative: {target}')
                    write_if_changed(target, data)
                restored += 1
            else:
                record, count = encode(root, ref, info, recipe)
                encoded_count += count
        manifest[ref] = record
        if cache and not check:
            for variant in record['variants']:
                target = cache / 'files' / Path(variant['path']).name
                write_if_changed(target, (root / variant['path']).read_bytes())
            write_if_changed(cache / (key + '.json'), json_bytes(record))
    if check:
        if set(previous) != set(manifest):
            raise ValueError('Image manifest does not match the current references')
    else:
        write_if_changed(manifest_file, json_bytes(manifest))
    variants = {v['path']: v for record in manifest.values() for v in record['variants']}
    return dict(referenced=len(manifest), encoded=encoded_count, reused=reused, restored=restored,
                variants=len(variants), variantBytes=sum(v['bytes'] for v in variants.values()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--cache-dir', type=Path)
    parser.add_argument('--check', action='store_true', help='Validate without changing files or encoding')
    args = parser.parse_args()
    print(json.dumps(generate(args.root, args.cache_dir, args.check), indent=2))


if __name__ == '__main__':
    main()
