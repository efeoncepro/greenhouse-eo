from pathlib import Path
import json,subprocess,hashlib,tempfile,copy
repo=Path.cwd();r=repo/'ai-generations/2026-09-22_aeo-compositor-audit';r.mkdir(exist_ok=True)
source=repo/'ai-generations/2026-09-22_aeo-final-safe-v06';plans=json.loads((source/'piezas.json').read_text())
chosen=[copy.deepcopy(p) for p in plans if p['id'] in ['01-fuera-916','02-reconoces-916','03-referencia-916','04-elegida-169']]
for p in chosen:
 p['plate']=str(source/p['plate'])
 p['logo']={'width':.2,'x':.5,'y':.82 if p['id'].endswith('916') else .9,'variant':'color' if p['id'].startswith('03') else 'negative'}
(r/'piezas.json').write_text(json.dumps(chosen,ensure_ascii=False,indent=2)+'\n')
for cmd,name in [(['node','scripts/foto/componer-cta.mjs',str(r/'piezas.json')],'render'),(['node','scripts/foto/componer-cta.gate.mjs',str(r/'piezas.json')],'gate')]:
 p=subprocess.run(cmd,capture_output=True,text=True);(r/(name+'.log')).write_text(p.stdout+p.stderr);print(name,p.returncode)
# Exercise gate coverage without generating assets or changing source.
base={'id':'expected','cta':{'variant':'solid','descriptor':'SEO + AEO'}}
valid={'id':'expected','contraste':{'cta':5.043,'descriptor':10,'cta_superficie_vs_escena':5}}
fixtures={'valid':[valid],'missing-cta':[{'id':'expected','contraste':{'descriptor':10,'cta_superficie_vs_escena':5}}],'empty-qa':[],'wrong-id':[dict(valid,id='other')],'missing-descriptor':[{'id':'expected','contraste':{'cta':5.043,'cta_superficie_vs_escena':5}}],'duplicate-id':[valid,valid]}
results=[]
with tempfile.TemporaryDirectory(prefix='cta-gate-audit-') as tmp:
 d=Path(tmp);(d/'out').mkdir();(d/'plan.json').write_text(json.dumps([base]))
 for name,qa in fixtures.items():
  (d/'out/qa.json').write_text(json.dumps(qa));p=subprocess.run(['node',str(repo/'scripts/foto/componer-cta.gate.mjs'),str(d/'plan.json')],capture_output=True,text=True)
  results.append({'fixture':name,'exitCode':p.returncode,'output':(p.stdout+p.stderr).strip()})
report={'asOf':'2026-09-22','revision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'sourceHashes':{x:hashlib.sha256((repo/x).read_bytes()).hexdigest() for x in ['scripts/foto/componer-cta.mjs','scripts/foto/componer-cta.gate.mjs']},'scope':'Audit only. No canonical code or final exports changed.','gateFixtures':results}
(r/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(results,ensure_ascii=False))
