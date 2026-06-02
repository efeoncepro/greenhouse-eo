# TASK-788 — WorkAssignment Effective-Dating (split from promotion write command)

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
- Epic: `EPIC-017`
- Status real: `Split/reframe requerido — no ejecutar compensation-coupled promotion as-is`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|data`)
- Blocked by: `TASK-961`, `TASK-962`, `TASK-338 reframe for compensation-coupled writes`
- Branch: `task/TASK-788-workforce-role-title-effective-dating-promotion-flow`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

**Reframe 2026-05-31:** split obligatorio. La parte útil inmediata es `WorkAssignment` effective-dating/read model: cargo, rol, manager/departamento/assignment y vigencia consultable por fecha. La parte "ascenso atómico cargo + compensation" queda fuera de la primera entrega y debe esperar `CompensationProfile` (`TASK-338` reescrita) + coverage/readiness (`TASK-962`) + checkpoint de write path.

No ejecutar esta task as-is con promoción + compensation acopladas.

## Why This Task Exists

TASK-785 cerro la base canonica del cargo: source of truth, audit append-only, drift queue vs Entra, resolver per-context, capabilities. Pero la mutation actual (`updateMemberRoleTitle`) escribe al instante.

EPIC-017 reubica este problema dentro de `WorkAssignment`: Person 360 necesita responder "qué rol/assignment tenía esta persona en una fecha" sin depender de payroll ni de un escalar mutable. En la operativa real de HR esto produce 3 limitaciones concretas:

1. **Programar ascensos:** HR aprueba el ascenso a "Design Lead" en el ciclo Q2-2026 con efectividad 1 de mayo. Hoy hay que esperar al dia exacto y editarlo manualmente, o editar antes y aceptar que durante 2 semanas el cargo en runtime ya no refleja la realidad contractual. El campo `effectiveAt` ya existe en el contrato del endpoint pero queda como timestamp de registro — no programa nada.
2. **Historial efectivo:** Para finiquitos, contratos historicos, auditoria SII, reportes anuales y litigios laborales, HR necesita responder "que cargo tenia X persona el 1 de enero de 2026". Hoy el audit log linealiza los cambios pero no expone una query natural por fecha; cada consumer reinventaria el lookup.
3. **Ascenso atomico cargo + compensation:** sigue siendo un caso real, pero queda fuera de la primera entrega porque cambia dinero y debe depender de `CompensationProfile`.

La raiz: `members.role_title` es estado escalar; el dominio HR opera sobre versiones temporales con vigencia (interval-based). Sin esto, payroll/finiquito/staffing leen el cargo del momento del render, no el contractual de la fecha relevante.

## Goal

- Modelo de versiones temporales para `WorkAssignment`/role title con `effective_from` / `effective_to` no-overlapping; mutations programan futuro o registran pasado correctivo.
- Resolver canonico extendido con parametro `at?: Date` que retorna cargo/assignment vigente al momento solicitado (default: hoy).
- Person 360 puede consumir assignment history sin inferir desde payroll.
- Diferir cualquier comando atómico cargo + compensation a task posterior.
- UI V1 solo muestra/edita effective-dating de cargo/assignment si el plan lo aprueba; no acopla compensation en esta task.
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
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — solo si una task posterior implementa promotion write path.

Reglas obligatorias:

- **NUNCA** branchear el resolver por contexto sin parametro `at`. El parametro es default-hoy pero siempre disponible. Single signature.
- **NUNCA** acoplar compensation writes en la primera entrega. Promotion + compensation atomic queda para task posterior.
- **NUNCA** tratar `member.role_title` como suficiente para `WorkAssignment` historico.
- **NUNCA** desincronizar el state escalar `members.role_title` (TASK-785) y la nueva tabla `member_role_title_versions`. El escalar refleja la version cuya `effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())`. Trigger PG mantiene consistencia.
- **NUNCA** permitir version overlap: constraint `EXCLUDE USING gist (member_id WITH =, daterange(effective_from, effective_to, '[)') WITH &&)`.
- **NUNCA** mutar versions historicas (effective_to no-NULL en el pasado). Para correcciones se inserta una nueva version con `correction_of=<old_version_id>` + razon + audit.
- **NUNCA** crear un endpoint `promote` en esta entrega. Cuando exista, debe ser atomic tx unica o rollback completo.
- Cron diario `apply-scheduled-role-title-changes` corre 00:05 America/Santiago. Idempotente. Falla aislada per-version (un version roto NO bloquea el resto del batch).

## Normative Docs

- `docs/tasks/complete/TASK-785-workforce-role-title-source-of-truth-governance.md` — base canonica que esta task extiende.
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (seccion compensation_versions) — frontera con comp.
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`

