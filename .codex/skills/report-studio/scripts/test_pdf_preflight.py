"""Exercise the PDF inspector with real generated files and deliberate defects."""
import sys
sys.dont_write_bytecode = True
import tempfile
from pathlib import Path
import pymupdf as fitz
from check_pdf import inspect

with tempfile.TemporaryDirectory() as directory:
    pdf = Path(directory) / 'fixture.pdf'
    doc = fitz.open()
    page = doc.new_page(width=210/25.4*72, height=297/25.4*72)
    page.insert_font(fontname='FixtureFont', fontbuffer=fitz.Font('helv').buffer)
    page.insert_text((40, 50), 'Primero. Segundo. Dato unico.', fontname='FixtureFont')
    doc.set_metadata({'author': 'Efeonce'})
    doc.set_language('es-MX')
    doc.set_toc([[1, 'Primero', 1]])
    page.insert_link({'kind':fitz.LINK_URI, 'from':fitz.Rect(40,40,150,55), 'uri':'https://efeoncepro.com'})
    doc.save(pdf)
    doc.close()
    manifest = {
        'metadata': {'author': 'Efeonce'},
        'required_text': ['Dato unico.'],
        'exact_occurrences': {'Dato unico.': 1},
        'ordered_text': [['Primero.', 'Segundo.']],
        'required_uris': ['https://efeoncepro.com']
    }
    assert inspect(pdf, manifest)['passed']
    cases = [
        ('required_text', ['Falta.']),
        ('exact_occurrences', {'Dato unico.': 2}),
        ('ordered_text', [['Segundo.', 'Primero.']]),
        ('metadata', {'author': 'Otro'}),
        ('page_size_mm', [100,100]),
        ('required_uris', ['https://invalid.example'])
    ]
    for key, value in cases:
        assert not inspect(pdf, {**manifest, key:value})['passed'], key
    print('PASS: valid PDF and six deliberate defects detected.')
