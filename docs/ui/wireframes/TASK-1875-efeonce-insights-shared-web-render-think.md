# TASK-1875 — contrato visual de la vista web compartida de Insights (Think)

Diseño inicial 2026-09-15, sin implementación. UI ready: no. Superficie pública SSR en `efeonce-think`
(`think.efeoncepro.com/insights/r/<token>`), render tonto de `InsightWebModelV1` (TASK-1848). Este wireframe
es el nodo S6 del master flow `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`.

- Visual direction mode: repo-native-benchmark
- Product Design asset (source duradero): el informe del Grader en el hub (`efeonce-think/src/pages/brand-visibility/r/[token].astro`,
  live en `think.efeoncepro.com/brand-visibility/r/<token>`, dossier TASK-1325) como benchmark de acabado y marca;
  `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §6/§8 como contrato de contenido; norma de marca
  `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.
- Scope: sólo la página compartida y sus cuatro estados seguros. Biblioteca/detalle autenticados: TASK-1849.
- Targets: desktop 1440×900 · mobile 390×844.

## Desktop Target

Página editorial de una columna de lectura (máx. ~72ch para texto, figuras a ancho de contenido) con rail izquierdo
pegajoso de índice a partir del segundo fold. De arriba a abajo:

1. **Masthead** (`EditionMasthead`, `data-capture="masthead"`): marca Efeonce (logo + URL bubble según norma),
   código `EO-INS-000123` + `v2`, título del reporte, organización, período civil con zona («1–31 de agosto de 2026,
   America/Santiago»), corte máximo de las fuentes («datos al 31-08-2026») y, si aplica, banda de **período abierto**.
   Sin acciones privadas; sin nombre de personas.
2. **Resumen ejecutivo** (`data-capture="summary"`): una claim por módulo como `FactCallout` grande (cifra formateada
   tal cual viene del modelo, unidad, badge observado/estimado, variación vs período anterior cuando existe) +
   la conclusión principal en texto del plan. Es el momento visual dominante: tipografía grande, mucho aire.
3. **Capítulos** (`data-capture="chapter-seo|chapter-aeo|chapter-ico"`): título del módulo, claims en prosa,
   una `ChartFigure` por gráfico (barras/líneas/pie/donut/dispersión desde `ChartSpecV1`, baseline 0 en barras,
   leyenda textual) con `<details>` «Ver tabla» que abre la tabla equivalente, y bloque **Límites** del capítulo
   (ausencias con motivo, en texto del modelo).
4. **Acciones** (sólo si el plan las trae; con owner sólo si existe).
5. **Metodología y referencias** (`data-capture="limits"`): fuentes, método/versión y corte por módulo, tal cual el modelo.
6. **Descargas** (`data-capture="downloads"`): deck PDF / informe A4 cuando `available` (enlace al proxy),
   texto «No disponible en esta edición» cuando `unavailable`; nunca un botón inerte.
7. **Footer institucional** (`data-capture="footer"`): fondo plomo casi negro, eslogan y contacto según norma de
   informes; aviso de confidencialidad del enlace («este enlace es personal y puede revocarse»).

Estados a pantalla completa (`StatusScreen` del hub): `not_found` (404), `gone` (410), `rate_limited` (429),
`error` (502). Ninguno muestra organización ni código.

## Mobile Target

390px: una columna, masthead compacto (código + versión + período en dos líneas), resumen con callouts apilados,
índice como `<details>` al inicio de los capítulos, figuras a ancho completo con leyenda debajo, tabla equivalente
con scroll horizontal INTERNO (nunca de página), descargas como lista, footer reducido.
`document.documentElement.scrollWidth === clientWidth` obligatorio.

## Action Hierarchy

1. Leer (índice → capítulo). 2. Ver tabla equivalente. 3. Descargar PDF disponible. No hay CTA comercial en la
página compartida (a diferencia del Grader): el destinatario ya es cliente; sin dock de CTA gobernado.

## Visual Fidelity Mapping

- Color/tipografía/espaciado: `efeonce-think/src/lib/report-tokens.ts` (AXIS) — nunca HEX inline. Familias por
  rol canónico; numerales tabulares en cifras.
- Figuras: ECharts con paleta de `report-tokens`; mismas familias `ChartSpecV1` que el catálogo PDF (TASK-1847);
  fidelidad semántica (mismos hechos, mismos ejes y unidades), no de píxel.
