# TASK-1857 — Dirección visual: Creative Hub como hoja de trabajo del cliente

Versión de diseño: 2026-09-10. Visual direction mode: `repo-native-benchmark`.
Estado: dirección seleccionada para desarrollar el contrato; validación visual pendiente. UI ready: no.
No hay mockup renderizado, captura, aprobación visual del operador ni certificación de producción en este documento.

## Mode and source

- Mode: `repo-native-benchmark`
- Durable source: `src/config/capability-registry.ts` (`creative-hub`: fuentes, builders y cards), `src/components/capabilities/*`
  (hero + grid actual, sirve en `/capabilities/creative-hub` para tenants con líneas legacy), surface system canónico
  (`src/components/greenhouse/primitives/surface-system/*`, `docs/architecture/ui-platform/PRIMITIVES.md` §Surface system) y la
  dirección hermana de EPIC-046 (`TASK-1854`, hoja editorial de servicio).
- Provenance / approval: decisión de contenido del operador 2026-09-10 (cinco bloques; Creative Hub ES el módulo de Sky).
  Sin Figma nuevo; no se inventa uno.
- Selected frame/state: primer fold desktop 1440×900 con B1 poblado; móvil 390×844 con B1 como primera región.

## Tesis de experiencia

La persona de Sky entra para saber tres cosas: qué espera su respuesta, qué se está produciendo y qué se entregó. La
página responde en ese orden y con una sola acción posible por fila (abrir la pieza). Todo dato lleva fuente y corte.
El acabado premium sale de la jerarquía tipográfica, de la economía de superficies y de la honestidad de los estados,
no de gráficos decorativos ni de cifras de gestión interna que el cliente no contrató ver.

## Alternativas comparadas

| Dirección | Primer vistazo | Fortaleza | Coste y decisión |
|---|---|---|---|
| A. Módulo interno tal cual (v1 del wireframe) | Hero con cifra de revenue y grilla de 16 cards | Cero JSX nuevo | Card wallpaper: `BLOCK` por el estándar premium; revenue, tiers, aceleradores y RpA son lectura de Efeonce, no del cliente; títulos en inglés. Descartada |
| B. Tablero de pipeline | Las cinco fases como protagonista, piezas debajo | Excelente cuando hay mucho volumen en producción | Convierte a la persona en analista de flujo; esconde lo único que le pide acción (su revisión) y el valor entregado. Reutilizar su lectura por fases dentro de B2, no como página |
| C. Hoja de trabajo creativa | Header editorial + «Necesita tu respuesta» dominante, luego producción, entregado, cadencia bidireccional | Conduce la única acción real, explica valor y degrada por bloque cuando falta dato; misma gramática que Inicio/servicio (TASK-1854) | Exige contrato de datos de revisión (rondas, comentarios abiertos) desde Notion; si Sky no está cargado, la página abre en vacío honesto. Seleccionada |

Son composiciones comparadas contra el repo, no prototipos evaluados con usuarios. La selección C queda sometida al
primer fold implementado y a su crítica premium en GVC.

## Referencias locales y transferencia concreta

| Fuente inspeccionada | Qué se toma | Qué no se replica |
|---|---|---|
| `SurfaceRecipe` (`surface-system-controller.ts`: `analyticsReport → single`) con `plane='none'` | Receta de lectura analítica; el body es el lienzo y las secciones son abiertas | Envolver cada bloque en un paper (card-on-card) |
| `WorkbenchHeader kind='report'` | Chrome de la página en `header`: eyebrow, título con la cuenta, `meta` = fuente y corte | Un hero con `summaryValue` de revenue como momento dominante |
| `OperationalSection variant='open'` / `'band'` | B1–B3 como secciones abiertas con tipografía y divisores; B4 como banda transversal | `standard` como wrapper universal |
| `OperationalSignalList` (`title`, `description`, `statusLabel`, `statusTone`, `action`) | Filas de B1: pieza, ronda, comentarios abiertos, quién espera, acción «Abrir» | Una tabla MUI de 8 columnas para cinco filas |
| `SignalStrip variant='integrated'` (≤3 señales) + `MetricSummaryCard density='auto'` | B4: cifras con `label`, `value`, `detail` (fuente/corte) integradas en el plano | Cuatro KPI cards separadas compitiendo por atención |
| `GreenhouseActivityTimeline` (`items`, `tone`, `person`, `attachment`) | B3: entregas del período con fecha, versión y persona; B2 «Trabadas» con tono `warning` | Un carrusel de miniaturas |
| `CapabilityCard type='pipeline'` (builder `buildCreativePipelineCardData`) | B2: conteo por fase Brief→Entrega reutilizando el renderer y el dato existentes | Rediseñar el pipeline; rebautizar fases sin fuente |
| `EmptyState` (`icon`, `title`, `description`, `action`) y `GreenhouseLoadingSurface` | Vacíos por bloque y skeleton de ruta | Spinners permanentes; ceros sustitutos |
| `<ModuleNotAssignedEmpty>` + `modulePublicLabels['creative-hub']` | Estado denegado canónico vía `/home?denied=creative-hub` | Un 403 con el título del módulo ajeno |
| `TASK-1854` (dirección hermana) | Tres niveles tipográficos, divisores, fuente/corte visible, un CTA por fila | Temas visuales por cliente |

