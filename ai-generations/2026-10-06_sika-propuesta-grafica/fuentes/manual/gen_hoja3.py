#!/usr/bin/env python3
"""Hoja 3 (tablero Referencia): el material que Sika ya tenía, rehecho en la línea POSIBLE."""
from gen import page, head, write, K, G2, G3
B = lambda i: f'/_blob/{i}'
HOY_CARRUSEL, HOY_SIKASEAL, HOY_PDV = B('eb2e2f84f5a9d75eed6730579a84da9c'), B('a1126b3e64c8834dcfc088975aad2a3b'), B('d235d651936dfb9e2a2f66509e35c6d3')
FLEX1, CAR2, CAR3 = B('e66f6555552b30b8817fb757fd031821'), B('aefb4daf320936b2b3f673f72e8b0d06'), B('eacb0648f3b48dc649742a59e0eda59f')
SS1, SS2, SS3 = B('2401ebbfa22b0839938605d08a615a2c'), B('147b5f517f069071c7f276ad4b81da6d'), B('03846639e421f05b36cdb2bcdb2d67db')
CENEFA, STOPPER = B('6cd507ddcf78ced1aba662c00587fc4d'), B('f26bdfb1559158ef5db98fdb31b55483')

def pieza(src, alt, w, h, cap):
    return (f'<div style="display: flex; flex-direction: column; gap: 8px">'
            f'<img src="{src}" alt="{alt}" style="width: {w}px; height: {h}px; display: block; border-radius: 3px; box-shadow: 0 8px 20px rgba(0,0,0,0.14)">'
            f'<div style="font-size: 14px; font-weight: 700; color: {G3}">{cap}</div></div>')

def grupo(titulo, texto, hoy, piezas):
    return (f'<div style="display: flex; flex-direction: column; gap: 16px">'
            f'<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 24px">'
            f'<div><div style="font-size: 22px; font-weight: 800">{titulo}</div><div style="font-size: 15px; line-height: 1.4; color: {G3}; margin-top: 4px; max-width: 640px">{texto}</div></div>'
            f'<div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0"><div style="font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: {G2}">HOY</div>'
            f'<img src="{hoy}" alt="Material actual de Sika" style="height: 64px; width: auto; display: block; border-radius: 2px; opacity: 0.9"></div></div>'
            f'<div style="display: flex; gap: 16px; align-items: flex-end">{piezas}</div></div>')

g1 = grupo('Carrusel Sikaflex-119', 'Portada, uso y cierre con la misma firma y la misma fórmula de titular. El morado de la línea entra en el punto y el sello.', HOY_CARRUSEL,
           pieza(FLEX1, 'Carrusel Sikaflex-119, lámina 1', 330, 330, '1 · Portada (pieza aprobada)') +
           pieza(CAR2, 'Carrusel Sikaflex-119, lámina 2: la repisa queda firme sin taladro', 330, 330, '2 · El uso, foto nueva') +
           pieza(CAR3, 'Carrusel Sikaflex-119, lámina 3: cierre con la firma', 330, 330, '3 · Cierre y punto de venta'))
g2 = grupo('SikaSeal-170 · nueva imagen 2 en 1', 'La persona, el producto y el espacio: tres piezas con un solo sello 2 en 1, el mismo módulo de beneficios y el punto petróleo.', HOY_SIKASEAL,
           pieza(SS1, 'SikaSeal-170: una mujer sella la junta de su baño', 330, 330, '1 · Lo hago yo, foto nueva') +
           pieza(SS2, 'SikaSeal-170: post aprobado', 330, 330, '2 · El producto (pieza aprobada)') +
           pieza(SS3, 'SikaSeal-170 en la cocina', 330, 330, '3 · El espacio'))
g3 = grupo('Material PDV Sikaflex-119', 'Cenefa y stopper: firma, titular, beneficios y el envase de pie sobre la diagonal negra. Se leen a la distancia del anaquel.', HOY_PDV,
           pieza(CENEFA, 'Cenefa Sikaflex-119', 1640, 273, 'Cenefa · 2400 × 400 px, proporción 6:1 (medida final según cadena)') +
           pieza(STOPPER, 'Stopper Sikaflex-119: piedra pegada sin soporte y el cartucho héroe', 300, 450, 'Stopper · 2:3'))
body = head('LO QUE SIKA YA TENÍA · REHECHO EN POSIBLE', 'Las mismas piezas de Sika, en la línea que proponemos.') + (
    f'<div style="display: flex; gap: 56px">{g1}{g2}</div>'
    f'<div style="margin-top: 12px">{g3}</div>')
write('Referencia.dc.html', page('Material de Sika en POSIBLE', 2240, 1230, body))
print('ok')
