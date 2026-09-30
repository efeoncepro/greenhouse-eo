# Efeonce Insights — marca, informe y UI (cómo se ve y dónde vive)

> Verificado contra código el 2026-09-28 (greenhouse-eo `develop`, y el 2026-09-30 para las láminas del deck SEO/AEO de §7.8; efeonce-think `main@544ecd4`, en producción; AXIS `main@5b3056f`; la página del Lab de Insights, publicada en `main@3dfbf0e`).
> Este archivo describe lo que EXISTE. Donde algo falta, está en §7 «Gaps» y no se decide aquí: esas decisiones son del
> operador.

## 0. Referencia visual en AXIS (empieza aquí si tienes que ver algo)

- **Página del Lab `/references/insights/`: publicada.** Referencia visual en el Lab de AXIS:
  [axis.efeonce.org/references/insights/](https://axis.efeonce.org/references/insights/) (publicada el 2026-09-28, AXIS
  main `3dfbf0e`; datos para agentes en `/references/insights.json`). La rama `docs/insights-lab` entró a `main` por
  fast-forward con CI verde, y quien la construyó la revisó antes (sin detalles de WAF en la página pública, hechos
  corregidos, galería live recapturada, e2e 2/2). Fuente en `main`: `apps/lab/src/pages/references/insights.astro`, JSON
  para agentes `…/insights.json.ts`, guía `docs/agent-composition/insights.md`. **El ejemplo vivo del producto es la
  muestra `https://think.efeoncepro.com/insights/muestra`.**
- Es una página de **referencia**: muestra la marca, sus aplicaciones aprobadas, las secciones del informe y la UI del
  informe live como documentación con datos de muestra. **No** publica componentes ni contratos nuevos.
- Antes de ella, el Lab sólo tenía las láminas 7.1 «Insights: informe» y 7.2 «Insights: plan, cierre, deck y correo»
  dentro de `/references/graphic-line/` (capítulo 9 «Pruebas en producto», datos en
  `apps/lab/src/data/graphic-line-elements.json`), marcadas «prueba de diseño, cifras de muestra». Siguen siendo
  pruebas: no son el diseño de Insights (ver SKILL.md, «Brand graphic line»).
- **El Lab es público.** Sólo datos de muestra: organización «Greenhouse Demo» o razón social ficticia, recuadro «Logo
  del cliente», cifras ilustrativas. **Nunca** Berel, Sky ni datos de un cliente, tampoco en capturas.

## 1. Frontera con AXIS (vinculante)

- AXIS publica valores, significado y activos de marca; **la UI de producto vive en sus consumidores** (Greenhouse,
  Think) hasta que un segundo consumidor real justifique extraerla (`axis-design-system/docs/ARCHITECTURE.md:3-5`;
  `docs/architecture/GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md` §Adapters: «AXIS publishes values and meaning, not
  painted components»; Lab `apps/lab/src/content/docs/index.mdx` §Boundary: el Lab no importa código, API ni adapters
  de Greenhouse o Globe). Precedente más cercano: Glitch (página de referencia con piezas aprobadas).
- Por eso Insights entra a AXIS como (a) activos de marca en `@efeoncepro/axis-brand-assets` 0.4.0 y (b) la página de
  referencia de §0 (publicada el 2026-09-28, AXIS main `3dfbf0e`). Nada más.
- **Candidatos reales a extraer** (ya hay DOS consumidores con copias a mano) — follow-up, no implementado:
  1. **Roles de color de datos**: `greenhouse-eo/src/lib/artifact-composer/brand-packs/axis/editorial-roles.json`
     (roles `dataCurrent/Prior/Opportunity/Absence{OnPaper,OnNavy}`, `dataHighlightOnNavy`) copiados en
     `efeonce-think/src/lib/insights-tokens.ts` (`dataRoles`). La copia llegó a divergir (el dato «anterior» sobre
     papel era `#0e8c82` en Think); **resuelto 2026-09-28** (efeonce-think `b3c5820`, en producción): Think usa
     `#1f9e94` (`--axis-deck-role-dataPriorOnPaper` / teal-650), igual que los PDF; 3,3:1 como relleno sobre blanco.
     Ese desvío es justamente el riesgo de tener dos copias sin fuente común.
  2. **Geometría de las 15 familias**: `greenhouse-eo/src/lib/artifact-composer/chart-geometry.ts` +
     `catalogs/insights-shared/figure-svg.ts` frente a `efeonce-think/src/lib/insights-chart-geometry.ts` +
     `src/components/insights/ChartFigure.astro`. Regla vigente mientras no se extraiga: la geometría de la web nunca
     diverge de la de los PDF (lessons.md, waffle 2026-09-28).

