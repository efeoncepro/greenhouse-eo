from pathlib import Path
import re,json,shutil,hashlib
repo=Path('/Users/jreye/Documents/greenhouse-eo')
v=Path('/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/15. Paid Media/02. Pilotos/2026-09-22_SEO-AEO_fuente-preferida/v02-Codex-voces-y-cursores')
d=v/'91. Compositor editable';d.mkdir(exist_ok=True)
entry=['scripts/foto/componer.mjs','ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer.mjs']
seen=set()
def snap(rel):
 if rel in seen:return
 seen.add(rel);p=repo/rel;target=d/'fuentes'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
 for imp in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]",p.read_text()):
  if imp.startswith('.'):
   q=(p.parent/imp).resolve()
   if q.is_file():snap(str(q.relative_to(repo)))
for rel in entry:snap(rel)
fonts=['src/assets/fonts/BricolageGrotesque-Variable.ttf','src/assets/fonts/Poppins-Regular.ttf','src/assets/fonts/Poppins-Medium.ttf','src/assets/fonts/Poppins-SemiBold.ttf','src/assets/fonts/Poppins-Bold.ttf','public/branding/logo-full.svg','public/branding/logo-negative.svg']
manifest={'repo':str(repo),'source_hashes':{x:hashlib.sha256((repo/x).read_bytes()).hexdigest() for x in sorted(seen)},'asset_hashes':{x:hashlib.sha256((repo/x).read_bytes()).hexdigest() for x in fonts},'guttery':{'path':str(Path.home()/'Library/Fonts/Guttery.otf'),'sha256':hashlib.sha256((Path.home()/'Library/Fonts/Guttery.otf').read_bytes()).hexdigest(),'bundled':False},'packages':{k:v for k,v in json.loads((repo/'package.json').read_text())['dependencies'].items() if k in ['sharp','fontkit','@efeoncepro/axis-tokens','@efeoncepro/axis-ui-contracts']}}
(d/'dependencias.json').write_text(json.dumps(manifest,indent=2))
(d/'recomponer.cjs').write_text('''const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const args=process.argv.slice(2),arg=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null};
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'dependencias.json')));
const repo=arg('--repo')||manifest.repo,out=arg('--out'),id=arg('--id');
if(!out||!path.isAbsolute(out))throw Error('Indica --out con carpeta absoluta NUEVA. Opcional --id y --repo.');
if(fs.existsSync(out))throw Error('La carpeta de salida ya existe. Usa otra para preservar versiones.');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [p,h]of Object.entries({...manifest.source_hashes,...manifest.asset_hashes}))if(hash(path.join(repo,p))!==h)throw Error('Dependencia cambió: '+p+'. Revisar el snapshot antes de actualizar manifest.');
if(hash(manifest.guttery.path)!==manifest.guttery.sha256)throw Error('Guttery difiere de la fuente usada.');
const version=path.dirname(__dirname),pieces=[];
for(const concept of fs.readdirSync(version).filter(x=>/^0[1-4]-/.test(x)))for(const fmt of ['9x16','16x9']){
 const dir=path.join(version,concept,fmt),s=JSON.parse(fs.readFileSync(path.join(dir,'composicion.json')));
 if(id&&s.id!==id)continue;delete s.logo;delete s.signature_note;s.plate=path.join(dir,s.plate);pieces.push(s);
}
if(!pieces.length)throw Error('No hay piezas para ese id.');
fs.mkdirSync(out,{recursive:true});const plan=path.join(out,'piezas-texto.json');fs.writeFileSync(plan,JSON.stringify(pieces,null,2));
cp.execFileSync(process.execPath,[path.join(repo,'scripts/foto/componer.mjs'),plan],{cwd:repo,stdio:'inherit'});
const logs=[];
for(const s of pieces){const p=path.join(out,'out',s.id+'.png'),tmp=path.join(out,'out',s.id+'-sin-firma.png');fs.renameSync(p,tmp);
 logs.push(cp.execFileSync(process.execPath,[path.join(repo,'ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer.mjs'),tmp,p],{cwd:repo,encoding:'utf8'}));}
fs.writeFileSync(path.join(out,'qa-firma.txt'),logs.join(''));console.log('Recompuesto en '+out);
''')
(d/'LEEME.md').write_text('''# Texto editable y reproducción exacta

La fuente editable de cada imagen es su `composicion.json`, junto al plate sin texto. No editar el PNG ni regenerar la fotografía para cambiar palabras.

1. Duplica la versión completa para una propuesta nueva; conserva esta versión y las anteriores.
2. Modifica `composicion.json` dentro de concepto/formato: `lead`, `dominant`, `after`, `gesture`, `selection`, tamaños, anchos y espaciados. `[[…]]` = acento; `**…**` = peso; `|` = salto.
3. Ejecuta desde Terminal, pasando una carpeta de salida nueva:

```bash
node "/ruta/a/la/version/91. Compositor editable/recomponer.cjs" --out "/ruta/absoluta/a/salida-nueva"
# Una sola pieza: agrega --id 02-reconoces-916
# Otra ubicación del repo: agrega --repo /ruta/a/greenhouse-eo
```

El runner usa los compositores canónicos, comprueba sus hashes y los de fonts/logos antes de ejecutar, y conserva el render sin firma además del PNG compuesto. Fuentes de los compositores y módulos locales importados en `fuentes/`; versiones de paquetes y rutas/hashes de fuentes en `dependencias.json`. No es un compositor nuevo ni redibuja recursos AXIS. Requiere Node y dependencias instaladas del repo.

Guttery es fuente licenciada instalada en esta Mac; no se redistribuye. Bricolage/Poppins provienen de los archivos reales del repo. Si cambia una dependencia, el runner se detiene para no declarar idéntica una reproducción distinta: comparar con el snapshot y documentar la nueva versión.

La maqueta es programática, no PSD/AI/Figma. Todos los parámetros de texto y selección están editables en JSON. Los manifiestos AXIS por pieza están en `evidencia-grafica.json`. Los scripts antiguos de `90. Reproduccion` son registro histórico; este runner resuelve rutas de los plates de OneDrive y es la entrada recomendada.
''')
print(str(d))
