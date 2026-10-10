# Convierte un .dc.html en HTML estático local (blobs -> archivos) para revisar la lámina fuera del canvas.
import sys,re,os,json
S=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M=json.load(open(os.path.join(S,'work','blobmap.json')))
src,out=sys.argv[1],sys.argv[2]
s=open(src).read()
head=re.search(r'<helmet>(.*?)</helmet>',s,re.S).group(1)
body=s[s.index('</helmet>')+9:s.index('</x-dc>')]
def rep(m):
    p=M.get(m.group(1))
    return 'file://'+os.path.join(S,p) if p else 'data:,'
body=re.sub(r'/_blob/([0-9a-f]{32})',rep,body)
miss=sorted(set(re.findall(r'/_blob/([0-9a-f]{32})',s))-set(M))
open(out,'w').write('<!doctype html><html><head><meta charset="utf-8">'+head+'</head><body>'+body+'</body></html>')
print('ok',out,'missing blobs:',miss)
