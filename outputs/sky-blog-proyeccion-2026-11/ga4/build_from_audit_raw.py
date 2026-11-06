"""Construye blog_events_monthly_all_channels.csv y blog_link_clicks_by_domain_monthly.csv desde la captura GA4 de la auditoría (.captures/sky-blog-seo-audit-2026-10-23/data/raw,
capturada 2026-10-23, rango 2024-01-01..2026-10-21). No consulta GA4: sólo re-agrega JSON ya capturado.
Uso: python3 -I outputs/sky-blog-proyeccion-2026-11/ga4/build_from_audit_raw.py  (desde la raíz del repo)"""
import csv, json, os
from collections import defaultdict
ROOT = os.getcwd()
RAW = os.path.join(ROOT, '.captures/sky-blog-seo-audit-2026-10-23/data/raw')
OUT = os.path.join(ROOT, 'outputs/sky-blog-proyeccion-2026-11/ga4')
def rows(n): return json.load(open(os.path.join(RAW, n)))['result']['rows']
def cap(n): return json.load(open(os.path.join(RAW, n)))['capturedAt']
def ymfmt(ym): return f'{ym[:4]}-{ym[4:]}'
def write(name, header, data):
    with open(os.path.join(OUT, name), 'w', newline='') as fh:
        w = csv.writer(fh); w.writerow(header); w.writerows(data)
    print('wrote', name, len(data))
NOTE_OCT = '2026-10 = 1..21 only (partial)'

# Tablas 1-4 (tráfico) ahora salen de build_tables.py con consultas nuevas; aquí sólo eventos y clics de la captura de la auditoría.
# 5. Events fired on blog pages (all channels), monthly
ev = defaultdict(dict); names = set()
for r in rows('ga4-monthly-all-events.json'): ev[r['yearMonth']][r['eventName']] = r['eventCount']; names.add(r['eventName'])
order = sorted(names, key=lambda c: -sum(ev[m].get(c, 0) for m in ev))
write('blog_events_monthly_all_channels.csv', ['month', 'coverage'] + order,
      [[ymfmt(ym), 'partial_1-21' if ym == '202610' else 'full'] + [ev[ym].get(c, 0) for c in order] for ym in sorted(ev)])

# 6. click events on blog pages by linkDomain (enhanced-measurement outbound clicks), monthly, top domains
ld = defaultdict(lambda: defaultdict(int))
for r in rows('ga4-monthly-click-linkdomain.json'): ld[r['yearMonth']][(r['linkDomain'], r['outbound'])] += r['eventCount']
keys = ['skyairline.com', 'flights.skyairline.com', 'cda.skyairline.com', 'skyairline-21097480.hs-sites.com', 'skyairline.trabajando.cl']
data = []
for ym in sorted(ld):
    d = ld[ym]; allc = sum(d.values())
    data.append([ymfmt(ym), 'partial_1-21' if ym == '202610' else 'full'] + [sum(v for (k, o), v in d.items() if k == kk) for kk in keys] +
                [allc - sum(v for (k, o), v in d.items() if k in keys), allc, sum(v for (k, o), v in d.items() if o == 'true')])
write('blog_link_clicks_by_domain_monthly.csv', ['month', 'coverage'] + ['clicks_to_' + k for k in keys] + ['clicks_other_domains', 'clicks_total', 'clicks_flagged_outbound'], data)
print('captured', cap('ga4-monthly-organic-scope.json'))