## Composición y primer fold

- Recipe: `SurfaceRecipe kind='analyticsReport' plane='none'`; `header` = `WorkbenchHeader kind='report'` con eyebrow
  «Creative Hub», título `«<clientName>: tu flujo creativo»`, `description` de una frase y `meta` con fuente y corte.
- Regiones sostenidas en el primer fold: el header (plano contenido) y B1 abierta. Como máximo un tercer plano contenido
  (la card de pipeline de B2 si entra en el fold). Nunca una card por cifra, fila o vacío.
- B1 es el momento visual dominante: lista de piezas que esperan respuesta con `statusTone` por urgencia declarada
  (ronda vencida = `warning`, en plazo = `info`), la persona de Efeonce que espera y un único botón «Abrir» por fila.
  Si está vacía, una línea `EmptyState` sin card grande y B2 sube.
- B2 «En producción ahora»: pipeline por fase (renderer existente) + sublista «Trabadas» (`OperationalSignalList` con
  motivo declarado, nunca inferido).
- B3 «Entregado este período»: `GreenhouseActivityTimeline` con fecha, versión final y enlace a la pieza.
- B4 «Cadencia y calidad»: `OperationalSection variant='band'` con `SignalStrip integrated` (entregadas/comprometidas ·
  a tiempo · rondas promedio) y una `MetricSummaryCard` para tiempo de respuesta Efeonce / Sky. Cada señal con `detail`
  = fuente y corte. Sin dato → «Sin datos en este corte».
- B5 «Pedir algo»: fila de enlaces del shell, sólo si TASK-1856/TASK-1848 publican destino. Sin destino, no se renderiza.
- Primer fold en 1440×900 y 390×844 como objetivos de captura, no alturas rígidas; con zoom o copy largo se crece.

## Firma visual

La relación **espera tu respuesta → en producción → entregado** se reconoce por el ritmo de tres secciones abiertas
con el mismo patrón de título (`sectionTitle`) y divisor, y por una sola familia de tonos de estado. El dato es el
momento visual: un nombre de pieza con su ronda y su comentario abierto pesa más que cualquier ilustración. Las
miniaturas sólo aparecen cuando la pieza tiene `attachment` autorizado; sin ella, la fila tipográfica conserva
dignidad y densidad.

## Component mapping (contrato por bloque)

| Bloque | Región del recipe | Primitive Greenhouse → wrapper Vuexy → MUI base | Variant / kind / density | Dato (builder existente) | Copy id | Fallback |
|---|---|---|---|---|---|---|
| Header | `header` | `WorkbenchHeader` → — → `Box`/`Typography` | `kind='report'`; `meta` = fuente/corte | `CapabilityModuleData.hero` (eyebrow, title, description); sin `summaryValue` | `client_portal.creative_hub.hero.*`, `…source_cut` | Título con nombre de cuenta aunque el resto falle |
| B1 Necesita tu respuesta | `regions.primary` | `OperationalSection variant='open'` + `OperationalSignalList` → — → `List`/`Chip`/`Button` | `density='auto'`; `statusTone` info/warning; `action` = `GreenhouseButton` «Abrir» | `getCreativeHubTasks` (`clientReviewOpen`, `openFrameComments`, `clientChangeRounds`) via `buildCreativeHubCardData`/`buildCreativeReviewPipeline*` | `…block.review.title`, `…block.review.empty` | `EmptyState` de una línea; B2 sube |
| B2 En producción ahora | `regions.primary` | `OperationalSection variant='open'` + `CapabilityCard type='pipeline'` (`ExecutiveCardShell` → `Card`) + `OperationalSignalList` («Trabadas») | pipeline `size='full'`; trabadas `tone='warning'` | `buildCreativePipelineCardData`, `buildCreativeStuckCardData` (`fase_csc`, `bloqueado_por_ids`, `fecha_entrega`) | `…block.production.title`, `…block.production.stuck` | Sección con fases en cero sólo si la fuente informa cero; si no informa, «Sin datos en este corte» |
| B3 Entregado este período | `regions.primary` | `OperationalSection variant='open'` + `GreenhouseActivityTimeline` → — → `List` | `variant` compacta; `tone='success'`; `attachment` opcional | `buildProjectItemsForLens(snapshot,'creative')` + `fecha_de_completado` | `…block.delivered.title` | Vacío honesto con período visible |
| B4 Cadencia y calidad | `regions.primary` (banda) | `OperationalSection variant='band'` + `SignalStrip variant='integrated'` + `MetricSummaryCard` | `density='auto'`; ≤3 señales en la strip | `buildCreativeHubCardData`, `buildQualityItems`, `pct_on_time`; tiempo de respuesta por lado desde rondas/fechas del snapshot | `…block.quality.title`, `…block.quality.nodata` | Señal individual «Sin datos en este corte», nunca 0 |
| B5 Pedir algo | `regions.primary` (final) | `OperationalSection variant='quiet'` + `GreenhouseButton variant='text'` | sólo con destino resuelto | flags/rutas de TASK-1856 y TASK-1848 | `…block.request.title` | No se renderiza |
| Loading | ruta `loading.tsx` | `GreenhouseLoadingSurface` | `variant` de página, `rows=3` | — | `GH_CLIENT_PORTAL_COMPOSITION.loading.ariaLabel` | — |
| Denied | redirect | `<ModuleNotAssignedEmpty>` existente en Home | — | `modulePublicLabels['creative-hub']` | `emptyState.notAssigned.*` | — |

