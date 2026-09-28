# Efeonce Insights — marca, informe y UI (cómo se ve y dónde vive)

> Verificado contra código el 2026-09-28 (greenhouse-eo `develop`, efeonce-think `main@7485e32`, AXIS `main@5b3056f`).
> Este archivo describe lo que EXISTE. Donde algo falta, está en §7 «Gaps» y no se decide aquí: esas decisiones son del
> operador.

## 0. Referencia visual en AXIS (empieza aquí si tienes que ver algo)

- **Página del Lab:** `https://axis.efeonce.org/references/insights/` — fuente
  `axis-design-system/apps/lab/src/pages/references/insights.astro`; JSON para agentes
  `https://axis.efeonce.org/references/insights.json` (`…/insights.json.ts`); guía para agentes
  `axis-design-system/docs/agent-composition/insights.md`. Creada el 2026-09-28 en paralelo a este barrido; el Lab se
  publica al llegar a `main` de AXIS, así que confirma que la URL responde antes de citarla como vigente.
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
  referencia de §0. Nada más.
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
| `insights-lockup-positive` / `-negative` (tipo `lockup`) | 277,06 × 31,5 | Efeonce 30 · aire 20 · filete 1 × 26 · aire 20 · Insights 31,5, centrados; Insights en gris (`#6b6b6b` en papel, 5,0:1; `#6f89a2` en navy, 4,83:1) y sólo la esfera en el acento |

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
| Think, modo presentación | lockup negativo en la lámina de portada | `InsightReport.astro:360` |
| Think, imagen para compartir | `og-insights.png` | `src/pages/insights/r/[token].astro:75`, `muestra.astro:24` |
| Archivos en Think | copias manuales de 5 SVG + `og-insights.png` | `efeonce-think/public/branding/insights/` (no vienen del paquete) |
| Portadas PDF A4 y deck, pie del capítulo del deck | versión **tipográfica**: logo Efeonce + filete + «INSIGHTS» en versalitas (no el archivo oficial) | `report-cover.html`, `report-cover-light.html` (`.brand-product`); `insights-cover.html`, `insights-chapter.html` (`.product`) |

**PDF A4 y deck: versión tipográfica, no el archivo oficial.** Las portadas componen «logo Efeonce + filete + INSIGHTS»
con la palabra en **versalitas tipográficas** (no con el SVG de la marca): A4 `insights-report/report-cover.html` y
`report-cover-light.html` (bloque `.brand-lockup`, texto en `.brand-product`, `report-editorial.css:45`, 12 px, tracking
0,34 em, color `navyAccent`); deck `insights-deck/insights-cover.html` y el pie de `insights-chapter.html` (bloque
`.lockup`, texto en `.product`). Lo que falta es usar el archivo oficial `insights-lockup-*`. El pie de las páginas y la
contraportada del PDF van con el logo de Efeonce (`catalogs/insights-*/assets/brand/logo-*.svg`); los pies del deck
nombran «Insights · Informe de …» como texto de edición.

**Dónde NO está** (gaps, sin decisión del operador): el archivo oficial `insights-lockup-*` en PDF y deck (hoy la
versión tipográfica de arriba); correo (`src/emails/InsightsEditionDeliveryEmail.tsx:76`, `brand='efeonce'`); favicon de
Think (genérico, `src/layouts/BaseLayout.astro:64`); receta de deck `content-day-live-results`, cuya ficha de Insights
usa el isotipo de Efeonce (`docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json:4954`);
portal y MCP. Y **Greenhouse fija `@efeoncepro/axis-brand-assets` 0.3.5** (`package.json:418`): no trae los archivos de
Insights hasta que alguien suba la versión.

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
acepta ambos por una sola puerta (`efeonce-think/src/lib/insights-accept.ts`); un major no soportado ⇒ 502 sin datos.

**Rutas** (repo `efeonce-think`):
- `src/pages/insights/r/[token].astro` — SSR, `private, no-store`, `noindex`, `no-referrer`; logo del cliente en
  `?logo=1` y descargas en `?descargar=<output>`, relativos a la misma URL (el token nunca queda en el HTML).
- `src/pages/insights/muestra.astro` — muestra pública con fixtures (marca ficticia, aviso en hero y pie), prerender,
  `noindex`, fuera del sitemap. `INSIGHTS_SHARING_ENABLED` ON en Vercel Production de Greenhouse.

**Código.** `src/components/insights/{InsightReport,ModuleScene,ChartFigure,FactMark}.astro`,
`src/lib/insights-{view,copy,tokens,chart-geometry,fixtures,accept}.ts` + `insights.ts` (cliente server-side),
`src/scripts/insights-report.ts` (interacción y motion), `src/styles/insights.css`.

**Anatomía — 12 secciones, en orden (`InsightReport.astro`):**

