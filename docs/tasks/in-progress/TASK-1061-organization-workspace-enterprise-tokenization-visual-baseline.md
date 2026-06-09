# TASK-1061 — Organization Workspace Enterprise Tokenization + Visual Baseline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `En ejecucion en develop por coordinacion multi-agente; controller/copy/Chart SoT/GVC baseline implementados. Paridad mockup recuperada en runtime para website, default delivery y strip OTD/FTR/Throughput/RpA con deltas reales vs previousIcoMetrics. TASK-1063 hereda el compact sidecar/API projection tras deprecar TASK-1060.`
- Rank: `TBD`
- Domain: `agency|ui|platform|design-system|quality`
- Blocked by: `none`
- Branch: `develop (excepcion coordinacion multi-agente; no cambiar rama)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el runtime enterprise aprobado de Organization Workspace en un contrato visual gobernado: extraer magic numbers a un controller de dominio, centralizar copy reutilizable, alinear los charts CSC/trend al Chart SoT, promover componentes repetidos al boundary `organization-workspace` cuando corresponda y agregar baseline/diff GVC mockup→runtime.

## Why This Task Exists

TASK-1059 entrego la experiencia visual aprobada para `/agency/organizations/[id]`, pero parte de su fidelidad depende de literales route-locales en JSX, copy dispersa y una paleta de series de chart derivada de semanticos visuales. Eso funciona para shippear el runtime, pero deja una superficie enterprise sensible a drift, regressions silenciosas y divergencia con el sistema AXIS/Greenhouse.

TASK-1063 cubre la projection compacta backend del sidecar y los gaps de paridad mockup→runtime heredados de TASK-1060. Esta task es deliberadamente UI/platform: conserva el diseno aprobado y lo convierte en una base mantenible sin inflar tokens globales.

## Goal

- Preservar el diseno aprobado de TASK-1059 con una variacion visual minima y controlada.
- Reemplazar literales visuales dispersos por un controller de dominio versionable.
- Mover copy visible reutilizable a `GH_ORGANIZATION_WORKSPACE.enterprise`.
- Alinear series de CSC/trends al Chart SoT, manteniendo semanticos solo para estados.
- Dejar baseline/diff GVC para proteger la paridad mockup aprobado → runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- No crear tokens AXIS/globales nuevos salvo que el uso repetido platform-level quede demostrado y documentado.
- Figma/mockup/design intent se mapea a tokens/controladores, no a HEX/px/fontFamily/ms inline.
- Las series categoricas de charts no deben salir de `theme.palette.{success,warning,error,info}`; deben consumir Chart SoT.
- La copy visible reutilizable vive en `src/lib/copy/agency.ts`, no duplicada en JSX.
- La paridad visual se verifica con GVC en loop y baseline/diff, no solo por inspeccion de codigo.

## Normative Docs

- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- TASK-1059 runtime implementation pushed to `develop`.
- TASK-1063 remains independent for compact backend signals and mockup→runtime parity gaps.
- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`
- `src/components/greenhouse/organization-workspace/**`
- `src/lib/copy/agency.ts`
- `src/@core/theme/axis-chart.ts`
- `src/components/greenhouse/primitives/greenhouse-chart-controller.ts`
- `scripts/frontend/scenarios/organization-workspace-enterprise-detail-runtime.scenario.ts`
- `scripts/frontend/scenarios/organization-workspace-enterprise-detail-mockup.scenario.ts`

### Blocks / Impacts

- Organization detail runtime visual drift protection.
- Future convergence between Agency, Finance and organization workspace consumers.
- GVC evidence quality for mockup-approved → runtime-promoted flows.
- Reuse boundary for enterprise organization workspace components.

### Files owned

- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`
- `src/components/greenhouse/organization-workspace/**`
- `src/lib/copy/agency.ts`
- `scripts/frontend/scenarios/organization-workspace-enterprise-detail-runtime.scenario.ts`
- `scripts/frontend/scenarios/organization-workspace-enterprise-detail-mockup.scenario.ts`
- `scripts/frontend/baselines/**`
- `docs/tasks/**`

## Current Repo State

### Already exists

- TASK-1059 runtime component at `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`.
- Organization workspace shared shell at `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx`.
- Runtime GVC scenario at `scripts/frontend/scenarios/organization-workspace-enterprise-detail-runtime.scenario.ts`.
- Mockup GVC scenario at `scripts/frontend/scenarios/organization-workspace-enterprise-detail-mockup.scenario.ts`.
- Copy namespace `GH_ORGANIZATION_WORKSPACE` in `src/lib/copy/agency.ts`.
- Chart SoT in `src/@core/theme/axis-chart.ts` and chart controller primitives.
- Approved runtime evidence: `.captures/2026-06-09T02-15-20_organization-workspace-enterprise-detail-runtime` (`qualityFindings=[]`).
- Approved mockup evidence: `.captures/2026-06-09T01-42-45_organization-workspace-enterprise-detail-mockup`.

### Gap

- Layout/chart/density literals are route-local in the runtime component.
- Reusable section labels, facet descriptions, sidecar labels and partial states are still dispersed in JSX/const arrays.
- CSC distribution uses semantic tones as series colors instead of the chart palette contract.
- Reusable pieces such as section shell, metric rail/strip, sidecar sections and CSC chart are route-local; this is acceptable for TASK-1059 speed but should be promoted or explicitly retained.
- No durable GVC baseline/diff currently pins the approved mockup against the runtime.
- Small cleanup opportunity: duplicate `projects: null` in the runtime initial state should be removed during the refactor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventory and token map

- Audit `OrganizationEnterpriseWorkspaceRuntime.tsx` for visual literals, local copy, component boundaries and chart color usage.
- Classify each literal as theme token, domain controller constant, copy namespace value, data/API constant or documented exception.
- Confirm the runtime still matches the TASK-1059 approved capture before refactoring.

### Slice 2 — Domain controller

- Add `src/components/greenhouse/organization-workspace/organization-enterprise-workspace-controller.ts`.
- Define a domain controller for `layout`, `chrome`, `density`, `chart` and optional `states` constants.
- Replace route-local visual literals with controller constants or existing theme tokens while preserving the rendered output.
- Remove the duplicate `projects: null` initial-state property.

### Slice 3 — Copy canonicalization

- Extend `GH_ORGANIZATION_WORKSPACE.enterprise` in `src/lib/copy/agency.ts`.
- Move reusable facet descriptions, section titles/subtitles, actions, sidecar labels, partial/degraded states, evidence labels and metrics copy out of JSX.
- Keep dynamic source names, API identifiers and non-visible technical keys in code when they are not reusable product copy.

### Slice 4 — Chart SoT alignment

- Replace CSC categorical series colors with Chart SoT values from `GH_COLORS.chart.*` or the canonical chart controller.
- Align trend colors to chart directional/accent/neutral semantics where they represent series data.
- Preserve semantic palette usage only for status dots, chips, alerts and state indicators.
- Verify CSC legend and donut remain readable and unclipped on laptop/mobile.

### Slice 5 — Component boundary

- Promote repeatable pieces to `src/components/greenhouse/organization-workspace/` when reuse or boundary clarity justifies it.
- Candidate components: `OrganizationEnterpriseSection`, `OrganizationEnterpriseMetricRail`, `OrganizationEnterpriseMetricStrip`, `OrganizationEnterpriseSidecarSection`, `OrganizationEnterpriseCapabilityDistribution`.
- Do not create a global primitive or design-system lab unless discovery proves the pattern is platform-level beyond Organization Workspace.

### Slice 6 — GVC baseline contract

- Add or refine `baseline.surfaceId` for the mockup/runtime scenarios where needed.
- Promote the approved mockup baseline using the canonical `pnpm fe:capture:diff --promote` flow.
- Configure masks/required frames for dynamic data so the diff measures layout fidelity rather than live-data churn.
- Capture and inspect desktop, laptop and mobile frames, including CSC distribution and first folds for workspace, delivery, finance and identity.

### Slice 7 — Closure

- Run focal lint/type/design/GVC checks.
- Update task lifecycle docs and handoff only if implementation closes this task.
- If the refactor changes a shared UI platform contract, synchronize `docs/architecture/ui-platform/**`, `project_context.md` and `changelog.md` via `greenhouse-documentation-governor`.

## Out of Scope

- TASK-1060 compact signals backend projection, API/MCP path or sidecar data semantics.
- New global AXIS tokens, theme palette changes or Figma upstream reconciliation unless discovery proves a platform-level gap.
- Finance, delivery, Account 360 or Organization 360 calculation changes.
- Redesigning the approved TASK-1059 composition.
- Brand asset discovery/review queue from TASK-999.
- Route/auth/capability changes for organization detail.

## Detailed Spec

### Controller shape

The controller should start domain-local, not global:

```ts
export const ORGANIZATION_ENTERPRISE_WORKSPACE_TOKENS = Object.freeze({
  layout: {
    facetRailInlineSize: 224,
    sidecarInlineSize: 336,
    minDesktopBlockSize: 656,
  },
  chrome: {
    logoFrameSize: 78,
    logoAvatarSize: 64,
    metricIconSize: 38,
  },
  density: {
    account360Limit: 20,
    distributionMaxItems: 6,
    projectRows: 8,
    facetScrollMarginMobile: 164,
  },
  chart: {
    trendHeight: 260,
    csc: {
      inlineSizeXs: 176,
      inlineSizeMd: 188,
      viewBoxSize: 112,
      center: 56,
      radius: 44,
      strokeWidth: 14,
      gapDegrees: 1.2,
      innerInset: '27%',
      legendMarkerSize: 10,
      legendRowMinBlockSize: 28,
    },
  },
} as const)
```

The exact shape can evolve during implementation, but it must remain domain-local and must not duplicate existing theme tokens for spacing, radius, elevation, typography or motion.

### Copy shape

Extend `GH_ORGANIZATION_WORKSPACE.enterprise` with stable groups such as:

- `facetDescriptions`
- `actions`
- `sections`
- `sidecar`
- `partialStates`
- `evidence`
- `metrics`

Do not move one-off technical IDs or server field names into copy. Do move any user-visible label that would recur across route, sidecar, GVC states, docs or future workspace consumers.

### Chart color contract

- CSC capability distribution is a categorical series and should use Chart SoT categorical colors.
- Finance/delivery trend series should use chart directional colors only when the visual meaning is positive/negative/neutral; otherwise use chart accent/categorical values.
- Status health dots remain semantic: `success`, `warning`, `error`, `info`, `neutral`.

### GVC baseline expectations

- The runtime capture must preserve the approved enterprise feel and layout.
- Diff should allow dynamic text/data masks but should not mask CSC clipping, column collapse, nav/sidebar overlap, search header overlap or sidecar overflow.
- Required frames should cover at least:
  - organization workspace first fold desktop
  - laptop viewport first fold
  - mobile first fold
  - CSC distribution section
  - finance facet
  - delivery facet
  - identity facet

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (inventory) -> Slice 2 (controller) -> Slice 3 (copy) -> Slice 4 (chart SoT) -> Slice 5 (component boundary) -> Slice 6 (GVC baseline) -> Slice 7 (closure).
- Slice 6 must run after visual refactors and before closure.
- TASK-1063 may proceed independently; do not wait on it and do not mix its backend reader/parity scope into this task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Visual regression while replacing literals | UI | medium | GVC before/after, baseline diff, frame inspection on desktop/laptop/mobile | GVC quality finding or unexpected diff in required frames |
| Over-tokenization into global theme | design-system | medium | Domain controller first; global token only with documented platform-level reuse | New token proposed without multi-surface evidence |
| Copy extraction changes visible labels | content | low | Move strings mechanically, inspect GVC frames and focal UI | Label mismatch in runtime capture |
| Chart palette shift hurts readability | UI/accessibility | medium | Use Chart SoT and legend/label review; preserve semantic colors for statuses only | Low contrast or ambiguous CSC legend in capture |
| Baseline becomes flaky due dynamic data | quality | medium | Use masks and stable `data-capture` regions; document intentional dynamic fields | Repeated `baseline_stale` or noisy diffs |

### Feature flags / cutover

Sin flag — refactor UI/platform additive over an already approved runtime. Cutover is immediate when merged. Revert path is the commit revert if a visual regression escapes local/preview verification.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | No runtime changes expected | N/A | si |
| Slice 2 | Revert controller extraction commit | <10 min | si |
| Slice 3 | Revert copy extraction commit | <10 min | si |
| Slice 4 | Revert chart color mapping commit | <10 min | si |
| Slice 5 | Revert component extraction commit | <15 min | si |
| Slice 6 | Remove/promote previous baseline state via GVC baseline workflow | <15 min | si |
| Slice 7 | Revert docs-only closure updates if task remains open | <10 min | si |

### Production verification sequence

1. Run focal lint/type/design checks locally.
2. Run `pnpm fe:capture organization-workspace-enterprise-detail-runtime --env=local`.
3. Inspect frames manually, especially laptop and CSC distribution.
4. Run baseline diff against approved mockup/runtime baseline.
5. If deployed to preview/staging, repeat runtime GVC against that target before declaring operationally ready.

### Out-of-band coordination required

N/A — repo-only UI/platform hardening. No external system, env var, migration, secret, cron or webhook change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] All route-local visual literals in the enterprise organization runtime are either replaced by theme tokens/domain controller constants or documented as intentional data/API constants.
- [ ] Reusable visible copy is centralized under `GH_ORGANIZATION_WORKSPACE.enterprise`.
- [ ] CSC and trend series consume Chart SoT; semantic palette remains limited to states/statuses.
- [ ] Reusable organization workspace pieces are either extracted to `src/components/greenhouse/organization-workspace/` or explicitly documented as route-local.
- [ ] GVC baseline/diff protects approved mockup→runtime fidelity and includes desktop/laptop/mobile evidence.
- [ ] Runtime capture reports `qualityFindings=[]`, including CSC distribution with no clipping or container trapping.
- [ ] TASK-1063 backend/projection/parity scope is not implemented or duplicated here.

## Verification

- `pnpm exec eslint src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx src/components/greenhouse/organization-workspace src/lib/copy/agency.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture organization-workspace-enterprise-detail-runtime --env=local`
- `pnpm fe:capture:review .captures/<capture-dir>`
- `pnpm fe:capture:diff <approved-baseline> <runtime-capture>`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado con evidencia GVC, baseline y cualquier deuda restante
- [ ] `changelog.md` quedo actualizado si el refactor cambia comportamiento visual observable
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-1059, TASK-1063, TASK-1054 y TASK-1056
- [ ] se reviso si algun token/controller nuevo debe documentarse en UI Platform o quedar solo como dominio

## Follow-ups

- Posible task futura: reconciliacion upstream con Figma/AXIS si el controller de dominio revela un patron repetible platform-level.
- Posible task futura: lint warning-first para bloquear series de chart desde semantic palette en views.
- TASK-1063 sigue siendo el follow-up backend/paridad para compact signals/projection/API parity del sidecar.

## Delta YYYY-MM-DD

N/A.

## Open Questions

- Confirmar durante Plan Mode si el baseline promovido debe usar el mockup aprobado como source principal o la captura runtime aprobada de TASK-1059 como baseline operacional.
- Confirmar si algun componente extraido amerita lab interno o si basta con boundary de dominio `organization-workspace`.