## 2. Marca de producto

**Qué es.** «insights» en Poppins Bold, minúscula, con el punto de la primera «i» convertido en una órbita mínima:
anillo en la tinta de la palabra, esfera en el acento de Growth (`#36c8bf` sobre oscuro, `#0e8c82` sobre papel) a las
1:30 con un corte en el anillo. El isotipo es esa «i» sola. Canon del operador del 2026-09-28 (skill
`efeonce-graphic-line`, `references/ledger.md`, fila «Marca de producto de Efeonce Insights»).

**Cómo se construye.** `greenhouse-eo/scripts/brand/build-insights-logo.mjs` (contornos de Poppins Bold con fontkit;
nunca se edita un SVG a mano: se regenera y se vuelve a sellar en AXIS). Commits Greenhouse `7deed5888` (logo e
isotipo) y `b64f07ffa` (lockup); AXIS `25b5ecf` + `4760e3e` → **`@efeoncepro/axis-brand-assets` 0.4.0** (tag `v0.4.0`,
en `origin/main`).

**Ids** (`axis-design-system/packages/brand-assets/src/manifest.ts`; marca `insights` en `AXIS_BRAND_ASSET_BRANDS`,
`src/index.ts:18`; reglas en el README del paquete):

| id | viewBox | uso |
| --- | --- | --- |
| `insights-logo-positive` / `-negative` | 4008,5 × 1165 | la marca sola, a tinta plena |
| `insights-isotype-positive` / `-negative` | 260 × 890 | la «i» sola |
| `insights-lockup-positive` / `-negative` (tipo `lockup`) | 277,06 × 31,5 | Efeonce 30 · aire 20 · filete 1 × 26 · aire 20 · Insights 31,5, centrados; Insights en gris (`#6b6b6b` en papel, 5,0:1; `#6f89a2` sobre el fondo oscuro `#001a33`, 4,83:1 —sobre navy `#023c70` baja a 3,07:1—) y sólo la esfera en el acento |

Copias del Lab en `apps/lab/public/branding/` (sincronizadas por `apps/lab/scripts/sync-brand-assets.mjs`).

**Reglas** (criterio completo en `efeonce-graphic-line` → `references/criteria.md`, «Insights, marca de producto que
acompaña» y «Junto a Efeonce, Insights baja su brillo»):

- Acompaña a Efeonce con filete fino y alturas de x alineadas; **sin «by efeonce»**; **nunca firma** una pieza (firma
  el logo de Efeonce en el pie).
- Junto a Efeonce, Insights **baja su brillo**: se usa el archivo `insights-lockup-*`; **nunca** se arma el lockup con
  los dos logos sueltos. El logo de Insights solo va a tinta plena.
- Su esfera es parte del logo, no la esfera de la línea; si compite con otra órbita en el mismo acento, se revisa a ojo.
- Tamaño: el ledger sugiere 18 px de cuerpo mínimo para el logo; el lockup no tiene mínimo escrito (gap §7).

**Dónde se aplica hoy (verificado):**

| Superficie | Qué lleva | Dónde |
| --- | --- | --- |
| Informe live en Think (hero) | lockup negativo en pantalla, positivo en impresión | `efeonce-think/src/components/insights/InsightReport.astro:114-115` |
| Think, modo presentación | lockup negativo en la lámina de portada | `InsightReport.astro:363` |
| Think, imagen para compartir | `og-insights.png` | `src/pages/insights/r/[token].astro:75`, `muestra.astro:24` |
| Archivos en Think | copias manuales de 5 SVG + `og-insights.png` | `efeonce-think/public/branding/insights/` (no vienen del paquete) |
| Portadas y aperturas de capítulo del PDF A4 y del deck | versión **tipográfica**: logo Efeonce + filete + «INSIGHTS» en mayúsculas espaciadas (no el archivo oficial) | A4: `report-cover.html`, `report-cover-light.html` (`.brand-product`), mini-lockup del pie de `report-chapter.html`; deck: `insights-cover.html`, `insights-chapter.html` (portada y pie, `.product`) |

