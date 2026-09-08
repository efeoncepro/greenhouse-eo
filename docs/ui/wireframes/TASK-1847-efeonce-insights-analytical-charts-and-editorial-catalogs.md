# TASK-1847 — contrato visual Insights

Diseño inicial 2026-09-08, sin implementación. UI ready: no. Fuente de dirección a sellar antes de JSX.

- Visual direction mode: repo-native-benchmark
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

## Implementation Mapping

Paths de Files owned en task son propuestos. Reuse/extend CompositionShell/GreenhouseBreadcrumbs/inputs en portal;
catálogos/ChartSpec para artefactos. Sin nuevo command ni store en UI. TASK-1845/1846/1848 proveen datos/operaciones.
Mapear cada componente concreto antes de UI ready yes; no basta la intención de diseño.

## GVC Scenario Plan

- Quality profile: premium.
- Desktop 1440 y mobile 390px; states ready/loading/empty/partial/error/denied y long content.
- Scenario: insights-catalogs propuesto; harness/rutas se materializan en ejecución.
- Capturas: first fold, figura analítica, tabla densa y estado crítico; PDF todas las páginas exportadas.
- Assertions: valores iguales a snapshot, identity visible, fuentes y ausencia de información interna.
- Scroll-width: scrollWidth === clientWidth.
- Review dossier: docs/ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs/ propuesto; evidencia observada antes de baseline.
- Baseline decision: nueva superficie, comparar con catálogo institucional; no congelar otros cambios.
- Reduced motion y focus: recorrido completo donde existan controles.

## Design Decision Log

Alternativas: dashboard de KPIs vs entrega editorial; ampliar deck comercial vs catálogos analíticos. Se elige entrega
editorial sobre contratos/recursos existentes por narrativa y lectura autónoma. Primer fold y página densa son el
experimento antes de cerrar dirección. Sin evidencia visual todavía; UI ready no.
