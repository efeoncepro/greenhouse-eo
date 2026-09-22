# TASK-1847 — Dossier de revisión visual

> **Evidencia:** render real del Artifact Composer, no capturas de una ruta web.
> **Fecha:** 2026-09-21 · **Revisó:** Claude (Opus 5)

## Por qué la evidencia no es una captura GVC de una ruta

La superficie de esta task es un **documento**: un deck 16:9 y un informe A4 que se exportan a PDF.
No tiene ruta, ni viewport, ni interacción. Capturar una ruta web con Playwright sería una copia
peor de lo que el lector realmente recibe.

Por eso la evidencia es el **artefacto real que produce el motor**, y las dos condiciones de lectura
del dominio no son «desktop» y «mobile» sino **horizontal** (la lámina que se proyecta) y
**vertical** (la hoja que se lee). El scorecard usa esos dos campos con ese significado, declarado
acá para que nadie lo lea como un viewport.

El harness de inspección canónico del Composer es su **gate visual**, que compone cada plantilla con
payload sintético y captura su frame. TASK-1847 lo generalizó para que fotografíe los tres catálogos
en vez de uno.

## Qué se revisó

| Archivo | Qué es |
|---|---|
| `deck-evidencia.png` | Lámina de ficha de evidencia (1920×1080) |
| `informe-portada.png` | Portada A4 con pie institucional completo |
| `informe-analitica.png` | Página analítica: afirmación, figura y marginalia |
| `informe-tabla.png` | Tabla densa con cabecera propia y celda ausente como «—» |
| `*-gris.png` | Las mismas, en escala de grises — el informe se imprime |

## Hallazgos que salieron de mirar, no de la suite

1. **El riel de la barra se leía como el dato** (deck). Con `fieldMid` sobre el navy parecía una
   barra llena y hacía ver grande al valor chico. Corregido a `fieldEdge`.
2. **Los valores iban desnudos** (`61,4` sin signo ni unidad). La unidad vive en la marginalia, así
   que el número pelado obligaba a buscarla. Corregido a `+61,4%`, con el parser del resolver
   ajustado para leer ese formato.
3. **La verificación de coherencia no podía fallar nunca.** `printedValue` es `string` y el helper
   sólo aceptaba `number`: siempre daba `null` y la comparación se saltaba entera.

## Deuda visual conocida, declarada

- **El acento teal pierde contraste en escala de grises.** El énfasis del titular (`<em>`) y la
  barra destacada se distinguen, pero con poca separación de luminancia. En color funciona bien; en
  una fotocopia el énfasis se apaga. Pendiente: evaluar un segundo canal para el énfasis del titular
  (peso o cursiva ya presentes) y subir la separación de luminancia de la barra destacada.
- **Páginas con poco contenido dejan un hueco inferior grande.** No es defecto del molde: es el
  reparto. Se resuelve cuando el mapper llene las páginas con contenido real, y el techo por
  plantilla ya evita el caso contrario.
- **Una barra muy corta es casi invisible.** Deliberado: no se le pone piso mínimo porque falsearía
  la proporción, y el valor viaja impreso al lado.

## Lo que este dossier NO acredita

No acredita rollout. Nada de esto está desplegado; el `deck_pdf` productivo sigue componiendo con el
catálogo comercial. Tampoco acredita baseline: los 9 frames nuevos quedaron **declarados y no
promovidos** en `BASELINE_DELTAS.md`, porque congelarlos obligaría a rebaselinear de paso los de
`deck-axis` (ISSUE-122).
