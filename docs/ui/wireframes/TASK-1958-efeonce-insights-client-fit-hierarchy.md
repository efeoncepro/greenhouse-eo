# TASK-1958 — contrato visual: jerarquía «apta para cliente» del informe Insights (Think + PDF)

Propuesta del 2026-10-02, **sin aprobar todavía**. Nace de la revisión del operador sobre dos ediciones internas reales
(Berel `EO-INS-000027`, Sky `EO-INS-000029`) renderizadas en local con el código de producción (modelo web 1.1). Modifica
regiones de la superficie aprobada en `TASK-1875` (dirección A, «tablero de respuestas») y de los catálogos premium de
`TASK-1889`; no cambia la dirección visual, cambia la jerarquía de lectura dentro de cada capítulo.

- Visual direction mode: `source-led` — fuente: el runtime aprobado de TASK-1875
  (`docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/desktop-first-fold.png` y su dossier) y los PDF
  premium de TASK-1889 (`docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/`).
- Evidencia del problema (capturas del 2026-10-02, en la conversación del operador; se regeneran en el dossier de esta
  task con `efeonce-think/scripts/capture-insights-report.mjs` sobre los fixtures reales anonimizados de TASK-1957):
  fuente con nombres de tabla, lista plana de seis frases por capítulo SEO, límites duplicados con lenguaje interno,
  gráfico de cuatro barras de valor 2, ocho puntajes AEO en lista sin jerarquía.
- Contrato de datos que consume: `InsightWebModelV1` 1.2 de `TASK-1957` (fuente humana, `unitLabel`, `asOfLabel`,
  claims con rol `finding|backing`, figuras elegibles, límites de cliente).
- Nodo del master flow: S6 (vista compartida) y S7/S8 (PDF A4 y deck) de `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`.
- Targets: desktop 1440×900 · mobile 390×844 (quiebres a 1000 px y 720 px, heredados de TASK-1875).

## Desktop Target

Capítulo (`ModuleScene.astro`), de arriba abajo:

1. **Apertura del capítulo** (sin cambio): chip del módulo, título, bajada.
2. **Historia principal** (sin cambio de layout): figura grande con lectura. Cambia la fila de procedencia:
   `Fuente · Google Search Console` · `Unidad · Cantidad` · `Datos al · 20 sep 2026`. Se elimina la nota visible
   «Barras con origen en cero» (pasa a la descripción accesible de la figura; sólo se muestra visible cuando el eje NO
   parte en cero).
3. **Cadena de figuras** (sin cambio de layout): cada beat con familia, cifra clave, conclusión, significado y próximo
   paso. Las figuras no elegibles ya no llegan (TASK-1957); un hecho «n de m» se dibuja como `waffle` con la etiqueta
   «2 de 6».
4. **Hallazgos del capítulo** (NUEVO, reemplaza la lista `ins-claims`): lista estructurada, máximo cinco filas, cada fila:
   - nombre de la métrica en peso semibold (`ins-finding-row__metric`),
   - cifra actual en la escala tipográfica de cifra mediana (`ins-figure-md`, `tabular-nums`),
   - cambio en una pastilla neutra con dirección escrita («−12,1 % vs período anterior»; nunca sólo color),
   - una línea de lectura (el texto del claim `finding`) en peso regular y tono secundario.
   Filas separadas por regla fina, sin card por fila (anti card-on-card).
5. **Todas las cifras** (NUEVO, reemplaza la grilla `ins-facts` y absorbe los claims `backing`): tabla compacta plegada
   por defecto con disparador «Ver todas las cifras (n)»; columnas Métrica · Período · Período anterior · Cambio. Usa
   `<table>` con `<caption>` y `<th scope>`. Los ceros sin lectura viven sólo aquí.
6. **Alcance del capítulo** (reemplaza «Límites de este capítulo»): una línea por tema, tono informativo, ícono de
   información (no el círculo punteado de advertencia), título según copy aprobado («Qué no incluye este capítulo»
   propuesto).

### Isotipos de motor y buscador (pedido del operador, 2026-10-02)

Donde el informe nombra un canal (ChatGPT, Gemini, Perplexity, Claude, Google AI Overview, Google), va su isotipo
oficial a la izquierda del nombre, nunca un emoji ni una letra suelta. Fuente y reglas:

- **Think ya tiene el componente**: `efeonce-think/src/components/EngineMark.astro` (logos en
  `public/logos/engines/{chatgpt,gemini,perplexity,claude,google}.svg`; `google_ai_overview` usa el de Google) y
  `src/components/primitives/EngineAvatarGroup.astro` (grupo apilado). Los usa el informe del Grader; el informe de
  Insights todavía no.
- **Los PDF ya lo hacen** con el mismo vocabulario: `artifact-composer/catalogs/insights-shared/channels.ts` y
  `assets/channels/*.svg` en los catálogos A4/deck («Medimos la marca en» y columnas por canal).
- **El dato**: `InsightWebFactV1.channelId` (modelo 1.2, TASK-1957) y `spec.dimensionChannelIds`/serie
  `channelId` en las figuras. Mismo vocabulario que `contracts/channels.ts`; sin canal, sólo el nombre.

Dónde se aplican:

| Región | Isotipo |
|---|---|
| Fila de hallazgo con un solo canal | `EngineMark` 20 px junto al nombre de la métrica |
| Frase de empate («La marca aparece en 2 de 6 consultas en cada motor.») | `EngineAvatarGroup` con los motores citados por la frase (sus `factIds` → `channelId`) |
| Etiquetas de dimensión de una figura por canal (columnas) | `EngineMark` 16 px antes de la etiqueta del eje |
| Tabla «Todas las cifras», fila de un hecho con canal | `EngineMark` 16 px en la celda Métrica |
| Métricas SEO | **sin isotipo**: todas miden Google; repetir el logo en cada fila es ruido (misma regla que el PDF: canal en la serie, no en cada dimensión) |

Accesibilidad: el isotipo es decorativo (`aria-hidden`); el nombre del canal siempre va en texto.

## Mobile Target

- La fila de hallazgo apila: métrica + pastilla de cambio en una línea; cifra debajo; lectura al final.
- La tabla «Todas las cifras» pasa a filas apiladas (definición métrica → valores) sin scroll horizontal de página;
  si la tabla supera el ancho, scroll contenido en su propio contenedor con indicación visual.
- Fila de procedencia en dos líneas como máximo.

## Action Hierarchy

1. Leer el hallazgo (cifra + cambio + lectura) sin abrir nada.
2. Expandir «Ver todas las cifras» para respaldo.
3. Las descargas y la presentación no cambian (TASK-1875).

## Visual Fidelity Mapping

| Región | Fuente de verdad | Token/variante |
|---|---|---|
| Fila de hallazgo | escala tipográfica de Think (`--ins-type-*` en `src/styles/insights.css`) | métrica `ins-label` semibold sentence case; cifra `ins-figure-md`; lectura cuerpo secundario |
| Pastilla de cambio | roles de datos de TASK-1889 | neutra con signo y palabra; navy para el texto; sin verde/rojo semáforo |
| Tabla de respaldo | patrón «chapter-table-open» de TASK-1875 | mismas reglas y densidad que la tabla del gráfico |
| Alcance | `ins-limits` existente | ícono informativo en vez de círculo punteado |
| PDF A4/deck | catálogos `insights-report`/`insights-deck` de TASK-1889 | misma jerarquía (métrica en negrita, cifra, cambio, lectura) dentro de las plantillas aprobadas; fidelidad al canvas ≤1 % donde no cambia la región |

## Copy Ledger

- Think: `efeonce-think/src/lib/insights-copy.ts` — `findingsTitle`, `allFiguresToggle(n)`, `scopeTitle`,
  `changeVsPrevious`, `provenanceAsOf`. Reemplaza `limitsTitle`/`editionLimits` (se conservan sólo para lectores 1.1).
- Greenhouse PDF: `src/lib/copy/insights.ts` (`GH_INSIGHTS.document`). Redacción validada con `greenhouse-ux-writing`,
  tuteo es-CL, sin jerga interna («ventana», «fuente no sirve», «materialized»).

## State Copy

- Capítulo sin hallazgos materiales: «Sin cambios relevantes en este período.» + tabla de respaldo visible.
- Cifra ausente: «Sin dato» (heredado), nunca cero.
- Modelo 1.1 (sin roles): render previo de TASK-1875 como fallback; no se rompe.

## Accessibility Contract

