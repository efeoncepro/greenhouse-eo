# TASK-1593 — Globe Enterprise ICP and Design-Partner Readiness

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial|security|legal|finance|creative`
- Blocked by: `TASK-1476, TASK-1477, TASK-1478, TASK-1479`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fijar `enterprise marketing organizations` como ICP estratégico de Globe y una unidad enterprise delimitada como
beachhead operativo. Definir buying group, qualification, design partners, security/procurement/rights pack y handoff
a `TASK-1480`, sin saltarse los gates de cliente, pricing ni rollout.

## Goal

- Declarar ICP, enterprise unit y anti-ICP.
- Definir operator, champion, creative authority, economic buyer, Procurement, IT/Security, Legal y Finance.
- Seleccionar design partners con workflow real, sponsor, derechos y criterio de cierre.
- Consolidar readiness dossier sin duplicar `TASK-1480`, `TASK-1521` ni `TASK-1535`.

## Architecture Alignment

- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse control plane documental/comercial; Globe runtime/evidence owner`
- Future candidate home: `remain-shared`
- Boundary: `enterprise ICP, design-partner qualification y readiness dossier`
- Server/browser split: `n/a; no runtime mutation`
- Build impact: `none`
- Extraction blocker: `none`

## Scope

### Slice 1 — ICP y qualification

Definir enterprise marketing organizations, enterprise unit, triggers, JTBD, anti-ICP, buyer group, qualification
scorecard y distinción entre prospect, design partner y rollout-ready client.

### Slice 2 — Design-partner operating model

Definir selección, onboarding, baseline, scope, modalidad, RACI, review cadence, success criteria, no-fit, pause,
escalamiento y decisión de cierre.

### Slice 3 — Readiness packs

Consolidar Security, Procurement y Rights con owner, fuente de evidencia y estados
`pass|conditional|pending|not-applicable`.

### Slice 4 — Handoff

Entregar dossier a `TASK-1480` y declarar `ready for design-partner validation`, `conditional` o `not-ready`.

## Dependencies & Impact

- Depends on: `TASK-1476, TASK-1477, TASK-1478, TASK-1479`.
- Impacts: `TASK-1480, TASK-1521, TASK-1535` y el alcance comercial de EPIC-028.
- No reemplaza ningún gate existente ni crea entitlements, workspace, DPA, SSO, SLA o rights.

## Out of Scope

Clientes externos, Production, pricing, checkout, billing, nuevos roles/grants, contracts, SSO/SCIM, claims de
compliance, reseller/co-selling y cualquier modificación de runtime.

## Acceptance Criteria

- [ ] Enterprise marketing organizations queda declarado como ICP estratégico de EPIC-028.
- [ ] Enterprise unit queda definida como beachhead controlado y expandible.
- [ ] Buying group, JTBD, trigger, anti-ICP y qualification scorecard están documentados.
- [ ] Cada design partner exige operator, champion, creative authority, sponsor y workflow real.
- [ ] Security, Procurement y Rights pack tienen owner, evidencia y estado por requisito.
- [ ] Se distingue design partner, prospect y rollout-ready client.
- [ ] El dossier se entrega a `TASK-1480` sin sustituir su decisión go/no-go.
- [ ] El dossier identifica qué falta para promover el producto comercial desde el estadio `internal-only` al primer
      rollout externo gobernado; no activa flags ni sustituye el go/no-go de `TASK-1480`.

## Rollout Plan & Risk Matrix

Task documental/policy; no cambia runtime. Riesgos: confundir design partner con cliente listo, prometer controles no
verificados, seleccionar una cuenta sin sponsor y pilotar sin rights. Mitigación: evidence ledger, qualification
scorecard, estados separados y gate `TASK-1480`.

## Verification

- `pnpm task:lint --task TASK-1593`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- revisión manual contra `TASK-1476/1477/1478/1479/1480/1521/1535`

## Closing Protocol

Sincronizar lifecycle/carpeta, registry, `docs/tasks/README.md`, EPIC-028, changelog y Handoff. Estado final máximo:
`ready for design-partner validation`; nunca `commercial-ready` por esta task sola.
