"""Guarded one-shot publication with automatic rollback on critical HTTP/SEO failure."""
import json
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET

if sys.argv[1:] != ['--publish']:
    raise SystemExit('Explicit --publish required')
base=Path('ai-generations/2026-11-05_glitch-flash-images-2-6')
url='https://efeoncepro.com/glitch/glitch-flash-images-2-6/'
pre=json.loads((base/'prepublish-readback.json').read_text())
media=json.loads((base/'wp-media.json').read_text())

def remote(mode,snapshot=None):
    payload={'mode':mode,'contentSha256':pre['contentSha256'],'title':pre['title']}
    if snapshot: payload['snapshotOption']=snapshot
    p=base/f'{mode}-input.json';p.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    r=subprocess.run(['pnpm','-s','public-website:wpcli','--','--eval-file',
        'docs/public-site/glitch-flash-images-2-6/publish.php','--input-file',str(p),'--wp-user','12'],text=True,capture_output=True)
    (base/f'{mode}-command.log').write_text(r.stdout+'\n'+r.stderr)
    if r.returncode: raise RuntimeError('Governed '+mode+' command failed: '+r.stderr[-600:]+r.stdout[-600:])
    j=json.loads(r.stdout[r.stdout.find('{'):]);(base/'wp-publication.json').write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
    return j

def get(u):
    req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0','Referer':'https://efeoncepro.com/'})
    with urllib.request.urlopen(req,timeout=20) as r:
        return r.status,r.read().decode('utf-8'),dict(r.headers)

class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.meta={};self.canon=[];self.schemas=[];self.in_schema=False;self.buf='';self.h1=False;self.h1s=[];self.hbuf='';self.drops=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='meta': self.meta.setdefault(a.get('name') or a.get('property'),[]).append(a.get('content',''))
        if tag=='link' and a.get('rel')=='canonical': self.canon.append(a.get('href'))
        if tag=='script' and a.get('type')=='application/ld+json': self.in_schema=True;self.buf=''
        if tag=='h1': self.h1=True;self.hbuf=''
        if tag=='aside' and 'gh-glitch-drop' in a.get('class','').split():self.drops+=1
    def handle_data(self,data):
        if self.in_schema:self.buf+=data
        if self.h1:self.hbuf+=data
    def handle_endtag(self,tag):
        if tag=='script' and self.in_schema:
            self.schemas.append(json.loads(self.buf));self.in_schema=False
        if tag=='h1' and self.h1:self.h1s.append(' '.join(self.hbuf.split()));self.h1=False

published=remote('publish');print(json.dumps(published,ensure_ascii=False),flush=True)
try:
    status,html,headers=get(url)
    (base/'published-anonymous.html').write_text(html)
    p=Page();p.feed(html)
    nodes=[]
    for schema in p.schemas:
        nodes.extend(schema.get('@graph',[schema]) if isinstance(schema,dict) else schema)
    def has_type(n,t):return t in (n.get('@type') if isinstance(n.get('@type'),list) else [n.get('@type')])
    by_id={n.get('@id'):n for n in nodes if isinstance(n,dict) and n.get('@id')}
    articles=[n for n in nodes if has_type(n,'Article') or has_type(n,'BlogPosting')]
    person=[n for n in nodes if has_type(n,'Person') and n.get('name')=='Julio Reyes']
    def author_correct(n):
        a=n.get('author',{});items=a if isinstance(a,list) else [a]
        return any(isinstance(x,dict) and (x.get('name')=='Julio Reyes' or by_id.get(x.get('@id'),{}).get('name')=='Julio Reyes') for x in items)
    robots=','.join(p.meta.get('robots',[]))
    expected_cover=media['own-cover']['url']
    checks={'status200':status==200,'canonicalExact':p.canon==[url],
        'indexFollow':'noindex' not in robots and 'index' in robots and 'follow' in robots,
        'h1':p.h1s==[pre['title']],'fiveDrops':p.drops==5,
        'currentOwnSection':'Lo pusimos a prueba: dos escenas y dos correcciones' in html,
        'ownImagesPresent':all(media[k]['url'] in html for k in ['own-a','own-b','own-edit1','own-edit2']),
        'ogCover':p.meta.get('og:image')==[expected_cover],'ogArticle':p.meta.get('og:type')==['article'],
        'description':bool(p.meta.get('description',[''])[0]),'largeImageCard':p.meta.get('twitter:card')==['summary_large_image'],
        'schemaArticle':bool(articles),'schemaAuthor':bool(person) and any(author_correct(n) for n in articles),
        'schemaWebPage':any(has_type(n,'WebPage') for n in nodes),'schemaBreadcrumb':any(has_type(n,'BreadcrumbList') for n in nodes)}
    report={'url':url,'checks':checks,'robots':robots,'canonical':p.canon,'ogImage':p.meta.get('og:image'),
        'h1':p.h1s,'schemaTypes':[n.get('@type') for n in nodes],'headers':{k:v for k,v in headers.items() if k.lower() in ['x-kinsta-cache','cache-control','content-type']}}
    (base/'publication-critical-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    bad=[k for k,v in checks.items() if not v]
    if bad:raise RuntimeError('Critical checks failed: '+','.join(bad))
    # The second plain anonymous request must agree after the purge.
    status2,html2,_=get(url);q=Page();q.feed(html2)
    if status2!=200 or q.canon!=[url] or q.meta.get('og:image')!=[expected_cover] or q.drops!=5 or 'noindex' in ','.join(q.meta.get('robots',[])):
        raise RuntimeError('Second anonymous read disagrees')
    sitemap_status,xml,_=get('https://efeoncepro.com/post-sitemap.xml')
    root=ET.fromstring(xml);entries=[e for e in root if e.tag.endswith('url')]
    found=[{x.tag.split('}')[-1]:x.text for x in e}for e in entries if any(x.tag.endswith('loc') and x.text==url for x in e)]
    if sitemap_status!=200 or not found:raise RuntimeError('Canonical absent from post sitemap')
    report.update({'secondAnonymousRead':'pass','sitemap':found,'status':'published-and-critical-checks-pass'})
    (base/'publication-critical-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
except Exception as error:
    (base/'publication-failure.txt').write_text(str(error)+'\n')
    restored=remote('rollback',published['snapshotOption'])
    print(json.dumps({'criticalFailure':str(error),'rollback':restored},ensure_ascii=False,indent=2))
    raise SystemExit(2)
