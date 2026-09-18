# «Hay frases que no se tocan» — Efeonce · Fiestas Patrias México 2026 · v02

Estado: **prueba v02 producida y revisada por el agente (2026-09-16)**. Pendiente: aprobación del operador,
consentimiento de Daniela, Melkin y Andrés para publicar sus fotos, revisión cultural con una persona de México y
autorización de programación. Nada fue publicado ni programado.

## Cambios v01 → v02 (pedidos del operador)

- Comentarios firmados por el equipo real con su foto oficial del squad: Daniela, Melkin y Andrés (María Fernanda descartada por el operador). Cursores de colaboradores con sus nombres.
- Fuegos en verde esmeralda, blanco y rojo carmesí (México) sobre cielo navy profundo (familia de color Efeonce), mezclados por estallido, nunca como franjas.
- Impacto cinematográfico: contrapicado desde la multitud en contraluz, catedral barroca iluminada, humo volumétrico, óptica anamórfica; final con lluvia de chispas.
- Titular en dos líneas, más grande; lámina 5 pasa a cierre del hilo («3 sugerencias, 0 cambios.») para no repetir personas.

## Entregables (Instagram, carrusel 4:5)

| Archivo | Contenido |
|---|---|
| `slides/01.png` | ¡Viva México! + comentario de Daniela «¿Lo hacemos más memorable?» + logo (portada) |
| `slides/02.png` | Selección AXIS + cursor local · comentario de Daniela DESCARTADO |
| `slides/03.png` | Cursor de Melkin redimensiona · «¿Le sumamos un claim?» DESCARTADO |
| `slides/04.png` | Cursor local + cursor de Andrés · «¿Probamos una variante A/B?» DESCARTADO |
| `slides/05.png` | Selección se suelta, Daniela se retira · «Hilo resuelto · 3 sugerencias, 0 cambios.» |
| `slides/06.png` | «Hay frases que no se tocan.» |
| `slides/07.png` | ¡Viva México! centrado en el final de fuegos + logo pequeño centrado abajo |

1080×1350 PNG sRGB. Fuentes editables: `slides/NN-overlay.svg` (texto en trazados, avatares embebidos) + `plates/*-v02.png`. Revisión: `contact-sheet.jpg`, `mobile-preview.jpg`, `qa-composition.json`. Versión v01 conservada en `plates/*-v01.png`.

## Caption propuesto

> Teníamos varias sugerencias. Ninguna pasó la revisión.
>
> ¡Viva México!

Sin emoji de bandera ni símbolos patrios (Ley sobre el Escudo, la Bandera y el Himno Nacionales, art. 32 Bis: prudencia, no dictamen legal).

## Texto alternativo por lámina

1. Plaza colonial mexicana de noche, multitud en contraluz y fuegos artificiales verdes, blancos y rojos sobre una catedral iluminada. Al centro, «¡Viva México!» y un comentario de Daniela, del equipo de Efeonce: «¿Lo hacemos más memorable?». Logo de Efeonce abajo.
2. La frase «¡Viva México!» aparece seleccionada como en un editor de diseño. El comentario de Daniela está tachado y marcado como descartado.
3. El cursor de Melkin intenta redimensionar la frase. Su comentario «¿Le sumamos un claim?» está tachado y descartado.
4. Dos cursores, uno de Andrés, trabajan sobre la frase. Su comentario «¿Probamos una variante A/B?» está tachado y descartado.
5. La selección se suelta y el cursor de Daniela se aleja. Un aviso con las fotos de Daniela, Melkin y Andrés dice «Hilo resuelto: 3 sugerencias, 0 cambios».
6. Sobre la misma plaza, el texto «Hay frases que no se tocan.»
7. Gran final de fuegos artificiales y lluvia de chispas sobre la multitud y la catedral, con «¡Viva México!» al centro. Logo de Efeonce pequeño abajo.

## Procedencia

| Paso | Herramienta | Detalle |
|---|---|---|
| Plate A v02 (láminas 1–6) | `pnpm ai:image` · `gpt-image-2.5-sunburst` · xhigh · 1600×2000 | `brief/plate-a-v02.prompt.txt`; usage out 4244 (≈ USD 0,127) |
| Plate B v02 (lámina 7) | edición de plate A v02 · `gpt-image-2.5-sunburst` · xhigh | `brief/plate-b-v02.prompt.txt`; usage in 1720 (img 1505) · out 4244 |
| Avatares | `src/lib/artifact-composer/catalogs/deck-axis/assets/squad/squad-{daniela,melkin,andres}.png` | recorte circular 280 px desde (70,10), sin retoque |
| Composición | `render.mjs` (fontkit + sharp) | Bricolage variable `ideaImpact` / `ideaShort`; Poppins 400/500/600; tokens `axisAdvertising.color`; logo `public/branding/logo-negative.svg` 200 px |
| Scrim lámina 7 | degradado radial navy `#01142b` (0,82 → 0) centrado en la tinta del titular | aplicado antes de medir contraste |
| Selección y cursores | AXIS `efeonce.collaboration-selection` 0.2.0 (resolver + renderer) | etiquetas en trazados Poppins; el script falla si algo sale del lienzo o si un comentario desborda su tarjeta |

Los modelos no generaron texto, logo, caras ni símbolos: tipografía, marca y fotos del equipo se componen después.

## Revisión en cinco niveles (juicio del agente, no aprobación humana)

| Nivel | Estado | Observación |
|---|---|---|
| Estratégico | pass | La marca demuestra el oficio de agencia (revisar, optimizar, contenerse) con personas reales del equipo; el chiste recae sobre nosotros, no sobre la frase. |
| Creativo | pass | Tensión → tres reflejos descartados → hilo resuelto → reencuadre → final eufórico. Fondo idéntico 1–6: al deslizar sólo cambian las ediciones. |
| Cultural/contextual | not-verified | Sin bandera, escudo, himno ni papel picado. Los colores de los fuegos evocan México sin formar la bandera, pero verde a la izquierda y rojo a la derecha pueden leerse como alusión: validar con alguien de México. Catedral de estilo similar a la Metropolitana de CDMX. |
| Marca | pass | Logo oficial negativo 200 px, centrado, 6 % inferior, contraste peor caso 18,3–19,1:1. Sistema AXIS compartido con la pieza chilena. |
| Producción | pass | 7 × 1080×1350 sRGB. Contraste peor caso del titular (p98 del fondo bajo la tinta): 12,7:1 (1–5), 13,5:1 (6), 7,1:1 (7 con scrim). Selección `withinCanvas` en 02–05. Caras reconocibles a 390 px (avatar ≈ 35 px). Etiquetas de cursor pequeñas por contrato AXIS. |

Pendiente y no verificado: consentimiento de las tres personas, recepción de audiencia, visualización dentro de la app (recorte 3:4 de la grilla del perfil).