## Dependencies & Impact

### Depends on

- `TASK-785` ✅ (base canonica de role_title source + audit + drift) — cerrada.
- `TASK-961` (Person 360 workforce facet placement/redaction).
- `TASK-962` (coverage/readiness classification).
- `greenhouse_core.members` columnas `role_title`, `role_title_source`, `last_human_update_at` (TASK-785).
- `greenhouse_hr.compensation_versions` / `greenhouse_payroll.compensation_versions` (modelo existente de salarios temporales) — referencia, no se modifica su shape in V1.
- `greenhouse_sync.outbox_events` + reactive consumer (TASK-773) — referencia para una task posterior de promotion write path; no se usa en V1.
- Cloud Scheduler `ops-worker` (TASK-775) — para cron diario apply-scheduled.

### Blocks / Impacts

- `payroll_document` resolver context: future consumer may accept `at` para resolver cargo a fecha del periodo, no a fecha del render.
- `finiquito` document generation: cargo en el PDF debera ser el vigente a `last_working_day`, no el actual.
- `commercial_cost` y `staffing` consumers: leeran `at=NOW()` por default — sin cambio operativo.
- TASK-786 (Person Contact & Professional Presence) y TASK-787 (Country Reconciliation) NO se acoplan; son dimensiones independientes.

### Files owned

- `migrations/<timestamp>_task-788-role-title-versions.sql`
- `src/lib/workforce/role-title/versions-store.ts`
- `src/lib/workforce/role-title/resolver.ts` (extender, no romper firma actual)
- `src/lib/workforce/role-title/scheduled-applier.ts`
- `src/app/api/hr/workforce/members/[memberId]/role-title/route.ts` (extender response con `versions[]` + `scheduledChange`)
- `src/views/greenhouse/people/tabs/MemberRoleTitleSection.tsx` (extender UI)
- `services/ops-worker/server.ts` + `services/ops-worker/deploy.sh` (registrar cron + handler)
- `src/lib/reliability/queries/role-title-scheduled-overdue.ts`
- `src/lib/reliability/queries/role-title-version-overlap.ts`
- `CLAUDE.md` (extender seccion TASK-785 con effective-dating contract)

## Current Repo State

### Already exists

- `members.role_title` + `role_title_source` + `last_human_update_at` (TASK-785, columnas escalares).
- `member_role_title_audit_log` (append-only, TASK-785) — sigue siendo el audit canonico; las versions temporales NO lo reemplazan, ambos coexisten (versions = estado vigente; audit = quien hizo que cuando con razon).
- `member_role_title_drift_proposals` (TASK-785) — drift queue Entra. Sigue activo; cambios programados no afectan a Entra sync hasta que se apliquen.
- `updateMemberRoleTitle()` helper (TASK-785) — escribe escalar al instante. Pasara a delegar en el helper de versions internamente para mantener API publica estable.
- `compensation_versions` (HR Payroll) — modelo temporal existente del lado de comp.

### Gap

- No hay tabla de versiones temporales para `role_title`. Cualquier query "cargo a fecha X" recompone desde audit log o asume que el escalar es la verdad — falla para finiquito de gente cuyo cargo cambio entre fecha de termino y fecha de render del documento.
- No hay forma de programar un ascenso a futuro. HR debe esperar al dia exacto.
- No hay endpoint `promote` atomic que combine cargo + comp + (opcional) departamento + (opcional) nivel. Ese endpoint queda explicitamente diferido.
- El resolver firma `resolveRoleTitle({memberId, context})` no acepta `at`. Cualquier surface que necesite "cargo al periodo X" reinventaria la query contra audit log o leeria mal del escalar.
- No hay cron que aplique versions con `effective_from` en el pasado proximo (caso: HR programo el ascenso para el 1, ya es el 2 y no se aplico). Sin signal, ningun observador lo detecta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Split gate

- Confirmar si V1 versiona solo `role_title` o un `WorkAssignment` más amplio.
- Confirmar qué consume `TASK-961` para Person 360.
- Extraer promotion + compensation-coupled write path a follow-up si sigue siendo necesario.
- Documentar qué partes del scope original quedan fuera.

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

### Slice 3 — Deferred write-path extraction

This slice is a documentation-only extraction step for the first executable reframe.

- Remove promotion/compensation-coupled assumptions from the execution plan.
- Record the future task requirement: a later write command may coordinate role/assignment + compensation only after `CompensationProfile` is settled.
- Do not add `promoteMember`, `/promote`, compensation mutation, job-level mutation, or `member.promotion.executed` in V1.
- If a later task reintroduces this path, it must own its own ADR/checkpoint, event catalog delta, authorization model and payroll/finance non-regression gates.

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
  - Compensation-coupled UI is deferred. Do not add checkbox "Acoplar cambio salarial" in V1.

