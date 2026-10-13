from pathlib import Path
import zipfile,json
root=Path(__file__).resolve().parent
manifest=json.loads((root/'manifest.json').read_text())
assert len(manifest['runs'])==12
assert len([r for r in manifest['runs'] if r['alpha']])==12
with zipfile.ZipFile(root/'iconos-efeonce-PNG.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for folder in ['alpha/flare','alpha/seedream-smooth-clean','flare','seedream','seedream-smooth','references','prompts','flat/selected','receipts','receipts-smooth']:
  for p in sorted((root/folder).rglob('*')):
   if p.is_file():z.write(p,p.relative_to(root))
 for file in ['LEEME.md','selection.json','manifest.json','brief.json','tokens-snapshot.json','keycheck-provenance.json','flat/proposal.png','comparison.png','comparison-first-pass.png','transparencia-flare.png','transparencia-seedream-smooth-clean.png','comparacion-transparente.png','blue-spill-cleanup.json']:
  z.write(root/file,file)
 for p in sorted((root/'logs').glob('*volume-check.log')):z.write(p,p.relative_to(root))
with zipfile.ZipFile(root/'iconos-efeonce-PNG.zip') as z:
 assert z.testzip() is None
 assert len([n for n in z.namelist() if n.startswith('alpha/') and n.endswith('.png')])==8
 print(json.dumps({'zip':'iconos-efeonce-PNG.zip','files':len(z.namelist()),'bytes':(root/'iconos-efeonce-PNG.zip').stat().st_size,'alphaPngs':8,'integrity':'OK'}))