**PDF A4 y deck: versión tipográfica, no el archivo oficial.** Las portadas y las aperturas de capítulo componen «logo
Efeonce + filete + INSIGHTS» con la palabra escrita en texto (no con el SVG de la marca). Es **`text-transform:
uppercase` con `letter-spacing: 0.34em`** —mayúsculas espaciadas, no versalitas reales—. Portada A4
`insights-report/report-cover.html` y `report-cover-light.html`: bloque `.brand-lockup`, texto en `.brand-product`
(`report-editorial.css:45-52`: 12 px, peso 500, color `navyAccent` = teal-500), con proporciones propias (logo Efeonce
32 px · aire 16 · filete 1 × 24 al 26 %). Portada del deck `insights-deck/insights-cover.html:34-40` igual (logo 30 px,
filete 1 × 22). Aperturas de capítulo: mini-lockup del pie de `report-chapter.html` (8 px, 0,16 em, `navyMuted`) y
pie de `insights-chapter.html` (9 px, 0,16 em, `navyMuted`). Lo que falta es usar el archivo oficial
`insights-lockup-*`. El pie de las páginas y la contraportada del PDF van con el logo de Efeonce
(`catalogs/insights-*/assets/brand/logo-*.svg`); los pies del deck nombran «Insights · Informe de …» como texto de
edición. **Decisión abierta sobre el acento de esas portadas: §7.7.**

**Dónde NO está** (gaps, sin decisión del operador): el archivo oficial `insights-lockup-*` en PDF y deck (hoy la
versión tipográfica de arriba); correo (`src/emails/InsightsEditionDeliveryEmail.tsx:76`, `brand='efeonce'`); favicon de
Think (genérico, `src/layouts/BaseLayout.astro:64`); receta de deck `content-day-live-results`, cuya ficha de Insights
usa el isotipo de Efeonce (`docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json:4954`;
desde el 2026-09-30 la receta suma un `productMark` **opcional** que admite `insights-lockup-negative` arriba de la
lámina, sin cambiar la ficha; la plantilla todavía no lo dibuja, TASK-1949 Slice 2);
portal y MCP. Greenhouse fijaba `@efeoncepro/axis-brand-assets` 0.3.5 al escribir esto; al 2026-09-29 fija 0.4.5, que
ya trae los archivos de Insights (ninguna de estas superficies los usa todavía).

## 3. Informe PDF (Artifact Composer; en producción, emisión OFF)

**A4 `insights-report`** — 794 × 1123 px (`catalogs/insights-report/registry.json`), 15 plantillas `built`:

| Plantilla | contentType | Para qué |
| --- | --- | --- |
| `ReportCoverPage` | `report-cover` | portada navy (canvas `Premium-Portada`); sin pie ni folio, con eslogan y línea de confidencialidad |
| `ReportCoverLightPage` | `report-cover-light` | portada blanca (`Premium-Portada-Clara` con canales, `-Creativo` sin canales): `scopeLines` + canales; la elige `plan.cover.theme = light` |
| `ReportIndexPage` | `report-index` | índice con folios físicos (el canvas no lo diseñó; hereda el molde en papel) |
| `ReportSummaryPage` | `report-summary` | resumen ejecutivo: tesis, esenciales, decisión |
| `ReportChapterPage` | `report-chapter` | apertura de capítulo: numeral, canales medidos (sólo con `channelId`), contenidos |
| `ReportNarrativePage` | `report-narrative` | capítulo narrado: capitular, afirmación, párrafos, frase clave, evidencia, cierre navy opcional |
| `ReportReadingPage` | `report-reading` | «Nuestra lectura» |
| `ReportTablePage` | `report-table` | tabla de respaldo como tablero de barras: cifra protagonista, ranking, barra desde el dato, procedencia |
| `ReportPlanPage` | `report-plan` | plan de acción |
| `ReportLimitsPage` | `report-limits` | límites numerados y metodología en panel navy |
| `ReportBackCoverPage` | `report-back-cover` | contraportada: contacto, mercados, burbuja URL, redes (desde `src/config/efeonce-brand.ts`) |
| `ReportFigureComparisonPage` | `report-figure-comparison` | comparación de períodos por métrica, cada una en su escala |
| `ReportFigureColumnsPage` | `report-figure-columns` | columnas agrupadas sobre un eje compartido |
| `ReportFigureTargetsPage` | `report-figure-targets` | resultado contra la meta (bullet) |
| `ReportFigureTrendPage` | `report-figure-trend` | tendencia en líneas por rol |

**Deck `insights-deck`** — 1280 × 720, 12 plantillas: `InsightsCoverSlide` (siempre navy), `Summary`, `Chapter`,
`Narrative`, `Reading`, `Plan`, `Limits`, `BackCover` y las cuatro `InsightsFigure{Comparison,Columns,Targets,Trend}Slide`.
**Sin** portada clara (`render/insights-deck-mapper.ts:185`, `light: null`), sin índice y sin tabla.

