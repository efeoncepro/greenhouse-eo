#!/usr/bin/env python3
"""Master Graphic de la campaña y tablero de evolución (antes → después)."""
from gen import firma, page, head, note, write, K, W, Y, R, TEAL, PURPLE, BC, G1, G2, G3, FIRMA_CORP, LOGO

KV = '/_blob/614c592b90e479709760a64d626c8e5d'
ANT_FIRMAS = '/_blob/958fede1717344614a0b9a688ace394b'
ANT_CARRUSEL = '/_blob/b5c5b546dd8a61cb3967cb7c6ef80848'
ANT_SIKASEAL = '/_blob/2c80dc444b1563000c95e89dce21e8c5'
FB = '/_blob/3fd892999625d166c4b604632a050649'
FLEX = '/_blob/f5c7a1ad729e27ee03efbdfdb45dcfa3'
IG = '/_blob/c8dd29e0f4f78e598eab9ac9e1dc3a01'


def titular(s, verbo, punto=K, fg=K, vcol=K):
    return (f'<div style="{BC}; font-size: {s}px; font-weight: 800; line-height: 0.92; color: {fg}">'
            f'<div style="font-weight: {300 if s >= 30 else 400}">Innovar para</div>'
            f'<div style="color: {vcol}">{verbo}<span style="color: {punto}">.</span></div></div>')


def master_oscuro():
    BG = '/_blob/ec388a0281ae15caacd082257a5d583c'
    PRODS = '/_blob/cff8416dadb196c2f71bff4ac9f29045'
    parts = [
        f'<img src="{BG}" alt="SikaSeal-170 y Sikaflex-119 sobre piedra mojada, con una explosión de agua y concreto" style="position: absolute; inset: 0; width: 1920px; height: 1080px; display: block">',
        # firma monumental, detrás del producto
        f'<div style="position: absolute; top: 64px; left: 92px; filter: drop-shadow(0 6px 24px rgba(0,0,0,0.55))">{firma(300, "foto", endoso=False)}</div>',
        # producto por delante de la palabra
        f'<img src="{PRODS}" alt="" style="position: absolute; inset: 0; width: 1920px; height: 1080px; display: block">',
        f'<div style="position: absolute; top: 575px; left: 96px; width: 760px">{titular(80, "construir con<br>confianza", Y, W, Y)}</div>',
        f'<div style="position: absolute; top: 818px; left: 96px; width: 600px; font-size: 24px; font-weight: 500; line-height: 1.4; color: #EDEDE6">Selladores, adhesivos y aditivos que convierten la innovación en obras que funcionan.</div>',
        f'<div style="position: absolute; left: 0; bottom: 0; width: 760px; height: 132px; background: {Y}; clip-path: polygon(0 0, 92% 0, 100% 100%, 0 100%)"></div>',
        f'<img src="{FIRMA_CORP}" alt="Sika · Construyendo confianza" style="position: absolute; left: 96px; bottom: 34px; height: 64px; width: auto">',
    ]
    inner = ('<div style="width: 1920px; height: 1080px; position: relative; overflow: hidden; background: #141414; '
             f"font-family: 'Barlow', sans-serif; color: {W}\">" + ''.join(parts) + '</div>')
    html = page('Master Graphic · variante sobre fotografía', 1920, 1080, '', bg=K, pad=0)
    start = html.index('<div style="width: 1920px; height: 1080px; box-sizing: border-box;')
    end = html.index('</x-dc>')
    write('MasterGraphicOscuro.dc.html', html[:start] + inner + '\n' + html[end:])


def master():
    RASTER = '/_blob/1c25f0540bd33b60dcbbffc167c5ad44'
    parts = [
        f'<img src="{RASTER}" alt="SikaSeal-170 y Sikaflex-119 de pie sobre piedra mojada con agua y concreto; los envases salen de la foto hacia el amarillo" style="position: absolute; inset: 0; width: 1920px; height: 1080px; display: block">',
        f'<div style="position: absolute; top: 80px; left: 96px">{firma(230, "amarillo", endoso=False)}</div>',
        f'<div style="position: absolute; top: 520px; left: 96px; width: 640px">{titular(84, "construir con<br>confianza")}</div>',
        f'<div style="position: absolute; top: 800px; left: 96px; width: 520px; font-size: 24px; font-weight: 500; line-height: 1.4; color: {G3}">Selladores, adhesivos y aditivos que convierten la innovación en obras que funcionan.</div>',
        f'<img src="{FIRMA_CORP}" alt="Sika · Construyendo confianza" style="position: absolute; left: 96px; bottom: 72px; height: 72px; width: auto">',
    ]
    inner = ('<div style="width: 1920px; height: 1080px; position: relative; overflow: hidden; background: #FCC500; '
             f"font-family: 'Barlow', sans-serif; color: {K}\">" + ''.join(parts) + '</div>')
    html = page('Master Graphic · Innovar es hacerlo POSIBLE', 1920, 1080, '', bg=Y, pad=0)
    start = html.index('<div style="width: 1920px; height: 1080px; box-sizing: border-box;')
    end = html.index('</x-dc>')
    write('MasterGraphic.dc.html', html[:start] + inner + '\n' + html[end:])


