# Animatic de «¿Para cuándo?» con la variante de video de La órbita.
# Genera CSS + HTML (sólo CSS, sin JS) para el tablero Textos del canvas y una página de prueba local.
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EO = 'cubic-bezier(.2,.8,.2,1)'
EI = 'cubic-bezier(.6,0,.9,.4)'
IO = 'cubic-bezier(.3,0,.3,1)'
LIN = 'linear'
E = 0.001

BLOB = {
 '00': '44fc149303550569c22f140308c8169e', '01': 'a1f8f712a60fbd8d03676986d545d131',
 '02': '818227fc5eef66e75b09c547a7671568', '03': '072b917aa50e2f5e70106e83c1be895c',
 '04': '96bd152b35b58d19775b5c69cae2df06', '05': '3734cb58056cf5be97a93dcc5ab80bf3',
 '06': '2ac2c7043392ad377ebec94a684d634e', '07': '5b11acf749d51ae528e35ee522c2b634',
 '08': '874223cfbc2797e9cadba83c1e399b58', '09': '03ab4aca95888a6e4f4bc2f4109339c7',
 '10': '5b563fcc5338ddbafe8ed7197eab0a71', '11a': '54f901b87131b66e9859d8c06eb52cc0',
 '11b': '44fc149303550569c22f140308c8169e', '12': 'cb18df2c9a0f118af516491c5f653444',
 '13': '4dca3380b19f944dddf5df75fd328ec1', '14': 'c7b20deb4afc7ff9106d9c3f6ffd2cae',
 '15': '2c87a66c9d6ec5f13a401f20d9c6daf7', '16': '08bf7aeb1b932dc6665bec4ee07cdb97',
 '17': 'f72d0d8af0b9744e886baa33d36dbdf8', '18': '053f88e11fa890250a492b9609743982',
 '19': '753b15f7679dda58438de5dd54076f37',
}
LOCAL = {
 '00': '00-gancho-congelado', '01': '01-kickoff', '02': '02-grilla4', '03': '03-grilla16', '04': '04-aplastada',
 '05': '05-dia42', '06': '06-silencio', '07': '07-antonio-pregunta', '08': '08-paula-ayer', '09': '09-ya-esta',
 '10': '10-lata', '11a': '11a-ola-llega', '11b': '11b-ola-golpea', '12': '12-paredes', '13': '13-cdmx',
 '14': '14-bogota', '15': '15-santiago', '16': '16-vocera', '17': '17-lunes', '18': '18-tambien', '19': '19-grilla-cierre',
}
LOGO_EFEONCE = '/_blob/1bbf566132073a18e1f2642bfa0d74f1'
LOGO_BYTEPLUS = '/_blob/f2690366a5b1e8b68ecfb17e5ba448af'

# Montaje cuadrado a 120 BPM: todo corte cae en un tiempo (0,5 s). Total 30 s = 60 tiempos.
BPM = 120
BEAT = 60 / BPM
SCENES = [
 ('00', 1.5, 'Gancho: el final congelado rebobina', 'remate con pregunta · golpe de esfera'),
 ('01', 1.5, 'Kickoff', 'subtítulo · Paula'),
 ('02', 1.5, 'La videollamada', 'el subtítulo cruza el corte'),
 ('03', 1.0, 'La grilla se multiplica', 'sin texto'),
 ('04', 2.0, 'Las excusas la aplastan', 'burbujas: tres en corcheas, la última cae en el golpe'),
 ('05', 1.5, 'Día 42', 'remate · golpe de esfera'),
 ('06', 1.5, 'Silencio', 'sin texto'),
 ('07', 1.5, 'Antonio pregunta', 'subtítulo · Antonio'),
 ('08', 1.0, '…¿Para ayer?', 'subtítulo · Paula'),
 ('09', 1.0, 'Ya está', 'remate del chiste · golpe de esfera'),
 ('10', 1.0, 'La lata sale de la pantalla', 'sin texto'),
 ('11a', 0.5, 'La ola cruza la mesa', 'sin texto'),
 ('11b', 1.0, 'La ola golpea a Paula', 'sin texto'),
 ('12', 1.5, 'Las paredes se vuelven pantallas', 'sin texto'),
 ('13', 1.0, 'Ciudad de México', 'zócalo con hora'),
 ('14', 1.0, 'Bogotá', 'zócalo: cambia sólo la hora y la ciudad'),
 ('15', 1.0, 'Santiago', 'zócalo a la derecha'),
 ('16', 2.5, 'Vocera en tres idiomas', 'zócalo, un idioma por tiempo'),
 ('17', 1.5, '…¿Y para el lunes?', 'subtítulo · Paula'),
 ('18', 1.0, 'También', 'remate del chiste · golpe de esfera'),
 ('19', 1.0, 'Los proveedores cierran', 'sin texto'),
 ('20a', 1.5, 'Cierre, golpe 1', '¿Para ayer? Ya está · golpe de esfera'),
 ('20b', 1.5, 'Cierre, golpe 2', 'super de dato + firma · golpe del número'),
]
DUR = {s: d for s, d, _, _ in SCENES}
assert abs(sum(DUR.values()) - 30) < 1e-9
assert all(abs((d / BEAT) - round(d / BEAT)) < 1e-9 for d in DUR.values())