**Compartidos** `catalogs/insights-shared/`: `figure-svg.ts` (geometría pura de columnas y líneas), `figure-hooks.ts`,
`editorial-resolvers.ts`, `channels.ts`, `layout-hooks.ts`. Roles de color: `brand-packs/axis/editorial-roles.json`
(un color de dato se pide por lo que la serie ES —actual, anterior, oportunidad, ausencia— y por el fondo).

**Familias → página** (`src/lib/efeonce-insights/render/figure-slots.ts`): `bar_grouped` con dimensiones que son
métricas → Comparison; `bar` o `bar_grouped` con canales → Columns; `bullet` → Targets; `line` → Trend. Las otras 11
familias del contrato (`contracts/chart-spec.ts`: `bar_stacked`, `pie`, `donut`, `scatter`, `waterfall`, `funnel`,
`gauge`, `heatmap`, `waffle`, `venn_two`, `upset`) se **rechazan con causa** en el PDF, nunca se dibujan en una
plantilla ajena. Productor real hoy: `bar`, `bar_grouped`, `line`, `bullet` (matriz
`editorial/family-evidence-matrix.ts`, tabla en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §familia ×
evidencia). Capacidad por página: A4 5 métricas / 6 grupos / 6 filas de bullet; deck 4 / 4 / 5 (`FIGURE_CAPACITY`).
El canvas aprobado sí dibujó páginas para las demás familias (`Premium-Apiladas`, `-Cascada`, `-Donut`, …): son
referencia, no plantillas. Pendientes: TASK-1901 (evidencia más rica por familia) y TASK-1902 (páginas de medidor y
mapa de calor), ambas `to-do`.

**Regla de variación** (`editorial-resolvers.ts`, `DELTA_VALUES` / `parseDelta`): el valor llega como
`<dirección>[:<tono>]`. La **dirección** (`up`/`down`/`flat`) es la del valor y decide el triángulo; el **tono**
(`better`/`worse`/`neutral`) dice si el cambio es bueno para esa métrica y decide el color: `better` pinta
`delta--better`, todo lo demás `delta--plain`. Sin tono se lee subir = mejor. Así «▼ 7,6 %» de RpA puede ir en el tono
bueno.

**Portada por cliente o encargo** (`contracts/cover.ts`, `render/cover.ts`): encargo (≠ auto) > organización (≠ auto)
> auto; auto = navy sólo si la organización tiene logo apto para fondo oscuro (`logo_on_dark_asset_id`), si no blanca.
El resultado se **sella** en `plan.cover` al generar (TASK-1888, tabla `insight_cover_preferences`); el render nunca la
decide con datos vivos. Sin logos oscuros cargados, Berel y Sky resuelven portada blanca.

**Contrato de fidelidad:** 41 PNG de referencia en
`docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/` (`Premium-*` A4, `Deck-*`), dirección
`…-direction.md`; `pnpm insights:canvas-fidelity`, ≤ 1 % de píxeles distintos por página. Datos ilustrativos (portada
con «Logo del cliente»). Operación y trampas: `operations.md` § TASK-1889 y `contracts.md` § Render contract.

## 4. Informe live en Think (TASK-1875 complete; producción)

**Modelo.** `InsightWebModelV1` 1.1 (Greenhouse `d45fc780f`, aditivo) sólo en staging; producción sirve 1.0. Think
acepta ambos por una sola puerta, `acceptSharedEdition` (`efeonce-think/src/lib/insights-accept.ts`), que usan por
igual las respuestas reales y los fixtures de desarrollo.

> **Hoy producción entrega el modelo web 1.0:** un enlace real muestra los hallazgos del resumen ejecutivo, los
> capítulos con sus gráficos y el plan, pero sin la decisión (bloque y lámina), sin la apertura ni la lectura paso a
> paso de cada capítulo, sin «Qué mide este informe», sin «Cómo lo mediremos / Qué necesitamos», sin logo del cliente
> y sin tasas del embudo. Eso llega con el modelo 1.1 (en staging) en el próximo release de Greenhouse; la muestra ya
> lo enseña.

**Rutas** (repo `efeonce-think`, un solo render: `src/components/insights/InsightReport.astro`, `mode="shared"` o
`mode="sample"`):
- `src/pages/insights/r/[token].astro` — SSR por request, `private, no-store`, `noindex, nofollow`, `no-referrer`. El
  flag `INSIGHTS_SHARING_ENABLED` (Greenhouse, ON en Production desde 2026-09-28) gobierna **esta** ruta: con el flag
  OFF, Greenhouse responde 404. Logo del cliente en `?logo=1` (404 si no hay) y descargas en `?descargar=` (sólo
  `report_pdf` y `deck_pdf`; si el archivo no está disponible, 303 de vuelta al informe), siempre relativos a la misma
  URL: el token nunca queda en el HTML. `x-vercel-protection-bypass` sólo se envía contra staging.