Regla de lookup respetada: primitive Greenhouse primero; `CustomAvatar`/`Custom*` de Vuexy sólo donde la primitive ya
los usa; MUI base únicamente como fundación. No nace ninguna primitive nueva; si GVC exige una, se abre el protocolo
Primitive+Variants+Kinds, no un `SectionCard` local. Los builders de datos del módulo se reutilizan tal cual; lo que
cambia es la composición, no la fuente.

## Token mapping

- Superficie: canvas `palette.background.default`; header y pipeline `palette.background.paper` con borde `palette.divider`,
  radius `theme.shape.customBorderRadius.xl` y elevación `theme.greenhouseElevation.raised` (los aporta el recipe).
- Tipografía (SoT `typographyScale`): `surfaceHeroTitle` título de página; `sectionTitle` B1–B5; `bodyMd` filas y
  explicaciones; `labelMd` etiquetas de señal; `kpiValue` sólo en B4 para las tres cifras de la strip; `overline` fuente y
  corte; `numericId` para versiones. Nunca `fontSize` inline.
- Color: acción primaria `palette.primary`; tonos de estado sólo en chip/icono/texto permitido con etiqueta textual;
  sin fondos de sección verdes o rojos; `theme.axis.*` a través de los tokens de cada primitive.
- Espaciado: escala `4n` del theme; ritmo mayor entre secciones (`gap` de la receta) que entre etiqueta y valor.
- Iconos Tabler semánticos (`tabler-palette` del módulo en el header; documento, calendario, enlace en filas). Sin emoji.
- Motion: ninguno propio; `short`/`standard` de `motion/core/tokens.ts` sólo en foco/hover de las primitives.

## Densidad y responsive

| Clase | Composición | Señal que debe sobrevivir |
|---|---|---|
| Expanded (≥1440) | Header + B1 en el fold; B2 pipeline en fila completa; B4 banda con tres señales en línea | Pieza, ronda, quién espera, botón Abrir |
| Medium | Señales de B4 en dos filas; timeline de B3 con fecha a la izquierda | Fecha comprometida y estado |
| Compact / 390 | Una columna; B1 máx. 5 filas + «Ver todas»; B4 como pares etiqueta/valor sin gráfico | Título de bloque, primera fila de B1 completa, CTA ≥44 px |
| Zoom 200 % / texto largo | Reflow sin alturas fijas; ningún dato sólo por tooltip | Nombre de pieza completo con wrap |

`density='auto'` sólo en primitives que lo admiten (`OperationalSection`, `SignalStrip`, `SelectionRow`, `MetricSummaryCard`).

## Anti-patrones específicos

- Replicar las 16 cards internas o dejar la cifra de revenue como `summaryValue` del header.
- Un saludo o ilustración ocupando el primer fold mientras B1 tiene filas.
- Tarjeta por métrica en B4; cuatro papers para cuatro números.
- Botón «Aprobar» cuando el destino sólo permite ver la pieza.
- «Trabadas» inferidas por antigüedad sin motivo declarado en la fuente.
- Tiempo de respuesta sólo del cliente (culpabiliza) o sólo de Efeonce (oculta): siempre los dos lados o ninguno.
- Enlaces a solicitudes o Insights antes de que existan sus rutas.
- Ocultar fuente y corte para que la pantalla se vea más limpia.

## Decisiones y condiciones de aceptación

D57-01: `SurfaceRecipe analyticsReport plane='none'` con `WorkbenchHeader kind='report'`; nunca `GreenhouseCapabilityModule` completo.
D57-02: B1 es el momento dominante; si está vacío, B2 ocupa el primer fold sin placeholder grande.
D57-03: se reutilizan los builders del módulo y tres renderers (pipeline, timeline, signal list); no se crea primitive nueva.
D57-04: cifras de B4 bidireccionales o ausentes; cada señal con fuente y corte; sin ceros sustitutos.
D57-05: promedio visual ≥4.5/5, ninguna dimensión <4; jerarquía, economía de superficies, impacto visual, fidelidad y
resistencia a plantilla ≥4.5 (14 dimensiones del estándar vigente); evidencia desktop, 390 px y reduced motion.

La dirección se reabre si el snapshot de Notion no sostiene B1 (sin rondas ni revisiones abiertas para Sky), si el
primer fold supera tres planos contenidos o si la revisión visual no cumple esos umbrales. No se rellena evidencia
para conservar el diseño.
