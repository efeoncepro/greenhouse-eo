from pathlib import Path
import json,shutil,hashlib,os
repo=Path('/Users/jreye/Documents/greenhouse-eo'); src=repo/'ai-generations/2026-09-22_aeo-fuente-preferida'
root=Path('/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/15. Paid Media')
dst=root/'02. Pilotos/2026-09-22_SEO-AEO_fuente-preferida/v01-Codex'
res=root/'01. Recursos/2026-09-22_SEO-AEO_kit-referencias'
assert not dst.exists(), 'Version already exists; preserve it and choose a new version'
dst.mkdir(parents=True);res.mkdir(parents=True,exist_ok=True)
def cp(a,b):
 b.parent.mkdir(parents=True,exist_ok=True)
 if b.exists():assert hashlib.sha256(a.read_bytes()).digest()==hashlib.sha256(b.read_bytes()).digest();return
 shutil.copy2(a,b)
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
jobs=json.loads((src/'brief/jobs.json').read_text()); versions=json.loads((src/'brief/all-versions.json').read_text()); plan={x['id']:x for x in json.loads((src/'piezas.json').read_text())}
refs={}
for j in jobs:
 for r in j['refs']:
  target=res/'referencias'/Path(r).name;cp(repo/r,target);refs[r]=target
for f in ['public/branding/logo-full.svg','public/branding/logo-negative.svg']:
 cp(repo/f,res/'firma'/Path(f).name)
write(res/'LEEME.md','# Kit de referencias SEO + AEO\n\nInsumos reutilizables usados por Codex el 2026-09-22. No son anuncios aprobados. Originales canónicos en las rutas registradas abajo; estas copias fijan las referencias de la tanda. Derechos de pauta de mascotas de partner pendientes según LEEME de Paid Media.\n\n'+'\n'.join(f'- `{r}` → `referencias/{p.name}`' for r,p in refs.items()))
concepts={'01-fuera':('¿Sales tú?','Exclusión de la respuesta','Codex junto a una respuesta con dos fuentes y un espacio ausente. La pregunta del titular convierte el vacío en relevancia personal.','ausencia','Conservar escena valorada; evaluar si el vacío se entiende a tamaño móvil.'),'02-reconoces':('¿Te reconoces?','Representación incorrecta','Contraste ilustrativo entre torre en web y bodega en respuesta de IA. No corresponde a un diagnóstico real.','luz-motivada; v1 usó reflejo','No recuperar v1: dedos/gesto defectuosos y tablet presentada a cámara. v2 sostiene tablet con ambas manos, pantalla hacia Nexa y mirada a ella.'),'03-referencia':('Sé la referencia.','Fuente preferida','Proyección monumental de respuesta con tarjeta de fuente destacada. Aspiración, sin garantía de ranking.','proyeccion','v1 invade reserva vertical y contiene logo ajeno; v2 cambia reserva/lecho pero falla contraste de firma a 93.5%; v3 aclara mesa. Conserva tablet secundaria: desviación del registro de proyección sin pantallas, documentada para revisión.'),'04-elegida':('Que te elijan.','Elección de fuente','Dedo a punto de tocar fuente destacada; tensión del instante anterior al clic.','instrumento en ficha original (clasificación incorrecta; corresponde revisar como manos)','No interpretar interfaz como captura real. Instrumento exige mirar a través: revisar clasificación sin reescribir prompt histórico.')}
extra='\nSTRICT FINAL CHECK: no OpenAI knot logo, no third-party symbols, no logos on the digital interface. Use only a plain neutral circular avatar. No books, no pen jars, no plants. The left 42% is entirely dark actual plaster without any window or illuminated strip, for white copy. Make the visual subject dramatically large within the right zone. Avoid timid wide shots.'
manifest=[]
for j in jobs:
 id=j['id'];key=id.rsplit('-',1)[0];fmt='9x16' if id.endswith('916') else '16x9';folder=dst/key/fmt
 vv=sorted([v for v in versions if v['id']==id],key=lambda x:x['version']);latest=vv[-1]['version']; chain=[]
 for v in vv:
  n=v['version'];suffix='' if n==1 else f'-v{n}';name=f'v{n:02d}'
  cp(Path(v['path']),folder/'historial'/f'{name}-plate.png')
  prompt=(src/f'brief/{id}{suffix}.prompt.txt').read_text()+(extra if n==1 and fmt=='16x9' else '')
  write(folder/'prompts'/f'{name}-prompt-exacto.txt',prompt)
  cp(src/f'brief/{id}{suffix}.json',folder/'prompts'/f'{name}-ficha.json')
  references=[os.path.relpath(refs[r],folder) for r in j['refs']] if n==1 else [f'historial/v{n-1:02d}-plate.png']
  chain.append({'version':name,'operation':'generate' if n==1 else 'edit','prompt':f'prompts/{name}-prompt-exacto.txt','references_in_order':references,'output':f'historial/{name}-plate.png','selected_for_current_pilot':n==latest})
 cp(src/f'plates/{id}.png',folder/'plate-actual.png');cp(src/f'out/{id}.png',folder/'propuesta-actual.png')
 cp(src/f'out/preview-390/{id}.png',folder/'preview-390.png')
 spec=plan[id].copy();spec['plate']='plate-actual.png';spec['signature_note']='Compose text without logo, then canonical documented signature compositor at 93.5% height, width20% shortest side.'
 write(folder/'composicion.json',json.dumps(spec,ensure_ascii=False,indent=2))
 title,territory,idea,lever,notes=concepts[key]
 metadata={'id':id,'status':'PILOTO_PENDIENTE_APROBACION','creator':'Codex','engine':'image_gen.imagegen (model/version/seed not exposed)','concept':title,'territory':territory,'mechanism':idea,'photographic_lever':lever,'current_plate_version':latest,'history':chain,'feedback_and_limits':notes,'approval':None}
 write(folder/'pieza.json',json.dumps(metadata,ensure_ascii=False,indent=2))
 write(folder/'CONCEPTO-Y-CONTINUIDAD.md',f'# {title} · {fmt}\n\n**PILOTO. No aprobado para pauta.**\n\nTerritorio: {territory}.\n\n{idea}\n\nPalanca: {lever}.\n\n## Estado y correcciones\n\n{notes}\n\n## Continuar con Claude o Codex\n\n1. Abre propuesta-actual.png y plate-actual.png.\n2. Lee pieza.json: contiene la cadena exacta de generación/ediciones, prompts y referencias en orden.\n3. Para una corrección conserva el plate actual como referencia; editar conserva mejor la identidad que regenerar.\n4. Para regenerar desde origen usa v01 y su kit. Las ediciones v02/v03 dependen del plate anterior; no son prompts autónomos.\n5. Separa foto sin texto de tipografía/firma, con composicion.json. Lee primero el canon vigente, no copies errores históricos.\n6. Nueva propuesta en una nueva versión con autor, prompt íntegro, referencias, feedback y estado. No sobrescribas esta tanda. Sólo el operador autoriza promoción a 03. Finales.\n\nLos mismos prompts no garantizan píxeles idénticos. No hubo seed expuesta.\n')
 manifest.append({'id':id,'folder':str(folder.relative_to(dst)),'status':metadata['status'],'plate_version':latest})