- `src/pages/insights/muestra.astro` — muestra pública con fixtures, prerender, `noindex`, fuera del sitemap. **Nunca
  llama a Greenhouse** (el flag no la afecta). Organización «Marca de ejemplo», chip «Muestra con datos de ejemplo»,
  aviso en el pie, CTA «Conversemos» → `mailto:sales@efeoncepro.com?subject=Efeonce Insights`, título «Muestra ·
  Efeonce Insights». Muestra además un código ficticio `EO-INS-000123 · versión 2`.

**Código.** `src/components/insights/{InsightReport,ModuleScene,ChartFigure,FactMark}.astro`,
`src/lib/insights-{view,copy,tokens,chart-geometry,fixtures,accept}.ts` + `insights.ts` (cliente server-side),
`src/scripts/insights-report.ts` (interacción y motion), `src/styles/insights.css`.

**Anatomía, en orden (`InsightReport.astro`):**

| # | Sección | Qué hace |
| --- | --- | --- |
| 1 | Hero oscuro (`data-capture="masthead"`) | órbita animada, lockup, chips de estado (enlace vigente + «vence el …», o «Muestra con datos de ejemplo»), kicker (título del informe · período), titular = `executiveSummary[0]` (o `reportTitle`) partido por `splitLead`: cabeza en peso 740 y resto en 340 color `ink-soft`; las demás afirmaciones del resumen como párrafos de bajada; logo del cliente sobre placa blanca cuando `variant = default` (1.1, no en la muestra); meta (organización, edición, datos al); cue hacia `#hallazgos`. Bajo 720 px se ocultan el chip «vence» y el cue |
| 2 | Aviso de período parcial | `role="note"`, sólo si el período está abierto |
| 3 | Topbar fija (`[data-bar]`) | filtros Todo / SEO / Respuestas de IA / Entrega creativa (View Transitions; si el lector está más abajo, vuelve a `#hallazgos`); enlace «Plan» sólo si hay acciones; «Presentar»; copiar enlace; «Descargar» la primera salida disponible. La órbita reaparece chica y marca el avance contando las secciones `[data-section]`. Bajo 720 px las acciones se ocultan |
| 4 | `#hallazgos` «Lo esencial del mes» | tiles (el primero a todo el ancho con cifra en acento) que se expanden en su lugar: conclusión, gráfico oscuro compacto, «Lo que significa» / «Próximo paso», lista de hechos, Fuente, Datos al; botones «Copiar enlace a este hallazgo» y «Cerrar». Enlace directo `#h-<claimId>` abre el hallazgo al cargar. Cifra ausente = «Sin dato», nunca cero. `FactMark`: Medido = anillo sólido, Estimado = punteado. Con 1.0 los tiles salen de las afirmaciones del resumen que citan hechos; con 1.1, de `essentials` |
| 5 | Bloque de decisión (sólo 1.1) | dentro de hallazgos; etiqueta «Para decidir en la reunión»; `splitLead` pone la petición grande (Bricolage 680) y la lectura debajo (Poppins 400); enlace «Plan de acción →» |
| 6 | Un `ModuleScene` por capítulo (`#cap-01`, `#cap-02`…) | apertura del capítulo (1.1); figura principal = la primera con lectura: queda fija y avanza por pasos (cifra, conclusión, significado, próximo paso) observados con `rootMargin` −40 % / −45 %; el resto como beats alternados con la etiqueta de su familia; afirmaciones, hechos sueltos y límites debajo |
| 7 | `#plan` | contador que cuenta; «Cómo lo mediremos» y «Qué necesitamos de ustedes» (1.1); acciones con chip de módulo |
| 8 | `#metodologia` | `<details>` cerrado «Cómo se midió», bajada «Fuentes, cortes y límites de cada cifra.»; dentro: «Qué mide este informe» (`scopeLines`, sólo 1.1), líneas de metodología, «Límites de la edición», «Referencias» |
| 9 | `#conversemos` **o** `#descargas` (una sola fila, alternativas) | `#conversemos`: CTA sólo en la muestra. `#descargas`: sólo en el enlace compartido; las salidas permitidas (`downloadOutputs`) sin `web` |
| 10 | Footer | firma Efeonce, eslogan «Empower your Growth», contacto, aviso del enlace (o de la muestra) y línea legal |
| 11 | Dock, modo presentación y toast | dock sólo ≤ 720 px: «Copiar enlace» + «Descargar» cuando hay descarga; diálogo de presentación; toast «Enlace copiado» (2200 ms) |

