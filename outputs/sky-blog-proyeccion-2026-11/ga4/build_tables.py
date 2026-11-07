"""Arma los CSV desde raw/ (consultas GA4 read-only de esta carpeta, capturadas 2026-11-05).
Uso: python3 -I outputs/sky-blog-proyeccion-2026-11/ga4/build_tables.py"""
import csv, glob, json, os
from collections import defaultdict
D = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(D, 'raw')
def rows(n):
    r = json.load(open(os.path.join(RAW, n + '.json')))['result']
    if 'error' in r: raise SystemExit(f'{n}: {r["error"]}')
    dh = [d['name'] for d in r.get('dimensionHeaders', [])]; mh = [m['name'] for m in r.get('metricHeaders', [])]
    return [dict(zip(dh + mh, [d.get('value') for d in x.get('dimensionValues', [])] + [float(m['value']) for m in x['metricValues']])) for x in r.get('rows', [])]
def ym(v): return f'{v[:4]}-{v[4:]}'
def cov(v): return 'partial_1-4' if v == '202611' else ('first_month_with_data' if v == '202307' else 'full')
def w(name, header, data):
    with open(os.path.join(D, name), 'w', newline='') as fh: c = csv.writer(fh); c.writerow(header); c.writerows(data)
    print('wrote', name, len(data))
def rnd(x, n=4): return round(x, n) if x is not None else None
def div(a, b): return a / b if (a is not None and b) else None

def pmrows(pattern):
    out = defaultdict(dict)
    for fpath in glob.glob(os.path.join(RAW, pattern)):
        j = json.load(open(fpath)); r = j['result']; dh = [d['name'] for d in r.get('dimensionHeaders', [])]; mh = [m['name'] for m in r.get('metricHeaders', [])]
        one = j['spec']['body']['dateRanges'][0]['name']  # con un solo rango la API no devuelve la dimensión dateRange
        for x in r.get('rows', []):
            d = dict(zip(dh, [v['value'] for v in x.get('dimensionValues', [])])); d.setdefault('dateRange', one); mv = dict(zip(mh, [float(v['value']) for v in x['metricValues']]))
            out[d['dateRange'].replace('-', '')][d.get('country', d.get('sessionDefaultChannelGroup'))] = mv
    return out
# --- Tráfico ---
org = {r['yearMonth']: r for r in rows('series-organic-scope-monthly')}
host = defaultdict(dict)
for r in rows('series-organic-scope-host-monthly'): host[r['yearMonth']][r['hostName']] = r['sessions']
w('blog_organic_sessions_monthly.csv', ['month', 'coverage', 'organic_sessions_dedup', 'engaged_sessions', 'engagement_rate', 'total_users', 'page_views',
  'sessions_www_blog_path', 'sessions_blog_host', 'host_sum_minus_dedup', 'yoy_change'],
  [[ym(k), cov(k), int(v['sessions']), int(v['engagedSessions']), rnd(v['engagementRate']), int(v['totalUsers']), int(v['screenPageViews']),
    int(host[k].get('www.skyairline.com', 0)), int(host[k].get('blog.skyairline.com', 0)),
    int(host[k].get('www.skyairline.com', 0) + host[k].get('blog.skyairline.com', 0) - v['sessions']),
    rnd(div(v['sessions'], org[str(int(k) - 100)]['sessions']) - 1) if str(int(k) - 100) in org and k != '202611' else None] for k, v in sorted(org.items())])
main = ['Chile', 'Peru', 'Argentina', 'Brazil']
cty = defaultdict(lambda: defaultdict(float)); lossm = {}
# Una consulta por mes y un solo rango (specs-06): la consulta yearMonth×country en rango largo pierde filas en "(other)".
for fpath in sorted(glob.glob(os.path.join(RAW, 'sm-organic-country-*.json'))):
    r = json.load(open(fpath)); k = os.path.basename(fpath)[-12:-5].replace('-', '')
    lossm[k] = bool((r['result'].get('metadata') or {}).get('dataLossFromOtherRow'))
    for x in r['result'].get('rows', []):
        c = x['dimensionValues'][0]['value']; cty[k][c if c in main else 'Other'] += float(x['metricValues'][0]['value'])
