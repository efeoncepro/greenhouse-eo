#!/usr/bin/env python3
"""Tablero del storyboard del reel (7 cuadros; el cierre es la firma). Correr sign.py después."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'manual'))
os.chdir(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'manual'))
from gen import page, head, write, K, Y, BC, G2, G3
F=[('34e4f699b353ea884bad7986adc9011f','01','0–3,0 s','GANCHO','Macro en cámara lenta: la gota golpea la junta sellada y levanta una corona de agua. El texto entra línea por línea; «lugar?» golpea en amarillo.','«¿Un sellador para cada lugar de la casa?»','Latido grave · golpe de gota'),
 ('7cb9773f50120ff1d224b06df0d1d471','02','3,0–5,5 s','EL PROBLEMA','Barrido a 13°. Baño, cocina y cancelería entran en diagonal, con etiquetas en zigzag al ritmo de la música.','«Baño. Cocina. Cancelería.»','Tres golpes secos, uno por espacio'),
 ('9b8b088e70b2393aa6392b95192ba64c','03','5,5–6,5 s','EL GIRO','Los tres espacios se apagan y una franja amarilla inclinada estampa «UNO solo.» a pantalla completa.','«Uno solo.»','Impacto + medio tiempo de silencio'),
 ('6e07797cd4fc00d0ab27ce88c3f33172','04','6,5–10,0 s','LA APLICACIÓN','Macro: la pistola deja un cordón perfecto en la junta de la regadera. El nombre entra sobre el muro oscuro.','«Nuevo SikaSeal-170.»','Deslizamiento del cordón · entra la batería'),
 ('ca7c713a406793df92672e06d1f6e5de','05','10,0–14,0 s','EL HÉROE','El agua estalla alrededor del envase con empuje de cámara bajo. Cae el sello 2 en 1 y sube el nombre.','«Dos en uno: antihongos y de uso general.»','Drop completo'),
 ('de57f21984c466a6a56b8259046a0413','06','14,0–18,0 s','BENEFICIOS','La corona arriba; el panel amarillo sube en diagonal y los tres beneficios entran fila por fila.','«Resistente al moho. Impermeable y flexible.»','Un golpe por beneficio'),
 ('36a999116dee5502dfc3b9ec8ca567b5','07','18,0–25,0 s','CIERRE · LA FIRMA','POSIBLE se arma (PO · BLE, cae el SÍ, cae el triángulo) y el producto sube de pie sobre la diagonal negra. Se sostiene hasta el final con la firma de Sika.','«Innovar es hacerlo posible. Innovar es hacerlo Sika.»','Subida + golpe agudo con el triángulo · acorde final y cola')]
def card(b,n,t,tit,img,vo,sfx):
    return (f'<div style="display: flex; flex-direction: column; gap: 10px">'
            f'<div style="position: relative"><img src="/_blob/{b}" alt="Cuadro {n}" style="width: 100%; aspect-ratio: 9/16; object-fit: cover; border-radius: 4px; display: block; box-shadow: 0 10px 24px rgba(0,0,0,0.18)">'
            f'<div style="position: absolute; bottom: 10px; right: 10px; background: {K}; color: {Y}; {BC}; font-weight: 800; font-size: 26px; padding: 2px 10px">{n}</div></div>'
            f'<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 6px"><div style="font-size: 15px; font-weight: 800; letter-spacing: 0.08em">{tit}</div><div style="font-size: 13px; font-weight: 600; color: {G2}; white-space: nowrap">{t}</div></div>'
            f'<div style="font-size: 14px; line-height: 1.4; color: {G3}">{img}</div>'
            f'<div style="font-size: 16px; line-height: 1.35; font-style: italic; border-left: 3px solid {Y}; padding-left: 8px">{vo}</div>'
            f'<div style="font-size: 13px; color: {G2}"><b style="color: {K}">Sonido:</b> {sfx}</div></div>')
grid=''.join(card(*f) for f in F)
body=head('ENTREGABLE 3 · REEL 9:16 · 25 S · STORYBOARD CON LOCUCIÓN','Tres lugares, un solo sellador.') + (
 f'<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 24px">{grid}</div>'
 f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; margin-top: 6px">'
 f'<div style="font-size: 15px; line-height: 1.45; color: {G3}"><b style="color: {K}">Narrativa.</b> Problema (un sellador para cada espacio) → giro («uno solo») → el producto aplicándose → la prueba → beneficios → cierre con la firma de campaña, que se arma y se queda en pantalla.</div>'
 f'<div style="font-size: 15px; line-height: 1.45; color: {G3}"><b style="color: {K}">Locución.</b> Voz en español de México, cálida y segura, ritmo ágil. Para el público profesional, la línea 06 se cambia por un dato técnico.</div>'
 f'<div style="font-size: 15px; line-height: 1.45; color: {G3}"><b style="color: {K}">Música y edición.</b> Percusión de tráiler con batería real, bajo y metales, 120 BPM; cortes al golpe en 3 · 5,5 · 6,5 · 10 · 14 · 18 s; transiciones con la diagonal de 13°; la firma sostiene 7 s.</div></div>')
write('Storyboard.dc.html', page('Storyboard del reel', 2400, 1060, body))
print('ok')
