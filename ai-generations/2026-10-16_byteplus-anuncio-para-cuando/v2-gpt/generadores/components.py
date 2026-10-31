# Lámina de componentes · La órbita, variante de video (v3: afinados + nuevos).
# Genera el tablero Componentes.dc.html (sólo CSS) y una página de prueba local.
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/6c01f8c0-9b1d-4bbf-a45d-33556c130cbc/scratchpad/storyboard-canvas'
PLATES = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/plates-v5/'

EXPO = 'cubic-bezier(.16,1,.3,1)'     # entrada
EIN = 'cubic-bezier(.7,0,.84,0)'      # salida
IO = 'cubic-bezier(.65,0,.35,1)'      # cruce
LIN = 'linear'
E = 0.001
F = 1 / 30                            # un cuadro a 30 fps

BLOB = {'17': 'f72d0d8af0b9744e886baa33d36dbdf8', '12': 'cb18df2c9a0f118af516491c5f653444', '01': 'a1f8f712a60fbd8d03676986d545d131', '03': '072b917aa50e2f5e70106e83c1be895c',
        '14': 'c7b20deb4afc7ff9106d9c3f6ffd2cae', '05': '3734cb58056cf5be97a93dcc5ab80bf3',
        '13': '4dca3380b19f944dddf5df75fd328ec1'}
LOCAL = {'17': '17-lunes', '12': '12-paredes', '01': '01-kickoff', '03': '03-grilla16', '14': '14-bogota', '05': '05-dia42', '13': '13-cdmx'}
URL_BUBBLE = open(os.path.join(HERE, 'url-bubble-dark.svg')).read()  # AXIS brand-assets url-bubble-baked-dark.svg
LOGO_E = '/_blob/1bbf566132073a18e1f2642bfa0d74f1'
LOGO_E_LOCAL = 'file://' + PROJ + '/img/efeonce-logo-negative.svg'
BP = '/_blob/f2690366a5b1e8b68ecfb17e5ba448af'           # logo oficial de BytePlus en blanco (kit del partner)
BP_LOCAL = 'file://' + PROJ + '/img/byteplus-white-hi.png'

BG = [('12', 'cargado', ''), ('01', 'claro', ''), ('14', 'oscuro', 'dk')]  # el primero va a tamaño celular


class KF:
    def __init__(self):
        self.css = []

    def anim(self, name, T, pts):
        pts = sorted([(min(max(t, 0), T), d, e) for t, d, e in pts], key=lambda p: p[0])
        if pts[0][0] > 0:
            pts.insert(0, (0, pts[0][1], LIN))
        if pts[-1][0] < T:
            pts.append((T, pts[-1][1], LIN))
        out, last = [], -1
        for t, d, e in pts:
            pct = t / T * 100
            if pct <= last:
                pct = last + 0.0005
            last = pct
            out.append(f'{pct:.4f}%{{{d};animation-timing-function:{e}}}')
        self.css.append(f'@keyframes {name}{{{"".join(out)}}}')
        return f'--n:{name}'


K = KF()

# ---------- primitivas de movimiento ----------
WIPE_H = {'l': 'clip-path:inset(0 100% 0 0);transform:translateX(-14px)', 'r': 'clip-path:inset(0 0 0 100%);transform:translateX(14px)'}
WIPE_S = 'clip-path:inset(0 0 0 0);transform:translateX(0)'


def wipe(name, T, side, tin, tout):
    """El lecho se revela desde su borde recto (8 cuadros) y se recoge hacia él (6 cuadros)."""
    h = WIPE_H[side]
    return K.anim(name, T, [(tin, h, EXPO), (tin + 8 * F, WIPE_S, LIN), (tout - 6 * F, WIPE_S, EIN), (tout, h, LIN)])


TH = 'clip-path:inset(130% -10% -40% -10%);transform:translateY(45%)'
TS = 'clip-path:inset(-30% -10% -40% -10%);transform:translateY(0)'
TG = 'clip-path:inset(-30% -10% 140% -10%);transform:translateY(-35%)'


def up(name, T, tin, tout, cut=False):
    """Texto por máscara de abajo hacia arriba (6 cuadros); sale hacia arriba antes que el lecho."""
    p = [(tin, TH, EXPO), (tin + 6 * F, TS, LIN)]
    p += [(tout - E, TS, LIN), (tout, TH, LIN)] if cut else [(tout - 8 * F, TS, EIN), (tout - 3 * F, TG, LIN)]
    return K.anim(name, T, p)


def esf(name, T, beat, tout):
    """Esfera en el golpe: 0 → 110 % → 100 %; es la primera en irse."""
    return K.anim(name, T, [(beat - 4 * F, 'transform:scale(0)', EXPO), (beat, 'transform:scale(1.1)', IO), (beat + 2 * F, 'transform:scale(1)', LIN),
                            (tout - 10 * F, 'transform:scale(1)', EIN), (tout - 8 * F, 'transform:scale(0)', LIN)])


def fade(name, T, tin, tout, fi=2 * F, fo=2 * F):
    return K.anim(name, T, [(tin, 'opacity:0', LIN), (tin + fi, 'opacity:1', LIN), (tout - fo, 'opacity:1', LIN), (tout, 'opacity:0', LIN)])


SPH = lambda st: f'<span class="k-esf k-a" style="{st}"></span>'
SPH_STATIC = '<span class="k-esf"></span>'
RING = '<span class="k-ring"></span>'

T0 = 3.0  # 6 tiempos a 120 BPM: entra en 0,25 s, golpe en 1,0 s, sale en 2,5 s
TIN, BEAT, TOUT = .25, 1.0, 2.5


# ---------- componentes ----------
def ring_svg(name, T, tin, color='var(--acc)'):
    """Anillo de pregunta que se dibuja como órbita abierta en 6 cuadros al entrar el subtítulo."""
    st = K.anim(name, T, [(tin, 'stroke-dashoffset:1', EXPO), (tin + 6 * F, 'stroke-dashoffset:0', LIN)])
    return (f'<svg class="k-ring2" style="color:{color}" viewBox="0 0 24 24"><circle class="k-a" style="{st}" cx="12" cy="12" r="10.06" fill="none" stroke="currentColor" '
            f'stroke-width="3.87" pathLength="1" stroke-dasharray="1" transform="rotate(-90 12 12)"/></svg>')


# Pin de ubicación: glifo «ubicacion» de AXIS (resolveIcon, línea growth, fondo oscuro) en reposo; la esfera es de la palabra.
PIN = '<svg class="k-pin" xmlns="http://www.w3.org/2000/svg" viewBox="4.1 1.6 15.8 21.2" aria-hidden="true" focusable="false"><g fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5L6.31 13.58A7 7 0 1 1 17.69 13.58z"/><path d="M9.5 9.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0"/></g></svg>'


def c_zocalo():
    T = T0
    # Norma: contexto con anillo + palabra con esfera; la palabra mide al menos 3× el contexto (32 → 96 px).
    return T, (f'<div class="k-bed c-bl k-a" style="--f:96;left:var(--sl);bottom:var(--zb);{wipe("zl-bed", T, "l", TIN, TOUT)}">'
               f'<div class="k-ctx k-ctxr k-a" style="font-size:32px;{up("zl-ctx", T, TIN + 2 * F, TOUT)}">{ring_svg("zl-r", T, TIN + 2 * F)}Lunes · 09:12</div>'
               f'<div class="k-B k-a" style="font-size:96px;{up("zl-w", T, TIN + 4 * F, TOUT)}">{PIN}CDMX{SPH(esf("zl-e", T, BEAT, TOUT))}</div></div>')


def c_persona():
    T = T0
    # Mismo orden que el zócalo de lugar: el cargo es el contexto (anillo), el nombre es la palabra (esfera); 30 → 90 px.
    return T, (f'<div class="k-bed c-bl k-a" style="--f:90;left:var(--sl);bottom:var(--zb);{wipe("zp-bed", T, "l", TIN, TOUT)}">'
               f'<div class="k-ctx k-ctxr k-a" style="font-size:30px;{up("zp-c", T, TIN + 2 * F, TOUT)}">{ring_svg("zp-r", T, TIN + 2 * F)}Directora de marketing</div>'
               f'<div class="k-B k-a" style="font-size:90px;{up("zp-w", T, TIN + 4 * F, TOUT)}">Paula Méndez{SPH(esf("zp-e", T, BEAT, TOUT))}</div></div>')


def c_remate():
    T = T0
    return T, (f'<div class="k-bed c-tr k-a" style="--f:124;top:var(--top);right:var(--sr);{wipe("rm-bed", T, "r", TIN, TOUT)}">'
               f'<div class="k-B k-a" style="font-size:124px;{up("rm-w", T, TIN + 2 * F, TOUT)}">Ya está{SPH(esf("rm-e", T, BEAT, TOUT))}</div></div>')


def c_remate_q():
    T = T0
    # Regla 3×: la respuesta (124 px) mide 3,1 veces la pregunta (40 px).
    return T, (f'<div class="k-bed c-tr k-a" style="--f:124;top:var(--top);right:var(--sr);{wipe("rq-bed", T, "r", TIN, TOUT)}">'
               f'<div class="k-q k-a" style="{up("rq-q", T, TIN + 2 * F, TOUT)}">{ring_svg("rq-r", T, TIN + 2 * F)}¿Para ayer?</div>'
               f'<div class="k-B k-a" style="font-size:124px;{up("rq-w", T, TIN + 5 * F, TOUT)}">Ya está{SPH(esf("rq-e", T, BEAT, TOUT))}</div></div>')


def sub_c(pre, T, lines, tin, tout, style='', ink='glass', who='l', ask=True):
    """Subtítulo de video: vidrio denso (estándar) o tinta navy sin caja (sólo papel o interfaz).
    who: lado de quien habla (l/r) → esquina recta y alineación. ask: es pregunta → anillo que se dibuja.
    El fundido va en el mismo elemento del desenfoque: un padre con opacidad cortaría el vidrio."""
    spans = ''.join(f'<span>{l}</span>' for l in lines)
    cls = ('k-glass' if ink == 'glass' else 'k-ink') + (' c-bl' if who == 'l' else ' c-br')
    ring = ring_svg(pre + 'r', T, tin, 'var(--acc)' if ink == 'glass' else 'var(--accl)') if ask else ''
    side = 'flex-start' if who == 'l' else 'flex-end'
    return (f'<div class="k-subw" style="justify-content:{side};{style}"><div class="{cls} k-a" style="{fade(pre, T, tin, tout)}">'
            f'{ring}<div class="k-subt">{spans}</div></div></div>')


def c_sub():
    T = 4.0
    return T, sub_c('sa', T, ['¿Para cuándo la necesitas?'], .25, 1.7, who='r') + sub_c('sp', T, ['…¿Para ayer?'], 1.9, 3.4, who='l')


ZONES_01 = [('cara', (.24, .25, .44, .41)), ('cara', (.81, .28, .90, .35)), ('mano', (.39, .62, .50, .69)), ('mano', (.64, .50, .74, .59))]


