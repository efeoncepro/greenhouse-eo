# TASK-1204 — F29 fiscal accuracy: exclusión de documentos anulados + corrección tasa PPM

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `sync`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1204-f29-annulled-document-exclusion-ppm-rate`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-105`

## Summary

Detectado en validación contable real del F29 de mayo 2026 contra el SII: una boleta de honorarios **anulada en el SII** (Valentina Hoyos, folio 40, `sii_document_status='Anulada'`) seguía sumando en la posición de retención de Greenhouse porque (a) el sync Nubox trae el estado `Anulada` pero **no lo mapea a `is_annulled`**, y (b) el materializador de retención **no excluye anuladas**. Resultado: retención sobre-declarada en $107.970 (242.623 nuestro vs 134.653 SII). En paralelo, la **tasa PPM** estaba en placeholder 0,25% — el contador confirmó la real **0,125%** (PPM 14.500 → 7.250). Esta task cierra ambas brechas en la causa raíz + blinda con guard + backfill + re-materialización, dejando el F29 de mayo cuadrado al peso con el SII.

## Why This Task Exists

El IVA del F29 ya cuadra al peso (débito 1.102.000, crédito 21.594, determinado 1.080.405) — la lógica de cálculo es correcta. Las dos brechas son de **completitud/exactitud de datos**, no de fórmula:

1. **Bug class — documentos anulados cuentan en posiciones fiscales (lado expenses).** El income (ventas) SÍ filtra `is_annulled` (por eso el débito y la base PPM cuadran), pero el lado expenses no: `is_annulled` nunca se deriva de `nubox/sii_document_status='Anulada'`, y el materializador de retención no lo filtra. Cualquier honorario anulado **después** de emitirse sigue contando. Hoy es 1 doc (folio 40); es un bug sistémico que reaparece con cada anulación post-emisión.
2. **Tasa PPM placeholder.** TASK-1189 sembró `ppm_rate_config` con 0,25% (`source='placeholder_pending_contador'`) explícitamente pendiente de validación. El F29 real del SII confirma 0,125%.

## Goal

- El sync Nubox→expenses mapea `document_status='Anulada'` → `is_annulled=true` (causa raíz, anti-recurrencia).
- El materializador de retención excluye documentos anulados (`is_annulled=false`) — defensa en profundidad.
- Backfill de `is_annulled=true` para los documentos ya anulados en fuente con flag inconsistente.
- `ppm_rate_config` corregida a 0,00125 (0,125%, fuente SII confirmada por contador).
- Re-materialización de retención + PPM de los períodos afectados → F29 mayo cuadra al peso con el SII.
- ISSUE-### que documenta el incidente runtime (anulado contado en F29).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Deltas TASK-1188 retenciones, TASK-1189 PPM, TASK-1191 fiscal period stamping)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` (sync Nubox)
- Skill MANDATORIA `greenhouse-finance-accounting-operator` (cualquier flujo fiscal/ledger)

Reglas obligatorias:

- **NUNCA** recomputar las posiciones fuera de sus materializadores canónicos (`retention-ledger.ts`, `ppm-ledger.ts`).
- **SIEMPRE** que un materializador fiscal lea documentos de fuente, excluir anulados (`is_annulled=false`) — alinear expenses con el patrón ya vigente en income.
- **NUNCA** dejar `is_annulled` desacoplado del estado autoritativo del SII (`sii_document_status='Anulada'` = anulado legal).
- El backfill de datos es **corrección a la realidad legal** (el SII ya anuló): idempotente, reversible, auditable.

## Normative Docs

- `docs/tasks/complete/TASK-1188-retenciones-monthly-position.md` (materializador retención + dedup_status)
- `docs/tasks/complete/TASK-1189-ppm-monthly-position.md` (`ppm_rate_config` SSOT + placeholder)
- `docs/tasks/complete/TASK-1191-nubox-fiscal-period-stamping-backfill.md` (stamping de período fiscal en sync Nubox)

## Dependencies & Impact

### Depends on

