# TASK-414 — Payroll Reopen Policy Engine & Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none` (TASK-409/410/411/412 ya están cerradas)
- Branch: `task/TASK-414-payroll-reopen-policy-engine-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplaza el único guard temporal (`assertReopenWindow` hoy = "días desde `exported_at` <= 45") por un **policy engine declarativo** que evalúa múltiples dimensiones de riesgo antes de permitir reabrir una nómina exportada: estado del período, ventana temporal configurable, Previred declarado, boletas Nubox emitidas, pagos bancarios conciliados, threshold de delta. Agrega safety nets (undo, forced override con justificación), notificación interna automática y observabilidad. Es la V1.5 del programa TASK-409 — cierra la deuda técnica del hotfix 2026-04-15 y convierte el módulo de reliquidación en enterprise-grade.

## Why This Task Exists

TASK-410 aterrizó una ventana temporal rígida ("mes operativo vigente") que dejaba una zanja muerta operativa. El hotfix del 2026-04-15 (commit `b8098c0a`) la reemplazó por `días desde exported_at <= 45` — suficiente para desbloquear el caso de Marzo 2026 ese día, pero insuficiente como modelo permanente porque:

1. **Una sola dimensión de decisión es frágil.** Un período exportado hace 30 días puede ser inseguro de reabrir si ya se declaró Previred o ya hay boletas Nubox emitidas; y un período exportado hace 50 días puede ser perfectamente seguro si nada downstream se ha cerrado. El tiempo por sí solo no captura el riesgo real.
2. **No hay tracking real de compromisos downstream.** El consumer de Finance aplica delta correctamente, pero no sabemos si el pago ya salió por banco, si Previred recibió el F29, si Nubox emitió honorario. Cualquier reliquidación "silenciosa" genera riesgo legal/contable.
3. **No hay safety net si el reopen fue un error.** No existe undo. Una vez `reopened`, la única vuelta atrás es editar y re-aprobar con los mismos valores (tedioso y propenso a errores).
4. **No hay escalamiento por riesgo.** Un delta del 50% del líquido debería requerir doble confirmación; hoy pasa igual que un ajuste de $1.000.
5. **No hay observabilidad.** No sabemos cuántas reliquidaciones se ejecutan, cuáles fueron bloqueadas, qué razones pesan más. Imposible gobernar la práctica sin datos.
6. **El audit row actual no captura el contexto completo** de la decisión de reopen — qué policies evaluaron, qué warnings se ignoraron, cuál fue el estado de los downstream al momento del reopen.

Payroll es el módulo más sensible legal y financieramente del portal. Dejarlo con un guard de 5 líneas como única protección es deuda técnica inaceptable.

## Goal

- Policy engine declarativo con registry componible, cada policy en su propio archivo y testeable en aislamiento
- 4+ policies nuevas cubriendo Previred, Nubox, pagos bancarios y delta threshold
- Tabla nueva `greenhouse_payroll.previred_declarations` con endpoint admin para registro manual
- Safety nets: endpoint `/undo-reopen` con ventana de 4h + marca de rollback en el audit
- Forced override con justificación obligatoria (audit trail, no bypass de permisos)
- Notificación automática interna a Finance/HR leads cuando se ejecuta un reopen
- Observabilidad completa: Sentry breadcrumbs + métricas + runbook operativo
- Audit row enriquecido con `policies_evaluated jsonb` y `warnings_at_reopen jsonb`
- Documentación funcional y técnica del flow v1.5

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- [docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md) — sección "Reopen Lifecycle" actualizada por TASK-410
- [docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md) — evento `payroll_entry.reliquidated` ya registrado
- [docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) — `expense_payments`, `bank_statement_rows`, `is_reconciled` flag
- [docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md](../../architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md) — idempotencia, replay-safety
- [docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)
- [docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md](../../architecture/GREENHOUSE_DATABASE_TOOLING_V1.md)

Reglas obligatorias:

- Cada policy vive en su propio archivo bajo `src/lib/payroll/reopen-policies/` con shape uniforme `{ code, evaluate(ctx): Promise<PolicyResult> }`
- El pipeline `evaluateReopenPolicies(ctx)` ejecuta todas las policies en paralelo y agrega los resultados
- `canReopen = results.every(r => r.severity !== 'block')`; los warnings se propagan al audit pero no bloquean
- La tabla `previred_declarations` es owned por `greenhouse_ops` y tiene FK a `payroll_periods` con `ON DELETE CASCADE`
- El endpoint `/undo-reopen` solo revierte si (a) no existen entries con `version > 1` y (b) `reopened_at >= NOW() - INTERVAL '4 hours'`
- Forced override captura `forced_override: true` + `override_justification: text` (min 50 chars) + mantiene el mismo rol `efeonce_admin` (no escala permisos; solo agrega registro)
- La notificación interna de reopen se dispara via outbox event nuevo `payroll_period.reopened` consumido por un projection reactivo (no envío inline en el endpoint)
- Migración SQL-first vía `pnpm migrate:create`; nullable primero, constraints después
- Metricas Sentry usando el patrón ya establecido en el repo (verificar path `src/lib/observability/` si existe, si no usar `captureMessage` breadcrumb)

## Normative Docs

- [CLAUDE.md](../../../CLAUDE.md) — "Database Migrations", "Database Connection", "Secret Manager Hygiene"
- [TASK-409](../complete/TASK-409-payroll-reliquidation-program.md) — umbrella original
- [TASK-410](../complete/TASK-410-payroll-period-reopen-foundation-versioning.md) — foundation que esta task extiende
- [TASK-411](../complete/TASK-411-payroll-reliquidation-finance-delta-consumer.md) — consumer Finance al que las policies consultan
- [TASK-412](../complete/TASK-412-payroll-reliquidation-admin-ui-preview-audit.md) — UI que consumirá el nuevo shape de `reopen-preview`

## Dependencies & Impact

### Depends on

- `src/lib/payroll/reopen-guards.ts` — actual guard monolítico que se refactoriza
- `src/lib/payroll/reopen-period.ts` — endpoint transaccional que adopta el pipeline
- `src/app/api/hr/payroll/periods/[periodId]/reopen-preview/route.ts` — endpoint que surfaces los resultados al UI
- `src/lib/sync/event-catalog.ts` — registro de nuevo evento `payroll_period.reopened`
- `src/lib/sync/projections/` — patrón reactivo para el handler de notificación interna
- `src/emails/PayrollReceiptEmail.tsx` + `src/lib/email/delivery.ts` — patrón de email templates
- Tablas existentes: `payroll_periods`, `payroll_entries`, `payroll_period_reopen_audit`, `expenses`, `expense_payments`, `bank_statement_rows`
- Nubox sync tables [verificar esquema real durante Discovery — probablemente bajo `greenhouse_finance.*` o `greenhouse_sync.*`]

### Blocks / Impacts

- **Impacts:** [src/views/greenhouse/payroll/ReopenPeriodDialog.tsx](../../../src/views/greenhouse/payroll/ReopenPeriodDialog.tsx) — el shape de `/reopen-preview` evoluciona (nuevos códigos de razones, severity explícito); el dialog debe renderizar warnings vs blocks separados
- **Impacts:** [src/views/greenhouse/payroll/PayrollPeriodTab.tsx](../../../src/views/greenhouse/payroll/PayrollPeriodTab.tsx) — nueva action "Deshacer reapertura" visible cuando aplica la ventana de undo
- **Impacts:** [src/views/greenhouse/admin/PayrollReopenAuditView.tsx](../../../src/views/greenhouse/admin/PayrollReopenAuditView.tsx) — nuevas columnas "Override" y "Rollback" + filtros adicionales
- **Impacts:** `finance_expense_reactive_intake` (TASK-411) — sigue intacto pero la policy `payment-cleared` reusa sus helpers de query
- **Impacts:** Admin Center — posible card nueva o sub-view para registro de declaraciones Previred

### Files owned

**Phase A — Policy Engine Foundation:**
- `src/lib/payroll/reopen-policies/types.ts` (nuevo)
- `src/lib/payroll/reopen-policies/registry.ts` (nuevo)
- `src/lib/payroll/reopen-policies/evaluate.ts` (nuevo)
- `src/lib/payroll/reopen-policies/policy-period-status.ts` (nuevo)
- `src/lib/payroll/reopen-policies/policy-time-window.ts` (nuevo)
- `src/lib/payroll/reopen-policies/policy-concurrent-export.ts` (nuevo)
- `src/lib/payroll/reopen-policies/policy-valid-reason.ts` (nuevo)
- `src/lib/payroll/reopen-policies/*.test.ts` (tests por policy)
- `src/lib/payroll/reopen-guards.ts` (modificar — delega al pipeline o se elimina si todo migra)
- `src/lib/payroll/reopen-period.ts` (modificar — adopta el pipeline)
- `src/app/api/hr/payroll/periods/[periodId]/reopen-preview/route.ts` (modificar — shape evolucionado)
- `migrations/<ts>_payroll-reopen-audit-policy-snapshots.sql` (nuevo — `policies_evaluated jsonb`, `warnings_at_reopen jsonb`)

**Phase B — Downstream Commitment Policies:**
- `migrations/<ts>_payroll-previred-declarations.sql` (nuevo)
- `src/lib/payroll/previred-declarations.ts` (nuevo — CRUD)
- `src/lib/payroll/previred-declarations.test.ts` (nuevo)
- `src/app/api/hr/payroll/periods/[periodId]/previred-declarations/route.ts` (nuevo — POST/GET)
- `src/lib/payroll/reopen-policies/policy-previred-declared.ts` (nuevo)
- `src/lib/payroll/reopen-policies/policy-nubox-emitted.ts` (nuevo)
- `src/lib/payroll/reopen-policies/policy-payment-cleared.ts` (nuevo)
- `src/lib/payroll/reopen-policies/policy-delta-threshold.ts` (nuevo)
- Tests unitarios por policy
- `src/views/greenhouse/payroll/PreviredDeclarationCard.tsx` (nuevo — UI de registro)
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx` (modificar — integra la card)

**Phase C — Safety Nets:**
- `src/lib/payroll/undo-reopen.ts` (nuevo — lógica transaccional de rollback)
- `src/app/api/hr/payroll/periods/[periodId]/undo-reopen/route.ts` (nuevo)
- `src/emails/PayrollPeriodReopenedInternalEmail.tsx` (nuevo)
- `src/lib/email/templates.ts` (modificar — registra el emailType)
- `src/lib/email/types.ts` (modificar — agrega el emailType al union)
- `src/lib/sync/projections/payroll-reopen-internal-notification.ts` (nuevo — reactor sobre `payroll_period.reopened`)
- `src/lib/sync/projections/index.ts` (modificar — registra el projection)
- `src/lib/sync/event-catalog.ts` (modificar — registra `payroll_period.reopened`)
- `src/views/greenhouse/payroll/UndoReopenAction.tsx` (nuevo — UI del botón con ventana visible)
- `src/views/greenhouse/payroll/ForceReopenOverrideModal.tsx` (nuevo — modal de override con justificación)
- `src/views/greenhouse/payroll/ReopenPeriodDialog.tsx` (modificar — integra el modal de override cuando hay blocks)

**Phase D — Observability:**
- `src/lib/payroll/reopen-metrics.ts` (nuevo — helpers de emisión de métricas)
- `src/lib/payroll/reopen-period.ts` (modificar — instrumentación)
- `src/lib/payroll/undo-reopen.ts` (modificar — instrumentación)

**Phase E — Documentation:**
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (modificar — sección "Reopen Lifecycle v1.5")
- `docs/documentation/hr/reliquidacion-nomina.md` (nuevo — doc funcional en lenguaje simple)
- `docs/operations/runbooks/payroll-reopen-playbook.md` (nuevo — runbook operativo)

## Current Repo State

### Already exists

- Foundation del reopen: `payroll_period_reopen_audit` table, `reopen-period.ts`, `reopen-guards.ts` con `evaluateReopenWindow` estructurado, endpoint `POST /reopen`, endpoint `GET /reopen-preview` (TASK-410 + hotfix 2026-04-15)
- Supersede path: `supersede-entry.ts` + branch en `recalculate-entry.ts` (TASK-410)
- Finance delta consumer: `payroll_reliquidation_delta` projection + `apply-payroll-reliquidation-delta.ts` con idempotencia por `(period, member, source_type)` (TASK-411)
- UI: `ReopenPeriodDialog`, `ReliquidationBadge`, `EntryVersionHistoryDrawer`, `PayrollReopenAuditView`, email template `PayrollLiquidacionV2Email` (TASK-412)
- Env var `PAYROLL_REOPEN_WINDOW_DAYS` + función `resolveReopenWindowDays()` ya soportan ventana configurable
- Tests: `period-lifecycle.test.ts`, `reopen-guards.test.ts` (incluyendo tests del hotfix), `apply-payroll-reliquidation-delta.test.ts`
- Tablas de expenses + expense_payments + bank_statement_rows con `is_reconciled` flag (en producción)
- Framework reactivo + `outbox_reactive_log` idempotente por `(event_id, handler)`

### Gap

- No existe policy engine — todas las decisiones viven en 4 funciones monolíticas
- No existe tracking real de Previred declarado (solo stub `checkPreviredDeclaredSnapshot` retornando `false`)
- No existe policy de Nubox — boletas emitidas no se consideran en la decisión
- No existe policy de payment-cleared — pagos bancarios ya conciliados no se consideran
- No existe policy de delta threshold — reliquidaciones de cualquier magnitud pasan igual
- No existe endpoint `/undo-reopen` — un reopen ejecutado por error no tiene rollback
- No existe notificación interna automática al equipo Finance/HR sobre reliquidaciones ejecutadas
- No existe forced override con justificación — hoy el operador se topa con un block y no tiene escape route documentado
- No existe observabilidad — no hay métricas, no hay Sentry breadcrumbs específicos, no hay runbook
- El audit row no captura el contexto completo del estado downstream al momento del reopen
- No existe documentación funcional del flow (`docs/documentation/hr/reliquidacion-nomina.md`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice A — Policy Engine Foundation

**Entregables:**
- `src/lib/payroll/reopen-policies/types.ts` con interfaces `PolicyContext`, `PolicySeverity = 'allow' | 'warn' | 'block'`, `PolicyResult`, `PolicyEvaluation`, `ReopenPolicy`
- `src/lib/payroll/reopen-policies/registry.ts` — array ordenado de policies activas (orden del pipeline)
- `src/lib/payroll/reopen-policies/evaluate.ts` — `evaluateReopenPolicies(ctx): Promise<PolicyEvaluation>` que corre todas en paralelo, agrega severity y retorna `{ canReopen, results, blockingCount, warningCount }`
- `policy-period-status.ts` — port del chequeo actual
- `policy-time-window.ts` — port del chequeo de `exported_at + windowDays` (mantiene env var)
- `policy-concurrent-export.ts` — port del lock `FOR UPDATE NOWAIT`
- `policy-valid-reason.ts` — port de taxonomía de motivos
- Migración: `payroll_period_reopen_audit` gana `policies_evaluated jsonb NOT NULL DEFAULT '[]'`, `warnings_at_reopen jsonb NOT NULL DEFAULT '[]'`
- `reopen-period.ts` refactorizado para usar el pipeline en vez de las llamadas manuales; persiste el snapshot de evaluación en el audit row
- `/reopen-preview` endpoint refactorizado para retornar `results: PolicyResult[]` directamente (el mapping actual de `reasons` queda como compatibilidad backward por un PR, luego se retira)
- Tests unitarios por policy + test integracional del pipeline
- Build + lint + tests verdes

### Slice B — Downstream Commitment Policies

**Entregables:**
- Migración: `greenhouse_payroll.previred_declarations (declaration_id TEXT PK, period_id TEXT FK, declared_at TIMESTAMPTZ, declared_by_user_id TEXT, folio_f29 TEXT, asset_id TEXT, notes TEXT, created_at, updated_at)` + FK a `payroll_periods`
- `src/lib/payroll/previred-declarations.ts` — `createPreviredDeclaration`, `getPreviredDeclarationsForPeriod`, `deletePreviredDeclaration` (admin only)
- `POST /api/hr/payroll/periods/[periodId]/previred-declarations` — crea un registro manual
- `GET /api/hr/payroll/periods/[periodId]/previred-declarations` — lista
- `DELETE /api/hr/payroll/periods/[periodId]/previred-declarations/[declarationId]` — soft elimina
- `policy-previred-declared.ts` — si existe un registro activo → `severity: 'block'` con mensaje "Previred ya declarado para este período. Requiere rectificación manual antes de reabrir." + `remediation`
- `policy-nubox-emitted.ts` — query Nubox sync tables [verificar schema real] para detectar boletas emitidas en el mes del período. Si existen → `severity: 'block'` con remediation apuntando a Nubox
- `policy-payment-cleared.ts` — query `expense_payments` donde `payroll_period_id = ?` y `is_reconciled = TRUE`. Si existen → `severity: 'warn'` (no bloquea; advierte que el delta implica transferencia adicional)
- `policy-delta-threshold.ts` — calcula `sum(abs(entry.grossTotal - prev.grossTotal))` sobre entries que serían reliquidadas (estimación del preview: cero; retorna `allow`). En el endpoint `/reopen` real (post-supersede), si `|delta_total| / period_gross > 10%` → agrega warning `high_delta_reliquidation` al audit
- `PreviredDeclarationCard.tsx` en `PayrollPeriodTab.tsx` — card sobre el período exportado con botón "Registrar declaración Previred" + lista de declaraciones existentes
- Tests unitarios por policy con PoolClient mockeado
- Build + lint + tests verdes

### Slice C — Safety Nets

**Entregables:**
- `src/lib/payroll/undo-reopen.ts` — función transaccional `undoPayrollReopen(periodId, actorUserId)` que:
  - Abre TX, lock `FOR UPDATE`
  - Verifica `period.status === 'reopened'`
  - Verifica que `NO existen entries con version > 1` para el período
  - Verifica que el último audit row tiene `reopened_at >= NOW() - INTERVAL '4 hours'`
  - UPDATE `period.status = 'exported'`
  - UPDATE `payroll_period_reopen_audit` del último registro SET `rolled_back_at = now(), rolled_back_by_user_id = $actor`
  - Emit evento `payroll_period.reopen_rolled_back`
  - Commit
- `POST /api/hr/payroll/periods/[periodId]/undo-reopen` — endpoint admin-gated
- `UndoReopenAction.tsx` — botón visible en `PayrollPeriodTab.tsx` cuando `period.status === 'reopened'`, el audit row es del usuario actual o admin, y la ventana de 4h está vigente. Muestra un countdown ("Puedes deshacer por X minutos").
- `ForceReopenOverrideModal.tsx` — modal con textarea obligatoria (min 50 chars), checkbox "Entiendo que estoy ignorando N bloqueos y asumo responsabilidad", que POST al endpoint `/reopen` con `force: true, override_justification: string`
- `ReopenPeriodDialog.tsx` modificado: si el preview retorna blocks, mostrar botón secundario "Forzar reapertura con justificación" que abre `ForceReopenOverrideModal`
- `reopen-period.ts` — acepta `force?: boolean` y `overrideJustification?: string`. Si `force === true`, la lógica de evaluación permite pasar aunque haya blocks, pero persiste `forced_override: true` y `override_justification` en el audit
- `src/emails/PayrollPeriodReopenedInternalEmail.tsx` — template React Email con `EmailLayout` + `EmailButton`. Copy en español: "Se ha registrado una reapertura de nómina" con período, operador, motivo, delta estimado (si aplica), link al admin audit view
- `src/lib/sync/projections/payroll-reopen-internal-notification.ts` — reactor sobre `payroll_period.reopened` que dispara el email a la lista en env var `PAYROLL_REOPEN_NOTIFICATION_RECIPIENTS` (CSV de emails)
- Registro del projection en `src/lib/sync/projections/index.ts`
- Registro del event en `src/lib/sync/event-catalog.ts`
- Emisión del evento `payroll_period.reopened` desde `reopen-period.ts` dentro de la TX
- Migración: `payroll_period_reopen_audit` gana `rolled_back_at TIMESTAMPTZ`, `rolled_back_by_user_id TEXT`, `forced_override BOOLEAN NOT NULL DEFAULT FALSE`, `override_justification TEXT`
- Tests: `undo-reopen.test.ts`, test del reactor de notificación, test del modal de override
- Build + lint + tests verdes

### Slice D — Observability

**Entregables:**
- `src/lib/payroll/reopen-metrics.ts` — helpers `recordReopenEvent(name, context)` que emiten a Sentry breadcrumb + console structured log. Eventos: `reopen.requested`, `reopen.blocked`, `reopen.warned`, `reopen.completed`, `reopen.force_override_used`, `reopen.rolled_back`, `reopen.supersede_delta_high`
- Instrumentación en `reopen-period.ts`, `undo-reopen.ts`, `supersede-entry.ts`, `apply-payroll-reliquidation-delta.ts`
- Actualización del runbook (Phase E) con queries de Grafana / Sentry para monitorear
- Build + lint + tests verdes

### Slice E — Documentation

**Entregables:**
- Actualización de `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`:
  - Sección "Reopen Lifecycle v1.5 — Policy Engine"
  - Tabla de todas las policies activas con severity default + remediation esperada
  - Diagrama de flow (texto) con transiciones + safety nets
  - Nota sobre env vars (`PAYROLL_REOPEN_WINDOW_DAYS`, `PAYROLL_REOPEN_NOTIFICATION_RECIPIENTS`)
- `docs/documentation/hr/reliquidacion-nomina.md` — doc funcional con el formato canónico (metadata header + secciones simples + `> Detalle técnico` links)
- `docs/operations/runbooks/payroll-reopen-playbook.md` — runbook operativo cubriendo:
  - Cuándo reabrir una nómina (casos válidos)
  - Cómo interpretar las policies bloqueantes y qué remediation seguir
  - Cuándo usar forced override
  - Cómo registrar una declaración Previred retroactiva
  - Cómo hacer undo dentro de la ventana de 4h
  - Queries de monitoreo (Sentry, logs)
  - Contactos / escalamiento

## Out of Scope

- **Rectificatoria Previred automática** — no se automatiza el envío a Previred; solo se trackea que fue declarado. Queda para un programa futuro de integración Previred API.
- **Nota de crédito Nubox automática** — no se emite la nota de crédito; solo se bloquea el reopen con remediation. La nota de crédito sigue siendo manual en Nubox.
- **Reliquidación múltiple (v3+)** — el constraint SQL `version <= 2` sigue vigente. Si se necesita v3+ se abre una task separada que relaje el constraint + ajuste la lógica de delta.
- **Workflow multi-step de aprobación** — el forced override es una sola acción con justificación, no un flow con approver distinto. Maker/checker queda para V2.
- **Tenant-configurable policy overrides** — el policy engine es componible pero V1.5 carga el mismo set de policies para todos los tenants. Configuración por tenant (ej: umbral de delta threshold distinto) queda como follow-up.
- **Dashboard visual de reliquidaciones** — la observabilidad V1.5 es Sentry breadcrumbs + logs estructurados. Un dashboard Grafana específico queda como follow-up.
- **Undo después de 4h o con v2 creadas** — imposibilidad técnica (romper versionado); debe hacerse como nueva reliquidación inversa.
- **Integración con Libro de Remuneraciones DT** — fuera de alcance, requiere integración con sistema externo DT.
- **Reporte cliente firmado check** — los reportes mensuales al cliente no están trackeados en el modelo canónico; queda fuera hasta que exista.

## Detailed Spec

### Shape del Policy Context y Result

```typescript
// src/lib/payroll/reopen-policies/types.ts

export type PolicySeverity = 'allow' | 'warn' | 'block'

export interface PolicyContext {
  periodId: string
  period: PayrollPeriod            // loaded snapshot (status, exported_at, year, month, ...)
  actorUserId: string
  referenceDate: Date
  client?: PoolClient              // optional, for policies that need transactional queries
  forceOverride: boolean           // true when the admin explicitly forced the reopen
  overrideJustification: string | null
}

export interface PolicyResult {
  code: string                     // canonical code, e.g. 'previred_declared'
  severity: PolicySeverity
  message: string                  // user-facing message (Spanish)
  detail?: Record<string, unknown> // structured context for the audit row
  remediation?: string             // actionable next step for the operator
  evaluatedAt: string              // ISO timestamp
}

export interface PolicyEvaluation {
  canReopen: boolean               // !hasBlock || forceOverride
  results: PolicyResult[]
  blockingCount: number
  warningCount: number
  forcedOverride: boolean
}

export interface ReopenPolicy {
  code: string
  description: string
  evaluate(ctx: PolicyContext): Promise<PolicyResult>
}
```

### Registry y pipeline

```typescript
// src/lib/payroll/reopen-policies/registry.ts
export const REOPEN_POLICIES: ReopenPolicy[] = [
  periodStatusPolicy,
  concurrentExportPolicy,
  timeWindowPolicy,
  validReasonPolicy,
  previredDeclaredPolicy,
  nuboxEmittedPolicy,
  paymentClearedPolicy,
  deltaThresholdPolicy
]

// src/lib/payroll/reopen-policies/evaluate.ts
export const evaluateReopenPolicies = async (ctx: PolicyContext): Promise<PolicyEvaluation> => {
  const results = await Promise.all(REOPEN_POLICIES.map(p => p.evaluate(ctx).catch(err => buildErrorResult(p, err))))
  const blockingCount = results.filter(r => r.severity === 'block').length
  const warningCount = results.filter(r => r.severity === 'warn').length
  const canReopen = blockingCount === 0 || ctx.forceOverride
  return { canReopen, results, blockingCount, warningCount, forcedOverride: ctx.forceOverride }
}
```

### Tabla `previred_declarations` DDL

```sql
CREATE TABLE greenhouse_payroll.previred_declarations (
  declaration_id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  declared_at TIMESTAMPTZ NOT NULL,
  declared_by_user_id TEXT NOT NULL,
  folio_f29 TEXT,
  asset_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON greenhouse_payroll.previred_declarations (period_id) WHERE is_active = TRUE;

ALTER TABLE greenhouse_payroll.previred_declarations OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.previred_declarations
  TO greenhouse_runtime, greenhouse_migrator;
```

### Audit row enrichment DDL

```sql
ALTER TABLE greenhouse_payroll.payroll_period_reopen_audit
  ADD COLUMN IF NOT EXISTS policies_evaluated JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warnings_at_reopen JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rolled_back_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS forced_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS override_justification TEXT;
```

### Undo endpoint validation logic

```typescript
// Within withTransaction
1. SELECT period FOR UPDATE
2. If period.status !== 'reopened' → 409 "Período no está en reopened"
3. SELECT count(*) FROM payroll_entries WHERE period_id = $1 AND version > 1
4. If count > 0 → 409 "Ya existen entries reliquidadas; no se puede deshacer"
5. SELECT audit WHERE period_id = $1 ORDER BY reopened_at DESC LIMIT 1
6. If audit.rolled_back_at IS NOT NULL → 409 "Este reopen ya fue revertido"
7. If audit.reopened_at < NOW() - INTERVAL '4 hours' → 409 "Ventana de deshacer expirada (4 horas)"
8. UPDATE period SET status = audit.previous_status
9. UPDATE audit SET rolled_back_at = NOW(), rolled_back_by_user_id = $actor
10. Emit `payroll_period.reopen_rolled_back` event
11. COMMIT
```

### Forced override flow

1. Operator clicks "Reabrir nómina" → `/reopen-preview` returns `canReopen: false` with N blocks
2. `ReopenPeriodDialog` shows blocks + secondary button "Forzar reapertura con justificación"
3. Click opens `ForceReopenOverrideModal`:
   - Textarea "Justificación (mínimo 50 caracteres)" required
   - Checkbox "Entiendo que estoy ignorando N bloqueos y asumo responsabilidad"
   - Shows each block with its code + remediation
4. On confirm → POST `/reopen` with `{ reason, reasonDetail, force: true, overrideJustification }`
5. Endpoint re-evaluates policies but does NOT fail on blocks when `force === true`
6. Persists `forced_override: true, override_justification: <text>` in audit
7. Emits `payroll_period.reopened` with `forced: true` flag in payload
8. Internal notification email subject: "⚠ Reapertura de nómina con override forzado — [Mes Año]"

### Internal notification email

Template `PayrollPeriodReopenedInternalEmail.tsx`:
- Header: "Reapertura de nómina registrada"
- Body:
  - Período: Marzo 2026
  - Operador: Juan Pérez (jperez@efeonce.org)
  - Motivo: Error de cálculo
  - Detalle: "Falto bono de retención para Pedro X"
  - Entries afectadas: 4
  - Delta estimado: (pendiente — se calcula al re-exportar)
  - Warnings al reopen: [lista de warnings que se aceptaron]
  - Override forzado: Sí/No (+ justificación si aplica)
- CTA: "Ver en audit log"
- Footer: enlace al runbook

Destinatarios: env var `PAYROLL_REOPEN_NOTIFICATION_RECIPIENTS` (CSV). Default vacío → no envío (log warning en ese caso).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/payroll/reopen-policies/` existe con registry, evaluate, y 8 policies (4 portadas + 4 nuevas)
- [ ] Cada policy tiene su test unitario y pasa
- [ ] `evaluateReopenPolicies` corre todas las policies en paralelo y maneja errores individuales sin romper el pipeline completo
- [ ] `payroll_period_reopen_audit` tiene las columnas `policies_evaluated`, `warnings_at_reopen`, `rolled_back_at`, `rolled_back_by_user_id`, `forced_override`, `override_justification`
- [ ] Tabla `greenhouse_payroll.previred_declarations` existe con owner `greenhouse_ops` y se puede escribir desde `greenhouse_runtime`
- [ ] `POST /api/hr/payroll/periods/[periodId]/previred-declarations` crea un registro; `GET` lo lista; `DELETE` lo desactiva (is_active = false)
- [ ] `policy-previred-declared` bloquea el reopen cuando existe una declaración activa, allow cuando no existe
- [ ] `policy-nubox-emitted` bloquea el reopen cuando detecta boletas emitidas para el período [verificar schema Nubox durante Discovery]
- [ ] `policy-payment-cleared` emite warning (no block) cuando hay pagos conciliados
- [ ] `policy-delta-threshold` agrega warning `high_delta_reliquidation` al audit cuando aplica
- [ ] `POST /api/hr/payroll/periods/[periodId]/undo-reopen` revierte el reopen si (a) no hay v2 entries y (b) ventana de 4h vigente; falla con 409 en otros casos
- [ ] `ReopenPeriodDialog` renderiza warnings (info) y blocks (error) por separado
- [ ] `ForceReopenOverrideModal` requiere justificación ≥50 chars + checkbox
- [ ] `POST /reopen` con `force: true` persiste `forced_override: true` en el audit y permite pasar los blocks
- [ ] `UndoReopenAction` visible en `PayrollPeriodTab` con countdown funcional cuando aplica
- [ ] `PreviredDeclarationCard` permite registrar una declaración desde la UI del período
- [ ] Projection reactivo `payroll_reopen_internal_notification` se dispara al emitirse `payroll_period.reopened` y envía email a la lista configurada
- [ ] Métricas Sentry emitidas en al menos 6 puntos del flow (requested, blocked, warned, completed, force_used, rolled_back)
- [ ] `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` incluye sección "Reopen Lifecycle v1.5"
- [ ] `docs/documentation/hr/reliquidacion-nomina.md` existe con metadata header canónico
- [ ] `docs/operations/runbooks/payroll-reopen-playbook.md` existe y cubre los 7 casos listados en Slice E
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit` verdes
- [ ] Smoke test en staging con `pnpm staging:request` validando un reopen con warnings y un reopen bloqueado

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm pg:connect:migrate` en dev local para las 2 migraciones nuevas
- Smoke test end-to-end en staging: (1) registrar declaración Previred → el reopen-preview debe bloquear, (2) sin declaración Previred con período reciente → el reopen-preview debe permitir, (3) reopen con warning de payment-cleared → permite y registra el warning en audit, (4) undo reopen en <4h → revierte correctamente
- Verificación manual del email de notificación interna en preview (si existe infra de preview de emails)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md` y `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` actualizados donde corresponda
- [ ] Env vars nuevas (`PAYROLL_REOPEN_NOTIFICATION_RECIPIENTS`, override de `PAYROLL_REOPEN_WINDOW_DAYS` si aplica) documentadas en CLAUDE.md y en el runbook
- [ ] Runbook operativo disponible en `docs/operations/runbooks/` y linkeado desde el README de operations
- [ ] TASK-409 actualizada con una nota "Extendida por TASK-414" en su sección de follow-ups

## Follow-ups

- **Tenant-configurable policies** (ej: umbral de delta threshold por tenant via tabla `reopen_policy_config`)
- **Dashboard Grafana** con métricas de reliquidación (frecuencia, motivos top, override rate, rollback rate)
- **Rectificatoria Previred API** — integración real con Previred para enviar F29 rectificatoria automática
- **Nubox nota de crédito API** — integración con Nubox para emitir nota de crédito automática en reliquidación de honorarios
- **Maker/checker workflow** — separar el rol "quien solicita reopen" del rol "quien aprueba", con estado intermedio `reopen_pending_approval`
- **Reliquidación múltiple (v3+)** — relajar constraint SQL y ajustar lógica de delta para cadenas de supersession
- **Auto-send del email `PayrollLiquidacionV2Email`** al colaborador post re-export (TASK-412 dejó el template listo pero sin trigger automático)
- **Integración con Libro de Remuneraciones DT** para validar que el libro no fue firmado antes de permitir reopen

## Open Questions

- ¿El schema real de las tablas Nubox sync que debe consultar `policy-nubox-emitted`? Resolver durante Discovery — hint: el sync de Nubox está bajo `greenhouse_finance` o `greenhouse_sync` y emite boletas honorarios como DTE.
- ¿Umbral exacto de `policy-delta-threshold`? Propuesta: 10% del gross_total del período. Confirmar con Finance.
- ¿Ventana de undo de 4h vs 2h vs 24h? Propuesta: 4h (suficiente para detectar error inmediato, no tanto como para habilitar abuso).
- ¿El forced override debe requerir un rol distinto al `efeonce_admin` o el mismo rol con justificación basta? Propuesta V1.5: mismo rol + justificación en audit.
- ¿La notificación interna debe ir por email o también por Slack/in-app notification? Propuesta V1.5: email only (Slack/in-app queda como follow-up de notification framework).
- ¿La card `PreviredDeclarationCard` en `PayrollPeriodTab` debe estar siempre visible o solo cuando el período está `exported`? Propuesta: visible cuando `status IN ('approved', 'exported', 'reopened')` para permitir registro retroactivo.
