"""Proyección de tráfico orgánico y valor publicitario del Blog SKY, noviembre 2026 a octubre 2028.

    python3 -I outputs/sky-blog-proyeccion-2026-11/modelo/proyeccion.py

Método (explicable a SKY):

1. Referencia «nivel previo a la migración». En 2026 cada mes fue casi una fracción fija del mismo mes de
   2025: entre 0,31 y 0,38 de enero a septiembre. Esa fracción es la «tasa de recuperación» R. El mismo mes
   de 2025 (enero a septiembre, antes de migrar) es la referencia R = 1. Octubre a diciembre de 2025 ya
   eran posteriores a la migración, así que su referencia se estima con la tasa media de 2026.
2. Escenarios. Cada escenario es una trayectoria de R mes a mes, con supuestos explícitos (SCENARIOS).
   Las visitas proyectadas son R × referencia; así la estacionalidad actual (pico de enero) queda incluida.
3. Valor. El valor publicitario equivalente es proporcional a las visitas, con el rango por visita medido
   en agosto 2025 (US$ 28.000–45.000 con 95.710 visitas). Se compara con el honorario mensual.

Todo número de salida es una estimación de Efeonce para conversar expectativas, no un compromiso.
"""

import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, 'serie_ga4.json'), encoding='utf-8') as handle:
    SERIE = json.load(handle)

OBS = SERIE['sessions']  # mensual desde ene-2024
MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
USD_CLP = SERIE['usd_clp']
FEE_USD = 3_000_000 / USD_CLP
VALUE_PER_VISIT = (28000 / 95710, 45000 / 95710)  # agosto 2025, antes de migrar


def at(year, month):
    idx = (year - 2024) * 12 + month
    return OBS[idx] if 0 <= idx < len(OBS) else None


# Tasa R observada en 2026 (enero a septiembre) contra el mismo mes de 2025.
R_2026 = [at(2026, m) / at(2025, m) for m in range(9)]
R_MEAN = sum(R_2026) / len(R_2026)

# Referencia R = 1 por mes calendario.
REF = {m: at(2025, m) for m in range(9)}
oct26 = at(2026, 9)
REF[9] = oct26 / R_MEAN  # octubre: oct-26 observado / tasa media
# Noviembre y diciembre: mismo paso estacional que nov-25 y dic-25 respecto de oct-25.
REF[10] = REF[9] * at(2025, 10) / at(2025, 9)
REF[11] = REF[9] * at(2025, 11) / at(2025, 9)

H = 24
T0 = len(OBS)  # primer mes proyectado (nov-2026 si la serie termina en oct-2026)


def label(t):
    return f"{MONTHS[t % 12]}-{str(2024 + t // 12)[2:]}"


def observed_r(t):
    year, month = 2024 + t // 12, t % 12
    value = OBS[t] if t < len(OBS) else None
    return value / REF[month] if value is not None else None


def ramp(i, start, end, r_from, r_to):
    """Interpolación lineal de R entre el mes i=start y el mes i=end."""
    if i <= start:
        return r_from
    if i >= end:
        return r_to
    return r_from + (r_to - r_from) * (i - start) / (end - start)


R_NOW = observed_r(T0 - 1)  # octubre 2026
# Caída interanual observada en octubre 2026 contra octubre 2025 (cerrado: 24.351 / 42.585 → −43 %).
NO_ACTION_YOY = at(2026, 9) / at(2025, 9)


def r_no_action(i):
    # Sigue la caída interanual de octubre (NO_ACTION_YOY) durante 2027 y se amortigua a −20 % en 2028.
    t = T0 + i
    prior = OBS[t - 12] if t - 12 < len(OBS) else None
    return None if prior is None else None  # se calcula aparte, sobre visitas


# Trayectorias de R. i = 0 es noviembre 2026.
# Base: correcciones técnicas en noviembre (efecto a 4–8 semanas) y lote editorial; el blog sigue en el
# subdominio. R vuelve a la del año anterior hacia enero y sube hasta 0,50 en 2028 (techo del subdominio,
# supuesto: sin la autoridad de skyairline.com no recupera más de la mitad de lo previo).
def r_base(i):
    # Al 05-11-2026 la configuración SEO, el robots.txt y el cierre de Azure no están en producción: noviembre
    # sigue la tasa actual, diciembre recibe el primer efecto y enero vuelve al nivel del año anterior SI los
    # arreglos quedan en producción antes del 20-11 (efecto a 4–8 semanas). Variante tardía en BASE_LATE_JAN_R.
    fixed = {0: R_NOW, 1: 0.38, 2: 0.31}
    if i in fixed:
        return fixed[i]
    if i <= 11:
        return ramp(i, 2, 11, 0.33, 0.42)
    return ramp(i, 11, 23, 0.42, 0.50)


