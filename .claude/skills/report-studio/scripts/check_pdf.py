#!/usr/bin/env python3
"""Manifest-driven PDF preflight. Requires PyMuPDF; does not certify accessibility."""
import argparse
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path
import pymupdf as fitz


def normalize(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', value)).strip()


def inspect(pdf, manifest):
    checks = []
    def check(name, passed, detail=None):
        checks.append({'check': name, 'passed': bool(passed), 'detail': detail})
    with fitz.open(pdf) as doc:
        texts = [normalize(page.get_text(sort=True)) for page in doc]
        all_text = ' '.join(texts)
        expected = manifest.get('page_size_mm', [210, 297])
        tolerance = manifest.get('size_tolerance_mm', 0.5)
        check('pages_present', len(doc) > 0)
        if 'page_count' in manifest:
            check('page_count', len(doc) == manifest['page_count'], len(doc))
        for i, page in enumerate(doc, 1):
            dimensions = [page.rect.width * 25.4 / 72, page.rect.height * 25.4 / 72]
            check(f'page_{i}_size', all(abs(a-b) <= tolerance for a,b in zip(dimensions, expected)), dimensions)
            check(f'page_{i}_rotation', page.rotation == manifest.get('rotation', 0))
            if manifest.get('require_extractable_text', True):
                check(f'page_{i}_text', bool(texts[i-1]))
            for token in manifest.get('each_page_text', []):
                check(f'page_{i}_text:{token}', normalize(token) in texts[i-1])
        for key, value in manifest.get('metadata', {}).items():
            check(f'metadata:{key}', doc.metadata.get(key) == value, doc.metadata.get(key))
        if manifest.get('require_language', True):
            check('language_present', doc.xref_get_key(doc.pdf_catalog(), 'Lang')[0] != 'null')
        if manifest.get('require_structure', False):
            check('structure_present_not_certification', doc.xref_get_key(doc.pdf_catalog(), 'StructTreeRoot')[0] != 'null')
        for phrase in manifest.get('required_text', []):
            check(f'required:{phrase}', normalize(phrase) in all_text)
        for phrase, count in manifest.get('exact_occurrences', {}).items():
            actual = all_text.count(normalize(phrase))
            check(f'occurrences:{phrase}', actual == count, actual)
        for group in manifest.get('ordered_text', []):
            position = 0
            for phrase in group:
                found = all_text.find(normalize(phrase), position)
                check(f'ordered:{phrase}', found >= 0)
                if found >= 0:
                    position = found + len(normalize(phrase))
        fonts = sorted({font[0] for page in doc for font in page.get_fonts(full=True)})
        if manifest.get('require_embedded_fonts', True):
            check('fonts_present', bool(fonts))
            for xref in fonts:
                info = doc.extract_font(xref)
                check(f'font_embedded:{xref}', bool(info[3]), info[0])
        uris = []
        for page_number, page in enumerate(doc, 1):
            for link in page.get_links():
                if link['kind'] == fitz.LINK_GOTO:
                    check(f'internal_destination:{page_number}', 0 <= link.get('page', -1) < len(doc))
                uri = link.get('uri', '')
                if uri:
                    uris.append(uri)
                    check(f'nonlocal_uri:{page_number}', not uri.lower().startswith(('file:', 'http://localhost', 'http://127.0.0.1')))
                if link['kind'] in (fitz.LINK_GOTOR, fitz.LINK_LAUNCH):
                    check(f'no_local_file_link:{page_number}', False, link.get('file'))
        for uri in manifest.get('required_uris', []):
            check(f'uri:{uri}', uri in uris)
        toc = doc.get_toc()
        if manifest.get('require_outline', True):
            check('outline_present', bool(toc))
        for _, title, page_number in toc:
            check(f'outline_destination:{title}', 1 <= page_number <= len(doc))
        return {
            'pdf': str(Path(pdf).resolve()),
            'sha256': hashlib.sha256(Path(pdf).read_bytes()).hexdigest(),
            'pymupdf_version': fitz.VersionBind,
            'pages': len(doc), 'checks': checks,
            'passed': all(c['passed'] for c in checks),
            'scope': 'Automated preflight only; visual, factual and assistive-reading review are separate.'
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        result = inspect(args.pdf, json.loads(args.manifest.read_text()))
    except (OSError, ValueError, RuntimeError) as error:
        result = {'passed': False, 'error': str(error)}
    output = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(output + '\n')
    failures = [c for c in result.get('checks', []) if not c['passed']]
    print(json.dumps({'passed': result['passed'], 'pages': result.get('pages'), 'failed_checks': failures, 'error': result.get('error')}, ensure_ascii=False))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
