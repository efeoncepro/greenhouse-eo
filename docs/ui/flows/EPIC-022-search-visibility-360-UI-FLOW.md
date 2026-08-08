# EPIC-022 — Search Visibility 360 · Master UI Flow Contract

> **Qué es:** el contrato de flujo **cross-surface** de TODO el módulo SEO (`growth.seo`) y su convergencia con el AEO Grader (`growth.ai_visibility`) bajo la narrativa de producto **Search Visibility 360**. Conecta cada UI que existe o se va a crear — operador (cockpit denso), cliente (dashboard self-service), report artifact (imprimible/PDF), y los cross-links recíprocos SEO↔AEO — en un solo mapa de navegación, estados y commands.
> **Esto NO reemplaza** los flow/wireframe por-task; es la **tela conectiva** que garantiza que todas las superficies son nodos de un mismo sistema, no pantallas sueltas. Cada task UI del epic referencia este doc en su `## Delta`.
> **Hermano:** `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` (el motor AEO). Este doc es su espejo estructural para el motor SEO + el punto donde ambos se cruzan (§7 Search Visibility 360).

## Meta

- Status: `draft`
- Epic: `EPIC-022` (Search Visibility 360 · dominio `growth.seo`, hermano de `growth.ai_visibility`)
- Arquitectura fuente: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§10 IA/superficies, §2 matriz 360, §3 capacidades, §5 rank tracking, §7 primitives, §10.4 dataviz)
- Skills de product design aplicadas: `info-architecture` (líder — IA + flujo cross-surface + routing), `state-design` (12 estados + honest degradation medido/estimado + Locked/upsell), `greenhouse-ux-writing` (copy es-CL tuteo, tono operador vs cliente), `modern-ui` (wayfinding, active state, restraint, product-vs-marketing), `dataviz-design` (Y invertido de posición, quadrant 2×2, honestidad medido ● vs estimado ◑)
- Tasks UI conectadas: TASK-1306 (Overview operador), TASK-1307 (★ Rank & URL performance), TASK-1308 (Keyword opportunities), TASK-1309 (Site audit), TASK-1310 (Cliente + Report Artifact + quadrant 360), TASK-1660 (lente Objetivos) y TASK-1665 (lente Descubrir)
- Tasks backend que alimentan las superficies: TASK-1299 (schema), TASK-1300 (DataForSEO family registry), TASK-1301 (capabilities `growth.seo.*` + `enforceSeoRunEntitlement`), TASK-1302 (GSC daily + `readKeywordOpportunities`), TASK-1303 (rank capture + `readRankEvolution`), TASK-1304 (site audit + backlink), TASK-1305 (`readSeoAeoGap`), TASK-1659 (`target` intent), TASK-1661 (market data), TASK-1664 (discovery) y TASK-1666 (SEO → grounded queries)
- Flow files por-task: `TASK-1310-growth-seo-client-dashboard-report-artifact-flow.md`, `TASK-1660-growth-seo-keyword-targets-flow.md` y `TASK-1665-growth-seo-keyword-discovery-workbench-flow.md` (+ wireframes/directions 1308/1309/1310/1660/1665)

---

## 1. La espina dorsal: un motor de datos, muchos readers, tres audiencias de render

El módulo SEO se apoya en **una sola fuente de configuración + serie temporal** (`greenhouse_growth.seo_*`, arch §4): PG es SoT de config + ventana caliente ~180d, BQ es SoT de la historia larga. De ahí, **readers gobernados** (arch §7, Full API Parity) proyectan shape + latencia, y las superficies son **clientes** de esos readers — nunca pegan live-per-view a DataForSEO en el render (arch §1.1 boundary duro).

| Reader (arch §7) | Qué proyecta | Superficie que lo consume | Task backend |
|---|---|---|---|
| ~~`readRankSnapshotLatest(targetId)`~~ **NO EXISTE** (corrección 2026-08-07, TASK-1306) | ~~standings + WoW delta~~ — los movers WoW de S1 se **derivan** de `readRankEvolution` (último punto medido vs el más cercano a 7 días atrás, umbral ≥5 posiciones) | Overview operador (S1) | — |
| `listSeoEligibleSpaces()` · `readSeoOverviewConnection(orgId)` · `readSeoOverviewKpis(orgId, rangeDays)` · `readSeoOverviewSidebar(orgId)` | Space picker · estado de la fuente medida (`connected`/`not_connected`/`no_snapshots`) · KPIs norte + serie · sidebar salud/movers/cruce (degradación **por región**) | Overview operador (S1) | 1306 |
| `readRankEvolution(targetId, {keywords?, range, engine, device})` | series temporales por URL/keyword (Y=posición) | ★ Rank performance (S2), Cliente dashboard (S5) | 1303 |
| `readKeywordOpportunities(targetId)` | join SEO↔GSC (striking-distance 8–20 × volumen/dificultad) | Keyword opportunities (S3) | 1302 |
| `readKeywordTargets(targetId, filters?)` | objetivos declarados, autoría, primera medición posterior y trayectoria contra compromiso | Lente Objetivos dentro de S3 | 1660 |
| `readKeywordDiscovery({targetId, runId?, filters?, cursor?})` | runs/candidates bounded, procedencia, as-of, mercado estimado, estados y acciones por candidate | Lente Descubrir dentro de S3; Nexa/ecosystem/MCP | 1664 |
| `readSiteAuditReport(targetId, auditRunId?)` | health + findings por severidad | Site audit (S4) | 1304 |
| `readBacklinkProfile(targetId, {range})` | perfil de enlaces | Overview operador (soporte) | 1304 |
| `readSeoAeoGap(targetId)` | **derived read cross-módulo** (`seo_rank_snapshots` × `grader_scores`) | Quadrant 360 (S6), report artifact (S7) | 1305 |

