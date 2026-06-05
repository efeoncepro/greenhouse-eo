# TASK-1027 — My Performance rich self-service activity runtime

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[none]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|delivery|ico|nexa|identity|api`
- Blocked by: `none`
- Branch: `task/TASK-1027-my-performance-rich-self-service-activity`
- Legacy ID: `[none]`
- GitHub Issue: `[none]`

## Summary

Enriquecer `/my/performance` para que el colaborador vea sus métricas ICO y Nexa insights con una experiencia comparable a `People > Person 360 > Actividad`, pero self-scoped, redacted y escrita como coaching operativo personal. La UI debe consumir un DTO explícito de `/api/my/performance`, sin abrir endpoints admin ni aceptar `memberId` desde el cliente.

## Why This Task Exists

Person 360 Activity ya muestra una lectura rica de la actividad de una persona: Nexa insights, KPIs ICO, tendencias OTD/FTR, radar, CSC distribution y estados honestos. La vista colaborador `/my/performance` existe y está gateada por `mi_ficha.mi_desempeno`, pero quedó como una versión pobre y con riesgo de drift. El colaborador debe poder ver sus propias señales con la misma calidad, sin heredar navegación, lenguaje ni datos admin.

## Goal

- Convertir `/my/performance` en la superficie self-service canónica de actividad/desempeño personal.
- Reutilizar data sources y componentes de Person 360 Activity sin duplicar lógica ni abrir endpoints broad.
- Garantizar anti-IDOR, redacción de campos sensibles, menciones seguras y estados honestos para períodos parciales/degradados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`

Reglas obligatorias:

- `/api/my/performance` debe resolver el sujeto con `requireMyTenantContext()`; no aceptar `memberId`, `identityProfileId` ni target scope desde URL/query/body.
- La UI debe consumir un DTO self-service explícito, no pasar raw `PersonIntelligenceSnapshot` con datos de costo/compensación.
- Nexa en `/my/performance` es advisory-only; no crea evaluaciones HR, feedback formal, payroll inputs ni writebacks.
- Las menciones Nexa en `/my` deben ser access-aware: chip no navegable por defecto si la ruta destino no está autorizada.
- Todo copy reusable debe vivir en `src/lib/copy/*`; JSX solo puede tener literales locales de bajo reuse.

## Normative Docs

- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

## Dependencies & Impact

### Depends on

- Runtime existente de `/my/performance`:
  - `src/app/(dashboard)/my/performance/page.tsx`
  - `src/app/api/my/performance/route.ts`
  - `src/views/greenhouse/my/MyPerformanceView.tsx`