w('blog_organic_sessions_by_country_monthly.csv', ['month', 'coverage', 'chile', 'peru', 'argentina', 'brazil', 'other', 'sum_of_countries', 'organic_sessions_dedup',
  'share_chile', 'share_peru', 'share_argentina', 'share_brazil', 'share_other', 'ga4_dataLossFromOtherRow'],
  [[ym(k), cov(k)] + [int(c[x]) for x in main + ['Other']] + [int(sum(c.values())), int(org[k]['sessions'])] + [rnd(div(c[x], sum(c.values()))) for x in main + ['Other']] + [lossm[k]] for k, c in sorted(cty.items())])
ch = defaultdict(dict); chans = defaultdict(float)
for k, d in pmrows('pm-allch-channel-*.json').items():
    for c, mv in d.items(): ch[k][c] = mv['sessions']; chans[c] += mv['sessions']
order = sorted(chans, key=lambda c: -chans[c])
w('blog_sessions_by_channel_monthly.csv', ['month', 'coverage'] + order + ['sum_of_channel_rows'],
  [[ym(k), cov(k)] + [int(ch[k].get(c, 0)) for c in order] + [int(sum(ch[k].values()))] for k in sorted(ch)])
allc = {r['yearMonth']: r for r in rows('series-allchannels-scope-total-monthly')}
w('blog_sessions_all_channels_monthly.csv', ['month', 'coverage', 'sessions_all_channels_dedup', 'engaged_sessions', 'total_users', 'page_views', 'organic_sessions_dedup', 'organic_share'],
  [[ym(k), cov(k), int(v['sessions']), int(v['engagedSessions']), int(v['totalUsers']), int(v['screenPageViews']), int(org.get(k, {}).get('sessions', 0)), rnd(div(org.get(k, {}).get('sessions', 0), v['sessions']))] for k, v in sorted(allc.items())])

# --- Conversión ---
site = {r['yearMonth']: r for r in rows('conv-site-monthly')}
siteorg = {r['yearMonth']: r for r in rows('conv-site-monthly-organic')}
e1 = {r['yearMonth']: r for r in rows('conv-landing-blog-www-monthly')}
e2 = {r['yearMonth']: r for r in rows('conv-landing-blog-era2-monthly')}
o1 = {r['yearMonth']: r for r in rows('conv-landing-blog-www-monthly-organic')}
o2 = {r['yearMonth']: r for r in rows('conv-landing-blog-era2-monthly-organic')}
data = []
for k in sorted(site):
    era = 'www_/blog' if k <= '202509' else 'blog_host_inList'
    b = (e1 if era == 'www_/blog' else e2).get(k, {}); bo = (o1 if era == 'www_/blog' else o2).get(k, {}); s = site[k]; so = siteorg.get(k, {})
    data.append([ym(k), era, int(b.get('sessions', 0)), int(b.get('keyEvents:purchase', 0)), int(b.get('transactions', 0)), rnd(b.get('sessionKeyEventRate:purchase'), 5),
                 int(bo.get('sessions', 0)), int(bo.get('keyEvents:purchase', 0)), rnd(bo.get('sessionKeyEventRate:purchase'), 5),
                 int(s['sessions']), int(s['keyEvents:purchase']), rnd(s['sessionKeyEventRate:purchase'], 5),
                 int(so.get('sessions', 0)), rnd(so.get('sessionKeyEventRate:purchase'), 5),
                 rnd(div(b.get('sessionKeyEventRate:purchase'), s['sessionKeyEventRate:purchase']), 3),
                 b.get('purchaseRevenue', 0) + s['purchaseRevenue']])
w('conversion_blog_landing_vs_site_monthly.csv', ['month', 'blog_landing_definition', 'blog_landing_sessions', 'blog_landing_purchase_events', 'blog_landing_transactions',
  'blog_landing_purchase_session_rate', 'blog_landing_organic_sessions', 'blog_landing_organic_purchase_events', 'blog_landing_organic_purchase_session_rate',
  'site_sessions', 'site_purchase_events', 'site_purchase_session_rate', 'site_organic_sessions', 'site_organic_purchase_session_rate',
  'blog_rate_over_site_rate', 'purchase_revenue_blog_plus_site'], data)