- `src/lib/nubox/sync-nubox-to-postgres.ts` — sync Nubox→PG (escribe `nubox_document_status`) `[verificar]`
- `src/lib/finance/postgres-store-slice2.ts` — expense store (escribe `is_annulled` + status) `[verificar]`
- `src/lib/finance/retention-ledger.ts` — materializador retención (`materializeRetentionLedgerForPeriod`)
- `src/lib/finance/ppm-ledger.ts` + tabla `greenhouse_finance.ppm_rate_config`
- `greenhouse_finance.expenses` (`is_annulled`, `nubox_document_status`, `sii_document_status`)

### Blocks / Impacts

- Cierra la validación contable del F29 (retención + PPM) que TASK-1188/1189 dejaron en shadow pendiente de contador.
- Habilita el flip de `RETENTION_POSITION_ENABLED` / `PPM_POSITION_ENABLED` a oficial una vez verificado vs F29 real (decisión contable separada).
- Impacta cualquier consumer de retención/PPM (card F29 TASK-1197, endpoint TASK-1195).

### Files owned

- `src/lib/nubox/sync-nubox-to-postgres.ts` (mapeo annulled) `[verificar]`
- `src/lib/finance/postgres-store-slice2.ts` (mapeo annulled en upsert expense) `[verificar]`
- `src/lib/finance/retention-ledger.ts` (guard `is_annulled`)
- `migrations/*` (backfill `is_annulled` + corrección `ppm_rate_config`)
- tests asociados
- `docs/issues/open/ISSUE-###-*.md` (incidente runtime)

## Current Repo State

### Already exists

- Materializador de retención (TASK-1188) desde BHE (`expenses.withholding_amount>0`), con `retention_ledger_entries.dedup_status`.
- `ppm_rate_config` (TASK-1189) con seed placeholder 0,25%.
- Columnas `expenses.is_annulled`, `expenses.nubox_document_status`, `expenses.sii_document_status` (la fuente trae `'Anulada'`).
- El materializador de **income** ya filtra `COALESCE(i.is_annulled,false)=false` (patrón a replicar en expenses).

### Gap

- `is_annulled` no se deriva de `nubox/sii_document_status='Anulada'` en el sync → boletas anuladas quedan como válidas.
- El materializador de retención no filtra anulados → boleta muerta suma.
- Tasa PPM en placeholder 0,25% (real 0,125%).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (bug fix de sync + guard de materializador + backfill idempotente + corrección de config; sin schema nuevo)
- Impacto principal: `sync` (+ `reader` materializador + `migration` backfill/config)
- Source of truth afectado: `greenhouse_finance.expenses.is_annulled` (alinear a `sii_document_status`), `ppm_rate_config.rate`
- Consumidores afectados: `retention_monthly_positions`, `ppm_monthly_positions`, card F29 (TASK-1197), endpoint F29 (TASK-1195)
- Runtime target: `app` + ops-worker (re-materialización)

### Contract surface

- Contrato existente a respetar: materializadores canónicos (no recomputar inline), patrón income `is_annulled` filter.
- Contrato nuevo: guard `is_annulled` en retención; mapeo annulled en sync; `ppm_rate_config` corregida.
- Backward compatibility: `compatible` (excluir anulados es corrección, no breaking; re-materialización determinista).
- Full API parity: materializadores/readers gobernados ya consumibles por Nexa por construcción.

### Data model and invariants

- Invariantes:
  - `sii_document_status='Anulada'` ⇒ `is_annulled=true` (acople autoritativo SII).
  - Todo materializador fiscal que lea documentos de fuente excluye anulados (`is_annulled=false`).
  - `ppm_rate_config` NUNCA hardcode en el materializador; la tasa vive en la SSOT.
- Idempotency/concurrency: backfill `UPDATE ... WHERE sii_document_status='Anulada' AND is_annulled=false` (idempotente); re-materialización ya tiene advisory lock por período.
- Audit/outbox/history: el backfill es corrección de datos auditada (documentar en migration + handoff); `retention_ledger_entries` se re-materializa (DELETE+INSERT del período, ya canónico).

### Migration, backfill and rollout

