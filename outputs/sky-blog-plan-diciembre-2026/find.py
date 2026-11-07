import csv, sys, unicodedata, re
def norm(s):
    s = unicodedata.normalize('NFKD', s.lower())
    return ''.join(c for c in s if not unicodedata.combining(c))
rows = list(csv.DictReader(open('/Users/jreye/Documents/greenhouse-eo/outputs/sky-blog-seo-audit-2026-10-23/SKY-clasificacion-1697-posts.csv', encoding='utf-8-sig')))
for q in sys.argv[1:]:
    terms = [norm(t) for t in q.split('+')]
    hits = []
    for r in rows:
        hay = norm(r['url'] + ' ' + r['titulo'])
        if all(t in hay for t in terms):
            hits.append(r)
    print(f'== {q}: {len(hits)}')
    for r in hits[:12]:
        print('   ', r['url'].replace('https://blog.skyairline.com',''), '|', r['titulo'][:90], '|', r.get('estado_live_2026-10-23',''), '| impr', r['gsc_impr_ago-sep26'])