- Runtime existente de Person 360 Activity:
  - `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
  - `src/app/api/people/[memberId]/intelligence/route.ts`
- Readers existentes:
  - `src/lib/person-360/get-person-ico-profile.ts`
  - `src/lib/person-360/get-person-operational-serving.ts`
  - `src/lib/person-intelligence/store.ts`
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
- Components existentes:
  - `src/components/greenhouse/NexaInsightsBlock.tsx`
  - `src/components/greenhouse/NexaMentionText.tsx`
  - `src/components/greenhouse/primitives`

### Blocks / Impacts

- Cierra la deuda histórica de `TASK-080` ("Integrar en MyPerformanceView como data source mejorada").
- Impacta futuras superficies first-party app que quieran exponer performance personal; el reader debe quedar reusable.
- Puede requerir ampliar `NexaMentionText` o un wrapper seguro para otros consumers self-service.

### Files owned

- `src/app/(dashboard)/my/performance/page.tsx`
- `src/app/api/my/performance/route.ts`
- `src/views/greenhouse/my/MyPerformanceView.tsx`
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
- `src/components/greenhouse/NexaMentionText.tsx`
- `src/components/greenhouse/NexaInsightsBlock.tsx`
- `src/lib/copy/`
- `src/lib/person-360/get-person-ico-profile.ts`
- `src/lib/person-intelligence/store.ts`
- `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/tasks/to-do/TASK-1027-my-performance-rich-self-service-activity.md`

## Current Repo State

### Already exists

- `/my/performance` page guard usa `mi_ficha.mi_desempeno` con fallback route group `my`.
- `/api/my/performance` usa `requireMyTenantContext()` y resuelve `memberId` desde la sesión.
- `PersonActivityTab` ya implementa la experiencia rica de Actividad para operadores.
- `readMemberAiLlmSummary(memberId, year, month)` ya expone Nexa insights filtrados por `member_id + period`.
- `NexaInsightsBlock` ya soporta timeline, root cause, lifecycle sparkline y honest degradation.

### Gap

- `/my/performance` no muestra Nexa insights ni la composición rica de Actividad.
- El endpoint self-service devuelve objetos internos (`intelligence`, `intelligenceTrend`) que pueden incluir campos no apropiados para el DTO colaborador.
- `NexaMentionText` asume links a `/people` y `/agency/spaces`, lo cual no es seguro para `/my` sin access-aware rendering.
- La UI actual no distingue suficientemente período en curso, muestra pequeña, no cierres, stale/degraded y empty-positive.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Self-service performance DTO

- Rediseñar `/api/my/performance` para aceptar solo `year`/`month` opcionales y resolver siempre el sujeto desde `requireMyTenantContext()`.
- Componer server-side los readers existentes (`getPersonIcoProfile`/snapshot, `getPersonOperationalServing`, `readPersonIntelligenceTrend`, `readMemberAiLlmSummary`) y devolver un DTO explícito para colaborador.
- Redactar del DTO campos de costo/compensación y cualquier identificador interno no necesario para render.
- Incluir `meta.degradedSources[]`, freshness/materialized timestamps y estado de período (`current_partial`, `closed_snapshot`, `no_data`, `degraded`).

### Slice 2 — Safe Nexa mentions for self-service

- Extender `NexaMentionText` o crear wrapper/prop safe-mode para permitir menciones no navegables o access-aware.
- En `/my/performance`, no linkear a `/people/[memberId]` ni `/agency/spaces/[id]` salvo que el usuario tenga acceso real a esas superficies.
- Mantener labels humanos y sanitizados; nunca mostrar IDs técnicos como fallback visible.
- Agregar tests de render para chips navegables/no navegables.

### Slice 3 — Shared activity presentation primitives

- Extraer de `PersonActivityTab` solo piezas reutilizables que reduzcan duplicación real: KPI config/render, trend mapping, radar/CSC chart inputs, pending-closures helpers.
- Evitar crear un componente monolítico compartido que mezcle admin y self-service behavior.
- Mantener `PersonActivityTab` funcionando sin regresión.

### Slice 4 — MyPerformanceView enterprise runtime

- Rehacer `MyPerformanceView` como dashboard self-service: header/period selector, Nexa insights, KPIs, trends, summary chips, radar, CSC/pipeline chart y empty states.
- Aplicar copy de coaching operativo, no evaluación formal.
- Cubrir responsive mobile/laptop/desktop.
- Usar copy reusable en `src/lib/copy/*` cuando corresponda.

### Slice 5 — Verification, GVC and docs

- Agregar tests focales para API DTO, redaction, anti-IDOR, mention safe mode y estados UI principales.
- Ejecutar `pnpm design:lint`, tsc/lint/tests focales y build según riesgo.
- Verificar visualmente con Greenhouse Visual Capture usando agente collaborator sobre `/my/performance` en desktop y mobile.
- Actualizar docs funcionales/arquitectura si el runtime final ajusta el contrato.

## Out of Scope

- Crear una nueva ruta `/my/activity`.
- Abrir `/api/ico-engine/context` a colaboradores.
- Modificar definiciones de métricas ICO.
- Generar señales Nexa o llamar LLM inline desde la UI.
- Crear o modificar evaluaciones HR formales.
- Crear goals, reviews, feedback, payroll adjustments o task reassignment desde esta vista.
- Exponer datos de compensación, costo por hora, bill rate, loaded cost o salary en el DTO de desempeño.
- Implementar API Platform first-party app resource; dejar el reader preparado para una task futura.

## Detailed Spec

### API

`GET /api/my/performance?year=YYYY&month=M`

- `year` y `month` opcionales; default = período actual `America/Santiago`.
- Validar rango razonable (`2024..2030`, `1..12`) y responder error sanitizado.
- Ignorar cualquier parámetro de sujeto aunque el browser lo mande; idealmente testear que `memberId=otro` no cambia el sujeto.

DTO orientativo:

```ts
type MyPerformanceResponse = {
  subject: {
    memberId: string
  }
  period: {
    year: number
    month: number
    label: string
    isCurrentPeriod: boolean
    status: 'current_partial' | 'closed_snapshot' | 'no_data' | 'degraded'
  }
  ico: {
    hasData: boolean
    metrics: Array<{ metricId: string; value: number | null; zone: string | null }>
    context: {
      totalTasks: number
      completedTasks: number
      activeTasks: number
      carryOverTasks: number
    }
    cscDistribution: Array<{ phase: string; count: number }>
  } | null
  trend: Array<{
    periodYear: number
    periodMonth: number
    otdPct: number | null
    ftrPct: number | null
  }>
  nexaInsights: MemberNexaInsightsPayload | null
  operational: {
    tasksCompleted: number
    tasksActive: number
    stuckAssetCount: number
  } | null
  meta: {
    materializedAt: string | null
    degradedSources: string[]
  }
}
```

El shape final puede variar en Plan Mode, pero debe preservar redaction y subject self-scoping.

### UI copy

Usar tono es-CL/tuteo operativo:

- "Mi desempeno"
- "Actividad del periodo"
- "Senales Nexa"
- "Este periodo aun esta en curso"
- "Todavia no hay cierres para calcular calidad"

Evitar:

- "evaluacion"
- "calificacion"
- "bajo rendimiento"
- "aprobado/reprobado"

### Data states

La UI debe distinguir al menos:

- loading skeleton.
- no data.
- current period partial sample.
- pending closures.
- Nexa empty-positive.
- Nexa empty-pending.
- stale/degraded.
- source error.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (DTO) MUST ship before Slice 4 (UI), because UI must not consume raw internal snapshots.
- Slice 2 (safe mentions) MUST ship before rendering `NexaInsightsBlock` in `/my/performance`.
- Slice 3 (shared primitives) can run after Slice 1 and before or alongside Slice 4, but must preserve Person 360 Activity tests.
- Slice 5 closes only after GVC collaborator evidence is reviewed.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Self-service DTO leaks cost/compensation fields | identity / api / privacy | medium | Explicit DTO allowlist + tests that forbidden keys are absent | no signal — test/Sentry/log review |
| Browser can target another member | identity / access | low | `requireMyTenantContext()` only + no target param + anti-IDOR tests | no signal — test/API logs |
| Nexa mentions link to forbidden admin routes | UI / access | medium | Safe mention mode before UI integration + tests | no signal — GVC/manual QA |
| Current month small sample reads as final truth | delivery / ico / UX | medium | Period status + partial-data copy + no fake-green nulls | no signal — UI state tests |
| PersonActivityTab regresses during extraction | UI | medium | Focal tests for PersonActivityTab + screenshot/GVC if changed materially | no signal — tests |

### Feature flags / cutover

Sin flag por defecto — additive improvement to an existing self-service route. If implementation discovers high-risk data ambiguity, add a temporary server-side kill switch such as `MY_PERFORMANCE_RICH_ACTIVITY_ENABLED=false` before shipping the rich UI.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert API DTO changes or keep legacy-compatible fields while UI remains old | < 30 min | si |
| Slice 2 | Revert safe mention mode; do not render Nexa block in `/my` until fixed | < 30 min | si |
| Slice 3 | Revert extraction and restore local helpers in PersonActivityTab | < 1 h | si |
| Slice 4 | Revert `MyPerformanceView` to previous implementation or gate rich view if flag exists | < 30 min | si |
| Slice 5 | Documentation/test-only rollback via revert | < 15 min | si |

### Production verification sequence

1. Local checks: tsc, lint and focal tests.
2. GVC local/staging for `/my/performance` using collaborator agent.
3. Confirm API payload for collaborator user has no forbidden fields.
4. Confirm period selector and current-period partial state.
5. Confirm Nexa mentions do not navigate to forbidden surfaces.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSURE
     "Como se que esta terminado?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- `/my/performance` renders a rich self-service activity dashboard with Nexa insights, KPIs, trends and charts when data exists.
- `/api/my/performance` never accepts or honors a target member identifier from the client.
- DTO tests prove restricted cost/compensation fields are absent.
- Nexa mention rendering in `/my/performance` is safe for collaborator access.
- Current-period and no-closure states are visibly distinct from closed-period healthy states.
- Person 360 Activity continues to pass focal tests after any shared extraction.
- GVC evidence for collaborator desktop and mobile is reviewed and attached under `.captures/`.
- `pnpm design:lint`, relevant tsc/lint/tests and build status are documented at closure.

## Verification Checklist

- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm exec eslint ...` or repo canonical lint command
- [ ] Focal API tests for `/api/my/performance`
- [ ] Focal component tests for `MyPerformanceView`
- [ ] Focal tests for safe mention mode
- [ ] PersonActivityTab regression test
- [ ] `pnpm design:lint`
- [ ] `pnpm fe:capture --route=/my/performance --env=staging` or scenario equivalent with collaborator agent auth
- [ ] `pnpm build`

## Closure Notes

- Move this file to `docs/tasks/complete/` when complete.
- Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- Update `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md` only if the accepted contract changes materially; otherwise append implementation links.
- Run `pnpm docs:closure-check`.
