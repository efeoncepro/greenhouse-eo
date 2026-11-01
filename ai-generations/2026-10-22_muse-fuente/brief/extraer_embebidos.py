import re,base64,sys,os,hashlib
src,out=sys.argv[1],sys.argv[2]
s=open(src,'r',errors='ignore').read()
n=0
for m in re.finditer(r'data:image/(png|gif|svg\+xml|webp|jpeg);base64,([A-Za-z0-9+/=]+)',s):
    ext=m.group(1).replace('svg+xml','svg'); b=base64.b64decode(m.group(2)+'==')
    if len(b)<4000: continue
    h=hashlib.sha1(b).hexdigest()[:8]; open(os.path.join(out,f'emb-{n:03d}-{h}.{ext}'),'wb').write(b); n+=1
print(n)
for k in ['webm','mp4','webp','riv','lottie','hatch_avatar','mascot','Hatch']:
    print(k,len(re.findall(k,s)))
print(sorted(set(re.findall(r'[\w\-/\.]*[Hh]atch[\w\-]*\.(?:mp4|png|webp|jpg|json|riv|webm)',s)))[:50])
