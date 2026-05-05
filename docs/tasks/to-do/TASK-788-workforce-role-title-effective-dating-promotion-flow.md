# TASK-788 — Workforce Role Title Effective-Dating + Compensation-Coupled Promotions

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-788-workforce-role-title-effective-dating-promotion-flow`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extender el contrato canonico de `members.role_title` (TASK-785) para soportar 3 flujos operativos que hoy NO estan cubiertos: (1) cambio con `effective_at` futuro (programar ascenso), (2) historial efectivo versionado (lookup "que cargo tenia este miembro el 2026-03-01"), (3) ascenso atomico cargo + compensation (un solo gesto, una sola fecha efectiva, una sola razon HR, audit unificado).

## Why This Task Exists

TASK-785 cerro la base canonica del cargo: source of truth, audit append-only, drift queue vs Entra, resolver per-context, capabilities. Pero la mutation actual (`updateMemberRoleTitle`) escribe al instante. En la operativa real de HR esto produce 3 limitaciones concretas:

1. **Programar ascensos:** HR aprueba el ascenso a "Design Lead" en el ciclo Q2-2026 con efectividad 1 de mayo. Hoy hay que esperar al dia exacto y editarlo manualmente, o editar antes y aceptar que durante 2 semanas el cargo en runtime ya no refleja la realidad contractual. El campo `effectiveAt` ya existe en el contrato del endpoint pero queda como timestamp de registro — no programa nada.
2. **Historial efectivo:** Para finiquitos, contratos historicos, auditoria SII, reportes anuales y litigios laborales, HR necesita responder "que cargo tenia X persona el 1 de enero de 2026". Hoy el audit log linealiza los cambios pero no expone una query natural por fecha; cada consumer reinventaria el lookup.
3. **Ascenso atomico cargo + compensation:** Hoy cambiar de "Senior Designer" a "Design Lead" y subir la banda salarial son dos endpoints distintos, sin atomicidad ni razon unificada. Riesgo real: cambio de cargo con salario viejo, o cambio de salario con cargo viejo, o razones desalineadas en cada audit log.

La raiz: `members.role_title` es estado escalar; el dominio HR opera sobre versiones temporales con vigencia (interval-based) y a menudo acopla cargo + comp + nivel + departamento como un solo evento "promotion". Sin esto, payroll/finiquito/staffing leen el cargo del momento del render, no el contractual de la fecha relevante.

## Goal

- Modelo de versiones temporales (`member_role_title_versions`) con `effective_from` / `effective_to` no-overlapping; mutations programan futuro o registran pasado correctivo.
- Resolver canonico extendido con parametro `at?: Date` que retorna el cargo vigente al momento solicitado (default: hoy). Single source of truth para "cargo a fecha X en surface Y" sin que cada consumer reinvente lookup.
- Helper canonico `promoteMember(...)` atomic: cargo + (opcional) `compensation_version` + (opcional) `job_level` + razon unica + audit unificado + outbox `member.promotion.executed` v1.
- UI: en `MemberRoleTitleSection` agregar selector de "Efectivo desde" (date picker) y, cuando capability `compensation.update` esta presente, checkbox "Acoplar cambio salarial" que abre el form de comp en el mismo dialogo. Banner inline mostrando cambios programados a futuro.
- Reliability signals: `workforce.role_title.scheduled_change_overdue` (programado pero no aplicado, indicio de cron caido) y `workforce.role_title.version_overlap` (steady = 0, defensivo contra bugs de mutacion).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — frontera con compensation_versions y como Payroll lee el cargo al periodo.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — agregar `member.promotion.executed` v1 + delta.

Reglas obligatorias:

- **NUNCA** branchear el resolver por contexto sin parametro `at`. El parametro es default-hoy pero siempre disponible. Single signature.
- **NUNCA** desincronizar el state escalar `members.role_title` (TASK-785) y la nueva tabla `member_role_title_versions`. El escalar refleja la version cuya `effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())`. Trigger PG mantiene consistencia.
- **NUNCA** permitir version overlap: constraint `EXCLUDE USING gist (member_id WITH =, daterange(effective_from, effective_to, '[)') WITH &&)`.
- **NUNCA** mutar versions historicas (effective_to no-NULL en el pasado). Para correcciones se inserta una nueva version con `correction_of=<old_version_id>` + razon + audit.
- **NUNCA** crear un endpoint `promote` que escriba cargo y comp en transacciones separadas. Atomic tx unica o rollback completo.
- Cron diario `apply-scheduled-role-title-changes` corre 00:05 America/Santiago. Idempotente. Falla aislada per-version (un version roto NO bloquea el resto del batch).

## Normative Docs

- `docs/tasks/complete/TASK-785-workforce-role-title-source-of-truth-governance.md` — base canonica que esta task extiende.
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (seccion compensation_versions) — frontera con comp.

## Dependencies & Impact

### Depends on

- `TASK-785` ✅ (base canonica de role_title source + audit + drift) — cerrada.
- `greenhouse_core.members` columnas `role_title`, `role_title_source`, `last_human_update_at` (TASK-785).
- `greenhouse_hr.compensation_versions` (modelo existente de bandas/salarios temporales) — referencia, no se modifica su shape.
- `greenhouse_sync.outbox_events` + reactive consumer (TASK-773) — para event `member.promotion.executed`.
- Cloud Scheduler `ops-worker` (TASK-775) — para cron diario apply-scheduled.

### Blocks / Impacts

- `payroll_document` resolver context: pasara a aceptar `at` para resolver cargo a fecha del periodo, no a fecha del render.
- `finiquito` document generation: cargo en el PDF debera ser el vigente a `last_working_day`, no el actual.
- `commercial_cost` y `staffing` consumers: leeran `at=NOW()` por default — sin cambio operativo.
- TASK-786 (Person Contact & Professional Presence) y TASK-787 (Country Reconciliation) NO se acoplan; son dimensiones independientes.

### Files owned

- `migrations/<timestamp>_task-788-role-title-versions-and-promotion.sql`
- `src/lib/workforce/role-title/versions-store.ts`
- `src/lib/workforce/role-title/promote.ts`
- `src/lib/workforce/role-title/resolver.ts` (extender, no romper firma actual)
- `src/lib/workforce/role-title/scheduled-applier.ts`
- `src/app/api/admin/team/members/[memberId]/promote/route.ts`
- `src/app/api/hr/workforce/members/[memberId]/role-title/route.ts` (extender response con `versions[]` + `scheduledChange`)
- `src/views/greenhouse/people/tabs/MemberRoleTitleSection.tsx` (extender UI)
- `services/ops-worker/server.ts` + `services/ops-worker/deploy.sh` (registrar cron + handler)
- `src/lib/reliability/queries/role-title-scheduled-overdue.ts`
- `src/lib/reliability/queries/role-title-version-overlap.ts`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (delta nuevo evento)
- `CLAUDE.md` (extender seccion TASK-785 con effective-dating contract)

## Current Repo State

### Already exists

- `members.role_title` + `role_title_source` + `last_human_update_at` (TASK-785, columnas escalares).
- `member_role_title_audit_log` (append-only, TASK-785) — sigue siendo el audit canonico; las versions temporales NO lo reemplazan, ambos coexisten (versions = estado vigente; audit = quien hizo que cuando con razon).
- `member_role_title_drift_proposals` (TASK-785) — drift queue Entra. Sigue activo; promociones programadas no afectan a Entra sync hasta que se apliquen.
- `updateMemberRoleTitle()` helper (TASK-785) — escribe escalar al instante. Pasara a delegar en el helper de versions internamente para mantener API publica estable.
- `compensation_versions` (HR Payroll) — modelo temporal existente del lado de comp.

### Gap

- No hay tabla de versiones temporales para `role_title`. Cualquier query "cargo a fecha X" recompone desde audit log o asume que el escalar es la verdad — falla para finiquito de gente cuyo cargo cambio entre fecha de termino y fecha de render del documento.
- No hay forma de programar un ascenso a futuro. HR debe esperar al dia exacto.
- No hay endpoint `promote` atomic que combine cargo + comp + (opcional) departamento + (opcional) nivel.
- El resolver firma `resolveRoleTitle({memberId, context})` no acepta `at`. Cualquier surface que necesite "cargo al periodo X" reinventaria la query contra audit log o leeria mal del escalar.
- No hay cron que aplique versions con `effective_from` en el pasado proximo (caso: HR programo el ascenso para el 1, ya es el 2 y no se aplico). Sin signal, ningun observador lo detecta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema versions + EXCLUDE constraint

- Migration `member_role_title_versions` con columnas: `version_id` UUID, `member_id` FK, `role_title` TEXT NULL, `source` TEXT (`hr_manual` | `migration` | `entra_accept` | `correction`), `effective_from` DATE NOT NULL, `effective_to` DATE NULL, `created_by_user_id`, `created_at`, `reason` TEXT NOT NULL CHECK (length >= 10), `correction_of` UUID NULL FK self, `metadata_json` JSONB.
- EXCLUDE constraint anti-overlap: `EXCLUDE USING gist (member_id WITH =, daterange(effective_from, COALESCE(effective_to, '9999-12-31'::date), '[)') WITH &&)`.
- Trigger `member_role_title_version_anti_update` (BEFORE UPDATE/DELETE WHEN effective_to <= NOW() AND TG_OP IN ('UPDATE', 'DELETE') RAISE EXCEPTION).
- Backfill: por cada `members.role_title IS NOT NULL`, INSERT version inicial con `effective_from = COALESCE(role_title_updated_at::date, hire_date, '2020-01-01')`, `effective_to = NULL`, `source = role_title_source`, `reason = 'Backfill TASK-788 desde members.role_title escalar'`.
- Trigger `members_role_title_version_sync` (AFTER INSERT/UPDATE de versions): UPDATE `members.role_title` y `role_title_source` con la version `effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())`. Single source of truth queda en versions; el escalar es proyeccion.

### Slice 2 — Versions store + resolver extension

- `src/lib/workforce/role-title/versions-store.ts`:
  - `insertRoleTitleVersion(input)` — atomic; valida no-overlap; cierra version vigente si `effective_from < hoy` (correccion).
  - `listRoleTitleVersionsForMember(memberId)` — historial completo, orden DESC.
  - `getRoleTitleVersionAt(memberId, at)` — version vigente a fecha.
  - `getScheduledRoleTitleChangeForMember(memberId)` — version con `effective_from > NOW()` mas proxima.
- Extender `resolver.ts`: firma queda `resolveRoleTitle({memberId, context, assignmentId?, at?})`. Si `at` viene, lee version vigente a esa fecha; si no, lee el escalar actual (path actual TASK-785). Backward compatible.
- Extender `updateMemberRoleTitle()` (TASK-785) para que internamente delegue en `insertRoleTitleVersion` con `effective_from = NOW()` + cierre del vigente. API publica estable.
- Tests: 12 tests cubriendo overlap rejection, scheduled future, correction historica, resolver `at` past/present/future, backfill idempotente.

### Slice 3 — Promote atomic helper + endpoint

- `src/lib/workforce/role-title/promote.ts`:
  - `promoteMember({memberId, newRoleTitle, effectiveFrom, reason, actorUserId, compensationChange?, jobLevelChange?, departmentChange?})` — atomic tx:
    1. Validar capabilities (`workforce.role_title.update` + cuando viene comp `compensation.update`).
    2. INSERT version cargo (cierra vigente si effective_from <= NOW).
    3. Si `compensationChange` viene: INSERT new compensation_version mismo `effective_from`.
    4. Si `jobLevelChange` viene: INSERT version equivalente en `members.job_level` (revisar si requiere su propia tabla — probable followup).
    5. Audit unificado en `member_role_title_audit_log` con action='promoted' + metadata referenciando comp_version_id si aplica.
    6. Outbox event `member.promotion.executed` v1 con payload `{memberId, oldRoleTitle, newRoleTitle, effectiveFrom, compensationChanged: bool, reason}`.
  - Rollback completo si cualquier paso falla.
- Endpoint `POST /api/admin/team/members/[memberId]/promote` capability-gated `workforce.role_title.update:update` + `compensation.update:update` (cuando viene comp). Body: `{newRoleTitle, effectiveFrom: ISO, reason, compensation?: {newBaseSalary, currency}, jobLevel?, departmentId?}`.
- Catalog event delta en `EVENT_CATALOG_V1.md`.

### Slice 4 — Cron scheduled-applier

- `src/lib/workforce/role-title/scheduled-applier.ts`:
  - `applyScheduledRoleTitleChanges()` — itera versions con `effective_from <= NOW() AND created_at < effective_from` que NO disparararon trigger sync. Default: idempotente; trigger ya las aplico al INSERT si effective_from era pasado. La funcion existe para casos edge: server-time skew, version creada con effective_from futuro que ahora ya paso, etc. La realidad: el trigger sync hace todo el trabajo.
  - El cron es defensivo + telemetry: cuenta cuantas versions estan con `effective_from <= NOW() AND members.role_title != version.role_title` (drift entre escalar y version vigente) y emite metric.
- Endpoint Cloud Run: `POST /workforce/apply-scheduled-role-title-changes` en ops-worker, gated por `wrapCronHandler` (TASK-775).
- Cloud Scheduler job `ops-workforce-apply-scheduled-role-title @ 5 0 * * * America/Santiago` en `services/ops-worker/deploy.sh`.

### Slice 5 — UI extension MemberRoleTitleSection + API extension

- Extender response de `GET /api/hr/workforce/members/[memberId]/role-title` con `versions[]` (ultimas 10) + `scheduledChange` (proximo cambio futuro si existe).
- `MemberRoleTitleSection.tsx`:
  - Selector "Efectivo desde" (date picker) en el dialogo Editar — default hoy. Si fecha futura, copy "Programado para [fecha]".
  - Banner inline cuando hay `scheduledChange`: "Cambio programado: [cargo] efectivo [fecha]. [Cancelar]" (cancel = INSERT version correctora cerrando la programada antes de aplicarse).
  - Tab/section "Historial" mostrando timeline de versions (cargo, source, fecha, autor, razon, comp acoplada si la hubo).
  - Cuando capability `compensation.update` presente: checkbox "Acoplar cambio salarial" en el dialogo Editar — abre sub-form con `newBaseSalary` + `currency`. Submit usa `/promote` en vez de `/role-title`.

### Slice 6 — Reliability signals + docs

- `src/lib/reliability/queries/role-title-scheduled-overdue.ts`: cuenta versions con `effective_from < NOW() AND members.role_title != version.role_title` (drift escalar↔version). Steady=0; severity=error >0.
- `src/lib/reliability/queries/role-title-version-overlap.ts`: cuenta overlaps detectados (deberia ser 0 por EXCLUDE constraint, pero defensivo). Steady=0; severity=error.
- Wire en `get-reliability-overview.ts`. Roll up modulo `identity`.
- CLAUDE.md: extender seccion TASK-785 con subseccion "Effective-dating + promotion (TASK-788)".
- Doc funcional `docs/documentation/identity/cargo-laboral-promociones.md` — manual operador HR.
- Manual de uso `docs/manual-de-uso/identity/programar-ascenso-y-cambio-de-cargo.md` — paso a paso.

## Out of Scope

- **Workflow de aprobacion multi-step** (ej. supervisor pide → comite aprueba → HR ejecuta). Esta task solo cubre la mecanica del cambio una vez aprobado fuera del sistema (offline). Workflow de aprobacion seria una task derivada en EPIC-010.
- **Bandas salariales canonicas** (catalogo de bandas con minimo/maximo/midpoint por cargo+nivel). Compensation aqui se mueve como `compensation_version` libre; bandas serian otra task.
- **Job level history versionado** independiente. Si emerge necesidad clara de versionar `job_level` con vigencia separada del cargo, se hace en task derivada.
- **Notificaciones automaticas al colaborador** ("tu cargo cambio efectivo X"). Email/Teams notification sale como followup.
- **Reportes anuales / SII** que dependan de cargo a fecha. La VIEW canonica queda lista para que esos reportes la consuman; los reportes mismos se construyen en su task de dominio.

## Detailed Spec

```sql
-- Slice 1 schema esqueleto
CREATE TABLE greenhouse_core.member_role_title_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  role_title TEXT,
  source TEXT NOT NULL CHECK (source IN ('hr_manual', 'migration', 'entra_accept', 'correction')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 10),
  correction_of UUID REFERENCES greenhouse_core.member_role_title_versions(version_id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT effective_to_after_from CHECK (effective_to IS NULL OR effective_to > effective_from),
  EXCLUDE USING gist (
    member_id WITH =,
    daterange(effective_from, COALESCE(effective_to, '9999-12-31'::date), '[)') WITH &&
  )
);