S0, S104, S1 = 'transform:scale(0)', 'transform:scale(1.04)', 'transform:scale(1)'
TH = 'clip-path:inset(100% 0 0 0);transform:translateY(35%)'
TS = 'clip-path:inset(0 0 0 0);transform:translateY(0)'
TG = 'clip-path:inset(0 0 100% 0);transform:translateY(-20%)'
SPH = '<span class="vo-esf"></span>'  # esfera sin golpe: llega con la palabra


class Player:
    def __init__(self, pre, T, local=False):
        self.pre, self.T, self.local = pre, T, local
        self.kf, self.n, self.html = [], 0, []
        self.settle = {}
        self.beats = []  # golpes acentuados (esfera con nota)

    def src(self, sid):
        if self.local:
            return f'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/plates-v5/{LOCAL[sid]}.png'
        return f'/_blob/{BLOB[sid]}'

    def logo(self, which):
        if self.local:
            base = 'file:///private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/6c01f8c0-9b1d-4bbf-a45d-33556c130cbc/scratchpad/storyboard-canvas/img/'
            return base + ('efeonce-logo-negative.svg' if which == 'e' else 'byteplus-white-hi.png')
        return LOGO_EFEONCE if which == 'e' else LOGO_BYTEPLUS

    def mark(self, sid, t):
        self.settle[sid] = max(self.settle.get(sid, 0), t)

    def anim(self, pts):
        self.n += 1
        nm = f'{self.pre}{self.n}'
        T = self.T
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
        body = ''.join(out)
        self.kf.append(f'@keyframes {nm}{{{body}}}@keyframes x{nm}{{{body}}}')
        return f'--n:{nm};--fz:x{nm}'

    # --- piezas de movimiento ---
    # Plano corto (≤ 1,2 s): lecho en 6 cuadros sin sobrepaso y sale con el corte.
    # Plano largo: 8 cuadros con 4 % de sobrepaso y salida de 6 cuadros que termina en el corte.
    def bed(self, tin, tout, short=False, inmode='pop', outmode='anim'):
        if inmode == 'cut':
            p = [(tin - E, S0, LIN), (tin, S1, LIN)]
        elif short:
            p = [(tin, S0, EO), (tin + .2, S1, LIN)]
        else:
            p = [(tin, S0, EO), (tin + .2, S104, IO), (tin + .27, S1, LIN)]
        p += [(tout - .2, S1, EI), (tout, S0, LIN)] if outmode == 'anim' else [(tout - E, S1, LIN), (tout, S0, LIN)]
        return self.anim(p)

    # El texto entra casi junto con el lecho (+2 cuadros): nunca hay lecho vacío.
    def text(self, tin, tout, inmode='pop', outmode='anim'):
        p = [(tin, TH, EO), (tin + .15, TS, LIN)] if inmode == 'pop' else [(tin - E, TH, LIN), (tin, TS, LIN)]
        p += [(tout - .2, TS, EI), (tout - .07, TG, LIN)] if outmode == 'anim' else [(tout - E, TS, LIN), (tout, TH, LIN)]
        return self.anim(p)

    # Esfera con golpe: el pico (110 %) cae exactamente en el tiempo `beat`.
    def esf(self, beat, tout, outmode='anim'):
        self.beats.append(beat)
        p = [(beat - .12, S0, EO), (beat, 'transform:scale(1.1)', IO), (beat + .08, S1, LIN)]
        p += [(tout - .27, S1, EI), (tout - .2, S0, LIN)] if outmode == 'anim' else [(tout - E, S1, LIN), (tout, S0, LIN)]
        return f'<span class="vo-esf vo-a" style="{self.anim(p)}"></span>'

    def fade(self, tin, tout, f_in=.067, f_out=.067):
        return self.anim([(tin, 'opacity:0', LIN), (tin + f_in, 'opacity:1', LIN), (tout - f_out, 'opacity:1', LIN), (tout, 'opacity:0', LIN)])

    def window(self, tin, tout):
        return self.anim([(tin - E, 'opacity:0', LIN), (tin, 'opacity:1', LIN), (tout - E, 'opacity:1', LIN), (tout, 'opacity:0', LIN)])

    def add(self, h):
        self.html.append(h)

    # --- escenas ---
    def plate(self, sid, s, e):
        if sid == '00':
            base = 'opacity:1;filter:blur(0px) brightness(1);transform:scale(1) translateX(0)'
            hid = 'opacity:0;filter:blur(0px) brightness(1);transform:scale(1) translateX(0)'
            rew = 'opacity:1;filter:blur(7px) brightness(1.45);transform:scale(1.07) translateX(-3%)'
            st = self.anim([(s, base, LIN), (s + 1.15, base, EI), (e - E, rew, LIN), (e, hid, LIN)])
        else:
            st = self.window(s, e)
        self.add(f'<img class="vo-pl vo-a" style="{st}" src="{self.src(sid)}" alt="Plano {sid}">')

    def remate(self, sid, s, e, word, side, pos, short, size_cls='vo-remate', pre=''):
        om = 'cut' if short else 'anim'
        tb = s + .05
        self.add(f'<div class="vo-bed vo-{side} vo-a" style="{pos};{self.bed(tb, e, short, outmode=om)}">{pre}'
                 f'<div class="vo-B {size_cls} vo-a" style="{self.text(tb, e, outmode=om)}">{word}{self.esf(s + .5, e, om)}</div></div>')
        self.mark(sid, s + .6)

    def scene(self, sid, s, e):
        if sid in BLOB:
            self.plate(sid, s, e)
        if sid == '00':
            tb = s + .05
            out = s + 1.2  # sale antes del rebobinado
            self.add(f'<div class="vo-bed vo-tr vo-a" style="top:6%;right:6%;{self.bed(tb, out)}">'
                     f'<div class="vo-q vo-a" style="{self.text(tb, out)}"><span class="vo-ring"></span>¿Cómo llegamos aquí?</div>'
                     f'<div class="vo-B vo-a" style="font-size:82px;{self.text(tb + .067, out)}">Rebobinemos{self.esf(s + .5, out)}</div></div>')
            self.mark(sid, s + .6)
        elif sid in ('01', '07', '08', '17'):
            who = 'antonio' if sid == '07' else 'paula'
            txt = {'01': ['¿Y para cuándo estaría', 'la campaña?'], '07': ['¿Para cuándo la necesitas?'],
                   '08': ['…¿Para ayer?'], '17': ['…¿Y para el lunes?']}[sid]
            tin = s + .05
            tout = (e + .5) if sid == '01' else e
            spans = ''.join(f'<span>{l}</span>' for l in txt)
            ring = self.anim([(tin, 'stroke-dashoffset:1', EO), (tin + 6 / 30, 'stroke-dashoffset:0', LIN)])
            ring_svg = (f'<svg class="vo-ring2" viewBox="0 0 24 24"><circle class="vo-a" style="{ring}" cx="12" cy="12" r="10.06" fill="none" stroke="#36C8BF" '
                        f'stroke-width="3.87" pathLength="1" stroke-dasharray="1" transform="rotate(-90 12 12)"/></svg>')
            side = 'flex-end' if who == 'antonio' else 'flex-start'
            corner = 'vo-cr' if who == 'antonio' else 'vo-cl'
            # vidrio denso; el anillo marca que es pregunta (todas las líneas de diálogo de este guion lo son)
            self.add(f'<div class="vo-sub" style="justify-content:{side}"><div class="vo-glass {corner} vo-a" style="{self.fade(tin, tout)}">{ring_svg}<div>{spans}</div></div></div>')
            self.mark(sid, tin + .15)
        elif sid == '04':
            words = [('Seis semanas', 48), ('Casting', 56), ('Locación', 66), ('Otra cotización', 96)]
            heavy = s + 1.0  # la última cae en el golpe
            times = [s + .25, s + .5, s + .75, heavy]
            bubs = []
            for (w, fs), t in reversed(list(zip(words, times))):
                if w == 'Otra cotización':
                    self.beats.append(heavy)
                    st = self.anim([(t - .15, 'transform:scale(0) translateY(-25%)', EO), (t, 'transform:scale(1.14) translateY(0)', IO),
                                    (t + .1, 'transform:scale(1) translateY(0)', LIN), (e - E, 'transform:scale(1) translateY(0)', LIN), (e, 'transform:scale(0) translateY(0)', LIN)])
                    inner = w + SPH
                else:
                    st = self.anim([(t, S0, EO), (t + .15, 'transform:scale(1.08)', IO), (t + .22, S1, LIN), (e - E, S1, LIN), (e, S0, LIN)])
                    inner = w
                bubs.append(f'<div class="vo-bub vo-a" style="font-size:{fs}px;{st}">{inner}</div>')
            # la pila sube 4 cuadros con cada burbuja; la última provoca un microtemblor de 3 cuadros
            p = [(s, 'transform:translate(0,0)', LIN)]
            for k, t in enumerate(times[1:], 1):
                t0 = t - .15 if k == 3 else t
                p += [(t0, f'transform:translate(0,{-(k-1)*8}px)', EO), (t0 + .133, f'transform:translate(0,{-k*8}px)', LIN)]
            p += [(heavy + .1, 'transform:translate(0,-24px)', LIN), (heavy + .133, 'transform:translate(7px,-24px)', LIN),
                  (heavy + .167, 'transform:translate(-6px,-24px)', LIN), (heavy + .2, 'transform:translate(0,-24px)', LIN), (e, 'transform:translate(0,-24px)', LIN)]
            self.add(f'<div class="vo-stack vo-a" style="left:6%;bottom:calc(58% - 24px);{self.anim(p)}">{"".join(bubs)}</div>')
            self.mark(sid, heavy + .25)
        elif sid == '05':
            self.remate(sid, s, e, 'Día 42', 'tl', 'top:6%;left:6%', False)
        elif sid == '09':
            self.remate(sid, s, e, 'Ya está', 'tr', 'top:4%;right:6%', True)
        elif sid == '18':
            self.remate(sid, s, e, 'También', 'tr', 'top:4%;right:6%', True)
        elif sid in ('13', '14', '15'):
            ctx, word, side = {'13': ('Lunes · 09:12', 'CDMX', 'bl'), '14': ('Lunes · 09:13', 'Bogotá', 'bl'), '15': ('Lunes · 09:14', 'Santiago', 'br')}[sid]
            pos = 'bottom:20%;' + ('left:6%' if side == 'bl' else 'right:6%')
            if sid == '14':  # el zócalo sigue: sólo cambian la hora y la ciudad
                bed, c, w = self.bed(s, e, True, 'cut', 'cut'), self.text(s, e, 'cut', 'cut'), self.text(s + .03, e, 'pop', 'cut')
            else:
                tb = s + .05
                bed, c, w = self.bed(tb, e, True, outmode='cut'), self.text(tb, e, outmode='cut'), self.text(tb + .067, e, outmode='cut')
            self.add(f'<div class="vo-bed vo-{side} vo-a" style="{pos};{bed}"><div class="vo-ctx vo-a" style="{c}">{ctx}</div>'
                     f'<div class="vo-B vo-zword vo-a" style="{w}">{word}{SPH}</div></div>')
            self.mark(sid, s + .35)
        elif sid == '16':
            tb = s + .05
            langs = [('ES', tb), ('&nbsp;· EN', s + .5), ('&nbsp;· PT', s + 1.0)]  # un idioma por tiempo
            ws = ''.join(f'<span class="vo-w vo-a" style="{self.text(t, e)}">{l}</span>' for l, t in langs)
            self.add(f'<div class="vo-bed vo-bl vo-a" style="bottom:20%;left:6%;{self.bed(tb, e)}"><div class="vo-ctx">{ws}</div>'
                     f'<div class="vo-B vo-zword vo-a" style="{self.text(tb + .067, e)}">3 idiomas{SPH}</div></div>')
            self.mark(sid, s + 1.2)
        elif sid == '20a':
            # El cierre va sobre el navy de Efeonce (operador, 2026-10-17), no sobre negro.
            self.add(f'<div class="vo-a" style="position:absolute;inset:0;background:#001A33;{self.window(s, e)}"></div>')
            self.add(f'<div class="vo-center vo-a" style="gap:18px;{self.window(s, e)}">'
                     f'<div class="vo-q vo-a" style="font-size:52px;{self.text(s + .05, e)}"><span class="vo-ring"></span>¿Para ayer?</div>'
                     f'<div class="vo-B vo-a" style="font-size:190px;{self.text(s + .2, e)}">Ya está{self.esf(s + .5, e)}</div></div>')
            self.mark(sid, s + .65)
        elif sid == '20b':
            land = s + .5  # el número y la esfera del arco caen en el golpe
            arc = self.anim([(s + .05, 'stroke-dashoffset:1', IO), (land, 'stroke-dashoffset:0', LIN)])
            self.beats.append(land)
            dot = self.anim([(land - .12, S0, EO), (land, 'transform:scale(1.1)', IO), (land + .08, S1, LIN)])
            trk = self.anim([(s, 'opacity:0', LIN), (s + .15, 'opacity:1', LIN)])
            lock = self.anim([(s + .6, 'opacity:0;transform:translateY(12px)', EO), (s + .8, 'opacity:1;transform:translateY(0)', LIN)])
            self.add(f'<div class="vo-a" style="position:absolute;inset:0;background:#001A33;{self.window(s, e)}"></div>')
            self.add(f'<div class="vo-center vo-a" style="gap:28px;{self.fade(s, e, .001, .2)}">'
                     f'<div style="position:relative;width:520px;height:520px;display:flex;flex-direction:column;align-items:center;justify-content:center">'
                     f'<svg width="520" height="520" viewBox="0 0 520 520" style="position:absolute;left:0;top:0;overflow:visible">'
                     f'<circle class="vo-a" style="{trk}" cx="260" cy="260" r="240" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3.5"/>'
                     f'<path class="vo-a" style="{arc}" pathLength="1" stroke-dasharray="1" d="M260 20 A240 240 0 0 1 467.8 380" fill="none" stroke="#36C8BF" stroke-width="5" stroke-linecap="round"/>'
                     f'<circle class="vo-a" style="transform-box:fill-box;transform-origin:center;{dot}" cx="467.8" cy="380" r="13" fill="#36C8BF"/></svg>'
                     f'<div class="vo-ctx vo-a" style="font-size:40px;{self.text(s + .1, e + 5, "pop", "cut")}">Este video</div>'
                     f'<div class="vo-B vo-a" style="font-size:150px;{self.text(land - .15, e + 5, "pop", "cut")}">[X] h</div></div>'
                     f'<div class="vo-a" style="display:flex;align-items:center;gap:30px;margin-top:40px;{lock}">'
                     f'<img src="{self.logo("e")}" alt="Efeonce" style="height:64px"><span style="width:2px;height:72px;background:rgba(255,255,255,.55)"></span>'
                     f'<img src="{self.logo("b")}" alt="BytePlus" style="height:60px"></div></div>')
            self.mark(sid, s + .85)