def zones(fmt):
    out = []
    for lab, (x0, y0, x1, y1) in ZONES_01:
        if fmt == 'f916':  # recorte central del 4:5 al 9:16: la imagen mide 1536 px de ancho y se corta 228 por lado
            x0, x1 = (x0 * 1536 - 228) / 1080, (x1 * 1536 - 228) / 1080
        x0, x1 = max(x0, 0), min(x1, 1)
        if x1 <= 0 or x0 >= 1:
            continue
        out.append(f'<div class="k-zone" style="left:{x0*100:.1f}%;top:{y0*100:.1f}%;width:{(x1-x0)*100:.1f}%;height:{(y1-y0)*100:.1f}%"><b>{lab}</b></div>')
    return ''.join(out)


def c_bub():
    T = T0
    words = [('Seis semanas', 48, .25), ('Casting', 56, .5), ('Locación', 66, .75), ('Otra cotización', 96, BEAT)]
    bubs = []
    for w, fs, t in reversed(words):
        if w == 'Otra cotización':
            st = K.anim('bb-h', T, [(t - 5 * F, 'transform:scale(0) translateY(-25%)', EXPO), (t, 'transform:scale(1.14) translateY(0)', IO),
                                    (t + 3 * F, 'transform:scale(1) translateY(0)', LIN), (TOUT - E, 'transform:scale(1) translateY(0)', LIN), (TOUT, 'transform:scale(0) translateY(0)', LIN)])
            inner = w + SPH_STATIC
        else:
            st = K.anim(f'bb-{fs}', T, [(t, 'transform:scale(0)', EXPO), (t + 5 * F, 'transform:scale(1.08)', IO), (t + 7 * F, 'transform:scale(1)', LIN),
                                        (TOUT - E, 'transform:scale(1)', LIN), (TOUT, 'transform:scale(0)', LIN)])
            inner = w
        bubs.append(f'<div class="k-bub k-a" style="font-size:{fs}px;{st}">{inner}</div>')
    p = [(0, 'transform:translate(0,0)', LIN)]
    for k, (_, _, t) in enumerate(words[1:], 1):
        t0 = t - 5 * F if k == 3 else t
        p += [(t0, f'transform:translate(0,{-(k-1)*8}px)', EXPO), (t0 + 4 * F, f'transform:translate(0,{-k*8}px)', LIN)]
    p += [(BEAT + 3 * F, 'transform:translate(0,-24px)', LIN), (BEAT + 4 * F, 'transform:translate(7px,-24px)', LIN),
          (BEAT + 5 * F, 'transform:translate(-6px,-24px)', LIN), (BEAT + 6 * F, 'transform:translate(0,-24px)', LIN), (TOUT, 'transform:translate(0,-24px)', LIN)]
    return T, f'<div class="k-stack k-a" style="left:var(--sl);bottom:calc(var(--bb) - 24px);{K.anim("bb-st", T, p)}">{"".join(bubs)}</div>'


def c_dato():
    T = T0
    disc = K.anim('dt-disc', T, [(TIN, 'clip-path:circle(0% at 50% 50%)', EXPO), (TIN + 10 * F, 'clip-path:circle(50% at 50% 50%)', LIN),
                                (TOUT - 6 * F, 'clip-path:circle(50% at 50% 50%);opacity:1', EIN), (TOUT, 'clip-path:circle(50% at 50% 50%);opacity:0', LIN)])
    arc = K.anim('dt-arc', T, [(TIN + 3 * F, 'stroke-dashoffset:1', IO), (BEAT, 'stroke-dashoffset:0', LIN)])
    dot = K.anim('dt-dot', T, [(BEAT - 4 * F, 'transform:scale(0)', EXPO), (BEAT, 'transform:scale(1.1)', IO), (BEAT + 2 * F, 'transform:scale(1)', LIN)])
    return T, (f'<div class="k-center"><div class="k-disc k-a" style="{disc}">'
               f'<svg width="560" height="560" viewBox="0 0 560 560" style="position:absolute;left:0;top:0;overflow:visible">'
               f'<circle cx="280" cy="280" r="236" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="6"/>'
               f'<path class="k-a" style="{arc}" pathLength="1" stroke-dasharray="1" d="M280 44 A236 236 0 0 1 508.0 341.1" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>'
               f'<circle class="k-a" style="transform-box:fill-box;transform-origin:center;{dot}" cx="508.0" cy="341.1" r="17" fill="currentColor"/></svg>'
               f'<div class="k-ctx k-a" style="font-size:40px;{up("dt-l", T, TIN + 4 * F, TOUT + 5, True)}">Este video</div>'
               f'<div class="k-B k-a" style="font-size:150px;{up("dt-n", T, BEAT - 5 * F, TOUT + 5, True)}">36 h</div>'
               f'<div class="k-src k-a" style="{up("dt-s", T, BEAT + 2 * F, TOUT + 5, True)}">Fuente:<br>registro de producción</div></div></div>')


CLAQ = '<svg class="k-lico" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 48 48" overflow="visible" aria-hidden="true" focusable="false"><g><path d="M4989 6565 c-3 -2 -54 -11 -114 -19 -61 -9 -144 -22 -185 -30 -140 -27 -235 -46 -300 -60 -36 -8 -101 -22 -145 -31 -148 -32 -200 -43 -270 -60 -92 -22 -185 -43 -265 -60 -36 -8 -94 -20 -130 -28 -36 -8 -99 -22 -140 -31 -41 -9 -104 -23 -140 -31 -36 -8 -96 -22 -135 -30 -151 -32 -362 -83 -560 -135 -66 -18 -145 -38 -175 -45 -30 -8 -80 -21 -110 -29 -76 -21 -154 -42 -225 -61 -128 -35 -162 -44 -215 -60 -30 -9 -77 -23 -105 -30 -49 -13 -113 -32 -205 -61 -25 -7 -67 -20 -95 -28 -27 -8 -75 -22 -105 -31 -30 -9 -75 -23 -100 -30 -25 -7 -85 -27 -135 -45 -49 -17 -124 -42 -165 -56 -41 -14 -87 -31 -102 -39 -14 -8 -31 -15 -38 -15 -19 0 -183 -84 -247 -126 -134 -90 -269 -259 -321 -404 -52 -142 -56 -169 -56 -345 0 -192 8 -238 88 -510 19 -65 62 -179 86 -230 96 -200 99 -221 71 -400 -12 -78 -13 -359 -1 -555 77 -1253 160 -1988 251 -2205 5 -11 13 -33 19 -50 24 -65 103 -185 163 -246 85 -87 143 -125 292 -189 110 -47 380 -65 735 -51 151 7 286 14 300 17 14 2 97 11 185 19 168 15 362 35 580 59 572 64 666 74 1095 120 74 8 153 17 175 21 22 3 87 10 145 15 58 5 168 16 245 24 193 21 412 43 590 61 400 41 500 57 665 110 48 16 149 73 208 118 54 42 72 60 139 140 63 74 132 258 155 407 27 175 14 813 -22 1150 -6 52 -15 151 -20 220 -12 152 -37 394 -44 435 -4 17 -11 75 -16 130 -25 256 -65 459 -110 560 -7 17 -20 46 -28 65 -60 140 -176 245 -332 303 -60 22 -274 50 -325 43 -22 -4 -123 -13 -225 -22 -328 -27 -666 -58 -980 -89 -85 -9 -220 -22 -300 -30 -80 -8 -203 -21 -275 -30 -71 -8 -193 -22 -270 -30 -77 -8 -201 -22 -275 -30 -74 -8 -198 -22 -275 -30 -77 -8 -196 -22 -265 -30 -374 -44 -430 -41 -454 28 -27 76 58 129 329 202 106 28 253 69 311 86 16 5 50 13 75 18 41 9 213 53 339 88 30 8 80 21 110 28 59 15 355 91 485 125 44 12 98 25 120 30 22 5 92 22 155 39 141 37 274 71 585 151 132 34 263 68 290 76 28 7 75 20 105 28 196 51 291 77 335 90 28 8 68 20 90 26 386 110 499 363 375 835 -25 93 -43 152 -56 182 -8 17 -14 36 -14 42 0 23 -112 254 -131 271 -3 3 -10 12 -15 21 -61 108 -223 220 -368 253 -62 15 -296 23 -307 11z m-392 -517 c43 -22 148 -114 287 -254 425 -428 429 -483 46 -571 -308 -70 -314 -69 -455 57 -227 205 -262 237 -290 265 -17 17 -75 70 -128 119 -110 100 -137 138 -137 189 0 74 55 99 405 184 33 8 74 18 90 23 59 16 136 11 182 -12z m-1660 -367 c41 -8 143 -77 219 -147 16 -16 79 -73 140 -126 117 -103 321 -307 348 -348 41 -62 16 -122 -67 -160 -59 -26 -81 -33 -222 -65 -33 -8 -89 -21 -125 -30 -277 -67 -311 -60 -470 89 -36 34 -82 75 -103 92 -114 95 -406 389 -423 426 -45 100 59 161 401 235 191 42 237 47 302 34z m-1650 -549 c87 -45 470 -408 567 -535 82 -109 32 -174 -167 -217 -107 -23 -144 -32 -173 -41 -132 -40 -222 8 -409 221 -22 25 -75 85 -118 132 -197 218 -219 281 -131 365 25 24 57 49 72 55 135 55 278 63 359 20z m3668 -2060 c171 -92 167 -305 -7 -396 -56 -30 -91 -37 -283 -60 -66 -8 -176 -22 -245 -31 -69 -8 -186 -22 -260 -31 -74 -8 -191 -22 -260 -30 -216 -25 -391 -43 -510 -54 -63 -5 -128 -12 -145 -15 -39 -7 -369 -40 -760 -75 -66 -6 -156 -15 -200 -20 -188 -22 -444 -33 -500 -22 -187 38 -253 245 -121 377 57 56 153 85 366 110 30 3 75 10 100 15 25 6 83 15 130 20 47 6 137 17 200 25 351 46 805 99 1035 119 88 8 178 17 200 21 22 3 96 10 165 15 313 24 542 42 620 50 170 16 430 6 475 -18z m-905 -1073 c96 -55 123 -101 124 -203 0 -122 -67 -199 -214 -244 -34 -11 -73 -16 -350 -48 -69 -7 -179 -21 -245 -29 -66 -8 -183 -22 -260 -30 -77 -8 -201 -21 -275 -30 -188 -21 -383 -42 -525 -54 -66 -6 -161 -16 -212 -21 -151 -16 -206 -11 -295 30 -38 18 -87 91 -97 147 -29 151 71 268 245 288 33 4 75 11 94 15 19 5 78 14 130 20 52 5 149 17 215 25 66 8 179 21 250 29 72 8 144 18 160 21 17 3 75 10 130 15 101 10 252 26 530 56 83 9 184 20 225 24 121 13 341 6 370 -11z" transform="translate(24 24) scale(0.046589) translate(-330.5 -338.5) translate(0.000000,677.000000) scale(0.100000,-0.100000)" fill="#ffffff"/></g></svg>'


