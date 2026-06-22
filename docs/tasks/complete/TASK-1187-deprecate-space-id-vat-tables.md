# TASK-1187 — Deprecar `space_id` en las tablas VAT (post legacy-reader removal)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-725 (debe estar complete + estable en prod)`
- Branch: `task/TASK-1187-deprecate-space-id-vat-tables`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cleanup de baja prioridad: tras TASK-725 (re-scope del IVA a entidad legal), `space_id`/`client_id` en `vat_ledger_entries` / `vat_monthly_positions` quedaron como etiqueta analítica de contraparte (nullable), ya no como clave fiscal. Esta task deprecá esas columnas como dimensión cuando se confirme que ningún reader legacy las usa como scope — primero marcándolas deprecated, luego (en una task/fase posterior) eventualmente removiéndolas si no aportan valor analítico. NO es urgente: las columnas nullable no molestan y `space_id` aún sirve como tag de contraparte por asiento.

## Why This Task Exists

TASK-725 cambió el scope fiscal de `space_id` a la operating entity. `space_id`/`client_id` sobreviven como etiqueta de contraparte (en `vat_ledger_entries` siguen siendo útiles a nivel asiento; en `vat_monthly_positions` quedan NULL porque la posición es consolidada). El follow-up es higiene: cuando se confirme que no quedan readers que dependan de `space_id` como scope fiscal, marcar la columna deprecated en `vat_monthly_positions` (donde ya es siempre NULL) y decidir si se conserva como tag en `vat_ledger_entries` o se retira. Es deuda menor, no bloqueante.

## Goal

- Confirmar (audit) que ningún reader/consumer usa `space_id` de las tablas VAT como **scope fiscal** (solo como tag, si acaso).
- Marcar `vat_monthly_positions.space_id`/`client_id` como deprecated (comentario de columna + nota en spec) dado que siempre quedan NULL post-TASK-725.
- Decidir y documentar si `vat_ledger_entries.space_id`/`client_id` se conservan como tag analítico de contraparte o se retiran.
- Dejar el camino de remoción física para una fase posterior si se decide retirar (con la disciplina de migración additive/reversible).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-06-20 VAT scope = entidad legal, TASK-725)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migraciones node-pg-migrate)

Reglas obligatorias:

- **NUNCA** re-introducir `space_id` como clave fiscal (TASK-725). Esta task solo lo deprecá/retira como dimensión, no lo revive.
- **NUNCA** dropear columnas sin confirmar 0 readers que dependan de ellas (audit primero).
- Migración con markers correctos + DO block anti pre-up-marker; remoción de columna solo si se decide, en migración reversible documentada.

## Normative Docs

- `docs/tasks/in-progress/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` (origen del follow-up).

## Dependencies & Impact

### Depends on

- TASK-725 complete + estable en prod (el re-scope debe estar consolidado antes de deprecar la dimensión vieja).
- `src/lib/finance/vat-ledger.ts` (readers que aún seleccionan `space_id` como tag).
- `vat_ledger_entries` / `vat_monthly_positions` (columnas `space_id`, `client_id`).

### Blocks / Impacts

- Bajo. Solo limpieza de las tablas VAT. No impacta otras posiciones fiscales.

### Files owned

- `migrations/` (marcado deprecated / eventual remoción — `[verificar]` en Discovery)
- `src/lib/finance/vat-ledger.ts` (si se retira el tag de los readers)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (nota de deprecación)

## Current Repo State

### Already exists

- Post-TASK-725: `vat_monthly_positions.space_id`/`client_id` se escriben NULL (posición consolidada por entidad legal); `vat_ledger_entries.space_id`/`client_id` se conservan como tag de contraparte por asiento.
- Migración `20260620131856180` ya hizo `space_id` nullable + unique por `(organization_id, period)`.

### Gap

