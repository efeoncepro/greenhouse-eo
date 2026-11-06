"""Genera operaciones update_content que envuelven una ficha del Content Hub en toggles h1 (modelo Punta Sal).
Uso: python3 genops.py <archivo-fetch|pid.md> -> imprime JSON de content_updates; diagnóstico a stderr."""
import json,sys,re
def load(f):
    s=open(f).read()
    if f.endswith('.md'): return s,None
    d=json.loads(s)
    if isinstance(d,list): d=json.loads(d[0]['text'])
    t=d['text']; return t[t.find('<content>')+9:t.find('</content>')],d
c,d=load(sys.argv[1])
err=lambda *a: print(*a,file=sys.stderr)
lines=c.split('\n')
# offsets de inicio de cada línea
off=[0]
for l in lines: off.append(off[-1]+len(l)+1)
def top_level_index():
    depth=0; res=[]
    for i,l in enumerate(lines):
        res.append(depth)
        if l.startswith('<toggle') or l.startswith('<callout') : depth+=1
        if l.startswith('</toggle>') or l.startswith('</callout>'): depth-=1
    return res
dep=top_level_index()
def find_line(pred,start=0,last=False):
    hits=[i for i in range(start,len(lines)) if dep[i]==0 and pred(lines[i])]
    if not hits: return None
    return hits[-1] if last else hits[0]
def uniq(s): return c.count(s)==1
def boundary(i,title):
    """Cierra el toggle anterior y abre uno nuevo en la línea i."""
    j=i-1
    while j>=0 and lines[j].strip() in ('','---'): j-=1
    keep_head = title is None
    endl = i+1 if keep_head else i   # incluye la línea de título del toggle si se conserva
    for m in range(0,6):
        start=off[j-m]
        old=c[start:off[endl]+len(lines[endl])]
        if uniq(old): break
    else: raise SystemExit(f'no único en línea {i}')
    pre=c[start:off[j]+len(lines[j])]
    if keep_head: new=pre+'\n</toggle>\n\n'+NEWOPEN+'\n\n'+c[off[i]:off[endl]+len(lines[endl])]
    else: new=pre+'\n</toggle>\n\n<toggle heading="h1">\n'+title
    return {'old_str':old,'new_str':new}
R=find_line(lambda l:l.startswith('## 🔎 Research SEO/AEO'))
A=find_line(lambda l:l.startswith('# ✍️ Artículo'))
F=find_line(lambda l:l.startswith('## Fuentes (uso interno)'),start=A or 0,last=True)
P=find_line(lambda l:l.startswith('<toggle'),start=F or 0)
FS=find_line(lambda l:l.startswith('## Ficha SEO y metadatos'),start=A or 0)
err('R',R,'A',A,'F',F,'P',P,'FS',FS,'lines',len(lines))
assert None not in (R,A,F,P,FS), 'falta marcador'
assert R<A<FS<F<P
kind='N' if lines[0:3] and any(l.startswith('## Tema y enfoque') for l in lines[:3]) else 'O'
ops=[]
CAL='<callout icon="🧭" color="blue_bg">\n<b>Cómo leer esta página:</b> cada sección se abre con el triángulo de la izquierda. La 3 es el artículo; las demás son material interno (research, fuentes, producción).\n</callout>\n\n<table-of-contents />\n\n'
if kind=='O':
    CAL=CAL.replace('La 3 es el artículo; las demás son material interno (research, fuentes, producción).','La 3 es el artículo vigente. La 1 guarda el encuadre y la versión anterior solo como referencia; las demás son material interno (research, fuentes, producción).')
first=next(i for i,l in enumerate(lines) if l.strip())
if kind=='N':
    assert lines[first].startswith('## Tema y enfoque')
    nxt=next(i for i in range(first+1,len(lines)) if lines[i].strip())
    old=c[off[first]:off[nxt]]+lines[nxt][:40]
    new=CAL+'<toggle heading="h1">\n📋 Brief del encargo'+c[off[first]+len(lines[first]):off[nxt]]+lines[nxt][:40]
else:
    for n in (60,120,300):
        old=c[off[first]:off[first]+n]
        if uniq(old): break
    new=CAL+'<toggle heading="h1">\n🗄️ Encuadre y versión anterior · solo referencia\n\n'+old
assert uniq(old); ops.append({'old_str':old,'new_str':new})
ops.append(boundary(R,'🔎 Research SEO/AEO · 05-11-2026 · uso interno'))
ops.append(boundary(A,lines[A][2:]))
# Ficha SEO -> toggle h2
old=lines[FS]+'\n\n'+lines[FS+2][:40]; assert uniq(old)
ops.append({'old_str':old,'new_str':'<toggle heading="h2">\nFicha SEO y metadatos\n\n'+lines[FS+2][:40]})
# cierre de la ficha y JSON-LD
k=FS+1
if lines[FS+2].startswith('<table'):
    k=next(i for i in range(FS+2,len(lines)) if lines[i].startswith('</table>'))+1
while not (dep[k]==0 and lines[k].strip() and not lines[k].startswith('|')) and k<F: k+=1
# k = primera línea de nivel superior que no es tabla tras la ficha (ignorando blancos)
j=k-1
while not lines[j].strip(): j-=1
if lines[k].startswith('```json'):
    e=k+1
    while not lines[e].startswith('```'): e+=1
    for n in (40,80,200):
        old=lines[j][-n:]+'\n\n'+lines[k]
        if uniq(old): break
    assert uniq(old)
    ops.append({'old_str':old,'new_str':lines[j][-n:]+'\n</toggle>\n\n<toggle color="gray_bg">\n<b>JSON-LD para Dev</b> · Article + FAQPage + BreadcrumbList\n\n'+lines[k]})
    nx=next(i for i in range(e+1,len(lines)) if lines[i].strip())
    for n in (3,8,20):
        old='\n'.join(lines[e-n:e+1])+c[off[e+1]-1:off[nx]]+lines[nx][:40]
        if uniq(old): break
    assert uniq(old)
    ops.append({'old_str':old,'new_str':'\n'.join(lines[e-n:e+1])+'\n</toggle>\n\n'+lines[nx][:40]})
else:
    err('SIN JSON tras la ficha; cierro antes de',lines[k][:50])
    for n in (40,80,200):
        old=lines[j][-n:]+c[off[j+1]-1:off[k]]+lines[k][:40]
        if uniq(old): break
    ops.append({'old_str':old,'new_str':lines[j][-n:]+'\n</toggle>\n\n'+lines[k][:40]})
ops.append(boundary(F,'🗂️ Fuentes y hallazgos · uso interno'))
NEWOPEN='<toggle heading="h1">\n🧪 Producción y cambios'
ops.append(boundary(P,None))
# cierre final
last=max(i for i,l in enumerate(lines) if l.strip())
for m in range(1,8):
    tailtxt=c[off[last-m]:off[last]+len(lines[last])]
    if len(tailtxt)>200: tailtxt=tailtxt[-200:]
    if uniq(tailtxt): break
assert uniq(tailtxt)
ops.append({'old_str':tailtxt,'new_str':tailtxt+'\n</toggle>'})
# qué queda después de P a nivel superior (debería ser solo toggles)
extra=[lines[i][:60] for i in range(P,len(lines)) if dep[i]==0 and lines[i].strip() and not lines[i].startswith(('<toggle','</toggle'))]
if extra: err('OJO contenido suelto tras toggles:',extra)
err('kind',kind,'ops',len(ops))
print(json.dumps(ops,ensure_ascii=False))