def c_comp(bp):
    T = 3.5
    tin, beat, tout = .25, 1.5, 3.0
    card = wipe('cp-bed', T, 'l', tin, tout)
    b1 = K.anim('cp-b1', T, [(tin + 8 * F, 'transform:scaleX(0)', IO), (beat - 6 * F, 'transform:scaleX(1)', LIN)])
    b2 = K.anim('cp-b2', T, [(beat - 3 * F, 'transform:scaleX(0)', EXPO), (beat, 'transform:scaleX(1)', LIN)])
    # La etiqueta acepta un ícono Trazo en reposo, un logo o un isotipo oficial, alineados a la altura de la versal.
    row = lambda lab, val, cls, bar, w, ts, extra='': (
        f'<div class="k-row"><div class="k-ctx k-lab k-a" style="font-size:34px;{up("cp-l" + cls, T, ts, tout)}">{lab}</div>'
        f'<div class="k-B k-a {cls}" style="font-size:72px;{up("cp-v" + cls, T, ts + 2 * F, tout)}">{val}{extra}</div>'
        f'<div class="k-track"><div class="k-fill {cls} k-a" style="width:{w}%;{bar}"></div></div></div>')
    return T, (f'<div class="k-bed c-bl k-a k-cmp" style="--f:72;{card}">'
               + row(f'{CLAQ}Producción tradicional', '6 semanas', 'old', b1, 100, tin + 3 * F)
               + row(f'Con <img class="k-llogo" src="{bp}" alt="BytePlus">', '36 h', 'new', b2, 7, beat - 8 * F, SPH(esf('cp-e', T, beat, tout)))
               + '</div>')


def c_cita():
    T = 3.5
    tin, beat, tout = .25, 1.5, 3.0
    # Cita con aire: interlineado propio (las líneas recortadas a la versal quedan a .42 em), tracking menos cerrado,
    # peso 640 y lecho con más margen; la atribución se separa de la voz con su propio respiro.
    return T, (f'<div class="k-bed k-cite c-tl k-a" style="--f:64;top:var(--top);left:var(--sl);max-width:calc(100% - var(--sl) - var(--sr));{wipe("ct-bed", T, "l", tin, tout)}">'
               f'<div class="k-cq">'
               f'<div class="k-B k-a" style="font-size:64px;{up("ct-q1", T, tin + 2 * F, tout)}">Tenía la campaña antes de</div>'
               f'<div class="k-B k-a" style="font-size:64px;{up("ct-q2", T, tin + 4 * F, tout)}">terminar el café{SPH(esf("ct-e", T, beat, tout))}</div></div>'
               f'<div class="k-ctx k-a" style="font-size:32px;{up("ct-a", T, tin + 7 * F, tout)}">Paula Méndez · Directora de marketing</div></div>')


def c_cartela():
    T = 3.5
    tin, beat, tout = .25, 1.25, 3.0
    panel = K.anim('cr-p', T, [(tin, 'transform:translateX(-101%)', EXPO), (tin + 10 * F, 'transform:translateX(0)', LIN),
                               (tout - 9 * F, 'transform:translateX(0)', IO), (tout, 'transform:translateX(101%)', LIN)])
    # Norma: la palabra del capítulo va dentro del anillo y la órbita mide el avance (capítulo 1 de 3 = un tercio).
    # La esfera es la de la punta del arco: la palabra no lleva otra (una esfera por pantalla).
    trk = K.anim('cr-k', T, [(tin + 8 * F, 'opacity:0', LIN), (tin + 14 * F, 'opacity:1', LIN)])
    arc = K.anim('cr-a', T, [(tin + 12 * F, 'stroke-dashoffset:1', IO), (beat, 'stroke-dashoffset:0.6667', LIN)])
    tip = K.anim('cr-s', T, [(beat - 4 * F, 'transform:scale(0)', EXPO), (beat, 'transform:scale(1.1)', IO), (beat + 2 * F, 'transform:scale(1)', LIN)])
    return T, (f'<div class="k-panel k-a" style="{panel}"><div class="k-center">'
               f'<div style="position:relative;width:640px;height:640px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">'
               f'<svg width="640" height="640" viewBox="0 0 640 640" style="position:absolute;inset:0;overflow:visible">'
               f'<circle class="k-a" style="{trk}" cx="320" cy="320" r="300" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="5"/>'
               f'<circle class="k-a" style="{arc}" cx="320" cy="320" r="300" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" pathLength="1" stroke-dasharray="1" transform="rotate(-90 320 320)"/>'
               f'<circle class="k-a" style="transform-box:fill-box;transform-origin:center;{tip}" cx="579.8" cy="470" r="22" fill="currentColor"/></svg>'
               f'<div class="k-B k-a" style="font-size:96px;{up("cr-t", T, tin + 11 * F, tout - 6 * F)}">El kickoff</div>'
               f'<div class="k-ctx k-a" style="font-size:34px;{up("cr-n", T, tin + 13 * F, tout - 6 * F)}">capítulo 1 de 3</div>'
               f'</div></div></div>')


def c_cierre(logo):
    T = 3.5
    tin, beat, tout = .25, 1.25, 3.5
    panel = K.anim('ci-p', T, [(tin, 'clip-path:inset(0 100% 0 0)', EXPO), (tin + 10 * F, 'clip-path:inset(0 0 0 0)', LIN), (tout - 6 * F, 'opacity:1;clip-path:inset(0 0 0 0)', EIN), (tout, 'opacity:0;clip-path:inset(0 0 0 0)', LIN)])
    lg = K.anim('ci-lg', T, [(beat + 6 * F, 'opacity:0;transform:translateY(16px)', EXPO), (beat + 14 * F, 'opacity:1;transform:translateY(0)', LIN)])
    return T, (f'<div class="k-panel k-a" style="{panel}"><div class="k-center" style="gap:44px;padding-bottom:6%">'
               f'<div class="k-B k-a" style="font-size:150px;{up("ci-w", T, tin + 8 * F, tout + 5, True)}">Hablemos{SPH(esf("ci-e", T, beat, tout + 5))}</div>'
               # Siempre que va la URL, va la burbuja URL oficial (AXIS brand-assets, versión horneada para fondo oscuro).
               f'<div class="k-urlb k-a" style="{up("ci-u", T, beat + 3 * F, tout + 5, True)}">{URL_BUBBLE}</div></div>'
               f'<img class="k-logo k-a" style="{lg}" src="{logo}" alt="Efeonce"></div>')


def c_barrido(src):
    T = 3.0
    a = K.anim('tw-a', T, [(0, 'opacity:1', LIN), (.62 - E, 'opacity:1', LIN), (.62, 'opacity:0', LIN), (T - E, 'opacity:0', LIN), (T, 'opacity:1', LIN)])
    # El panel es más ancho que el cuadro (su borde redondeado queda fuera) y cubre entero antes del corte (.62) con
    # margen: así ningún formato deja ver esquinas ni una franja del plano anterior mientras tapa.
    pnl = K.anim('tw-p', T, [(.30, 'transform:translateX(-101%)', IO), (.57, 'transform:translateX(0)', LIN), (.68, 'transform:translateX(0)', IO), (.95, 'transform:translateX(101%)', LIN)])
    return T, (f'<img class="k-pl" src="{src("13")}" alt="Plano siguiente"><img class="k-pl k-a" style="{a}" src="{src("05")}" alt="Plano anterior">'
               f'<div class="k-panel k-sweep k-a" style="{pnl}"></div>'
               f'<div class="k-loopend k-a" style="{K.anim("tw-z", T, [(2.5, "opacity:0", LIN), (2.8, "opacity:1", LIN), (T - E, "opacity:1", LIN), (T, "opacity:0", LIN)])}"></div>')


def c_iris(src):
    T = 3.0
    beat = 1.0
    # El anillo (lo abierto) se dibuja en el golpe y se abre revelando el plano siguiente. La esfera no se agranda nunca.
    ring = K.anim('ti-r', T, [(beat - 6 * F, 'width:96px;height:96px;stroke-dashoffset:1;opacity:1', EXPO), (beat, 'width:96px;height:96px;stroke-dashoffset:0;opacity:1', IO),
                              (beat + 16 * F, 'width:4600px;height:4600px;stroke-dashoffset:0;opacity:0', LIN), (T, 'width:4600px;height:4600px;stroke-dashoffset:0;opacity:0', LIN)])
    # El radio va en % del cuadro (no en px) para cubrir igual 4:5, 16:9 y 9:16, y al terminar el iris el plano anterior
    # se apaga: aunque un navegador recorte distinto el círculo, ya no queda nada del plano inicial a la vista.
    b = K.anim('ti-b', T, [(beat, 'clip-path:circle(4% at 68% 34%)', IO), (beat + 16 * F, 'clip-path:circle(160% at 68% 34%)', LIN), (T - E, 'clip-path:circle(160% at 68% 34%)', LIN), (T, 'clip-path:circle(0% at 68% 34%)', LIN)])
    a0 = K.anim('ti-a0', T, [(0, 'opacity:1', LIN), (beat + 16 * F, 'opacity:1', LIN), (beat + 16 * F + E, 'opacity:0', LIN), (T - E, 'opacity:0', LIN), (T, 'opacity:1', LIN)])
    b0 = K.anim('ti-b0', T, [(0, 'opacity:0', LIN), (beat - E, 'opacity:0', LIN), (beat, 'opacity:1', LIN), (T - E, 'opacity:1', LIN), (T, 'opacity:0', LIN)])
    return T, (f'<img class="k-pl k-a" style="{a0}" src="{src("05")}" alt="Plano anterior"><div class="k-a" style="position:absolute;inset:0;{b0}"><img class="k-pl k-a" style="{b}" src="{src("13")}" alt="Plano siguiente"></div>'
               f'<svg class="k-iris k-a" style="{ring}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="5" vector-effect="non-scaling-stroke" pathLength="1" stroke-dasharray="1" transform="rotate(-90 50 50)"/></svg>'
               f'<div class="k-loopend k-a" style="{K.anim("ti-z", T, [(2.5, "opacity:0", LIN), (2.8, "opacity:1", LIN), (T - E, "opacity:1", LIN), (T, "opacity:0", LIN)])}"></div>')


