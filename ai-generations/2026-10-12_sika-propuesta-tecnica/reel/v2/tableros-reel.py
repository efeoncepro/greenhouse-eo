#!/usr/bin/env python3
"""Lleva el reel v2 aprobado (12/10) a los tableros del lienzo: Storyboard.dc.html (anexo, 8 cuadros) y Reel.dc.html (video).
Uso: python3 tableros-reel.py <carpeta project del lienzo> <Reel.dc.html vigente leído del lienzo>"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(HERE, '..', '..', '..', '2026-10-06_sika-propuesta-grafica', 'fuentes')
sys.path.insert(0, os.path.join(F, 'manual')); sys.path.insert(0, os.path.join(F, 'lienzo'))
OUT, REEL_SRC = os.path.abspath(sys.argv[1]), sys.argv[2]
import gen  # noqa: E402
gen.OUT = OUT
from gen import page, head, K, Y, BC, G2, G3  # noqa: E402
VIDEO = '/_blob/df595202ccd71c38c56dba32539ae028'
C = [('bc46e7f7b533df63dd5fa54bb8323a93', '01', '0–4 s', 'GANCHO', 'Macro en cámara lenta: una gota cae sobre la junta sellada y estalla en una corona de agua. Sin texto en pantalla.', '«El agua siempre busca una entrada.»', 'Silencio y un grave que crece · impacto'),
     ('c1c51298f825042d46ff5d26de29448f', '02', '4–6 s', 'BAÑO', 'Regadera con vapor: el agua escurre por los azulejos y se detiene en la junta. La etiqueta entra desde la izquierda.', '«En el baño.»', 'Golpe de la música'),
     ('16978260965bd23d4ffbf20982cc5cab', '03', '6–8 s', 'COCINA', 'El chorro golpea la tarja y las gotas vuelan hacia la junta. La etiqueta entra desde la derecha.', '«En la cocina.»', 'Agua contra el acero'),
     ('c2e80751eae04b0d4e527a2c63e5ccbe', '04', '8–10 s', 'CANCELERÍA', 'Tormenta de noche sobre el marco de aluminio; un relámpago ilumina cada gota.', '«En la ventana.»', 'Lluvia y trueno lejano'),
     ('df49ef07513c1a2d11930a4f9de361a8', '05', '10–12 s', 'EL GIRO', 'Campo amarillo con cortes negros a 13°: «UNO solo.» a pantalla completa.', '«Ahora, un solo sellador la detiene.»', 'Golpe seco'),
     ('71c55686e6c2fc640105a0a16f8e0db3', '06', '12–17 s', 'LA APLICACIÓN', 'Macro: la boquilla deja un cordón perfecto en la junta. El nombre entra sobre panel amarillo.', '«Nuevo SikaSeal-170:»', 'Entra el ritmo'),
     ('705a8abea6989334f5ce22c49c610316', '07', '17–21 s', 'EL HÉROE', 'El envase, de pie, mientras el agua estalla alrededor. Cae el sello 2 en 1 y entra el titular.', '«antihongos y de uso general.»', 'Clímax de la música'),
     ('ef598dbca9f1e31636e6e52d055bc950', '08', '21–25 s', 'CIERRE · LA FIRMA', 'POSIBLE se arma (PO · BLE, cae el SÍ, cae el triángulo) y se queda con la firma de Sika.', '«Innovar es hacerlo posible. Innovar es hacerlo Sika.»', 'Golpe final y cola')]


def card(b, n, t, tit, img, vo, sfx):
    return (f'<div style="display: flex; flex-direction: column; gap: 10px">'
            f'<div style="position: relative"><img src="/_blob/{b}" alt="Cuadro {n}" style="width: 100%; aspect-ratio: 9/16; object-fit: cover; border-radius: 4px; display: block; box-shadow: 0 10px 24px rgba(0,0,0,0.18)">'
            f'<div style="position: absolute; bottom: 10px; right: 10px; background: {K}; color: {Y}; {BC}; font-weight: 800; font-size: 26px; padding: 2px 10px">{n}</div></div>'
            f'<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 6px"><div style="font-size: 15px; font-weight: 800; letter-spacing: 0.08em">{tit}</div><div style="font-size: 13px; font-weight: 600; color: {G2}; white-space: nowrap">{t}</div></div>'
            f'<div style="font-size: 14px; line-height: 1.4; color: {G3}">{img}</div>'
            f'<div style="font-size: 16px; line-height: 1.35; font-style: italic; border-left: 3px solid {Y}; padding-left: 8px">{vo}</div>'
            f'<div style="font-size: 13px; color: {G2}"><b style="color: {K}">Sonido:</b> {sfx}</div></div>')


QR = ('<div style="display: flex; align-items: center; gap: 16px; background: #FFFFFF; border-radius: 4px; padding: 12px 20px 12px 12px; flex-shrink: 0">'
      '<img src="/_blob/748e26a939d29ec4642e7c225a51275d" alt="Código QR del reel en video" style="width: 112px; height: 112px; display: block">'
      f'<div><div style="font-size: 18px; font-weight: 800">Vea el reel en video</div><div style="font-size: 14px; line-height: 1.4; color: {G3}; margin-top: 4px">Escanee el código o abra<br>think.efeoncepro.com/muestras/<br>sika-posible-dde148ea051c</div></div></div>')
body = (f'<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px">{head('ENTREGABLE 3 · REEL 9:16 · 25 S · VIDEO CON LOCUCIÓN Y MÚSICA · STORYBOARD', 'El agua siempre busca una entrada.')}{QR}</div>') + (
    f'<div style="display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 22px">{"".join(card(*c) for c in C)}</div>'
    f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; margin-top: 6px">'
    f'<div style="font-size: 15px; line-height: 1.45; color: {G3}"><b style="color: {K}">Narrativa.</b> El agua como antagonista: busca una entrada en tres lugares de la casa → giro («uno solo») → el producto aplicándose → el envase frente al agua → cierre con la firma de campaña, que se arma y se queda en pantalla.</div>'
    f'<div style="font-size: 15px; line-height: 1.45; color: {G3}"><b style="color: {K}">Locución.</b> Voz de locutor mexicano, grave y segura. El reel se entrega como video, con locución y música, junto a esta propuesta.</div>'
    f'<div style="font-size: 15px; line-height: 1.45; color: {G3}"><b style="color: {K}">Imagen y edición.</b> Planos de video generados con IA a partir de cuadros clave; el envase es el render oficial. Cortes en 4 · 6 · 8 · 10 · 12 · 17 · 21 s; etiquetas, sello y titulares según el manual; transiciones con la diagonal de 13°.</div></div>')
gen.write('Storyboard.dc.html', page('Storyboard del reel', 2400, 1056, body))
import sign  # noqa: E402
sign.P = OUT
print('storyboard h =', sign.sign('Storyboard.dc.html'))

s = open(REEL_SRC).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
rep('<title>Reel SikaSeal-170 · animatic</title>', '<title>Reel SikaSeal-170 · video</title>')
rep('<video src="/_blob/6e04eb5dec5879143136af782b56320a" controls muted loop playsinline', f'<video src="{VIDEO}" controls loop playsinline')
rep('REEL 9:16 · 25 S · ANIMATIC EN VIDEO', 'REEL 9:16 · 25 S · VIDEO CON LOCUCIÓN Y MÚSICA')
i = s.index('<div style="font-size: 16px; line-height: 1.45; color: #3D3D39; max-width: 820px">'); j = s.index('  </div>\n</div>\n<div data-ef-footer')
row = lambda t, a, b: (f'<div style="padding: 10px 0; border-bottom: 1px solid #C9C9C2">{t}</div><div style="padding: 10px 8px 10px 0; border-bottom: 1px solid #C9C9C2">{a}</div>'
                       f'<div style="padding: 10px 0; border-bottom: 1px solid #C9C9C2; font-style: italic">{b}</div>')
tabla = ''.join(row(t, a, b) for t, a, b in [
    ('0–4 s', 'La gota cae sobre la junta y estalla en cámara lenta.', '«El agua siempre busca una entrada.»'),
    ('4–10 s', 'Regadera, tarja de cocina y ventana bajo tormenta, con sus etiquetas en zigzag.', '«En el baño. En la cocina. En la ventana.»'),
    ('10–12 s', 'Campo amarillo con cortes a 13°: «UNO solo.»', '«Ahora, un solo sellador la detiene.»'),
    ('12–17 s', 'La boquilla deja un cordón perfecto; entra el nombre del producto.', '«Nuevo SikaSeal-170:»'),
    ('17–21 s', 'El envase frente al agua. Cae el sello 2 en 1 y entra el titular.', '«antihongos y de uso general.»'),
    ('21–25 s', 'La firma se arma: PO · BLE, cae el SÍ, cae el triángulo, regla y logo.', '«Innovar es hacerlo posible. Innovar es hacerlo Sika.»')])
nuevo = ('<div style="font-size: 16px; line-height: 1.45; color: #3D3D39; max-width: 820px">Seis planos de video generados con IA (Seedance 2.5) a partir de cuadros clave: la gota, la regadera, la cocina, la cancelería, la aplicación y el envase real frente al agua. La tipografía, el sello de lanzamiento y la firma animada siguen el manual (diagonal a 13°, firma que se arma).</div>\n'
         '    <div style="display: grid; grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1fr); font-size: 15px; line-height: 1.35; border-top: 2px solid #141414; margin-top: 6px">\n'
         '      <div style="padding: 10px 0; font-weight: 800; border-bottom: 1px solid #C9C9C2">Tiempo</div><div style="padding: 10px 0; font-weight: 800; border-bottom: 1px solid #C9C9C2">Imagen</div><div style="padding: 10px 0; font-weight: 800; border-bottom: 1px solid #C9C9C2">Locución</div>\n      '
         + tabla + '\n    </div>\n'
         '    <div style="font-size: 14px; line-height: 1.4; color: #5A5A55; max-width: 820px; margin-top: 6px">Versión de muestra para el concurso. Locución de locutor mexicano y música instrumental; el envase es el render oficial de SikaSeal-170. El archivo de video se adjunta a la propuesta.</div>\n')
s = s[:i] + nuevo + s[j:]
open(os.path.join(OUT, 'Reel.dc.html'), 'w').write(s)
print('reel ok')