**`splitLead`** (`insights-view.ts`): parte en los dos puntos si caen entre los caracteres 12 y 80 y quedan más de 20
después; si no, en la primera oración de 12 a 110 caracteres; si no, todo es cabeza. Nunca reescribe: el texto queda
íntegro vía `joiner`.

**Modo presentación** (diálogo modal): láminas = portada (lockup negativo, kicker, titular en dos pesos, «Preparado
para»), una por hallazgo, decisión (sólo 1.1), plan (primeras 5 acciones), cierre (logo Efeonce + eslogan). Teclas:
flechas, Espacio, Re Pág / Av Pág, Inicio / Fin, Esc; clic en el escenario avanza. Foco atrapado y devuelto al botón al
salir. Pantalla completa sólo ≥ 900 px y sin `prefers-reduced-motion`; salir de pantalla completa cierra la
presentación. Contador «n de t», barra de progreso, pista oculta ≤ 720 px. **No es alcanzable en móvil**: el botón
vive en la topbar, cuyas acciones se ocultan ≤ 720 px.

**Estados** (`[token].astro` + `StatusScreen`): `not_found` 404 (anti-oráculo: desconocido, expirado o flag OFF),
`gone` 410 (revocado o retirado), `rate_limited` 429, `error` 502. 404 y 410 ofrecen contacto. **502** = fallo del
fetch, cualquier no-2xx distinto de 404/410/429 (p. ej. 403 del WAF, 500/503), JSON inválido, major distinto de 1.x o
payload sin `model`/`header` (`acceptSharedEdition`, la misma puerta para fixtures). Las pantallas de estado siempre en
es-CL.

**Gráficos** (`ChartFigure.astro`): dibuja las 15 familias (más que el PDF, que sólo tiene 4 páginas de figura).
Interruptor «Gráfico» / «Tabla» sólo con JS; los grupos de barras son botones con tooltip y `aria-label`; nota
«Barras con origen en cero.»; familia desconocida → nota «Esta figura se lee en su tabla equivalente.»; el embudo
muestra «pasa el X» sólo con `funnelStepRates` (1.1).

**Color de datos** (`insights-tokens.ts`): Think copia sólo 4 roles — actual `#023c70`, anterior `#1f9e94`, actual
sobre navy `#36c8bf`, anterior sobre navy `#8aa8d8`. Oportunidad, ausencia y realce del catálogo PDF **no** existen en
Think: la 3.ª serie en adelante es `color-mix(actual 45 %)` y la ausencia se dibuja con patrón de trama.

**Motion** (`src/scripts/insights-report.ts`, tokens `motion` de `insights-tokens.ts`): la órbita sola ≈ 2,1 s —anillo
350 ms, recorrido 1100 ms tras 200 ms de retardo, halo 800 ms, curva `easeStandard`, todo desde `motion.orbitMs` desde
Think `544ecd4`—; el anillo «en vivo» late 2400 ms en bucle desde los 1600 ms. Al bajar, la órbita se aleja y
reaparece chica en la barra. Entrada del hero 900 ms con retardos 120 / 220 / 360 / 460 ms. Revelados: 33 bloques
`data-reveal` (32 px, 900 ms) y `data-stagger` (24 px, 700 ms, pasos de 70 ms hasta el 6.º hijo); IntersectionObserver
con `threshold` 0,12 y margen inferior −10 %. Cifras que cuentan 1100 ms (easeOutQuart) y terminan exactamente en el
`display` del modelo. Hallazgo que se despliega 520 ms (View Transitions si existe). Entradas de gráficos 800–1400 ms.
`prefers-reduced-motion` apaga toda animación y deja la interacción. Sin JS la página queda completa; si el módulo no
monta en 3 s, el failsafe retira **`ins-motion` e `ins-js`**.

**Responsive, idioma e impresión.** Cortes en 1000 y 720 px. Idioma: sólo el chrome; es-CL por defecto, en-US cuando
`model.locale` empieza por `en`; la muestra siempre es-CL; `og:locale` `es_CL`. **La impresión es sólo un respaldo: el
camino real para papel es el PDF descargable.** `@page` A4 14 mm; oculta topbar, dock, toast, cue, órbita, interruptor
y presentación; las secciones oscuras se repintan en blanco con texto navy; las tablas se muestran; «Cómo se midió» se
fuerza abierto; entran los logos positivos (`.ins-print-only`); la evidencia de los hallazgos **cerrados** no se
imprime.

**Fuentes.** Bricolage Grotesque Variable (opsz) + Poppins 400/500/600/800/800i/900i: 7 archivos, 123 KB.
`BaseLayout` carga además Geist.

