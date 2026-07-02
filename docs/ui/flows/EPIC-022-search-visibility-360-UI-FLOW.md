# EPIC-022 — Search Visibility 360 · Master UI Flow Contract

> **Qué es:** el contrato de flujo **cross-surface** de TODO el módulo SEO (`growth.seo`) y su convergencia con el AEO Grader (`growth.ai_visibility`) bajo la narrativa de producto **Search Visibility 360**. Conecta cada UI que existe o se va a crear — operador (cockpit denso), cliente (dashboard self-service), report artifact (imprimible/PDF), y los cross-links recíprocos SEO↔AEO — en un solo mapa de navegación, estados y commands.
> **Esto NO reemplaza** los flow/wireframe por-task; es la **tela conectiva** que garantiza que todas las superficies son nodos de un mismo sistema, no pantallas sueltas. Cada task UI del epic referencia este doc en su `## Delta`.
> **Hermano:** `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` (el motor AEO). Este doc es su espejo estructural para el motor SEO + el punto donde ambos se cruzan (§7 Search Visibility 360).

## Meta

- Status: `draft`
- Epic: `EPIC-022` (Search Visibility 360 · dominio `growth.seo`, hermano de `growth.ai_visibility`)
- Arquitectura fuente: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§10 IA/superficies, §2 matriz 360, §3 capacidades, §5 rank tracking, §7 primitives, §10.4 dataviz)
- Skills de product design aplicadas: `info-architecture` (líder — IA + flujo cross-surface + routing), `state-design` (12 estados + honest degradation medido/estimado + Locked/upsell), `greenhouse-ux-writing` (copy es-CL tuteo, tono operador vs cliente), `modern-ui` (wayfinding, active state, restraint, product-vs-marketing), `dataviz-design` (Y invertido de posición, quadrant 2×2, honestidad medido ● vs estimado ◑)
- Tasks UI conectadas: TASK-1306 (Overview operador), TASK-1307 (★ Rank & URL performance), TASK-1308 (Keyword opportunities), TASK-1309 (Site audit), TASK-1310 (Cliente + Report Artifact + quadrant 360)
- Tasks backend que alimentan las superficies: TASK-1299 (schema), TASK-1300 (DataForSEO family registry), TASK-1301 (capabilities `growth.seo.*` + `enforceSeoRunEntitlement`), TASK-1302 (GSC daily + `readKeywordOpportunities`), TASK-1303 (rank capture + `readRankEvolution`), TASK-1304 (site audit + backlink), TASK-1305 (`readSeoAeoGap`)
- Flow files por-task: `TASK-1310-growth-seo-client-dashboard-report-artifact-flow.md` (+ wireframes 1308/1309/1310)

---

## 1. La espina dorsal: un motor de datos, muchos readers, tres audiencias de render

El módulo SEO se apoya en **una sola fuente de configuración + serie temporal** (`greenhouse_growth.seo_*`, arch §4): PG es SoT de config + ventana caliente ~180d, BQ es SoT de la historia larga. De ahí, **readers gobernados** (arch §7, Full API Parity) proyectan shape + latencia, y las superficies son **clientes** de esos readers — nunca pegan live-per-view a DataForSEO en el render (arch §1.1 boundary duro).

| Reader (arch §7) | Qué proyecta | Superficie que lo consume | Task backend |
|---|---|---|---|
| `readRankSnapshotLatest(targetId)` | standings + WoW delta | Overview operador (S1) | 1303 |
| `readRankEvolution(targetId, {keywords?, range, engine, device})` | series temporales por URL/keyword (Y=posición) | ★ Rank performance (S2), Cliente dashboard (S5) | 1303 |
| `readKeywordOpportunities(targetId)` | join SEO↔GSC (striking-distance 8–20 × volumen/dificultad) | Keyword opportunities (S3) | 1302 |
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

**Máquina de estado maestra (state-design):** `entitlement per-org → surface`. La misma ruta cliente `/growth/seo` resuelve a dashboard completo (contratado) o Locked/teaser (sin assignment) — nunca se decide en cliente; siempre server-side. El histórico temporal vive SOLO detrás de la puerta contratada; el público (cuando exista) es siempre una **foto** puntual (arch §11 packaging).

---

## 3. Inventario de superficies (todos los nodos SEO + los puntos de cruce AEO)