CREATE INDEX idx_role_title_versions_member ON greenhouse_core.member_role_title_versions (member_id);
CREATE INDEX idx_role_title_versions_effective ON greenhouse_core.member_role_title_versions (effective_from, effective_to);
```

```typescript
// Resolver extendido (Slice 2)
export interface ResolveOptions {
  memberId: string
  context: RoleTitleContext
  assignmentId?: string
  at?: Date  // default: now()
}

// promote helper signature (Slice 3)
export interface PromoteMemberInput {
  memberId: string
  newRoleTitle: string | null
  effectiveFrom: Date
  reason: string  // >= 10 chars
  actorUserId: string
  actorEmail?: string | null
  compensationChange?: {
    newBaseSalary: number
    currency: string
  }
  jobLevelChange?: string
  departmentChange?: string
}

export interface PromoteMemberResult {
  versionId: string
  compensationVersionId: string | null
  auditId: string
  eventId: string
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Programar un cambio de cargo con `effective_from` futuro queda persistido como version y NO altera el escalar `members.role_title` hasta que llega la fecha.
- [ ] Al llegar la fecha (cron diario o trigger), el escalar se actualiza al nuevo valor; resolver con `at=ayer` retorna el cargo viejo, con `at=hoy` el nuevo.
- [ ] Resolver con `at=<fecha del finiquito>` retorna el cargo vigente a esa fecha — no el actual.
- [ ] EXCLUDE constraint rechaza dos versions overlapping para el mismo miembro.
- [ ] Endpoint `/promote` ejecuta cargo + comp en una sola tx; rollback si comp falla deja cargo intacto.
- [ ] UI muestra banner "Cambio programado para [fecha]" cuando existe scheduled.
- [ ] Outbox event `member.promotion.executed` v1 publicado con payload completo.
- [ ] Reliability signals `scheduled_overdue` y `version_overlap` steady = 0 en runtime.
- [ ] `updateMemberRoleTitle` (TASK-785 API) sigue funcionando sin cambios para callers existentes.
- [ ] Drift queue Entra (TASK-785) sigue funcionando sin regresiones.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/workforce/role-title src/lib/reliability/queries`
- `pnpm migrate:up` aplicado en local y staging.
- Manual: programar cambio futuro en /people/[id], avanzar fecha del sistema, verificar que el cron lo aplica y resolver `at=` retorna correctamente.
- Manual: ejecutar `/promote` con comp + cargo, verificar audit log unificado y outbox event publicado.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] Archivo en carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado (TASK-783 finiquito puede consumir resolver `at`; TASK-785 sigue siendo base canonica)
- [ ] CLAUDE.md seccion TASK-785 extendida con effective-dating contract
- [ ] `EVENT_CATALOG_V1.md` actualizado con `member.promotion.executed` v1
- [ ] Doc funcional + manual de uso publicados
- [ ] Cloud Scheduler job `ops-workforce-apply-scheduled-role-title` desplegado y verificado

## Follow-ups

- Workflow de aprobacion multi-step (supervisor → comite → HR) sobre el helper `promoteMember`. Probable EPIC-010 task derivada.
- Notificaciones Teams al colaborador cuando se ejecuta su promotion (TASK-786 contact governance puede ser dependencia).
- Bandas salariales canonicas con minimo/maximo/midpoint per cargo+nivel.
- Job level history versionado independiente si emerge necesidad operativa.
- Reportes anuales SII / cierre Q consumiendo el resolver `at` para "que cargo tenia X persona el periodo Y".

## Open Questions

- Frontera exacta con `compensation_versions`: ¿el helper `promoteMember` debe SIEMPRE crear comp_version aunque el salario no cambie (solo cargo)? Decision pragmatica: solo si `compensationChange` viene explicito en el input. Cargo y comp son dimensiones independientes salvo cuando el operador las acopla intencionalmente.
- ¿Es necesario soportar `effective_from < hire_date` (correccion historica de un cargo registrado mal antes del onboarding)? Probable que si para audit limpio. EXCLUDE constraint lo permite si no overlapa con otras versions.