- La lista de hallazgos es `<ul>` con una fila `<li>` por hallazgo; el cambio se anuncia en texto, no por color.
- El disparador de la tabla es `<button aria-expanded aria-controls>`; foco permanece en el botón al abrir/cerrar.
- `<table>` con `<caption>` y `<th scope="col|row">`; cifras con `tabular-nums`.
- Contraste AA verificado con `scripts/audit-insights-a11y.mjs`; recorrido con Tab en 1440 y 390.
- Reduced motion: la revelación por scroll ya es mejora progresiva (`ins-motion`); las filas nuevas no agregan motion.

## Implementation Mapping

- Ruta: `efeonce-think` `src/pages/insights/r/[token].astro` → `InsightReport.astro` → `ModuleScene.astro`.
- Componentes: nuevo `FindingRows.astro` (hallazgos) y `AllFiguresTable.astro` (respaldo) en
  `src/components/insights/`; `ChartFigure.astro` toma `unitLabel`/`asOfLabel` y mueve la nota de origen a la
  descripción accesible.
- Datos: `InsightWebModelV1` 1.2 vía `src/lib/insights.ts` (tipos copiados del contrato de Greenhouse; fallback 1.1).
- Isotipos: reuso de `EngineMark.astro` y `EngineAvatarGroup.astro` del hub (ya en producción para el Grader), alimentados
  por `fact.channelId` y `spec.dimensionChannelIds`; sin assets nuevos.
- PDF: `src/lib/efeonce-insights/render/report-mapper.ts` y plantillas de `insights-report`/`insights-deck` en
  `src/lib/artifact-composer/catalogs/` (vía slots, sin HEX ni fuentes literales).
- Sin acciones de negocio nuevas: la superficie es de sólo lectura; no hay command que agregar.

## GVC Scenario Plan

- Quality profile: `premium`.
- Herramienta del hub: `efeonce-think/scripts/capture-insights-report.mjs` contra `astro dev` con fixtures 1.2 reales
  anonimizados (Berel SEO+AEO, Sky ICO) y el fixture extremo.
- Capturas nuevas: `chapter-findings`, `chapter-all-figures-open`, `chapter-scope`, `chapter-aeo-waffle` × desktop y
  mobile; recaptura del resto del dossier de TASK-1875 para comparar.
- Marcadores `data-capture`: `findings`, `all-figures`, `scope` además de los existentes.
- Assertions (`scripts/verify-insights-report.mjs`): ningún texto visible casa con los patrones del gate de TASK-1957;
  máximo cinco filas de hallazgo por capítulo; tabla con `caption` y `th`; `aria-expanded` cambia; fallback 1.1 intacto.
- Scroll-width: `scrollWidth - clientWidth === 0` en 1440 y 390, con tabla abierta y cerrada.
- PDF: `pnpm insights:canvas-fidelity` y `pnpm composer:visual-gate`; revisión del operador de los PDF reales.
- Review dossier: `docs/ui/reviews/TASK-1958-efeonce-insights-client-fit-hierarchy/` + scorecard
  `docs/ui/reviews/TASK-1958-efeonce-insights-client-fit-hierarchy.scorecard.json`.
- Baseline decision / surface ID: `think.insights.shared` (baseline de TASK-1875); esta task la reemplaza en las
  regiones listadas.

## Design Decision Log

- Decisión: hallazgos como filas estructuradas (métrica, cifra, cambio, lectura) y respaldo en tabla plegada.
- Alternativas: (a) negrita dentro de la frase actual — mantiene el recital; (b) una card por hallazgo — card-on-card y
  ruido; (c) tabla única sin hallazgos — pierde la lectura. Se elige la fila estructurada por jerarquía y economía.
- Por qué: el cliente debe leer el cambio y su sentido sin parsear una oración; la evidencia completa sigue a un clic.
- Reuse/extend/new: extiende el sistema de Think (tokens y escala existentes); dos componentes nuevos locales al hub.
- Riesgos abiertos: aprobación del operador de la dirección (esta task queda `UI ready: no` hasta tenerla); umbral de
  materialidad que decide cuántos hallazgos aparecen (lo fija TASK-1957).

## Lo que este contrato no cubre

- La selección de qué es hallazgo y el copy de límites: los decide `TASK-1957`.
- Familias de gráfico nuevas (`TASK-1901`/`TASK-1902`) y la interpretación con IA (`TASK-1903`).
- La biblioteca del portal (`TASK-1849`).