# por país
# Por país: consultas por mes (specs-05), no la de rango largo (pierde filas en "(other)").
sc = pmrows('pm-site-conv-country-*.json'); bc = pmrows('pm-blogland-conv-country-*.json')
data = []
for k in sorted(sc):
    for c in main:
        b = bc[k].get(c, {}); s = sc[k].get(c, {})
        data.append([ym(k), c, int(b.get('sessions', 0)), int(b.get('keyEvents:purchase', 0)), rnd(b.get('sessionKeyEventRate:purchase'), 5),
                     int(s.get('sessions', 0)), int(s.get('keyEvents:purchase', 0)), rnd(s.get('sessionKeyEventRate:purchase'), 5)])
w('conversion_blog_landing_vs_site_by_country_monthly.csv', ['month', 'country', 'blog_landing_sessions', 'blog_landing_purchase_events', 'blog_landing_purchase_session_rate',
  'site_sessions', 'site_purchase_events', 'site_purchase_session_rate'], data)
# funnels (b)
pt = {r['yearMonth']: r for r in rows('conv-site-purchasers-total')}
pc = pmrows('pm-site-purchasers-country-*.json')
def funnel(n):
    r = json.load(open(os.path.join(RAW, n + '.json')))['result']
    if 'error' in r: return None
    out = defaultdict(dict)
    for x in r['funnelTable']['rows']:
        step, c = x['dimensionValues'][0]['value'], x['dimensionValues'][1]['value']
        out['TOTAL' if c == 'RESERVED_TOTAL' else c][step[:1]] = float(x['metricValues'][0]['value'])
    return out
data = []
for f in sorted(glob.glob(os.path.join(RAW, 'funnel-*.json'))):
    n = os.path.basename(f)[:-5]; kind = n.split('-then-')[0].replace('funnel-', ''); m = n[-7:]; k = m.replace('-', '')
    fu = funnel(n)
    if fu is None: continue
    for c in ['TOTAL'] + main:
        s1, s2 = fu.get(c, {}).get('1', 0), fu.get(c, {}).get('2', 0)
        ref = pt.get(k) if c == 'TOTAL' else pc[k].get(c)
        siter = div(ref['totalPurchasers'], ref['activeUsers']) if ref else None
        data.append([m, kind, c, int(s1), int(s2), rnd(div(s2, s1), 5), rnd(siter, 5), rnd(div(div(s2, s1), siter), 3) if siter else None])
w('conversion_funnel_blog_users_then_purchase_monthly.csv', ['month', 'funnel', 'country', 'users_viewed_blog', 'users_then_purchased', 'blog_viewer_purchase_rate',
  'site_purchaser_rate_totalPurchasers_over_activeUsers', 'blog_rate_over_site_rate'], data)
# (c) navegación por referrer
ref = defaultdict(lambda: defaultdict(float)); topp = defaultdict(float)
for r in rows('conv-www-pages-referrer-blog'):
    ref[r['yearMonth']][r['hostName']] += r['screenPageViews']
    if r['hostName'] == 'www.skyairline.com': topp[r['pagePath']] += r['screenPageViews']
hosts = ['www.skyairline.com', 'initial-sale.skyairline.com', 'mmb.skyairline.com', 'check-in.skyairline.com']
w('navigation_blog_referrer_to_site_monthly.csv', ['month', 'coverage'] + ['pageviews_' + h for h in hosts] + ['pageviews_other_hosts', 'pageviews_total'],
  [[ym(k), 'full'] + [int(ref[k].get(h, 0)) for h in hosts] + [int(sum(v for h, v in ref[k].items() if h not in hosts)), int(sum(ref[k].values()))] for k in sorted(ref)])
w('navigation_blog_referrer_top_www_pages.csv', ['www_page_path', 'pageviews_with_blog_referrer_2025-01_2026-10'], [[p, int(v)] for p, v in sorted(topp.items(), key=lambda x: -x[1])[:50]])