**Regla de oro (arch §1.1):** el cruce SEO↔AEO se expone SIEMPRE como *derived read* (`readSeoAeoGap`), NUNCA como tabla compartida ni FK cross-motor. Rankear #1 y ser citado 0× por las IA es una **señal**, no un bug a reconciliar.

**Contrato de honestidad de fuente (arch §5, §10.5) — atraviesa TODAS las superficies:** cada dato se marca **medido (●, GSC = verdad de primera parte)** vs **estimado (◑, DataForSEO = mercado/competidores)** con una leyenda persistente; nunca se promedian. Latencia explícita ("GSC: datos hasta hace 2 días"). Cuota agotada → banner honesto + degrada a GSC medido. Fallo parcial → `observeAndDegrade`, mostrar lo que llegó, marcar el resto "Pendiente" con razón — **nunca ceros fantasma**.

---

## 2. Actores y resolución de superficie por entitlement (per-org, NUNCA por rol)

La superficie que ve una persona **se deriva de su acceso per-org vía `module_assignments`** (arch §9, lección TASK-1248), no de su rol. Las **4 puertas** comparten el chokepoint único `enforceSeoRunEntitlement` (con quota cap por-org = gate de costo DataForSEO):

| Actor | Contexto | Puerta / capability | Superficie resultante |
|---|---|---|---|
| **Operador Efeonce** (Growth/AM) | interno | `growth.seo.observation.read` + `growth.seo.audit.run` + `growth.seo.target.configure` | Cockpit denso multi-Space: Overview (S1) · Rank performance (S2) · Keywords (S3) · Site audit (S4) |
| **Operador admin** | interno | `growth.seo.entitlement.manage` | Grantea acceso per-org (fuera del scope UI de este epic) |
| **Cliente contratado** (Grupo Berel) | portal | `module_assignment=active` → `growth.seo.observation.read` + `growth.seo.report.read_client` | Dashboard self-service mono-Space (S5) · Report artifact (S7) · Quadrant 360 (S6) |
| **Cliente sin SEO / trial** | portal | sin assignment / `trial` (quota cap) | Locked/teaser → upsell (reusa patrón EPIC-020 S6; diferido a follow-up de este epic) |
| **Público** (diferido) | sitio | quick-check rate-limited de 1 dominio (patrón `public-submission` + `grader_leads`) | "SEO quick check" (foto puntual, sin histórico) — **diferido**, fuera del scope de las tasks 1306–1310 |

En S3, leer oportunidades y discovery requiere `growth.seo.observation.read` + `seo_v1`; declarar
objetivos, iniciar discovery o ejecutar una acción sobre un candidate requiere además
`growth.seo.target.configure`, presupuesto/cupo vigente y confirmación explícita. Un operador con sólo
lectura puede revisar runs ya materializados, pero nunca iniciar una llamada Labs ni convertir un
candidate en tracking.

**Máquina de estado maestra (state-design):** `entitlement per-org → surface`. La misma ruta cliente `/growth/seo` resuelve a dashboard completo (contratado) o Locked/teaser (sin assignment) — nunca se decide en cliente; siempre server-side. El histórico temporal vive SOLO detrás de la puerta contratada; el público (cuando exista) es siempre una **foto** puntual (arch §11 packaging).

---

## 3. Inventario de superficies (todos los nodos SEO + los puntos de cruce AEO)

| # | Superficie | Ruta / canal | Route group | Actor | Estado | Task |
|---|---|---|---|---|---|---|
| S1 | **SEO Overview** (cockpit denso multi-Space) | `/admin/growth/seo` | internal | operador | **implementada** (2026-08-06, code complete en `develop`) | 1306 |
| S2 | **★ Rank & URL performance over time** (pantalla ancla) | `/admin/growth/seo/performance` | internal | operador | **implementada** (2026-08-07) | 1307 |
| S3 | **Keywords: Oportunidades · Objetivos · Descubrir** | `/admin/growth/seo/keywords` | internal | operador | Oportunidades implementada (2026-08-07); Objetivos y Descubrir planificadas dentro de la misma ruta | 1308 + 1660 + 1665 |
| S4 | **Site audit** (+ drill `/[issueGroup]`) | `/admin/growth/seo/audit` | internal | operador | a crear | 1309 |
| S5 | **Cliente SEO dashboard** (self-service mono-Space) | `/growth/seo` | client | cliente contratado | a crear | 1310 |
| S6 | **Quadrant 360 SEO×AEO** (cruce, en S5 y en report) | `/growth/seo` + report | client | cliente | a crear | 1310 |
| S7 | **Report Artifact SEO** (web + print/PDF) | `/growth/seo/report` | client | cliente | a crear | 1310 |
| X1 | **AEO Grader** (motor hermano, cross-link recíproco) | `/aeo` (cliente) · `/admin/growth/ai-visibility` (operador) | client/internal | ambos | hecho | EPIC-020 |
| X2 | **Report Artifact AEO** (mismo `ReportArtifactModel`, mirror) | web/print/pdf | — | ambos | hecho | 1252/1273 |

