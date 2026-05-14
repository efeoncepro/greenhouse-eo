# TASK-873 — Workforce Intake UI V1.1

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `SHIPPED 2026-05-14 en develop (6 commits sin PR ceremony directo)`
- Rank: `TBD`
- Domain: `identity|hr|ui`
- Blocked by: `none` (TASK-872 endpoint backend + capabilities + signals + member status enum YA shipped 2026-05-13)
- Branch: `develop` (sin branch separada — pattern TASK-822..827; instrucción operativa explícita del user "mantente en develop")
- Legacy ID: `none`
- GitHub Issue: `optional`
- Shipped commits: Slice 1 `00730a82` + Slice 2 `4969014f` + Slice 3 `7b558258` + Slice 4 `caeeaa20` + Slice 5 `6dff8586` + Slice 6 closing

## Summary

Cerrar el loop UI del workforce intake workflow introducido por TASK-872. HR necesita un surface admin para visualizar members con `workforce_intake_status != 'completed'` y completar la transición (`pending_intake` o `in_review` → `completed`) sin recurrir a `curl` técnico. Entrega: badge "Ficha pendiente" en People/HR + botón "Completar ficha" en detalle del member + admin queue dedicada en `/admin/workforce/intake-queue`.

## Why This Task Exists

TASK-872 Slice 5 shipped el endpoint `POST /api/admin/workforce/members/[memberId]/complete-intake` el 2026-05-13 (commit `6115d3d7`), pero V1.0 fue intencionalmente backend-only para acelerar el cierre. Hoy:

- Felipe Zurita + María Camila Hoyos están en `workforce_intake_status='pending_intake'` en PG staging (members `e603fade-...` y `d1a72374-...`)
- El reliability signal `workforce.scim_members_pending_profile_completion` alerta a partir de los 7 días sin completar
- HR no tiene cómo completar la ficha sin pedirle a un humano técnico que invoque el endpoint via curl/Postman

Mientras el flag `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` no se flippee en producción, Felipe + María quedan invisibles para payroll (gate aún no enforce). Pero cuando se flippee, sin esta UI HR queda bloqueada operativamente.

Esta task cierra la brecha entre "el código existe" y "HR puede usarlo".

## Goal