**OG y SEO.** `public/branding/insights/og-insights.png` 1200 × 630, sin datos, generado por
`scripts/build-insights-og.mjs`. Canonical `/insights` para la ruta con token y `/insights/muestra` para la muestra.
La ruta con token va sin GTM y con `<meta name="referrer" content="no-referrer">`; **la muestra sí carga GTM a
propósito** (no hay token). El sitemap excluye `/insights/*`.

**Verificación en Think.** `pnpm test:insights` (16 pruebas unitarias), `pnpm verify:insights` (incluye el fixture de
versión 2 ⇒ 502 y la presencia/ausencia de «Qué mide este informe» con 1.1/1.0), `pnpm audit:insights-a11y` (AA y foco
a 1440 y 390). `scripts/capture-insights-report.mjs` regenera el dossier de 34 PNG (no está en `package.json`).
Claves de copy sin uso hoy: `methodologyHeading`, `essentialsTitle`, `backToTop`.

**Guard de rutas públicas (TASK-1876 + excepción TASK-1875).** `/api/public/**` está detrás del rate limit del Firewall
de Vercel (20 req / 10 s por IP; enforce fuera de producción, observe en producción). Think server-side queda
exceptuado **sólo** por la llave explícita `x-efeonce-think-key` (`THINK_SERVER_KEY_HEADER` en
`src/lib/security/public-burst-guard/firewall-rules.ts`), nunca subiendo el límite. Nunca probar límites con ráfagas
concurrentes (ISSUE-174).

**Contratos UI y evidencia** (en Greenhouse): `docs/ui/wireframes/TASK-1875-*.md`, `docs/ui/flows/TASK-1875-*-flow.md`,
`docs/ui/motion/TASK-1875-*-motion.md`, flujo maestro `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`; dossier
`docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/` (34 PNG, 18 desktop + 16 mobile, con fixtures: first-fold,
summary, finding-open, chapter-figure/aeo/ico/table-open, limits, downloads y downloads-unavailable, footer,
partial-first-fold, present-cover/finding (sólo desktop), status-not-found/gone/rate-limited/error) + scorecard
`…think.scorecard.json` (promedio 4,56). Las pantallas de estado usan la primitive de Think `efeonce-think/src/components/primitives/StatusScreen.astro`.

## 5. Otras superficies

- **Correo** `src/emails/InsightsEditionDeliveryEmail.tsx` (TASK-1848): modalidades `portal_link`, `share_link`,
  `attachment`; hoy diseño «funcional y sobrio», marca Efeonce. `INSIGHTS_DELIVERY_ENABLED` OFF en producción.
  **Diseño final aprobado el 2026-09-29, sin implementar:** canvas https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd
  v21 (página «Correo»: enlace en escritorio, en celular y PDF adjunto), dirección sellada
  `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md` (PNG en `…/EFEONCE_EMAIL_MODULES_V1/`). Es **una
  aplicación** de los módulos de correo de Efeonce canonizados en AXIS `v0.3.38` (pie, CTA principal navy, tarjeta de
  agenda, bloque de marca con «Empower your Growth»; `efeonce.email-modules` 0.1.0, `efeonceEmail`, PNG `email-*` de
  `axis-brand-assets` 0.4.6; Lab `https://axis.efeonce.org/references/email/`), no la plantilla. Lo propio de Insights:
  cabecera, «Lo esencial del mes», la órbita de medida (con el camino recorrido desde las 12) y la tarjeta de decisión.
  «Suscribirme» retirado; la agenda va a `/contacto/` con UTM `utm_source=efeonce-insights`. **Propósito (operador,
  2026-09-29):** correo de servicio al cliente, `relationship_transactional`, con la **excepción explícita**
  `efeonce-insights-delivery` que conserva el pie completo (agenda, redes, preferencias y baja «Dejar de recibir estos
  informes»); los demás correos siguen la policy de footer (TASK-1764). El adapter pasa `purpose` y `application` al
  contrato `efeonce.email-modules` `0.2.0` (publicado en `v0.3.39`, commit `1c18a2e`). Pendiente: implementación (TASK-1944; TASK-1849
  cablea los datos de la edición), bump de AXIS a v0.3.39 y la baja funcionando (TASK-1774).
  Si el correo lleva la marca de Insights sigue siendo gap (§7.1).
- **Portal** (TASK-1849, S1–S5 y S7): sólo diseño (`docs/ui/{wireframes,flows,motion}/TASK-1849-*`), sin código.
- **MCP**: ~17 tools (gateway `efeonce-mcp` v1.9.0); sin superficie visual.