**Sección local "Search Visibility" (arch §10.1, info-architecture):** `Growth` sigue siendo dominio raíz. Dentro, la sección local **"Search Visibility"** agrupa dos motores hermanos: **SEO** (nuevo) + **AEO Grader** (existente, intacto). Toda `page.tsx` nueva → `route-reachability-manifest.ts` (TASK-982) + key en `GH_INTERNAL_NAV` (`greenhouse-nomenclature.ts`, SoT que consume `VerticalMenu` — lección TASK-1247, la key SOLO en navigation-copy.ts revienta 500 en todo el dashboard).

**S1 es el dueño del shell — vigente desde 2026-08-06 (TASK-1306).** El conmutador de la sección vive en `src/views/greenhouse/admin/growth/seo/overview/SeoSearchVisibilityTabs.tsx` y ya declara las 4 tabs. **S2/S3/S4 no construyen navegación local: la heredan.** Contrato para las tres:

- **Activación = quitar `available: false`** de la entrada correspondiente en `TABS`. Un cambio de una línea, no un refactor. Mientras tanto el tab se ve deshabilitado con el motivo visible (`aria-disabled` + `title`), porque un tab que navega a un 404 es peor que un tab apagado.
- **Cada tab es una RUTA propia** navegada con `next/link` (no un `TabPanel` en memoria): el "panel" es la página que monta Next. Por eso el deep-link, el back/forward y el enlace compartible funcionan sin código extra. El contenedor declara `role='navigation'` (no `tablist`) porque sus hijos son links, no controles de panel.
- **Un solo viewCode para las 4 rutas** (`administracion.growth_seo`, ya sembrado) y **un solo ítem de menú** (`/admin/growth/seo`). S2/S3/S4 son child routes: **NO** siembran viewCode ni suman nav, pero **SÍ** van a `route-reachability-manifest.ts` con `parent: '/admin/growth/seo'` + `via: 'tab'` + `reason`.
- **El `?space=` se propaga solo** entre tabs (`withSpace`), para no perder el contexto de Space al navegar. Ese query param es compartible pero no es autoridad: el server valida el assignment vigente y cae al primer Space elegible si no calza.

**S3 tiene lentes de contenido, no tabs nuevas de la sección local:** `Oportunidades` es la vista
por defecto entregada por TASK-1308; `Objetivos` es el carril de intención declarada de TASK-1660;
`Descubrir` es el workbench diario de TASK-1665. Las tres viven dentro de
`/admin/growth/seo/keywords`, reutilizan el mismo viewCode, Space/target context, breadcrumb y
`WorkbenchHeader`; ninguna agrega un quinto tab a `SeoSearchVisibilityTabs`, un ítem de menú o una
ruta `/discovery`.

---

## 4. Wayfinding, IA y URL scheme (info-architecture)

**Los 4 sistemas de navegación coexisten (Rosenfeld & Morville):**

- **Global:** menú lateral `Growth` → sección local "Search Visibility" → SEO · AEO Grader. Active state obligatorio en el ítem vigente (`aria-current="page"`).
- **Local:** dentro de SEO, tabs/sub-nav operador: Overview · Rank performance · Keywords · Auditoría. Dentro de Keywords, la sub-navegación de contenido es Oportunidades · Objetivos · Descubrir. Breadcrumb `Growth / Search Visibility / SEO / <sección>`.
- **Contextual:** cross-link recíproco SEO↔AEO (§7); "Ver keywords de esta URL" desde el rank chart; "Ver auditoría del grupo" desde un finding.
- **Supplemental:** `DebouncedInput` de búsqueda de keyword (S3), Space picker (`Space ▾`) presente en toda ruta operador multi-Space.

**URL scheme (arch §10.1 + info-architecture — estado en query params, deep-linkable):**

