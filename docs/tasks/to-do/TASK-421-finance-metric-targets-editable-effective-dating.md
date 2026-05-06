# TASK-421 — Finance Metric Targets Editable + Effective-Dating (v2)

## Delta 2026-05-05 — pre-execution hardening (safety pillar — earnings management red flag)

Auditoría arch + finance detectó gap crítico de auditabilidad: la spec original declara effective-dating + outbox event `finance.metric_target.set` correctamente, pero **no aborda qué pasa cuando el CFO cambia un target retroactivo afectando un período ya cerrado o ya reportado a stakeholders**.

### Por qué importa (frameworks)

- **ISA 240 (fraud risk)**: cambiar retroactivamente la métrica de evaluación de performance es **management override of controls** — uno de los 3 indicadores clásicos del fraud triangle (Cressey).
- **IAS 8 (Accounting Policies, Changes in Accounting Estimates and Errors)**: cambios en estimaciones aplican prospectivamente, no retroactivamente, salvo que sea corrección de error material — y eso requiere disclosure.
- **COSO Principle 8 (Assesses Fraud Risk)** + **Principle 10 (Selects and Develops Control Activities)**: targets son control activities; modificarlos retroactivamente sin trail = SoD violation.
- **Chile NIIF (alineado IFRS)**: bajo Ley 20.393 + Ley 21.595 (Delitos Económicos), manipulación de métricas reportadas con intent fraudulento es delito penal con penalidad PJ hasta liquidación forzada.

**Caso concreto**: el CFO setea target `net_margin_pct = 15%` para Sky con `effective_from = 2026-01-01` el 2026-05-05. El signal engine corrió en febrero/marzo/abril con target viejo (10%) y emitió 12 signals "OK". Ahora retroactivamente esas 12 signals serían "warning". Sin trail, el sistema facilita earnings management.

### Decisión canónica — Slice 5 nuevo (mandatorio antes de cierre)

**Capability granular separada** (least privilege, defense-in-depth TASK-742 layer 2):

```text
finance.metric_targets.set                  → cambios prospectivos (effective_from >= today)
finance.metric_targets.retroactive_change   → cambios retroactivos (effective_from < today)
                                               OR (effective_from < último_period_close del scope)
```

`retroactive_change` reservada SOLO a `finance_admin` + `efeonce_admin`. NO heredable de roles broader. Approval gate en UI: requiere `reason >= 30 chars` antes de submit.

**Tabla audit log append-only** (TASK-742 layer 5, patrón `member_role_title_audit_log` TASK-785):

```sql
CREATE TABLE greenhouse_finance.metric_target_audit_log (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id TEXT NOT NULL,
  scope_kind TEXT NOT NULL,
  scope_id UUID,
  target_id UUID NOT NULL REFERENCES metric_targets(target_id),
  action TEXT NOT NULL CHECK (action IN ('set', 'retroactive_set', 'superseded', 'corrected')),
  prior_value NUMERIC,
  new_value NUMERIC,
  effective_from DATE NOT NULL,
  affects_closed_periods BOOLEAN NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) >= 30),
  set_by_user_id UUID NOT NULL,
  capability_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anti-UPDATE / anti-DELETE triggers (TASK-742 pattern)
CREATE TRIGGER prevent_update_on_metric_target_audit_log ...
CREATE TRIGGER prevent_delete_on_metric_target_audit_log ...
```

**Outbox events distinguidos**:

- `finance.metric_target.set` v1 — cambio prospectivo (effective_from futuro o presente).
- `finance.metric_target.retroactive_set` v1 — cambio que afecta períodos cerrados. Payload incluye lista de signals históricas potencialmente afectadas + flag `requires_disclosure`.

**Signal engine NO re-enriquece automáticamente histórico**. Las signals ya emitidas mantienen el target_value que las generó (snapshot at emission time, columna `target_value_at_emission` en `finance_ai_signals`). Cuando se accede UI histórica, banner sutil: "Target cambió retroactivamente el [fecha] — ver audit log".

**Reliability signal canónico** (TASK-742 layer 4):

- `finance.metric_targets.retroactive_changes_30d` (kind=`drift`, severity=`warning` si count>0, `error` si count>5/mes). Steady state variable. Operator review queue en `/admin/operations`.

### Reglas duras adicionales

- **NUNCA** UPDATE-in-place de `metric_targets`. Toda transición pasa por INSERT new row + UPDATE old.superseded_at (atomic tx). Append-only de facto.
- **NUNCA** retroactive change sin `reason >= 30 chars`. UI valida + DB CHECK constraint.
- **NUNCA** retroactive change sin pasar por capability `finance.metric_targets.retroactive_change`. Hard-gated en endpoint + UI hide/disable.
- **NUNCA** ocultar el target_value snapshot at emission de signals históricas. Es la única defensa contra revisionist history.
- **NUNCA** delete del audit log. Ni siquiera GDPR (PII viaja en `set_by_user_id` solo, que vive en identity_profiles con su propio retention).

### Acceptance criteria adicionales