| # | Sección | Qué hace |
| --- | --- | --- |
| 1 | Hero oscuro (`data-capture="masthead"`) | órbita animada, lockup, chips de estado (enlace activo + vence, o «muestra»), kicker (informe · período), titular en dos pesos, logo del cliente (si hay y no es muestra), meta (organización, edición, datos al), cue hacia hallazgos |
| 2 | Aviso de período parcial | `role="note"`, sólo si el período está incompleto |
| 3 | Topbar fija | filtros por módulo, enlace al plan, presentar, copiar enlace, descargar; la órbita reaparece chica y marca el avance |
| 4 | `#hallazgos` | tiles que se expanden en su lugar: evidencia, lectura (significado, próximo paso), hecho y fecha, copiar enlace del hallazgo |
| 5 | Bloque de decisión | dentro de hallazgos |
| 6 | Un `ModuleScene` por capítulo (`#cap-N`) | el gráfico principal queda fijo y avanza por pasos (cifra, conclusión, significado, próximo paso); debajo, el resto compacto |
| 7 | `#plan` | contador que cuenta y acciones con chip de módulo |
| 8 | `#metodologia` | límites y referencias |
| 9 | `#conversemos` | CTA sólo en la muestra |
| 10 | `#descargas` | salidas permitidas por el enlace (`downloadOutputs`) |
| 11 | Footer | firma Efeonce, eslogan «Empower your Growth», contacto, aviso del enlace y línea legal |
| 12 | Dock, modo presentación y toast | dock para copiar enlace; diálogo modal con láminas (portada, hallazgos, decisión, plan, cierre; flechas y Esc); toast «enlace copiado» |

**Estados** (`[token].astro` + `StatusScreen`): `not_found` 404 (anti-oráculo: desconocido, expirado, flag OFF),
`gone` 410 (revocado o retirado), `rate_limited` 429, `error` 502. 404 y 410 ofrecen contacto.

**Gráficos.** `ChartFigure.astro` dibuja las 15 familias (más que el PDF, que sólo tiene 4 páginas de figura).

**Motion** (`src/scripts/insights-report.ts:1-14`, `src/lib/insights-tokens.ts` `motion`): la órbita sola en 2,0 s
(anillo 350 ms, recorrido 1100 ms con 200 de retardo, halo 800 ms); al bajar, se aleja y reaparece chica en la barra;
cifras que cuentan y terminan exactamente en el `display` del modelo; View Transitions al expandir un hallazgo;
IntersectionObserver para la barra y las escenas. `prefers-reduced-motion` apaga toda animación y deja la interacción.
Sin JS la página queda completa; si el script no monta en 3 s, un failsafe retira las clases de motion.

**Responsive e impresión.** Cortes en 1000 y 720 px; bloque `@media print` propio (lockup positivo, `transition` y
`animation` en none). Idiomas es-CL y en-US.

**Guard de rutas públicas (TASK-1876 + excepción TASK-1875).** `/api/public/**` está detrás del rate limit del Firewall
de Vercel (20 req / 10 s por IP). Think server-side queda exceptuado **sólo** por la llave explícita
`x-efeonce-think-key` (`THINK_SERVER_KEY_HEADER` en `src/lib/security/public-burst-guard/firewall-rules.ts`), nunca
subiendo el límite. Nunca probar límites con ráfagas concurrentes (ISSUE-174).

**Contratos UI y evidencia** (en Greenhouse): `docs/ui/wireframes/TASK-1875-*.md`, `docs/ui/flows/TASK-1875-*-flow.md`,
`docs/ui/motion/TASK-1875-*-motion.md`, flujo maestro `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`; dossier
`docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/` (34 PNG, 18 desktop + 16 mobile, con fixtures: first-fold,
summary, finding-open, chapter-figure/aeo/ico/table-open, limits, downloads y downloads-unavailable, footer,
partial-first-fold, present-cover/finding (sólo desktop), status-not-found/gone/rate-limited/error) + scorecard
`…think.scorecard.json` (promedio 4,56). Las pantallas de estado usan la primitive de Think `efeonce-think/src/components/primitives/StatusScreen.astro`.

## 5. Otras superficies

- **Correo** `src/emails/InsightsEditionDeliveryEmail.tsx` (TASK-1848): modalidades `portal_link`, `share_link`,
  `attachment`; diseño «funcional y sobrio», marca Efeonce; la presentación final queda para TASK-1849.
  `INSIGHTS_DELIVERY_ENABLED` OFF en producción.
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

1. PDF A4 y deck usan una versión tipográfica («INSIGHTS» en versalitas junto al logo de Efeonce) en vez del
   archivo oficial `insights-lockup-*`; correo, favicon de Think, portal y MCP no llevan la marca. Sin regla escrita para
   esas superficies ni tamaño mínimo del lockup.
2. Greenhouse fija `axis-brand-assets` 0.3.5; los archivos de Insights llegan desde 0.4.0.
3. `docs/operations/brand-graphic-line/**` y `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` no mencionan
   la marca de Insights; el OG y el favicon no están documentados.
4. Roles de datos y geometría de gráficos duplicados en dos consumidores; ya produjeron una divergencia de color (resuelta en Think, §1).
5. Doc funcional `docs/documentation/insights/efeonce-insights-dominio-ediciones.md:26` dice «Todavía no existe la vista
   web» (contradice sus líneas 16-20); el flujo maestro EPIC-045 aún marca S6 «sin desplegar» y TASK-1875 in-progress.
6. Drift en AXIS: la tabla del README raíz y `docs/ARCHITECTURE.md` §Official brand files («0.3.0 … 19 SVGs») no
   reflejan `axis-brand-assets` 0.4.0 (25 SVG).
