# TASK-1902 — Wireframe: páginas de medidor y mapa de calor de Efeonce Insights (A4 y deck)

Creado 2026-09-25. Describe las dos familias de figura que TASK-1902 agrega a los catálogos `insights-report` (A4) e
`insights-deck` (16:9), región por región, más el cambio de regla que manda los tramos de posición a columnas.

- Visual direction mode: source-led
- **Dirección aprobada:** la misma de TASK-1889, [`TASK-1889-efeonce-insights-premium-catalogs-direction.md`](../visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md),
  aprobada por el operador el 2026-09-25. Hojas durables de estas familias:
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/Premium-Medidor.png`,
  `Premium-Heatmap.png`, `Deck-Medidor.png` y `Deck-Heatmap.png`.
- **Fuente editable:** canvas «Gráficos de Efeonce Insights» (`Premium-Medidor.dc.html`, `Premium-Heatmap.dc.html`,
  `Deck-Medidor.dc.html`, `Deck-Heatmap.dc.html`), exportado en `fuente-canvas-2026-09-25.tar.gz` junto a las hojas.
- **Contrato de datos:** TASK-1901 (hechos de puntaje por medición, posición por keyword × semana, keywords por
  tramo, `ChartSpecV1.dimensionKind`).
- **Master flow del programa:** [`EPIC-045-efeonce-insights-UI-FLOW.md`](../flows/EPIC-045-efeonce-insights-UI-FLOW.md).
  No agrega nodos ni rutas: produce páginas dentro de `report_pdf` y `deck_pdf`.

## Desktop Target

El «desktop» es el documento a tamaño físico: A4 794×1123 px y lámina 1280×720 px a 96 dpi. Ambas páginas usan la
anatomía de figura de TASK-1889 (pestaña de capítulo, antetítulo con ícono, cifra principal + conclusión, figura,
nota, procedencia y cierre «Lo que significa / Próximo paso»). Sólo cambia la región de la figura.

### A4 — Medidor (`report-figure-gauge`, canvas `Premium-Medidor`)

| Región | Contenido | Dato | Regla |
|---|---|---|---|
| Cabecera | cifra principal («+6») y bajada | `readings[].keyFigure` | como toda página de figura |
| Título de la figura + leyenda | «Puntaje…: agosto contra julio y la meta»; muestras período, anterior, meta, brecha | `chart.title`, series | la meta y la brecha sólo si el plan trae `targetFactId` |
| Arco (izquierda, ~300 px) | arco de 270° de `min` a `max`, zonas rotuladas en el borde (crítico, mejorable, sano), arco del período grueso, arco del anterior fino y anidado, marca de meta, tramo de brecha | `data.kind: 'gauge'` (`valueFactId`, `previousFactId`, `targetFactId`, `min`, `max`) | la geometría sale de las cifras con el `gaugeGeometry` del motor; las zonas sólo si el registro dueño las entrega como hechos, nunca umbrales escritos a mano |
| Centro del arco | valor grande, «de 100 · zona …», píldora «▲ +6 vs julio» | valor y anterior | la dirección se dice con el triángulo, no sólo con color |
| Componentes (derecha, opcional) | filas con ícono, nombre, valor, variación y barra con marca de meta | hechos de componentes del mismo módulo | sólo si el plan los trae; sin componentes, el arco se centra en el ancho de la página |
| Nota, procedencia, cierre | como toda página de figura | plan | `closing` sólo si hay lectura |

### A4 — Mapa de calor (`report-figure-heatmap`, canvas `Premium-Heatmap`)

| Región | Contenido | Dato | Regla |
|---|---|---|---|
| Cabecera | cifra principal («6 de 8») y bajada | `readings[].keyFigure` | |
| Título + leyenda | «Posición en Google de las 8 keywords»; rampa «más abajo → más arriba», «Subió», «Bajó» | `chart.title` | |
| Tabla-grilla | columna de keyword (texto), columnas de período (anterior + semanas), columna «Cambio» con píldora | `data.kind: 'heatmap'` (`rowLabels`, `columnLabels`, `cells`) | cada celda imprime su cifra; el tono la acompaña (más oscuro = mejor posición, invertido porque la posición 1 es la mejor); una celda `null` queda vacía con borde, nunca en cero |
| Cambio | «▲ 6» / «▼ 4» por fila | diferencia entre la primera y la última columna, calculada por TASK-1901 como hecho | el render no resta |
| Paginación | hasta 10 filas por página; más filas continúan con «(continuación)» | | reparto equilibrado como las demás figuras |

### Deck 16:9 — Medidor y mapa de calor (`insights-figure-gauge`, `insights-figure-heatmap`)

Misma retícula que las láminas de figura de TASK-1889: columna izquierda de 372 px (antetítulo, cifra de 104/112/132
px según largo, bajada, filete, conclusión) y panel translúcido de 428 px de alto a la derecha con la figura, su
fuente y su nota; cierre en dos columnas sobre el pie. En el deck el medidor no lleva la lista de componentes (no cabe
en el panel) y el mapa de calor admite hasta 6 filas por lámina.

### Regla de columnas por tramo

`ChartSpecV1.dimensionKind: 'bucket'` (TASK-1901) manda un `bar_grouped` a la página de **columnas** (eje compartido,
como `Premium-Agrupadas`), igual que `'channel'`. `'metric'` o ausente sigue en **comparación** (cada métrica en su
escala). La regla vive en `render/figure-slots.ts` y en `hasFigurePage`.

## Mobile Target

No aplica como viewport: son documentos de tamaño fijo. El equivalente «compacto» es la lámina 16:9 del deck, que
cubre la sección anterior.

## Action Hierarchy

Documento de lectura, sin acciones. El orden de lectura es cifra → conclusión → figura → qué significa → qué hacer.

## Visual Fidelity Mapping

| Elemento del canvas | Token / recurso | Nota |
|---|---|---|
| Arco del período | `dataCurrentOnPaper` / `dataCurrentOnNavy` | trazo grueso |
| Arco del anterior | `dataPriorOnPaper` / `dataPriorOnNavy` | trazo fino anidado |
| Pista del arco | `gaugeTrack` | |
| Brecha a la meta | `dataOpportunityOnPaper` | con rótulo «faltan N»; nunca sólo color |
| Rampa del mapa de calor | escala de `dataCurrentOnPaper` por opacidad | la cifra se imprime siempre; contraste AA medido en cada escalón |
| Píldora de cambio | `delta-pill` de TASK-1889 | dirección con triángulo |

## Copy Ledger

Copy reusable en `src/lib/copy/insights.ts` (`GH_INSIGHTS.catalog`): antetítulo por familia (`figureEyebrow.gauge`,
`figureEyebrow.heatmap`), «de {max}», «zona {nombre}», «vs {período}», «faltan {n}», rótulos de la rampa («Más abajo →
más arriba», «Subió», «Bajó»), «Cambio». Los nombres de zona salen del registro dueño con los hechos, no del copy.

## State Copy

| Estado | Qué se ve |
|---|---|
| Con meta | arco con marca de meta y brecha rotulada |
| Sin meta | arco sin marca; leyenda sin «Meta» ni «Brecha» |
| Sin período anterior | el medidor no se produce (TASK-1901 no lo emite); el capítulo lo narra |
| Celda sin dato | celda vacía con borde, sin cifra |
| Keyword sin cambio | píldora neutra «= 0» |
| Más filas que la capacidad | continuación en la página siguiente |

## Accessibility Contract

Cada SVG lleva `role="img"` y un `aria-label` con el resumen de sus cifras. El mapa de calor se lee también en gris
(la cifra impresa manda sobre el tono). El contraste de cifras sobre celdas oscuras se mide (AA) en el dossier.

## Implementation Mapping

- Plantillas: `src/lib/artifact-composer/catalogs/insights-report/report-figure-gauge.html` y `report-figure-heatmap.html`; `catalogs/insights-deck/insights-figure-gauge.html` y `insights-figure-heatmap.html`, con sus `*.slots.json`.
- Geometría pura: `catalogs/insights-shared/figure-svg.ts` (`gaugeSvg`, `heatmapSvg` sobre `gaugeGeometry`/`heatmapGeometry` del motor) y hooks en `figure-hooks.ts`.
- Mapper: `src/lib/efeonce-insights/render/figure-slots.ts` (familias `gauge` y `heatmap`, regla `dimensionKind`).
- Copy: `src/lib/copy/insights.ts`.
- Fidelidad: fixtures en `scripts/insights/canvas-fixtures/{report,deck}/` con los datos del canvas.

## GVC Scenario Plan

No hay ruta de portal: el harness es el del Artifact Composer.

- `pnpm insights:canvas-fidelity --only=Medidor|Heatmap [--gray]`: ≤ 1 % contra las cuatro hojas.
- `pnpm composer:visual-gate --catalog=insights`: frames nuevos declarados en `BASELINE_DELTAS.md` y congelados.
- Vista previa real: `scripts/insights/preview-edition.ts --editorial-v2` de Berel con los hechos de TASK-1901.
- Dossier: `docs/ui/reviews/TASK-1902-efeonce-insights-gauge-heatmap-pages/README.md`.

## Design Decision Log

- Decision: construir sólo las dos familias que TASK-1901 alimenta (medidor, mapa de calor) con la anatomía de figura existente.
- Alternatives considered: construir las 11 familias del canvas de una vez (rechazado: páginas sin productor no aparecen en ningún informe y quedan sin verificar con datos reales).
- Why this pattern: reutiliza la retícula, los hooks y el gate de fidelidad de TASK-1889.
- Reuse / extend / new primitive: `extend` (dos plantillas y dos funciones de geometría en el catálogo).
- Open risks: la lista de componentes del medidor depende de que el dominio entregue componentes; las zonas del arco dependen del registro dueño.
