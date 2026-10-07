#!/usr/bin/env python3
"""Segunda tanda del manual: muestras de escala, punto de venta y fórmula de titular.
Usa las mismas funciones de firma de gen.py."""
import gen
from gen import (sello_lanz, GRAFITO, firma, page, head, note, write, K, W, Y, R, PURPLE, BC, G2, G3, FIRMA_CORP)

PDV = '/_blob/8633a9f19aa9c9074212b798f0a14916'
FLEX = '/_blob/c43c1d58f72dac786fa3ddfd4fd1b1ba'
CONCRETO = '/_blob/196d4b2e48a5269e7aa6f7e00a754c9d'

ICONS = {
    'escudo': '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    'gota': '<path d="M12 3c3.5 4.5 6 7.6 6 10.5A6 6 0 0 1 6 13.5C6 10.6 8.5 7.5 12 3z"/>',
    'cuadros': '<rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="8.5" y="14" width="7" height="7" rx="1"/>',
    'mano': '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5"/><path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3 14a1.5 1.5 0 0 1 2.4-1.8L8 15"/>',
    'sol': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'reloj': '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    'agua': '<path d="M7 16a4 4 0 0 1-.9-7.9A5.5 5.5 0 0 1 17 7a4.5 4.5 0 0 1 .5 9"/><path d="M9 19l1-2M13 19l1-2"/>',
    'grafica': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
}


ICONS_ALL = None

def modulo(nombre, bajada, bens, dark=False, width=440, compacto=False):
    """Módulo de producto (patrón del post 4:5): nombre, bajada, filete y tres beneficios en fila."""
    fg = W if dark else K
    soft = '#BDBDB6' if dark else '#3D3D39'
    rule = 'rgba(255,255,255,0.22)' if dark else 'rgba(20,20,20,0.22)'
    ic = Y if dark else K
    iw, gap, fs, nf, bf = (92, 14, 15, 32, 17) if compacto else (124, 20, 17, 38, 20)
    items = ''.join(
        f'<div style="display: flex; flex-direction: column; gap: 8px; width: {iw}px">'
        f'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="{ic}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS_ALL[i]}</svg>'
        f'<div style="font-size: {fs}px; font-weight: 600; line-height: 1.2; color: {fg}">{t}</div></div>' for i, t in bens)
    return (f'<div style="width: {width}px; display: flex; flex-direction: column; gap: 18px">'
            f'<div style="display: flex; flex-direction: column; gap: 4px"><div style="{BC}; font-size: {nf}px; font-weight: 800; line-height: 1; color: {fg}">{nombre}</div>'
            f'<div style="font-size: {bf}px; font-weight: 500; line-height: 1.35; color: {soft}">{bajada}</div></div>'
            f'<div style="height: 1px; background: {rule}"></div>'
            f'<div style="display: flex; gap: {gap}px">{items}</div></div>')


def post(name, title, photo, pos, accent, sub, bens, seal_big, seal_bg, dark=False, retailer=True, raster=None, dot=None, cifra=None, nombre=''):
    bg = K if dark else Y
    fg = W if dark else K
    sc = 'negro' if dark else 'amarillo'
    ic = Y if dark else K
    rule = 'rgba(255,255,255,0.18)' if dark else 'rgba(20,20,20,0.22)'
    soft = '#BDBDB6' if dark else '#3D3D39'
    ben = ''.join(
        f'<div style="display: flex; align-items: center; gap: 14px; padding: 13px 0; border-top: 1px solid {rule}">'
        f'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="{ic}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink: 0">{ICONS[i]}</svg>'
        f'<span>{t}</span></div>'
        for i, t in bens) + f'<div style="border-top: 1px solid {rule}"></div>' 
    if dark:
        corp = (f'<div style="position: absolute; left: 0; bottom: 0; background: {Y}; padding: 16px 24px 14px 64px">'
                f'<img src="{FIRMA_CORP}" alt="Sika · Construyendo confianza" style="height: 58px; width: auto; display: block"></div>')
    else:
        corp = f'<img src="{FIRMA_CORP}" alt="Sika · Construyendo confianza" style="position: absolute; left: 64px; bottom: 56px; height: 58px; width: auto">'
    ret = ''
    if retailer:
        ret = (f'<div style="position: absolute; right: 48px; bottom: 52px; display: flex; align-items: center; gap: 12px; background: {K}; padding: 10px 14px; color: {W}; font-size: 20px; font-weight: 700">'
               f'De venta en<div style="border: 1.5px dashed #BDBDB6; color: #E4E4DE; font-size: 15px; padding: 8px 12px">[Logo retailer]</div></div>')
    seal_top_bg, seal_top_fg = (Y, K) if dark else (K, Y)
    fondo = (f'<img src="{raster}" alt="{title}" style="position: absolute; inset: 0; width: 1080px; height: 1080px; display: block">' if raster else
             f'<div style="position: absolute; top: 0; right: 0; width: 760px; height: 1080px; clip-path: polygon(32.8% 0, 100% 0, 100% 100%, 0 100%)">'
             f'<img src="{photo}" alt="{title}" style="width: 760px; height: 1080px; object-fit: cover; object-position: {pos}; display: block"></div>')
    parts = [
        fondo,
        f'<div style="position: absolute; top: 56px; left: 64px">{firma(132, sc, endoso=False)}</div>',
        f'<div style="position: absolute; top: 400px; left: 64px; width: 440px; {BC}; font-size: 80px; font-weight: 800; line-height: 0.9"><span style="font-weight: 300">Innovar para</span> <span style="color: {Y if dark else K}">{accent[:-1]}<span style="color: {(Y if dark else (dot or K))}">.</span></span></div>',
        f'<div style="position: absolute; left: 64px; bottom: {200 if dark else 190}px">{modulo(nombre, sub, bens, dark, 300, True)}</div>',
        f'<div style="position: absolute; top: 56px; right: 56px">{sello_lanz(220, "nuevo", seal_bg, seal_big, cifra)}</div>',
        corp, ret,
    ]
    inner = (f'<div style="width: 1080px; height: 1080px; position: relative; overflow: hidden; background: {bg}; '
             f"font-family: 'Barlow', sans-serif; color: {fg}\">" + ''.join(parts) + '</div>')
    html = page(title, 1080, 1080, '', bg=bg, pad=0)
    # page() envuelve en un contenedor flex con padding; para el post usamos el lienzo completo
    start = html.index('<div style="width: 1080px; height: 1080px; box-sizing: border-box;')
    end = html.index('</x-dc>')
    html = html[:start] + inner + '\n' + html[end:]
    write(name, html)