def c_callout(src):
    """Callout con selección (receta aprobada en AXIS), con vida: el cursor del colaborador entra en arco, hace clic,
    arrastra la caja sobre el objeto y la suelta en el golpe; las manijas aparecen una tras otra, el borde corre como
    una selección real y el rol salta junto al cursor. La caja la declara el intent según el plano (variables por formato)."""
    T = T0
    PRESS, REL = .70, BEAT                    # clic y suelta: la caja termina de arrastrarse justo en el golpe
    X0, Y0 = 'calc(var(--cx) + var(--cw))', 'var(--cy)'          # esquina donde hace clic (arriba a la derecha)
    X1, Y1 = 'var(--cx)', 'calc(var(--cy) + var(--ch))'          # esquina donde suelta (abajo a la izquierda)
    cur = K.anim('cs-cur', T, [
        (TIN, f'opacity:0;left:calc(var(--cx) + var(--cw) + 16%);top:calc(var(--cy) - 12%)', EXPO),
        (TIN + 6 * F, f'opacity:1;left:calc(var(--cx) + var(--cw) + 7%);top:calc(var(--cy) - 9%)', IO),
        (PRESS, f'opacity:1;left:{X0};top:{Y0}', IO),
        (REL, f'opacity:1;left:{X1};top:{Y1}', LIN),
        (TOUT - 7 * F, f'opacity:1;left:{X1};top:{Y1}', EIN),
        (TOUT, f'opacity:0;left:calc(var(--cx) - 4%);top:calc(var(--cy) + var(--ch) + 5%)', LIN)])
    press = K.anim('cs-pr', T, [(PRESS - 2 * F, 'transform:scale(1)', IO), (PRESS + 2 * F, 'transform:scale(.82)', LIN),
                                (REL, 'transform:scale(.82)', EXPO), (REL + 4 * F, 'transform:scale(1)', LIN)])
    tag = K.anim('cs-tag', T, [(REL - E, 'opacity:0;transform:scale(.6)', EXPO), (REL + 5 * F, 'opacity:1;transform:scale(1.06)', IO),
                               (REL + 9 * F, 'opacity:1;transform:scale(1)', LIN), (TOUT - 7 * F, 'opacity:1;transform:scale(1)', EIN), (TOUT, 'opacity:0;transform:scale(.9)', LIN)])
    box = K.anim('cs-box', T, [(PRESS, 'opacity:0;width:0;height:0', LIN), (PRESS + E, 'opacity:1;width:0;height:0', IO),
                               (REL, 'opacity:1;width:var(--cw);height:var(--ch)', LIN),
                               (TOUT - 6 * F, 'opacity:1;width:var(--cw);height:var(--ch)', EIN), (TOUT, 'opacity:0;width:var(--cw);height:var(--ch)', LIN)])
    hs = ''
    for i, (x, y) in enumerate([(100, 0), (50, 0), (0, 0), (0, 50), (0, 100), (50, 100), (100, 100), (100, 50)]):
        t = REL + i * F
        h = K.anim(f'cs-h{i}', T, [(t - E, 'transform:scale(0)', EXPO), (t + 4 * F, 'transform:scale(1.3)', IO), (t + 7 * F, 'transform:scale(1)', LIN)])
        hs += f'<i class="k-a" style="left:{x}%;top:{y}%;{h}"></i>'
    return T, (f'<div class="k-cs">'
               f'<div class="k-sel k-a" style="{box}"><b class="k-ants"></b>{hs}</div>'
               f'<div class="k-cur k-a" style="{cur}"><svg class="k-a" style="{press}" width="54" height="58" viewBox="0 0 18 19">'
               f'<path d="M1 1 L17 8 L9.5 10 L7 18 Z" fill="#5B4BFF" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>'
               f'<span class="k-a" style="{tag}">Dirección de arte</span></div></div>')


def c_split(src):
    """Pantalla dividida (receta aprobada): dos planos, divisor teal de 6 px, una palabra por lado, la esfera en la última."""
    T = T0
    div = K.anim('ss-d', T, [(TIN, 'transform:scale(0)', EXPO), (TIN + 8 * F, 'transform:scale(1)', LIN)])
    w1 = up('ss-w1', T, TIN + 6 * F, TOUT)
    w2 = up('ss-w2', T, TIN + 12 * F, TOUT)
    return T, (f'<div class="k-split"><div class="k-half"><img src="{src("03")}" alt="Antes">'
               f'<div class="k-bed c-bl k-a" style="--f:90;left:var(--sl);bottom:8%;{wipe("ss-b1", T, "l", TIN + 4 * F, TOUT)}"><div class="k-B k-a" style="font-size:90px;{w1}">Antes.</div></div></div>'
               f'<div class="k-half"><img src="{src("12")}" alt="Ahora">'
               f'<div class="k-bed c-bl k-a" style="--f:90;left:var(--sl);bottom:8%;{wipe("ss-b2", T, "l", TIN + 10 * F, TOUT)}"><div class="k-B k-a" style="font-size:90px;{w2}">Ahora{SPH(esf("ss-e", T, BEAT, TOUT))}</div></div></div>'
               f'<div class="k-div k-a" style="{div}"></div></div>')


# ---------- íconos en video: glifos reales de AXIS (resolveIcon / skewedOrbitHeroSvg / brand-assets) ----------
import json as _json
ICONS = _json.load(open(os.path.join(HERE, 'icons.json')))

VOL_CLAQUETA = '/_blob/63546cb6ec946d93a04c96c560559556'
VOL_CLAQUETA_LOCAL = 'file://' + PROJ + '/img/vol-claqueta.png'


def _svg_with(svg, cls, style):
    return svg.replace('<svg ', f'<svg class="{cls}" style="{style}" ', 1)


def icon_trazo(name, T, glyph, tin, tout, respond_at=None):
    """Trazo: se dibuja en 8 cuadros (el trazo avanza); si responde, en el golpe cambia a su estado con esfera."""
    rest = ICONS[f'{glyph}-rest'].replace('<path ', '<path pathLength="1" stroke-dasharray="1" ')
    draw = K.anim(name + 'd', T, [(tin, 'stroke-dashoffset:1;opacity:1', EXPO), (tin + 8 * F, 'stroke-dashoffset:0;opacity:1', LIN)]
                  + ([(respond_at - 2 * F, 'stroke-dashoffset:0;opacity:1', LIN), (respond_at, 'stroke-dashoffset:0;opacity:0', LIN)] if respond_at else []))
    out = _svg_with(rest, 'k-a', draw)
    if respond_at:
        resp = ICONS[f'{glyph}-response']
        show = K.anim(name + 'r', T, [(respond_at - 2 * F, 'opacity:0', LIN), (respond_at, 'opacity:1', LIN), (tout - E, 'opacity:1', LIN), (tout, 'opacity:0', LIN)])
        pop = K.anim(name + 'p', T, [(respond_at - 2 * F, 'transform:scale(0)', EXPO), (respond_at + 2 * F, 'transform:scale(1.1)', IO), (respond_at + 4 * F, 'transform:scale(1)', LIN)])
        resp = resp.replace('<circle ', f'<circle class="k-a" style="transform-box:fill-box;transform-origin:center;{pop}" ')
        out += _svg_with(resp, 'k-a k-ico-r', show)
    return f'<span class="k-ico" style="width:64px;height:64px">{out}</span>'


def icon_plast(name, T, glyph, tin, tout, respond_at=None):
    """Plastilina: entra por máscara con su texto; si responde, en el golpe aparece la esfera con su anillo calado."""
    rest = ICONS[f'{glyph}-rest']
    out = rest
    if respond_at:
        hide = K.anim(name + 'h', T, [(respond_at - 2 * F, 'opacity:1', LIN), (respond_at, 'opacity:0', LIN), (T - E, 'opacity:0', LIN), (T, 'opacity:1', LIN)])
        out = _svg_with(rest, 'k-a', hide)
        resp = ICONS[f'{glyph}-response']
        show = K.anim(name + 'r', T, [(respond_at - 2 * F, 'opacity:0', LIN), (respond_at, 'opacity:1', LIN), (T - E, 'opacity:1', LIN), (T, 'opacity:0', LIN)])
        pop = K.anim(name + 'p', T, [(respond_at - 2 * F, 'transform:scale(0)', EXPO), (respond_at + 2 * F, 'transform:scale(1.1)', IO), (respond_at + 4 * F, 'transform:scale(1)', LIN)])
        resp = resp.replace('<circle cx', f'<circle class="k-a" style="transform-box:fill-box;transform-origin:center;{pop}" cx')
        out += _svg_with(resp, 'k-a k-ico-r', show)
    return f'<span class="k-ico" style="width:96px;height:96px">{out}</span>'


def c_lista_trazo():
    T = 3.5
    tin, tout = .25, 3.2
    rows = [('contenido', 'Guion en una tarde', .5), ('ia', 'Generación con BytePlus', 1.0), ('medicion', 'Medido en vivo', 1.5)]
    items = ''.join(
        f'<div class="k-li">{icon_trazo("lt" + str(i), T, g, at, tout, respond_at=2.0 if i == 2 else None)}'
        f'<span class="k-lt k-a" style="{up("lt" + str(i) + "t", T, at + 2 * F, tout)}">{txt}</span></div>'
        for i, (g, txt, at) in enumerate(rows))
    return T, (f'<div class="k-bed c-bl k-a" style="--f:70;left:var(--sl);bottom:var(--zb);gap:26px;{wipe("lt-bed", T, "l", tin, tout)}">'
               f'<div class="k-ctx k-ctxr k-a" style="font-size:32px;{up("lt-c", T, tin + 2 * F, tout)}">{ring_svg("lt-rg", T, tin + 2 * F)}Cómo lo hicimos</div>{items}</div>')


def c_lista_plast():
    T = 3.5
    tin, tout = .25, 3.2
    rows = [('lapiz', 'Guion', .5), ('claqueta', 'Rodaje', 1.0), ('reproducir', 'Montaje', 1.5)]
    items = ''.join(
        f'<div class="k-li k-a" style="{up("lp" + str(i), T, at, tout)}">{icon_plast("lp" + str(i) + "i", T, g, at, tout, respond_at=2.0 if i == 2 else None)}'
        f'<span class="k-lt">{txt}</span></div>'
        for i, (g, txt, at) in enumerate(rows))
    return T, (f'<div class="k-bed c-bl k-a" style="--f:70;left:var(--sl);bottom:var(--zb);gap:22px;{wipe("lp-bed", T, "l", tin, tout)}">'
               f'<div class="k-ctx k-ctxr k-a" style="font-size:32px;{up("lp-c", T, tin + 2 * F, tout)}">{ring_svg("lp-rg", T, tin + 2 * F)}Lo que creamos</div>{items}</div>')


def c_canal():
    T = T0
    li = ICONS['linkedin'].replace('<svg ', '<svg class="k-plat" ', 1)
    return T, (f'<div class="k-bed c-bl k-a" style="--f:96;left:var(--sl);bottom:var(--zb);{wipe("ch-bed", T, "l", TIN, TOUT)}">'
               f'<div class="k-ctx k-ctxr k-a" style="font-size:32px;{up("ch-c", T, TIN + 2 * F, TOUT)}">{li}LinkedIn · lunes 09:15</div>'
               f'<div class="k-B k-a" style="font-size:96px;{up("ch-w", T, TIN + 4 * F, TOUT)}">Publicado{SPH(esf("ch-e", T, BEAT, TOUT))}</div></div>')


