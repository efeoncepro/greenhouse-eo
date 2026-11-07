import csv, json, glob, os, re, collections, math, sys
R='/Users/jreye/Documents/greenhouse-eo/'
OUT=os.path.dirname(os.path.abspath(__file__))
A=R+'outputs/sky-blog-seo-audit-2026-10-23/'
V=R+'outputs/sky-blog-proyeccion-2026-11/valor/'
def slug_of(u):
    u=u.strip()
    u=re.sub(r'^https?://[^/]+','',u)
    u=re.sub(r'^/blog','',u)
    s=u.strip('/').split('/')
    return s[0] if s and s[0] else ''
def num(x):
    try: return float(x)
    except: return 0.0
# --- exclusions
excl={}
for f in glob.glob(R+'ai-generations/2026-11-05_sky-blog-lote/specs/*.json'):
    if 'MANIFEST' in f: continue
    d=json.load(open(f))
    for m in re.findall(r'/([a-z0-9-]+)/', d.get('slug','')):
        excl[m]='spec nov: '+os.path.basename(f)
lote=open(R+'docs/services/sky-blog-seo/caso-auditoria-2026-10/LOTE_INICIAL_PARA_APROBACION.md').read()
for line in lote.splitlines():
    mm=re.match(r'\|\s*(O\d+)\s*\|',line)
    if mm:
        for s in re.findall(r'`/([a-z0-9-]+)/`',line): excl.setdefault(s,'lote '+mm.group(1))
# extra from NOTAS_LOTES: cultura-lambayeque 301 -> museos-de-chiclayo
excl.setdefault('cultura-lambayeque','notas nov: 301 a museos-de-chiclayo')
excl.setdefault('mal-de-altura-en-cusco','spec nov alternativa mal-altura')
# --- cannibal groups
groups=[]
for g in csv.DictReader(open(A+'canibalizacion-top40.csv',encoding='utf-8-sig')):
    g['members']=[s.strip() for s in g['slugs'].split('|')]
    groups.append(g)
slug2group={}
for g in groups:
    for s in g['members']: slug2group[s]=g['grupo']
gby={g['grupo']:g for g in groups}
# --- coverage
cov={r['codigo']:r for r in csv.DictReader(open(A+'cobertura-rutas-vs-blog.csv',encoding='utf-8-sig'))}
# --- inventory
rows=list(csv.DictReader(open(A+'SKY-clasificacion-1697-posts.csv',encoding='utf-8-sig')))
inv={}
for r in rows:
    r['slug']=slug_of(r['url']); inv[r['slug']]=r
# --- country evidence 2025 (www) and 2026 (blog canonical detail)
c25=collections.defaultdict(collections.Counter); pos25=collections.defaultdict(lambda:[0,0.0]); val25=collections.Counter()
for x in csv.DictReader(open(V+'historia-www-blog-consultas-pagina-pais-mensual.csv')):
    s=slug_of(x['page'])
    c25[s][x['country']]+=int(x['clicks'])
for x in csv.DictReader(open(V+'historia-www-blog-paginas-mensual.csv')):
    s=slug_of(x['page']); i=num(x['impressions'])
    pos25[s][0]+=i; pos25[s][1]+=i*num(x['position'])
c26=collections.defaultdict(collections.Counter); val26=collections.Counter(); tot26=collections.Counter()
for m in ['08','09','10']:
    d=json.load(open(V+'canonical/valor-blog-2026-%s.json'%m))
    for p in d['pages']:
        s=slug_of(p['page']); val26[s]+=p['estimatedValueUsd'] or 0; tot26[s]+=p['totalClicks'] or 0
    for q in d['detail']:
        c26[slug_of(q['page'])][q['country']]+=q['clicks']
for m in ['07','08','09']:
    d=json.load(open(V+'canonical/valor-www-blog-2025-%s.json'%m))
    for p in d['pages']: val25[slug_of(p['page'])]+=p['estimatedValueUsd'] or 0
