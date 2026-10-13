"""Read back all three client PDFs and their shared commercial/research sources."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
R=Path(__file__).resolve().parents[1]; C=R.parent
out=Path(sys.argv[1]); checks=[]; pdfs=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)})
 if not ok: raise AssertionError(name)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
for name,source in [('Pibank-Propuesta-tecnica-2027','PROPUESTA-PARA-PIBANK-2027.md'),('Pibank-Resumen-para-gerencia-2027','RESUMEN-PARA-GERENCIA.md'),('Pibank-Oferta-hibrida-2027','oferta-hibrida/OFERTA-PARA-PIBANK.md')]:
 p=out/(name+'.pdf'); t=subprocess.check_output(['pdftotext','-raw',str(p),'-']).decode(); t=re.sub(r'\s+',' ',t)
 check(name+': shared revision', 'híbrida conciliada' in t)
 check(name+': proposed prices', all(v in t for v in ['79.200','89.200','4.500']))
 check(name+': funded goal', '15.200 cuentas con fondos' in t)
 check(name+': AEO and production',all(v in t for v in ['72','144','cinco artículos']))
 check(name+': no stale scope or internal instructions', not re.search(r'Recomendación para presentar|Alcance vigente de autoridad|Capacidad editorial vigente|24 FAQ|36 observaciones|sesiones digitales|US\$8\.000|margen bruto|costeo interno|para Claude',t,re.I))
 q=json.loads((R/'render-metadata'/(name+'-qa.json')).read_text())
 check(name+': rendering',q['fontsOk'] and not q['overflow'] and not q['brokenImages'])
 if 'Oferta' not in name:
  check(name+': restored dated diagnosis',all(v in t for v in ['17 capturas','canonical','2 backlinks','Yoast','Core Web Vitals']))
  check(name+': remaining business deliverables', 'lanzamiento' in t and 'parcial' in t and 'aperturas' in t)
 pdfs.append({'name':name,'pages':q['pages'],'sha256':sha(p),'source':source,'source_sha256':sha(R/source),'qa':q})
r=json.loads((R/'oferta-hibrida/resultados.json').read_text())
for x in r['source_hashes']:check('preserved research/model: '+x['path'],sha(C/x['path'])==x['sha256'])
for x in r['plans']:check('price matches model: '+x['plan'],x['total_planned_usd']=={'base':54000,'gradual':79200,'integral':89200}[x['plan']])
result={'pass':True,'checks':checks,'pdfs':pdfs,'visual_review':'separate_manual_review_required','bank_data_validated':False,'sent':False}
(out/'package-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pass':True,'checks':len(checks),'pages':sum(p['pages'] for p in pdfs)}))
