# TASK-947 — Nexa Insights detail page canonical (`/nexa/insights/[id]`)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|delivery|reliability`
- Blocked by: `none` (TASK-941/942/943 ya entregaron el motor backend canonical)
- Branch: `develop` (operador-decision, sin branch dedicada)
- Legacy ID: `none`
- GitHub Issue: `none`
- Cross-ref: `TASK-696` (drift fuente — construyó el CTA sin la página), `TASK-449` (interaction layer dependiente), `TASK-944` / `TASK-945` / `TASK-946` (composables), `TASK-943` (append-only event log canonical), `ISSUE-082` (bug class raíz UX)

## Summary

Cerrar el bug class **404 sistemático en `/agency/insights/EO-AIE-*`** (Vercel staging confirmado live 2026-05-28) creando la página detail canonical de Nexa Insights bajo `/nexa/insights/[id]` — top-level cross-domain, NO bajo `/agency/...`. Resuelve el drift TASK-696 (CTA shipped sin página destino) + desbloquea TASK-449/944/945 + canoniza el routing para los Weekly Digest emails que ya emiten links + canoniza los 12 UI states honest-degradation (TASK-946 framework).

## Why This Task Exists

Auditoría live 2026-05-28 (post-TASK-943 verification):

1. `HomeAiInsightsBento.drillHref = '/agency/insights/${enrichmentId}'` (load-ai-insights-bento.ts:64).
2. `src/app/(dashboard)/agency/insights/[id]/page.tsx` **NO existe** (verificado: 0 hits).
3. Click "Ver causa raíz" en Home → 404 con avatar Vuexy y "Page Not Found".
4. El mismo 404 ocurre desde 5 surfaces (Home / Agency ICO / Person 360 / Space 360 / Finance) — todas heredan el `drillHref` roto de TASK-696.
5. Weekly Executive Digest email + Teams notifications ya envían deep-links a insights → todos rompen.
6. TASK-449 Delta 2026-04-26 documentó explícitamente: "TASK-696 entregó la superficie ejecutable con drill-in ... y route a `/agency/insights/<id>`" — pero el destino nunca se materializó.

Decisión arquitectónica canonical (post arch-architect + greenhouse-ico 4+5-pillar eval, 2026-05-28): no es Agency-owned, es cross-domain. Routing top-level `/nexa/insights/[id]` es el contrato canonical correcto.

## Architecture Alignment

Revisar y respetar:

- `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (Delta 2026-05-28 canoniza routing top-level).
- `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` Delta 2026-05-28 (TASK-943 append-only event log — VIEW canonical `ai_signals_current`).
- `DECISIONS_INDEX.md` entry "Nexa Insights detail routing canonical" (creada en este task).
- `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (TASK-611) — patrón fuente para "detail page server-side con projection + 4-state degraded honest".
- TASK-873 (capability runtime grant invariant) — capability MUST tener grant en `runtime.ts` mismo PR.
- TASK-946 framework (12 canonical UI states honest degradation).
- CLAUDE.md "Nexa AI Signals append-only event log invariants (TASK-943)" — hard rules contra read directo de raw `ai_signals`.

Reglas obligatorias (extendidas en §Hard rules):

- Routing canonical `/nexa/insights/[id]` top-level (NO `/agency/insights/...`).
- Capability dedicada `nexa.insights.read`, NO heredada de route_group.
- Helper canonical único reusable cross-surface (`readNexaInsightDrill`).
- 12 UI states canonical explícitos, NUNCA colapsar a "Sin datos" ambiguo.
- `notFound()` (NO 403) cuando subject no autorizado (anti-oracle TASK-872 pattern).

## Open Questions resueltas pre-execution

