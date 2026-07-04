# TASK-1331 — AI Visibility Public Report ViewModel Contract Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-020`
- Status real: `COMPLETE 2026-07-04 — Greenhouse production released + Think production deployed`
- Rank: `TBD`
- Domain: `growth|ai|public-site|data`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer el contrato headless del informe publico de AI Visibility para que todo lo que el mockup enterprise de `efeonce-think` muestra venga desde Greenhouse como view-model publico, versionado y public-safe. La task elimina derivaciones semanticas frágiles del hub, especialmente engine roster/Share of Model, benchmark competitivo, totales de citabilidad por clase, highlights de dimensiones y summary de readiness, sin tocar scoring, probes ni `executeClaimedGraderRun`.

## Why This Task Exists

TASK-1329 dejó el informe publico visualmente listo, pero el polish reveló que varias piezas editoriales siguen derivándose dentro de Think: roster de motores, Share of Model, ranking competitivo, gaps vs líder, totales de dominios propios/terceros/competidores, copy factual del share widget y clasificación de fortalezas/brechas. Eso funciona para el mockup, pero no es suficientemente enterprise: el public hub no debe decidir semántica de negocio ni calcular métricas globales desde slices visuales como `topSourceDomains`.

## Goal

- Convertir las derivaciones public-safe del mockup en contrato canónico de Greenhouse.
- Mantener `PublicGraderReport` y `ReportArtifactModel` como source of truth del informe.
- Evitar que Think compute métricas globales desde datos truncados o display-only.
- Preservar compatibilidad del endpoint `GET /api/public/growth/ai-visibility/report/[token]`.
- Dejar tests de no-leak y snapshot compatibility que protejan el contrato.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1252-growth-ai-visibility-report-artifact-design-system.md`
- `docs/tasks/complete/TASK-1280-growth-ai-visibility-public-report-model-contract.md`
- `docs/tasks/complete/TASK-1328-ai-visibility-report-signal-completeness.md`
- `docs/tasks/complete/TASK-1329-ai-visibility-report-visual-editorial-polish.md`
- `docs/tasks/to-do/TASK-1330-ai-visibility-report-short-links-capability.md`

Reglas obligatorias:

- Greenhouse sigue siendo source of truth del modelo publico; Think solo renderiza.
- No tocar backend/model/scoring, pesos, prompt packs, probes, normalizer ni `executeClaimedGraderRun`.
- No exponer raw prompts, raw provider answers, full citation URLs, reasons internos, `providerFindings`, `accuracyFindings` ni internal-only data.
- Cambios del shape publico son aditivos y deben respetar `modelVersion`; breaking change requiere bump mayor y consumer coordinado.
- `null != 0`: ausencia de evidencia no se modela como score cero.
- Snapshots publicos son inmutables; cualquier campo nuevo debe derivarse desde el `public_report_json` existente o declarar estrategia de version/backfill separada.
- Claude debe estar en el roster público cuando el run/provenance lo soporte; no hardcodear su presencia/ausencia en Think como verdad de negocio.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1329` complete
- `TASK-1328` complete
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/lib/growth/ai-visibility/report/builder.ts`
- `src/components/growth/ai-visibility/report-artifact/model.ts`
- `src/lib/growth/ai-visibility/report/snapshot.ts`
- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts`
- `src/lib/growth/ai-visibility/normalization/contracts.ts`
- Repo externo `/Users/jreye/Documents/efeonce-think`, consumer actual del contrato.

### Blocks / Impacts

- Bloquea el retiro de derivaciones semanticas locales en `efeonce-think/src/pages/brand-visibility/r/[token].astro`.
- Alimenta el share widget premium con facts server-provided; la URL corta real queda en TASK-1330.
- Reduce drift entre PDF/email/portal/hub al mover los view facts a Greenhouse.
- Mejora compatibilidad futura para `Greenhouse AI Visibility Monitor` y reportes recurrentes.

### Files owned

- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/lib/growth/ai-visibility/report/builder.ts`
- `src/components/growth/ai-visibility/report-artifact/model.ts`
- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts`
- `src/app/api/public/growth/ai-visibility/report/[token]/__tests__/route-contract.test.ts`
- `src/lib/growth/ai-visibility/report/__tests__/*`
- `src/components/growth/ai-visibility/report-artifact/__tests__/*`
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`
- `[repo externo] /Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro` [consumer follow-up only if this task intentionally includes the final adoption slice]

## Current Repo State

### Already exists

- `PublicGraderReport` already carries public-safe aggregates: `providerPresence`, `citationInsight`, `citationSourceBreakdown`, `categoryTaxonomySummary`, `sentimentSummary`, `positionSummary`, `trend`, `readiness`, `competitiveSov`, `provenance`.
- `ReportArtifactModel` already exposes `engineSnapshot`, `levels`, `perceptionAxisScore`, `agenticAxisScore`, `readiness`, `citationSourceBreakdown`, `categoryTaxonomySummary`, `sentimentSummary`, `competitiveSov` and `citationInsight`.
- Public route already returns `{ report, model, modelVersion, header, runPublicId, asOf, expiresAt }`.
- Think renders the enterprise report and passes overflow/no-leak checks, but computes several view facts locally.

### Gap

- Engine coverage is not a first-class public view-model: provider ids (`openai`, `anthropic`) and display ids (`ChatGPT`, `Claude`) are normalized in Think.
- Share of Model IA is computed in Think from a hardcoded roster plus `engineSnapshot`.
- Competitive ranking, leader gap, next gap, multiples and SoV copy are computed in `CompetitiveBenchmark.astro`.
- Citation risk totals in Think are lossy because they are derived from `topSourceDomains` (top-N display rows), not from global classification totals.
- Readiness flow/gap copy, dimension highlights and share message facts are local presentation intelligence with business semantics.
- Sentiment is modeled, but the public contract does not expose unknown/coverage, making it hard to explain denominators when sentiment is partially unavailable.
- Snapshots are immutable; old reports may not contain future additive data unless the new view-model can derive it from existing public fields.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `PublicGraderReport` + `ReportArtifactModel` publicWeb adapter
- Consumidores afectados: `efeonce-think`, public report API, PDF/email copy, future client/public report consumers
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `GET /api/public/growth/ai-visibility/report/[token]`, `GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION`, `modelFromPublicReport`
- Contrato nuevo o modificado: additive public view-model fields under `ReportArtifactModel` or a namespaced `publicWebFacts`/`reportViewModel`
- Backward compatibility: `compatible`
- Full API parity: all public renderers consume the same server-side report model; no UI-only metric semantics.

### Data model and invariants

- Entidades/tablas/views afectadas: none expected; derived reader/model only.
- Invariantes que no se pueden romper:
  - No recompute scoring or change score values.
  - No expose raw evidence, full URLs, prompts, provider answers, internal findings or internal reasons.
  - Public snapshots remain immutable; additive fields must derive from `PublicGraderReport` or return honest nulls.
  - Top-N domain rows are display data; global counts must come from global aggregates.
  - Provider absence, provider skipped, provider failed and provider resolved-with-zero-mentions must not collapse into the same state.
- Tenant/space boundary: public token remains the access boundary; no session/tenant expansion.
- Idempotency/concurrency: pure deterministic derivation from `PublicGraderReport`; same input returns same view-model.
- Audit/outbox/history: none for derivation; route errors continue through `captureWithDomain` in growth domain.

### Migration, backfill and rollout

- Migration posture: `none` by default.
- Default state: additive fields returned immediately behind contract tests; consumer adoption can be staged.
- Backfill plan: none unless Discovery proves a required field cannot derive from existing `public_report_json`; in that case create a separate migration/backfill task.
- Rollback path: consumer falls back to current fields; revert additive model fields if they cause route failure.
- External coordination: Think consumer update after Greenhouse route contract is proven; no production enablement without standard release confirmation.

### Security and access

- Auth/access gate: existing public report token + public read rate guard.
- Sensitive data posture: public-safe aggregated metrics only; no PII beyond already-public brand/header fields.
- Error contract: keep 404 for invalid/expired report, 429 for rate limit, 502 sanitized on unexpected failure.
- Abuse/rate-limit posture: existing report rate limit remains; no new public enumeration surface.

### Runtime evidence

- Local checks: route contract tests, report model unit tests, no-leak tests.
- DB/runtime checks: public route smoke against one existing public snapshot; verify old snapshot compatibility.
- Integration checks: Think local smoke consuming new fields or documented fallback if Think adoption is split.
- Reliability signals/logs: existing public report route capture; no new signal unless route error class changes.
- Production verification sequence: fetch one public report token after deploy, compare old and new fields, open Think report, confirm no raw data leak and no metric regression.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Logica en el primitive/model adapter, no en la UI.
- [ ] Modelada como read projection/view-model, no como click-handler ni component-local derivation.
- [ ] Read expuesto en el public report API; no write path.
- [ ] Capability + grant: N/A — public token read already governs this surface; no new internal action.
- [ ] Camino programatico declarado: `GET /api/public/growth/ai-visibility/report/[token]`.
- [ ] Write apto para `propose → confirm → execute`: N/A — read-only.
- [ ] Un primitive, muchos consumers: Think, PDF/email and future client report surfaces can consume the same facts.
- [ ] Parity check = SÍ: the report facts have a governed server-side contract.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Discovery — Slice 1: Public view-model audit & compatibility map

> Producido por revisión profunda (arch-architect + product-ui-architect) el 2026-07-04,
> auditando el mockup real de `efeonce-think/src/pages/brand-visibility/r/[token].astro`
> (+ componentes) contra el DTO/builder/model/route/snapshot de Greenhouse. Fuente de verdad
> del contrato: `PublicGraderReport` ([contracts.ts](../../../src/lib/growth/ai-visibility/report/contracts.ts))
> y `ReportArtifactModel` ([model.ts](../../../src/components/growth/ai-visibility/report-artifact/model.ts)).

### Hallazgo arquitectónico clave (habilita snapshot-safety sin backfill)

`modelFromPublicReport` corre en **tiempo de LECTURA** sobre el `public_report_json` congelado
([route.ts:55](../../../src/app/api/public/growth/ai-visibility/report/[token]/route.ts)). Por lo
tanto, casi todas las derivaciones que Think hace localmente se mueven a un helper puro server-side
que corre sobre el snapshot congelado y **funciona igual para reportes viejos y nuevos, sin backfill**.

### Partición de derivabilidad (las tres cajas)

- **R — Derivable en lectura** desde el DTO congelado → cobertura total (viejos + nuevos), riesgo cero.
- **B — Requiere campo nuevo en el DTO** (build-time) → solo reportes nuevos; viejos degradan a `null` honesto.
- **P — Presentación pura** → se queda en el render.

**Regla de no-pérdida (evita que un agente "quite" secciones):** todo fact de caja **B** se tipa
`| null` y el render define su estado degradado ("en cobertura", "muestra calificada: N"); **nunca**
se borra la sección cuando el fact es `null`.

### Clasificación por sección

Clases: `A`=ya modelado y consumido bien · `R`=derivar en lectura (view-fact nuevo, snapshot-safe) ·
`B`=requiere agregado nuevo en DTO · `P`=presentación pura · 🐛=bug real del mockup a corregir.

| Sección / fact | Origen hoy en Think | Destino canónico | Clase |
|---|---|---|---|
| **Hero** score/severidad/`headline.frame`/`primaryGap` | API directo | igual | A |
| Hero chips Claridad/Categoría/Citas (match por label EN) | derivado local por label inglés | `dimensionHighlights` + `dimensions[].label` del DTO | R 🐛 |
| **Share of Model** roster fijo + padding "Sin datos" | hardcode L123-137 | `viewFacts.engineCoverage.providers[]` + roster canónico | R |
| SoM: `openai→chatgpt`, labels, logos | hardcode ×3 archivos | mapping canónico (`provider_label`/`surface_label`) | R 🐛 drift |
| SoM IA % `presentTotal/resolvedTotal` | cómputo local L201-204 | `engineCoverage.summary.shareOfModel` | R |
| SoM strongest/weakest + status por motor | sorts/ternarios locales | `engineCoverage.summary.*` + enum 5 estados | R |
| **Benchmark** rank/SoV%/leaderGap/nextGap/multiple/rows | 100% local (`CompetitiveBenchmark.astro` L18-54) | `viewFacts.competitiveBenchmark.*` | R |
| Benchmark narrativas | compuestas local | strings compuestos server (copy layer) | R |
| **Citas** totalCitations/uniqueDomains | API (globales) | igual | A |
| Citabilidad propia % | `own(top-6)/total(global)` | `citationInsight.ownDomainShare` | R 🐛 numerador top-6/denominador global |
| Riesgo de dependencia (terceros/competidores) | suma **solo top-6** L210-215 | `viewFacts.citationTotals.{competitor,thirdParty,ugc}` global | **B** |
| filas top-N + share por dominio | API + % local | `citationSourceBreakdown.domains` (display) | A/P |
| **Sentimiento** conteos/`evaluated`/`net` | API (fallback mock) | igual | A |
| `unknown`/denominador "muestra calificada" | no existe → suma buckets | `viewFacts.sentimentFacts.unknown` | **B** (nullable) |
| **Readiness** structural/agentic + coverage | API | igual | A |
| `actionGap` + flow leer→validar→ejecutar | cómputo local L223-271 | `viewFacts.readinessSummary.*` + strings | R |
| verdict "se puede leer; le cuesta ejecutar" + párrafo | **hardcode estático L889/L894, no reacciona al dato** | string compuesto server desde scores reales | R 🐛 grave |
| **Ladder** rungs/scores/severidad | API `levels[]` + `LEVEL_COPY` | `model.levels` + copy | A |
| `isNext` "Empieza aquí" | `findIndex(severity!=='optimo')` L89 (Think) | `model.levels[].isNext` (derivación server determinista) | R |
| **Dimensiones** fortalezas/brechas/sin-medir | filtros locales L189-195 | `viewFacts.dimensionHighlights` | R |
| labels de dimensión / radar short | tablas locales | `dimensions[].label` (+ `shortLabel` opcional) | R 🐛 drift |
| **Recomendaciones**/`primaryGap` | API | igual | A |
| **Share widget** score/SoM%/citab%/motores | compuesto local L363-368 | `viewFacts.shareFacts.*` (strings server) | R |
| strip "ChatGPT · Gemini · Claude…" | string hardcodeado L1137 | derivar de roster/surface real | R 🐛 |
| reportUrl/graderUrl | armados en browser | `shareFacts.reportUrl` (long) + `graderUrl`; short = TASK-1330 | R |
| `disclaimer`/footer/numeración secciones | API/`getFullYear()`/local | igual (numeración se queda en Think sobre facts server) | A/P |

### Los ÚNICOS cambios build-time (caja B) — materia prima ya existe

1. **Totales globales de citas por clase.** En `buildCitationSourceBreakdown`
   ([citation-breakdown.ts:140](../../../src/lib/growth/ai-visibility/report/citation-breakdown.ts))
   la clasificación ya se calcula para **todos** los dominios antes del `.slice(0,limit)`. Acumular
   por clase antes del slice y agregar aditivamente a `CitationSourceBreakdown`:
   `classificationTotals: { own_domain; competitor; third_party; ugc }`. Snapshots viejos → los
   totales de clase del view-model degradan a `null` (`ownDomainShare` sí sale de `citationInsight`).
2. **`unknown` de sentimiento** (opcional, menor). En `buildSentimentSummary`
   ([builder.ts:314](../../../src/lib/growth/ai-visibility/report/builder.ts)) contar findings con
   sentiment no resuelto → `SentimentSummary.unknown: number`. Sin esto, denominador honesto = `evaluated`.

Ninguno toca scoring/probes/normalizer/`executeClaimedGraderRun`.

### Dónde viven los facts + composición de copy

- **`model.viewFacts` namespaced, poblado en `baseModel`** para TODAS las variants → los renders
  in-repo (web/print/PDF/portal) consumen el mismo primitivo y se elimina el drift entre PDF/email/portal/hub.
- **El servidor compone los strings es-CL** usando `GH_GROWTH_AI_VISIBILITY` (Think no puede importar
  `src/lib/copy/growth.ts`; hoy duplica `LEVEL_COPY`/`sentimentNetCopy`/`DIMENSION_LABEL`). Como se
  derivan en lectura, mejoras de copy aplican retroactivamente a reportes viejos.
- **Reusar mapas canónicos existentes**, no reinventar: `provider_label` + `surface_label`
  ([growth.ts:144-167](../../../src/lib/copy/growth.ts)) + mapping motor→surface (`GraderEngineSurface`,
  `normalization/contracts.ts`).

### Correcciones a la shape indicativa del Detailed Spec

1. `citationTotals.{competitor,thirdParty,ugc}` → `number | null` (snapshots viejos). `ownDomainShare`
   sale de `citationInsight`, no de recálculo sobre top-N.
2. `engineCoverage.providers[]` incluye `surface` desde el mapa canónico + `label`/`displayLabel` desde SSOT.
3. `sentimentFacts.unknown` nullable; requiere el campo build-time (2) o queda siempre `null`.
4. `shareFacts.providersText` derivado del roster real (no el string fijo de 5 motores).
5. Agregar `levels[].isNext` (o `nextLevelId`) para sacar la decisión de "próximo nivel" de Think.
6. `dimensionHighlights` trae `label` del DTO; opcional `shortLabel` para el radar.

### Versión del contrato público

Bump **MINOR `1.0.0 → 1.1.0`** (`GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION`,
[contracts.ts:34](../../../src/lib/growth/ai-visibility/report/contracts.ts)). Aditivo → no rompe Think;
el minor habilita feature-detect. Documentar la política en
`GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1`.

### Compatibilidad de snapshots viejos (confirmación acceptance criteria)

- Derivable desde `public_report_json` congelado (caja R): engine coverage, Share of Model, benchmark
  competitivo, `ownDomainShare`, action-gap readiness, next-rung, dimension highlights, share facts.
- Degrada a `null` honesto (caja B, no en snapshots viejos): totales de citas por clase, `sentiment.unknown`.
- Ninguna sección se elimina por `null`: el render muestra estado degradado.

### Decisiones resueltas (operador, 2026-07-04)

1. **Label de motor: CORTO.** El informe muestra "ChatGPT", "Claude", "Gemini", "Perplexity",
   "Google AI Overview" (como el mockup). Implementación: agregar `provider_display_label` (short)
   al SSOT `GH_GROWTH_AI_VISIBILITY` (`src/lib/copy/growth.ts`); Think deja de hardcodearlo.
2. **`sentiment.unknown`: NO se agrega.** No se toca el DTO por esto; el denominador honesto público
   es `evaluated`. (Queda como posible follow-up si el negocio lo pide.) → El **único** cambio de DTO
   build-time de esta task es `citationSourceBreakdown.classificationTotals` (Slice 3).
3. **Adopción en Think: incluida por instrucción del operador.** La decisión inicial era separarla,
   pero el operador pidió tomar TASK-1331 end-to-end y, si el contrato quedaba listo, adaptar Think
   en el mismo pase. El swap se limitó a consumir `model.viewFacts`, mantener fallbacks para contratos
   viejos y eliminar derivaciones semánticas locales sin rediseño visual.

### 4-pilares

- **Safety:** view-model derivado de `PublicGraderReport` (leak-safe por tipo); los 2 build-time son
  agregados (%/conteos), no evidencia. No-leak tests sobre `viewFacts`. Token = borde de acceso.
- **Robustness:** `null ≠ 0` preservado; estados de motor distinguen `not_sampled`/`no_response`/`sin mención`;
  se elimina el bug numerador-top6/denominador-global. Test: dominio fuera de top-N no corrompe totales.
- **Resilience:** derivación pura determinista sobre snapshot congelado; viejos degradan a `null`, nunca 500.
- **Scalability:** cero costo LLM, cero IO nuevo (deriva en memoria); un primitivo, muchos renders → el drift no escala con nuevos consumers.

Patrones que extiende: cómputo canónico único + muchos consumers (TASK-571), proyección leak-safe por
tipo (TASK-1235), headless render decision (Greenhouse dueño del modelo, Think tonto). No inventa primitivo nuevo.

## Implementation-ready spec (para Codex)

> Ejecutar local-first, sin push. NO tocar `efeonce-think` (adopción = follow-up `ui-ux`, decisión 3).
> NO tocar scoring/probes/normalizer/prompt-packs/`executeClaimedGraderRun`.

### Mandato duro — conservar el mockup 1:1 (invariante de la task)

El norte del operador: **nada de lo que hoy muestra el mockup `efeonce-think` puede desaparecer del
informe cuando se genere con datos reales.** Reglas:

- Cada elemento de la tabla de clasificación (Discovery arriba) debe quedar cubierto por un fact
  server-provided **o** por un estado degradado honesto explícito. **Prohibido** que un fact faltante
  se resuelva borrando la sección/fila/chip.
- Los facts derivables en lectura (clase R) **siempre** existen (corren sobre el JSON congelado) → esos
  elementos del mockup quedan garantizados para todos los reportes, viejos y nuevos.
- Los facts clase B (`citationTotals` por clase) degradan a `null` en snapshots viejos → el render
  muestra el estado degradado, no elimina el bloque.

**Contrato de estados degradados (el render NUNCA borra, muestra esto):**

| Fact | Cuando falta/`null` | Estado a mostrar |
|---|---|---|
| `engineCoverage.provider` no muestreado | roster sin ese run | fila del motor con "Sin datos" (status `not_sampled`) |
| `engineCoverage.summary.shareOfModel` | sin respuestas evaluables | "En cobertura" (no `0%`) |
| `citationTotals.{competitor,thirdParty,ugc}` | snapshot viejo | "Riesgo de dependencia: en cobertura" |
| `competitiveBenchmark` | sin competidores/menciones | bloque en estado "Sin comparables aún" |
| `sentimentFacts` | `evaluated=0`/`net=sin_dato` | "Sentimiento en cobertura" |
| `readinessSummary.agenticScore` | sin probes | "En cobertura" (no `0/100`) |
| `dimensionHighlights.*` | listas vacías | ocultar la card **solo si** su lista está vacía por dato real, con copy "Lectura pendiente" |

### Fuentes canónicas a REUSAR (no reinventar — esto mata el drift con Think)

- Roster de providers: `GROWTH_AI_VISIBILITY_PROVIDER_IDS` (`src/lib/growth/ai-visibility/contracts.ts`) = `openai, anthropic, perplexity, gemini, google_ai_overview`.
- Motor→surface: `GRADER_PROVIDER_SURFACE` + `GraderEngineSurface` (`src/lib/growth/ai-visibility/normalization/contracts.ts`).
- Labels: `GH_GROWTH_AI_VISIBILITY.provider_display_label` (NUEVO, short — decisión 1) + `surface_label` + `sentiment_net_label` + `sov` + `engineSnapshot.weakestTakeaway(name)` (`src/lib/copy/growth.ts`).
- Own-domain share GLOBAL ya existe: `citationInsight.ownDomainShare` (0-100, computado sobre findings, NO top-N). Úsalo — no recomputar sobre `topSourceDomains`.
- Totales globales de citas por clase: extender `buildCitationSourceBreakdown` (`src/lib/growth/ai-visibility/report/citation-breakdown.ts`) — la clasificación ya corre sobre TODOS los dominios antes del `.slice`.
- Attach del view-model: `baseModel` en `src/components/growth/ai-visibility/report-artifact/model.ts` (una sola derivación, todas las variants).

### Shape objetivo (supersede la "Indicative shape" del Detailed Spec; aditivo, crecer slice a slice)

```ts
// contracts.ts — additive. `displayId`/`surface` tipados desde engine-roster + normalization.
interface PublicReportViewFacts {
  engineCoverage: {                                   // Slice 2 — 100% read-time
    providers: Array<{
      providerId: GrowthAiVisibilityProviderId        // 'openai'|'anthropic'|'perplexity'|'gemini'|'google_ai_overview'
      displayId: PublicEngineDisplayId                // 'chatgpt'|'claude'|'gemini'|'perplexity'|'google_ai_overview'
      label: string                                   // corto, desde provider_display_label
      surface: GraderEngineSurface                    // 'answer_engines'|'ai_search' (reuse GRADER_PROVIDER_SURFACE)
      resolved: number | null
      present: number | null
      mentionRate: number | null
      status: 'measured_with_mentions'|'measured_without_mentions'|'no_response'|'not_sampled'|'unknown'
    }>
    summary: {
      roster: number; sampled: number; resolved: number; present: number
      shareOfModel: number | null                     // Share of Model IA = round(present/resolved*100)
      strongestDisplayId: string | null
      weakestMeasuredDisplayId: string | null
    }
  }
  citationTotals: {                                   // Slice 3 — ownDomainShare read-time; clases build-time
    totalCitations: number
    uniqueDomains: number
    ownDomainShare: number | null                     // ← citationInsight.ownDomainShare (NO top-N)
    ownDomain: number | null                          // ← classificationTotals (null en snapshots viejos)
    competitor: number | null
    thirdParty: number | null
    ugc: number | null
  }
  competitiveBenchmark: {                             // Slice 4 — 100% read-time desde competitiveSov
    totalMentions: number
    brandShare: number | null; brandRank: number | null
    leaderName: string | null; leaderMentions: number | null
    leaderGap: number | null; nextGap: number | null; leaderMultiple: number | null
    rows: Array<{ name: string; mentions: number; rank: number; isBrand: boolean; deltaVsBrand: number; sharePct: number | null }>
  }
  sentimentFacts: {                                   // Slice 5 — read-time (sin `unknown`, decisión 2)
    evaluated: number; net: SentimentNet
    positive: number; neutral: number; negative: number; mixed: number
  }
  readinessSummary: {                                 // Slice 5 — read-time
    structuralScore: number | null; agenticScore: number | null; actionGap: number | null
    structuralCoverage: { measured: number; probed: number } | null
    agenticCoverage: { measured: number; probed: number } | null
  }
  dimensionHighlights: {                              // Slice 5 — read-time; labels desde dimensions[].label del DTO
    strengths: Array<{ key: string; label: string; score: number }>
    critical: Array<{ key: string; label: string; score: number }>
    unmeasured: Array<{ key: string; label: string }>
  }
  shareFacts: {                                       // Slice 5 — read-time; strings compuestos server con copy layer
    reportUrl: string | null                          // long fallback; short = TASK-1330
    graderUrl: string
    scoreText: string; shareOfModelText: string; citabilityText: string; providersText: string
  }
}
```

Además (Slice `levels`): agregar `isNext: boolean` a `ReportArtifactLevel` (`model.ts`), derivado
determinista server (primer nivel con `severity!=='optimo'`), para sacar de Think la decisión "Empieza aquí".

### Slice 2 — engine coverage (arrancar por acá; read-time, riesgo cero, snapshot-safe)

Archivos:

- **NUEVO** `src/lib/growth/ai-visibility/report/engine-roster.ts`:
  - `PublicEngineDisplayId` = `'chatgpt'|'claude'|'gemini'|'perplexity'|'google_ai_overview'`.
  - `PROVIDER_DISPLAY_ID` `satisfies Record<GrowthAiVisibilityProviderId, PublicEngineDisplayId>` = `{ openai:'chatgpt', anthropic:'claude', gemini:'gemini', perplexity:'perplexity', google_ai_overview:'google_ai_overview' }`.
  - `PUBLIC_ENGINE_ROSTER` (orden display, answer engines primero) = `['openai','anthropic','gemini','perplexity','google_ai_overview'] as const satisfies readonly GrowthAiVisibilityProviderId[]`.
  - helper `providerSurface(id) = GRADER_PROVIDER_SURFACE[id]`.
- **MOD** `src/lib/copy/growth.ts`: agregar `provider_display_label` (short) `satisfies Record<NormalizedFindingProvider, string>` = `{ openai:'ChatGPT', anthropic:'Claude', perplexity:'Perplexity', gemini:'Gemini', google_ai_overview:'Google AI Overview', manual_import:'Evidencia cargada' }`.
- **MOD** `contracts.ts`: `import { type GraderEngineSurface } from '../normalization/contracts'`; agregar `ENGINE_COVERAGE_STATUSES` + tipos `EngineCoverageStatus/Provider/Summary/Facts` + `PublicReportViewFacts` (por ahora solo `engineCoverage`).
- **NUEVO** `src/lib/growth/ai-visibility/report/view-facts.ts`: PURO. Param estructural mínimo `{ providerPresence: ProviderPresence[]; provenance: { providersSampled: string[] } }` (así sirve Public/Client/Internal).
- **MOD** `report/index.ts` (barrel): `export * from './engine-roster'` + `export * from './view-facts'`.
- **MOD** `model.ts`: agregar `viewFacts: PublicReportViewFacts` a `ReportArtifactModel` (REQUIRED; grep primero por literales de `ReportArtifactModel` — si hay alguno fuera de `baseModel`/`modelFromInternalReport`, hacerlo opcional). Poblar `viewFacts: buildPublicReportViewFacts(report)` en `baseModel` **y** en `modelFromInternalReport`.

Lógica del builder (determinista):

| condición sobre `providerPresence[providerId]` | `status` | resolved | present | mentionRate |
|---|---|---|---|---|
| no muestreado (ni en `providerPresence` ni en `provenance.providersSampled`) | `not_sampled` | null | null | null |
| muestreado, `resolved===0` | `no_response` | 0 | 0 | null |
| `resolved>0 && present===0` | `measured_without_mentions` | n | 0 | 0 |
| `resolved>0 && present>0` | `measured_with_mentions` | n | m | `round(m/n*100)` |
| `resolved`/`present` malformado (null) | `unknown` | null | null | null |

`summary`: `roster=PUBLIC_ENGINE_ROSTER.length` · `sampled=count(status!=='not_sampled')` ·
`resolved=Σ resolved` · `present=Σ present` · `shareOfModel=resolved>0 ? round(present/resolved*100) : null` ·
`strongestDisplayId=argmax present (present>0), tiebreak mentionRate desc→orden roster` ·
`weakestMeasuredDisplayId=argmin mentionRate (resolved>0), tiebreak present asc→orden roster`. Sin `!` (usar `?? 0`).

### Tests (Slice 2) con la matemática determinista del fixture `SAMPLE_PUBLIC_REPORT`

Fixture: `providerPresence` = gemini 24/19, openai 24/18, anthropic 24/17, perplexity 24/14; **sin** `google_ai_overview`; `provenance.providersSampled` = `['gemini','openai','anthropic','perplexity']`.

- **NUEVO** `report/__tests__/view-facts.test.ts`:
  - `PUBLIC_ENGINE_ROSTER` cubre exactamente `GROWTH_AI_VISIBILITY_PROVIDER_IDS` (guard anti-drift).
  - `providers.length===5`, orden displayId = `['chatgpt','claude','gemini','perplexity','google_ai_overview']`.
  - openai/chatgpt → `measured_with_mentions` rate 75; anthropic/claude → rate 71; gemini → rate 79; perplexity → rate 58.
  - `google_ai_overview` → `not_sampled`, resolved/present/mentionRate = `null`.
  - `summary`: roster 5, sampled 4, resolved 96, present 68, **shareOfModel 71**, strongest `gemini`, weakestMeasured `perplexity`.
  - Edge no_response: presence `{ provider:'openai', resolved:0, present:0 }` → status `no_response`, mentionRate null.
  - Edge measured_without_mentions: `{ resolved:5, present:0 }` → status, rate 0.
  - Edge degradación total: `providerPresence:[]` + `providersSampled:[]` → todos `not_sampled`, shareOfModel/strongest/weakest = null.
- **MOD** `route-contract.test.ts`: assert `body.model.viewFacts.engineCoverage.providers.length===5`, displayIds incluye `chatgpt`+`claude`, `summary.shareOfModel` es número; el bloque no-leak existente (stringify) sigue verde con `viewFacts`.
- **MOD** `report-artifact-no-leak.test.tsx`: extender que `viewFacts` no introduce strings prohibidos (labels son los cortos es-CL).

### Slices 3-6 (resumen; detalle en Scope + shape arriba)

- **Slice 3:** `citationTotals`. `ownDomainShare` ← `citationInsight.ownDomainShare` (read-time). Clases ← nuevo `CitationSourceBreakdown.classificationTotals` (build-time additive en `buildCitationSourceBreakdown`, acumular por clase antes del `.slice`); read-time surface present-or-`null`. Test: dominio fuera de top-N NO corrompe totales ni own-share.
- **Slice 4:** `competitiveBenchmark` read-time desde `competitiveSov` (`brandMentions`+`competitors[]`). SoV = `brandMentions/(brandMentions+Σcompetitors)`. Reproducir rank/leaderGap/nextGap/leaderMultiple/rows del mockup (`CompetitiveBenchmark.astro` L18-54) pero server-side; narrativas compuestas con copy layer.
- **Slice 5:** `sentimentFacts` (sin `unknown`), `readinessSummary` (actionGap = structural-agentic), `dimensionHighlights` (severity optimo/critico/score null; label desde `dimensions[].label`), `shareFacts` (strings server; `reportUrl` long, short=TASK-1330; `providersText` derivado del roster real, NO string fijo). Reemplazar el verdict ESTÁTICO de readiness del mockup (L889/L894) por string compuesto desde los scores reales.
- **Slice 6:** route-contract + no-leak sobre todo el `viewFacts`; test old-snapshot (sin `classificationTotals`) → payload válido con `null` honesto, NO 500; bump `GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION` `1.0.0→1.1.0`; documentar en `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1`.

### Gates de cierre (Codex)

`pnpm typecheck` · `pnpm lint` · focales: `pnpm vitest run src/lib/growth/ai-visibility/report src/components/growth/ai-visibility/report-artifact src/app/api/public/growth/ai-visibility` · `pnpm test` (full) + `pnpm build` antes de mover a `complete/` · `pnpm task:lint --task TASK-1331` sin findings · `pnpm docs:closure-check`. No push sin confirmación del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Public view-model audit and compatibility map

- Produce a field-by-field map from current Think report sections to Greenhouse model fields.
- Classify each field as `already_modelled`, `derived_from_public_report`, `requires_new_public_aggregate`, or `must_remain_presentation_only`.
- Confirm old snapshot compatibility: what can be derived from frozen `public_report_json` and what must honestly degrade to null.
- Confirm whether `GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION` needs minor bump (expected: additive minor from `1.0.0` to `1.1.0` if public contract materially expands).

### Slice 2 — Engine coverage and Share of Model facts

- Add a canonical public view model for engine coverage, e.g. `engineCoverage`.
- Include roster/display ids for `chatgpt`, `claude`, `perplexity`, `gemini`, `google_ai_overview`, mapped from provider ids `openai`, `anthropic`, `perplexity`, `gemini`, `google_ai_overview`.
- Preserve distinct statuses:
  - `measured_with_mentions`
  - `measured_without_mentions`
  - `not_sampled`
  - `no_response`
  - `unknown`
- Include summary facts: sampled count, roster count, resolved responses, present responses, Share of Model IA, strongest engine, weakest measured engine.
- Do not make Think hardcode Claude/ChatGPT mapping as business logic after adoption.

### Slice 3 — Citation totals and source-classification integrity

- Add global classification totals to `citationSourceBreakdown` or a sibling view field:
  - `own_domain`
  - `competitor`
  - `third_party`
  - `ugc`
  - total citations
  - unique domains
- Ensure `ownDomainShare` used by public copy comes from `citationInsight.ownDomainShare`, not a recomputation over displayed top-N domains.
- Keep `domains` bounded/top-N for display; totals must cover all citation domains represented in the report aggregate.
- Add regression test showing a domain outside top-N does not corrupt own-domain share or dependency-risk totals.

### Slice 4 — Competitive benchmark view facts

- Add a server-derived competitive benchmark view model from `competitiveSov` + citation facts:
  - brand mentions
  - total competitive mentions
  - brand rank
  - leader name/mentions
  - leader gap
  - next competitor gap
  - leader multiple vs brand
  - rows sorted by rank with `isBrand`, `deltaVsBrand`, `sharePct`
- Keep the metric named Share of Voice (SoV) only for competitive presence, not per-engine presence.
- Do not change how `competitiveSov` is scored or populated.

### Slice 5 — Sentiment, readiness, dimensions and share facts

- Harden `sentimentSummary` display facts:
  - evaluated mentions
  - optional unknown/unclassified count if derivable
  - net tone
  - denominator wording for public copy.
- Add `readinessSummary` view facts:
  - structural score/coverage
  - agentic score/coverage
  - action gap
  - labels for the three-step "leer -> validar -> ejecutar" narrative.
- Add `dimensionHighlights`:
  - strengths
  - critical gaps
  - unmeasured dimensions
  - primary strength/gap/pending when available.
- Add `shareFacts` without short URL dependency:
  - score text
  - Share of Model text
  - citability text
  - provider list text
  - grader URL
  - report URL long fallback.
- Leave actual short URL generation to TASK-1330.

### Slice 6 — Route contract, no-leak and consumer adoption plan

- Update route contract tests for the additive view-model.
- Extend no-leak tests for new fields.
- Verify old snapshots still return a valid payload with honest nulls.
- Decide in Discovery whether Think consumption happens in this task or a follow-up `ui-ux/standard` task. If included, keep it limited to deleting local semantic derivations and consuming new fields; no visual redesign.

## Out of Scope

- No scoring changes.
- No prompt-pack/provider/probe changes.
- No migration/backfill unless Discovery proves a non-derivable field is required; then create a separate task.
- No rewrite of `MaturityLadder`.
- No raw evidence exposure.
- No short-link implementation; that is TASK-1330.
- No new public landing or form work; that remains TASK-1327.
- No production release without explicit confirmation.

## Detailed Spec

Target additive shape can be implemented either directly on `ReportArtifactModel` or under a namespaced field such as `publicWebFacts`. Prefer namespacing if the fields are specifically for public render readability and not needed by every artifact variant.

Indicative shape:

```ts
interface PublicReportViewFacts {
  engineCoverage: {
    providers: Array<{
      providerId: 'openai' | 'anthropic' | 'perplexity' | 'gemini' | 'google_ai_overview'
      displayId: 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'google_ai_overview'
      label: string
      surface: 'answer_engines' | 'ai_search'
      resolved: number | null
      present: number | null
      mentionRate: number | null
      status: 'measured_with_mentions' | 'measured_without_mentions' | 'not_sampled' | 'no_response' | 'unknown'
    }>
    summary: {
      sampled: number
      roster: number
      resolved: number
      present: number
      shareOfModel: number | null
      strongestDisplayId: string | null
      weakestMeasuredDisplayId: string | null
    }
  }
  citationTotals: {
    totalCitations: number
    uniqueDomains: number
    ownDomain: number
    competitor: number
    thirdParty: number
    ugc: number
    ownDomainShare: number | null
  }
  competitiveBenchmark: {
    totalMentions: number
    brandShare: number | null
    brandRank: number | null
    leaderName: string | null
    leaderMentions: number | null
    leaderGap: number | null
    nextGap: number | null
    leaderMultiple: number | null
    rows: Array<{ name: string; mentions: number; rank: number; isBrand: boolean; deltaVsBrand: number; sharePct: number | null }>
  }
  sentimentFacts: {
    evaluated: number
    unknown: number | null
    net: SentimentNet
  }
  readinessSummary: {
    structuralScore: number | null
    agenticScore: number | null
    actionGap: number | null
    structuralCoverage: { measured: number; probed: number } | null
    agenticCoverage: { measured: number; probed: number } | null
  }
  dimensionHighlights: {
    strengths: Array<{ key: string; label: string; score: number }>
    critical: Array<{ key: string; label: string; score: number }>
    unmeasured: Array<{ key: string; label: string }>
  }
  shareFacts: {
    reportUrl: string | null
    graderUrl: string
    scoreText: string
    shareOfModelText: string
    citabilityText: string
    providersText: string
  }
}
```

The final implementation may choose narrower field names, but must satisfy the acceptance criteria and keep the contract public-safe.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (audit/map) -> Slice 2 (engine coverage) -> Slice 3 (citation totals) -> Slice 4 (competitive facts) -> Slice 5 (sentiment/readiness/dimensions/share facts) -> Slice 6 (route tests + consumer adoption plan).
- Do not update Think to consume a field until the Greenhouse route contract test proves it.
- Do not bump public model version until the final field set is decided.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Think sigue derivando metricas desde top-N y muestra datos inconsistentes | public-site | medium | server-side `citationTotals` + test top-N | visual/report smoke mismatch |
| Additive field leaks internal evidence | public API | low | no-leak tests on route payload + model | route-contract no-leak failure |
| Old snapshot lacks enough data for a new fact | public report | medium | honest null + compatibility test; separate backfill task if needed | old-token smoke returns 500 |
| Provider display roster drifts from runtime provider ids | data contract | medium | canonical provider/display mapping in Greenhouse | engineCoverage snapshot test failure |
| Model version change breaks Think | public-site | low | additive minor, fallback consumer, coordinated deploy | Think build/smoke failure |

### Feature flags / cutover

- No feature flag expected for additive route/model fields.
- If Think consumption is included, keep long-field fallbacks for one release.
- Production enablement completed 2026-07-04 after explicit operator confirmation to promote the mockup into the final user-facing report.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | docs/test-only revert | <5 min | si |
| Slice 2 | remove additive `engineCoverage` field or keep unused | <10 min | si |
| Slice 3 | remove additive `citationTotals` field or keep unused | <10 min | si |
| Slice 4 | remove additive `competitiveBenchmark` field or keep unused | <10 min | si |
| Slice 5 | remove additive facts or keep unused | <10 min | si |
| Slice 6 | revert consumer adoption; route remains backward compatible | <10 min | si |

### Production verification sequence

1. Fetch `GET /api/public/growth/ai-visibility/report/[token]` for one safe token.
2. Confirm old keys still exist: `report`, `model`, `modelVersion`, `header`, `runPublicId`, `asOf`, `expiresAt`.
3. Confirm new view facts exist or return honest nulls.
4. Confirm no forbidden fields/strings in payload.
5. Open Think report and verify Share of Model, citation totals and competitive block match server-provided facts.
6. Confirm old long URL and PDF endpoint still work.

### Out-of-band coordination required

- Coordinate with `/Users/jreye/Documents/efeonce-think` only after Greenhouse route contract is green.
- If a real short URL is needed in `shareFacts`, block that part on TASK-1330 instead of inventing placeholder links.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como se que termino?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] A section-by-section data map exists in the task plan or docs, covering hero, executive evidence, Share of Model, sentiment, source map, competitive SoV, readiness, ladder, recommendations, dimensions, share widget and PDF/download actions.
- [x] `ReportArtifactModel` or a namespaced public view-model exposes canonical engine coverage facts including ChatGPT/OpenAI and Claude/Anthropic mapping.
- [x] Share of Model IA is server-derived and Think no longer needs a hardcoded engine roster for the metric.
- [x] Citation class totals are global, not derived from displayed top-N domains.
- [x] Own-domain share shown in public copy comes from `citationInsight.ownDomainShare` or a server-derived equivalent.
- [x] Competitive benchmark facts are server-derived from `competitiveSov` and include rank/gap/multiple/rows.
- [x] Sentiment/readiness/dimension/share facts are either server-derived or explicitly marked presentation-only with rationale.
- [x] Old public snapshots remain readable; missing new facts degrade to null/empty safe states, not 500.
- [x] Public route payload no-leak tests cover new fields.
- [x] The public model version policy is documented; additive minor bump applied if required.
- [x] No scoring, normalizer, provider adapter, probe or `executeClaimedGraderRun` behavior changes.
- [x] Docs, lifecycle, handoff and changelog are synchronized for production completion.

## Verification

- `pnpm task:lint --task TASK-1331` — OK
- `pnpm ops:lint --changed` — OK
- `pnpm docs:closure-check` — OK after ADR/changelog/handoff sync
- `pnpm lint` — OK
- `pnpm typecheck` — OK
- `pnpm build` — OK; preexisting Turbopack warning on roadmap reader broad pattern only
- `pnpm exec vitest run src/lib/growth/ai-visibility/report/__tests__/view-facts.test.ts src/lib/growth/ai-visibility/__tests__/citation-breakdown.test.ts src/components/growth/ai-visibility/report-artifact/__tests__/report-artifact-no-leak.test.tsx 'src/app/api/public/growth/ai-visibility/report/[token]/__tests__/route-contract.test.ts'` — 4 files / 24 tests passed
- `pnpm exec vitest run src/lib/growth/ai-visibility/report src/components/growth/ai-visibility/report-artifact src/app/api/public/growth/ai-visibility` — 5 files / 27 tests passed
- `pnpm test` — 1243 files / 8745 tests passed
- Think: `pnpm type-check` — OK (1 existing `document.execCommand` deprecation hint)
- Think: `pnpm build` — OK
- Think: `node scripts/verify-report.mjs http://127.0.0.1:4322/brand-visibility/r/mock-token task1331-viewmodel-adoption` — OK in 1440/1280/390; HTTP 200, `scrollWidth == clientWidth`, no internal leak patterns
- Greenhouse production: PR #141 `develop -> main` squash merged as `4885a5de3ccdbf0457f7248186597b8d6c53da86`; `main` CI, CI Deep Verification, Task Contract and CLAUDE governance passed.
- Greenhouse release control plane: `Production Release Orchestrator` run `28697002045` completed success; preflight passed with documented bypass only for the expected `playwright_smoke` warning on the squash SHA, Production approvals applied, Vercel production READY, workers/health passed, and manifest transitioned to `released`.
- Think production: `/Users/jreye/Documents/efeonce-think` commit `50811d0dfd3d45b9d26532ced3d79030fec5bf04` pushed to `main`; Vercel production deploy `efeonce-think-rmp89p7lv-efeonce-7670142f.vercel.app` Ready.
- Production runtime smoke: `node scripts/verify-report.mjs https://think.efeoncepro.com/brand-visibility/r/<real-token> task1331-prod-final` — OK in 1440/1280/390; HTTP 200, `scrollWidth == clientWidth`; captures saved under `/Users/jreye/Documents/efeonce-think/.captures/task1331-prod-final-*.png`.
- Production API smoke: `GET https://greenhouse.efeoncepro.com/api/public/growth/ai-visibility/report/<real-token>` returned `modelVersion: "1.1.0"`, `model.viewFacts` present, `citationTotals.totalCitations=24`, `competitiveBenchmark.rows=1`, and no `rawProviderResponse`, `answer_text` or `prompt_text` leaks.
- Runtime/env caveat: local `pnpm migrate:status`/`pnpm pg:connect:status` could not complete because local GCP CLI + ADC credentials are expired and require browser reauth. No migrations or secret/env changes are part of TASK-1331; release control plane preflight used CI WIF credentials successfully.

## Closing Protocol

- [x] `Lifecycle` synchronized with real status.
- [x] File moved to correct lifecycle folder.
- [x] `docs/tasks/README.md` synchronized.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` synchronized.
- [x] `Handoff.md` updated.
- [x] `changelog.md` updated if behavior ships.
- [x] Architecture docs updated if the public contract shape changes.
- [x] Production rollout state documented; no prod release without explicit confirmation.
