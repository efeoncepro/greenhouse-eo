# TASK-1889 — Wireframe: catálogos premium de Efeonce Insights (A4 y deck)

Creado 2026-09-25 a partir del canvas aprobado por el operador. Describe las páginas que TASK-1889 debe producir en los
catálogos `insights-report` (A4) e `insights-deck` (16:9), región por región, con sus datos, estados y reglas.

> **Estado 2026-09-26:** implementado y en producción (TASK-1889 complete; releases `0e87c7a443a2` y
> `f9257b9c94af`). Evidencia en el [dossier](../reviews/TASK-1889-efeonce-insights-premium-catalogs/README.md).

- Visual direction mode: source-led
- **Dirección aprobada:** [`TASK-1889-efeonce-insights-premium-catalogs-direction.md`](../visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md)
  con hojas durables en `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/`.
- **Fuente editable:** canvas «Gráficos de Efeonce Insights», <https://claude.ai/artifact/M2GiA4NdBfgGkiAvwPjZYb>
  (archivos `project/Premium-*.dc.html` y `project/Deck-*.dc.html`; se leen con la tool Artifact).
- **Contrato de datos:** TASK-1888 (`ChartSpec` de 15 familias, lectura por figura, cifra principal, entrada de
  capítulo, hechos esenciales, `channelId`, portada sellada). Sin TASK-1888 sólo se pueden rehacer las páginas que el
  contrato v1 ya alimenta.
- **Master flow del programa:** [`EPIC-045-efeonce-insights-UI-FLOW.md`](../flows/EPIC-045-efeonce-insights-UI-FLOW.md).
  Esta task no agrega nodos ni rutas: produce los archivos `report_pdf` y `deck_pdf` que los nodos existentes
  entregan.

## Desktop Target

El «desktop» de esta superficie es el documento a tamaño físico: A4 794×1123 px y lámina 1280×720 px a 96 dpi.

### A4 — página de gráfico (plantilla base de las 15 familias)

| # | Región | Contenido y datos | Reglas |
|---|---|---|---|
| 1 | Cabecera | izquierda: logo del cliente (o su nombre); derecha: «NN · Capítulo» y período («Agosto 2026 · contra julio 2026») | período desde `render/labels.ts`; sin nombre inventado |
| 2 | Pestaña lateral | bloque navy en el borde derecho con el número de capítulo | sólo en páginas de capítulo |
| 3 | Antetítulo | ícono de la métrica + nombre en versalitas navy | ícono de set existente |
| 4 | Cifra principal | valor protagonista (Poppins 700) + bajada de 2–3 líneas | `PlanHero` de TASK-1888; cifra citada |
| 5 | Conclusión | título que afirma (Poppins 700) + lead | claim del plan |
| 6 | Gráfico | título de sección + leyenda arriba + figura + nota con ícono | color por rol; tabla equivalente disponible |
| 7 | Procedencia | tres columnas: Unidad · Fuente · Cobertura | desde el snapshot, no del LLM |
| 8 | Cierre | panel navy redondeado: «Lo que significa» y «Próximo paso» en Poppins + firma «Recomendación de Efeonce» | lectura por figura de TASK-1888; se omite si el plan es v1 |
| 9 | Pie | logo Efeonce + «Insights · Informe de <mes año>» + línea de dirección/teléfono; URL bubble; folio «NN / total» | slots `fixed-*`, nunca post-proceso |

### A4 — portadas (una sola portada, elegida y sellada por TASK-1888)

- **Navy:** logo negativo + «Insights»; período arriba a la derecha; órbita con arco teal y punto; «Lectura de
  Efeonce»; título en tres líneas (Poppins 600); bajada; filete; «Preparado para» + logo del cliente en negativo;
  eslogan y «Confidencial · Versión N · fecha».
- **Blanca:** bloque navy a sangre (55 % superior) con logo negativo, período, órbita grande cortada por el borde y la
  línea «Qué mide este informe»; en papel, «Lectura de Efeonce», título en dos líneas (Poppins 600, navy de marca),
  bajada, «Preparado para» + logo del cliente en positivo (200×56) y pie con confidencialidad y eslogan.
  - Con canales (`channelId` presentes): satélites sobre la órbita, uno por canal medido, en discos blancos; el arco
    teal los une con un degradé.
  - Sin canales (por ejemplo, sólo `ico`): arco teal corto con punto, sin logos.
  - «Qué mide este informe»: una línea por módulo desde `src/lib/copy/insights.ts`; un informe mixto suma líneas.

