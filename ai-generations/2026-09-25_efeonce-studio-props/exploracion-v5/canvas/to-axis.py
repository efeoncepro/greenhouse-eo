# Exporta los elementos nativos del canvas a la página de AXIS (datos + assets en WebP).
import json,re,os,shutil,subprocess
src=open('shoot.mjs').read()
mp=dict(re.findall(r"'(/_blob/[0-9a-f]+)':'([^']+)'",src.split('const map=')[1].split('};')[0]))
exp=json.load(open('canvas/export-elements.json'));cj=json.load(open('canvas/project/canvas.json'))
LAB=os.path.expanduser('~/Documents/axis-design-system/apps/lab');A=LAB+'/public/media/graphic-line/assets'
shutil.rmtree(A);os.makedirs(A)
used={}
vid={'/_blob/7043b207bc1ab1073e642e7ddc1e7605':'/media/graphic-line/cierre-16x9.mp4','/_blob/5148e31a14a14537112a4863b05d0a0c':'/media/graphic-line/cierre-1x1.mp4'}
def fix(t):
    def r(m):
        b=m.group(0)
        if b in vid: return vid[b]
        f=mp[b];n=os.path.basename(f);ext=n.rsplit('.',1)[1].lower()
        out=n.rsplit('.',1)[0]+'.webp' if ext in('png','jpg','jpeg') else n
        used[out]=('canvas/'+f,ext);return '/media/graphic-line/assets/'+out
    return re.sub(r'/_blob/[0-9a-f]{32}',r,t)
out=[]
for f in cj['order']:
    if f=='00-indice.dc.html' or f not in exp: continue
    t=cj['boards'][f]['title'];items=[]
    for it in exp[f]:
        it=dict(it)
        for k in ('html','src','poster','body'):
            if isinstance(it.get(k),str): it[k]=fix(it[k])
        items.append(it)
    out.append({'file':f,'code':t.split(' · ')[0],'title':t,'items':items})
for n,(path,ext) in used.items():
    if ext in('png','jpg','jpeg'): subprocess.run(['node','-e',f"require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')('{path}').resize({{width:1600,withoutEnlargement:true}}).webp({{quality:82}}).toFile('{A}/{n}')"],check=True)
    else: shutil.copy(path,A+'/'+n)
json.dump(out,open(LAB+'/src/data/graphic-line-elements.json','w'),ensure_ascii=False)
print(len(out),'láminas',len(used),'assets')