| Q | Resolución | Rationale |
|---|---|---|
| ¿URL bajo `/agency/insights/` o top-level? | **Top-level `/nexa/insights/[id]`** | Nexa Insights se renderea en 5 surfaces (Home, Agency, Person 360, Space 360, Finance) que viven en route_groups distintos; anclar a `/agency/...` fuerza cross-tenant violations. Top-level + capability dedicada es canonical. Mirror del precedente `/admin/...` (lane cross-domain, no dominio). |
| ¿Drill key `enrichment_id` o `signal_id`? | **Dual con dispatch prefix**: `EO-AIS-*` → signal-anchored (default cards); `EO-AIE-*` → enrichment-anchored (share permalinks de TASK-449) | TASK-943 append-only: `signal_id` es estable cross-period (correcto para "Ver causa raíz" del current); `enrichment_id` es snapshot específico (correcto para share semantics "esto vio el operador"). Cards default = signal_id; share button = enrichment_id explícito. |
| ¿Capability nueva o reusar existente? | **Nueva dedicada `nexa.insights.read`** (module `delivery`, scope `tenant`) | Granular (decisión canonical #7), NO heredar de route_group. Grant dual-plane TASK-873: catalog + runtime mismo PR + smoke E2E. |
| ¿Helper canonical centralizado o per-surface? | **Único** `readNexaInsightDrill(id, subject)` server-only con dispatch prefix + 3-tier lookup current→history→notFound + subject-aware filter | Single source of truth canonical (decisión #4). Habilita TASK-945 timeline + TASK-449 share + TASK-944 Finance alias sin duplicación. |
| ¿Cómo manejar enrichment superseded? | **Banner amber + link al signal_id current** (NO redirect transparente) | Share semantics preservadas: el operador que compartió un link específico debe ver lo que vio, con contexto histórico explícito. |
| ¿403 o 404 cuando subject sin acceso? | **`notFound()` siempre** + signal observability vía `captureWithDomain('home', warn, ...)` | Anti-oracle de existencia (mirror RCA TASK-872). 403 leakea info al atacante; legítimos bloqueados se detectan en Sentry. |
| ¿Mismo path para Finance signals `EO-FAIE-*`? | **Alias `/finance/insights/[id]`** reusa el mismo shell con helper sibling Finance | Path Finance `finance_ai_signals` canonical separado preservado. Single shell, dispatch por dominio dentro del loader. |
| ¿Cache HTTP en el page? | **`Cache-Control: private, max-age=60`** + revalidate al cron diario | TASK-943 cron ya escribe 1x/día; cache 60s es safe + reduce queries PG. |
| ¿Cambiar `drillHref` en las 5 surfaces ahora? | **Sí, mismo PR del V1 MVP** | Drift fix end-to-end. Hotfix puente (disable tooltip "Próximamente") solo si se difiere V1. |

## Dependencies & Impact

### Depends on

- `TASK-941` / `TASK-942` / `TASK-943` (motor backend canonical — todas ✅ COMPLETE 2026-05-28).
- `TASK-873` (capability runtime grant invariant — pattern canonical mandatory).
- `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` Delta 2026-05-28 (routing canonical).

### Unlocks

- `TASK-449` — Nexa Insights Interaction Layer (Read/Pin/Dismiss/Share desde el detail page).
- `TASK-944` — Finance Nexa Insights timeline toggle (alias `/finance/insights/[id]`).
- `TASK-945` — Signal lifecycle timeline + sparkline (embebido en detail page).
- `TASK-946` — Honest degradation 12 UI states (canonizado en el detail page para reusar en las 5 surfaces).
- Weekly Executive Digest email deep-links (funcionales por primera vez).
- Teams notifications deep-links (TASK-716 notification hub).

### Files owned

- `src/app/(dashboard)/nexa/insights/[id]/page.tsx` — NEW (server page).
- `src/app/(dashboard)/nexa/insights/[id]/loading.tsx` — NEW.
- `src/app/(dashboard)/nexa/insights/[id]/error.tsx` — NEW.
- `src/app/(dashboard)/nexa/insights/[id]/not-found.tsx` — NEW.
- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` — NEW (helper canonical).
- `src/lib/home/loaders/load-ai-insights-bento.ts` — MODIFY (drillHref → `/nexa/insights/${signalId}`).
- 4 surfaces mirror update (Agency ICO `aiLlm.totals`, Person 360 narrative, Space 360 overview, Finance dashboard).
- `migrations/*` — NEW (seed `nexa.insights.read` en `capabilities_registry`).
- `src/config/entitlements-catalog.ts` — MODIFY (extender enum + entry catalog).
- `src/lib/entitlements/runtime.ts` — MODIFY (grant dual-plane mismo PR — invariant TASK-873).
- `src/lib/reliability/queries/home-insights-drill-404-rate.ts` — NEW V1.1 (signal canonical).
- `src/views/greenhouse/nexa/insights/NexaInsightDetailView.tsx` — NEW (componente reusable shell).

## Current Repo State

### Already exists

- VIEW `ai_signals_current` + `ai_prediction_log_current` (TASK-943).
- PG serving `greenhouse_serving.ico_ai_signals` + `ico_ai_signal_enrichments` + `ico_ai_signal_enrichment_history` (TASK-914 append-only history).
- Helper `readTopAiLlmEnrichments` en `src/lib/ico-engine/ai/llm-enrichment-reader.ts` (lista current top-N por período).
- `HomeAiInsightsBento` + `HomeAiBriefing` (TASK-696 surfaces).
- `IcoAdvisoryBlock` / `NexaInsightsBlock` (Agency surfaces).
- Pattern fuente TASK-611: `resolveOrganizationWorkspaceProjection` (server-side projection composer + degraded honest + cache TTL 30s).

### Gap

- Page detail `/nexa/insights/[id]/page.tsx` no existe (drift TASK-696).
- Helper canonical `readNexaInsightDrill(id, subject)` con dispatch prefix + 3-tier lookup no existe.
- Capability `nexa.insights.read` no existe.
- 5 `drillHref` apuntan a `/agency/insights/${enrichmentId}` (URL canonical incorrecta + drill key incorrecta).
- Reliability signal `home.insights.drill_404_rate` no existe.

## Scope

### Slice 0 — Spec + Delta canonical (este task crea los specs como ADR-track antes de código)

- Crear este spec.
- Delta a `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` canonizando routing top-level + dispatch prefix + 12 UI states + capability dedicada.
- Entry en `DECISIONS_INDEX.md`.
- Deltas a TASK-449 / TASK-944 / TASK-945 / TASK-946 marcando convergencia al canonical `/nexa/insights/[id]`.

### Slice 1 — Capability + helper canonical

- Migration: seed `nexa.insights.read` en `capabilities_registry` (module `delivery`, action `read`, scope `tenant`).
- `entitlements-catalog.ts`: agregar entry al union + catalog.
- `runtime.ts`: grant dual-plane (EFEONCE_ADMIN + FINANCE_ADMIN + HR_MANAGER + DEVOPS_OPERATOR + assigned member scope-filtered) — **mismo PR** (invariant TASK-873).
- Helper `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`:
  - `readNexaInsightDrill(id: string, subject: TenantEntitlementSubject) → Promise<NexaInsightDrillResult>`
  - Dispatch prefix:
    - `id.startsWith('EO-AIS-')` → signal-anchored: lookup en `ico_ai_signals` PG serving → resolve latest enrichment via `ico_ai_signal_enrichments`.
    - `id.startsWith('EO-AIE-')` → enrichment-anchored: 3-tier lookup `ico_ai_signal_enrichments` (current) → `ico_ai_signal_enrichment_history` (TASK-914) → notFound.
  - Subject-aware filter: si subject no es EFEONCE_ADMIN y no es assigned member del space_id/member_id del insight → `state: 'not_found'`.
  - Discriminated union return: `{state: 'current' | 'superseded' | 'expired' | 'not_found' | 'degraded'}`.
- Tests focal + smoke contra PG live.

### Slice 2 — Server page canonical

- `src/app/(dashboard)/nexa/insights/[id]/page.tsx`:
  - `requireServerSession` + `can(subject, 'nexa.insights.read', 'read', 'tenant')` + `notFound()` anti-oracle.
  - Invoca `readNexaInsightDrill(id, subject)`.
  - Render según discriminated union → componente shell `NexaInsightDetailView`.
- `loading.tsx` + `error.tsx` + `not-found.tsx` canonical Next.js App Router.
- `Cache-Control: private, max-age=60` en headers del page.
- Microcopy via `getMicrocopy()` + nomenclature (decisión TASK-265).

### Slice 3 — UI states canonical (12 framework TASK-946)

| Loader state | UI state TASK-946 | Render |
|---|---|---|
| `current` | `ready` | Full: narrativa + lifecycle timeline placeholder + recommended action + related |
| `superseded` | `ready` + `partial` banner | Banner amber "versión histórica del <fecha>" + CTA al signal_id current |
| `expired` (signal resolved) | `empty-positive` | "Anomalía resuelta el <fecha>. Sin acción pendiente." |
| `not_found` | `notFound()` | Página `not-found.tsx` semántica |
| `degraded` (pg_stale) | `stale` | Banner rojo "Última actualización: hace X horas" + link `/admin/operations` |
| `degraded` (history_unavailable) | `degraded` | Render parcial: narrativa current; timeline placeholder |
| Loader throws | `error` | `error.tsx` Next.js |
| In-flight | `loading` | `loading.tsx` skeleton dimensionado |

### Slice 4 — Update drillHref en 5 surfaces

- `src/lib/home/loaders/load-ai-insights-bento.ts:64` → `/nexa/insights/${row.signalId}`.
- Mirror en Agency ICO `aiLlm.totals` consumers.
- Mirror en Person 360 narrative cards.
- Mirror en Space 360 overview cards.
- Mirror en Finance dashboard (con dispatch a `EO-FAIE-*` ID).
- "Ver todos los insights del mes" CTA → `/nexa/insights` (lista — out of scope V1, queda como follow-up V1.1).

### Slice 5 — Reliability signal canonical (V1.1, separable)

- `src/lib/reliability/queries/home-insights-drill-404-rate.ts`:
  - kind=`drift`, subsystem rollup `delivery`.
  - Severity: warning >0.5% requests/24h, error >5%.
  - Steady=0 post-deploy.
  - Detecta drift entre links emitidos (Bento + Digest emails + Teams) y enrichments accesibles.
- Reader + wire-up en `get-reliability-overview.ts`.
- Tests focal.

### Slice 6 — Smoke E2E + docs funcional

- Smoke Playwright + agent auth: click "Ver causa raíz" en Home → page renderiza con narrativa correcta.
- Smoke share permalink: enrichment_id superseded → banner amber + link al current funciona.
- Smoke degraded: forzar `pg_serving_stale` con mock → render correcto.
- `docs/documentation/plataforma/nexa-insights-detail.md` (NEW) — doc funcional para operadores.
- `docs/manual-de-uso/plataforma/ver-detalle-nexa-insight.md` (NEW) — manual de uso operador.

## Out of Scope V1

- Lista `/nexa/insights` (sin id) — follow-up V1.1.
- TASK-449 acciones inline (Read/Pin/Dismiss/Share) — V1.3 dependiente.
- TASK-945 lifecycle timeline embebido — V1.2 dependiente.
- Time-travel `?at=YYYY-MM-DD` — V1.2 con TASK-945.
- Versionado URL `/nexa/v1/...` — sin prefix V1; bump si shape breaking.
- Acceso `client_users` externos al detail (capability scope `tenant` = internal only V1).
- Cross-link CTA al chat drawer TASK-698 — V1.3.

## Acceptance Criteria

- [ ] Click "Ver causa raíz" en Home Nexa Insights bento → page renderiza correctamente (no más 404).
- [ ] URL canonical `/nexa/insights/[id]` con dispatch prefix funcional (signal-anchored cards + enrichment-anchored permalinks).
- [ ] Capability `nexa.insights.read` seed en DB + grant en `runtime.ts` mismo PR + smoke E2E verde (invariant TASK-873).
- [ ] Helper `readNexaInsightDrill` con 3-tier lookup + subject-aware filter + 5 states discriminated union.
- [ ] 8 UI states canonical mapeados explícitamente (TASK-946 framework) sin colapsar a "Sin datos" ambiguo.
- [ ] `notFound()` cuando subject sin acceso (NO 403 — anti-oracle TASK-872 pattern).
- [ ] 5 surfaces actualizadas con `drillHref` → `/nexa/insights/${signalId}` (NO `enrichmentId`).
- [ ] Smoke E2E Playwright cubre golden path + edge cases (superseded + not_found + degraded).
- [ ] Doc funcional + manual de uso shipped.
- [ ] (V1.1) Signal `home.insights.drill_404_rate` operativo + wire-up reliability dashboard.

## Verification

- `pnpm pg:doctor` + `pnpm migrate:status`.
- `pnpm vitest run src/lib/ico-engine/ai/nexa-insight-drill-reader src/app/api`.
- `pnpm exec tsc --noEmit --pretty false`.
- `pnpm lint`.
- `pnpm build` (Turbopack production — TASK-827 closing gate canonical).
- `pnpm test` (full suite — closing gate canonical).
- Playwright smoke E2E (agent auth + Vercel staging bypass): 1 click "Ver causa raíz" → page renders + screenshot verification.
- Post-deploy: 4 Cloud Run workers verificados en SHA (invariant CLAUDE.md "Post-push verificación obligatoria").

## Closing Protocol

- [ ] Lifecycle complete + mover a `complete/`.
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`.
- [ ] `Handoff.md` + `changelog.md` con cierre.
- [ ] Spec `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` Delta canonical aplicado.
- [ ] CLAUDE.md sección "Nexa Insights detail page invariants" (hard rules canonical).
- [ ] `DECISIONS_INDEX.md` entry status `Accepted` (de `Accepted (V1 spec)` a `Accepted (SHIPPED ...)`).
- [ ] Cross-impact aplicado: TASK-449 / TASK-944 / TASK-945 / TASK-946 marcan dependency satisfecha.

## Pillars (4-pillar arch overlay)

| | |
|---|---|
| **Safety** | Capability gate canonical server-side + subject-aware filter + `notFound()` anti-oracle. Blast radius si fail: 1 insight visible a 1 user; NO mass leak (per-id read). |
| **Robustness** | Discriminated union return forza al consumer manejar 5 states. 3-tier lookup determinístico. CHECK constraint en `id` shape. Append-only fuente garantiza idempotencia. |
| **Resilience** | History append-only (TASK-914) habilita query temporal "qué severity había en `t`". `captureWithDomain('home', ...)`. Signal `home.insights.drill_404_rate` cubre drift. Degradación honesta server-side (`notFound()` semántico vs 500). |
| **Scalability** | O(1) lookup por PK. `Cache-Control: private, max-age=60` HTTP cache. Permalink shareable elimina round-trip por click. Lineal con N enrichments/month. |

## Hard rules canonical (anti-regresión)

- **NUNCA** crear detail page de Nexa Insights bajo route_group de dominio (`/agency/...`, `/finance/...`, `/people/...`). Canonical = `/nexa/insights/[id]` top-level.
- **NUNCA** consumer downstream compone su propio drawer/modal/detail. Toda navegación pasa por `/nexa/insights/[id]`.
- **NUNCA** crear URLs canonical ancladas al `enrichment_id` para cards "Ver causa raíz" current. Cards usan `signal_id`. `enrichment_id` reservado para share/forensic.
- **NUNCA** retornar `403` desde el detail page cuando subject sin acceso. `notFound()` siempre (anti-oracle TASK-872).
- **NUNCA** read directo de `ico_engine.ai_signals` raw ni `ico_ai_signal_enrichments` PG. Pasa por `readNexaInsightDrill`. VIEW canonical TASK-943.
- **NUNCA** colapsar UI states `not_found` + `expired` + `superseded` + `stale` en un único "Sin datos". Mapping explícito TASK-946 framework.
- **NUNCA** mostrar narrativa superseded sin banner explícito "versión histórica del <fecha>".
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'home', { tags: { source: 'nexa_insight_detail', stage: '...' } })`.
- **NUNCA** seed `nexa.insights.read` en TS catalog sin grant en `runtime.ts` mismo PR (invariant TASK-873). Smoke E2E obligatorio.
- **NUNCA** emit URL `/agency/insights/*` desde loader/componente nuevo. Canonical `/nexa/insights/[id]`.
- **NUNCA** romper el dispatch prefix `EO-AIS-*` / `EO-AIE-*` en el resolver. Semántica anchor estable vs snapshot share-friendly.
- **SIEMPRE** que email/Teams notification incluya link a insight, usar `/nexa/insights/[id]` (estable cross-time + cross-tenant + cross-domain).
- **SIEMPRE** que emerja consumer cross-surface nuevo que necesite "detail de un Nexa Insight", navegar al canonical — cero composición ad-hoc.
- **SIEMPRE** que el LLM-enrichment-worker regenere un enrichment, el URL `/nexa/insights/EO-AIS-*` sigue válido apuntando al current.