- Migration posture: `forward-fix` (backfill `is_annulled` + UPDATE `ppm_rate_config`; sin DDL nuevo). Marker `-- Up Migration`, DO-block de verificación, idempotente.
- Default state: corrección inmediata (no flag) — alinea a realidad legal del SII.
- Backfill plan: `UPDATE expenses SET is_annulled=true WHERE (sii_document_status='Anulada' OR nubox_document_status='Anulada') AND COALESCE(is_annulled,false)=false`. Dry-run (SELECT count) primero; alcance medido = 2 docs.
- Rollback path: revert PR (código) + migration down (restaura `is_annulled=false` para los docs tocados / restaura rate placeholder); re-materializar.
- External coordination: ninguna (los documentos ya están anulados en SII/Nubox; el contador ya confirmó la tasa PPM).

### Security and access

- Auth/access gate: la re-materialización corre por ops-worker/cron o endpoint admin existente; sin nueva capability.
- Sensitive data posture: `finance` — retención expone contraparte; mantener el contrato vigente (no nuevo PII).
- Error contract: `captureWithDomain(err,'finance',...)`.

### Runtime evidence

- Local checks: tests del materializador (excluye anulados), test del mapeo annulled del sync, SQL del backfill ejercitado contra PG real (gate TASK-893).
- DB/runtime checks: re-materializar mayo 2026 → retención 134.653, PPM 7.250; verificar `expenses.is_annulled=true` en folios 40 y 29.
- Integration checks: `staging:request /api/finance/f29/monthly-position?year=2026&month=5` → retención 134.653 + PPM 7.250.
- Reliability signals/logs: reusa `finance.{retention,ppm}.position_drift`; evaluar signal nuevo `finance.expenses.annulled_status_drift` (anulado en fuente con `is_annulled=false`) como detector anti-recurrencia.

### Acceptance criteria additions

- [ ] Mayo 2026 cuadra al peso con el F29 SII (retención 134.653, PPM 7.250, IVA ya cuadra).
- [ ] Sync mapea annulled → `is_annulled`; materializador excluye anulados (tests).
- [ ] Backfill idempotente aplicado; folios 40 y 29 con `is_annulled=true`.
- [ ] `ppm_rate_config` = 0,00125.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — PPM rate correction

- Migration forward-fix: `UPDATE greenhouse_finance.ppm_rate_config SET rate=0.00125, source='sii_f29_confirmed_2026' WHERE source='placeholder_pending_contador'` (idempotente + DO-block verificación). Re-materializar PPM períodos afectados. Test de la tasa resuelta.

### Slice 2 — Annulled exclusion (sync mapping + materializer guard + backfill)

- Sync `sync-nubox-to-postgres.ts` / `postgres-store-slice2.ts`: mapear `document_status='Anulada'` → `is_annulled=true` en el upsert de expense.
- Materializador `retention-ledger.ts`: agregar `AND COALESCE(e.is_annulled,false)=false` al scope BHE (defensa en profundidad).
- Migration backfill: `is_annulled=true` para docs anulados en fuente con flag inconsistente (dry-run → apply).
- Re-materializar retención de períodos afectados. Tests (mapeo annulled, guard, backfill idempotente).
- Crear `ISSUE-###` (incidente runtime) + cerrar con evidencia.

### Slice 3 — Verificación + signal anti-recurrencia + docs

- Verificar mayo 2026 cuadra vs SII. Evaluar signal `finance.expenses.annulled_status_drift`. Delta arch doc + closing.

## Out of Scope

- Flip de los flags `RETENTION_POSITION_ENABLED` / `PPM_POSITION_ENABLED` a oficial (decisión contable separada, post-validación).
- Cambios a la UI del card F29 (TASK-1197) — el card ya consume el contrato; solo cambian los números materializados.
- Cualquier otra línea del F29 fuera de retención/PPM (IVA ya cuadra).
- Re-modelar el dedup de boletas por monto (el caso real es anulación formal, no near-duplicate heurístico).

## Detailed Spec

Causa raíz (evidencia BD viva 2026-06-20):

```text
expenses folio 40 (Valentina): sii_document_status='Anulada', nubox_document_status='Anulada', is_annulled=false, withholding=107.970
expenses folio 42 (Valentina): sii_document_status='Válido',   is_annulled=false, withholding=107.965  ← la buena (SII)
SII mayo retención = Luis(26.688) + folio42(107.965) = 134.653  ✓
Nuestra retención = Luis + folio40 + folio42 = 242.623  ✗ (+107.970 por la anulada)
```

El income materializer ya filtra anulados; replicar el invariante en el lado expenses (sync + retención). El backfill alcance medido: 2 docs (folio 40 período 2026-05; folio 29 período 2025-09 sin withholding).

