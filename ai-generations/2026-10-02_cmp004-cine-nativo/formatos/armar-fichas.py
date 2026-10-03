# Arma las fichas nativas por formato desde las 11 fichas 4:5 aprobadas (CMP-004 Always On + Black Friday).
# La escena, la identidad, la llave y la palanca no cambian: sólo se reubica la geometría vertical del cuadro
# (zona calma para el texto · franja iluminada · lecho) según el formato. Nunca se recorta un plate aprobado.
import json, re, os, copy, sys
H = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.join(H, '..', 'fichas')
APROBADAS = {
  'S01': 'N01b-45-marca-sombra', 'S02': 'N02b-45-capitulo-reveal', 'S03': 'N03b-45-campana-escala',
  'S04': 'N04-45-seis-segundos', 'S05': 'N05-45-runandgun-jornada', 'S06': 'N06b-45-contenido-scroll',
  'S07': 'N07b-45-squad-criterio', 'S08': 'N08-45-ia-memoria',
  'BF1': 'BF1b-45-sparks-refuerzos', 'BF2': 'BF2b-45-squad-refuerzos', 'BF3': 'BF3-45-escala-temporada'}
# Mapeo por tramos de la altura del 4:5 a la del formato: (y_4:5, y_formato).
TRAMOS = {
  '9:16': [(0, 0), (40, 40), (42, 42), (80, 78), (100, 100)],
  '1:1':  [(0, 0), (40, 44), (42, 46), (80, 84), (100, 100)],
}
def mapa(fmt, y):
    t = TRAMOS[fmt]
    for (a, fa), (b, fb) in zip(t, t[1:]):
        if a <= y <= b:
            return round(fa + (fb - fa) * (y - a) / (b - a)) if b > a else fa
    return y
def transforma(fmt, s):
    s = re.sub(r'(LOWEST|lowest) (\d+)%', lambda m: f"{m.group(1)} {100 - mapa(fmt, 100 - int(m.group(2)))}%", s)
    s = re.sub(r'(?<!LOWEST )(?<!lowest )\b(\d+)%(?! of the width)', lambda m: f"{mapa(fmt, int(m.group(1)))}%", s)
    return s
def recorre(fmt, v):
    if isinstance(v, str): return transforma(fmt, v)
    if isinstance(v, list): return [recorre(fmt, x) for x in v]
    if isinstance(v, dict): return {k: (x if k in ('id', 'formato') else recorre(fmt, x)) for k, x in v.items()}
    return v
TRAMOS['16:9'] = [(0, 0), (42, 14), (80, 84), (100, 100)]
TRAMOS['1.91:1'] = TRAMOS['16:9']
HORIZONTALES = ('16:9', '1.91:1')
def horizontal(s):
    # Geometría horizontal: la zona calma pasa a ser la columna izquierda; la escena vive en la mitad derecha.
    # Primero se mapean las alturas originales; después se reescriben las frases de geometría (que ya traen su número).
    s = re.sub(r'(?<!LOWEST )(?<!lowest )\b(\d+)%', lambda m: f"{mapa('16:9', int(m.group(1)))}%", s)
    s = re.sub(r'the UPPER \d+% of the frame is ', 'the LEFT 44% of the frame, from the top edge to the bottom edge, is ', s)
    s = re.sub(r'lives between \d+% and \d+% of the frame height', 'lives in the RIGHT 54% of the frame, between 14% and 84% of the frame height', s)
    s = re.sub(r'(LOWEST|lowest) \d+% of the frame', r'\1 16% of the frame', s)
    s = re.sub(r'(riser[^.]*?its top edge at about )\d+%', r'\g<1>84%', s)
    s = re.sub(r'only below \d+%( of the frame height)?', 'only in the RIGHT half of the frame', s)
    s = re.sub(r'(rises|rise) above \d+%( of the frame height)?', r'\1 into the LEFT 44% of the frame', s)
    s = s.replace('slightly RIGHT of center', 'in the RIGHT half of the frame, centered at about 70% of the width')
    s = s.replace('slightly LEFT of center', 'in the RIGHT half of the frame, centered at about 64% of the width')
    s = s.replace('running wider than the frame', 'filling the right half of the frame').replace('wider than the frame', 'filling the right half of the frame')
    return s
_transforma = transforma
def transforma(fmt, s):
    return horizontal(s) if fmt in HORIZONTALES else _transforma(fmt, s)
SUF = {'9:16': '916', '1:1': '11', '16:9': '169', '1.91:1': '191'}
for fmt in sys.argv[1:] or ['9:16', '1:1']:
    for pieza, base in APROBADAS.items():
        d = json.load(open(os.path.join(BASE, base + '.json')))
        n = recorre(fmt, d)
        n['id'] = f"{pieza}-{SUF[fmt]}-{base.split('-45-')[1]}"
        n['formato'] = fmt
        comp = 'composicion-bf' if pieza.startswith('BF') else 'composicion'
        n['piloto'] = f"../../{comp}/plates/{base}.png"
        assert os.path.exists(os.path.join(H, '..', comp, 'plates', base + '.png')), base
        json.dump(n, open(os.path.join(H, 'fichas', n['id'] + '.json'), 'w'), ensure_ascii=False, indent=2)
        print(n['id'])
