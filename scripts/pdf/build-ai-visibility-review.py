import json, shutil, hashlib, subprocess, html
from pathlib import Path
root=Path(__file__).resolve().parents[2]
src=root/'.captures/task-1938'
dst=root/'docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita'
(dst/'proofs').mkdir(parents=True,exist_ok=True)
records=[]
for meta in sorted((src/'after').glob('*.qa.json')):
    data=json.loads(meta.read_text()); id=data['fixture']
    pdf=src/'after'/f'{id}.pdf'
    if data['outsidePage'] or data['outsideLinks'] or hashlib.sha256(pdf.read_bytes()).hexdigest() != data['pdfSha256']:
        raise RuntimeError(f'Invalid or stale PDF proof: {id}')
    records.append(data)
    for suffix in ['.pdf','.qa.json','.txt']:
        shutil.copy2(src/'after'/f'{id}{suffix}',dst/'proofs'/f'{id}{suffix}')
    for n in range(1,data['pages']+1):
        shutil.copy2(src/'after'/f'{id}-page-{n}.png',dst/'proofs'/f'{id}-page-{n}.png')
for name in ['baseline.pdf','baseline.metadata.json']:
    shutil.copy2(src/name,dst/name)
rows=[]
for locale in ['es','en','pt-BR']:
    variants=[('01-portada-no-cliente','prospect',1),('01-portada-cliente','client',1),('02-que-hacer','prospect',2),('03-por-que','prospect',3),('04-donde-estas','prospect',4),('05-mercado-y-fuentes','prospect',5),('06-contraportada-no-cliente','prospect',6),('06-contraportada-cliente','client',6)]
    for name,audience,n in variants:
        current=f'{locale}-{audience}'
        gray=f'{locale}-{name}-gray'
        subprocess.run(['pdftoppm','-f',str(n),'-l',str(n),'-singlefile','-gray','-png','-r','96',str(dst/'proofs'/f'{current}.pdf'),str(dst/'proofs'/gray)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        ref=f'../../visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita/paginas/{locale}-{name}.png'
        out=f'proofs/{current}-page-{n}.png'
        rows.append(f'<section><h2>{locale} · {name}</h2><div class="pair"><figure><img src="{ref}"><figcaption>Referencia aprobada · datos ilustrativos del canvas</figcaption></figure><figure><img src="{out}"><figcaption>PDF real · fixture sintético congelado</figcaption></figure></div><details><summary>Comparación en escala de grises</summary><div class="pair"><figure><img class="gray" src="{ref}"></figure><figure><img src="proofs/{gray}.png"></figure></div></details></section>')
(dst/'comparison.html').write_text('''<!doctype html><html lang="es"><meta charset="utf-8"><title>TASK-1938 · referencia y PDF exportado</title><style>body{font:16px system-ui;background:#eee;color:#17202a;margin:24px auto;max-width:1660px}header{padding:16px}h2{font-size:20px}section{margin:36px 0;padding:20px;background:white}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;height:auto;display:block}figcaption{padding:12px}.gray{filter:grayscale(1)}summary{cursor:pointer;padding:20px}@media print{section{break-after:page}details{display:none}}</style><header><h1>AI Visibility Report · prueba local</h1><p>24 hojas únicas, color y gris. Fixture sintético: no informe real de cliente. El contenido y los puntajes del fixture difieren de los valores ilustrativos del canvas. La referencia antecede al recorrido orbital aprobado posteriormente. Esta prueba no acredita despliegue ni envío.</p></header>'''+''.join(rows)+'</html>')
sourcefiles=list((root/'src/components/growth/ai-visibility/report-artifact/pdf').glob('*'))+[root/'src/lib/copy/ai-visibility-report-pdf.ts',root/'src/lib/growth/ai-visibility/report/pdf-presentation-context.ts',root/'public/branding/pdf/ai-visibility-assets.manifest.json']
manifest={'schema':'efeonce.ai-visibility-pdf-review.v1','task':'TASK-1938','synthetic':True,'localOnly':True,'exports':records,'sourceHashes':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sourcefiles if p.is_file()},'independentReview':'final_pdf_review: no material findings, 2026-10-03; es-null/zero 1.05pt optical overhang advisory'}
(dst/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'exports':len(records),'uniqueComparisons':len(rows),'bytesMin':min(r['bytes'] for r in records),'bytesMax':max(r['bytes'] for r in records),'directory':str(dst)}))
