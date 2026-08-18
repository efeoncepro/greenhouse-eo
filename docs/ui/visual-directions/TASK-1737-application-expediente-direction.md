# TASK-1737 — Dirección visual: tab Expediente (Application 360)

> **Tipo de documento:** Dirección visual versionada (repo-native benchmark)
> **Superficie:** `/agency/hiring/applications/[applicationId]?tab=expediente`
> **Modo:** `repo-native-benchmark`
> **Creado:** 2026-08-16 por Claude (sesión de diseño con skills de product design)
> **Evidencia de la pasada:** commit `e2405fd8a` (rediseño) + `ee421e97d` (fix de spacing) ·
> GVC premium `.captures/2026-08-16T23-49-12_task1737-application-expediente/`
> **Wireframe:** [`docs/ui/wireframes/TASK-1737-application-360-expediente-tab.md`](../wireframes/TASK-1737-application-360-expediente-tab.md)
> **Implementación:** `src/views/greenhouse/hiring/ApplicationDossierPanel.tsx`

## Decision

**El expediente es un DOCUMENTO DE DECISIÓN, no una grilla de datos.**

La superficie tiene que sostener lectura larga (análisis CV↔assessment con evidencia citada,
notas de entrevista, procedencia del agente) dentro de un tab de una vista que ya define su
frame. La dirección elegida trata cada bloque como texto editorial gobernado —medida de
lectura, escalera tipográfica, filetes que estructuran— y **no** como tarjetas apiladas.

### Direcciones comparadas

| # | Dirección | Tratamiento | Veredicto |
|---|---|---|---|
| A | **Bloques rellenos por claim** | cada afirmación+evidencia dentro de un rectángulo `action.hover` | **Descartada.** Once claims producían once rectángulos grises idénticos dentro del `Paper` de la nota: card-on-card, muro monótono y texto secundario sobre fondo secundario (contraste degradado). |
| B | **Documento de decisión (cita tipográfica)** | filete tonal + sangría + escalera 16→14/600→13/400; el par afirmación↔evidencia lo agrupa la proximidad, no una caja | **Elegida.** Sostiene lectura larga, elimina el card-on-card y deja la magnitud legible antes de leer (conteo en el encabezado de sección). |
| C | **Riel de acento de 3px en la propuesta** | barra vertical `primary` de 3px marcando la superficie del borrador IA | **Descartada como riel.** Con filetes tonales citando evidencia dentro, un segundo riel competía por la misma señal. Se conserva la intención (marcar que el bloque es agéntico y requiere decisión) como **perímetro `primary`** del `Paper` de la propuesta. |

### Por qué B gana

- **Evidencia sin caja.** La cita tipográfica (filete + sangría) es el vocabulario que el
  operador ya lee en cualquier documento; la caja gris obligaba a procesar un contenedor por
  cada afirmación.
- **Proximidad como agrupador.** 12px entre afirmación y su evidencia vs 32px entre claims
  (≈1:2,7): la Gestalt hace el trabajo que hacía el relleno.
- **Un solo momento visual dominante.** El único bloque con perímetro de color es la propuesta
  IA pendiente de decisión — que es, literalmente, lo único que exige acción del operador.

## Desktop target

- **Ancho de lectura acotado a `64ch`** (`READING_MEASURE`) a nivel de `<section>`, no del
  contenedor: la regla del encabezado y el texto comparten la misma medida aunque el canvas
  del 360 crezca. Resuelto a 16px deja el lead en ~60 caracteres, la afirmación (14px) en ~70
  y la evidencia (13px) en ~75 — antes ~95.
- **Encabezado de sección como regla editorial:** ícono (18px, `aria-hidden`) + label
  `overline` + conteo + filete a la medida. El conteo (`COHERENCIAS 5` / `GAPS 5`) da magnitud
  antes de leer y marca el límite visible sin abrir otra superficie.
- **Escalera del claim:** lead `body1` → afirmación `body2/600` → evidencia `caption/400`
  `text.secondary`. Tres niveles, sin negritas decorativas.