def c_orbita():
    T = 3.5
    tin, tout = .25, 3.2
    panel = K.anim('ob-p', T, [(tin, 'opacity:0', LIN), (tin + 6 * F, 'opacity:1', LIN), (tout - 6 * F, 'opacity:1', EIN), (tout, 'opacity:0', LIN)])
    orb = K.anim('ob-o', T, [(tin + 4 * F, 'opacity:0;transform:scale(.94)', EXPO), (tin + 16 * F, 'opacity:1;transform:scale(1)', LIN)])
    return T, (f'<div class="k-panel k-a" style="{panel}">'
               f'<div class="k-orb k-a" style="{orb}">{ICONS["orbit-sq"]}</div>'
               f'<div class="k-orbt"><div class="k-B k-a" style="font-size:96px;{up("ob-t", T, 1.0, tout)}">Rodaje sin set</div>'
               f'<div class="k-ctx k-a" style="font-size:32px;margin-top:22px;{up("ob-c", T, 1.0 + 3 * F, tout)}">Plastilina con su órbita sesgada</div></div></div>')


def c_volumen(vol):
    T = 3.5
    tin, beat, tout = .25, 1.0, 3.2
    panel = K.anim('vo-p', T, [(tin, 'opacity:0', LIN), (tin + 6 * F, 'opacity:1', LIN), (tout - 6 * F, 'opacity:1', EIN), (tout, 'opacity:0', LIN)])
    pop = K.anim('vo-i', T, [(beat - 6 * F, 'transform:scale(0)', EXPO), (beat, 'transform:scale(1.06)', IO), (beat + 3 * F, 'transform:scale(1)', LIN)])
    return T, (f'<div class="k-panel k-a" style="{panel}">'
               f'<img class="k-vol k-a" style="{pop}" src="{vol}" alt="Claqueta en volumen">'
               f'<div class="k-orbt"><div class="k-B k-a" style="font-size:96px;{up("vo-t", T, beat + 4 * F, tout)}">Rodaje sin set</div>'
               f'<div class="k-ctx k-a" style="font-size:32px;margin-top:22px;{up("vo-c", T, beat + 7 * F, tout)}">Plastilina en volumen</div></div></div>')


COMPONENTS = [
 # id, nombre, nuevo, full-frame, qué es, especificación, función
 ('zl', 'Zócalo de lugar', False, False, 'Contexto: lugar, hora, idioma.',
  'Como en la norma: contexto con anillo (Poppins 32 px) y palabra con esfera (Bricolage 96 px, 3×) · si la palabra es un lugar, lleva delante el pin de ubicación de AXIS (glifo «ubicacion», Trazo), a la altura de la versal y en reposo, porque la esfera ya es de la palabra · nace del borde izquierdo (esquina recta abajo a la izquierda) · 4:5 al 20 % del borde inferior; 9:16 al 24 %; 16:9 al 16 %.', c_zocalo),
 ('zp', 'Zócalo de persona', True, False, 'Quién habla: nombre y cargo.',
  'El cargo es el contexto, con anillo (Poppins 30 px); el nombre es la palabra, con esfera (Bricolage 90 px, 3×) · mismo lugar que el zócalo de lugar · entrevistas y testimonios.', c_persona),
 ('rm', 'Remate', False, False, 'El golpe del chiste o la palabra clave.',
  'Bricolage 124 px con esfera en el golpe · esquina superior (recta hacia el borde del que nace) · 4:5 al 6 % del borde superior; 9:16 al 16 % (debajo de la interfaz); 16:9 al 7 %.', c_remate),
 ('rq', 'Remate con pregunta', False, False, 'Pregunta + respuesta en un solo bloque.',
  'Anillo que se dibuja + pregunta en Poppins 400 40 px (la norma pide 300; en video el trazo fino se rompe al comprimir) + respuesta en Bricolage 124 px con esfera: 3,1×, como pide la regla de la voz (antes 96 px, 2,4×).', c_remate_q),
 ('sb', 'Subtítulo · vidrio denso', False, False, 'El estándar para todo video con imagen filmada o generada.',
  'Un solo bloque de vidrio: navy #001A33 al 60 %, desenfoque 24 px, saturación 1,4, borde de luz 1,5 px al 16 %, radio 18 px con la esquina recta hacia quien habla (Paula a la izquierda, Antonio a la derecha) · '
  'Poppins 500 40 px (46 px en 16:9), interlineado 1,32, máximo 2 líneas · las preguntas llevan el anillo teal, que se dibuja como órbita abierta en 6 cuadros al entrar; la respuesta llega después como remate con esfera · '
  'es el más liviano que pasó 4,5:1 en el peor 5 % de los seis fondos medidos (claro, cálido, oscuro, movimiento, interfaz y papel) · entra con la primera sílaba y sale 2 a 4 cuadros después de la última, con fundido de 2 cuadros · '
  'quien habla lo dice el plano (cada línea cae en el plano de su personaje); sin marca de lado · 4:5 termina en el 80 %; 9:16 en el 70 %, centrado dentro de la zona segura.', c_sub),
 ('sn', 'Subtítulo · tinta navy', False, False, 'Variante sólo para piezas animadas sobre papel o interfaz, sin imagen filmada.',
  'Sin caja, Poppins 500 40 px en navy #001A33 sobre el papel de la marca (#F7F8F6) o una interfaz clara: 15–17:1; el anillo usa el teal para fondo claro (#0E8C82), alineado al lado de quien habla. Sobre video no se usa (1,1–2,9:1). Un estilo por pieza: no se mezcla con el vidrio en el mismo video.', None),
 ('sp', 'Subtítulo · posición', False, False, 'Nunca tapa caras, manos ni producto: se mueve a la zona libre más cercana.',
  'El detector marca las zonas (en naranja). En 4:5 el lugar por defecto queda libre; en 9:16 el recorte acerca la mano que escribe y el subtítulo baja del 70 % al 79 %, '
  'todavía sobre la interfaz (80 %). Si tampoco hay lugar libre o no alcanza 4,5:1 de contraste, se reubica en el plano; la caja queda sólo como excepción aprobada.', None),
 ('sr', 'Subtítulo · reglas y archivo', False, False, 'Un solo archivo de tiempos; de él salen los quemados y el SRT.', '', None),
 ('bb', 'Burbujas de voz', False, False, 'Voces que salen de una pantalla dentro de la escena.',
  'El mismo vidrio que el subtítulo (navy 60 %, desenfoque 24 px, borde de luz 1,5 px), en cápsula y en Bricolage 48 → 96 px · tres en corcheas y la última cae en el golpe con microtemblor · se acumulan.', c_bub),
 ('dt', 'Super de dato', False, False, 'Una cifra que importa, medida por la órbita.',
  'Con la fuente del dato, como pide la norma · disco navy de 560 px para leerse sobre cualquier plano (la norma no lo tiene; ver la medición) · arco de 9 px y pista de 6 px · el número y la esfera caen juntos en el golpe · la fuente se separa del número con aire propio (18 px más) para que se lea como nota y no como parte de la cifra; va en dos líneas centradas y el bloque sube 28 px, para que quede lejos del borde del disco · «36 h» es un número de ejemplo: el real sale de la medición.', c_dato),
 ('cp', 'Comparación', True, False, 'Antes y ahora, en dos barras.',
  'Tarjeta navy · etiqueta Poppins 34 px, valor Bricolage 72 px · la barra de antes se llena lento; la de ahora cae en el golpe con la esfera · la etiqueta acepta un ícono Trazo en reposo (aquí, la claqueta), un logo o un isotipo oficial (aquí, BytePlus desde su kit), alineados a la altura de la versal; nunca un ícono en respuesta, porque la esfera es del valor · «36 h» es de ejemplo.', c_comp),
 ('ct', 'Cita', True, False, 'Lo que dijo alguien, con su firma.',
  'Bricolage 64 px peso 700 sin comillas (el lecho ya marca que es una voz), líneas a 0,42 em, lecho con 0,62/0,78 em de margen, una máscara por línea de arriba hacia abajo + atribución en Poppins 500 32 px separada 0,62 em · esquina recta arriba a la izquierda · el lecho se ajusta al texto, nunca más ancho que la zona segura.', c_cita),
 ('cr', 'Cartela de capítulo', True, True, 'Separa bloques en videos largos.',
  'Como en la norma: la palabra del capítulo va dentro del anillo y la órbita mide el avance (capítulo 1 de 3 = un tercio del arco); la esfera es la de la punta del arco, la palabra no lleva otra · panel navy que barre de izquierda a derecha · palabra Bricolage 96 px, rótulo Poppins 34 px.', c_cartela),
 ('ci', 'Cierre con CTA', True, True, 'La última pantalla: acción, dirección y firma.',
  'Panel navy · acción en Bricolage 150 px con esfera · la dirección va siempre en la burbuja URL oficial (AXIS brand-assets, horneada para fondo oscuro, 400 px), nunca como texto suelto · logo Efeonce centrado al 20 % del lado corto. Por decidir: la norma dice que el cierre es el reveal aprobado del logo; esta pantalla iría justo antes del reveal (A) o se integraría a su último cuadro (B).', c_cierre),
 ('tw', 'Transición · barrido navy', True, True, 'Cambio de bloque o de lugar.',
  'Un panel navy cruza el cuadro en 8 cuadros, lo cubre entero 2 cuadros antes del corte, lo sostiene y revela el plano siguiente en 8 más · el panel es más ancho que el cuadro, así su borde redondeado nunca deja ver el plano anterior · nace del borde izquierdo, como los lechos · en la lámina, el loop termina con un fundido a negro para que el reinicio no se confunda con la transición.', c_barrido),
 ('ti', 'Transición · iris de anillo', True, True, 'Cuando el plano siguiente es la respuesta.',
  'El anillo se dibuja en el golpe y se abre revelando el plano siguiente (16 cuadros). Antes se agrandaba la esfera, y la norma lo prohíbe: la esfera nunca se agranda ni se deforma; lo que se abre es lo abierto, el anillo · uno o dos momentos por video.', c_iris),
 ('il', 'Íconos · lista de pasos (Trazo)', True, False, 'Dos o tres puntos con ícono, para piezas de Growth, Engine o Revenue.',
  'Glifos reales de AXIS (contenido, ia, medición) a 64 px, tinta blanca sobre el lecho navy · cada paso entra en un tiempo: el trazo se dibuja en 8 cuadros y el texto sube por máscara · '
  'el paso que importa responde en el golpe: cambia a su estado con esfera, la única de la pantalla (los demás en reposo; auditIconGroup sin observaciones) · contexto con anillo, como el zócalo.', c_lista_trazo),
 ('ip', 'Íconos · lista de pasos (Plastilina)', True, False, 'La misma lista para piezas de Brand.',
  'Glifos reales de AXIS (lápiz, claqueta, reproducir) a 96 px (mínimo de Plastilina en celular) · entran por máscara con su texto · el último responde en el golpe con la esfera en el acento de Brand (naranja) y su anillo calado · nunca se mezcla con el Trazo en un mismo grupo.', c_lista_plast),
 ('ic', 'Íconos · zócalo de canal', True, False, 'Cuando el contexto es una plataforma real.',
  'El isotipo de la plataforma (AXIS brand-assets, en negativo: un solo tono, mismo peso óptico) reemplaza al anillo del contexto; la palabra cierra con su esfera · el logo nunca se anima por dentro, sólo entra por máscara · '
  'falta el isotipo de YouTube en negativo en brand-assets (hoy sólo está a color): hay que darlo de alta antes de usarlo en un zócalo.', c_canal),
 ('io', 'Íconos · momento protagonista (órbita sesgada)', True, True, 'El objeto protagonista de una apertura o un inserto, una vez por pieza.',
  'skewedOrbitHeroSvg de AXIS: Plastilina plana en reposo con su órbita sesgada (elipse −16°, pasa por detrás y por delante); la esfera es la de la órbita y el texto no lleva otra · la órbita sesgada nunca mide · '
  'exige un objeto grande (≥ 569 px a 1080 de ancho): en 16:9 va en un cuadrado de 1080 a la izquierda.', c_orbita),
 ('iv', 'Íconos · Plastilina en volumen', True, True, 'Alternativa al momento protagonista: el objeto en arcilla.',
  'PNG de AXIS brand-assets (claqueta en volumen, en respuesta, con el acento de Brand) a 520 px; mínimo 160 px · sólo momentos protagonistas, uno por pieza, sólo marca propia · entra con un pop en el golpe · nunca junto al Trazo ni a la Plastilina plana.', None),
 ('cs', 'Callout con selección', False, True, 'Señalar un objeto o a una persona dentro del plano.',
  'Receta aprobada en AXIS: caja de selección con ocho manijas sobre el objeto, cursor del colaborador a escala 1,6 con su rol («Dirección de arte») · el cursor entra en arco, hace clic y arrastra la caja sobre el objeto hasta soltarla en el golpe; las manijas aparecen una tras otra (1 cuadro entre cada una), el borde corre como una selección real y el rol salta junto al cursor · la caja la declara el intent según el plano: en 9:16 se selecciona a Paula porque Antonio queda cortado.', c_callout),
 ('ss', 'Pantalla dividida', False, True, 'Dos planos para contrastar: antes y ahora.',
  'Receta aprobada en AXIS: divisor teal de 6 px (en 16:9 a 957/1920; en 4:5 y 9:16, horizontal al medio), una palabra por lado en Bricolage 90 px · «Antes.» cierra con un punto común y «Ahora» con la esfera: las dos palabras quedan cerradas y la esfera sigue siendo una por pantalla · en video las palabras van en lecho navy.', c_split),
]

