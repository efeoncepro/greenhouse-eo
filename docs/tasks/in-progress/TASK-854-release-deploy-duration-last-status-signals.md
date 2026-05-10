# TASK-854 — Release Observability Completion: 2 Signals + Dashboard (TASK-848 V1.1 follow-up)

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `reliability / platform`
- Blocked by: `TASK-851` (necesita `release_manifests` data populated por orquestador)
- Branch: `task/TASK-854-release-deploy-duration-last-status-signals`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar TASK-848 Slice 7 restante + UI affordance Defense-in-depth: 2 reliability signals adicionales bajo subsystem `Platform Release` + dashboard `/admin/releases`. Ambos depend de `release_manifests` populated por TASK-851 orquestador, son la "capa de observability operator-facing" post-orchestrator.

**Parte A — 2 signals**:
- `platform.release.deploy_duration_p95` (kind=lag, severity warning>30min err>60min). Lee `release_manifests` ventana 30d.
- `platform.release.last_status` (kind=drift, severity error si ultimo release degraded|aborted|rolled_back <24h, warning 24h-7d). Steady=`released`.

**Parte B — dashboard `/admin/releases`** (V1 minimo):
- Tabla read-only ordenada por `started_at DESC` con last 30 dias, cursor pagination
- Manifest viewer drawer (release_id detail + state transitions timeline)
- CTA "Comando rollback" con copy-to-clipboard
- Banner si `platform.release.last_status` esta degradado

## Why

TASK-848 V1.0 wired solo 2 of 4 signals canonicos (stale_approval + pending_without_jobs). Los otros 2 dependen de tener `release_manifests` populated, que solo emerge tras TASK-851 orquestador. Una vez que el orquestador escribe manifests reales, estos 2 signals adicionales completan el subsystem `Platform Release`.

## Scope

### Parte A — 2 signals
- `src/lib/reliability/queries/release-deploy-duration.ts` — reader p95 lag
- `src/lib/reliability/queries/release-last-status.ts` — reader drift last status
- Wire-up en `getReliabilityOverview` source `productionRelease[]`
- Tests unit con mock `release_manifests` data + edge cases (ventana vacia, todos released, ultimo degraded)
- Tune thresholds post-30d steady-state observados

### Parte B — Dashboard `/admin/releases`
- Page `src/app/(dashboard)/admin/releases/page.tsx` server-component:
  - `requireAdminTenantContext` + capability `platform.release.execute` (read-equivalent V1)
  - Reader `src/lib/release/list-recent-releases.ts` cursor pagination 30d
- View `src/views/greenhouse/admin/releases/AdminReleasesView.tsx`:
  - Tabla con columns: target_sha (short), state (chip), started_at, completed_at, duration, operator, rollback CTA
  - Drawer manifest viewer
  - Banner degraded si signal `platform.release.last_status` rojo
- Microcopy via `getMicrocopy()` + `greenhouse-nomenclature.ts`
- Skill `greenhouse-ux-writing` para tone es-CL
- Skill `greenhouse-mockup-builder` ANTES de implementacion (mockup vinculante)
- Tests visual regression + E2E smoke (lista renderiza, drawer abre)

## Acceptance Criteria

- [ ] 2 readers nuevos en `src/lib/reliability/queries/release-*.ts`.
- [ ] Wire-up en `getReliabilityOverview` source `productionRelease`.
- [ ] Subsystem `Platform Release` ahora tiene 4 signals visibles en `/admin/operations`.
- [ ] `/admin/releases` accesible para EFEONCE_ADMIN con tabla + manifest viewer drawer.
- [ ] Mockup aprobado paso previo a implementacion.

## Out of Scope

- No tune thresholds antes de tener 30 dias data.
- No implementar trigger release desde UI (workflow_dispatch sigue via gh CLI o GitHub UI).
- No mostrar audit log full de transitions en V1 (link a manifest detail).

## Compaction note

Esta task absorbe el scope original de TASK-855 (Dashboard UI) porque ambos componentes (signals adicionales + dashboard) son la "capa de observability operator-facing" post-orchestrator y comparten dependencia critica de `release_manifests` populated por TASK-851. Separarlos creaba 2 tasks pequenas con misma blocking gate. Compactacion validada arch-architect: same skill set requerido (reliability readers + UI), same blocking gate (TASK-851), reduces task overhead sin afectar el plan futuro.