### A4 — estructura y prosa

- **Contraportada:** navy; órbita centrada con el arco en el punto opuesto al de la portada; logo y eslogan al centro;
  pie centrado con URL, seis redes (Spotify, Instagram, LinkedIn, Threads, YouTube, TikTok), correo, dos teléfonos,
  dirección, mercados y línea legal (razón social, RUT, confidencialidad, fecha de corte).
- **Apertura de capítulo:** navy; número grande en contorno; título y entrada del capítulo; en visibilidad IA, fila
  «Medimos la marca en» con logos de canal; índice del capítulo con folios.
- **Resumen ejecutivo:** tesis del mes + «Lo esencial del mes» (hasta 5 hechos con cifra y folio) + «Para decidir».
- **Nuestra lectura (argumento):** tesis, tres bloques (qué muestran los datos · dónde está la brecha · qué cambia) con
  folios de evidencia y una frase de cierre.
- **Plan de acción:** acciones numeradas con métrica de éxito y calendario por semana; responsable sólo si existe
  (`ownerRef`).
- **Índice, tabla densa y límites:** se conservan de v1 con el nuevo estilo.

### Deck 16:9

Fondo navy. Columna izquierda: antetítulo, cifra principal, bajada, título. Panel derecho redondeado: gráfico, leyenda
y fuente. Franja inferior: «Lo que significa» / «Próximo paso». Pie: logo, edición, URL y folio. Prosa (resumen, lectura
y plan) con la misma gramática. **Portada, apertura y contraportada del deck no están diseñadas en el canvas:** se
derivan de las A4 aprobadas y el operador las revisa antes de congelar baseline.

## Mobile Target

No aplica: el PDF se revisa a tamaño físico y la lectura web de la edición es `InsightWebModelV1` (TASK-1849/1875). El
harness del gate del Composer no certifica legibilidad por escalado.

## Action Hierarchy

Leer la conclusión → ver la cifra y el gráfico que la prueban → revisar procedencia → actuar según «Próximo paso» y el
plan. El documento no tiene acciones de negocio ni controles; los enlaces (índice, folios de evidencia, URL) son reales.

## Visual Fidelity Mapping

- Tokens del brand pack `axis` según la tabla de la dirección; sin HEX literal en plantillas.
- Roles de dato como tokens semánticos del catálogo: `actual`, `anterior`, `oportunidad`, `ausencia` × papel/navy.
- Tipografía: Poppins (cifras, títulos, versalitas, panel de cierre) y Geist (lectura y datos con `tabular-nums`) desde
  el font pack local del catálogo.
- Logos de canal: isotipos oficiales del repo (`public/images/greenhouse/SVG/icon-google.svg`,
  `public/images/logos/axis/{gpt-isotype,gemini-isotype,claude-isologo,perplexity-icon}.svg`) copiados a los assets de
  ambos catálogos; disco blanco con isotipo al 60 % y nombre al lado.
- Redes y contacto: SVG de `catalogs/deck-axis/assets/{social,contact}`; datos desde `src/config/efeonce-brand.ts`.
- Variación en tablas y figuras: el triángulo sigue al valor (▲ subió, ▼ bajó) y el tono dice si el cambio es mejor o
  peor para esa métrica. La dirección sale del propio hecho (`dimension.direction`), de la posición («menor es
  mejor») o de una meta/banda de la misma métrica; sin dirección conocida, tono neutro. Clases `delta--better` /
  `delta--plain` y `fig-delta--plain`; lógica en `render/figure-slots.ts` (`directionOf`, `higherIsBetterOf`,
  `trendOf`).

## Copy Ledger

Copy reutilizable en `src/lib/copy/insights.ts`: «Lectura de Efeonce», «Preparado para», «Qué mide este informe» y sus
líneas por módulo, «Lo que significa», «Próximo paso», «Recomendación de Efeonce», «Lo esencial del mes», «Para
decidir», «Medimos la marca en», «Unidad», «Fuente», «Cobertura», «Confidencial · Versión», «Canales medidos». Cifras y
fechas salen del modelo; ningún número se mantiene a mano.

## State Copy

