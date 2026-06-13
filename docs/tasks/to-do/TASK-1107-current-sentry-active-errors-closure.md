# TASK-1107 — Current Sentry active errors closure

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|reliability|identity|performance`
- Blocked by: `none`
- Branch: `task/TASK-1107-current-sentry-active-errors-closure`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar la cola Sentry real detectada el 2026-06-13 separando incidentes vivos, incidentes recientes no activos y backlog stale. La task no debe mutear Sentry ni resolver issues a mano: debe corregir causa raiz, delegar a tasks existentes cuando aplique y cerrar solo con evidencia runtime + quiet period.

## Why This Task Exists

Sentry tiene muchos issues `unresolved`, pero no todos son errores reales actuales. La verificacion read-only del 2026-06-13 mostro cuatro familias distintas:

- N+1 Query performance issues con eventos recientes en production/preview.
- `role_view_fallback_used` como drift real de governance de views, principalmente por `roleCode=designer` sin `role_view_assignments` explicitos para algunas views.
- `identity.auth.providers smoke failed: portal_auth_health` (`JAVASCRIPT-NEXTJS-4S`) como issue reciente, pero no fallando en runtime al momento de verificar.
- `rpa_median` (`JAVASCRIPT-NEXTJS-7H`) como bug real preview ya documentado en `ISSUE-087` / `TASK-1106`.

La causa de fondo no es una sola exception: es higiene operacional de observabilidad. Sentry mezcla problemas activos, señales performance, warnings de fallback y backlog stale. Sin una task de cierre por familia, el equipo puede arreglar sintomas o resolver issues que todavia no tienen evidencia.

## Goal

- Clasificar la cola Sentry actual en `fix-now`, `delegate-existing-task`, `monitor-recent`, `stale-resolve-candidate`.
- Corregir el drift real de `role_view_fallback_used` para el rol `designer` con grants explicitos y guardrail de paridad view registry -> role grants.
- Alinear los N+1 activos con `TASK-928` y cerrar solo despues de caida real post-deploy.
- Alinear `JAVASCRIPT-NEXTJS-4S` con `TASK-883`, diferenciando health real roto vs smoke/probe flapping.
- Mantener `JAVASCRIPT-NEXTJS-7H` en `TASK-1106` sin duplicar su implementacion.
- Limpiar backlog Sentry stale solo despues de spot-check documental y runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No bajar sampling, cambiar fingerprints ni resolver issues Sentry para esconder ruido.
- `role_view_fallback_used` debe tender a cero mediante `role_view_assignments` explicitos o una decision de politica documentada; el fallback por `routeGroups` es defensa, no steady state.
- `views` gobierna superficies visibles; `entitlements` gobierna acciones. No corregir drift de views con capabilities ni con broad roles.
- Los N+1 se corrigen con batching/cache request-scoped/readers agregados, no con silencio de performance issues.
- Los smokes de auth deben distinguir dependencia externa lenta de fallo interno de Greenhouse; no todo blip externo merece `level=error` inmediato.
- Los issues stale solo se resuelven cuando hay evidencia de no recurrencia, doc de fix existente o runtime spot-check.

## Normative Docs

- `docs/tasks/to-do/TASK-1106-account-360-delivery-serving-contract-hardening.md`
- `docs/tasks/to-do/TASK-883-auth-smoke-resilience-internal-vs-external.md`
- `docs/tasks/in-progress/TASK-928-reliability-admin-n-plus-one-batching.md`
- `docs/issues/open/ISSUE-087-account-360-delivery-rpa-median-schema-drift.md`
- `docs/audits/sentry/SENTRY_WEEKLY_REMEDIATION_AUDIT_2026-05-24.md`
- `docs/audits/reliability/ADMIN_CENTER_RELIABILITY_AUDIT_2026-05-26.md`
- `docs/tasks/complete/TASK-1072-designer-role-figma-node-linking.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`

## Dependencies & Impact

### Depends on

- Sentry project `efeonce-group-spa/javascript-nextjs`.
- Local incident-read Sentry credentials already configured as `SENTRY_INCIDENTS_AUTH_TOKEN`.
- `greenhouse_core.role_view_assignments`.
- `greenhouse_core.view_registry`.
- `src/config/role-codes.ts`.
- `src/lib/tenant/role-route-mapping.ts`.
- `src/lib/admin/view-access-store.ts`.
- `services/ops-worker/server.ts` for `/smoke/identity-auth-providers`.
- `src/lib/reliability/**` and routes covered by `TASK-928`.

### Blocks / Impacts

- Sentry operational hygiene for production and preview.
- Identity & Access governance for `designer` and future route-group fallback warnings.
- Admin/reliability performance work already in `TASK-928`.
- Auth smoke alert quality already in `TASK-883`.
- Account 360 delivery schema hardening already in `TASK-1106`.

### Files owned

- `migrations/**` for additive `role_view_assignments` remediation if discovery confirms missing grants.
- `src/lib/admin/view-access-store.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/view-access-catalog.test.ts`
- `src/lib/tenant/designer-role.test.ts`
- `docs/tasks/to-do/TASK-1107-current-sentry-active-errors-closure.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `TASK-1106` owns `JAVASCRIPT-NEXTJS-7H` / `rpa_median`.
- `TASK-883` owns the durable auth smoke resilience redesign.
- `TASK-928` owns N+1 batching/performance remediation and is already `in-progress`.
- `TASK-1072` introduced the `designer` role with `ROLE_ROUTE_GROUPS['designer']=['internal','my']` and an explicit grant for `plataforma.design_system`.
- Prior migrations document that missing `role_view_assignments` cause `role_view_fallback_used` warnings.
- Runtime check on 2026-06-13 showed `/api/auth/health` production responding `200` with `overallStatus='ready'`.

### Gap

- Sentry still reports high-volume `role_view_fallback_used` warnings in the last 24h. Latest verified examples:
  - production `GET /api/notifications/unread-count`, `roleCode=designer`, `routeGroup=internal`, `viewCode=gestion.equipo`, `reason=missing_role_view_assignment`, latest `2026-06-13T00:33:09Z`.
  - preview `GET /admin/views`, `roleCode=designer`, `routeGroup=my`, `viewCode=mi_ficha.onboarding`, `reason=missing_role_view_assignment`, latest `2026-06-12T23:56:56Z`.
- N+1 performance issues are still emitting recent events, including production `/admin/ops-health`, `/admin/integrations`, `/api/cron/reliability-synthetic`, `/hr/workforce/contracts`, `/agency/operations`, `/my/profile`, and preview `/finance/quotes/new`.
- `JAVASCRIPT-NEXTJS-4S` remains unresolved with last event `2026-06-13T00:30:06Z`, but live health was ready at `2026-06-13T11:54:14Z`; this needs smoke/probe diagnosis, not an auth emergency label.
- Stale unresolved issues from May remain visible in Sentry despite no active 24h events and documented fixes.

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

### Slice 1 — Sentry current-state ledger

- Query Sentry read-only for `production`, `preview`, `staging`, `24h`, and `14d`.
- Produce a small classification table in the task delta or plan:
  - `fix-now`
  - `delegate-existing-task`
  - `monitor-recent`
  - `stale-resolve-candidate`
- Record exact `shortId`, group id, title, environment, first/last seen, route, event count, and latest tags for every family.
- Confirm live runtime for auth health before deciding whether `JAVASCRIPT-NEXTJS-4S` is active.

### Slice 2 — `role_view_fallback_used` designer remediation

- Query PostgreSQL for all missing `role_view_assignments` where `role_code='designer'` and access is currently being granted only via `route_group_scope`.
- Decide policy explicitly:
  - If `designer` should access all `internal` and `my` views, seed explicit grants for the relevant active views.
  - If `designer` should access only a subset, tighten route groups or seed explicit denials so fallback does not look like intentional access.
- Implement migration append-only/idempotent with anti pre-up-marker DO check.
- Add/extend parity test so new internal roles with route groups cannot silently rely on fallback for active registry views.
- Verify Sentry quiet period for `role_view_fallback_used` after deploy before resolving related issues.

### Slice 3 — N+1 active issues delegation and closeout

- Update or execute `TASK-928` rather than creating parallel performance fixes.
- Map currently active N+1 short IDs to the routes already listed in `TASK-928`; add `/finance/quotes/new` if not covered.
- Verify query-count or Sentry performance decrease post-deploy.
- Only resolve N+1 issues after 24-48h without recurrence in the target environment.

### Slice 4 — Auth smoke `JAVASCRIPT-NEXTJS-4S` diagnosis

- Confirm whether `portal_auth_health` failed because the portal endpoint was actually unhealthy or because the ops-worker probe/timeout flapped.
- If the endpoint is healthy and only the smoke flapped, link the active finding to `TASK-883` and optionally raise its priority/scope with the 2026-06-13 recurrence.
- If the endpoint is unhealthy during execution, fix the root auth/readiness issue before touching smoke resilience.
- Preserve Sentry `level=error` for true internal critical failures.

### Slice 5 — `rpa_median` handoff

- Do not duplicate `TASK-1106`.
- Confirm `JAVASCRIPT-NEXTJS-7H` remains assigned to `TASK-1106` / `ISSUE-087`.
- If Sentry shows new production/staging events, update `TASK-1106` severity and blast radius before implementing.

### Slice 6 — Stale unresolved Sentry cleanup

- For old May issues with no 24h activity and documented fixes, prepare a resolve list with evidence:
  - issue short ID
  - last seen
  - fix task/issue/commit if known
  - spot-check command or runtime check
- Resolve in Sentry only after evidence is captured and no owner objects are mixed with active current issues.

## Out of Scope

- Implementing `TASK-1106` delivery schema fix inside this task.
- Rewriting `TASK-883` fully unless Slice 4 proves auth smoke is the immediate root cause.
- Completing all of `TASK-928` if performance work needs separate code review; this task can update/delegate and verify closeout.
- UI changes.
- Any destructive Sentry cleanup without evidence.

## Detailed Spec

### Simple current classification from 2026-06-13 verification

| Familia | Estado actual | Explicacion simple | Owner |
|---|---|---|---|
| N+1 Query | Activo ahora | Una ruta repite la misma clase de consulta demasiadas veces en una request; no suele romper al usuario, pero aumenta latencia/carga y puede escalar. | `TASK-928` + this task closeout |
| `role_view_fallback_used` | Real reciente | El sistema no encuentra un grant explicito `role_view_assignments`; entonces usa fallback por route group. El acceso puede funcionar, pero la gobernanza esta incompleta. | this task |
| `JAVASCRIPT-NEXTJS-4S` auth smoke | Reciente, no activo al check | El monitor de auth fallo anoche, pero el endpoint real `/api/auth/health` esta listo ahora. Probable smoke/probe flapping salvo nueva evidencia. | `TASK-883` |
| `JAVASCRIPT-NEXTJS-7H` `rpa_median` | Real preview latente | Una query pidio una columna que no existe en la tabla runtime. No siempre crashea porque hay degradacion, pero el contrato SQL esta roto. | `TASK-1106` |
| May unresolved backlog | Stale candidate | Issues abiertos en Sentry sin eventos recientes y con fixes documentados; contaminan el dashboard si no se resuelven con evidencia. | this task cleanup |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2.
- Slices 3/4/5 can run in parallel after Slice 1 because they delegate to existing tasks.
- Slice 6 only after Slices 1-5 have classified active vs stale; never resolve stale issues before active families are separated.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Resolver issues stale que todavia recurren | Sentry / ops | medium | require 24h/14d evidence + spot-check before resolve | new event after resolution |
| Dar demasiado acceso a `designer` | identity/access | medium | policy decision explicit + grants/denials by view, not broad capability | access audit / unexpected authorizedViews |
| Mutear N+1 sin mejorar carga | reliability/performance | medium | no sampling/fingerprint changes; verify query counts or Sentry decline | Sentry N+1 unchanged |
| Confundir auth dependency flapping con auth outage | identity | medium | live `/api/auth/health` check + TASK-883 taxonomy | smoke events while health ready |
| Duplicar work already owned by TASK-1106/883/928 | docs/process | medium | update existing tasks or link, do not fork implementation | conflicting docs/tasks |

### Feature flags / cutover

Sin flag para la clasificacion y limpieza documental. Si Slice 2 agrega grants/denials de views, el cutover vive en una migration idempotente y additive. Si alguna remediacion toca smoke behavior, usar el flag definido por `TASK-883` (`SMOKE_RESILIENCE_V2_ENABLED`) o crear uno durante esa task, no aqui.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Doc-only / revert task delta | inmediato | si |
| Slice 2 | Migration append-only: marcar grants inactive/denied con updated_by rollback; no DELETE manual | <15 min | si |
| Slice 3 | Revert performance PR in `TASK-928` | <15 min | si |
| Slice 4 | Revert smoke change or flip `SMOKE_RESILIENCE_V2_ENABLED=false` | <15 min | si |
| Slice 5 | Doc-only delegation | inmediato | si |
| Slice 6 | Reopen Sentry issue if recurrence appears | inmediato | si |

### Production verification sequence

1. Query Sentry by environment and record exact active families.
2. For `role_view_fallback_used`, run live SQL before migration to list missing designer grants.
3. Apply migration in staging/preview and verify `authorizedViews` no longer rely on fallback for the sampled views.
4. Deploy and monitor Sentry for `role_view_fallback_used` quiet period.
5. Verify `TASK-928` routes show reduced N+1 events or updated owner plan.
6. Verify `/api/auth/health` and ops-worker smoke behavior; update `TASK-883` if recurrence is probe-only.
7. Verify `TASK-1106` still owns `rpa_median`.
8. Prepare stale resolve list and resolve only after evidence.

### Out-of-band coordination required

- Sentry read-only API access via local `SENTRY_INCIDENTS_AUTH_TOKEN`.
- Sentry issue resolution may require operator confirmation if resolving many stale groups at once.
- Database migration apply requires normal Cloud SQL migration process.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] A current Sentry ledger exists in the task delta/plan with each active/recent/stale family classified and linked to owner task.
- [ ] `role_view_fallback_used` for `designer` is either fixed by explicit grants/denials or documented as a deliberate policy exception with Sentry quiet evidence.
- [ ] N+1 active routes are covered by `TASK-928` or a documented follow-up, with post-deploy Sentry/query-count evidence.
- [ ] `JAVASCRIPT-NEXTJS-4S` is classified as active auth outage or smoke flapping using live `/api/auth/health` evidence; `TASK-883` is updated if needed.
- [ ] `JAVASCRIPT-NEXTJS-7H` remains owned by `TASK-1106` and severity is updated if it appears outside preview.
- [ ] Stale Sentry issues are resolved only after evidence list and no active recurrence.

## Verification

- `pnpm task:lint --task TASK-1107`
- `pnpm ops:lint --changed`
- Sentry API query for `production`, `preview`, `staging` over `24h` and `14d`.
- Live runtime check for `https://greenhouse.efeoncepro.com/api/auth/health`.
- PostgreSQL smoke for `role_view_assignments` after any migration.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Sentry issues resolved/reopened status was documented with evidence and date

## Follow-ups

- `TASK-1106` — Account 360 delivery serving contract hardening.
- `TASK-883` — Auth smoke synthetic monitor resilience.
- `TASK-928` — Reliability/admin N+1 batching and request cache.

## Delta 2026-06-13

Task creada desde investigacion Sentry read-only. Estado inicial:

- `JAVASCRIPT-NEXTJS-7H` real preview, ultimo evento `2026-06-12T23:54:41Z`.
- `role_view_fallback_used` real reciente, ultima rafaga aprox. `2026-06-13T00:33:09Z`.
- `JAVASCRIPT-NEXTJS-4S` reciente, ultimo evento `2026-06-13T00:30:06Z`; health production listo en `2026-06-13T11:54:14Z`.
- N+1 Query activo con eventos cerca de `2026-06-13T11:00Z` y preview `/finance/quotes/new` en `2026-06-13T11:53Z`.

## Open Questions

- Politica exacta para `designer`: acceso explicito a todas las views de `internal`/`my`, o solo subconjunto operativo?
- ¿Resolver stale Sentry issues en lote despues del spot-check o uno por uno por dominio?