| # | Superficie | Ruta / canal | Route group | Actor | Estado | Task |
|---|---|---|---|---|---|---|
| S1 | **SEO Overview** (cockpit denso multi-Space) | `/admin/growth/seo` | internal | operador | a crear | 1306 |
| S2 | **★ Rank & URL performance over time** (pantalla ancla) | `/admin/growth/seo/performance` | internal | operador | a crear | 1307 |
| S3 | **Keyword opportunities** | `/admin/growth/seo/keywords` | internal | operador | a crear | 1308 |
| S4 | **Site audit** (+ drill `/[issueGroup]`) | `/admin/growth/seo/audit` | internal | operador | a crear | 1309 |
| S5 | **Cliente SEO dashboard** (self-service mono-Space) | `/growth/seo` | client | cliente contratado | a crear | 1310 |
| S6 | **Quadrant 360 SEO×AEO** (cruce, en S5 y en report) | `/growth/seo` + report | client | cliente | a crear | 1310 |
| S7 | **Report Artifact SEO** (web + print/PDF) | `/growth/seo/report` | client | cliente | a crear | 1310 |
| X1 | **AEO Grader** (motor hermano, cross-link recíproco) | `/aeo` (cliente) · `/admin/growth/ai-visibility` (operador) | client/internal | ambos | hecho | EPIC-020 |
| X2 | **Report Artifact AEO** (mismo `ReportArtifactModel`, mirror) | web/print/pdf | — | ambos | hecho | 1252/1273 |

**Sección local "Search Visibility" (arch §10.1, info-architecture):** `Growth` sigue siendo dominio raíz. Dentro, la sección local **"Search Visibility"** agrupa dos motores hermanos: **SEO** (nuevo) + **AEO Grader** (existente, intacto). Toda `page.tsx` nueva → `route-reachability-manifest.ts` (TASK-982) + key en `GH_INTERNAL_NAV` (`greenhouse-nomenclature.ts`, SoT que consume `VerticalMenu` — lección TASK-1247, la key SOLO en navigation-copy.ts revienta 500 en todo el dashboard).

---

## 4. Wayfinding, IA y URL scheme (info-architecture)

**Los 4 sistemas de navegación coexisten (Rosenfeld & Morville):**

- **Global:** menú lateral `Growth` → sección local "Search Visibility" → SEO · AEO Grader. Active state obligatorio en el ítem vigente (`aria-current="page"`).
- **Local:** dentro de SEO, tabs/sub-nav operador: Overview · Rank performance · Keywords · Auditoría. Breadcrumb `Growth / Search Visibility / SEO / <sección>`.
- **Contextual:** cross-link recíproco SEO↔AEO (§7); "Ver keywords de esta URL" desde el rank chart; "Ver auditoría del grupo" desde un finding.
- **Supplemental:** `DebouncedInput` de búsqueda de keyword (S3), Space picker (`Space ▾`) presente en toda ruta operador multi-Space.

**URL scheme (arch §10.1 + info-architecture — estado en query params, deep-linkable):**

```text
Operador (internal):
/admin/growth/seo                              Overview
/admin/growth/seo/performance                  ★ Rank & URL performance
/admin/growth/seo/performance?urls=…&keywords=…&range=90d&engine=google&device=desktop
/admin/growth/seo/keywords                     Keyword opportunities
/admin/growth/seo/keywords?intent=comercial&maxDiff=40&pos=8-20
/admin/growth/seo/audit                        Site audit
/admin/growth/seo/audit?issueGroup=indexability   drill del grupo (query param, no segmento dinámico extra)

Cliente (client):
/growth/seo                                    Dashboard self-service mono-Space
/growth/seo?view=quadrant                      quadrant 360 en foco (mismo dashboard)
/growth/seo/report                             Report artifact (web) + acción print/PDF
```

**Regla de wayfinding (los 5):** en cualquier ruta el usuario sabe *dónde está* (breadcrumb + título + active nav), *a dónde puede ir* (sub-nav + cross-link AEO), *cómo volver* (browser back + breadcrumb), *qué hay alrededor* (Space picker, related URLs), *qué acaba de pasar* (toast/feedback tras "Seguir keyword" / re-grade). El `?issueGroup=` del site audit es query param (no un segmento dinámico paralelo) para mantener el back button y la compartibilidad simples.

---

## 5. Las journeys cross-surface (el detalle)

### Journey A — Operador cockpit (denso, multi-Space, datos crudos + acciones)

