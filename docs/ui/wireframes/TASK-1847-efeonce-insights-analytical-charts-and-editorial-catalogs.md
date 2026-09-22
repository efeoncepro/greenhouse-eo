# TASK-1847 — contrato visual Insights

Diseño inicial 2026-09-08. **Dirección sellada 2026-09-21** y mapping concreto fijado; ver Design Decision Log.

- Visual direction mode: repo-native-benchmark
- **Dirección sellada:** [`TASK-1847-efeonce-insights-catalogs-direction.md`](../visual-directions/TASK-1847-efeonce-insights-catalogs-direction.md) — ficha de evidencia (deck) + cuaderno analítico (A4); tablero impreso rechazado.
- **Decisión de paginación:** [`GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md`](../../architecture/GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md) (ADR `Accepted`).
- Product Design asset: `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §6 y catálogo existente `src/lib/artifact-composer/catalogs/deck-axis/registry.json`.
- Scope: deck horizontal y documento A4 vertical.

## Desktop Target

Deck: portada 16:9, resumen y comparación con gráfico ancho. A4: portada vertical, resumen, índice y capítulos; página analítica con título, conclusión, figura, fuente y texto explicativo. Página densa con tabla continuada y cabecera repetida; footer reservado antes de paginar.

## Mobile Target

390px: una columna, títulos y unidades completos, tabla equivalente para cada gráfico. Harness reduce viewport sin certificar legibilidad del PDF por escalado; PDF se revisa a tamaño físico separado. scrollWidth === clientWidth.

## Action Hierarchy

Leer resultado → examinar evidencia → consultar método → actuar. Enlaces e índice reales; PDF sin acciones de negocio ni controles interactivos falsos.

## Visual Fidelity Mapping

Tokens Efeonce del pack del Composer para documentos, tema AXIS/MUI para portal. Geist/Poppins por roles canónicos,
no copias de HEX ni fonts. Catálogo nuevo hereda recursos oficiales; co-branding usa asset real con proporción/área libre.
ID/período/versión en portada, fuente/unidad junto al gráfico; pie vertical y deck respetan sus normas diferentes.

## Copy Ledger

Claves nuevas en src/lib/copy/insights.ts: Insights, Crear insights, Revisar edición, Compartir, Descargar,
Emitir, Enviar y Pausar programación según superficie. Cifras/fechas desde modelo; no texto numérico mantenido a mano.

## State Copy

| State | Copy de intención | Recuperación |
|---|---|---|
| ready | Edición lista para revisión / emitida según estado | Revisar o compartir con permiso |
| loading | Preparando evidencia | Ver fase, sin porcentaje inventado |
| empty | No hay evidencia para este período | Ajustar encargo autorizado |
| partial | Esta edición tiene cobertura parcial | Consultar fuentes y salidas pendientes |
| error | No pudimos completar esta salida | Reintentar sólo si reader lo permite |
| denied | Este contenido no está disponible | Volver o contactar a quien compartió sin revelar cliente |

## Accessibility Contract

Orden semántico, contraste, etiquetas directas, tabla equivalente, enlaces descriptivos y navegación de teclado.
Reduced motion conserva contenido; no dependencia de hover/color. PDF texto seleccionable sin promesa PDF/UA.

## Inventario de composiciones (mapping concreto, 2026-09-21)

**Dos catálogos propios, no extensión de `deck-axis`.** Razón verificada: los presupuestos de slot de
`deck-axis` están afinados para copy de licitación (`kpis.value` 8, `title` 32, `qual` 72) y el copy de un
plan congelado los excede; y `CoverFull` imprime vocabulario de propuesta comercial. Extenderlo obligaría a
relajar budgets que protegen los decks comerciales.

### `catalogs/insights-deck/` — 16:9, ficha de evidencia

| content-type | Rol | Notas |
|---|---|---|
| `insights-cover` | Portada con identificador de edición, período y versión | Reemplaza el uso de `CoverFull`, que es de `Proposal` |
| `insights-section-divider` | Apertura de capítulo | Hereda el patrón del divisor actual |
| `insights-evidence` | Ficha: afirmación · figura · procedencia | Composición nueva, núcleo de la dirección |
| `insights-kpis` | Varias cifras con su marca de evidencia | Budgets propios, dimensionados con copy real del plan |
| `insights-narrative` | Capítulo sin cifra suficiente | Equivalente al `narrative` actual |
| `insights-limits` | «Lo que esta edición no puede afirmar» | Cierre obligatorio |
| `insights-back-cover` | Contraportada institucional | Pie: **sólo URL bubble** |

### `catalogs/insights-report/` — A4 vertical, cuaderno analítico

| content-type | Rol | Notas |
|---|---|---|
| `report-cover` | Portada A4 | Pie completo, también acá |
| `report-summary` | Resumen ejecutivo | |
| `report-toc` | Índice paginado real | Resuelto en una pasada con el plan de páginas |
| `report-chapter-opener` | Apertura de capítulo | |
| `report-analysis` | Título · conclusión · figura · marginalia · desarrollo | Página analítica, núcleo del formato |
| `report-table` | Tabla densa, cabecera repetida al cortar | Alimentada por `paginateFlow()` |
| `report-limits` | Límites y metodología | |
| `report-back-cover` | Contraportada | |

Pie y folio son slots `fixed-*` de cada plantilla, nunca post-proceso sobre el PDF.

### Frontera de la geometría de gráficos

La **geometría genérica** (ancho de barra desde el valor con baseline cero, ángulos de dona, posición en
dispersión) es domain-free y vive en el Composer, para que ambos catálogos la compartan sin copiarla — la
misma razón por la que `paginateFlow()` no vive dentro del catálogo. El **resolver de cada catálogo**
decide tono, etiqueta y énfasis, y conserva las guardas que lanzan cuando el valor impreso y la geometría
no concuerdan (patrón ya canonizado en `chart-bar-geometry`, `catalogs/deck-axis/resolvers.ts:604`).

## Implementation Mapping

- **Superficie:** documento PDF + harness de inspección. Sin ruta de navegación nueva (`Nav placement: none`),
  confirmado contra el master flow de EPIC-045: TASK-1847 no posee ningún nodo S1–S8.
- **Composition Shell:** no aplica al canvas físico; el harness usa el shell existente sin regiones nuevas.
- **Primitives:** `extend` — patrón de geometría derivada del dato. Ninguna librería de charts nueva.
- **Datos:** `ChartSpecV1` / `EditorialPlanV1` / `EvidenceSnapshotV1` (TASK-1845), ya sellados. Sin command
  ni store nuevos; TASK-1845/1846/1848 proveen datos y operaciones.
- **Copy:** `src/lib/copy/insights.ts` (lo crea el Slice 2, junto con su consumo), cerrando de paso el drift
  actual de `MODULE_TITLES`, hoy duplicado con **valores distintos** entre planner y mapper.

## GVC Scenario Plan

- Quality profile: premium.
- Desktop 1440 y mobile 390px; states ready/loading/empty/partial/error/denied y long content.
- Scenario: **no aplica** — GVC exige `route` del portal y un documento no la tiene. El harness real es el
  gate visual del Composer, generalizado en TASK-1847 para fotografiar los tres catálogos. La evidencia
  vive en `docs/ui/reviews/TASK-1847-…/` con el render real y su versión en escala de grises.
- Capturas: first fold, figura analítica, tabla densa y estado crítico; PDF todas las páginas exportadas.
- Assertions: valores iguales a snapshot, identity visible, fuentes y ausencia de información interna.
- Scroll-width: scrollWidth === clientWidth.
- Review dossier: docs/ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs/ propuesto; evidencia observada antes de baseline.
- Baseline decision: nueva superficie, comparar con catálogo institucional; no congelar otros cambios.
- Reduced motion y focus: recorrido completo donde existan controles.

## Design Decision Log

Alternativas: dashboard de KPIs vs entrega editorial; ampliar deck comercial vs catálogos analíticos. Se elige entrega
editorial sobre contratos/recursos existentes por narrativa y lectura autónoma.

**Sellado 2026-09-21.** Tres direcciones comparadas (ficha de evidencia · cuaderno analítico · tablero
impreso); se eligen las dos primeras asignadas por superficie y se **rechaza el tablero impreso** como
sistema visual: en papel no hay hover, drill, scroll ni estado vivo, de modo que la tarjeta pierde su
justificación y queda como contorno decorativo — card soup impresa, que el estándar premium marca `BLOCK`.
Dos direcciones y no una porque el deck se proyecta (una idea por lámina) y el informe se lee sentado
(densidad y continuidad); forzar una sola da un deck ilegible a tres metros o un informe de sesenta hojas.

Se decide además **dos catálogos propios** en vez de extender `deck-axis`, porque sus budgets protegen el
copy comercial, y que la **geometría genérica de gráfico sea domain-free** para que ambos la compartan.

**`UI ready` queda en `n/a`, no en `yes` ni en `no`.** El contrato de `UI ready` mide una pantalla del
portal; esta superficie es un documento exportado a PDF. Los gates que sí aplican están verdes
(`design-contract:lint` PASS, `ui:code-lint` PASS, `ui:quality` PASS con 4,50 y piso 4,0) y la evidencia es
el artefacto real, revisado a tamaño físico y en escala de grises. `ui:visual-gate` no aplica por construcción:
exige una ruta del portal.