```text
Operador (internal):
/admin/growth/seo                              Overview
/admin/growth/seo/performance                  ★ Rank & URL performance
/admin/growth/seo/performance?urls=…&keywords=…&range=90d&engine=google&device=desktop
/admin/growth/seo/keywords                     Keyword opportunities (lente Oportunidades, vista por defecto)
/admin/growth/seo/keywords?space=…&window=28|90&q=…&action=quickWin|striking|cannibalized&position=firstPage|secondPage
   (vigente desde 2026-08-07 — `intent`/`maxDiff` no existen: no hay fuente de intención ni de dificultad)
/admin/growth/seo/keywords?space=…&view=targets     Lente Objetivos (TASK-1660)
/admin/growth/seo/keywords?space=…&view=discovery&discoveryRun=…&q=…&source=…&intent=…&state=…&minVolume=…&maxDifficulty=…
   (lente Descubrir: `view=discovery` es la única selección de lente; `discoveryRun` y filtros son query state allowlisted)
/admin/growth/seo/audit                        Site audit
/admin/growth/seo/audit?issueGroup=indexability   drill del grupo (query param, no segmento dinámico extra)

Cliente (client):
/growth/seo                                    Dashboard self-service mono-Space
/growth/seo?view=quadrant                      quadrant 360 en foco (mismo dashboard)
/growth/seo/report                             Report artifact (web) + acción print/PDF
```

**Regla de wayfinding (los 5):** en cualquier ruta el usuario sabe *dónde está* (breadcrumb + título + active nav), *a dónde puede ir* (sub-nav + cross-link AEO), *cómo volver* (browser back + breadcrumb), *qué hay alrededor* (Space picker, related URLs), *qué acaba de pasar* (toast/feedback tras "Seguir keyword" / "Descubrir keywords" / preparar draft / re-grade). El `?issueGroup=` del site audit y `view=discovery` de S3 son query params allowlisted (no segmentos dinámicos ni rutas paralelas) para mantener el back button, el deep-link y la compartibilidad simples.

---

## 5. Las journeys cross-surface (el detalle)

### Journey A — Operador cockpit (denso, multi-Space, datos crudos + acciones)

```text
Login interno → nav Growth → Search Visibility → SEO
  → S1 Overview (Space ▾ selecciona target): visibility score + top-3/top-10 + WoW movers + salud + backlinks (soporte)
  → S2 ★ Rank & URL performance: line multi-serie (Y invertido), set seleccionable persistido en ?urls=/?keywords=
        └─ contextual: "Ver keywords de esta URL" → S3
  → S3 Keywords: sub-navegación Oportunidades · Objetivos · Descubrir
        ├─ Oportunidades: veredicto (leyenda+filtro) + scatter medido (posición×impresiones) + tabla
        │      → acciones gobernadas "Seguir" / "Dejar de seguir" (trackKeywords / untrackKeywords)
        ├─ Objetivos: declaración explícita + trayectoria contra la primera medición posterior
        │      → trackKeywords(intent=target) / readKeywordTargets
        ├─ Descubrir: seeds → preview de costo → confirmación → corrida async → candidates
        │      → "Declarar objetivo" / "Seguir oportunidad" / "Preparar grounded queries" / "Descartar"
        │      → queueKeywordDiscovery / readKeywordDiscovery / recordKeywordDiscoveryAction
        └─ contextual: click en keyword/candidate → S2 con esa serie aislada (?keywords=)
  → S4 Site audit: health KPIs + issues por impacto×esfuerzo → drill /[issueGroup] con URLs afectadas
        └─ acción gobernada "Correr auditoría" (queueSiteAudit, async OnPage)
```
- **Estados globales (state-design):** default · loading (skeleton) · empty (target sin snapshots aún: "Aún no hay datos de rank / sin auditoría reciente" + CTA) · degraded (medido ● + estimado ◑, cuota agotada → banner) · permission (sin `observation.read`).
- **Estados propios de Descubrir:** disabled (flag OFF) · permission · empty (sin seeds/runs) · preview-ready · queued · running · succeeded · partial · no-results · budget-blocked · provider-error · stale. Cada corrida conserva `runId`, costo real/estimado, as-of y outcome por endpoint; nunca se muestra un candidate optimista antes del reader.
- **Estados propios de una acción:** action-confirmation → action-pending → action-success | action-partial | action-error. `candidate → tracked` sólo después del outcome de `trackKeywords`; `draft-created → active` está prohibido en la misma acción.
- **Acciones = commands gobernados (Full API Parity, arch §7):** `trackKeywords`/`untrackKeywords` (S3), `queueKeywordDiscovery`/`readKeywordDiscovery`/`recordKeywordDiscoveryAction` (S3 Descubrir), `createGroundedQueryDraft` (S3 → review AEO), `queueSiteAudit` (S4), `configureSeoTarget`. El LLM/Nexa opera lo mismo por construcción (`propose → confirm → execute`); ningún consumer lee tablas ni llama DataForSEO desde el render.

### Journey B — Cliente contratado self-service (curado, honesto, mono-Space)

```text
Login portal → nav módulo SEO (gateado por module_assignment=active + report.read_client, arch §9)
  → S5 /growth/seo dashboard mono-Space (SU dominio): visibility + top URLs + evolución (readRankEvolution) + oportunidades curadas
  → S6 quadrant 360 SEO×AEO (readSeoAeoGap): dónde está la marca (dominante/riesgo/oportunidad/invisible)
        └─ cross-link recíproco → X1 /aeo (¿te cita la IA?)
  → S7 /growth/seo/report report artifact (web) → acción "Descargar PDF" / print
```
- **Curación cliente (arch §10.2):** el cliente ve SU Space, sin datos crudos de operador (no ve provider_cost, no ve competidores por nombre salvo lo que el report expone público-safe, no ve acciones de configuración).
- **Wayfinding:** breadcrumb "Inicio / SEO"; título "SEO — Visibilidad en búsqueda"; active state.