```text
Login interno → nav Growth → Search Visibility → SEO
  → S1 Overview (Space ▾ selecciona target): visibility score + top-3/top-10 + WoW movers + salud + backlinks (soporte)
  → S2 ★ Rank & URL performance: line multi-serie (Y invertido), set seleccionable persistido en ?urls=/?keywords=
        └─ contextual: "Ver keywords de esta URL" → S3
  → S3 Keyword opportunities: scatter (dificultad×volumen) + faceted filter + tabla → acción gobernada "Seguir" (trackKeywords)
  → S4 Site audit: health KPIs + issues por impacto×esfuerzo → drill /[issueGroup] con URLs afectadas
        └─ acción gobernada "Correr auditoría" (queueSiteAudit, async OnPage)
```
- **Estados (state-design):** default · loading (skeleton) · empty (target sin snapshots aún: "Aún no hay datos de rank / sin auditoría reciente" + CTA) · degraded (medido ● + estimado ◑, cuota agotada → banner) · permission (sin `observation.read`).
- **Acciones = commands gobernados (Full API Parity, arch §7):** `trackKeywords` (S3), `queueSiteAudit` (S4), `configureSeoTarget`. El LLM/Nexa opera lo mismo por construcción (propose→confirm→execute).

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
| "Correr auditoría" | `queueSiteAudit(targetId, actor)` (async OnPage) | `growth.seo.audit.run` | S4 |
| Leer rank / keywords / audit / gap | readers (§1) | `growth.seo.observation.read` | S1–S6 |
| Leer report cliente | `readSeoAeoGap` + `readRankEvolution` → `ReportArtifactModel` | `growth.seo.report.read_client` | S5, S7 |

**Writes:** `propose → confirm → execute` — el LLM nunca escribe directo, muta sólo en el endpoint de confirmación humana. Reads directos.

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
| **Locked (cliente sin SEO)** | sin `module_assignment` | teaser/Locked + upsell (patrón EPIC-020 S6, diferido) |

---

## 9. Reliability signals (arch §8, subsistema Growth Health)

Visibles en `/admin/operations`: `seo.rank.capture_lag` (steady=0), `seo.audit.stuck_tasks`, `seo.provider.cost_over_budget`. Las superficies operador (S1/S4) enlazan a estos signals cuando muestran freshness/degradación (no computan salud en cliente).

---

## 10. Design Decision Log (nivel programa)

- **Decision:** un master flow para SEO espejo del de AEO, con un §7 de cruce explícito. **Por qué:** las superficies SEO y AEO son nodos de UN sistema (Search Visibility 360), no productos separados; sin este doc cada surface se diseñaría aislada y el cruce (el diferenciador) quedaría como after-thought.
- **Decision:** el cruce SEO↔AEO es derived read + cross-link recíproco, NUNCA merge de tablas. **Por qué:** arch §1.1 boundary duro; la señal "rankeas pero no te citan" se pierde si se reconcilia en un número.
- **Decision:** entitlement per-org (`module_assignments`), NUNCA por rol. **Por qué:** lección TASK-1248 (el error de gatear por rol); repetirlo rompería el modelo de 4 puertas.
- **Decision:** report SEO reusa `ReportArtifactModel`, no lo forkea. **Por qué:** regla de oro EPIC-020 §1 — un modelo, muchos renders; forkear duplicaría scoring y drift.
- **Reuse / extend / new primitive:** reuse total del stack existente (CompositionShell `masterDetail`, DataTableShell, FilterTile, EmptyState, GreenhouseBreadcrumbs, report-artifact/model.ts). Único **new**: adopción de ECharts (`echarts-for-react`) para los charts de alto impacto (arch §10.4, política Charts "vistas nuevas de alto impacto → ECharts"), lazy-loaded — primer uso de ECharts en el repo, se documenta en las tasks 1307/1308/1310.
- **Open risks:** costo DataForSEO (arch §13 riesgo #1) condiciona la frecuencia de datos que las superficies pueden prometer; el quadrant 360 depende de que `readSeoAeoGap` tenga ambos lados poblados (org con grader_run + seo target enlazados por `organization_id`).

## Acceptance Checklist

- [ ] Cada task UI del epic (1306–1310) referencia este doc en su `## Delta` y declara de qué nodo(s) es.
- [ ] Toda superficie deriva visibilidad del entitlement per-org, nunca del rol.
- [ ] Toda acción visible mapea a un command gobernado del §6 (Full API Parity).
- [ ] El contrato medido ● / estimado ◑ y la honest degradation (§8) se respetan en cada superficie.
- [ ] El cruce SEO↔AEO es derived read + cross-link recíproco, nunca merge de tablas.
- [ ] Toda `page.tsx` nueva queda en `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV`/nav cliente.