- Badge visual canónico ("Ficha pendiente") en `PeopleListTable` para filas con `workforce_intake_status != 'completed'`, sin romper layout existente.
- Botón "Completar ficha" en `PersonView` (detalle member) gated por capability `workforce.member.complete_intake`, con modal/drawer que captura `reason?` opcional e invoca el endpoint existente.
- Admin queue page `/admin/workforce/intake-queue` con tabla de members pending, server-side capability gate, filter por status (`pending_intake` / `in_review`), botón "Completar" inline + drawer detalle.
- Microcopy es-CL canónico via `GH_WORKFORCE_INTAKE` namespace en `src/lib/copy/workforce.ts`, sin strings hardcodeados (lint rule `greenhouse/no-untokenized-copy` modo `error`).
- Reliability signal `workforce.scim_members_pending_profile_completion` visible en el dashboard `/admin/operations` con link directo al admin queue.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` (Delta TASK-872 V1)

Reglas obligatorias:

- TODO copy visible debe pasar por `getMicrocopy()` o `src/lib/copy/workforce.ts`. Lint rule `greenhouse/no-untokenized-copy` activa en modo `error` — bloquea commit si emerge string hardcoded.
- Capability check canonical en server pages via `buildTenantEntitlementSubject(tenant)` + `can(subject, 'workforce.member.complete_intake', 'update', 'tenant')`. NUNCA verificar `roleCodes.includes(...)` inline.
- Componentes UI: MUI v7 + Vuexy primitives (`CustomChip` o `Chip` directo según patrón existente PeopleListTable + HrOnboardingView).
- Tokens visuales canónicos: `color='warning'` para estado pending intake (consistente con badges de status del repo).
- Charts: N/A (no aplica charts en esta task).
- Botón complete-intake llama al endpoint existente — NO duplicar lógica de transición.
- Drawer/modal pattern: respetar Vuexy `Drawer anchor='right'` con focus trap canonical de MUI.
- Para tests E2E del flow: usar agent auth (`/api/auth/agent-session`) + Playwright + Chromium per CLAUDE.md.

## Normative Docs

- `docs/operations/runbooks/scim-internal-collaborator-recovery.md` — escenario 4 (member pending > 30d) describe el flow operativo que esta UI materializa
- `docs/tasks/complete/TASK-872-scim-internal-collaborator-provisioning.md` — spec del endpoint backend que se consume

## Dependencies & Impact

### Depends on

- `src/app/api/admin/workforce/members/[memberId]/complete-intake/route.ts` (TASK-872 Slice 5) — endpoint canonical
- `greenhouse_core.members.workforce_intake_status` column (TASK-872 Slice 1.5) — data source
- `capabilities_registry.workforce.member.complete_intake` (TASK-872 Slice 1.5 seed) — capability gate
- `src/lib/reliability/queries/scim-workforce-signals.ts` — signal reader `getWorkforceScimMembersPendingProfileCompletionSignal` para queue summary
- `src/views/greenhouse/people/PeopleListTable.tsx` — surface principal injection point para badge
- `src/views/greenhouse/people/PersonView.tsx` — surface detail injection point para botón
- `src/lib/copy/workforce.ts` — microcopy namespace existing extendido
- `src/lib/commercial/party/route-entitlement-subject.ts` — `buildTenantEntitlementSubject` canonical
- `src/lib/entitlements/runtime.ts` — `can()` helper

### Blocks / Impacts

- Cierra loop operativo TASK-872: HR puede completar fichas sin ayuda técnica.
- Desbloquea Sesión 3 hipotética: flippeo de `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en producción (sin esta UI, flip queda bloqueado operacionalmente).
- Impacta People/HR existing views (inyección no-disruptiva).

### Files owned