### Journey C — Cross-sell operador → cliente (comercial, arch §11)

```text
Operador corre SEO snapshot como insight outbound (S1/S2, gráfico URLs 8→3 = conversación de renovación)
  → evidencia de visibilidad cayendo alimenta is_at_risk / ICO (riesgo churn + candidato expansión)
  → expand a Search Visibility 360 en Active Accounts (land AEO lead magnet → cross-sell SEO)
```
- Este journey es **comercial/operativo**, no una superficie UI nueva de este epic; se documenta acá para que las superficies operador (S1/S2) se diseñen sabiendo que su output es material de conversación de renovación (el gráfico de URLs es el gancho).

---

## 6. Command map (Full API Parity → Nexa/MCP por construcción, arch §7)

Toda acción visible mapea a un command gobernado server-side (capability-gated, audited, outbox). La UI es cliente del primitive, igual que Nexa/MCP — no una segunda implementación.

| Acción visible | Command | Capability | Superficie |
|---|---|---|---|
| Configurar target/keywords/competidores | `configureSeoTarget` / `trackKeywords` / `setBacklinkTracking` | `growth.seo.target.configure` | S1, S3 |
| "Seguir" keyword (agregar al set monitoreado) | `trackKeywords(keywordSetId, [kw], actor)` | `growth.seo.target.configure` | S3 |
| "Dejar de seguir" (cerrar la ventana de seguimiento) | `untrackKeywords(seoTargetId, [kw], actor)` — append-only, cierra con `clock_timestamp()`; **nunca borra** | `growth.seo.target.configure` | S3 |
| "Descubrir keywords" (crear corrida) | `queueKeywordDiscovery(input)` → `pending` + outbox; el worker ejecuta Labs tras el preview/fence | `growth.seo.target.configure` + `enforceSeoRunEntitlement` | S3 · Descubrir |
| Leer corrida/candidates | `readKeywordDiscovery({runId?, filters?, cursor?})` | `growth.seo.observation.read` | S3 · Descubrir · Nexa · ecosystem · MCP |
| Acción sobre candidate | `recordKeywordDiscoveryAction(candidateId, action)` — append-only; no tracking implícito | `growth.seo.target.configure` | S3 · Descubrir |
| "Preparar grounded queries" | `createGroundedQueryDraft({discoveryRunId, candidateIds, ...})` → draft AEO; no approve/active/run | `growth.seo.observation.read` + `growth.ai_visibility.prompt_set.manage` | S3 → review AEO |
| "Correr auditoría" | `queueSiteAudit(targetId, actor)` (async OnPage) | `growth.seo.audit.run` | S4 |
| Leer rank / keywords / audit / gap | readers (§1) | `growth.seo.observation.read` | S1–S6 |
| Leer report cliente | `readSeoAeoGap` + `readRankEvolution` → `ReportArtifactModel` | `growth.seo.report.read_client` | S5, S7 |

**Writes:** `propose → confirm → execute` — el LLM nunca escribe directo, muta sólo en el endpoint de confirmación humana. Reads directos.

**Discovery parity:** `queueKeywordDiscovery` sólo crea la corrida/outbox en Vercel; el browser nunca
conoce credenciales ni llama Labs. `ops-worker` ejecuta los endpoints allowlisted mediante el transporte
DataForSEO canónico, con preview, límite, entitlement, spend ledger y degradación honesta. El mismo
`readKeywordDiscovery` sirve app, Nexa, ecosystem y MCP; `get_seo_keyword_discovery` es read y
`discover_seo_keywords` es write interno bajo `efeonce.mcp.seo.write`. Ninguna respuesta de discovery
inserta `seo_keyword_set_members` sin la acción posterior y explícita `trackKeywords`.

---

## 7. El cruce: Search Visibility 360 (SEO ↔ AEO)

El diferenciador de categoría (arch §2, §11): **los dos internets de búsqueda en un panel**. Se materializa en dos superficies del nodo TASK-1310 (S6 + S7) y en cross-links recíprocos contextuales:

**Matriz mental 360 (arch §2.1, dataviz-design — quadrant scatter 2×2):**

```text
              posición SEO alta (Y↑ = rankeas)
                        │
   riesgo               │           dominante
   (rankeas, IA no cita)│   (rankeas + IA cita)
   ──────────────────── ┼ ──────────────────── citabilidad IA (X→)
   invisible            │           oportunidad rara
   (ambos bajos)        │   (IA cita, no rankeas)
                        │
              posición SEO baja
```