# --- topic & operation filters
REJ=[(r'cambi(ar|o)[-a-z]*-(vuelo|pasaje|el-pasaje)|cambiar-vuelo|cambiar-el-pasaje|cambiar-los-pasajes','rechazado: cambio de vuelo/pasaje'),
     (r'mascota|perro|gato|pet-','rechazado: mascotas'),
     (r'beb[eé]|bebes','rechazado: bebé'),
     (r'cancun|canc%c3%ban|playa-del-carmen|riviera-maya|tulum|isla-mujeres|holbox|cozumel','excluido: Cancún/Riviera Maya')]
def operation(r):
    ap=r['aeropuerto']
    if 'Cancún' in r['ciudad_cluster']: return 'NO (Cancún archivado)'
    if r['bloque_bajo_valor'].startswith('8'): return 'NO (destino sin ruta SKY)'
    if ap:
        for code in ap.split('/'):
            if code in cov: 
                op=cov[code]['operacion']
                return 'SKY' if op=='SKY' else 'DUDOSO ('+op+')'
        if ap=='AEP/EZE': return 'SKY'
        return 'DUDOSO (aeropuerto %s sin fila)'%ap
    if r['pais']=='(sin destino)': return 'n/a (servicio/tips)'
    return 'SKY? (sin aeropuerto)'
cand=[]
units={}
# build units: groups -> canonical; else single
for r in rows:
    s=r['slug']
    g=slug2group.get(s)
    key=gby[g]['canonica_sugerida'] if g else s
    units.setdefault(key,{'key':key,'group':g,'members':[]})['members'].append(r)
def sumf(ms,c): return sum(num(m[c]) for m in ms)
for key,u in units.items():
    ms=u['members']; g=u['group']
    canon=inv.get(key) or max(ms,key=lambda m:num(m['gsc_clics_nov-dic25'])+num(m['gsc_clics_ene-feb26']))
    reasons=[]
    allslugs=[m['slug'] for m in ms]
    if g: allslugs=list(dict.fromkeys(gby[g]['members']+allslugs))
    hit=[s for s in allslugs if s in excl]
    if hit: reasons.append('ya en noviembre: '+', '.join('%s(%s)'%(h,excl[h]) for h in hit))
    txt=' '.join(allslugs)+' '+' '.join(m['titulo'].lower() for m in ms)
    for pat,why in REJ:
        if re.search(pat,txt): reasons.append(why)
    t=canon['tipo']
    if t in ('empleo/escuela/corporativo','noticias (rutas/promos/empresa)','otro/demo'): reasons.append('tipo fuera de foco: '+t)
    if t=='vuelos/pasajes a destino': reasons.append('intención «vuelos a» (la ganan rutas skyairline.com)')
    if 'covid' in canon['flags']: reasons.append('covid')
    if g and ('Marca' in g or 'corporativas' in g or 'SKY Plus' in g or 'SKY App' in g): reasons.append('grupo marca/corporativo')
    op=operation(canon)
    if op.startswith('NO'): reasons.append('operación: '+op)
    m=dict(
      key=key, url='https://blog.skyairline.com/%s/'%key, group=g or '',
      unir=' | '.join(s for s in allslugs if s!=key),
      n_urls=len(allslugs),
      titulo=canon['titulo'], tipo=t, pais=canon['pais'], ciudad=canon['ciudad_cluster'], aeropuerto=canon['aeropuerto'],
      flags=canon['flags'], estado=';'.join(sorted(set(x['estado_live_2026-10-23'] for x in ms))), operacion=op,
      nd25=sumf(ms,'gsc_clics_nov-dic25'), ef26=sumf(ms,'gsc_clics_ene-feb26'), ma26=sumf(ms,'gsc_clics_mar-abr26'),
      as26=sumf(ms,'gsc_clics_ago-sep26'), impr=sumf(ms,'gsc_impr_ago-sep26'),
      ga_pre28=sumf(ms,'ga4_org_pre28_25ago-21sep25'), ga_nd25=sumf(ms,'ga4_org_nov-dic25'), ga_ef26=sumf(ms,'ga4_org_ene-feb26'), ga_as26=sumf(ms,'ga4_org_ago-sep26'),
      sd_pre=sumf(ms,'ga4_ses_dia_pre'), sd_now=sumf(ms,'ga4_ses_dia_ago-sep26'),
      val26=round(sum(val26[s] for s in allslugs),2), val25=round(sum(val25[s] for s in allslugs),2),
      accion=canon['accion_sugerida'], bloque=canon['bloque_bajo_valor'],
      excl='; '.join(reasons))
    cc=collections.Counter(); 
    for s in allslugs: cc.update(c25[s]); cc.update(c26[s])
    c25t=collections.Counter(); c26t=collections.Counter()
    for s in allslugs: c25t.update(c25[s]); c26t.update(c26[s])
    tot=sum(cc.values())
    m['lector_clics_base']=tot
    m['lector']=' / '.join('%s %d%%'%(k,round(100*v/tot)) for k,v in cc.most_common(3)) if tot else ''
    m['lector25']=' / '.join('%s %d'%(k,v) for k,v in c25t.most_common(3))
    m['lector26']=' / '.join('%s %d'%(k,v) for k,v in c26t.most_common(3))
    pi=sum(pos25[s][0] for s in allslugs); m['pos25']=round(sum(pos25[s][1] for s in allslugs)/pi,1) if pi else ''
    m['ctr_as26']=round(100*m['as26']/m['impr'],2) if m['impr'] else ''
    m['loss_ses']=round(max(0,m['sd_pre']-m['sd_now'])*61)
    m['season']=m['nd25']+m['ef26']
    m['season_ratio']=round((m['nd25']+m['ef26'])/(m['ma26']+m['as26']+1),2)
    cand.append(m)