- `src/views/greenhouse/people/PeopleListTable.tsx` (modificar — agregar column/badge)
- `src/views/greenhouse/people/PersonView.tsx` (modificar — agregar botón + drawer)
- `src/views/greenhouse/admin/workforce-intake-queue/IntakeQueueView.tsx` (NUEVO — client view)
- `src/views/greenhouse/admin/workforce-intake-queue/CompleteIntakeDrawer.tsx` (NUEVO — drawer compartido)
- `src/app/(dashboard)/admin/workforce/intake-queue/page.tsx` (NUEVO — server page con capability gate)
- `src/app/api/admin/workforce/intake-queue/route.ts` (NUEVO — read endpoint paginated)
- `src/lib/copy/workforce.ts` (modificar — agregar `GH_WORKFORCE_INTAKE` namespace)
- `src/lib/workforce/intake-queue/list-pending-members.ts` (NUEVO — server-only helper read)
- `src/lib/workforce/intake-queue/list-pending-members.test.ts` (NUEVO)
- `tests/e2e/smoke/workforce-intake-flow.spec.ts` (NUEVO — Playwright E2E)
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` (modificar — sección Workforce Intake)
- `docs/manual-de-uso/hr/completar-ficha-laboral.md` (NUEVO — manual operador HR)

## Current Repo State

### Already exists

- Endpoint backend `POST /api/admin/workforce/members/[memberId]/complete-intake` (TASK-872 Slice 5, commit `6115d3d7`) — funcional, idempotente, con outbox event `workforce.member.intake_completed v1`
- Column `greenhouse_core.members.workforce_intake_status` con CHECK constraint `IN ('pending_intake','in_review','completed')` + partial index sobre filas `!= 'completed'`
- Capability `workforce.member.complete_intake` seedeada en `capabilities_registry` (FINANCE_ADMIN + EFEONCE_ADMIN canonical)
- Reliability signal `getWorkforceScimMembersPendingProfileCompletionSignal` con thresholds canonical (warning >7d, error >30d)
- 4 capabilities granulares TASK-872 vigentes en TS catalog + DB registry parity (`parity.live.test.ts` verde)
- People list view: `src/views/greenhouse/people/PeopleListTable.tsx` con tanstack-table + tipos canónicos + import `Chip` ya disponible
- Member detail view: `src/views/greenhouse/people/PersonView.tsx` con drawer pattern establecido (EditProfile, CompensationDrawer, MembershipDrawers)
- Microcopy infra: `src/lib/copy/workforce.ts` con namespace `GH_SKILLS_CERTS` existente como referencia + lint rule `greenhouse/no-untokenized-copy` activa modo `error`
- Capability check pattern canonical en `src/app/(dashboard)/admin/releases/page.tsx` (TASK-848) — server page → require session → buildTenantEntitlementSubject → can() → redirect
- Felipe Zurita (`e603fade-...`) + María Camila Hoyos (`d1a72374-...`) con `workforce_intake_status='pending_intake'` en PG staging — sujetos de prueba E2E reales

### Gap

- Sin badge visual en `PeopleListTable` que distinga members `pending_intake` / `in_review` vs `completed`. HR no puede identificarlos sin queries SQL.
- Sin botón "Completar ficha" en `PersonView` detalle. Operador técnico debe usar `curl` con session válida.
- Sin admin queue dedicada `/admin/workforce/intake-queue`. Sin discoverability del endpoint backend.
- Sin link desde el dashboard `/admin/operations` (reliability signal) al queue.
- Microcopy del flow no existe en `GH_WORKFORCE_INTAKE` namespace.
- Manual operador HR `docs/manual-de-uso/hr/completar-ficha-laboral.md` no existe.
- Sin E2E smoke test que valide el flow end-to-end (badge → botón → drawer → submit → status transitiona → signal baja).

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

### Slice 1 — Microcopy + helper reader

- Agregar namespace `GH_WORKFORCE_INTAKE` a `src/lib/copy/workforce.ts` con strings canónicos es-CL:
  - `badgePendingIntake`: "Ficha pendiente"
  - `badgeInReview`: "Ficha en revisión"
  - `buttonCompleteIntake`: "Completar ficha"
  - `drawerTitle`: "Completar ficha laboral"
  - `drawerBodyDescription`: "Confirma que los datos laborales del colaborador están completos…"
  - `reasonFieldLabel`: "Razón / notas (opcional)"
  - `submitConfirm`: "Marcar como completada"
  - `submitSuccess`: "Ficha completada"
  - `submitError`: "No fue posible completar la ficha. Revisa logs."
  - `ariaLabelPendingChip`: "Colaborador con ficha laboral pendiente de completar"
  - `emptyQueueState`: "Sin colaboradores con ficha pendiente"
  - `queuePageTitle`: "Fichas laborales pendientes"
  - `queuePageDescription`: "Colaboradores creados desde Entra que aún requieren completar contrato y compensación."
  - 2-3 más según necesidad del operador HR.
- Skill `greenhouse-ux-writing` review obligatoria pre-commit (es-CL tuteo, sin colon-before-tool-calls, length ≤200 chars donde aplique).
- Helper canonical `listPendingIntakeMembers({page, pageSize, statusFilter?})` en `src/lib/workforce/intake-queue/list-pending-members.ts`:
  - Server-only
  - Returns `{members: Array<{memberId, displayName, primaryEmail, workforceIntakeStatus, identityProfileId, createdAt}>, total, page, pageSize}`
  - WHERE `workforce_intake_status != 'completed' AND active = TRUE`
  - Cursor pagination keyset `(created_at ASC, member_id ASC)` per CLAUDE.md scalability rules
  - Filter opcional por `statusFilter: 'pending_intake' | 'in_review' | 'all'`
- Unit tests con mock PG + tests cubren paginación + filter + empty.

### Slice 2 — Badge en PeopleListTable

- Inyectar columna o campo en row render que muestre `<Chip color='warning' variant='outlined' size='small' label={GH_WORKFORCE_INTAKE.badgePendingIntake} />` cuando member tiene `workforce_intake_status='pending_intake'`. Mismo patrón con `color='info'` y `badgeInReview` para `'in_review'`.
- aria-label canonical del chip leído desde `GH_WORKFORCE_INTAKE.ariaLabelPendingChip` (a11y-architect compliance — color no es el único señalizador).
- NO breaking change: si la query upstream no devuelve `workforce_intake_status`, el badge no se renderiza (default ausencia = `completed` legacy).
- Extender shape del row data en server reader si necesario (`src/lib/people/` reader actual + tipo `PersonRow`).
- Tests unitarios componente con render 3 variantes (pending / in_review / completed → no badge).

### Slice 3 — Botón "Completar ficha" en PersonView + drawer compartido

- Agregar `<Button>` en header de `PersonView` visible solo si `workforce_intake_status != 'completed'` AND user actual tiene capability `workforce.member.complete_intake` (resolver server-side via session, pasar al client como flag boolean).
- Botón abre `<CompleteIntakeDrawer />` componente compartido en `src/views/greenhouse/admin/workforce-intake-queue/CompleteIntakeDrawer.tsx`:
  - Drawer anchor='right' width 480 desktop / 100% mobile
  - Display: nombre, email, status actual, identity_profile_id (read-only)
  - Form: `reason` opcional TextField multiline 3 rows
  - Submit button: POST `/api/admin/workforce/members/[memberId]/complete-intake` con body `{reason}`
  - Success: toast `sonner` con `GH_WORKFORCE_INTAKE.submitSuccess` + close drawer + refresh data parent (router.refresh())
  - Error: toast destructive con error.message redacted (si emerge raw, mensaje canonical fallback)
  - Loading state: button disabled + CircularProgress inline
  - aria-modal + focus trap nativo MUI
- Validation client-side: ninguno (server-side decide validez; ver TASK-872 endpoint enforce source state)

### Slice 4 — Admin queue page `/admin/workforce/intake-queue`

- Server page `src/app/(dashboard)/admin/workforce/intake-queue/page.tsx`:
  - `requireServerSession()` + redirect si no
  - `buildTenantEntitlementSubject(tenant)` + `can(subject, 'workforce.member.complete_intake', 'update', 'tenant')` → redirect a `tenant.portalHomePath` si deniega
  - Initial fetch en Promise.all: `listPendingIntakeMembers({page:1, pageSize:50})` + `getWorkforceScimMembersPendingProfileCompletionSignal()` para banner status
  - `export const dynamic = 'force-dynamic'`
  - Renderiza `<IntakeQueueView initialData={...} initialSignal={...} />`
- API route `src/app/api/admin/workforce/intake-queue/route.ts` para paginación cliente:
  - GET con query params `page`, `pageSize`, `statusFilter`
  - Mismo capability check
  - Invoca `listPendingIntakeMembers`
  - Response shape canonical `{items, total, page, pageSize}` (greenhouse-backend skill canonical)
- Client view `src/views/greenhouse/admin/workforce-intake-queue/IntakeQueueView.tsx`:
  - Banner condicional cuando signal.severity != 'ok' (warning/error) con summary text del signal
  - Tabla TanStack con columnas: Avatar + nombre, email, status chip, createdAt, ageDays, acción "Completar"
  - Filter chips tabs: "Todos" / "Pendientes intake" / "En revisión"
  - Empty state canónico con `EmptyState` primitive + microcopy `emptyQueueState`
  - Click en row o button abre `<CompleteIntakeDrawer>` (shared con Slice 3)
  - Post-submit: refresh tabla via mutate/router.refresh()
  - Cursor pagination "Cargar más" footer con CircularProgress inline (no offset — keyset per CLAUDE.md)

### Slice 5 — Reliability Overview dashboard link

- En `/admin/operations` dashboard, cuando `workforce.scim_members_pending_profile_completion` signal aparece con `severity != 'ok'`, agregar link CTA "Ver fichas pendientes →" que navega a `/admin/workforce/intake-queue`.
- Cambio aditivo en `src/views/greenhouse/admin/operations-overview/...` (verificar path exacto en Discovery).
- Microcopy `linkToQueue` agregada al `GH_WORKFORCE_INTAKE` namespace.

### Slice 6 — E2E smoke test + docs + close

- Playwright smoke test `tests/e2e/smoke/workforce-intake-flow.spec.ts`:
  - Agent auth setup (`/api/auth/agent-session`)
  - Login → navegar `/admin/workforce/intake-queue`
  - Assert tabla muestra al menos 1 row con status `pending_intake` (sujetos staging Felipe / Maria)
  - Click "Completar" → drawer abre → submit con reason
  - Assert toast success + status transitiona en DB (verify via API GET)
- Manual de uso operador HR `docs/manual-de-uso/hr/completar-ficha-laboral.md`:
  - "Cuándo aparece un colaborador en esta cola"
  - "Qué validar antes de completar la ficha"
  - "Cómo completar paso a paso"
  - "Qué pasa después" (member entra a payroll, etc.)
  - "Errores comunes y troubleshooting"
- Actualizar `docs/documentation/identity/sistema-identidad-roles-acceso.md` con sección Workforce Intake.
- CLAUDE.md update opcional (regla nueva si emerge invariant — probable: NO, ya cubierto por TASK-872).
- Close protocol: move task a `complete/`, sync README, Handoff entry.

## Out of Scope

- Validation server-side de readiness para `complete_intake` (verificar compensation_packages + contract_terms + person_legal_profile). El endpoint TASK-872 V1.0 NO valida readiness; esta task V1.1 tampoco. Operador HR confirma manualmente antes de invocar. **V1.2 future**: agregar validation pre-flight con warnings/blockers.
- Bulk complete intake (seleccionar N members + completar todos). V1.0 = uno-a-uno.
- Workflow wizard multi-step para HR (paso 1: compensation, paso 2: contract, etc.). V1.0 = botón directo "Completar" assume datos ya están.
- Notificación email/Teams al member cuando su ficha se completa. Out of scope (manejable por outbox event downstream).
- Integration con Person Legal Profile reveal (TASK-784) — fuera de scope.
- Reversion de `completed` → `pending_intake`. La transición es one-way en V1.0 (`workforce_intake_status` state machine no permite regresar canonical).
- UI para gestionar `scim_eligibility_overrides` allowlist/denylist (TASK-872 follow-up V1.1 separado).
- UI para resolver drift cases (`identity.scim.member_identity_drift`). Out of scope — runbook escenario 3 maneja vía SQL manual.

## Detailed Spec

### Microcopy structure `GH_WORKFORCE_INTAKE`

Vivirá en `src/lib/copy/workforce.ts` extendiendo el namespace existing `GH_SKILLS_CERTS`. Shape canonical:

```ts
export const GH_WORKFORCE_INTAKE = {
  badgePendingIntake: 'Ficha pendiente',
  badgeInReview: 'Ficha en revisión',
  buttonCompleteIntake: 'Completar ficha',
  drawerTitle: 'Completar ficha laboral',
  // ...etc
} as const
```

`greenhouse-ux-writing` skill review obligatoria con es-CL tuteo + length compliance.

### Reader `listPendingIntakeMembers`

Server-only. SQL canonical:

```sql
SELECT m.member_id, m.display_name, m.primary_email, m.workforce_intake_status,
       m.identity_profile_id, m.created_at,
       EXTRACT(DAY FROM (NOW() - m.created_at))::int AS age_days