- **X = citabilidad IA** (del `grader_scores` vía `readSeoAeoGap`), **Y = posición SEO** (del `seo_rank_snapshots`). NUNCA se promedian (arch §1.1); el quadrant los muestra ortogonales.
- **Cross-link recíproco:** desde S5/S6 (cliente SEO) → "¿Te cita la IA? Ver AEO" → X1 `/aeo`. Desde `/aeo` (cliente AEO) → "¿Dónde rankeas? Ver SEO" → S5. Ambos usan el CTA de marca correcto (si el CTA invoca Nexa, Nexa Mark + Shiny Button navy; si es cross-link inter-módulo, chip/link contextual neutro).
- **Report artifact SEO (S7) = 3.er render adapter del MISMO `ReportArtifactModel`** que el AEO (TASK-1252), **NO forkea** el scoring ni las charts. La diferencia es disclosure + chrome, nunca el contenido base (regla de oro EPIC-020 §1).

**Puente operador SEO → AEO grounded:** desde el drawer de un candidate en S3/Descubrir, el
operador puede seleccionar hasta 20 candidates y elegir `Preparar grounded queries`. Esa acción llama
`createGroundedQueryDraft` de `TASK-1666`, entrega contexto de investigación como dato no confiable y
conserva `seo.discovery.run:<uuid>`, `seo.discovery.candidate:<uuid>` y
`seo.discovery.context:<sha256-hex>` en el draft AEO. El resultado es siempre `draft` para review; no
aprueba, no activa, no ejecuta el grader y no afirma que una grounded query sea una keyword exacta.
El SoT sigue siendo `grader_prompt_sets`; no se crea tabla, FK ni JOIN SEO↔AEO. `TASK-1311` puede
atribuir citas sólo después de que exista un prompt aprobado y una observación del grader.

---

## 8. Estados globales del programa (state-design — atraviesan todas las superficies)

| Estado | Cuándo | UI honesta |
|---|---|---|
| **Sin conexión GSC** | org sin OAuth GSC | `EmptyState` accionable + CTA OAuth (nunca ceros fantasma) |
| **Medido vs estimado** | siempre | ● GSC (primera parte) / ◑ DataForSEO (mercado) con leyenda persistente; nunca promediados |
| **Latencia explícita** | siempre | "GSC: datos hasta hace 2 días" |
| **Cuota agotada** | budget DataForSEO por-org excedido | banner honesto + degrada a GSC medido (no rompe la vista) |
| **Fallo parcial** | un reader/familia falla | `observeAndDegrade`: mostrar lo que llegó, marcar el resto "Pendiente" con razón |
| **Sin target / sin snapshots** | target recién creado | empty accionable: "Aún no hay datos de rank" / "Sin auditoría reciente" + CTA |
| **Discovery sin configuración** | S3/Descubrir sin seed o método | builder visible, preview incompleta y CTA disabled con razón; no se llama provider |
| **Discovery async** | corrida `queued`/`running` | estado persistente + `runId`/as-of; no se inventa progreso ni candidates optimistas |
| **Discovery parcial** | endpoint Labs falla o fence se agota | candidates materializados + fuente fallida + costo real; recovery = nueva corrida explícita |
| **Discovery sin resultados** | respuesta válida sin filas | empty accionable que explica seeds/métodos/mercado; no se presenta como error de proveedor |
| **Candidate sin dato de mercado** | Labs no devuelve volumen/dificultad/intent | `Sin dato`/`Pendiente` con `◑` sólo cuando existe estimación; nunca `0` ni guion ambiguo |
| **Acción candidate mixta** | varias acciones devuelven outcomes distintos | outcome por candidate, foco restaurado y retry sólo de fallidas |
| **Grounded fallback** | authoring AEO OFF/no configurado/error/schema inválido | draft base etiquetado `baseline_fallback`; no se afirma grounding candidate-specific |
| **Locked (cliente sin SEO)** | sin `module_assignment` | teaser/Locked + upsell (patrón EPIC-020 S6, diferido) |

---

## 9. Reliability signals (arch §8, subsistema Growth Health)

Visibles en `/admin/operations`: `seo.rank.capture_lag` (steady=0), `seo.audit.stuck_tasks`,
`seo.keyword_discovery.stuck_runs`, `seo.keyword_discovery.provider_errors` y
`seo.provider.cost_over_budget`. Las superficies operador (S1/S4) enlazan a estos signals cuando
muestran freshness/degradación; S3/Descubrir muestra el estado de la corrida y su costo, pero no
calcula salud en cliente ni oculta una corrida atascada.

---

## 10. Design Decision Log (nivel programa)

