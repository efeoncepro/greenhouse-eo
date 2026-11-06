"""Tareas principales del lote de diciembre en «Tareas» del teamspace SKY (Artículos 49 a 88).

    python3 outputs/sky-blog-plan-diciembre-2026/tareas-sky.py   # escribe tareas-sky.json
"""
import csv, datetime, json, os

D = os.path.dirname(os.path.abspath(__file__))
PROJECT = 'https://app.notion.com/p/41039c2fefe7813c8ea9d3910d8a427f'
PLAYBOOK = 'https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e'
VALENTINA = 'user://3c2d872b-594c-81f1-826c-0002c1814e08'
ANDRES = 'user://2a4d872b-594c-8161-9250-000270ffdfea'
MELKIN = 'user://23ed872b-594c-81f3-a8b8-00022610dfeb'

SHORT = {
    'R1': 'Documentos para viajar en avión', 'R2': 'Primer viaje en avión', 'R3': 'Vacunas para viajar a Brasil',
    'R4': 'Cómo llegar a Pucón en avión', 'R5': 'Lugares turísticos de Chile', 'R6': 'Aeroparque o Ezeiza',
    'R7': 'Panoramas con niños en Santiago', 'R8': 'Semana Valdiviana 2027', 'R9': 'Países baratos para viajar desde Chile',
    'R10': 'Platos típicos de Lima', 'R11': 'Playas de Florianópolis', 'R12': 'Cuándo comprar pasajes baratos',
    'R13': 'Aeropuerto de Castro (Mocopulli)', 'R14': 'Documentos para viajar a Argentina desde Chile',
    'R15': 'Comprar tu pasaje en línea en SKY', 'R16': 'De Montevideo a Punta del Este', 'R17': 'Hornopirén desde Puerto Montt',
    'R18': 'Cómo elegir el mejor asiento', 'R19': 'Mejor época para viajar a Tarapoto', 'R20': 'Dónde viajar en verano',
    'R21': 'Playas de Piura', 'R22': 'De Puerto Natales a Torres del Paine', 'R23': 'Laguna de Paca',
    'R24': 'Playas de la Costa Verde', 'R25': 'Qué hacer en Juliaca',
    'N1': 'Mollendo y las playas de Arequipa', 'N2': 'Tongoy y Guanaqueros', 'N3': 'Muelle de las Almas y Cucao',
    'N4': 'Dichato y las playas cerca de Concepción', 'N5': 'Capillas de Mármol', 'N6': 'Isla Magdalena y Fuerte Bulnes',
    'N7': 'Ilha Grande desde Río de Janeiro', 'N8': 'Praia do Forte', 'N9': 'Playas de Trujillo', 'N10': 'Playas de Tacna',
    'N11': 'Sillustani y Lampa', 'N12': 'Carnaval ayacuchano 2027', 'N13': 'Semana Santa en Ayacucho 2027',
    'N14': 'Carnavales en Perú 2027', 'N15': 'Huaytapallana y el Valle del Mantaro',
}
SERVICE = {'R1', 'R2', 'R12', 'R15', 'R18'}

ids = list(csv.DictReader(open(os.path.join(D, 'content-hub-ids.csv'))))
order = {p: i for i, p in enumerate(SHORT)}
ids.sort(key=lambda r: (r['fecha_tentativa'], order[r['pieza']]))


HOLIDAYS = {'2026-12-08', '2026-12-25'}  # feriado en Chile y Perú


def minus_business_days(d, n):
    while n:
        d -= datetime.timedelta(days=1)
        if d.weekday() < 5 and d.isoformat() not in HOLIDAYS:
            n -= 1
    return d


tasks = []
for i, r in enumerate(ids):
    n = 49 + i
    pub = datetime.date.fromisoformat(r['fecha_tentativa'])
    due = minus_business_days(pub, 5)
    hub = 'https://app.notion.com/p/' + r['notion_page_id'].replace('-', '')
    designer = ANDRES if i < 20 else MELKIN
    extra = ''
    if r['pieza'] in SERVICE:
        extra = ('\n\n<callout icon="❓" color="yellow_bg">\nGuía de servicio: confirmar con Natalia que cabe en el blog antes de '
                 'escribir (en noviembre SKY rechazó cambio de vuelo, mascotas y bebé).\n</callout>')
    content = (f'Artículo en el Content Hub: <mention url="{hub}" />\n\n'
               f'Producción según el <mention url="{PLAYBOOK}" />. Las tareas de diseño (IMG 1–3) se crean como subtareas '
               'cuando el texto esté escrito (Fase 8).\n\n'
               '<callout icon="⚠️" color="gray_bg">\nCreada el 06/11/2026 antes de la aprobación de SKY, a pedido de Julio. '
               f'Pieza {r["pieza"]} del lote de diciembre; publicación tentativa {pub.strftime("%d/%m/%Y")}. '
               'Si SKY rechaza el artículo, esta tarea pasa a Archivado.\n</callout>' + extra)
    tasks.append({'n': n, 'pieza': r['pieza'], 'icon': '📝', 'properties': {
        'Nombre de tarea': f'SKY · Artículo {n}: {SHORT[r["pieza"]]}', 'Estado': 'Sin empezar',
        'Responsables': json.dumps([VALENTINA, designer]), 'Proyecto': json.dumps([PROJECT]),
        'Tipo de entregable': '["Contenido"]', 'Artículo Content Hub': json.dumps([hub]),
        'date:Fecha límite:start': due.isoformat(), 'date:Fecha límite:is_datetime': 0}, 'content': content})

json.dump(tasks, open(os.path.join(D, 'tareas-sky.json'), 'w'), ensure_ascii=False, indent=1)
for t in tasks:
    print(t['n'], t['pieza'], t['properties']['date:Fecha límite:start'], t['properties']['Nombre de tarea'])