PPM: `ppm_rate_config` rate 0,0025 → 0,00125 (F29 línea 70: base 5.800.000 × 0,125% = 7.250).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (PPM) y Slice 2 (annulled) son independientes; pueden ir en cualquier orden. Slice 3 (verificación) va último.
- Dentro de Slice 2: sync mapping + materializer guard ANTES del backfill+re-materialización (sino el guard no protege en la re-materialización).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Backfill marca anulado un doc válido | finance | low | filtro estricto `sii_document_status='Anulada'`; dry-run SELECT primero; alcance medido=2 | revisión + migration down |
| Guard excluye un doc que no debía | finance | low | filtro `is_annulled=false` espeja el patrón income vigente; tests | `finance.retention.position_drift` |
| Re-materialización corrompe período bueno | finance | low | advisory lock + DELETE+INSERT canónico por período (TASK-1188) | `position_drift` |
| Tasa PPM cambia por año (no es fija) | finance | medium | `source` documenta origen; effective dating en `ppm_rate_config` si aplica | revisión contador |

### Feature flags / cutover

Sin flag nuevo. La corrección de datos + guard son inmediatos (alinean a realidad legal SII). Los flags existentes `RETENTION_POSITION_ENABLED`/`PPM_POSITION_ENABLED` siguen gobernando oficial vs shadow.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | migration down (rate→0,0025) + re-materializar PPM | <10 min | sí |
| Slice 2 | revert PR (sync+guard) + migration down (is_annulled→false en docs tocados) + re-materializar | <15 min | sí |
| Slice 3 | revert PR | <5 min | sí |

### Production verification sequence

1. Local: migration up + re-materializar + verificar mayo (retención 134.653, PPM 7.250) contra PG.
2. Staging: deploy + `staging:request /api/finance/f29/monthly-position?year=2026&month=5` → números cuadrados.
3. Prod: deploy + re-materializar períodos afectados + smoke endpoint.

### Out-of-band coordination required

No coordination beyond the already captured accountant/operator evidence: the affected documents are already annulled in SII/Nubox and the PPM rate was confirmed by the accountant. Shipping still requires the staging smoke above before production data apply.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Sync mapea `document_status='Anulada'` → `is_annulled=true` (test `isNuboxPurchaseAnnulled`, 4 casos).
- [x] Materializador de retención excluye `is_annulled=true` (test verifica el guard en el SQL).
- [x] Backfill idempotente aplicado: folios 40 y 29 quedan `is_annulled=true` (verificado en PG).
- [x] `ppm_rate_config.rate = 0.00125` (source `sii_f29_confirmed_2026`, ya no placeholder).
- [x] Re-materializado: retención mayo 2026 = 134.653; PPM mayo 2026 = 7.250 (verificado en PG).
- [x] F29 mayo 2026 cuadra al peso con el SII (retención 134.653 + PPM 7.250 + IVA 1.080.405 = total 1.222.308). *Verificación HTTP staging pendiente de deploy (local-first).*
- [x] ISSUE-105 creado en `resolved/` con evidencia de no-regresión.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm migrate:up` + verificación SQL contra PG real (gate TASK-893)
- `pnpm staging:request /api/finance/f29/monthly-position?year=2026&month=5`

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] archivo en la carpeta correcta
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta (annulled exclusion invariant + PPM rate confirmada)
- [x] ISSUE-105 creado en `resolved/` con verificación
- [x] chequeo de impacto cruzado: la corrección de números impacta TASK-1197 (card F29) y los flags de TASK-1188/1189; la oficialización (flip) la maneja TASK-1203 (downstream)

## Follow-ups

- Evaluar flip de `RETENTION_POSITION_ENABLED`/`PPM_POSITION_ENABLED` a oficial post-validación de más períodos.
- Card F29 (TASK-1197): default al período declarado (mes cerrado anterior), no al mes en curso — evita comparar contra período incompleto.
- Effective dating de la tasa PPM si el SII la recalcula anualmente.

## Open Questions

- ¿La tasa PPM 0,125% aplica a todos los períodos o tiene vigencia (SII la recalcula en abril)? Resolver con contador; por ahora se aplica como rate vigente.
