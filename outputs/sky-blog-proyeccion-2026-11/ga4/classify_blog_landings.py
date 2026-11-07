"""Clasifica landingPage (sin host) como 'del blog' para la era blog.skyairline.com (2025-10..2026-10).
Regla: sesiones(landing L con evento en blog.skyairline.com) / sesiones(landing L, todos los hosts) >= 0,95.
Una sesión que aterriza en una página del blog siempre toca el host del blog; si la misma ruta existe en otro host
(ej. '/'), la proporción baja y la ruta se excluye. Escribe blog_landing_paths.json (insumo de specs-03)."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
def rows(n):
    r = json.load(open(os.path.join(D, 'raw', n + '.json')))['result']
    return [([d.get('value') for d in x['dimensionValues']], [float(m['value']) for m in x['metricValues']]) for x in r['rows']]
blog = {d[0]: m[0] for d, m in rows('conv-landing-host-matrix')}
tot = {d[0]: m[0] for d, m in rows('conv-landing-totals')}
keep, drop = [], []
for p, s in blog.items():
    t = tot.get(p, 0)
    (keep if p not in ('(not set)', '') and t and s / t >= 0.95 else drop).append((p, s, t))
keep.sort(key=lambda x: -x[2]); drop.sort(key=lambda x: -x[2])
json.dump(sorted(p for p, _, _ in keep), open(os.path.join(D, 'blog_landing_paths.json'), 'w'), indent=0)
print('kept', len(keep), 'sessions', sum(t for _, _, t in keep), '| dropped', len(drop), 'blog-host sessions in dropped', sum(s for _, s, _ in drop))
print('top dropped', [(p, int(s), int(t)) for p, s, t in drop[:12]])