CSS = '''
.k-view{position:relative;overflow:hidden;border-radius:12px;background:#05070A;flex:none}
.k-stg{position:absolute;left:0;top:0;width:1080px;overflow:hidden;background:#05070A;transform-origin:0 0}
.k-stg *{box-sizing:border-box}
.k-stg{--subpx:40px}
.k-stg.f45{height:1350px;--top:6%;--sl:6%;--sr:6%;--zb:20%;--sb:20%;--bb:58%}
.k-stg.f916{height:1920px;--top:16%;--sl:6%;--sr:14%;--zb:24%;--sb:30%;--bb:50%}
.k-stg.f169{width:1920px;height:1080px;--top:7%;--sl:5%;--sr:5%;--zb:16%;--sb:10%;--bb:44%;--subpx:46px}
.k-a{animation-name:var(--n);animation-duration:var(--T);animation-timing-function:linear;animation-iteration-count:infinite;animation-fill-mode:both}
.k-pl{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}
.k-stg{--acc:#36c8bf;--accl:#0e8c82;--bed:#001a33}.k-stg svg{color:var(--acc)}
.k-board:has(#ln-brand:checked) section:not([data-row^="i"]) .k-stg{--acc:#ff6500;--accl:#bb1954}
.k-board:has(#ln-engine:checked) section:not([data-row^="i"]) .k-stg{--acc:#0375db;--accl:#0375db}
.k-board:has(#ln-voice:checked) section:not([data-row^="i"]) .k-stg{--acc:#f83902;--accl:#f83902}
.k-board:has(#ln-revenue-hubspot:checked) section:not([data-row^="i"]) .k-stg{--acc:#e86bd0;--accl:#8e1b82}
.k-board:has(#ln-revenue-salesforce:checked) section:not([data-row^="i"]) .k-stg{--acc:#2fb8ff;--accl:#00739e}
.k-lines{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:14px 0;background:#0F1115;border-bottom:1px solid #22262E}.k-lines input{position:absolute;opacity:0;pointer-events:none}.k-lines label{display:inline-flex;align-items:center;gap:8px;font-size:14px;color:#C9CED6;border:1px solid #2A2F38;border-radius:999px;padding:7px 14px 7px 10px;cursor:pointer}.k-lines label i{width:12px;height:12px;border-radius:50%;flex:none}.k-lines input:checked+label{color:#fff;border-color:#C9CED6;background:#1A1E25}
.k-bed{position:absolute;z-index:2;background:var(--bed);border-radius:calc(var(--f)*.26px);padding:calc(var(--f)*.3px) calc(var(--f)*.42px);display:flex;flex-direction:column;gap:calc(var(--f)*.16px)}
.c-tl{border-top-left-radius:0}.c-tr{border-top-right-radius:0;align-items:flex-end}.c-bl{border-bottom-left-radius:0}.c-br{border-bottom-right-radius:0;align-items:flex-end}
.dk .k-bed,.dk .k-disc{box-shadow:inset 0 0 0 2px rgba(255,255,255,.26)}
.k-ctx{font-family:'Poppins',sans-serif;font-weight:500;font-size:38px;line-height:1.1;color:#C9D3E0;white-space:nowrap;text-box:trim-both cap alphabetic}
.k-q{font-family:'Poppins',sans-serif;font-weight:400;font-size:40px;line-height:1.1;color:#fff;display:flex;align-items:center;white-space:nowrap;text-box:trim-both cap alphabetic}
.k-ring{display:inline-block;width:.66em;height:.66em;border:.1em solid var(--acc);border-radius:50%;margin-right:.36em;flex:none}
.k-B{font-family:'Bricolage Grotesque',sans-serif;font-weight:760;letter-spacing:-.035em;line-height:1;color:#fff;white-space:nowrap;text-box:trim-both cap alphabetic}
.k-quote{white-space:normal;line-height:1.04}
.k-cite{padding:calc(var(--f)*.62px) calc(var(--f)*.78px);gap:calc(var(--f)*.62px)}
.k-cq{display:flex;flex-direction:column;gap:calc(var(--f)*.42px)}
.k-cite .k-B{font-weight:700;letter-spacing:-.018em}
.k-esf{display:inline-block;width:.2em;height:.2em;border-radius:50%;background:var(--acc);margin-left:.035em}
.k-subw{position:absolute;z-index:2;left:var(--sl);right:var(--sr);bottom:var(--sb);display:flex;justify-content:center}
.k-glass{max-width:100%;display:flex;align-items:flex-start;gap:.4em;text-align:left;font-family:'Poppins',sans-serif;font-weight:500;font-size:var(--subpx);line-height:1.32;color:#fff;padding:.4em .7em .45em;border-radius:18px;background:color-mix(in srgb,var(--bed) 60%,transparent);-webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.16)}
.k-ink{max-width:100%;display:flex;align-items:flex-start;gap:.4em;text-align:left;font-family:'Poppins',sans-serif;font-weight:500;font-size:var(--subpx);line-height:1.32;color:var(--bed)}
.k-glass span,.k-ink span{display:block}
.k-glass.c-bl{border-bottom-left-radius:0}.k-glass.c-br{border-bottom-right-radius:0}
.k-ring2{width:.62em;height:.62em;flex:none;margin-top:.36em}
.k-paper{position:absolute;inset:0;background:#F7F8F6}
.k-zone{position:absolute;z-index:4;border:4px dashed #FF8A3D;border-radius:10px}
.k-zone b{position:absolute;left:0;top:-46px;font-family:'Poppins',sans-serif;font-weight:600;font-size:30px;color:#FF8A3D}
.k-flag{position:absolute;z-index:5;left:4%;top:4%;font-family:'Poppins',sans-serif;font-weight:600;font-size:34px;color:#0F1115;background:#FF8A3D;border-radius:10px;padding:8px 16px}
.k-flag.ok{background:#36C8BF}
.k-stack{position:absolute;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.k-bub{font-family:'Bricolage Grotesque',sans-serif;font-weight:760;letter-spacing:-.035em;line-height:1;color:#fff;border-radius:999px;border-bottom-right-radius:0;padding:.28em .62em .34em;white-space:nowrap;transform-origin:100% 100%;background:color-mix(in srgb,var(--bed) 60%,transparent);-webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.16)}
.k-center{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center}
.k-disc{position:relative;width:560px;height:560px;border-radius:50%;background:var(--bed);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px}
.k-disc{padding-bottom:56px;box-sizing:border-box}.k-disc .k-src{text-align:center;line-height:1.3}
.k-cmp{left:var(--sl);right:var(--sr);top:50%;margin-top:-190px;gap:40px}
.k-row{display:grid;grid-template-columns:1fr auto;align-items:end;row-gap:18px;column-gap:24px}
.k-row .k-ctx{align-self:end}
.k-pin{display:inline-block;height:.76em;overflow:visible;width:auto;vertical-align:baseline;margin-right:.16em}
.k-lab{display:flex;align-items:center;gap:.36em}.k-lico{width:1.25em;height:1.25em;flex:none;margin:-.3em 0}.k-llogo{height:.95em;width:auto;display:block}
.k-B.old{color:#8A919C}
.k-track{grid-column:1 / -1;height:16px;border-radius:8px;background:rgba(255,255,255,.12);overflow:hidden}
.k-fill{height:100%;border-radius:8px;transform-origin:0 50%}.k-fill.old{background:#8A919C}.k-fill.new{background:var(--acc)}
.k-panel{position:absolute;inset:0;z-index:3;background:var(--bed)}
.k-sweep{right:-160px;border-top-right-radius:60px;border-bottom-right-radius:60px}
.k-chap{position:absolute;left:var(--sl);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:30px}
.k-logo{position:absolute;left:50%;width:216px;margin-left:-108px;bottom:calc(var(--zb) + 2%)}
.f916 .k-logo{bottom:calc(var(--zb) + 2%)}
.k-guide{position:absolute;inset:0;z-index:5;pointer-events:none}
.k-guide i{position:absolute;border:0 dashed rgba(255,138,61,.75)}
.k-ctxr{display:flex;align-items:center;gap:.36em}.k-ctxr .k-ring2,.k-q .k-ring2{margin-top:0;margin-right:.36em}
.k-src{font-family:'Poppins',sans-serif;font-weight:400;font-size:26px;color:#9FB3C8;margin-top:18px;text-box:trim-both cap alphabetic}
.k-iris{position:absolute;z-index:4;left:68%;top:34%;transform:translate(-50%,-50%);overflow:visible}
.k-cs{position:absolute;inset:0;z-index:3}.f45 .k-cs{--cx:66%;--cy:23%;--cw:28%;--ch:31%}.f169 .k-cs{--cx:68%;--cy:9%;--cw:27%;--ch:44%}.f916 .k-cs{--cx:9%;--cy:25%;--cw:50%;--ch:30%}
.k-sel{position:absolute;right:calc(100% - var(--cx) - var(--cw));top:var(--cy);box-shadow:0 0 0 1px rgba(0,26,51,.3)}
.k-ants{position:absolute;inset:0;background:linear-gradient(90deg,#fff 55%,transparent 0) top left/22px 3px repeat-x,linear-gradient(90deg,#fff 55%,transparent 0) bottom left/22px 3px repeat-x,linear-gradient(0deg,#fff 55%,transparent 0) top left/3px 22px repeat-y,linear-gradient(0deg,#fff 55%,transparent 0) top right/3px 22px repeat-y;animation:k-ants .55s linear infinite}
@keyframes k-ants{to{background-position:22px 0,-22px 100%,0 -22px,100% 22px}}
.k-sel i{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;background:#fff;border:3px solid #5B4BFF;border-radius:4px}
.k-cur{position:absolute;z-index:4;display:flex;align-items:flex-start;gap:6px;margin:-4px 0 0 -4px}.k-cur svg{transform-origin:4px 4px}.k-cur span{transform-origin:0 0}
.k-cur span{margin-top:44px;box-shadow:0 6px 18px rgba(0,26,51,.28);font-family:'Poppins',sans-serif;font-weight:600;font-size:34px;color:#fff;background:#5B4BFF;border-radius:12px;padding:10px 20px 12px;white-space:nowrap}
.k-split{position:absolute;inset:0;display:flex}.f45 .k-split,.f916 .k-split{flex-direction:column}
.k-half{position:relative;flex:1;overflow:hidden}.k-half img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.f169 .k-half:first-child{flex:0 0 49.84%}
.k-div{position:absolute;z-index:3;background:var(--acc)}
.f169 .k-div{left:49.84%;top:0;bottom:0;width:6px;margin-left:-3px;transform-origin:50% 50%}
.f45 .k-div,.f916 .k-div{top:50%;left:0;right:0;height:6px;margin-top:-3px;transform-origin:50% 50%}
.k-ico{position:relative;display:inline-block;flex:none}.k-ico svg{position:absolute;left:0;top:0;overflow:visible}
.k-li{display:flex;align-items:center;gap:28px}
.k-lt{font-family:'Poppins',sans-serif;font-weight:500;font-size:40px;line-height:1.1;color:#fff;white-space:nowrap;text-box:trim-both cap alphabetic}
.k-plat{width:1.05em;height:1.05em;flex:none;margin-right:.1em}
.k-orb{position:absolute;width:1080px;height:1080px}.k-orb svg{width:100%;height:100%}
.f45 .k-orb{left:0;top:0}.f916 .k-orb{left:0;top:16%}.f169 .k-orb{left:80px;top:0}
.k-vol{position:absolute;width:520px;height:520px;object-fit:contain}
.f45 .k-vol{left:280px;top:16%}.f916 .k-vol{left:280px;top:26%}.f169 .k-vol{left:240px;top:24%}
.k-orbt{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center}
.f45 .k-orbt{left:0;right:0;bottom:12%}.f916 .k-orbt{left:0;right:0;bottom:28%}.f169 .k-orbt{right:6%;top:50%;transform:translateY(-50%);align-items:flex-start;text-align:left}
.k-loopend{position:absolute;inset:0;z-index:6;background:#05070A;pointer-events:none}
.k-urlb{width:400px}.k-urlb svg{display:block;width:100%;height:auto}
.k-badge{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#001A33;background:#36C8BF;border-radius:10px;padding:3px 9px;margin-left:12px;vertical-align:middle}
'''