| State | Qué se ve | Regla |
|---|---|---|
| ready | páginas completas | ninguna |
| familia sin evidencia | la página no existe | la emite o no el planner; el catálogo nunca dibuja un gráfico vacío |
| evidencia parcial | serie ausente con rayado + nota «sin dato para …» | nunca cero en lugar de nulo |
| plan v1 (sin lectura por figura) | página sin panel de cierre | compone igual |
| sin logo de cliente | «Preparado para» con el nombre; sin nombre, el bloque desaparece | sin nombre inventado |
| logo sin variante para fondo oscuro | portada blanca | lo resuelve TASK-1888 |
| canal desconocido | nombre sin isotipo | no rompe el render |
| título o lead largos | falla el ajuste y se reporta | sin truncar con «…» |

## Accessibility Contract

Texto seleccionable; contraste AA medido en papel y en navy; tabla equivalente para cada gráfico; ningún par de
series se distingue sólo por color; lectura verificada en escala de grises; enlaces descriptivos. No se promete PDF/UA.

## Implementation Mapping

- Superficie: documentos PDF de los outputs `report_pdf` y `deck_pdf`. `Nav placement: none`.
- Catálogos: `src/lib/artifact-composer/catalogs/insights-report/**` y `src/lib/artifact-composer/catalogs/insights-deck/**`
  (plantillas `.html`, `*.slots.json`, `registry.json`, `resolvers.ts`, molde y tokens compilados).
- Mappers: `src/lib/efeonce-insights/render/report-mapper.ts` e `insights-deck-mapper.ts`, que comparten
  `render/figure-slots.ts` (el `figure-pages.ts` v1 se retiró junto con el legado).
- Geometría: `src/lib/artifact-composer/chart-geometry.ts` (sin cambios de contrato; cada catálogo decide tono y énfasis).
- Primitives: `extend` de los catálogos v1 y de la geometría domain-free; ninguna librería de gráficos nueva.
- Datos: `ChartSpec`, `EditorialPlan` y portada sellada de TASK-1888. Sin command ni store nuevos en esta task.
- Copy: `src/lib/copy/insights.ts`. Datos de contacto: `src/config/efeonce-brand.ts`.

## GVC Scenario Plan

- Quality profile: premium.
- Scenario: **no aplica** GVC de portal (no hay ruta). El harness es `pnpm composer:visual-gate --catalog=insights` con
  un frame por plantilla nueva o rehecha, más el render real de ediciones internas de Berel (`seo`,`aeo`) y Sky (`ico`).
- Capturas: portada navy, portada blanca con y sin canales, contraportada, capítulo, resumen, lectura, plan, una
  página por familia con productor y las láminas equivalentes; cada una en color y en gris.
- Assertions: cifras iguales al snapshot; fuentes embebidas; sin identificadores internos; sin datos de ejemplo en
  producción.
- **Fidelidad al canvas:** cada plantilla con el fixture del canvas contra `paginas/<Board>.png` de la dirección, con
  `pixelmatch` (umbral 0,1) y ≤ 1 % de píxeles distintos por página; hoja lado a lado en el dossier.
- Scroll-width: no aplica a PDF; el harness HTML verifica que ningún bloque desborde el lienzo.
- Review dossier: `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/` con PDFs, hojas de contacto y scorecard.
- Baseline decision: rebaseline declarado sólo de los frames Insights; los frames de `deck-axis` y SKY no se tocan
  (ISSUE-122).

## Design Decision Log

- **Fuente:** canvas aprobado (source-led) en vez de un benchmark nuevo; las hojas versionadas son la referencia.
- **Una portada con variantes por módulo**, no una portada por servicio: los servicios difieren en lo que mide el
  informe, no en la identidad; un informe mixto necesita una sola portada.
- **Navy o blanca por cliente con cambio en el encargo;** `auto` elige blanca si el logo del cliente no tiene versión
  para fondo oscuro. La decisión se sella en TASK-1888; el catálogo sólo dibuja.
- **Dos plantillas de portada en el mismo catálogo**, no un `VisualProfile` (TASK-1644 es token-only y comercial).
- **Color con rol en los datos** y navy en la estructura; teal sólo como acento en navy.
- **Portada, apertura y contraportada del deck derivadas de A4**, con revisión del operador antes del baseline, porque
  el canvas no las diseñó.
- **Datos de contacto al SSOT de marca** en vez de repetirlos en cada catálogo (hoy están escritos en la contraportada
  de `deck-axis`).
- `UI ready` queda en `no` hasta completar mapping, dossier y scorecard; al cierre puede declararse `n/a` con la misma
  justificación que TASK-1847 (documento sin ruta de portal).
