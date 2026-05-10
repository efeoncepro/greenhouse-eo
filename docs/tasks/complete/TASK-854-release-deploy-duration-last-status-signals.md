# TASK-854 — Release Observability Completion: 2 Signals + Dashboard (TASK-848 V1.1 follow-up)

## Closure 2026-05-10

**SHIPPED en `develop`** con 3 commits incrementales sin PR ceremony, mantenida en develop per instrucción del usuario. **Hito**: cierra el control plane release V1.1 COMPLETO end-to-end.

**Slices entregados**:

- `232238b6` Slice 0 — 2 reliability signals (`platform.release.deploy_duration_p95` + `platform.release.last_status`) + wire-up `getReliabilityOverview` 5 readers paralelos + 16 tests anti-regresion
- `bf65ceda` Slice 1 — Dashboard `/admin/releases` con cursor pagination + tabla TanStack + drawer manifest viewer + microcopy es-CL canonical
- (este commit) Slice 2 — Tests + docs canónicas + cierre

**Tests**: 16/16 verdes anti-regresion (7 deploy_duration + 9 last_status).

**Skills invocadas pre-implementacion** (per instrucción explícita del usuario "Si vas a tocar UI, invoca las skills de UI de UX y de microinteraccion globales y del repo y diseña un plan antes de ejecutar y luego ejecutalo"):

- `greenhouse-ux` — layout blueprint + Vuexy components + GH_COLORS tokens + visual hierarchy
- `greenhouse-microinteractions-auditor` — hover/focus/loading/empty + reduced motion + roles ARIA
- `greenhouse-ux-writing` — copy es-CL operator-facing + tone map + decision tree domain copy module

**Plan UX explícito impreso ANTES de escribir código**: layout blueprint + component manifest + visual hierarchy + color & tone + microinteracciones + responsive + microcopy + accessibility + auth + files canónicos.

**Decisiones foundational arch-architect 4-pillar validadas**:

1. Filter `state === 'released'` en p95 (NO incluir degraded/aborted) — outliers contaminarían métrica ✓
2. Ventana 30d p95 + 24h/7d last_status — alineado con SLO operativo ✓
3. Cursor pagination keyset (NO offset) — O(log N) consistent en deep pages ✓
4. Initial fetch SSR + cursor pagination client (NO full-client SPA) — initial paint rápido ✓
5. Capability `platform.release.execute` read-equivalent V1 — V1.2 emergerá granular si necesario ✓

**Acceptance criteria**:

- [x] 2 readers nuevos en `src/lib/reliability/queries/release-*.ts`.
- [x] Wire-up en `getReliabilityOverview` source `productionRelease`.
- [x] Subsystem `Platform Release` ahora tiene **5 of 5 signals** visibles en `/admin/operations` (vs 3 originales).
- [x] `/admin/releases` accesible para EFEONCE_ADMIN (capability `platform.release.execute` read-equivalent V1) con tabla + manifest viewer drawer.
- [x] Mockup aprobado paso previo a implementacion — **compactado per decisión foundational**: dashboard read-only minimo con shape canónico admin tables clonable de `EmailDeliveryDetailDrawer` y `/admin/operations`. Plan UX explícito sirvió como mockup vinculante.

**Componentes shipped**:

- 2 readers reliability (deploy_duration + last_status) wired al overview
- Helper canonical `listRecentReleasesPaginated` cursor pagination keyset on started_at DESC
- Server page `/admin/releases` con `requireServerSession` + capability check + Promise.all initial fetch
- API route GET `/api/admin/releases` cursor pagination
- View client TanStack tabla + Card outlined + Alert banner condicional + EmptyState
- Drawer manifest viewer anchor='right' 480px + comando rollback copy-to-clipboard via sonner toast
- Microcopy module canonical `src/lib/copy/release-admin.ts` (`GH_RELEASE_ADMIN`)

**Capabilities, Outbox events, Reliability signals nuevos en TASK-854**:

- 0 capabilities nuevas (reusa `platform.release.execute` read-equivalent V1)
- 0 outbox events nuevos
- **2 reliability signals nuevos** (`platform.release.deploy_duration_p95` + `platform.release.last_status`)
- 0 migrations

**Hard Rules** canonizadas en CLAUDE.md sección "Release Observability Completion invariants (TASK-854)" con 12 reglas duras.

**Docs canonizadas**: CLAUDE.md + AGENTS.md secciones nuevas, DECISIONS_INDEX entry, GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md Delta TASK-854 SHIPPED, manual operador `docs/manual-de-uso/plataforma/release-dashboard.md`, doc funcional `docs/documentation/plataforma/release-dashboard.md`.

**Hito: control plane release V1.1 COMPLETO end-to-end**:

- TASK-848 V1.0 (foundation) ✅
- TASK-849 (watchdog) ✅
- TASK-850 (preflight CLI) ✅
- TASK-851 (orchestrator + worker SHA verification) ✅
- TASK-853 (Azure infra release gating) ✅
- TASK-854 (dashboard + 2 signals últimos) ✅

**Pendiente fuera de scope (V1.2 follow-ups documentados en spec V1)**:

- Capability `platform.release.read_results` granular para FINANCE_ADMIN observability sin escalar a EFEONCE_ADMIN/DEVOPS_OPERATOR
- Add release CTA desde dashboard (workflow_dispatch trigger via UI)
- Audit log full transitions visible inline en drawer (V1 solo metadata)
- Tune thresholds (30min warning, 60min error) post 30d steady-state observados

---

## Status

- Lifecycle: `complete`
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