def build(pre, ids, scale, local=False, tail=0.0):
    t, spans = 0.0, []
    for sid in ids:
        spans.append((sid, t, t + DUR[sid])); t += DUR[sid]
    T = round(t + tail, 3)
    P = Player(pre, T, local)
    for i, (sid, s, e) in enumerate(spans):
        P.scene(sid, s, e)
    W, H = 1080 * scale, 1350 * scale
    stage = (f'<div class="vo-view" style="width:{W:.0f}px;height:{H:.0f}px"><div class="vo-stg" style="--T:{T}s;transform:scale({scale})">'
             + ''.join(P.html) + '</div></div>')
    return P, spans, T, stage


CSS_BASE = '''
.vo-view{position:relative;overflow:hidden;border-radius:14px;background:#05070A;flex:none}
.vo-stg{position:absolute;left:0;top:0;width:1080px;height:1350px;overflow:hidden;background:#05070A;transform-origin:0 0}
.vo-stg *{box-sizing:border-box}
.vo-a{animation-name:var(--n);animation-duration:var(--T);animation-timing-function:linear;animation-iteration-count:infinite;animation-fill-mode:both}
.vo-pl{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;z-index:0}
.vo-stg>:not(.vo-pl){z-index:2}
.vo-bed{position:absolute;background:#001A33;border-radius:22px;padding:20px 30px 24px;display:flex;flex-direction:column;gap:8px}
.vo-tl{border-top-left-radius:0;transform-origin:0 0}.vo-tr{border-top-right-radius:0;align-items:flex-end;transform-origin:100% 0}
.vo-bl{border-bottom-left-radius:0;transform-origin:0 100%}.vo-br{border-bottom-right-radius:0;align-items:flex-end;transform-origin:100% 100%}
.vo-ctx{font-family:'Poppins',sans-serif;font-weight:500;font-size:38px;line-height:1.1;color:#C9D3E0;display:flex;align-items:center;white-space:nowrap}
.vo-q{font-family:'Poppins',sans-serif;font-weight:300;font-size:40px;color:#fff;display:flex;align-items:center;white-space:nowrap}
.vo-ring{display:inline-block;width:.62em;height:.62em;border:4px solid #36C8BF;border-radius:50%;margin-right:.4em}
.vo-B{font-family:'Bricolage Grotesque',sans-serif;font-weight:760;letter-spacing:-.035em;line-height:.95;color:#fff;white-space:nowrap}
.vo-remate{font-size:124px}.vo-zword{font-size:74px}
.vo-esf{display:inline-block;width:.2em;height:.2em;border-radius:50%;background:#36C8BF;margin-left:.035em}
.vo-w{display:inline-block;white-space:pre}
.vo-sub{position:absolute;bottom:20%;left:6%;right:6%;display:flex}
.vo-glass{max-width:100%;display:flex;align-items:flex-start;gap:.4em;font-family:'Poppins',sans-serif;font-weight:500;font-size:40px;line-height:1.32;color:#fff;padding:16px 28px 18px;border-radius:18px;background:rgba(0,26,51,.6);-webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.16)}
.vo-glass span{display:block}.vo-cl{border-bottom-left-radius:0}.vo-cr{border-bottom-right-radius:0}
.vo-ring2{width:.62em;height:.62em;flex:none;margin-top:.36em}
.vo-stack{position:absolute;display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.vo-bub{font-family:'Bricolage Grotesque',sans-serif;font-weight:760;letter-spacing:-.035em;line-height:1;color:#fff;border-radius:999px;border-bottom-right-radius:0;padding:.28em .62em .34em;white-space:nowrap;transform-origin:100% 100%;background:rgba(0,26,51,.64);-webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);border:2px solid rgba(255,255,255,.38)}
.vo-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.vo-r{position:absolute;opacity:0;pointer-events:none;width:0;height:0;margin:0}
.vo-chip{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:30px;padding:0 10px;border-radius:15px;background:#181B21;color:#C9CED6;font-size:13px;font-weight:600;cursor:pointer;user-select:none}
.vo-chip:hover{background:#232833}
.vo-lbl{position:absolute;left:0;top:0;right:0}
.vo-bar{position:relative;height:26px;border-radius:7px;background:#181B21;overflow:hidden}
.vo-tick{position:absolute;top:0;bottom:0;width:1px;background:#2E3440}
.vo-beat{position:absolute;bottom:4px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#36C8BF}
.vo-bt{position:absolute;bottom:0;width:1px;height:6px;background:#3A4150}
.vo-met{display:flex;align-items:center;gap:12px;font-size:12px;color:#8A919C}
.vo-pulse{width:14px;height:14px;border-radius:50%;background:#ECEEF2}
.vo-acc{width:22px;height:22px;border-radius:50%;border:3px solid #36C8BF;box-sizing:border-box}
.vo-head{position:absolute;top:0;bottom:0;width:2px;background:#FFFFFF;margin-left:-1px}
'''