SRT_SAMPLE = open('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/subtitulos/para-cuando.es.srt').read()
RULES_HTML = (
 '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;width:100%">'
 '<div style="background:#181B21;border-radius:16px;padding:22px 24px;font-size:14px;line-height:1.65;color:#C9CED6">'
 '<div style="font-weight:600;color:#ECEEF2;margin-bottom:8px">Reglas del componente</div><ul style="margin:0;padding-left:18px">'
 '<li>Vidrio denso (navy 60 %, desenfoque 24 px), un bloque con la esquina recta hacia quien habla, Poppins 500 40 px (46 px en 16:9). Tinta navy sin caja sólo sobre papel o interfaz.</li>'
 '<li>Anillo = pregunta, esfera = respuesta: sólo las preguntas reales llevan anillo (se dibuja al entrar); nunca una esfera dentro de un subtítulo; las frases que no preguntan van sin acento.</li>'
 '<li>En piezas de una línea de servicio el anillo toma el acento de esa línea.</li>'
 '<li>Máximo 2 líneas: 44 caracteres por línea en 16:9, ~34 en 4:5 y ~32 en 9:16.</li>'
 '<li>Corte en una pausa natural; nunca entre artículo y sustantivo ni entre preposición y lo que rige.</li>'
 '<li>Si hay dos líneas, la primera algo más corta.</li>'
 '<li>Máximo 17 caracteres por segundo; mínimo 0,8 s en pantalla. Si no alcanza, el subtítulo cruza el corte o se acorta la línea.</li>'
 '<li>Entra con la primera sílaba y sale 2 a 4 cuadros después de la última. Si un remate cae dentro de una línea larga, la línea se parte en el golpe.</li>'
 '<li>Contraste mínimo 4,5:1 medido sobre los cuadros del video; si no alcanza, se reubica en el plano.</li>'
 '<li>Sin comillas; el «…» inicial sólo marca una frase que viene de antes o una duda.</li>'
 '<li>El teal es sólo de la esfera: nunca para destacar palabras.</li>'
 '<li>Nunca tapa caras, manos ni producto (zonas del detector).</li>'
 '<li>Quien habla lo dicen el plano y la esquina recta; si dos voces comparten un subtítulo, cada una empieza con guion.</li></ul></div>'
 '<div style="background:#181B21;border-radius:16px;padding:22px 24px;font-size:14px;line-height:1.65;color:#C9CED6">'
 '<div style="font-weight:600;color:#ECEEF2;margin-bottom:8px">Quemados y SRT: qué va en cada versión</div><ul style="margin:0;padding-left:18px">'
 '<li><strong>Redes (Reels, TikTok, LinkedIn):</strong> subtítulos quemados con este componente. Apagar los automáticos de la plataforma y no adjuntar SRT, para que no salgan dos veces.</li>'
 '<li><strong>YouTube y web:</strong> máster limpio, sin diálogo escrito, más un SRT por idioma (ES, EN y PT).</li>'
 '<li><strong>El SRT de accesibilidad</strong> agrega descripciones de sonido ([Silencio], [Chapuzón]); los quemados no.</li>'
 '<li>Todo sale de un solo archivo de tiempos: <em>para-cuando.tiempos.json</em>. Si cambia un tiempo, cambian juntos el quemado y el SRT.</li></ul>'
 '<div style="margin-top:12px;font-size:13px;color:#8A919C">LinkedIn acepta sólo .srt y desde escritorio; Instagram no acepta SRT (guías de terceros, por confirmar en las páginas oficiales antes de publicar).</div></div>'
 '<div style="background:#181B21;border-radius:16px;padding:22px 24px;font-size:13px;line-height:1.55;color:#C9CED6">'
 '<div style="font-weight:600;color:#ECEEF2;margin-bottom:8px;font-size:14px">SRT en español, generado del archivo de tiempos</div>'
 '<div style="white-space:pre-wrap;max-height:330px;overflow:hidden;color:#C9D3E0">' + SRT_SAMPLE.replace('&', '&amp;').replace('<', '&lt;').replace('-->', '→') + '</div>'
 '<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,138,61,.14);color:#FFB27F">El chequeo marca el plano 07: «¿Para cuándo la necesitas?» en 1,4 s da 18,6 caracteres por segundo (máximo 17). Propuesta: alargar el 07 a 2,0 s y acortar el silencio del 06 a 1,0 s; así queda en 13,7 caracteres por segundo y el total sigue en 30 s.</div>'
 '<div style="margin-top:10px;font-size:12px;color:#8A919C">Tiempos estimados sobre el animatic; se rehacen con la voz grabada.</div></div>'
 '</div>')

UI_MOCK = ('<div style="position:absolute;inset:0;background:#F6F7F9;font-family:Poppins,sans-serif;color:#1B2433;padding:70px">'
 '<div style="height:64px;border-bottom:2px solid #E3E6EB;display:flex;align-items:center;gap:30px;font-weight:600;font-size:28px">Campañas<span style="font-weight:500;font-size:24px;color:#6B7585">Resumen · Piezas · Medición</span></div>'
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:40px">'
 + ''.join(f'<div style="background:#fff;border:2px solid #E3E6EB;border-radius:18px;padding:30px"><div style="font-weight:500;font-size:24px;color:#6B7585">{a}</div><div style="font-weight:600;font-size:64px;margin-top:10px">{b}</div></div>'
           for a, b in [('Alcance', '1,2 M'), ('Piezas aprobadas', '48'), ('Costo por pieza', '$ 120'), ('Tiempo de entrega', '36 h')])
 + '</div><div style="margin-top:34px;background:#fff;border:2px solid #E3E6EB;border-radius:18px;padding:30px">'
 + ''.join(f'<div style="display:flex;justify-content:space-between;font-weight:500;font-size:26px;padding:12px 0;border-bottom:1px solid #EEF0F3"><span>Pieza {i} · Reel 9:16</span><span style="color:#6B7585">Aprobada</span></div>' for i in range(1, 14))
 + '</div></div>')

def guides(fmt):
    if fmt == 'f916':
        return ('<div class="k-guide"><i style="left:0;right:0;top:15%;border-top-width:3px"></i>'
                '<i style="left:0;right:0;bottom:20%;border-top-width:3px"></i><i style="top:0;bottom:0;right:12%;border-left-width:3px"></i></div>')
    if fmt == 'f169':  # YouTube: la barra de controles ocupa ~10 % abajo al pasar el mouse; margen de título 5 %
        return '<div class="k-guide"><i style="left:0;right:0;bottom:10%;border-top-width:3px"></i></div>'
    return '<div class="k-guide"><i style="left:0;right:0;top:80%;border-top-width:3px"></i></div>'


