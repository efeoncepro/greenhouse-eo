# TASK-1847 — Dossier de revisión visual

> **Evidencia:** render real del Artifact Composer, no capturas de una ruta web.
> **Dossier inicial:** 2026-09-21 · **Revisión del renderer:** 2026-09-24 · **QA multipágina:** 2026-09-24

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
en vez de uno. El scope `--catalog=insights` permite verificar y promover los frames nuevos de esta
task sin rebaselinar `deck-axis` ni SKY, cuyo drift histórico sigue abierto en ISSUE-122.

## Qué se revisó

| Archivo | Qué es |
|---|---|
| `deck-evidencia.png` | Lámina de ficha de evidencia (1920×1080) |
| `informe-portada.png` | Portada A4 con pie institucional completo |
| `informe-analitica.png` | Página analítica: afirmación, figura y marginalia |
| `informe-tabla.png` | Tabla densa con cabecera propia y celda ausente como «—» |
| `*-gris.png` | Las mismas, en escala de grises — el informe se imprime |
| `informe-a4-30-paginas-sintetico-qa.pdf` | Exportación sintética completa de 30 páginas, A4, con fuentes incrustadas y folio/pie |
| `informe-a4-30-paginas-gris.png` | Hoja de contacto de las 30 páginas renderizadas en escala de grises |

## Hallazgos que salieron de mirar, no de la suite

1. **El riel de la barra se leía como el dato** (deck). Con `fieldMid` sobre el navy parecía una
   barra llena y hacía ver grande al valor chico. Corregido a `fieldEdge`.
2. **Los valores iban desnudos** (`61,4` sin signo ni unidad). La unidad vive en la marginalia, así
   que el número pelado obligaba a buscarla. Corregido a `+61,4%`, con el parser del resolver
   ajustado para leer ese formato.
3. **La verificación de coherencia no podía fallar nunca.** `printedValue` es `string` y el helper
   sólo aceptaba `number`: siempre daba `null` y la comparación se saltaba entera.

4. **El énfasis teal perdía separación en escala de grises.** El informe ahora usa el token oscuro
   `--axis-deck-teal-750` para el énfasis, la serie principal, la línea y los marcadores principales;
   el énfasis tipográfico también conserva cursiva y peso alto. Las capturas de probe A4 y la hoja de
   contacto multipágina se revisaron en grises. El PDF sintético multipágina no incluye páginas con
   figuras; la lectura gris de figuras queda respaldada por `informe-analitica-gris.png`.

## Deuda visual conocida, declarada

- **El separador teal claro pierde contraste en escala de grises.** El texto y las marcas principales
  ahora usan el teal oscuro; los filetes teal siguen siendo decorativos y no llevan significado propio.
  La captura del probe y las páginas índice/cuerpo del PDF multipágina se revisaron en grises.
- **Páginas con poco contenido dejan un hueco inferior grande.** No es defecto del molde: es el
  reparto. Se resuelve cuando el mapper llene las páginas con contenido real, y el techo por
  plantilla ya evita el caso contrario.
- **Una barra muy corta es casi invisible.** Deliberado: no se le pone piso mínimo porque falsearía
  la proporción, y el valor viaja impreso al lado.

## Lo que este dossier NO acredita

El PDF de QA es sintético y local; no sustituye el canary real de staging del 22 de septiembre ni acredita
disponibilidad en producción. El baseline de Insights sí queda acreditado por `composer:visual-gate
--catalog=insights --selftest`, el freeze scoped y `composer:visual-gate --catalog=insights`, incluidos
en el mismo commit que los catálogos. El gate global sigue condicionado por ISSUE-122.