- **Decision:** un master flow para SEO espejo del de AEO, con un §7 de cruce explícito. **Por qué:** las superficies SEO y AEO son nodos de UN sistema (Search Visibility 360), no productos separados; sin este doc cada surface se diseñaría aislada y el cruce (el diferenciador) quedaría como after-thought.
- **Decision:** el cruce SEO↔AEO es derived read + cross-link recíproco, NUNCA merge de tablas. **Por qué:** arch §1.1 boundary duro; la señal "rankeas pero no te citan" se pierde si se reconcilia en un número.
- **Decision:** entitlement per-org (`module_assignments`), NUNCA por rol. **Por qué:** lección TASK-1248 (el error de gatear por rol); repetirlo rompería el modelo de 4 puertas.
- **Decision:** report SEO reusa `ReportArtifactModel`, no lo forkea. **Por qué:** regla de oro EPIC-020 §1 — un modelo, muchos renders; forkear duplicaría scoring y drift.
- **Reuse / extend / new primitive:** reuse total del stack existente (CompositionShell `masterDetail`, DataTableShell, FilterTile, EmptyState, GreenhouseBreadcrumbs, report-artifact/model.ts). Único **new**: adopción de ECharts (`echarts-for-react`) para los charts de alto impacto (arch §10.4, política Charts "vistas nuevas de alto impacto → ECharts"), lazy-loaded — primer uso de ECharts en el repo, se documenta en las tasks 1307/1308/1310.
- **Decision:** keyword discovery es una lente dentro de S3, no una ruta ni una quinta tab de Search Visibility. **Por qué:** conserva Space/target/viewCode/header, mantiene el trabajo diario junto a Oportunidades/Objetivos y permite deep-links con `view=discovery` sin duplicar shell ni permisos.
- **Decision:** la cadena visible de Descubrir es `seed → preview de costo → confirmación → corrida async → candidate → decisión`. **Por qué:** Labs Live puede cobrar por llamada/fila y `trackKeywords` activa gasto recurrente; ningún render ni sugerencia puede convertir una hipótesis en costo sin una confirmación gobernada.
- **Decision:** el mercado estimado de discovery es columna/filtro y no eje visual. **Por qué:** GSC sigue siendo la señal medida del Space; `searchVolume`/`keywordDifficulty`/`intent` de Labs se muestran con `◑`, as-of y disponibilidad explícita, nunca sustituyen ni promedian la serie propia.
- **Decision:** `Preparar grounded queries` termina en draft AEO y reutiliza `grader_prompt_sets`. **Por qué:** keyword SEO y pregunta AEO son entidades semánticas distintas; el bridge conserva provenance y deja review/approve/active en el motor AEO.
- **Open risks:** costo DataForSEO (arch §13 riesgo #1) condiciona la frecuencia de datos que las superficies pueden prometer; el quadrant 360 depende de que `readSeoAeoGap` tenga ambos lados poblados (org con grader_run + seo target enlazados por `organization_id`).

## Acceptance Checklist

- [ ] Cada task UI del epic (1306–1310, 1660 y 1665) referencia este doc en su `## Delta` y declara de qué nodo(s) es.
- [ ] Toda superficie deriva visibilidad del entitlement per-org, nunca del rol.
- [ ] Toda acción visible mapea a un command gobernado del §6 (Full API Parity).
- [ ] El contrato medido ● / estimado ◑ y la honest degradation (§8) se respetan en cada superficie.
- [ ] El cruce SEO↔AEO es derived read + cross-link recíproco, nunca merge de tablas.
- [ ] S3 conserva una sola ruta y separa explícitamente sus lentes `Oportunidades`, `Objetivos` y
  `Descubrir`; la selección de lente y el run/filter state son deep-linkables y server-validated.
- [ ] Descubrir tiene builder, preview, confirmación, async statuses, candidate actions, outcomes
  mixtos, keyboard/focus recovery, responsive 1440/390 y GVC premium definido en `TASK-1665`.
- [ ] `readKeywordDiscovery` y sus commands tienen parity app/Nexa/ecosystem/MCP; la UI no llama Labs,
  no lee tablas y ninguna sugerencia hace auto-track.
- [ ] SEO→AEO conserva source refs/provenance y termina en draft; no activa prompt set ni grader en la
  misma acción.
- [ ] Toda `page.tsx` nueva queda en `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV`/nav cliente.

---

## Delta 2026-08-07 — S3 (Keyword opportunities) implementada: cuatro supuestos del flujo no resistieron el runtime

`/admin/growth/seo/keywords` está viva (TASK-1308). Hereda el shell de S1 sin construir navegación
local, entra en `route-reachability-manifest.ts` con `parent: '/admin/growth/seo'` + `via: 'tab'`, y
no siembra viewCode ni ítem de menú. Lo que **cambió** respecto de lo que este doc suponía:

1. **El encoding del scatter no es dificultad × volumen.** Ninguno de los tres canales que pedía el
   §5 tiene fuente: `readKeywordOpportunities` devuelve `searchVolume: null`, `difficulty: null`,
   `market: 'unavailable'` (TASK-1300 no aterrizó) y el contrato no tiene campo de intención. El
   encoding vigente es **medido**: X = posición ponderada (8→20, eje fijo), Y = impresiones (log),
   tamaño = clics incrementales estimados, color **y forma** = acción recomendada.
   🎯 Cuando el enriquecimiento de mercado llegue **no será un eje**: será una columna y un filtro —
   los ejes medidos son correctos con o sin él, así que el contrato de la pantalla no se rompe.
2. **Canibalización es una tercera ACCIÓN, no una variante de "oportunidad".** Serie propia, forma
   propia y verbo propio ("Consolidar" vs "Empujar"), con el clasificador en un módulo compartido
   por mapa, filtros y tabla para que no deriven entre sí. Gana sobre la posición.
3. **La leyenda y el filtro por acción son el mismo objeto**: la banda de veredicto que abre la
   pantalla enuncia el hallazgo dominante, sirve de leyenda de formas y filtra. No hay `FilterTile`
   faceted ni select "Acción": eran dos objetos para una sola idea.
4. **El contrato ● / ◑ del §8 se cumple a medias en S3, y a propósito.** Sin enriquecimiento de
   mercado no hay nada estimado que marcar: se declara `● Medido · Search Console` una vez al pie
   del mapa junto al motivo de la ausencia, y las columnas de volumen/dificultad **no se renderizan**
   (repetir "sin dato" 100 veces empujaba la acción primaria fuera de la pantalla en 390px). El
   invariante que protege el §8 —nunca un `0` ni un guion ambiguo, nunca promediar— se respeta entero.

**Lo que sí quedó como el flujo prescribía:** un solo viewCode para las 4 rutas, `?space=` compartible
pero no autoridad, acciones = commands gobernados (`trackKeywords` / `untrackKeywords`, mismos que
operan el lane `app`, el `ecosystem` y las tools MCP), tabla como fallback de accesibilidad permanente
del chart, y el cross-link contextual S3 → S2 (click en la keyword abre Rendimiento con su serie
aislada) — que este doc pedía sólo en el sentido inverso.

**Pendiente de rollout, no de código:** las tools MCP `track_seo_keywords` / `untrack_seo_keywords`
responden `insufficient_scope` hasta que `efeonce.mcp.seo.write` quede cableado a un cliente con grant
controlable, y el commit de federación del gateway siga sin publicar. Es fail-closed por diseño.

## Delta 2026-08-08 — S3 incorpora el carril diario de discovery y el puente SEO → AEO

El master flow queda actualizado para que `TASK-1665` no sea una pantalla aislada. La decisión
cross-surface es explícita: **Descubrir es una tercera lente de S3**, junto a `Oportunidades`
(`TASK-1308`) y `Objetivos` (`TASK-1660`), dentro de la misma ruta
`/admin/growth/seo/keywords`. No se crea una ruta `/discovery`, un viewCode, un ítem de menú ni un
quinto tab de `SeoSearchVisibilityTabs`.

### Contrato maestro promovido desde TASK-1665

- **Entrada y wayfinding:** Keywords → `Descubrir`; se conservan breadcrumb, Space/target, header,
  viewCode y assignment de S3. La lente se deep-linkea con
  `/admin/growth/seo/keywords?view=discovery`; `space`, `discoveryRun` y los filtros allowlisted se
  propagan y se vuelven a validar server-side.
- **Journey:** `seed → preview de llamadas/filas/costo/cupo → confirmación → queue 202 → queued →
  running → succeeded|partial|no_results|budget_blocked|provider_error → candidates → decisión`.
  Los estados no se optimizan en browser, el costo no se presenta como autorización y una corrida
  parcial no se convierte en error total ni en éxito falso.
- **Decisiones por candidate:** `Declarar objetivo` usa `trackKeywords(intent=target)`; `Seguir
  oportunidad` usa `trackKeywords(intent=opportunity)`; `Preparar grounded queries` llama
  `createGroundedQueryDraft` y termina en draft AEO; `Descartar` sólo registra action append-only;
  `Ver trayectoria` navega a S2 sin gasto nuevo. Todas tienen confirmación, permiso, pending,
  outcome individual y recuperación de foco.
- **Data boundary:** la UI consume `readKeywordDiscovery`/commands; Vercel encola, `ops-worker`
  ejecuta Labs con límites, entitlement, preview, ledger y señales. GSC (`●`) y Labs (`◑`) quedan
  ortogonales; mercado es columna/filtro con as-of, nunca eje ni reemplazo de la serie propia.
- **SEO↔AEO:** la selección de hasta 20 candidates conserva refs de run/candidate/context hash,
  reutiliza `grader_prompt_sets` y sólo crea `draft`. Aprobar, activar, ejecutar el grader y atribuir
  citas (`TASK-1311`) siguen siendo pasos posteriores del motor AEO.
- **Parity:** `readKeywordDiscovery` debe ser el mismo primitive para app, Nexa, ecosystem y MCP;
  `get_seo_keyword_discovery` es read y `discover_seo_keywords` es write interno bajo
  `efeonce.mcp.seo.write`. La UI no recibe credenciales, SQL ni respuesta cruda del proveedor.

La fuente de detalle sigue siendo [TASK-1665 flow](TASK-1665-growth-seo-keyword-discovery-workbench-flow.md),
su [wireframe](../wireframes/TASK-1665-growth-seo-keyword-discovery-workbench.md) y su [dirección visual](../visual-directions/TASK-1665-growth-seo-keyword-discovery-workbench-direction.md);
este delta sólo fija la conectividad y las decisiones que todos los consumers deben compartir. `TASK-1665`
permanece `UI ready: no` hasta que exista implementación, first-fold checkpoint, GVC premium 1440/390,
scorecard y gates de calidad; este documento no constituye evidencia de runtime.