- Estados: `StatusScreen` (hero ambiental + personaje Nexa por estado), sin cambios.
- Marca: masthead y footer según `EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.

## Copy Ledger

Chrome del hub en `efeonce-think/src/lib/insights-copy.ts` (es-CL, tuteo, revisado con `greenhouse-ux-writing`):
`index_title` «Contenido», `table_toggle` «Ver tabla equivalente», `table_close` «Ocultar tabla»,
`period_partial` «Período abierto: la fuente aún no cerró este período.», `downloads_title` «Descargas»,
`download_unavailable` «No disponible en esta edición», `link_notice` «Este enlace es personal y puede revocarse.»,
`estimated_badge` «Estimado», `observed_badge` «Medido», `absent_badge` «Sin dato», `as_of` «Datos al {date}».
Todo lo editorial (claims, límites, metodología, referencias, etiquetas de métricas) viene del modelo y NO se reescribe.

## State Copy

- `not_found`: «Este enlace no existe o expiró.» + «Pide un enlace nuevo a quien te lo compartió.»
- `gone`: «Este informe fue retirado.» + «Si necesitas una versión vigente, pídela a tu contacto en Efeonce.»
- `rate_limited`: «Demasiadas lecturas en poco tiempo.» + «Intenta de nuevo en unos minutos.»
- `error`: «No pudimos cargar el informe.» + «Intenta de nuevo en unos minutos.»
- Capítulo vacío: el texto de `limits` del capítulo (p. ej. «organic_etv: la fuente no sirve esta ventana con exactitud»).

## Accessibility Contract

Skip link al contenido; jerarquía h1 (título) → h2 (capítulos) → h3 (figuras); índice como `<nav aria-label>`;
anchors mueven el foco al h2; `<details>` nativos; tablas con `<caption>` y `scope`; figuras con `role="img"` +
`aria-label` resumen y tabla equivalente como alternativa textual; contraste AA; `focus-visible` en todo control;
`prefers-reduced-motion` respetado; sin contenido que dependa de hover.

## Implementation Mapping

- Ruta: `efeonce-think/src/pages/insights/r/[token].astro` (SSR, `prerender = false`, cabeceras `no-store`/`noindex`/`no-referrer`).
- Cliente: `efeonce-think/src/lib/insights.ts` → `GET {GREENHOUSE_API_BASE}/api/public/insights/shared/{token}` (TASK-1848).
- Primitivas: reuse `StatusScreen`, `ReportIcon`; new `EditionMasthead`, `FactCallout`, `ChartFigure`
  (`src/components/primitives/*` + contratos en `src/lib/primitives/*`).
- Secciones: `src/components/insights/{ExecutiveSummary,Chapter,LimitsBlock,MethodologyBlock,Downloads}.astro`.
- Copy: `src/lib/insights-copy.ts`. Datos: sólo el modelo; sin commands.
- Paridad: mismas cifras que el portal (TASK-1849) por construcción (proyección de `projectPlan`/`projectSnapshot`).
- Estados: default, partial, capítulo vacío, downloads unavailable, not_found, gone, rate_limited, error, long, mobile, reduced motion.
- Mapear cada componente concreto y el contrato real de TASK-1848 antes de `UI ready: yes`.

## GVC Scenario Plan

- Quality profile: premium.
- Herramienta: `efeonce-think/scripts/capture.mjs` (desktop 1440 + mobile 390) + `scripts/verify-insights-report.mjs` (fixtures + no-leak).
- Escenarios (9): first fold · capítulo con figura · tabla abierta · límites · descargas no disponibles ·
  not_found · gone · rate_limited · error; fixtures completo/parcial/capítulo vacío/sin descargas.
- Marcadores `data-capture`: `masthead`, `summary`, `chapter-<module>`, `limits`, `downloads`, `footer`.
- Assertions: DOM == fixture (cifras con unidad), sin token ni URLs de storage en HTML, cabeceras correctas,
  `scrollWidth === clientWidth`, reduced motion y recorrido de teclado grabados.
- Review dossier: `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/`; scorecard
  `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think.scorecard.json`.
- Baseline decision: superficie nueva `think.insights.shared`; comparar contra el informe del Grader sólo por
  consistencia de marca; no congelar otras superficies del hub.

## Design Decision Log

- Página editorial larga con índice (no dashboard, no PDF embebido): la edición es congelada y se lee de arriba a abajo.
- `FactCallout` con procedencia visible por cifra: el lector debe saber si es medido o estimado y a qué corte,
  sin abrir la metodología.
- Tabla equivalente colapsada por defecto: mantiene la lectura ejecutiva y cumple accesibilidad/verificabilidad.
- Sin CTA comercial: el destinatario ya es cliente; el Grader sí lo tiene por ser lead magnet.
- `no-store` en lugar del cache del Grader: la revocación es un requisito del producto.
- Riesgos abiertos: fidelidad PDF↔web de gráficos (semántica); tamaño del modelo con 3 módulos; rate limit por IP
  compartida. UI ready: no hasta contrato real de TASK-1848 y mapping de componentes.