### Slice 6 — Reliability signals + docs

- `src/lib/reliability/queries/role-title-scheduled-overdue.ts`: cuenta versions con `effective_from < NOW() AND members.role_title != version.role_title` (drift escalar↔version). Steady=0; severity=error >0.
- `src/lib/reliability/queries/role-title-version-overlap.ts`: cuenta overlaps detectados (deberia ser 0 por EXCLUDE constraint, pero defensivo). Steady=0; severity=error.
- Wire en `get-reliability-overview.ts`. Roll up modulo `identity`.
- CLAUDE.md: extender seccion TASK-785 con subseccion "Effective-dating (TASK-788)".
- Doc funcional `docs/documentation/identity/cargo-laboral-effective-dating.md` — contrato operador HR.
- Manual de uso `docs/manual-de-uso/identity/programar-cambio-de-cargo.md` — paso a paso.

## Out of Scope

- **Workflow de aprobacion multi-step** (ej. supervisor pide → comite aprueba → HR ejecuta). Esta task solo cubre la mecanica del cambio una vez aprobado fuera del sistema (offline). Workflow de aprobacion seria una task derivada en EPIC-010.
- **Ascenso atomico cargo + compensation** en V1. Ese write path se extrae a follow-up después de `CompensationProfile`.
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

// Promotion/write-command types intentionally omitted in V1.
// A future task must define them after CompensationProfile is settled.
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Programar un cambio de cargo con `effective_from` futuro queda persistido como version y NO altera el escalar `members.role_title` hasta que llega la fecha.
- [ ] Al llegar la fecha (cron diario o trigger), el escalar se actualiza al nuevo valor; resolver con `at=ayer` retorna el cargo viejo, con `at=hoy` el nuevo.
- [ ] Resolver con `at=<fecha del finiquito>` retorna el cargo vigente a esa fecha — no el actual.
- [ ] EXCLUDE constraint rechaza dos versions overlapping para el mismo miembro.
- [ ] No se implementa endpoint `/promote` ni compensation-coupled write path en V1.
- [ ] UI muestra banner "Cambio programado para [fecha]" cuando existe scheduled.
- [ ] Cualquier outbox/event catalog work de promotion queda diferido a follow-up.
- [ ] Reliability signals `scheduled_overdue` y `version_overlap` steady = 0 en runtime.
- [ ] `updateMemberRoleTitle` (TASK-785 API) sigue funcionando sin cambios para callers existentes.
- [ ] Drift queue Entra (TASK-785) sigue funcionando sin regresiones.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/workforce/role-title src/lib/reliability/queries`
- `pnpm migrate:up` aplicado en local y staging.
- Manual: programar cambio futuro en /people/[id], avanzar fecha del sistema, verificar que el cron lo aplica y resolver `at=` retorna correctamente.
- No ejecutar prueba manual de `/promote` en V1; ese endpoint queda fuera de scope.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] Archivo en carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado (TASK-783 finiquito puede consumir resolver `at`; TASK-785 sigue siendo base canonica)
- [ ] CLAUDE.md seccion TASK-785 extendida con effective-dating contract
- [ ] Documentar explicitamente que `member.promotion.executed` queda diferido y que no hay promotion write path en V1.
- [ ] Doc funcional + manual de uso publicados
- [ ] Cloud Scheduler job `ops-workforce-apply-scheduled-role-title` desplegado y verificado

## Follow-ups

- Compensation-coupled role/assignment write command after `CompensationProfile` is settled.
- Workflow de aprobacion multi-step (supervisor → comite → HR) sobre ese futuro write command. Probable EPIC-010/017 task derivada.
- Notificaciones Teams al colaborador cuando se ejecuta un cambio de cargo/assignment (TASK-786 contact governance puede ser dependencia).
- Bandas salariales canonicas con minimo/maximo/midpoint per cargo+nivel.
- Job level history versionado independiente si emerge necesidad operativa.
- Reportes anuales SII / cierre Q consumiendo el resolver `at` para "que cargo tenia X persona el periodo Y".

## Open Questions

- Frontera exacta con `compensation_versions`: diferida hasta el reframe de `TASK-338`/`CompensationProfile`. Cargo y comp son dimensiones independientes salvo cuando un futuro write command las acople intencionalmente.
- ¿Es necesario soportar `effective_from < hire_date` (correccion historica de un cargo registrado mal antes del onboarding)? Probable que si para audit limpio. EXCLUDE constraint lo permite si no overlapa con otras versions.
