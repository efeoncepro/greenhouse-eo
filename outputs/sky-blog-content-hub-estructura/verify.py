import json,sys,re
d=json.loads(open(sys.argv[1]).read())
if isinstance(d,list): d=json.loads(d[0]['text'])
t=d['text']; c=t[t.find('<content>')+9:t.find('</content>')]
L=c.split('\n'); dep=0; top=[]; outside=[]; lit=[]
for i,l in enumerate(L):
    if l.startswith('<toggle'):
        if dep==0: top.append(L[i+1][:50])
        dep+=1; continue
    if l.startswith('</toggle>'): dep-=1; continue
    if dep==0 and l.strip(): outside.append(l[:40])
    if '&lt;toggle' in l or '&lt;/toggle' in l or '\\<toggle' in l: lit.append(i)
h2=[L[i+1][:30] for i,l in enumerate(L) if l.startswith('<toggle heading="h2"')]
print(d['title'][:50],'| balance',dep,'| top',len(top),top,'| h2',h2,'| fuera',outside,'| literales',lit, '| json-toggle', '<b>JSON-LD para Dev</b>' in c, '| chars',len(c))
