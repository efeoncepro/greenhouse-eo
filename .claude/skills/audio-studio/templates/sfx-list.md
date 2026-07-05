# Lista de SFX — [nombre de la pieza]

> Artefacto rellenable. Inventaria cada efecto de sonido con su momento, descripción, fuente,
> licencia, capas y sync. Cubre SFX puntuales, ambiences (fondos) y stingers/transiciones.
> Layering: casi ningún SFX bueno es un solo archivo — se construye por capas.

- **Pieza:** [nombre] · **Tipo:** [video · podcast · audio-narrativa · UI · juego] · **Fecha:** [YYYY-MM-DD]
- **Owner:** [quién dirige] · **Duración total:** [ ]

## 1. SFX puntuales

| # | Momento / uso | Descripción del sonido | Fuente | Licencia | Capas | Duración | Notas de sync |
|---|---|---|---|---|---|---|---|
| 01 | [00:03 — CTA aparece] | [whoosh + click brillante] | [diseño · foley · IA · librería] | [CC0 · comercial · original] | [whoosh + tail + click] | [~0.6s] | [hit exacto al frame] |
| 02 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 03 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 04 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

> **Fuente:** *diseño* (síntesis/edición), *foley* (grabado a mano), *IA* (SFX generativo — ElevenLabs),
> *librería* (banco con licencia). **Licencia:** verifica siempre para uso comercial/cliente.

## 2. Ambiences (fondos / ambientes)

| # | Escena / momento | Descripción | Fuente | Licencia | Loop | Nivel bajo mezcla |
|---|---|---|---|---|---|---|
| A1 | [oficina de fondo] | [murmullo, teclado lejano, aire] | [librería · IA] | [ ] | [sí — seamless] | [-24 a -30 dB, bajo el diálogo] |
| A2 | [exterior/calle] | [ ] | [ ] | [ ] | [ ] | [ ] |

## 3. Stingers / transiciones

| # | Transición | Descripción | Fuente | Duración | Tonalidad (si musical) |
|---|---|---|---|---|---|
| T1 | [corte entre segmentos] | [riser + impacto] | [diseño · IA] | [~1.5s] | [afín a la música] |
| T2 | [entrada de sección] | [ ] | [ ] | [ ] | [ ] |

## 4. Capas y construcción (los SFX que se diseñan)

- **[SFX #01 — whoosh]:** capa 1 [movimiento/air] + capa 2 [transient/click] + capa 3 [tail/reverb]
- **[SFX #__]:** [capas]
- **Regla de layering:** [sub para peso · medios para cuerpo · altos para definición/ataque]

## 5. Checklist de sync y mezcla

- [ ] Cada SFX puntual cae en su momento exacto (hit point / al frame si es a-picture)
- [ ] Ambiences por debajo del diálogo, sin tapar la inteligibilidad
- [ ] Sin clip en la suma de capas (revisa el bus de SFX)
- [ ] Stingers afinados a la tonalidad de la música (si aplica)
- [ ] Licencia de TODA fuente comercial documentada
- [ ] Variación en SFX repetidos (no el mismo archivo idéntico 5 veces)

> **Regla dura.** Si el sonido va sincronizado a un video, el sync final lo coordina
> `motion-design-studio` — acá se diseña y entrega el craft de cada SFX. Reverifica licencia
> de librerías y SFX IA antes de entregar comercial/cliente.