- **Superficie de la propuesta:** `Paper variant='outlined'` con perímetro `primary`; la barra
  de decisión (Editar / Rechazar / Confirmar) cierra la superficie tras un filete.
- **Filetes que estructuran la nota como documento:** cabecera, cuerpo y procedencia.
- **Chips de score:** anotación en línea (`component='span'`, 20px, `verticalAlign: middle`,
  margen asimétrico) para no inflar el interlineado; el chip queda pegado al dato.

## Mobile target

- 390px: header apilado, composer con `Select` de tipo, cards a ancho completo.
- La medida `64ch` deja de morder porque el viewport ya es más angosto: la misma composición
  colapsa sin reglas nuevas ni breakpoints ad-hoc.
- `scrollWidth == clientWidth` verificado en el GVC (variante `02-mobile`, iPhone 13).
- La barra de decisión de la propuesta envuelve; ningún CTA queda bajo 24px de target.

## Token mapping

| Intención | Token / primitive | Nunca |
|---|---|---|
| Superficie de nota / propuesta | `Paper variant='outlined'` + `theme.shape.customBorderRadius.lg` | `elevation` alta ni card-on-card |
| Perímetro del bloque agéntico | `theme.palette.primary.main` | HEX literal |
| Filete de cita / separadores | `borderColor: 'divider'`, `borderInlineStart: '3px solid'` | grises hardcodeados |
| Escalera de texto | `theme.typography.{body1,body2,caption,overline,subtitle2}` | `fontSize` inline |
| Énfasis | `fontWeight: 600` / `700` | `fontWeight: 500` (rol prohibido por el SoT tipográfico, TASK-1039) |
| Numérico (scores) | `fontVariantNumeric: 'tabular-nums'` | monospace |
| Tono del chip de kind | `info` / `primary` / `warning` / `default` del semáforo de hiring | color arbitrario |
| Estado LOCK anti-anclaje | `Alert` + `theme.palette.info.lightOpacity`, texto `text.primary` | solo color/ícono sin texto |
| Espaciado | escala `4n` del tema (`sx` numérico) | px sueltos |
| Foco | `outline: 2px solid theme.palette.primary.main` | supresión de outline |

## Anti-patterns

- **Relleno tonal por claim.** Un `bgcolor` por afirmación reintroduce el muro gris y el
  card-on-card que esta dirección eliminó (dirección A).
- **Segundo riel de acento.** Si el bloque ya tiene perímetro `primary`, agregar una barra
  vertical de acento duplica la señal (dirección C).
- **Cajas para agrupar afirmación+evidencia.** El agrupador es la proximidad (12px vs 32px).
- **Dejar el texto correr al ancho del canvas.** Sin `64ch` la evidencia llega a ~95 caracteres
  por línea y la superficie deja de ser legible en 1440+.
- **`fontWeight: 500`.** Prohibido por el SoT tipográfico; usar 600.
- **Saltos de heading.** El título de la propuesta es `h3` y sus secciones `h4`; la nota aporta
  su `h3` accesible vía `aria-labelledby` (antes se saltaba de `h2` a `h6`).
- **`<div>` dentro de `<p>`.** El chip de score debe ser `component='span'` — el `<div>` daba
  HTML inválido con warning de hidratación.
- **Animar la entrada del contenido IA.** Prohibido por el fidelity mapping del wireframe: el
  borrador se revisa, no se celebra.

## Verificación de la pasada

- `pnpm local:check` · `vitest` (hiring + dossier-ai) · `ui:code-lint --changed` ·
  `design-contract:lint` — verdes.
- GVC premium 1440×900 + iPhone 13, perfil `premium`: `exitCode 0`, `qualityFindings: []`,
  `enterpriseRubric: pass`, sin violaciones de axe / layout / teclado / reduced-motion.
- Scorecard: [`docs/ui/reviews/TASK-1737-application-360-expediente-tab.scorecard.json`](../reviews/TASK-1737-application-360-expediente-tab.scorecard.json).
