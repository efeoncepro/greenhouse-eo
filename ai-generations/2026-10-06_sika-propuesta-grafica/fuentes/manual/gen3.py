#!/usr/bin/env python3
"""Fórmula de titular rehecha dentro de la identidad: misma tipografía, mismos fondos y misma
relación con la firma que las piezas. El bloque de color queda reservado para el SÍ."""
from gen import firma, page, head, note, write, K, W, Y, BC, G2, G3, HERO, CONCRETO, FIRMA_CORP
from gen2 import FLEX


def titular(s, fondo, verbo, linea=None):
    """Línea 1 fija, línea 2 el verbo con punto. s = cuerpo en px."""
    c1, c2 = {'amarillo': (K, K), 'negro': (W, Y), 'foto': (W, Y)}[fondo]
    return (f'<div style="{BC}; font-size: {s}px; font-weight: 800; line-height: 0.92; letter-spacing: -0.01em">'
            f'<div style="color: {c1}; font-weight: {300 if s >= 30 else 400}">Innovar para</div><div style="color: {c2}">{verbo[:-1]}<span style="color: {c2 if fondo != "amarillo" else (linea or K)}">.</span></div></div>')


def mini(w, fondo, foto, pos, verbo, prod, linea=None):
    """Aplicación en miniatura con la misma retícula de los posts."""
    k = w / 1080
    bg = Y if fondo == 'amarillo' else K
    sc = 'amarillo' if fondo == 'amarillo' else 'negro'
    pw = round(760 * k)
    return (
        f'<div style="display: flex; flex-direction: column; gap: 10px">'
        f'<div style="width: {w}px; height: {w}px; position: relative; overflow: hidden; background: {bg}; border-radius: 3px">'
        f'<div style="position: absolute; top: 0; right: 0; width: {pw}px; height: {w}px; clip-path: polygon(32.8% 0, 100% 0, 100% 100%, 0 100%)">'
        f'<img src="{foto}" alt="" style="width: {pw}px; height: {w}px; object-fit: cover; object-position: {pos}; display: block"></div>'
        f'<div style="position: absolute; top: {round(56 * k)}px; left: {round(64 * k)}px">{firma(round(132 * k), sc, endoso=False)}</div>'
        f'<div style="position: absolute; top: {round(400 * k)}px; left: {round(64 * k)}px; width: {round(440 * k)}px">{titular(round(80 * k), fondo, verbo, linea)}</div>'
        + (f'<div style="position: absolute; left: 0; bottom: 0; background: {Y}; padding: {round(14 * k)}px {round(20 * k)}px {round(12 * k)}px {round(64 * k)}px"><img src="{FIRMA_CORP}" alt="" style="height: {round(58 * k)}px; display: block"></div>'
           if fondo != 'amarillo' else
           f'<img src="{FIRMA_CORP}" alt="" style="position: absolute; left: {round(64 * k)}px; bottom: {round(56 * k)}px; height: {round(58 * k)}px">')
        + '</div>'
        f'<div style="font-size: 14px; font-weight: 800">{prod}</div></div>')


def b_titular():
    s = 84
    anat = (
        f'<div style="background: {Y}; border-radius: 4px; padding: 44px 48px; display: flex; flex-direction: column; gap: 30px; position: relative">'
        f'{firma(140, "amarillo", endoso=False)}'
        f'<div style="display: flex; gap: 26px; align-items: stretch">'
        f'<div style="width: 3px; background: {K}"></div>'
        f'{titular(s, "amarillo", "simplificar.", "#015A78")}</div>'
        f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 28px; font-size: 15px; line-height: 1.4">'
        f'<div><b>Línea 1, fija y liviana.</b> «Innovar para» en Light 300, igual en todas las piezas.</div>'
        f'<div><b>Línea 2, el verbo en Black 800.</b> El contraste de pesos lo destaca sin cajas ni color.</div>'
        f'<div><b>60 % del cuerpo de POSIBLE.</b> El titular nunca compite con la firma.</div>'
        f'<div><b>Debajo de la firma</b> y alineado a su borde izquierdo, con 2x de aire.</div>'
        f'</div></div>')
    def aprobada(src, prod):
        """La pieza aprobada tal cual (render del tablero), no una maqueta."""
        return (f'<div style="display: flex; flex-direction: column; gap: 10px">'
                f'<img src="{src}" alt="Pieza aprobada: {prod}" style="width: 234px; height: 234px; display: block; border-radius: 3px">'
                f'<div style="font-size: 14px; font-weight: 800">{prod}</div></div>')
    minis = ''.join([
        aprobada('/_blob/147b5f517f069071c7f276ad4b81da6d', 'SikaSeal®-170 · hogar'),
        aprobada('/_blob/e66f6555552b30b8817fb757fd031821', 'Sikaflex®-119 · hogar y profesional'),
        aprobada('/_blob/7e0c5fb6018c8e1b3dddb17ac1bfc6f5', 'ViscoCrete® 45 HE · industria'),
    ])
    reglas = ''.join([
        note('El bloque es sólo del SÍ.', 'El titular no lleva cajas ni resaltados: si el verbo también tuviera bloque, competiría con la firma y el SÍ perdería fuerza.'),
        note('Color por fondo y el punto de la línea.', 'Sobre amarillo, texto negro y el punto final en el color de la línea del producto (petróleo SikaSeal, morado Sikaflex; negro si no hay producto). Sobre negro o foto, «Innovar para» en blanco y el verbo con su punto en amarillo.'),
        note('Un verbo, máximo tres palabras.', 'Simplificar, resolver, rendir más, construir con confianza. Si no cabe en tres palabras, va a la bajada.'),
        note('Contraste de pesos.', 'Light 300 contra Black 800: elegancia y jerarquía con una sola familia. Bajo 30 px la línea liviana sube a 400.'),
    ])
    body = head('11 · FÓRMULA DE TITULAR', 'Innovar para + lo que resuelve. Una construcción, todos los lanzamientos.') + (
        f'<div style="display: flex; gap: 32px">'
        f'<div style="width: 700px; flex-shrink: 0">{anat}</div>'
        f'<div style="display: flex; flex-direction: column; gap: 18px; flex-grow: 1">'
        f'<div style="font-size: 13px; font-weight: 800; letter-spacing: 0.08em; color: {G2}">APLICADA A TRES LANZAMIENTOS · PIEZAS APROBADAS</div>'
        f'<div style="display: flex; gap: 22px">{minis}</div>'
        f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px">{reglas}</div>'
        f'</div></div>')
    write('Titular.dc.html', page('Fórmula de titular', 1600, 880, body))


if __name__ == '__main__':
    b_titular()
    print('ok')
