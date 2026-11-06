"""Página «desglose de búsquedas» del informe de proyección: valor medido por tema, antes y después.

    python3 -I outputs/sky-blog-proyeccion-2026-11/valor/scripts/09-keywords-report.py

Lee temas-*.csv y valor-mensual-resumen.csv; escribe valor/keywords_report.json con los slots que
scripts/seo/sky-blog-projection-report.ts mezcla en la página «keywords».
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(name):
    with open(os.path.join(HERE, name), encoding='utf-8') as handle:
        return list(csv.DictReader(handle))


def usd(x):
    return 'US$ ' + f"{round(x):,}".replace(',', '.')


LABEL = {
    'equipaje': 'Equipaje', 'destinos Chile': 'Destinos en Chile', 'internacionales': 'Rutas internacionales',
    'destinos Perú': 'Destinos en Perú', 'cambios': 'Cambios y devoluciones', 'mascotas': 'Mascotas',
    'check-in': 'Check-in', 'otros · SKY Plus, empresas y servicios': 'SKY Plus y empresas',
    'otros · empleo y tripulación': 'Empleo y tripulación', 'otros · resto': 'Otros temas',
}
before = {r['theme']: float(r['value_usd_per_month']) for r in rows('temas-www-blog-jul-sep-2025.csv')}
now = {r['theme']: float(r['value_usd_per_month']) for r in rows('temas-blog-ago-oct-2026.csv')}
# Check-in y SKY Plus/empresas son pequeños: se suman a «Otros temas» para que la tabla quepa en la página.
for series in (before, now):
    for small in ('check-in', 'otros · SKY Plus, empresas y servicios'):
        series['otros · resto'] += series.pop(small)
summary = {r['set']: r for r in rows('valor-mensual-resumen.csv')}
NOW_SETS = ['blog-2026-08', 'blog-2026-09', 'blog-2026-10']
PRE_SETS = ['www-blog-2025-07', 'www-blog-2025-08', 'www-blog-2025-09']


def avg(sets, key):
    return sum(float(summary[s][key]) for s in sets) / len(sets)


def change(a, b):
    return round((a / b - 1) * 100)


def pct(value):
    sign = '+' if value > 0 else '−' if value < 0 else ''
    return f"{sign}{abs(value)} %"


m_now, m_pre = avg(NOW_SETS, 'measured_value_usd'), avg(PRE_SETS, 'measured_value_usd')
nb_now, nb_pre = avg(NOW_SETS, 'non_brand_value_usd'), avg(PRE_SETS, 'non_brand_value_usd')

table = []
for theme in sorted(before, key=lambda t: -before[t]):
    delta = change(now[theme], before[theme])
    table.append({
        'entity': f"{LABEL[theme]} (antes {usd(before[theme])})",
        'valueA': usd(now[theme]),
        'valueB': pct(delta),
        'trend': 'up:better' if delta > 0 else 'down:worse' if delta < 0 else 'flat:neutral',
    })

slots = {
    'eyebrow': 'Búsquedas valorizadas',
    'heroFigure': pct(change(m_now, m_pre)),
    'heroText': f"valor medido al mes: {usd(m_now)} hoy contra {usd(m_pre)} antes de migrar; "
                f"<strong>sin marca, {pct(change(nb_now, nb_pre))}</strong>",
    'tableTitle': 'Destinos y rutas perdieron más del 80 %; equipaje y mascotas resisten mejor',
    'lead': 'Valor medido al mes por tema, ago–oct 2026, contra jul–sep 2025, a CPC de Google Ads de hoy.',
    'boardTitle': 'Valor medido por tema, US$ al mes',
    'legend': {'label': 'Hoy, US$ al mes'},
    'tableColumns': [{'label': '#'}, {'label': 'Tema (antes de migrar)'}, {'label': 'Hoy'}, {'label': 'Cambio'}],
    'tableRows': table,
    'barScaleMax': usd(max(now.values())),
    'source': {'label': 'Fuente', 'text': 'Search Console de SKY (blog y www) × CPC de Google Ads en Chile y Perú'},
    'coverage': {'label': 'Cobertura', 'text': 'Búsquedas visibles con CPC: 12 a 15 % de los clics; es un piso'},
    'closing': [
        {'kind': 'measure', 'label': 'Lo que muestra',
         'text': 'El blog perdió sobre todo búsquedas sin marca de destinos y rutas: las de viajeros que todavía '
                 'no eligen aerolínea.'},
        {'kind': 'action', 'label': 'Qué hacemos',
         'text': 'El lote editorial prioriza destinos de Perú y rutas internacionales; la planilla adjunta trae '
                 'cada búsqueda con su CPC para seguirla mes a mes.'},
    ],
}

for key in ('heroText', 'tableTitle', 'lead'):
    print(key, len(slots[key].replace('<strong>', '').replace('</strong>', '')))
for row in table:
    print(row)
with open(os.path.join(HERE, 'keywords_report.json'), 'w', encoding='utf-8') as handle:
    json.dump({'slots': slots}, handle, ensure_ascii=False, indent=2)