def b_escala():
    post('Sikaflex.dc.html', 'Muestra Sikaflex-119', FLEX, '8% 50%', 'resolver.', 'Fija sin martillo ni taladro.',
         [('mano', 'Agarre instantáneo'), ('sol', 'Para todo clima'), ('reloj', 'Sin soporte temporal')],
         'SIKAFLEX®-119 HIGH TACK', PURPLE, nombre='Sikaflex®-119 High Tack', dot=PURPLE, cifra=('AGARRE', 'INSTANTÁNEO'), raster='/_blob/f5c7a1ad729e27ee03efbdfdb45dcfa3')
    post('ViscoCrete.dc.html', 'Muestra ViscoCrete 45 HE', CONCRETO, '62% 50%', 'rendir más.',
         'Superplastificante para concretos autoconsolidables.',
         [('agua', 'Alto ahorro de agua'), ('reloj', 'Resistencias tempranas'), ('grafica', 'Más usos de cimbra')],
         'SIKA® VISCOCRETE® 45 HE', None, nombre='Sika® ViscoCrete® 45 HE', cifra=('AHORRO', 'DE AGUA'), dark=True, retailer=False)


def b_pdv():
    side = ''.join([
        note('Colgante horizontal.', 'Amarillo con la firma y el titular; producto y sello 2 en 1 sobre el panel negro con la diagonal del sistema. Se lee desde el pasillo.'),
        note('Cenefa.', 'Firma reducida, titular, producto y qué resuelve en una línea. El sello 2 en 1 en su versión compacta.'),
        note('Producto.', 'El envase real, alineado y con el frente completo. La cenefa nunca tapa el nombre.'),
        note('Tres distancias.', 'Pasillo: colgante. Frente al anaquel: cenefa. En la mano: envase.'),
        f'<div style="font-size: 13px; line-height: 1.4; color: {G2}">Montaje ilustrativo: la tienda es generada con IA; envases, cenefa y colgante parten del render y los artes reales, con acabado fotográfico de Sunburst. Medidas finales de cenefa y colgante según cada cadena.</div>',
    ])
    body = head('10 · PUNTO DE VENTA EN TIENDA', 'El sistema en el anaquel: colgante, cenefa y producto.') + (
        '<div style="display: flex; gap: 28px">'
        f'<img src="{PDV}" alt="Anaquel de tienda con la cenefa y el colgante de la campaña y SikaSeal-170 en exhibición" style="width: 1100px; height: 733px; object-fit: cover; border-radius: 4px; display: block; flex-shrink: 0">'
        f'<div style="display: flex; flex-direction: column; gap: 18px">{side}</div></div>')
    write('PDV.dc.html', page('Punto de venta en tienda', 1600, 960, body))


def b_titular():
    def ej(acc, prod, desc):
        return (f'<div style="background: {W}; border-radius: 4px; padding: 22px 26px; display: flex; flex-direction: column; gap: 8px">'
                f'<div style="{BC}; font-size: 44px; font-weight: 800; line-height: 1">Innovar para <span style="display: inline-block; background: {Y}; padding: 0 6px">{acc}</span></div>'
                f'<div style="font-size: 15px; color: {G3}"><b style="color: {K}">{prod}</b> · {desc}</div></div>')
    grid = ''.join([
        ej('simplificar.', 'SikaSeal®-170', 'antihongos + uso general en un solo sellador'),
        ej('resolver.', 'Sikaflex®-119 High Tack', 'fija sin martillo ni taladro'),
        ej('rendir más.', 'Sika® ViscoCrete® 45 HE', 'alto ahorro de agua y resistencias tempranas'),
        ej('construir con confianza.', 'Mensaje paraguas', 'piezas de marca sin producto'),
    ])
    body = head('11 · FÓRMULA DE TITULAR', 'Los mensajes del brief se vuelven el titular de cada lanzamiento.') + (
        f'<div style="background: {K}; border-radius: 4px; padding: 34px 44px; display: flex; align-items: center; justify-content: space-between">'
        f'<div style="{BC}; font-size: 80px; font-weight: 800; line-height: 1; color: {W}">Innovar para <span style="color: {Y}">[lo que resuelve].</span></div>'
        f'{firma(56, "negro", endoso=False)}</div>'
        f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">{grid}</div>'
        f'<div style="font-size: 15px; line-height: 1.45; color: {G3}; max-width: 1100px">Origen: los cinco mensajes del brief (innovar para resolver, simplificar, mejorar el desempeño, construir con mayor confianza y hacer posible lo que antes parecía difícil). Un verbo por lanzamiento, siempre con punto final.</div>')
    write('Titular.dc.html', page('Fórmula de titular', 1600, 780, body))


ICONS_ALL = ICONS

if __name__ == '__main__':
    b_escala()
    b_pdv()
    b_titular()
    print('ok')
