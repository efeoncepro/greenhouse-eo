# Grok Bot (xAI) — biblioteca de poses 3D · 2026-10-22

Cuarta mascota de partner con el método de
[`mascot-3d-pose-library.md`](../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md).
Fuente oficial: [`../2026-10-22_grok-bot-fuente/LEEME.md`](../2026-10-22_grok-bot-fuente/LEEME.md).

## Estado

**Base v01 generada, pendiente de aprobación del operador** (canvas «Mascotas de partners — ronda 2», lámina
«Grok Bot · base 3D v01»). No se producen las 32 piezas hasta que la apruebe.

| Archivo | Qué es |
|---|---|
| `ref/ref-01-reposo-oficial-svg.png` | SVG oficial del estado en reposo, aplanado sobre `#E9E7E3` a 1600 px |
| `ref/ref-02-reposo-video-autor.png` | Cuadro del video de Benji Taylor (reposo de frente) |
| `prompts/_bloque-identidad.txt` | Invariantes: esfera perfecta, vinilo satinado `#09090B`, dos cápsulas `#F5F5F5` incrustadas a ras, inclinadas «\ \», arriba a la derecha |
| `prompts/base-{frente,tres-cuartos}.txt` | Prompts completos de las bases |
| `out/base-{frente,tres-cuartos}-v01.png` | Bases con fondo de estudio, 1600×1600 |
| `out/base-*-v01-transparente.png` | Recortes |
| `brief/` | Scripts (`aplanar`, `comparar`, `medir-ojos`, `qa-navy`, `rellenar-cerrados`), logs y hojas de QA |

Motor: `pnpm ai:image` · `gpt-image-2.5-sunburst` · `xhigh` · 1600×1600 · edit con las dos referencias. 2 pasadas.

## Decisiones

- **Forma y color:** el círculo negro en reposo, que es el estado por defecto del producto (los 6 estados oficiales
  son negros). Variante azul `#1084FE` propuesta para piezas oscuras, sin generar.
- **El giro lo cuentan los ojos:** la silueta de una esfera no cambia; en tres cuartos las cápsulas se desplazan hacia
  el borde y se escorzan con la curvatura.
- **Medido contra el oficial:** área de ojos 5,8 % de la esfera contra 5,0 % del SVG; misma inclinación y posición.

## Trampa del recorte

Los ojos `#F5F5F5` casi igualan el fondo de estudio, y el matting **perforó** uno de los ojos (en tres cuartos, los
dos quedaron semitransparentes). Es la misma trampa de la utilería clara de Gigi. Como la esfera es opaca y no tiene
fondo real dentro de la silueta, `brief/rellenar-cerrados.mjs` repone desde el original todo píxel interior con alfa
< 255, salvo una banda de 6 px junto al contorno (para conservar el antialias). Correrlo después de
`pnpm ai:image:rmbg` en **todas** las poses de Grok, y revisar siempre con `brief/qa-navy.mjs`.

## Uso

Interpretación 3D de un ícono de xAI: **uso interno**. La guía de marca de xAI prohíbe insinuar respaldo y pide
escribir a legal@x.ai antes de usarlo en material de prensa.
