"""Normalize physical A4 boxes, label navigation and verify the composed board PDF."""
import hashlib,json,re
from pathlib import Path
import pymupdf as fitz
root=Path(__file__).resolve().parent
plan=json.loads((root/'deck-plan.json').read_text())
raw=root/'render'/f'{plan["tenderId"]}.pdf'
output=root/f'{plan["tenderId"]}.pdf'
doc=fitz.open(raw)
assert len(doc)==len(plan['slides'])<=15
width,height=297/25.4*72,210/25.4*72
for page in doc:
    # Chromium uses integer-pixel viewports; trim less than 0.3 mm of empty edge.
    assert abs(page.rect.width-width)<1 and abs(page.rect.height-height)<1
    page.set_mediabox(fitz.Rect(0,0,width,height))
doc.set_metadata({'title':'Berel · Resumen para el directorio · Agosto 2026','author':'Efeonce','subject':'Resultados SEO/AEO, desempeño del equipo y prioridades de seguimiento.','keywords':'Berel, agosto 2026, directorio, SEO, AEO'})
doc.set_language('es-MX')
doc.set_toc([[1,s['slots'].get('title','Efeonce · Contacto').replace('\n',' '),i+1] for i,s in enumerate(plan['slides'])])
doc.save(output,garbage=4,deflate=True);doc.close()
def norm(value):return re.sub(r'\s+','',value).replace('−','-')
checks=[]
with fitz.open(output) as doc:
    for i,(page,slide) in enumerate(zip(doc,plan['slides']),1):
        text=norm(page.get_text())
        strings=[]
        for name,value in slide['slots'].items():
            if isinstance(value,str):strings.append(value)
            elif isinstance(value,list):
                for record in value:
                    strings.extend(v for k,v in record.items() if k!='amount' and isinstance(v,str) and v)
        missing=[s for s in strings if norm(s) not in text]
        official_close=slide['template']=='BackCoverFullA4'
        contacts=['Dr. Manuel Barros Borgoño 71 OF 1105, Providencia, Chile','+56 9 3732 3064','+1 (239) 235-2073']
        entry={'page':i,'all_slot_text_present':not missing,'missing':missing,'A4_landscape':abs(page.rect.width-width)<.01 and abs(page.rect.height-height)<.01,'contact_policy_correct':all((norm(x) in text)==official_close for x in contacts),'brand_images':len(page.get_image_info()),'vector_paths':len(page.get_drawings()),'url_bubble_link':any(x.get('uri')=='https://efeoncepro.com/' for x in page.get_links())}
        assert entry['all_slot_text_present'] and entry['A4_landscape'] and entry['contact_policy_correct'] and (official_close or entry['brand_images']>=2) and entry['vector_paths']>=8 and entry['url_bubble_link'],entry
        checks.append(entry)
        (root/'preview').mkdir(exist_ok=True)
        page.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(root/'preview'/f'{i:02}.png')
    fonts={f[0] for p in doc for f in p.get_fonts()}
    assert all(doc.extract_font(x)[3] for x in fonts)
    alltext=''.join(p.get_text() for p in doc)
    assert 'manufactura' not in alltext.lower()
qa={'pages':len(checks),'all_checks_passed':True,'checks':checks,'embedded_fonts':len(fonts),'pdf_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'accessibility':'Text, metadata, links and bookmarks checked; no PDF/UA conformity claim.'}
(root/'qa.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pdf':str(output),'pages':len(checks),'verified':True}))