for f in ['contacto-916.jpg','contacto-169.jpg','qa.json','qa-firma.txt']:cp(src/'out'/f,dst/'00. Revision'/f)
for f in ['piezas.json','piezas-texto.json','ENTREGA.md']:cp(src/f,dst/'90. Reproduccion'/f)
for f in (src/'brief').glob('*.mjs'):cp(f,dst/'90. Reproduccion/scripts-originales'/f.name)
# Snapshot of documentary canon, never substitute for current repository contract.
for f in ['.codex/skills/efeonce-advertising-creative/SKILL.md','.codex/skills/design-studio/SKILL.md','.codex/skills/design-studio/references/efeonce-photographic-language.md','docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md','docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_C_V1.md','docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md','docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md']:
 cp(repo/f,dst/'90. Reproduccion/canon-snapshot'/f)
write(dst/'INDICE.json',json.dumps(manifest,ensure_ascii=False,indent=2))
write(dst/'LEEME.md','# SEO + AEO — fuente preferida · Piloto v01 Codex\n\n**Estado: PILOTO. Sin aprobación para finales ni publicación.**\n\n## Acuerdo creativo\n\nCapítulo3: Lo que la IA dice de ti. Dos enfoques: riesgo de quedar fuera/ser mal representado y aspiración de ser la fuente preferida para el usuario dentro de la respuesta. No prometer primera posición ni resultados garantizados. Equilibrio digital/físico, impacto visual y acción coherente.\n\n## Navegación\n\n- 00. Revision: dos láminas comparativas y QA.\n- 01-fuera, 02-reconoces, 03-referencia, 04-elegida: cada concepto tiene 9x16 y16x9. Cada formato incluye propuesta, plate, preview, concepto, copy/composición, cadena de versiones y prompts íntegros.\n- 90. Reproduccion: snapshot de canon y scripts originales (requieren repo greenhouse-eo y sus dependencias; no ejecutar como scripts autónomos ni asumir que reconstruyen la selección actual).\n- Insumos reutilizables: ../../../01. Recursos/2026-09-22_SEO-AEO_kit-referencias. Las rutas concretas relativas están en cada pieza.json.\n\n## Feedback recibido\n\nEl operador valoró las demás imágenes, pero rechazó la orientación de la tableta y anatomía/gestos de Nexa en ¿Te reconoces?. Solicitó revisar lecho, registros, palancas y composición. Se conservaron versiones para no repetir fallos; v2 de02 sustituye ambas tomas, v3 de03 corrige tono del lecho. No convertir comentarios positivos en aprobación final.\n\n## Handoff entre agentes\n\nEmpieza por este archivo, INDICE.json y ficha de cada pieza. Crea la siguiente versión con autor; conserva archivos anteriores. Registra prompt realmente enviado (incluidos añadidos), referencias y orden, motor, imagen de entrada si editas, copy y composición, motivo de cambio, QA y aprobación explícita cuando exista. Los prompts horizontales v01 incluyen el añadido final recuperado de la llamada real. No contienen solo el prompt base.\n\n## QA y límites\n\nFirma oficial20% del lado corto y centro93.5%, contraste final mínimo7.74:1; texto medido en QA. No representa aprobación integral del lenguaje: notas de cada pieza conservan desviaciones de palanca y reservas. Pauta con mascotas de partners requiere validar sus guías conforme al LEEME raíz.\n\n## Reproducción\n\nOrigen local: ai-generations/2026-09-22_aeo-fuente-preferida. Para reproducir el gráfico desde repo, adaptar rutas de piezas-texto.json hacia los plates archivados, ejecutar scripts/foto/componer.mjs y luego el compositor de firma documentado ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer.mjs. No regenerar la foto para cambiar copy.\n')
checks={str(p.relative_to(dst)):hashlib.sha256(p.read_bytes()).hexdigest() for p in dst.rglob('*') if p.is_file()}
write(dst/'SHA256.json',json.dumps(checks,indent=2))
assert all(hashlib.sha256((dst/p).read_bytes()).hexdigest()==h for p,h in checks.items())
print(json.dumps({'pilot':str(dst),'resources':str(res),'pilot_files':len(checks)+1,'versions':len(versions),'proposals':len(manifest),'references':len(refs),'hashes_verified':True},ensure_ascii=False))
