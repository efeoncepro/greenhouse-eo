"""Builds the deliverable CSVs from the canonical valuation JSONs (canonical/valor-<set>.json) and raw GSC files.
Pure local post-processing; no network. Run: python3 -I outputs/sky-blog-proyeccion-2026-11/valor/scripts/08-tables.py"""
import csv, json, re, os, collections
V = 'outputs/sky-blog-proyeccion-2026-11/valor/'
SRC = {'chl': 'DataForSEO Labs keyword_overview (Google Ads CPC) · location 2152 Chile · es',
       'per': 'DataForSEO Labs keyword_overview (Google Ads CPC) · location 2604 Perú · es'}

def rx(words): return re.compile(r'\b(' + '|'.join(words) + r')\b', re.I)
THEMES = [
 ('check-in', rx([r'check ?-?in', 'checkin', r'tarjeta de embarque', r'pase de abordar', r'boarding pass', r'web check'])),
 ('mascotas', rx(['mascotas?', 'perros?', 'gatos?', 'animal(es)?', r'petfriendly', r'pet friendly'])),
 ('cambios', rx([r'cambi(o|os|ar)', r'devoluci[oó]n', 'reembolso', 'anular', 'cancelar', r'cancelaci[oó]n', 'retracto', r'endos(o|ar)'])),
 ('equipaje', rx(['equipajes?', 'maletas?', 'bolsos?', 'mochilas?', r'carry ?on', r'l[ií]quidos?', 'kilos?', 'kg', 'medidas', 'peso', 'valijas?', 'personal item', r'art[ií]culo personal'])),
]
PERU = rx(['lima', 'cusco', 'cuzco', r'machu ?picchu', 'arequipa', 'trujillo', 'piura', 'tacna', 'juliaca', 'puno', 'titicaca', 'iquitos', 'tarapoto',
           'chiclayo', 'cajamarca', 'ayacucho', 'tumbes', r'm[aá]ncora', 'zorritos', 'pucallpa', 'huaraz', 'paracas', 'ica', 'huacachina', 'nazca', 'nasca',
           r'puerto maldonado', 'jauja', 'chachapoyas', 'talara', 'colca', 'miraflores', 'barranco', 'callao', r'per[uú]', 'peruan[oa]s?', 'chachani', 'ollantaytambo', r'valle sagrado', 'vinicunca', r'monta[ñn]a de colores', r'punta sal', 'chimbote', 'huanchaco', 'lambayeque'])
INTL = rx([r'buenos aires', 'argentina', r'brasil', r'florian[oó]polis', r'r[ií]o de janeiro', r's[aã]o paulo', 'montevideo', 'uruguay', r'punta cana',
           r'rep[uú]blica dominicana', 'mendoza', 'bariloche', r'c[oó]rdoba', 'salvador', r'bah[ií]a', r'asunci[oó]n', 'paraguay', r'bogot[aá]', 'colombia',
           'cartagena', 'miami', r'estados unidos', 'ecuador', 'quito', 'guayaquil', 'bolivia', r'la paz', r'canc[uú]n', r'm[eé]xico', 'europa', 'madrid',
           'internacional(es)?', 'pasaporte', 'visa', 'caribe', r'santo domingo', 'aruba', 'cuba', 'habana', 'salta', 'ushuaia', 'iguazu', r'iguaz[uú]',
           'buzios', r'b[uú]zios', 'porto seguro', 'natal', 'fortaleza', 'recife', 'maceio', r'macei[oó]', r'el calafate', 'calafate', 'rosario', 'tucuman', 'neuquen', r'neuqu[eé]n'])