def mini_post(src, verbo, punto, w=230):
    k = w / 1080
    return (f'<div style="width: {w}px; height: {w}px; position: relative; overflow: hidden; border-radius: 3px; flex-shrink: 0">'
            f'<img src="{src}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%">'
            f'<div style="position: absolute; top: {round(56 * k)}px; left: {round(64 * k)}px">{firma(round(132 * k), "amarillo", endoso=False)}</div>'
            f'<div style="position: absolute; top: {round(400 * k)}px; left: {round(64 * k)}px">{titular(round(80 * k), verbo, punto)}</div>'
            f'<img src="{FIRMA_CORP}" alt="" style="position: absolute; left: {round(64 * k)}px; bottom: {round(56 * k)}px; height: {round(58 * k)}px"></div>')


def evolucion():
    def fila(tema, antes_html, despues_html, cambia, conserva):
        return (
            '<div style="display: grid; grid-template-columns: 100px 440px 28px 440px minmax(0, 1fr); gap: 20px; align-items: center; '
            f'background: {W}; border-radius: 4px; padding: 20px 24px">'
            f'<div style="font-size: 20px; font-weight: 800; line-height: 1.15">{tema}</div>'
            f'<div style="height: 210px; display: flex; align-items: center; justify-content: center; background: {G1}; border-radius: 3px; overflow: hidden">{antes_html}</div>'
            f'<div style="font-size: 30px; font-weight: 800; color: {G2}; text-align: center">→</div>'
            f'<div style="height: 210px; display: flex; align-items: center; justify-content: center; gap: 12px; background: {G1}; border-radius: 3px; overflow: hidden">{despues_html}</div>'
            f'<div style="display: flex; flex-direction: column; gap: 10px">{note("Qué cambia.", cambia)}{note("Qué conservamos.", conserva)}</div></div>')

    f_antes = f'<img src="{ANT_FIRMAS}" alt="Las cuatro variantes actuales de la firma" style="max-width: 100%; max-height: 100%">'
    f_desp = f'<div style="background: {Y}; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center">{firma(70, "amarillo")}</div>'
    t_antes = (f'<div style="display: flex; flex-direction: column; gap: 10px; padding: 18px; font-size: 18px; font-weight: 800; line-height: 1.2">'
               f'<div>«Si es máximo agarre es innovación Sika»</div><div>«Si es máxima adherencia es tecnología Sika»</div>'
               f'<div>«No soy experta… pero quedó perfecto»</div><div>«Un solo sellador para baños, cocinas y cancelería»</div>'
               f'<div style="font-size: 13px; font-weight: 600; color: {G2}">Cuatro construcciones distintas en dos productos.</div></div>')
    t_desp = (f'<div style="display: flex; gap: 28px; padding: 0 20px">{titular(34, "simplificar", TEAL)}{titular(34, "resolver", PURPLE)}</div>')
    p_antes = f'<img src="{ANT_SIKASEAL}" alt="Piezas actuales de SikaSeal-170" style="max-width: 100%; max-height: 100%">'
    p_desp = mini_post(FB, 'simplificar', TEAL, 196) + mini_post(FLEX, 'resolver', PURPLE, 196)
    s_antes = f'<img src="{ANT_CARRUSEL}" alt="Carrusel actual de Sikaflex-119" style="max-width: 100%; max-height: 100%">'
    s_desp = (f'<div style="position: relative; width: 100%; height: 100%">'
              f'<img src="/_blob/dbd9c80a8e4b392bc6029b2a39d5066e" alt="Mosaico del sistema: Master Graphic y láminas del manual de identidad" style="width: 100%; height: 100%; object-fit: contain; background: #EDEDEA; display: block">'
              f'<div style="position: absolute; left: 10px; bottom: 10px; background: {K}; color: {Y}; {BC}; font-size: 16px; font-weight: 800; padding: 3px 8px">11 + 1 · manual + Master Graphic</div></div>')
    filas = ''.join([
        fila('Firma', f_antes, f_desp,
             'Cuatro variantes (con punto, sin punto, flecha, espacios) pasan a una sola. POSIBLE se escribe bien y el triángulo de Sika hace de tilde.',
             'El concepto, el SÍ destacado en amarillo, las dos líneas y la jerarquía de Sika.'),
        fila('Titular', t_antes, t_desp,
             'Una sola fórmula para todos los lanzamientos, con contraste de pesos y el punto en el color de la línea.',
             'Los mensajes clave del brief: cada verbo sale de «innovar para…».'),
        fila('Producto', p_antes, p_desp,
             'El envase pasa de ilustración a héroe: grande, con acción física (agua, adherencia, concreto) y saliendo de la foto.',
             'El render oficial, el sello «2 en 1», «De venta en» y la firma «Construyendo confianza».'),
        fila('Sistema', s_antes, s_desp,
             'De piezas resueltas una por una a un sistema con reglas que cualquier proveedor o equipo puede aplicar en cada lanzamiento.',
             'El amarillo como color dominante y la presencia en Home Depot, Sodimac y distribuidores.'),
    ])
    body = head('EVOLUCIÓN · DE LO ACTUAL A LA CAMPAÑA', 'Mismo concepto, más fuerza: lo que cambia y lo que se queda.') + \
        f'<div style="display: flex; flex-direction: column; gap: 16px">{filas}</div>'
    write('Evolucion.dc.html', page('Evolución de la campaña', 1600, 1210, body))


if __name__ == '__main__':
    master()
    evolucion()
    print('ok')