ok=[c for c in cand if not c['excl']]
# percentile score
def pr(lst,f):
    vals=sorted(f(c) for c in lst)
    import bisect
    n=len(vals)
    return lambda c: bisect.bisect_right(vals,f(c))/n
P={k:pr(ok,f) for k,f in dict(season=lambda c:c['season'], ga=lambda c:c['ga_ef26'], loss=lambda c:c['loss_ses']+max(0,c['ga_pre28']*2-c['ga_as26']),
     latent=lambda c:c['impr']*max(0,0.03-(c['as26']/c['impr'] if c['impr'] else 0)), val=lambda c:c['val26'], sr=lambda c:min(c['season_ratio'],5)).items()}
for c in ok:
    sc=0.30*P['season'](c)+0.10*P['ga'](c)+0.20*P['loss'](c)+0.20*P['latent'](c)+0.10*P['val'](c)+0.10*P['sr'](c)
    bonus=0
    if c['pais']=='Perú': bonus+=0.05
    if 'alrededores' in c['flags']: bonus+=0.03
    if c['n_urls']>1: bonus+=0.03
    if c['operacion'].startswith('DUDOSO'): bonus-=0.05
    c['score']=round(sc+bonus,4)
for c in cand: c.setdefault('score','')
cols=['score','key','url','group','n_urls','unir','titulo','tipo','pais','ciudad','aeropuerto','operacion','flags','estado','nd25','ef26','ma26','as26','impr','ctr_as26','pos25','ga_pre28','ga_nd25','ga_ef26','ga_as26','sd_pre','sd_now','loss_ses','season','season_ratio','val26','val25','lector','lector25','lector26','lector_clics_base','accion','bloque','excl']
cand.sort(key=lambda c:(c['score']=='' , -(c['score'] or 0), -c['season']))
with open(OUT+'/candidatos-todos.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=cols,extrasaction='ignore'); w.writeheader(); [w.writerow(c) for c in cand]
json.dump(excl,open(OUT+'/exclusiones-noviembre.json','w'),indent=1,ensure_ascii=False)
print('units',len(cand),'ok',len(ok),'excl slugs',len(excl))