CHILE = rx(['santiago', r'puerto montt', r'punta arenas', 'calama', 'antofagasta', 'iquique', 'arica', r'la serena', r'concepci[oó]n', 'temuco', 'valdivia',
            r'puerto natales', r'torres del paine', r'chilo[eé]', r'san pedro( de atacama)?', 'atacama', r'valpara[ií]so', r'vi[ñn]a( del mar)?', r'puc[oó]n', 'osorno',
            'balmaceda', 'coyhaique', r'copiap[oó]', r'isla de pascua', r'rapa ?nui', r'puerto varas', 'frutillar', 'castro', 'chile', 'chilen[oa]s?', 'patagonia',
            r'carretera austral', 'elqui', 'pichilemu', 'algarrobo', 'quintero', 'zapallar', 'caleta', 'chiloé', 'magallanes', 'aysen', r'ays[eé]n', r'la tirana', 'humberstone', 'uyuni'])

def theme(q, page):
    for name, r in THEMES:
        if r.search(q): return name
    for text in (q, page.replace('-', ' ').replace('/', ' ')):
        if PERU.search(text): return 'destinos Perú'
        if INTL.search(text): return 'internacionales'
        if CHILE.search(text): return 'destinos Chile'
    if re.search(r'sky ?plus|puntos|empresas|corporat|billetera|grupos?', q, re.I): return 'otros · SKY Plus, empresas y servicios'
    if re.search(r'tripulante|trabaja|postulaci|empleo|curso|piloto|azafata', q, re.I): return 'otros · empleo y tripulación'
    return 'otros · resto'

def load(s): return json.load(open(V + f'canonical/valor-{s}.json'))

def write(name, header, rows):
    with open(V + name, 'w', newline='') as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)

def period_table(sets, label):
    agg = {}
    for s in sets:
        d = load(s)
        for r in d['detail']:
            k = (r['query'], r['country'])
            a = agg.setdefault(k, {'clicks': 0, 'months': collections.Counter(), 'pages': collections.Counter(), 'value': 0.0, 'cpc': None, 'cpcAt': None,
                                   'provAt': None, 'brand': r['brand'], 'valued_clicks': 0})
            a['clicks'] += r['clicks']; a['months'][s] += r['clicks']; a['pages'][r['page']] += r['clicks']
            if r['cpcUsd'] is not None:
                a['value'] += r['clicks'] * r['cpcUsd']; a['valued_clicks'] += r['clicks']; a['cpc'] = r['cpcUsd']; a['cpcAt'] = r['cpcCapturedAt']; a['provAt'] = r['cpcProviderUpdatedAt']
    rows = []
    for (q, c), a in agg.items():
        page = a['pages'].most_common(1)[0][0]
        priced = a['cpc'] is not None
        rows.append([q, c, a['clicks'], *[a['months'][s] for s in sets], a['cpc'] if priced else '', SRC.get(c, 'sin mercado comprado (no valorado)') if c in SRC else 'país no valorado',
                     a['cpcAt'] or '', (a['provAt'] or '')[:10], round(a['value'], 2) if priced else '', 'marca' if a['brand'] == 'brand' else 'sin marca',
                     theme(q, page), page, len(a['pages'])])
    rows.sort(key=lambda r: (-(r[3 + len(sets)] != '' and r[3 + len(sets) + 4] or 0) if False else 0))
    vi = 3 + len(sets) + 4
    rows.sort(key=lambda r: (-(r[vi] if r[vi] != '' else -1), -r[2]))
    header = ['query', 'country', 'clicks_period', *[f'clicks_{s}' for s in sets], 'cpc_usd', 'cpc_source', 'cpc_captured_at', 'provider_updated_at',
              'value_usd_period', 'brand_flag', 'theme', 'landing_page_top', 'pages_count']
    write(f'desglose-keywords-{label}.csv', header, rows)
    write(f'top50-keywords-{label}.csv', ['rank'] + header, [[i + 1] + r for i, r in enumerate([r for r in rows if r[vi] != ''][:50])])
    # themes
    t = collections.defaultdict(lambda: [0.0, 0, 0, 0.0, 0.0])
    for r in rows:
        x = t[r[vi + 2]]
        x[1] += r[2]
        if r[vi] != '': x[0] += r[vi]; x[2] += r[2]
        if r[vi + 1] == 'marca' and r[vi] != '': x[3] += r[vi]
    total_v = sum(x[0] for x in t.values())
    order = ['equipaje', 'check-in', 'mascotas', 'cambios', 'destinos Chile', 'destinos Perú', 'internacionales', 'otros · SKY Plus, empresas y servicios', 'otros · empleo y tripulación', 'otros · resto']
    write(f'temas-{label}.csv', ['theme', 'value_usd_period', 'value_usd_per_month', 'share_of_measured_value', 'visible_clicks', 'valued_clicks', 'brand_value_usd'],
          [[k, round(t[k][0], 2), round(t[k][0] / len(sets), 2), round(t[k][0] / total_v, 4) if total_v else '', t[k][1], t[k][2], round(t[k][3], 2)] for k in order])
    return rows, t, total_v