def stage(fmt, w, bgsid, dk, inner, T, src, full):
    bw, h = {'f45': (1080, 1350), 'f916': (1080, 1920), 'f169': (1920, 1080)}[fmt]
    sc = w / bw
    bg = '' if full else f'<img class="k-pl" src="{src(bgsid)}" alt="">'
    return (f'<div class="k-view" style="width:{w}px;height:{h*sc:.0f}px"><div class="k-stg {fmt} {dk}" style="--T:{T}s;transform:scale({sc:.5f})">'
            f'{bg}{inner}{guides(fmt)}</div></div>')


def build(local=False):
    src = (lambda s: f'file://{PLATES}{LOCAL[s]}.png') if local else (lambda s: f'/_blob/{BLOB[s]}')
    logo = LOGO_E_LOCAL if local else LOGO_E
    K.css.clear()
    rows = []
    esfH = '<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:#36C8BF;margin-left:0.035em"></span>'
    for cid, name, new, full, what, spec, fn in COMPONENTS:
        cap = lambda t: f'<div style="font-size:12px;color:#8A919C;margin-top:6px">{t}</div>'
        if cid == 'sp':
            T = 3.0
            L01 = ['¿Y para cuándo estaría', 'la campaña?']
            s45 = sub_c('pa', T, L01, .25, 2.5) + zones('f45') + '<div class="k-flag ok">Libre</div>'
            s916a = sub_c('pb', T, L01, .25, 2.5) + zones('f916') + '<div class="k-flag">Tapa la mano</div>'
            s916b = sub_c('pc', T, L01, .25, 2.5, 'bottom:21%;') + zones('f916') + '<div class="k-flag ok">Baja al 79 %</div>'
            s169 = sub_c('pd', T, L01, .25, 2.5) + '<div class="k-flag ok">Libre</div>'
            stages = (f'<div>{stage("f45", 390, "01", "", s45, T, src, False)}{cap("4:5 · lugar por defecto")}</div>'
                      f'<div>{stage("f169", 390, "01", "", s169, T, src, False)}{cap("16:9 · YouTube: termina en el 90 %")}</div>'
                      f'<div>{stage("f916", 230, "01", "", s916a, T, src, False)}{cap("9:16 · por defecto: choca")}</div>'
                      f'<div>{stage("f916", 230, "01", "", s916b, T, src, False)}{cap("9:16 · corregido")}</div>')
        elif cid == 'sn':
            T = 4.0
            dial = sub_c('na', T, ['¿Para cuándo la necesitas?'], .25, 1.7, ink='ink', who='r') + sub_c('nb', T, ['…¿Para ayer?'], 1.9, 3.4, ink='ink', who='l')
            dial2 = dial.replace('"na', '"nc').replace('"nb', '"nd')
            papel = '<div class="k-paper"></div>'
            stages = (f'<div>{stage("f45", 390, None, "", papel + dial, T, src, True)}{cap("4:5 · papel · tamaño celular")}</div>'
                      f'<div>{stage("f45", 220, None, "", UI_MOCK + dial, T, src, True)}{cap("4:5 · interfaz")}</div>'
                      f'<div>{stage("f916", 155, None, "", papel + dial, T, src, True)}{cap("9:16 · papel")}</div>'
                      f'<div>{stage("f916", 155, None, "", UI_MOCK + dial, T, src, True)}{cap("9:16 · interfaz")}</div>')
        elif cid == 'sr':
            stages = RULES_HTML
        else:
            if cid == 'iv':
                T, inner = c_volumen(VOL_CLAQUETA_LOCAL if local else VOL_CLAQUETA)
            elif fn is c_comp:
                T, inner = fn(BP_LOCAL if local else BP)
            elif fn is c_cierre:
                T, inner = fn(logo)
            elif fn in (c_barrido, c_iris, c_callout, c_split):
                T, inner = fn(src)
            else:
                T, inner = fn()
        if cid in ('sp', 'sr', 'sn'):
            pass
        elif full and cid in ('io', 'iv'):
            stages = (f'<div>{stage("f45", 390, "01", "", inner, T, src, False)}{cap("4:5 · tamaño celular")}</div>'
                      f'<div>{stage("f169", 560, "01", "", inner, T, src, False)}{cap("16:9 · YouTube")}</div>'
                      f'<div>{stage("f916", 230, "01", "", inner, T, src, False)}{cap("9:16")}</div>')
        elif full:
            stages = (f'<div>{stage("f45", 390, "01", "", inner, T, src, False)}{cap("4:5 · tamaño celular")}</div>'
                      f'<div>{stage("f169", 560, "01", "", inner, T, src, False)}{cap("16:9 · YouTube (el plano es un recorte del 4:5)")}</div>'
                      f'<div>{stage("f916", 230, "01", "", inner, T, src, False)}{cap("9:16 · zonas seguras en naranja")}</div>')
        else:
            parts = [f'<div>{stage("f45", 390, BG[0][0], BG[0][2], inner, T, src, False)}{cap("4:5 · " + BG[0][1] + " · tamaño celular")}</div>']
            # 16:9 (YouTube): cargado y oscuro, uno sobre otro
            parts.append('<div style="display:flex;flex-direction:column;gap:10px">' + ''.join(
                f'<div>{stage("f169", 390, bsid, dk, inner, T, src, False)}{cap("16:9 · " + bname + (" · lecho con borde de luz" if dk else ""))}</div>'
                for bsid, bname, dk in (BG[0], BG[2])) + '</div>')
            for bsid, bname, dk in BG:
                parts.append(f'<div>{stage("f916", 155, bsid, dk, inner, T, src, False)}{cap("9:16 · " + bname)}</div>')
            stages = ''.join(parts)
        badge = '<span class="k-badge">Nuevo</span>' if new else ''
        rows.append(f'<section data-row="{cid}" style="display:flex;flex-direction:column;gap:14px;padding-top:28px;border-top:1px solid #22262E">'
                    f'<div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap"><h2 style="margin:0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-0.035em;font-size:32px">{name}{esfH}{badge}</h2>'
                    f'<div style="font-size:16px;color:#ECEEF2">{what}</div></div>'
                    f'<div style="font-size:14px;color:#8A919C;line-height:1.55;max-width:1300px">{spec}</div>'
                    f'<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">{stages}</div></section>')
    intro = (
     '<header style="display:flex;flex-direction:column;gap:14px;padding-bottom:8px">'
     '<div style="font-size:15px;letter-spacing:0.14em;text-transform:uppercase;color:#36C8BF;font-weight:600">Lámina de componentes · v4 · para aprobar antes del kit</div>'
     f'<h1 style="margin:0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-0.035em;font-size:56px;line-height:1">Componentes de video{esfH}</h1>'
     '<div style="font-size:15px;color:#C9CED6;max-width:1250px;line-height:1.6">Cada componente, aislado y animado en loop a 120 BPM, sobre tres fondos (cargado, claro y oscuro) y en tres formatos: 4:5 (feed), 16:9 (YouTube) y 9:16 (Reels y TikTok). '
     'La primera lámina de cada fila está a tamaño real de celular (390 px de ancho). Las líneas naranjas marcan las zonas seguras: en 9:16 la interfaz tapa el 15 % de arriba, el 20 % de abajo y el borde derecho; en 4:5 nada baja del 80 %.</div>'
     '<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7;color:#C9CED6">'
     '<li><strong>v4 · tres formatos:</strong> cada fila se ve en 4:5 (feed, a tamaño de celular), 16:9 (YouTube, cargado y oscuro) y 9:16 (Reels y TikTok). En 16:9 los planos son recortes del 4:5: sirven para probar el componente, no son masters.</li>'
     '<li><strong>v4 · alineado con la norma:</strong> el zócalo lleva el anillo antes del contexto y cumple la regla 3× (32 → 96 px); el remate con pregunta pasa a 3,1× (40 → 124 px); la cartela pone la palabra dentro del anillo con la órbita que mide el capítulo; el super de dato lleva su fuente; el iris abre el anillo y ya no agranda la esfera.</li>'
     '<li><strong>v4 · nuevos de la norma:</strong> callout con selección y pantalla dividida, que estaban aprobados en AXIS y faltaban en la lámina. Las burbujas usan el mismo vidrio que el subtítulo.</li>'
     '<li><strong>Movimiento:</strong> los lechos se revelan con un barrido desde su borde recto (8 cuadros) y se recogen hacia él (6 cuadros); el texto sube por máscara 2 cuadros después; la esfera cae en el golpe.</li>'
     '<li><strong>Aprobada completa (2026-10-17):</strong> todos los componentes. La esfera y el acento salen de la línea de servicio de la pieza (efeonceGraphicLine.lines): elige la línea arriba para verlos en Growth, Brand, Engine, Voice o Revenue. Siguiente paso: llevarlos a AXIS.</li></ul></header>')
    lines = ('<div class="k-lines"><span style="font-size:14px;color:#8A919C;margin-right:6px">Línea de la pieza:</span>'
             '<input type="radio" name="k-line" id="ln-growth" checked><label for="ln-growth"><i style="background:#36c8bf"></i>Growth</label><input type="radio" name="k-line" id="ln-brand"><label for="ln-brand"><i style="background:#ff6500"></i>Brand</label><input type="radio" name="k-line" id="ln-engine"><label for="ln-engine"><i style="background:#0375db"></i>Engine</label><input type="radio" name="k-line" id="ln-voice"><label for="ln-voice"><i style="background:#f83902"></i>Voice</label><input type="radio" name="k-line" id="ln-revenue-hubspot"><label for="ln-revenue-hubspot"><i style="background:#e86bd0"></i>Revenue · HubSpot</label><input type="radio" name="k-line" id="ln-revenue-salesforce"><label for="ln-revenue-salesforce"><i style="background:#2fb8ff"></i>Revenue · Salesforce</label>'
             '<span style="font-size:13px;color:#6F7682;margin-left:8px">esfera, anillo, arco, barra y divisor toman el acento de la línea; el fondo sigue siendo el navy de Efeonce, como en toda pieza de línea · las filas de íconos conservan la voz de su línea</span></div>')
    body = (f'<div class="k-board" style="width:1720px;box-sizing:border-box;padding:72px 62px 80px;background:#0F1115;color:#ECEEF2;font-family:\'Poppins\',system-ui,sans-serif;display:flex;flex-direction:column;gap:40px">'
            f'{intro}{lines}{"".join(rows)}</div>')
    return CSS + '\n' + '\n'.join(K.css), body


FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,760;12..96,800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap">'

if __name__ == '__main__':
    css, body = build(False)
    board = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<title>Componentes de video</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n'
             f'<link rel="preconnect" href="https://fonts.googleapis.com">\n{FONTS}\n<style>\nbody{{margin:0;background:#0F1115}}\n{css}\n</style>\n</helmet>\n{body}\n</x-dc>\n</body>\n</html>\n')
    open(PROJ + '/project/Componentes.dc.html', 'w').write(board)
    lcss, lbody = build(True)
    open(HERE + '/comp-test.html', 'w').write(f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>body{{margin:0;background:#0F1115}}{lcss}</style></head><body>{lbody}</body></html>')
    print('ok', len(board))
