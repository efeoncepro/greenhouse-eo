# TASK-1185 — VAT materializer + fiscal robustness hardening (TASK-725 audit follow-ups)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1185-vat-materializer-fiscal-robustness-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hardening de robustez fiscal del materializador de IVA (`vat-ledger.ts`) y del resolver de operating entity, a partir de los hallazgos de la auditoría adversarial de TASK-725. Cierra 4 riesgos que hoy son silenciosos (no rompen el drift=0 actual pero pueden materializar una cifra F29 incorrecta o stale en condiciones específicas): fallback FX a multiplicador 1 en documentos no-CLP, race de materialización concurrente sin advisory lock, cache del resolver de operating entity sin invalidación en el worker long-lived, y documentos con IVA sin período fiscal invisibles al IVA y al signal de drift.

## Why This Task Exists

La auditoría de TASK-725 (re-scope del IVA a entidad legal) confirmó que el materializador es correcto para el caso actual (CLP, single operating entity, drift=0), pero identificó 4 riesgos **pre-existentes** que el re-scope no introdujo pero tampoco resolvió. Son silent-wrong: producen una cifra fiscal incorrecta sin fallar loud y sin que el signal `finance.vat.position_drift` los detecte. Como el IVA materializa una posición tributaria (insumo F29), un silent-wrong es peor que un fail-loud. Esta task los convierte en fail-loud / observables.

## Goal

- Un documento con IVA en moneda no-CLP y FX nulo/0 NO se materializa silenciosamente con multiplicador 1: falla/quarantine + signal observable.
- La materialización de un período es segura ante concurrencia (advisory lock); dos consumers reactivos del mismo período no se pisan.
- El cache de `getOperatingEntityIdentity()` se invalida cuando la operating entity cambia (no escribe org stale en el worker long-lived).
- Los documentos con IVA y `period_year`/`period_month` NULL son visibles vía un signal de data-quality (`finance.vat.eligible_without_period`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-06-20 VAT scope = entidad legal, TASK-725; + Delta 2026-04-21 TASK-533)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (FX policy + readiness contract)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (signals canónicos)

Reglas obligatorias:

- **NUNCA** materializar un asiento fiscal con monto convertido por un multiplicador FX default (1) cuando la moneda no es CLP y el FX es nulo/0 — eso es silent-wrong fiscal. Fail/quarantine + signal.
- **NUNCA** computar FX inline violando `greenhouse/no-untokenized-fx-math`; usar las VIEWs/resolvers canónicos donde aplique.
- **SIEMPRE** que el VAT mute, mantener `finance.vat.position_drift` en steady=0; los signals nuevos son additive (no reemplazan al drift).
- El scope fiscal sigue siendo la operating entity (TASK-725) — no re-introducir `space_id` como clave fiscal.

## Normative Docs

- `docs/tasks/in-progress/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` → §`Follow-ups de la auditoría adversarial (2026-06-20)` (origen de esta task).
- `docs/issues/open/ISSUE-101-vat-monthly-position-mis-scoped-by-space-excludes-credito-fiscal.md`.

## Dependencies & Impact

### Depends on

- TASK-725 (re-scope VAT a entidad legal) — implementado + desplegado. Esta task asume ese estado.
- `src/lib/finance/vat-ledger.ts` (materializador + readers).
- `src/lib/account-360/organization-identity.ts` (`getOperatingEntityIdentity` + cache).
- `src/lib/reliability/queries/vat-position-drift.ts` (signal existente a no romper).

### Blocks / Impacts

- El Slice 3 (cache invalidation) es **cross-cutting**: el primitive `getOperatingEntityIdentity()` lo consumen también payroll, contractor-engagements, finiquito y workforce onboarding. El fix beneficia a todos esos consumers.

### Files owned