FROM greenhouse_core.members m
WHERE m.workforce_intake_status != 'completed'
  AND m.active = TRUE
  AND ($1::text IS NULL OR m.workforce_intake_status = $1)
ORDER BY m.created_at ASC, m.member_id ASC
LIMIT $2 + 1
```

Cursor pagination keyset (no OFFSET) — fetch `pageSize+1` para detectar `hasMore`.

### `CompleteIntakeDrawer` component

Props:

```ts
interface CompleteIntakeDrawerProps {
  open: boolean
  onClose: () => void
  onCompleted?: () => void  // refresh callback parent
  member: {
    memberId: string
    displayName: string
    primaryEmail: string | null
    workforceIntakeStatus: 'pending_intake' | 'in_review'
    identityProfileId: string | null
    createdAt: string
    ageDays: number
  }
}
```

Submit flow:

1. setState `loading: true`
2. `fetch('/api/admin/workforce/members/' + memberId + '/complete-intake', { method: 'POST', body: JSON.stringify({ reason }) })`
3. Success → `toast.success(GH_WORKFORCE_INTAKE.submitSuccess)` + onClose() + onCompleted?()
4. Error → `toast.error(GH_WORKFORCE_INTAKE.submitError)` + log via console (NO Sentry desde client — el endpoint ya emite captureWithDomain)
5. Finally setState `loading: false`

### Tokens visuales canónicos

- Badge pending_intake: `<Chip color='warning' variant='outlined' size='small' icon={<i className='tabler-clock' />} />`
- Badge in_review: `<Chip color='info' variant='outlined' size='small' icon={<i className='tabler-eye-check' />} />`
- Drawer width: 480px desktop / 100% mobile (mirror release admin drawer TASK-854)
- Button "Completar ficha": `<Button variant='contained' size='small' startIcon={<i className='tabler-check' />}>`

### Access Model

- `views` / `authorizedViews`: agregar entry nueva `admin.workforce.intake_queue` en `VIEW_REGISTRY` + migration de seed `role_view_assignments` (efeonce_admin + hr_payroll si emerge — TASK-872 capability assigned a FINANCE_ADMIN + EFEONCE_ADMIN; verificar si hr_payroll también debe acceder).
- `entitlements`: capability existing `workforce.member.complete_intake` (seeded TASK-872 Slice 1.5). No new capabilities.
- `routeGroups`: no cambiar.
- `startup policy`: no cambiar.

## Rollout Plan & Risk Matrix

Esta task es **UI additive** sobre backend canónico ya shipped (TASK-872). Bajo riesgo operativo. Sin migrations destructivas, sin cambios al runtime de payroll/SCIM, sin nuevos flags productivos críticos. Rollout straightforward.

### Slice ordering hard rule

```text
Slice 1 (microcopy + reader)
   ↓