BASE_LATE_JAN_R = 0.265  # arreglos en producción en diciembre: enero ~55k


# Estructural: lo anterior + vuelta a skyairline.com/blog con proxy inverso en funcionamiento el 1 de marzo
# de 2027 + consolidación de artículos que compiten. Desde abril R converge hacia la referencia previa a la
# migración; se modela una banda: R 0,75 (bajo) a 0,95 (alto) a los 8 meses del cambio.
def r_struct(i, top):
    if i <= 4:  # hasta marzo 2027 igual que la base
        return r_base(i)
    if i <= 12:  # abril 2027 a noviembre 2027
        return ramp(i, 4, 12, r_base(4), top)
    return ramp(i, 12, 23, top, min(1.0, top + 0.05))


rows = []
paths = {'Sin intervenir': [], 'Base': [], 'Estructural bajo': [], 'Estructural alto': []}
for i in range(H):
    t = T0 + i
    month = t % 12
    ref = REF[month]
    # Sin intervenir sobre visitas: caída interanual de octubre sobre el observado; en 2028, −20 % sobre lo proyectado.
    if t - 12 < len(OBS):
        no_action = OBS[t - 12] * NO_ACTION_YOY
    else:
        no_action = paths['Sin intervenir'][i - 12] * 0.80
    values = {
        'Sin intervenir': no_action,
        'Base': r_base(i) * ref,
        'Estructural bajo': r_struct(i, 0.75) * ref,
        'Estructural alto': r_struct(i, 0.95) * ref,
    }
    row = {
        'mes': label(t),
        'referencia_previa_migracion': round(ref),
        'mismo_mes_2024': at(2024, month),
        'mes_anio_anterior': OBS[t - 12] if t - 12 < len(OBS) else None,
    }
    for name, visits in values.items():
        paths[name].append(visits)
        key = name.lower().replace(' ', '_')
        row[f'{key}_visitas'] = round(visits)
        row[f'{key}_r'] = round(visits / ref, 2)
        row[f'{key}_valor_usd_bajo'] = round(visits * VALUE_PER_VISIT[0])
        row[f'{key}_valor_usd_alto'] = round(visits * VALUE_PER_VISIT[1])
        row[f'{key}_cobertura_honorario'] = f"{visits * VALUE_PER_VISIT[0] / FEE_USD:.1f}–{visits * VALUE_PER_VISIT[1] / FEE_USD:.1f}"
    rows.append(row)


def first(name, threshold):
    for i, visits in enumerate(paths[name]):
        if visits / REF[(T0 + i) % 12] >= threshold:
            return label(T0 + i)
    return 'después de oct-28'


milestones = {name: {
    'R_0_50': first(name, 0.50),
    'R_0_75': first(name, 0.75),
    'R_0_90': first(name, 0.90),
    'enero_2027_visitas': round(paths[name][2]),
    'enero_2027_base_tardia': round(BASE_LATE_JAN_R * REF[(T0 + 2) % 12]),
    'enero_2028_visitas': round(paths[name][14]),
    'abr_sep_2027_promedio': round(sum(paths[name][5:11]) / 6),
    'abr_sep_2028_promedio': round(sum(paths[name][17:23]) / 6),
} for name in paths}

with open(os.path.join(HERE, 'proyeccion_mensual.csv'), 'w', newline='', encoding='utf-8') as handle:
    writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

summary = {
    'R_2026_por_mes': [round(r, 3) for r in R_2026],
    'R_media_2026': round(R_MEAN, 3),
    'R_octubre_2026': round(R_NOW, 3),
    'caida_interanual_octubre_2026': round(NO_ACTION_YOY - 1, 3),
    'referencia_por_mes': {MONTHS[m]: round(REF[m]) for m in range(12)},
    'honorario_usd_mes': round(FEE_USD), 'usd_clp': USD_CLP,
    'valor_por_visita_usd': [round(v, 3) for v in VALUE_PER_VISIT],
    'hitos': milestones,
}
with open(os.path.join(HERE, 'resumen_modelo.json'), 'w', encoding='utf-8') as handle:
    json.dump(summary, handle, ensure_ascii=False, indent=2)

print(json.dumps(summary, ensure_ascii=False, indent=2))
for row in rows:
    print(row['mes'], f"ref {row['referencia_previa_migracion']:>7,}",
          *(f"{n[:6]} {row[n + '_visitas']:>7,} R{row[n + '_r']:.2f} US${row[n + '_valor_usd_bajo']//1000}-{row[n + '_valor_usd_alto']//1000}k x{row[n + '_cobertura_honorario']}"
            for n in ['sin_intervenir', 'base', 'estructural_bajo', 'estructural_alto']))
