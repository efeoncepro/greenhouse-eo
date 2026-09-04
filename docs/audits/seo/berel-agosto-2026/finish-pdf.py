"""Resolve TOC and apply the official Efeonce running identity. Requires PyMuPDF."""
import json, re
from pathlib import Path
import pymupdf
root = Path(__file__).resolve().parent
repo = root.parents[3]
pdf_path = root / 'BEREL_INFORME_AGOSTO_2026_A4.pdf'
raw_path = pdf_path.with_suffix('.raw.pdf')
if not raw_path.exists():
    raise SystemExit('Raw PDF missing. Run node render-pdf.cjs before finishing.')
doc = pymupdf.open(raw_path)
# Metadata describes this issued report. Do not add a PDF/UA conformance identifier:
# post-export annotations and reading order still require accessibility validation.
metadata = dict(doc.metadata)
metadata.update({
    'title': 'Berel · Resultados y gestión SEO/AEO · Agosto 2026',
    'author': 'Efeonce',
    'subject': 'Auditoría SEO/AEO y desempeño del equipo para Berel. Agosto de 2026; revisión del 4 de septiembre de 2026.',
    'keywords': 'Berel, Efeonce, SEO, AEO, agosto 2026, desempeño',
})
doc.set_metadata(metadata)
doc.set_language('es-MX')
page_map = {re.match(r'\d+', title).group(): page for level, title, page in doc.get_toc() if level == 2 and re.match(r'\d+\.', title)}
if page_map != json.loads((root / 'page-map.json').read_text()):
    (root / 'page-map.json').write_text(json.dumps(page_map, indent=2))
    raise SystemExit('Page map changed. Rebuild HTML, render PDF and rerun finishing.')
fontfile = repo / 'src/lib/artifact-composer/brand-packs/axis/fonts/geist-400.ttf'
font = pymupdf.Font(fontfile=str(fontfile))
contact = json.loads((repo/'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json').read_text())['slots']['contactDetails']['value']
# PNGs rendered from the official SVGs at >300 ppi preserve CSS-defined source colors.
sections = {'1':'RESULTADOS Y RESPONSABILIDADES','2':'ALCANCE Y FUENTES','3':'BÚSQUEDA EN GOOGLE','4':'DEMANDA DEL MERCADO','5':'ACCESO Y RECORRIDOS','6':'PRODUCCIÓN Y DESEMPEÑO','7':'ENLACES EXTERNOS','8':'PRESENCIA EN RESPUESTAS DE IA','9':'EXPERIENCIA Y MEDICIÓN','10':'PLAN DE TRABAJO','11':'CONTINUIDAD DE AUDITORÍAS','12':'ANEXO DE ENLACES','13':'FUENTES DEL INFORME'}
for index, page in enumerate(doc):
    page.clean_contents()
    page.wrap_contents()
    page.insert_font(fontname='BrandGeist', fontfile=str(fontfile))
    color = (96/255,96/255,96/255)
    if index == 0:
        page.draw_rect(pymupdf.Rect(0,778,page.rect.width,page.rect.height),color=None,fill=(1,1,1),overlay=True)
    if index:
        page.insert_image(pymupdf.Rect(48.2,18,118,35),filename=str(root/'assets/efeonce-logo-blue.png'))
        active = [key for key,num in page_map.items() if num<=index+1]
        label = 'BEREL · '+(sections[active[-1]] if active else 'LECTURA EJECUTIVA')
        page.insert_text((page.rect.width-48.2-font.text_length(label,fontsize=7.5),29),label,fontname='BrandGeist',fontsize=7.5,color=color)
    page.draw_line((48.2,779),(page.rect.width-48.2,779),color=(.75,.75,.75) if index else (.18,.37,.53),width=.4)
    bubble_rect = pymupdf.Rect(48.2,792,182,818.4)
    page.insert_image(bubble_rect,filename=str(root/'assets/efeonce-url-bubble.png'))
    page.insert_link({'kind':pymupdf.LINK_URI,'from':bubble_rect,'uri':'https://efeoncepro.com/'})
    address=contact['address']
    phones='Chile '+contact['chilePhone']+'  ·  EE. UU. '+contact['usPhone']
    for text,y in [(address,798),(phones,811)]:
        page.insert_text((199,y),text,fontname='BrandGeist',fontsize=8,color=color)
    # Functional phone links complement the visible contact details.
    page.insert_link({'kind':pymupdf.LINK_URI,'from':pymupdf.Rect(199,802,350,815),'uri':'tel:'+re.sub(r'[^+\d]','',contact['chilePhone'])})
    page.insert_link({'kind':pymupdf.LINK_URI,'from':pymupdf.Rect(351,802,535,815),'uri':'tel:'+re.sub(r'[^+\d]','',contact['usPhone'])})
    number=str(index+1)
    page.insert_text((page.rect.width-48.2-font.text_length(number,fontsize=7.5),829),number,fontname='BrandGeist',fontsize=7.5,color=color)
finished=pdf_path.with_suffix('.finished.pdf')
doc.save(finished,garbage=4,deflate=True)
doc.close();finished.replace(pdf_path)
print('PDF finished: official URL bubble, address, phones, brand logos and contextual headings.')