Slice 2 (badge PeopleListTable)    ◄── puede correr en paralelo con Slice 3
   ↓                                       ↓
Slice 3 (botón + drawer)                   ↓
   ↓                                       ↓
Slice 4 (admin queue page) ◄── requires Slice 1 (reader) + Slice 3 (drawer)
   ↓
Slice 5 (link en operations dashboard) ◄── trivial, post-Slice 4
   ↓
Slice 6 (E2E + docs + close)
```

Slices 2 y 3 son independientes — agente puede hacerlos en paralelo o secuencial. Slice 4 wraps drawer del Slice 3 → debe ir después. Slice 5 + 6 son closure.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Operador HR completa ficha sin datos reales (false-complete) | identity / payroll | medium | V1.0 endpoint NO valida readiness; operador asume responsabilidad. Banner advertencia en drawer body. V1.2 agregar pre-flight validation. | Sentry domain=identity emite si endpoint throws. Signal `workforce.scim_members_pending_profile_completion` baja a 0 cuando aplica. |
| Badge breaks existing PeopleListTable layout | UI | low | Tests visuales unitarios + smoke E2E + lint canonical no-untokenized-copy + chip primitive existing ya validada en PeopleListTable | N/A — UI regression visible en smoke |
| Microcopy queda untokenized (bypass lint rule) | UI / lint | very low | `greenhouse/no-untokenized-copy` modo `error` bloquea commit automáticamente | CI lint gate |
| Capability check incorrecto deja UI accesible a usuarios sin permiso | identity / security | low | Server page redirect canonical pattern (TASK-848 mirror). E2E smoke test con role no-admin verifica redirect. | Sentry domain=identity emite si capability bypass detectado |
| Drawer no actualiza tabla post-submit | UI | low | router.refresh() + onCompleted callback pattern. Smoke test cubre. | N/A — visible operacionalmente |
| Endpoint backend responde 5xx → UX rota | identity | low | Toast destructive con fallback canonical message. Loading state visible. Endpoint TASK-872 idempotente. | Signal `identity.scim.users_without_member` no afectado; backend error log lo captura |

### Feature flags / cutover

Sin flag — additive UI, immediate cutover post-merge.

Razón: el endpoint backend `POST /api/admin/workforce/members/[memberId]/complete-intake` YA está shipped y operativo en producción (default flags TASK-872 no bloquean este endpoint — solo bloquean SCIM CREATE flow + payroll gate). La UI nueva solo agrega surfaces visuales que invocan el endpoint existente. Cero behavioral change para users sin capability `workforce.member.complete_intake` (Server page redirect; botón no se muestra en PersonView; queue page redirect).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert <slice1>` + redeploy | <30 min | sí — solo microcopy + reader, sin consumers downstream activos hasta Slice 2 |
| Slice 2 | `git revert <slice2>` + redeploy. PeopleListTable vuelve a render sin badge. | <30 min | sí — additive column/render |
| Slice 3 | `git revert <slice3>` + redeploy. PersonView vuelve sin botón complete-intake. | <30 min | sí — additive UI |
| Slice 4 | `git revert <slice4>` + redeploy. Page `/admin/workforce/intake-queue` retorna 404. | <30 min | sí — page nueva sin consumers downstream |
| Slice 5 | `git revert <slice5>` + redeploy. Dashboard `/admin/operations` no muestra link. | <30 min | sí — additive link |
| Slice 6 | `git revert <slice6>` + redeploy. Tests/docs revertidos. | <30 min | sí — test infra only |