## 6. Qué no hacer

- Nunca crear en AXIS componentes o contratos de la UI de Insights mientras la frontera de §1 no cambie por decisión.
- Nunca copiar a mano otro SVG de la marca a un consumidor: sale de `@efeoncepro/axis-brand-assets` (Think ya tiene
  copias manuales; es deuda, no patrón).
- Nunca armar el lockup con los dos logos, ni poner «by efeonce», ni firmar una pieza con Insights.
- Nunca usar datos de un cliente en el Lab, en capturas de referencia ni en fixtures públicos.
- Nunca cambiar por tu cuenta la versión tipográfica de las portadas del PDF/deck por el archivo oficial, ni añadir la
  marca al correo o al favicon: cada uno es una decisión pendiente (§7) y, en los catálogos, pasa por el contrato de
  fidelidad y el gate visual de TASK-1889.

## 7. Gaps abiertos (sin decisión del operador)

1. PDF A4 y deck usan una versión tipográfica («INSIGHTS» en mayúsculas espaciadas junto al logo de Efeonce) en vez
   del archivo oficial `insights-lockup-*`, en portadas y aperturas de capítulo; correo, favicon de Think, portal y MCP
   no llevan la marca. Sin regla escrita para esas superficies ni tamaño mínimo del lockup.
2. *(Cerrado: al 2026-09-29 Greenhouse fija `axis-brand-assets` 0.4.5, que ya trae los archivos de Insights; que
   una superficie los use sigue siendo el gap 1.)*
3. Roles de datos y geometría de gráficos duplicados en dos consumidores; ya produjeron una divergencia de color
   (resuelta en Think `b3c5820`, §1).
4. Drift en AXIS: la tabla del README raíz y `docs/ARCHITECTURE.md` §Official brand files («0.3.0 … 19 SVGs») no
   reflejan `axis-brand-assets` 0.4.0 (25 SVG).
5. *(Cerrado el 2026-09-28: la página del Lab `/references/insights/` se publicó, AXIS main `3dfbf0e`. Se conserva el
   número para no romper las referencias a §7.7.)*
6. Producción sirve el modelo web 1.0: decisión, aperturas y lecturas de capítulo, «Qué mide este informe», «Cómo lo
   mediremos / Qué necesitamos», logo del cliente y tasas del embudo esperan el próximo release de Greenhouse (§4).
7. **Decisión abierta — acento de «INSIGHTS» en las portadas navy del PDF.** En la portada A4
   (`report-editorial.css:51`) y en la del deck (`insights-deck/insights-cover.html:40`) la palabra va pintada en el
   acento (`navyAccent` = teal-500, 12 px) y con proporciones propias (Efeonce 32 px, aire 16, filete 1 × 24 al 26 %).
   Eso choca con la regla del 2026-09-28 (junto a Efeonce, Insights **baja su brillo**; sólo la esfera conserva el
   acento) y con «el acento nunca en texto < 24 px». Pendiente de decisión del operador; cambiarlo toca el contrato de
   fidelidad de TASK-1889 (`pnpm insights:canvas-fidelity`). No lo cambies por tu cuenta.
8. **Láminas de marca que prometen formatos de Insights (deck SEO/AEO, 2026-09-30, TASK-1949).** Las recetas
   `content-report-formats` («¿Cómo te llega? Como la necesites.»: correo, web y celular, presentación destacada, PDF A4
   y deck 16:9) y `content-committee-deck` («¿Y el PPT del comité? Ya está.»: modo presentación, deck, PDF) prometen
   formatos. Estado verificado el 2026-09-30 contra el ledger de flags: web y celular **vivo** (producción sirve el
   modelo 1.0; el 1.1 sale con el próximo release), PDF A4 **vivo**, deck 16:9 **vivo**, modo presentación
   **desplegado** sin probar con una edición real sobre el modelo 1.0, **correo que llega solo NO vivo**
   (`INSIGHTS_DELIVERY_ENABLED` / `INSIGHTS_SCHEDULES_ENABLED` OFF; TASK-1944 bloqueada por TASK-1774). Ningún cliente
   real ha recibido una edición (canaries sobre Greenhouse Demo). La sesión de Insights recomendó rotular
   «próximamente» el correo (y el modo presentación salvo verificación). **Decidido por el operador el 2026-09-30:** las
   láminas van tal cual, sin «próximamente» («Deja esos datos... No marques nada en el deck como provisional, asumo la
   responsabilidad»); el estado de arriba queda como registro. Si cambia el estado de un formato (por ejemplo, se
   enciende el correo), actualízalo aquí y en la norma `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 «Deck SEO/AEO».
