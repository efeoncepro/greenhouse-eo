"""Validate exported content and pagination; visual review remains required."""
import html, json, re
from pathlib import Path
import pymupdf
root=Path(__file__).resolve().parent
doc=pymupdf.open(root/'BEREL_INFORME_AGOSTO_2026_A4.pdf')
contact=json.loads((root.parents[3]/'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json').read_text())['slots']['contactDetails']['value']
text=''.join(page.get_text() for page in doc)
def norm(value):
    return re.sub(r'\s+','',html.unescape(re.sub('<[^>]+>','',value))).replace('−','-').replace('\u00ad','')
cells=re.findall(r'<(?:td|dd)[^>]*>([\s\S]*?)</(?:td|dd)>',(root/'REPORTE_BEREL_AGOSTO_2026.html').read_text())
missing=[norm(cell) for cell in cells if norm(cell) not in norm(text)]
# Sequential matching consumes each occurrence: duplicated fields cannot reuse one PDF occurrence.
position=0
out_of_order=[]
for index,cell in enumerate(cells):
    value=norm(cell)
    found=norm(text).find(value,position)
    if found<0:
        out_of_order.append(index)
    else:
        position=found+len(value)
page_map={re.match(r'\d+',title).group():page for level,title,page in doc.get_toc() if level==2 and re.match(r'\d+\.',title)}
checks={
 'pages':len(doc),
 'all_pages_A4':all(abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1 for page in doc),
 'source_cells':len(cells),
 'missing_cells':missing,
 'ordered_field_occurrences_missing':out_of_order,
 'all_33_previous_findings':all(f'T{i:02}' in text for i in range(1,34)),
 'toc_verified':page_map==json.loads((root/'page-map.json').read_text()),
 'running_headers_once':all(page.get_text().count('BEREL · ')==1 for page in list(doc)[1:]),
 'contact_every_page':all(all(value in page.get_text() for value in (contact['address'],contact['chilePhone'],contact['usPhone'])) for page in doc),
 'bubble_link_every_page':all(sum(link.get('uri')=='https://efeoncepro.com/' and link['from'].y0>780 for link in page.get_links())==1 for page in doc),
 'brand_images_every_page':all(len(page.get_image_info())>=2 for page in doc),
 'priorities_labeled':all(f'Prioridad {n}' in text for n in (1,2,3)),
 'font_names':sorted(set(font[3] for page in doc for font in page.get_fonts())),
 'short_pages_excluding_cover':[i+1 for i,page in enumerate(doc) if i and len(page.get_text())<600],
}
assert checks['all_pages_A4'] and not missing and not out_of_order and checks['all_33_previous_findings'] and checks['toc_verified'] and checks['running_headers_once'] and checks['contact_every_page'] and checks['bubble_link_every_page'] and checks['brand_images_every_page'] and checks['priorities_labeled'] and not checks['short_pages_excluding_cover'],checks
(root/'qa-pdf.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print(json.dumps(checks,ensure_ascii=False))