summary = []
for s in ['blog-2026-08', 'blog-2026-09', 'blog-2026-10', 'www-blog-2025-07', 'www-blog-2025-08', 'www-blog-2025-09', 'www-blog-2025-09-pre']:
    d = load(s); m = d['summary']; b = {x['brand']: x for x in d['brands']}; c = {x['country']: x for x in d['countries']}
    implicit = m['estimatedValueUsd'] / m['valuedClicks']
    summary.append([s, d['siteUrl'], d['range']['startDate'], d['range']['endDate'], m['totalClicks'], m['visibleQueryClicks'], m['valuedClicks'], m['unvaluedVisibleClicks'], m['unexposedClicks'],
                    round(m['queryCoverageOfTotal'], 4), round(m['coverageOfTotal'], 4), m['estimatedValueUsd'], b['brand']['estimatedValueUsd'], b['non_brand']['estimatedValueUsd'],
                    round(b['brand']['estimatedValueUsd'] / m['estimatedValueUsd'], 4), c.get('chl', {}).get('estimatedValueUsd'), c.get('per', {}).get('estimatedValueUsd'),
                    round(implicit, 4), round(implicit * m['totalClicks'], 0)])
write('valor-mensual-resumen.csv', ['set', 'property', 'from', 'to', 'total_clicks_control', 'visible_query_clicks', 'valued_clicks', 'visible_unvalued_clicks', 'unexposed_clicks',
      'query_coverage', 'valuation_coverage', 'measured_value_usd', 'brand_value_usd', 'non_brand_value_usd', 'brand_share_of_measured', 'value_chl_usd', 'value_per_usd',
      'implicit_cpc_usd_valued', 'extrapolated_value_usd_NOT_CANONICAL'], summary)
for r in summary: print(r)
for sets, label in [(['blog-2026-08', 'blog-2026-09', 'blog-2026-10'], 'blog-ago-oct-2026'), (['www-blog-2025-07', 'www-blog-2025-08', 'www-blog-2025-09'], 'www-blog-jul-sep-2025'),
                    (['www-blog-2025-08'], 'www-blog-ago-2025'), (['blog-2026-10'], 'blog-oct-2026')]:
    rows, t, tv = period_table(sets, label)
    print(label, round(tv, 2), {k: round(v[0] / tv, 3) for k, v in t.items()})

# www daily history export
for seg in ['total', 'brand', 'non_brand']:
    d = json.load(open(V + f'raw/gsc-daily-www_blog-{seg}.json'))
    write(f'historia-www-blog-diaria-{seg}-por-pais.csv', ['date', 'country', 'clicks', 'impressions', 'ctr', 'position'],
          [[r['keys'][0], r['keys'][1], r['clicks'], r['impressions'], round(r['ctr'], 4), round(r['position'], 2)] for r in d['byCountry']])

# www daily totals (page-aggregated control, all clicks) — the per-country daily files only carry query-visible clicks
rows = []
for seg in ['total', 'brand', 'non_brand']:
    d = json.load(open(V + f'raw/gsc-daily-www_blog-{seg}.json'))
    rows += [[r['keys'][0], seg, r['clicks'], r['impressions'], round(r['ctr'], 4), round(r['position'], 2)] for r in d['byDate']]
write('historia-www-blog-diaria-totales.csv', ['date', 'segment', 'clicks', 'impressions', 'ctr', 'position'], sorted(rows))