- No hay marca de deprecación en las columnas `space_id`/`client_id` de las tablas VAT.
- No está decidido si el tag de contraparte en `vat_ledger_entries` se conserva o se retira.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite` (cleanup additive; audit de readers + comentario de columna; remoción física diferida y opcional)
- Impacto principal: `migration` (comentario/deprecación; posible DROP COLUMN diferido)
- Source of truth afectado: `greenhouse_finance.vat_ledger_entries` / `vat_monthly_positions`
- Consumidores afectados: readers de `vat-ledger.ts` (solo como tag display)
- Runtime target: `staging` → `production`

### Contract surface

- Contrato existente a respetar: readers VAT (no romper la card/endpoint).
- Contrato nuevo o modificado: columnas marcadas deprecated; posible remoción del tag en VM si se decide retirar.
- Backward compatibility: `compatible` (deprecación es additive; remoción física sería gated/posterior).
- Full API parity: `N/A — no capability`.

### Data model and invariants

- Entidades/tablas afectadas: `vat_ledger_entries`, `vat_monthly_positions`.
- Invariantes: el scope fiscal sigue siendo la entidad legal; `space_id` no vuelve a ser clave.
- Tenant/space boundary: N/A (VAT es de la entidad legal).
- Idempotency/concurrency: N/A (cleanup).
- Audit/outbox/history: N/A.

### Migration, backfill and rollout

- Migration posture: `additive` (comentario de deprecación). Remoción física (`DROP COLUMN`) solo si se decide retirar el tag, en migración separada reversible.
- Default state: deprecación es metadata; sin cambio de comportamiento.
- Backfill plan: ninguno.
- Rollback path: revert PR / reverse migration.
- External coordination: ninguna (cleanup interno).

### Security and access

- Auth/access gate: N/A (cleanup de schema).
- Sensitive data posture: `finance` (sin PII nueva).
- Error contract: N/A.
- Abuse/rate-limit posture: N/A.

### Runtime evidence

- Local checks: audit grep de readers que usan `space_id` de las tablas VAT; tests VAT verdes.
- DB/runtime checks: `information_schema.columns` confirma deprecación; readers no rompen.
- Integration checks: card IVA + endpoint siguen 200.
- Reliability signals/logs: `finance.vat.position_drift` sigue 0.
- Production verification sequence: aplicar comentario en staging → confirmar readers OK → prod.

### Acceptance criteria additions

- [ ] Audit confirma 0 readers que usan `space_id` VAT como scope fiscal.
- [ ] Decisión documentada: conservar tag en `vat_ledger_entries` o retirar.
- [ ] Migración/rollback proporcional (additive; remoción física diferida si aplica).

## Capability Definition of Done — Full API Parity gate

`N/A — no capability` (cleanup de schema).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit de readers + decisión

- Grep/audit de todo consumer que seleccione/filtre `space_id`/`client_id` de las tablas VAT. Confirmar que ninguno lo usa como scope fiscal (solo tag display, si acaso).
- Decidir y documentar: conservar tag en `vat_ledger_entries` (útil para análisis de contraparte) o retirar.

### Slice 2 — Marcar deprecated

- Migración additive: `COMMENT ON COLUMN` marcando `vat_monthly_positions.space_id`/`client_id` como deprecated (siempre NULL post-TASK-725). Nota en la spec/arch doc.

### Slice 3 — (Opcional, diferido) Remoción física

- Solo si Slice 1 decide retirar el tag: migración reversible `DROP COLUMN` en `vat_ledger_entries` + ajuste de readers/VM types. Puede quedar como follow-up separado.

## Out of Scope

- Re-introducir `space_id` como scope fiscal (prohibido por TASK-725).
- Tocar otras tablas/posiciones fiscales.
- Remoción física forzada sin la decisión del Slice 1.

## Detailed Spec

Cleanup menor. El patrón: audit → `COMMENT ON COLUMN ... IS 'deprecated (TASK-725): space_id ya no es scope fiscal; la posición consolida por entidad legal'` → decisión sobre el tag en `vat_ledger_entries`. La remoción física, si se decide, sigue la disciplina de migración reversible.

## Rollout Plan & Risk Matrix

N/A — additive cleanup, no production runtime impact en Slices 1-2 (comentario de columna + audit). El Slice 3 (remoción física, diferido/opcional) sí requiere migración reversible + ajuste de readers; rollback = reverse migration + revert PR. Sin flags. Coordinación externa: ninguna.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Dropear una columna que un reader aún usa | finance | low | audit (Slice 1) antes de cualquier DROP; remoción solo en Slice 3 gated | `finance.vat.position_drift` + tests VAT |

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A (audit, sin cambio) | — | sí |
| Slice 2 | reverse migration (quita el comentario) | <5 min | sí |
| Slice 3 | reverse migration (re-add column) + revert PR | <15 min | sí |

### Production verification sequence

1. Slice 2 (comentario) a staging → confirmar readers OK + `position_drift=0` → prod.
2. Slice 3 (si aplica) a staging → re-materializar dev → readers OK → prod.

### Out-of-band coordination required

N/A — repo-only cleanup.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Resolution (2026-06-20)

Slices 1-2 ejecutados; Slice 3 (DROP físico) queda como follow-up opcional diferido.

- **Slice 1 — Audit + decisión.** 0 readers usan `space_id`/`client_id` VAT como scope fiscal (scope = `organization_id`/`legalEntityOrganizationId` en `route.ts:116`, `getVatMonthlyPosition`, `listVatLedgerEntries`, drift reader). Empíricamente: `vat_monthly_positions` 30/30 filas con `space_id`/`client_id` NULL (columnas muertas); `vat_ledger_entries` 53/181 `space_id` + 56/181 `client_id` non-null (tag de contraparte vivo).
  - **Decisión (Open Question):** `vat_monthly_positions.space_id`/`client_id` → **deprecar** (siempre NULL, sin valor analítico). `vat_ledger_entries.space_id`/`client_id` → **CONSERVAR** como tag analítico de contraparte por asiento (data viva, útil para análisis de contraparte; retirarlo perdería señal real).
- **Slice 2 — Marcar deprecated.** Migración additive `20260620164008059_task-1187-deprecate-space-id-vat-monthly-positions.sql`: `COMMENT ON COLUMN` deprecando ambas columnas de `vat_monthly_positions` + DO block anti pre-up-marker. La deprecación se propaga a `db.d.ts` como JSDoc (consumers la ven en el editor). Aplicada en Cloud SQL; comentarios verificados vía `pg_description`. `finance.vat.position_drift` sigue `ok`; readers/tests VAT verdes.
- **Slice 3 — DROP físico (diferido, opcional).** No se ejecuta: las columnas nullable no molestan y el ROI de la remoción física es bajo. Queda como follow-up si se decide limpiar.

## Acceptance Criteria

- [x] Audit confirma que ningún reader usa `space_id`/`client_id` VAT como scope fiscal.
- [x] `vat_monthly_positions.space_id`/`client_id` quedan marcadas deprecated (comentario de columna + JSDoc en `db.d.ts`).
- [x] Decisión documentada sobre el tag en `vat_ledger_entries` (conservar — data viva de contraparte).
- [x] `finance.vat.position_drift` sigue `ok` y la card/endpoint IVA no rompen (readers intactos, tests verdes).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm pg:connect:shell` — confirmar comentario de columna + readers OK

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` (registry) + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] chequeo de impacto cruzado (TASK-725 §Follow-ups: deprecación movida acá)
- [x] Delta en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Follow-ups

- Remoción física del tag (Slice 3) si se decide retirar — puede quedar como task separada.

## Open Questions

- ¿El tag de contraparte (`space_id`/`client_id`) en `vat_ledger_entries` aporta valor analítico suficiente para conservarlo, o se retira? Decisión del Slice 1.