### Production verification sequence

1. Merge a `develop` → Vercel auto-deploy staging.
2. Smoke staging:
   - Login como EFEONCE_ADMIN.
   - Navegar `/admin/workforce/intake-queue` → tabla muestra Felipe + María Camila (sujetos PG staging real).
   - Click "Completar" en Felipe → drawer abre → submit con reason `"Test V1.1 smoke staging — datos completos verificados manualmente"`.
   - Verify status transitiona a `completed` en PG (via PG query directa o reload tabla).
   - Verify outbox event `workforce.member.intake_completed v1` se emitió (PG query a `outbox_events`).
   - Verify reliability signal `workforce.scim_members_pending_profile_completion` baja count en 1.
3. Login como rol non-admin (e.g. `collaborator`) → navegar `/admin/workforce/intake-queue` → redirect a portalHomePath (capability check enforce).
4. Repetir 2-3 en producción (post merge develop→main + flag toggles si emergen).
5. Monitor signals durante 7d post-prod.

### Out-of-band coordination required

- Coordinar con HR equipo antes de shipping: comunicación interna sobre nueva surface + workflow esperado (datos pre-flight a confirmar manualmente).
- Pre-shipping: confirmar capability `workforce.member.complete_intake` asignada a los actores correctos (FINANCE_ADMIN + EFEONCE_ADMIN canonical, decidir si hr_payroll también).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GH_WORKFORCE_INTAKE` namespace en `src/lib/copy/workforce.ts` con ≥10 strings es-CL revisados con skill `greenhouse-ux-writing`.
- [ ] Helper `listPendingIntakeMembers` exporta shape canonical + tests unitarios verde (paginación + filter + empty).
- [ ] `PeopleListTable` muestra chip warning "Ficha pendiente" cuando `workforce_intake_status='pending_intake'` y chip info "Ficha en revisión" cuando `'in_review'`. aria-label canónico presente. Sin badge para `completed`.
- [ ] `PersonView` muestra botón "Completar ficha" SOLO si actor tiene capability + status != completed. Botón abre `CompleteIntakeDrawer`. Drawer captura reason opcional, invoca POST endpoint, toast success/error correcto, refresh post-submit.
- [ ] `/admin/workforce/intake-queue` accesible solo con capability `workforce.member.complete_intake`. Server page redirect canonical para roles sin acceso.
- [ ] Tabla queue muestra Felipe + María Camila (staging) con avatar + nombre + email + chip status + age days + botón "Completar".
- [ ] Filter tabs "Todos" / "Pendientes intake" / "En revisión" funcional.
- [ ] Empty state canonical visible cuando lista vacía.
- [ ] Cursor pagination (no OFFSET) — "Cargar más" footer.
- [ ] Banner condicional en queue cuando signal severity != 'ok'.
- [ ] Dashboard `/admin/operations` muestra link CTA a queue cuando signal alerta.
- [ ] Playwright E2E smoke `workforce-intake-flow.spec.ts` verde: flow completo desde queue → drawer → submit → status transitions.
- [ ] Manual operador `docs/manual-de-uso/hr/completar-ficha-laboral.md` creado con secciones canonical.
- [ ] `pnpm lint` 0 errors (incluye `greenhouse/no-untokenized-copy` modo error).
- [ ] `pnpm tsc --noEmit` 0 errors.
- [ ] `pnpm test` verde (helpers + components nuevos).
- [ ] `pnpm build` Turbopack verde (defense in depth contra `server-only` transitivo).
- [ ] Smoke staging: Felipe completed manualmente → reliability signal baja 1.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/workforce/intake-queue src/views/greenhouse/admin/workforce-intake-queue src/views/greenhouse/people`
- `pnpm build`
- E2E: `pnpm playwright test tests/e2e/smoke/workforce-intake-flow.spec.ts --project=chromium`
- Smoke staging manual:
  - Navegar `/admin/workforce/intake-queue` como EFEONCE_ADMIN → tabla con Felipe + María
  - Completar Felipe via drawer → status transitiona, signal baja
  - Re-login como rol non-admin → page redirect canonical

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] Archivo en carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con resumen + KPI diff (signals post-completión)
- [ ] `changelog.md` actualizado si cambia comportamiento visible
- [ ] Chequeo de impacto cruzado sobre otras tasks afectadas (tasks que toquen `PeopleListTable` o `PersonView`)
- [ ] `docs/architecture/DECISIONS_INDEX.md` actualizado si emerge ADR nuevo (probable: NO)
- [ ] Capability `workforce.member.complete_intake` granted a hr_payroll role si Discovery lo confirma
- [ ] Microcopy revisado por skill `greenhouse-ux-writing` y aprobado
- [ ] Manual operador HR publicado y enlazado desde `docs/manual-de-uso/README.md`