def fmt_t(x):
    m, s = divmod(x, 60)
    return f'{int(m)}:{s:04.1f}'.replace('.', ',')


def main(local=False):
    ids = [s for s, *_ in SCENES]
    meta = {s: (n, c) for s, _, n, c in SCENES}
    P, spans, T, stage = build('vm', ids, .5, local)

    # etiquetas por escena + barra de tiempo
    lbls = []
    for sid, s, e in spans:
        n, c = meta[sid]
        lbls.append(f'<div class="vo-lbl vo-a" style="{P.window(s, e)}"><div style="font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-.035em;font-size:44px;line-height:1;color:#ECEEF2">{sid}</div>'
                    f'<div style="font-size:17px;color:#ECEEF2;margin-top:8px">{n}</div><div style="font-size:14px;color:#36C8BF;margin-top:4px">{c}</div>'
                    f'<div style="font-size:12px;color:#8A919C;margin-top:4px">{fmt_t(s)} – {fmt_t(e)} · {str(round(e-s,1)).replace('.', ',')} s</div></div>'.replace('.0 s', ' s'))
    head = P.anim([(0, 'left:0%', LIN), (T, 'left:100%', LIN)])
    ticks = ''.join(f'<div class="vo-tick" style="left:{s/T*100:.3f}%"></div>' for _, s, _ in spans[1:])
    beats = ''.join(f'<div class="vo-beat" style="left:{b/T*100:.3f}%"></div>' for b in sorted(P.beats))
    grid = ''.join(f'<div class="vo-bt" style="left:{k*BEAT/T*100:.3f}%"></div>' for k in range(1, int(round(T / BEAT))))
    bar = f'<div class="vo-bar">{grid}{ticks}{beats}<div class="vo-head vo-a" style="{head}"></div></div>'
    # metrónomo visual: un pulso por tiempo; el anillo teal sólo en los golpes con esfera
    pp = []
    for k in range(int(round(T / BEAT))):
        b = k * BEAT
        pp += [(b, 'transform:scale(1.35);opacity:1', EO), (b + .2, 'transform:scale(1);opacity:.3', LIN)]
    pulse = P.anim(pp)
    ap = [(0, 'transform:scale(.6);opacity:0', LIN)]
    for b in sorted(P.beats):
        ap += [(b - E, 'transform:scale(.6);opacity:0', LIN), (b, 'transform:scale(1.25);opacity:1', EO), (b + .3, 'transform:scale(1);opacity:0', LIN)]
    acc = P.anim(ap)
    met = (f'<div class="vo-met" style="position:absolute;left:0;bottom:0"><span class="vo-pulse vo-a" style="{pulse}"></span>'
           f'<span class="vo-acc vo-a" style="{acc}"></span><span>{BPM} BPM · cada corte cae en un tiempo · el anillo teal marca los golpes con esfera</span></div>')

    # saltos: cada escena congelada en su momento asentado
    radios = '<input class="vo-r" type="radio" name="vo-j" id="vo-j-all" checked><input class="vo-r" type="checkbox" id="vo-pz">'
    chips = '<label class="vo-chip" for="vo-j-all" style="padding:0 14px">▶ Todo</label><label class="vo-chip vo-pz" for="vo-pz" style="padding:0 14px">Pausa</label>'
    jump_css = ['.vo-anim:has(#vo-pz:checked) .vo-main .vo-a{animation-play-state:paused}',
                '.vo-anim:has(#vo-pz:checked) label[for="vo-pz"]{background:#FF8A3D;color:#0F1115}',
                '.vo-anim:has(#vo-j-all:checked) label[for="vo-j-all"]{background:#36C8BF;color:#001A33}']
    for sid, s, e in spans:
        fz = min(P.settle.get(sid, s + (e - s) * .5) + .05, e - .03)
        k = sid
        radios += f'<input class="vo-r" type="radio" name="vo-j" id="vo-j-{k}">'
        chips += f'<label class="vo-chip" for="vo-j-{k}">{sid}</label>'
        jump_css.append(f'.vo-anim:has(#vo-j-{k}:checked) .vo-main .vo-a{{animation-name:var(--fz);animation-delay:-{fz:.3f}s;animation-play-state:paused}}')
        jump_css.append(f'.vo-anim:has(#vo-j-{k}:checked) label[for="vo-j-{k}"]{{background:#36C8BF;color:#001A33}}')
    css = [CSS_BASE] + P.kf + jump_css

    # escena a escena: grupos en loop
    groups = [
     (['00'], 'El gancho rebobina', 'Pregunta y respuesta entran con el lecho; «Rebobinemos●» cae en el golpe y el cuadro se va en blur.'),
     (['01', '02'], 'El subtítulo cruza el corte', 'Paula termina de preguntar ya sobre la videollamada: 0,5 s después del corte.'),
     (['04'], 'La última cae en el golpe', 'Tres excusas en corcheas; la pila sube y «Otra cotización» llega pesada en el tiempo y tiembla.'),
     (['05'], 'Día 42', 'Remate desde la esquina recta; la esfera cae en el golpe y se recoge antes del corte.'),
     (['06', '07', '08', '09'], 'El chiste', 'Silencio → pregunta de Antonio → «¿Para ayer?» → «Ya está●», que sale con el corte.'),
     (['13', '14', '15'], 'Tres ciudades en tres minutos', 'El zócalo no se va entre CDMX y Bogotá: sólo cambian la hora y la ciudad.'),
     (['16'], 'Un idioma por tiempo', '«3 idiomas●» entra con el lecho; ES, EN y PT caen uno por tiempo.'),
     (['17', '18'], 'Doble remate', '«…¿Y para el lunes?» y el golpe seco de «También●».'),
     (['20a', '20b'], 'Cierre con la prueba', 'Golpe 1 sobre el navy de Efeonce; golpe 2: el arco cierra y el número cae en el tiempo; entra la firma.'),
    ]
    cards = []
    for gi, (gids, title, desc) in enumerate(groups):
        G, gsp, GT, gstage = build(f'g{gi}x', gids, .28, local, tail=BEAT)
        css += G.kf
        rng = ' + '.join(gids)
        cards.append(f'<div style="display:flex;flex-direction:column;gap:8px;width:302px">{gstage}'
                     f'<div style="font-size:12px;color:#36C8BF;font-weight:600">{rng} · {str(round(GT-BEAT,1)).replace(".", ",")} s</div>'
                     f'<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-.035em;font-size:20px;color:#ECEEF2">{title}</div>'
                     f'<div style="font-size:13px;line-height:1.45;color:#8A919C">{desc}</div></div>')

    esfH = '<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:#36C8BF;margin-left:0.035em"></span>'
    h2 = "margin:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:760;letter-spacing:-0.035em;font-size:30px"
    section = (
     f'<section class="vo-anim" style="--T:{T}s;display:flex;flex-direction:column;gap:18px">{radios}'
     f'<h2 style="{h2}">Animatic · escena a escena{esfH}</h2>'
     f'<div style="font-size:15px;color:#C9CED6;max-width:1100px;line-height:1.55">Los 30 s del video con los planos corregidos y cada componente animado con su gramática: '
     f'cómo entra, cuánto dura y cómo sale contra el corte.</div>'
     f'<div style="font-size:14px;color:#C9CED6;max-width:1100px;line-height:1.6"><strong style="color:#ECEEF2">Versión 2.</strong> Montaje cuadrado a {BPM} BPM: cada corte cae en un tiempo (0,5 s), y respeta las lecturas mínimas '
     f'(cambian 02 → 1,5 s · 03 → 1,0 · 04 → 2,0 · 07 → 1,5 · 09 → 1,0 · 11a → 0,5 · 11b → 1,0 · 20a y 20b → 1,5). '
     f'La esfera con golpe (y su nota) queda sólo para seis momentos: Rebobinemos, Día 42, Ya está, También y los dos golpes del cierre; en zócalos y burbujas la esfera llega con la palabra. '
     f'En planos de 1 s el lecho entra en 6 cuadros sin sobrepaso y sale con el corte, y el texto entra junto con el lecho, así que ya no hay lecho vacío. '
     f'Sin sonido todavía: el metrónomo y la barra marcan dónde iría cada golpe. '
     f'<strong style="color:#ECEEF2">Subtítulos:</strong> vidrio denso con la esquina recta hacia quien habla; las preguntas llevan el anillo, que se dibuja al entrar, y la respuesta llega como remate con esfera. En 4:5 terminan en el 80 % y en estos planos no tapan caras ni manos.</div>'
     f'<div style="display:flex;gap:36px;align-items:flex-start">'
     f'<div class="vo-main" style="display:flex;flex-direction:column;gap:10px;width:540px">{stage}{bar}'
     f'<div style="display:flex;justify-content:space-between;font-size:12px;color:#8A919C"><span>0 s</span><span>15 s</span><span>30 s</span></div></div>'
     f'<div style="flex:1;display:flex;flex-direction:column;gap:22px;min-width:0">'
     f'<div class="vo-main" style="position:relative;height:190px">{"".join(lbls)}{met}</div>'
     f'<div style="display:flex;flex-wrap:wrap;gap:8px">{chips}</div>'
     f'<div style="font-size:13px;color:#8A919C;line-height:1.55">Toca un número para congelar esa escena en su momento asentado; «▶ Todo» vuelve a correr desde el inicio. '
     f'Es una vista previa del navegador para aprobar el movimiento, no un render exacto al cuadro: el render final sale del motor en código con estos mismos tiempos.</div>'
     f'<div style="font-size:14px;color:#C9CED6;line-height:1.6"><strong style="color:#ECEEF2">Qué mirar.</strong> Que cada texto se alcance a leer en su plano; que la esfera caiga en el golpe; '
     f'que el subtítulo del 01 cruce bien al 02; que el zócalo de las ciudades se sienta continuo; y que nada tape caras ni el producto.</div>'
     f'</div></div>'
     f'<h3 style="margin:12px 0 0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-0.035em;font-size:24px;color:#ECEEF2">Por momento, en loop{esfH}</h3>'
     f'<div style="display:flex;flex-wrap:wrap;gap:22px">{"".join(cards)}</div>'
     f'</section>')
    return '\n'.join(css), section


if __name__ == '__main__':
    css, sec = main(local=False)
    open(os.path.join(HERE, 'anim.css'), 'w').write(css)
    open(os.path.join(HERE, 'anim.html'), 'w').write(sec)
    lcss, lsec = main(local=True)
    open(os.path.join(HERE, 'anim-test.html'), 'w').write(
        '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,760;12..96,800&family=Poppins:wght@300;400;500;600&display=swap">'
        f'<style>body{{margin:0;background:#0F1115;color:#ECEEF2;font-family:Poppins,sans-serif;padding:40px;width:1640px}}{lcss}</style></head><body>{lsec}</body></html>')
    print('css', len(css), 'html', len(sec))