- `src/lib/finance/vat-ledger.ts`
- `src/lib/account-360/organization-identity.ts`
- `src/lib/reliability/queries/vat-position-drift.ts` (referencia; no se modifica salvo doc)
- `src/lib/reliability/queries/vat-entry-unresolved-fx.ts` (nuevo)
- `src/lib/reliability/queries/vat-eligible-without-period.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wiring de signals nuevos)
- `src/lib/reliability/signals.ts` (builder si aplica)
- tests asociados

## Current Repo State

### Already exists

- Materializador `materializeVatLedgerForPeriod` (`vat-ledger.ts`) scopeado a operating entity (TASK-725), con conversión CLP `COALESCE(NULLIF(exchange_rate_to_clp,0),1)` en income y expense (el fallback a 1 es el riesgo del Slice 1).
- Transacción DELETE-por-período + INSERT sin advisory lock (riesgo Slice 2).
- `getOperatingEntityIdentity()` con `cachedOperatingEntity` module-level sin invalidación (riesgo Slice 3).
- `materializeAllAvailableVatPeriods` enumera solo períodos con `period_year/month NOT NULL` (raíz del gap Slice 4).
- Signal `finance.vat.position_drift` (bucket-aware) — no ve docs sin período (Slice 4).

### Gap

- No hay guard/quarantine ni signal para asientos VAT con FX no resuelto en moneda no-CLP.
- No hay advisory lock por período en la materialización.
- No hay invalidación del cache de operating entity.
- No hay signal de data-quality para docs con IVA sin período fiscal.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (additive: guards + signals + advisory lock; sin migración destructiva; toca el materializador fiscal con cuidado)
- Impacto principal: `command` (materializer hardening) + `reader` (signals nuevos)
- Source of truth afectado: `greenhouse_finance.vat_ledger_entries` / `vat_monthly_positions` (materializados desde `income`/`expenses`); resolver `getOperatingEntityIdentity`
- Consumidores afectados: reliability overview (`/admin/operations`), ops-worker (reactive projection VAT), y — para el cache (Slice 3) — payroll/contractor/finiquito/onboarding
- Runtime target: `worker` (materializador reactivo) + `app` (signals)

### Contract surface

- Contrato existente a respetar: `materializeVatLedgerForPeriod(year, month, reason)` (firma estable; no cambiar), `getOperatingEntityIdentity()` (agregar invalidador, no romper la firma), `finance.vat.position_drift` (no romper).
- Contrato nuevo o modificado: `clearOperatingEntityCache()` exportado; signals `finance.vat.entry_unresolved_fx` + `finance.vat.eligible_without_period`; guard de FX en el materializador (quarantine/skip + razón).
- Backward compatibility: `compatible` (additive). El guard FX puede cambiar el comportamiento de un asiento hoy mal-convertido — declarar como corrección, no breaking.
- Full API parity: `N/A — no capability` (hardening interno de materializador + signals read-only).

### Data model and invariants

- Entidades/tablas/views afectadas: `vat_ledger_entries`, `vat_monthly_positions`, `income`, `expenses` (lectura), `greenhouse_core.organizations` (resolver).
- Invariantes que no se pueden romper:
  - El scope fiscal sigue siendo la operating entity (no re-introducir space).
  - `finance.vat.position_drift` permanece bucket-aware y steady=0.
  - El guard FX NO debe excluir documentos CLP (la mayoría) — solo aplica a no-CLP con FX nulo/0.
- Tenant/space boundary: el VAT es de la operating entity (no per-space); los signals son internos (no client-facing).
- Idempotency/concurrency: el advisory lock (`pg_advisory_xact_lock(hashtext(periodId))`) hace la materialización por período serializable; idempotente por re-run (DELETE+INSERT).
- Audit/outbox/history: opcional emitir evento/quarantine para asientos FX no resueltos `[verificar]`; los signals son detectores read-only.

### Migration, backfill and rollout

- Migration posture: `none` esperado (signals = readers; advisory lock + FX guard = código). Si la quarantine de FX requiere persistencia (columna/flag en `vat_ledger_entries`), sería `additive` `[verificar]` en Discovery.
- Default state: signals nuevos nacen activos (read-only, degradación honesta). El guard FX puede gatearse con flag si se prefiere shadow `[verificar]`.
- Backfill plan: ninguno (los signals leen el estado actual; no mutan).
- Rollback path: revert PR + redeploy (app) / redeploy ops-worker (si toca el materializador).
- External coordination: redeploy del ops-worker si Slice 1/2 tocan el materializador (mismo patrón que TASK-725 B).

### Security and access

- Auth/access gate: signals vía el reliability overview (interno). Sin endpoint nuevo client-facing.
- Sensitive data posture: `finance` (cifras fiscales internas; sin PII de terceros).
- Error contract: `captureWithDomain(err, 'finance', ...)` en los readers de signals; sin prosa cruda al cliente.
- Abuse/rate-limit posture: `N/A` (lectura interna).

### Runtime evidence

- Local checks: tests focales de los signals + del guard FX (caso no-CLP con FX nulo → detectado/quarantine).
- DB/runtime checks: query read-only vs PG de los dos signals nuevos (esperado 0 en el estado actual CLP); verificar que `position_drift` sigue 0.
- Integration checks: si toca el materializador, re-materializar dev + confirmar drift=0 y que el guard FX no excluyó documentos CLP.
- Reliability signals/logs: `finance.vat.entry_unresolved_fx`, `finance.vat.eligible_without_period` en `/admin/operations`.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes (scope = operating entity; drift bucket-aware steady=0; guard FX no toca CLP) explícitos.
- [ ] Migration/backfill/rollback proporcional (additive; rollback = revert + redeploy).
- [ ] Evidencia DB/runtime de los signals nuevos (read-only) listada.
- [ ] Dominio finance con `captureWithDomain` y sin data leaks.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability` (hardening de materializador + signals read-only; no introduce un write de negocio nuevo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Guard FX para asientos VAT no-CLP

- En `materializeVatLedgerForPeriod`, detectar income/expense con IVA en moneda ≠ CLP y `exchange_rate_to_clp` nulo/0 → NO materializar con multiplicador 1 silencioso (skip/quarantine + razón).
- Signal `finance.vat.entry_unresolved_fx` (steady=0): cuenta documentos con IVA no-CLP sin FX resuelto en períodos materializados.
- Test: caso no-CLP sin FX → detectado/quarantine; caso CLP → intacto.

### Slice 2 — Advisory lock por período en la materialización

- `pg_advisory_xact_lock(hashtext(periodId))` al inicio de la tx de `materializeVatLedgerForPeriod` para serializar materializaciones concurrentes del mismo período.
- Test/validación: dos materializaciones concurrentes del mismo período no se pisan (no quedan asientos parciales/duplicados).

### Slice 3 — Invalidación del cache de operating entity

- Exportar `clearOperatingEntityCache()` en `src/lib/account-360/organization-identity.ts` e invocarlo cuando la operating entity cambie (evento de update de org / flag `is_operating_entity`), o introducir TTL corto.
- Cross-cutting: documentar que beneficia a payroll/contractor/finiquito/onboarding (consumers del mismo resolver).
- Test: tras `clearOperatingEntityCache()`, la siguiente resolución re-lee de PG.

### Slice 4 — Signal de data-quality para docs con IVA sin período

- Signal `finance.vat.eligible_without_period`: cuenta income (`vat_output`, tax>0) y expenses (recoverable/non_recoverable>0) con `period_year`/`period_month` NULL → invisibles al IVA y al drift.
- Documentar remediación (stampear `tax_period`) como operación, no automática.

## Out of Scope

- Multi-entidad legal real (varios RUT) — sigue siendo follow-up de TASK-725 (selector fiscal + `legal_entity_organization_id` por documento).
- PPM / retenciones / renta anual.
- Re-diseño del FX platform (solo se agrega el guard donde el materializador ya convierte).
- Cambiar el scope fiscal (sigue siendo operating entity).
- Auto-remediación de `tax_period` faltante (el Slice 4 solo observa).

## Detailed Spec

Razonamiento y evidencia en TASK-725 §`Follow-ups de la auditoría adversarial`. Patrón de signal: mirror de `vat-position-drift.ts` (read-only, `captureWithDomain`, severidad por count, wiring en `get-reliability-overview.ts` con los 5 puntos: import, type `preloadedSources`, compute block, spread del array, ensamblado). Advisory lock: `SELECT pg_advisory_xact_lock(hashtext(${periodId}))` como primer statement de la tx. Guard FX: filtrar/quarantine en los CTEs `scoped_income`/`scoped_expense` los casos `currency <> 'CLP' AND COALESCE(NULLIF(exchange_rate_to_clp,0)) IS NULL`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slices 1–4 son **independientes** entre sí (no hay dependencia dura). Orden sugerido por valor/riesgo: Slice 4 (signal puro, cero riesgo) → Slice 1 (guard FX + signal) → Slice 2 (advisory lock) → Slice 3 (cache, cross-cutting, validar consumers).
- Slice 1 y 2 tocan el materializador → requieren redeploy del ops-worker (como TASK-725 B). Slices 3/4 también (3 toca el resolver worker-bundled; 4 es app-only salvo que se quiera en el worker).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Guard FX excluye documentos CLP por error | finance | low | filtrar SOLO `currency <> 'CLP' AND fx nulo/0`; test CLP intacto | `finance.vat.position_drift` (no debe subir) |
| Advisory lock introduce deadlock/contención | finance / worker | low | lock por período (hashtext), `xact` scope (libera al commit); test concurrente | logs ops-worker |
| Cache invalidation rompe consumers compartidos | payroll / contractor / identity | medium | invalidador additive (no cambia firma); regresión suite payroll/offboarding | tests payroll/offboarding verdes |
| Signal nuevo con predicado divergente del materializador | finance | low | reusar exactamente los predicados de elegibilidad del materializador | revisión + test |

### Feature flags / cutover

Signals (Slice 1 detector, Slice 4) nacen activos read-only (degradación honesta). El guard FX (Slice 1 enforcement) puede gatearse con flag `VAT_FX_GUARD_ENABLED` (default OFF) durante shadow si se prefiere observar antes de enforce `[verificar]`. Advisory lock y cache invalidation: sin flag (additive, seguros).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy ops-worker (flag OFF si gateado) | <30 min | sí |
| Slice 2 | revert PR + redeploy ops-worker | <30 min | sí |
| Slice 3 | revert PR + redeploy (additive) | <15 min | sí |
| Slice 4 | revert PR (signal app-only) | <5 min | sí |

### Production verification sequence

1. Slices a staging → signals nuevos en `/admin/operations` en su steady esperado (0 en el estado CLP actual).
2. Si tocó el materializador (1/2/3): re-materializar dev + confirmar `finance.vat.position_drift=0` y que el guard FX no excluyó CLP.
3. Redeploy ops-worker (ENV=staging, mismo patrón TASK-725 B) desde árbol limpio.
4. Regresión payroll/offboarding verde (Slice 3 cross-cutting).
5. Monitor signals 7d.

### Out-of-band coordination required

Redeploy del ops-worker (`services/ops-worker/deploy.sh`) para Slices 1/2/3 (materializador/resolver worker-bundled). N/A para Slice 4 si queda app-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un income/expense con IVA en moneda ≠ CLP y FX nulo/0 NO se materializa con multiplicador 1: queda skip/quarantine + visible en `finance.vat.entry_unresolved_fx`.
- [ ] Documentos CLP no se ven afectados por el guard FX (drift sigue 0).
- [ ] `materializeVatLedgerForPeriod` toma `pg_advisory_xact_lock` por período; dos materializaciones concurrentes del mismo período no producen asientos parciales/duplicados.
- [ ] `clearOperatingEntityCache()` existe, se invoca en cambio de operating entity (o hay TTL), y la siguiente resolución re-lee de PG.
- [ ] `finance.vat.eligible_without_period` cuenta los docs con IVA sin período; wired al overview.
- [ ] `finance.vat.position_drift` sigue bucket-aware y steady=0 tras los cambios.
- [ ] Regresión payroll/offboarding verde (consumers del resolver compartido).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm test src/lib/payroll src/lib/workforce/offboarding` (Slice 3 cross-cutting)
- `pnpm worker:runtime-deps-gate` (si toca worker-bundled)
- `pnpm pg:connect:shell` — query read-only de los signals nuevos
- `pnpm staging:request /api/admin/reliability` (signals en steady)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-725 §Follow-ups: marcar los resueltos)
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta si cambia el contrato del materializador
- [ ] `RELIABILITY_CONTROL_PLANE` / EVENT_CATALOG Delta por los signals nuevos

## Follow-ups

- Multi-entidad legal real (selector fiscal + `legal_entity_organization_id` por documento) — sigue en TASK-725.
- Auto-remediación de `tax_period` faltante en income/expenses (Slice 4 solo observa).

## Open Questions

- ¿El guard FX (Slice 1) debe **skipear** el documento (no materializa) o **quarantine** (materializa marcado + excluido del neto)? Skip es más simple; quarantine preserva visibilidad. Decidir en Discovery (puede requerir columna → migración additive).
- ¿La invalidación del cache (Slice 3) se ata a un evento de outbox de update de org, o un TTL corto basta? El TTL es más simple y suficiente si la operating entity casi nunca cambia.
- ¿`finance.vat.eligible_without_period` (Slice 4) corre en el app (reliability overview) o también necesita acción del worker? Default: app-only.