## Follow-ups

- V1.2: validation pre-flight server-side en endpoint complete-intake (verifica compensation_packages + contract_terms + person_legal_profile readiness; bloquea con detalle si falta data crítica). Saca a `_warnings` queue actualmente "in_review" pending → fuerza ruta de revisión.
- V1.2: bulk complete intake (seleccionar N + completar todos con reason compartida).
- V1.2: wizard multi-step para HR completar contrato + compensación + legal profile en una sola surface (full Workforce Intake wizard).
- V1.2: notificación Teams al member cuando su ficha se completa (via Notification Hub).
- V1.2: surface admin para gestión de `scim_eligibility_overrides` allowlist (TASK-872 follow-up separado).
- V1.2: surface admin para resolver drift cases (`identity.scim.member_identity_drift` queue).

## Open Questions

- ¿La capability `workforce.member.complete_intake` debe extenderse a role `hr_payroll` además de FINANCE_ADMIN + EFEONCE_ADMIN? Discovery confirma con stakeholders HR. Recomendación pre-cierre: SÍ — HR es el operador natural del workflow.
- ¿Banner advertencia en drawer body debe ser hardcoded o configurable per-tenant? V1.0 hardcoded en microcopy. V1.1 evaluar si emerge necesidad.
- ¿El admin queue page debe permitir filter adicional por antigüedad (`created_at < N days`)? V1.0 NO (status filter suficiente). V1.1 evaluar feedback HR.
- ¿En el drawer del botón en PersonView, debe mostrar también historia del member (cuando fue creado via SCIM, qué outbox events se emitieron)? V1.0 NO (out of scope). V1.1 si emerge necesidad audit-forensic visible al operador.