- [ ] Capability `finance.metric_targets.retroactive_change` declarada + scope `tenant` + allowed_source `efeonce_admin` + `finance_admin` solo
- [ ] Tabla `metric_target_audit_log` con anti-UPDATE/DELETE triggers
- [ ] CHECK constraint `length(reason) >= 30` en audit log + en UI form
- [ ] Outbox events `set` vs `retroactive_set` distinguidos con payload schema documentado en `GREENHOUSE_EVENT_CATALOG_V1.md`
- [ ] Signal engine guarda `target_value_at_emission` en `finance_ai_signals` (migration de schema existente)
- [ ] Reliability signal `finance.metric_targets.retroactive_changes_30d` registrada en `RELIABILITY_REGISTRY`
- [ ] UI muestra banner en signals históricas si target cambió retroactivamente después de su emission
- [ ] Doc nuevo `docs/documentation/finance/cambios-retroactivos-targets.md` explicando el control y cuándo escalar a CPA/auditor

### Sinergia con frameworks externos

Cuando Greenhouse onboarde audit externo (Big-4 / mid-tier) o se acerque a Series B+, este audit log es **prueba de control interno COSO/SOX-ready**. Sin él, el auditor levantaría observación material weakness o significant deficiency en el SOX 404 attestation.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417, TASK-419`
- Branch: `task/TASK-421-finance-metric-targets-editable-effective-dating`

## Summary

Implementar v2 del contrato de targets: tabla `greenhouse_finance.metric_targets` con effective-dating (`effective_from`, `superseded_at`) y scope (`organization_id`, `client_id`, opcional), admin UI en Settings para que el CFO pueda editar targets sin cambiar código, y extender `getMetric(id, { asOf })` para resolver el target vigente en esa fecha.

## Why This Task Exists

v1 del registry declara `target.defaultValue` como constante en código. Eso funciona para bootstrapping pero no escala: cambiar target de `net_margin_pct` requiere PR, deploy y aprobación de ingeniería. Un CFO razonable debería poder ajustarlos en Settings. Además, comparaciones históricas ("margen de marzo vs **target de marzo**") requieren que targets tengan versión temporal; sin eso, cambios de target retroactivamente distorsionan métricas de semáforo.

## Goal

- Migration `greenhouse_finance.metric_targets` con `metric_id`, `scope_kind`, `scope_id`, `target_value`, `effective_from`, `superseded_at`, `set_by_user_id`
- `getMetric(id, { asOf })` resuelve target vigente a la fecha dada
- Admin UI `Settings → Finance → Metric Targets` (tabla editable con history per-metric)
- Backfill inicial: para cada métrica con `target.source = 'editable_per_org'` poblar una fila con `defaultValue`
- Event outbox `finance.metric_target.set` para auditabilidad

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §4.3 (reader asOf) + §6.3
- Patrón de effective-dating en `compensation_versions` / `leave_policies` como referencias

Reglas obligatorias:

- Effective-dating estricto: `effective_from <= asOf < superseded_at` (o `superseded_at IS NULL`)
- Scope hierarchy: target per-client tiene precedencia sobre per-org; si no hay ninguno, usa `defaultValue` del registry
- Auditabilidad: toda edición publica evento outbox
- Only users con rol `finance_manager` o `efeonce_admin` pueden editar

## Dependencies & Impact

### Depends on

- TASK-416, TASK-417, TASK-419 (foundation, reader, patrón dashboard)

### Blocks / Impacts

- TASK-423 (per-scope thresholds) puede construirse encima de este
- Signal engine empieza a usar thresholds `vs_target` correctamente

### Files owned

- `migrations/####_finance-metric-targets.sql`
- `src/app/api/admin/finance/metric-targets/**`
- `src/views/greenhouse/admin/MetricTargetsView.tsx` (o sección en Settings)
- `src/lib/finance/metric-registry/reader.ts` (extender getMetric)

## Current Repo State

### Already exists (tras TASK-417)

- `getMetric(id, { asOf })` con `asOf` aceptado pero no resuelto contra DB

### Gap

- No existe tabla de targets
- No hay UI de edición
- No hay auditabilidad de cambios de target

## Scope

### Slice 1 — Schema

- Migration crea tabla con índices (metric_id + scope, effective_from range)
- Backfill inicial desde registry
- Tipos Kysely regenerados

### Slice 2 — Reader cutover

- `getMetric(id, { asOf, scopeKind, scopeId })` lee tabla con precedencia (client > org > registry default)
- Cache por request para evitar N lookups en dashboards

### Slice 3 — Admin UI

- View en Settings enumerando métricas editables con historial
- Edit form con validación (target dentro de rango razonable por unit)
- Publish outbox event on save

### Slice 4 — Consumer adoption

- `getMetricSeverityColor` (de TASK-419) respeta thresholds `vs_target` con target resuelto as-of
- Signal engine consume target real para threshold comparison

## Out of Scope

- Per-scope thresholds (no solo target) → TASK-423
- Enforcement runtime de quality gates → TASK-422

## Acceptance Criteria

- [ ] Tabla + migration + types aplicados
- [ ] Admin UI funcional con validación
- [ ] `getMetric({ asOf })` retorna target histórico correcto
- [ ] Signal engine consume target dinámico
- [ ] Outbox event emitido en cada edición
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- `pnpm migrate:up` y `pnpm db:generate-types` limpios
- Manual: cambiar target de `net_margin_pct` en UI, validar que semáforo de dashboard refleja el cambio después del próximo render
- Validación histórica: target set para enero-marzo ≠ target actual; dashboard de febrero usa el de febrero

## Closing Protocol

- [ ] Lifecycle + carpeta sincronizados
- [ ] Delta en `GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` confirmando v2 targets
- [ ] Documentar en `docs/documentation/finance/metricas-canonicas.md` que targets son editables

## Follow-ups

- TASK-423 per-scope thresholds (complemento natural)
