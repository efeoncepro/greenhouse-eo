# TASK-1203 — F29 Officialization PPM Retention Signoff

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
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Finance P1.5`
- Domain: `finance|fiscal|tax|close`
- Blocked by: `TASK-1195, TASK-1197`
- Branch: `task/TASK-1203-f29-officialization-ppm-retention-signoff`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el F29 mensual consolidado desde "shadow/official mix" a salida operativa con evidencia contable: validar tasa PPM real, validar retenciones contra F29/contador, actualizar flags/config y documentar que lineas son oficiales. Sin esto, F29 funciona como lectura tecnica pero no como filing-ready.

## Why This Task Exists

`TASK-1195` y `TASK-1197` ya verificaron endpoint/card F29 en staging. IVA y retencion aparecen oficiales en staging, pero PPM sigue `En validacion` porque `ppm_rate_config` usa tasa placeholder `placeholder_pending_contador`. El audit exige no declarar F29 oficial hasta validar PPM/tasas y evidencia contable.

## Goal

- Reemplazar tasa placeholder PPM con tasa real validada por contador/SII para los periodos aplicables.
- Validar retenciones mensualizadas contra evidencia contable/F29.
- Definir y ejecutar el flip de `PPM_POSITION_ENABLED` y confirmar postura de `RETENTION_POSITION_ENABLED`.
- Dejar evidencia de staging/runtime y actualizar docs antes de desbloquear F22.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`
- `docs/tasks/complete/TASK-1188-retenciones-monthly-position.md`
- `docs/tasks/complete/TASK-1189-ppm-monthly-position.md`
- `docs/tasks/complete/TASK-1195-f29-consolidated-monthly-position.md`
- `docs/documentation/finance/libro-iva-posicion-mensual.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No declarar F29 filing-ready con tasa PPM placeholder.
- No mezclar validacion contable con opinion tributaria automatica; registrar evidencia y sign-off.
- Flags/env/config deben cambiarse solo con smoke staging y plan de rollback.
- F22 (`TASK-1196`) debe consumir fundamentos mensuales validados, no shadow.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1188` complete: retention monthly position.
- `TASK-1189` complete: PPM monthly position with placeholder config.
- `TASK-1195` complete: F29 consolidated endpoint.
- `TASK-1197` complete: UI card evidence in staging.
- Existing files:
  - `src/lib/finance/ppm-ledger.ts`
  - `src/lib/finance/ppm/flags.ts`
  - `src/lib/finance/retention-ledger.ts`
  - `src/lib/finance/retention/flags.ts`
  - `src/lib/finance/f29-consolidated.ts`
  - `src/app/api/finance/f29/monthly-position/route.ts`

### Blocks / Impacts

- Blocks official filing confidence for F29.
- Blocks safe execution of `TASK-1196` F22 annual position.
- Impacts Finance dashboard copy/state for official vs validation.

### Files owned

- migrations/config seed for `greenhouse_finance.ppm_rate_config`
- `src/lib/finance/ppm-ledger.ts`
- `src/lib/finance/retention-ledger.ts`
- `src/lib/finance/f29-consolidated.ts`
- `docs/documentation/finance/libro-iva-posicion-mensual.md`
- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`

## Current Repo State

### Already exists

- VAT/retention/PPM readers and F29 consolidated endpoint exist.
- F29 card is verified in staging.
- PPM config exists but includes placeholder rate.

### Gap

- PPM rate has not been validated with accountant/SII evidence.
- Retention official posture needs documented sign-off for filing use.
- F29 is operationally readable but not declared filing-ready.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_finance.ppm_rate_config`, flags for PPM/retention/F29 line official status
- Consumidores afectados: F29 endpoint/card, F22 annual position, fiscal docs, Finance ops
- Runtime target: `staging`, `production`

### Contract surface

- Contrato existente a respetar: PPM/retention/F29 readers and enabledByLine contract.
- Contrato nuevo o modificado: validated PPM rate config and officialization evidence.
- Backward compatibility: `gated`; line remains validation/shadow until flag/config is valid.
- Full API parity: F29 official status is represented in backend contract, not just UI copy.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_finance.ppm_rate_config`, PPM/retention monthly positions.
- Invariantes que no se pueden romper:
  - Placeholder PPM cannot be official.
  - `enabledByLine` accurately reflects filing readiness.
  - Historical periods keep rate provenance.
- Tenant/space boundary: legal entity/operating entity scope, never `space_id`.
- Idempotency/concurrency: config migration/update must be idempotent per entity/period.
- Audit/outbox/history: rate change must include source/provenance/sign-off in config or docs.

### Migration, backfill and rollout

- Migration posture: `seed|backfill|config update`.
- Default state: PPM remains validation until evidence exists.
- Backfill plan: update rate config for relevant periods, rematerialize PPM/F29 as needed.
- Rollback path: restore previous rate config and set flag OFF/redeploy.
- External coordination: accountant sign-off required.

### Security and access

- Auth/access gate: internal finance/fiscal operator only for config mutation.
- Sensitive data posture: fiscal/tax figures; no secrets.
- Error contract: no raw SQL or tax advice phrasing in API errors.
- Abuse/rate-limit posture: config changes are migration/runbook only, not public API.

### Runtime evidence

- Local checks: tests for enabledByLine and rate provenance.
- DB/runtime checks: PPM monthly position before/after and F29 consolidated output.
- Integration checks: staging smoke `/api/finance/f29/monthly-position`.
- Reliability signals/logs: `finance.ppm.position_drift`, `finance.retention.position_drift`, VAT drift signals.
- Production verification sequence: staging sign-off -> config apply -> flag flip -> smoke -> production repeat.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Official/shadow status lives in backend contract.
- [ ] Config/rate changes are governed and evidenced.
- [ ] UI/Nexa/F22 consume the same F29/Fiscal readers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Evidence packet

- Collect current VAT/retention/PPM/F29 output for target periods.
- Document accountant/SII evidence required for PPM and retention official status.

### Slice 2 — PPM rate config update

- Replace placeholder PPM rate(s) with validated config and provenance.
- Rematerialize PPM positions as needed.

### Slice 3 — Flag and official status cutover

- Flip `PPM_POSITION_ENABLED` only after staging evidence.
- Confirm/adjust `RETENTION_POSITION_ENABLED` posture and docs.

### Slice 4 — F29/F22 handoff

- Smoke F29 endpoint/card.
- Update docs/audit and unblock `TASK-1196` if monthly foundations are official.

## Out of Scope

- No F22 implementation; that remains `TASK-1196`.
- No legal/tax advice generated by the app.
- No new fiscal UI.

## Detailed Spec

Treat PPM rate provenance as load-bearing data. The task can close only if the rate source and sign-off are documented, or if it explicitly keeps PPM shadow and records the blocker.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- No flag flip before evidence packet is reviewed.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Placeholder PPM becomes official | fiscal | medium | sign-off gate and config provenance | F29 enabledByLine mismatch |
| Wrong rate applied historically | fiscal/data | medium | period-scoped config and before/after smoke | `finance.ppm.position_drift` |
| F22 uses shadow data | annual tax | medium | keep TASK-1196 blocked until officialization | F22 preflight blocker |

### Feature flags / cutover

- `PPM_POSITION_ENABLED` stays OFF until sign-off.
- `RETENTION_POSITION_ENABLED` must match documented sign-off.
- Revert by setting flags OFF and redeploying.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Evidence-only; rollback not required beyond reverting the evidence packet | inmediato | si |
| Slice 2 | Reverse config migration/update | <30 min | si |
| Slice 3 | Flag OFF + redeploy | <10 min | si |
| Slice 4 | Revert docs/handoff | <10 min | si |

### Production verification sequence

1. Apply config in staging.
2. Smoke `/api/finance/ppm/monthly-position` and `/api/finance/f29/monthly-position`.
3. Flip flag in staging and redeploy.
4. Repeat in production after accountant sign-off.

### Out-of-band coordination required

Accountant/finance sign-off for PPM rate and retention filing use.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] PPM placeholder rate is replaced or remains explicitly blocked with evidence.
- [ ] Retention official status is documented with accountant/finance sign-off.
- [ ] `enabledByLine` accurately reflects official vs validation status.
- [ ] F29 endpoint is smoked in staging after config/flag changes.
- [ ] `TASK-1196` blocker status is updated based on monthly officialization.

## Verification

- `pnpm exec vitest run src/lib/finance/ppm-ledger.test.ts src/lib/finance/retention-ledger.test.ts src/lib/finance/f29-consolidated.test.ts`
- `pnpm task:lint --task TASK-1203`
- `pnpm ops:lint --changed`
- Staging smoke `/api/finance/f29/monthly-position`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md` updated with officialization status.

## Follow-ups

- Execute `TASK-1196` F22 once monthly foundations are official or explicitly documented as provisional.

## Open Questions

- What is the accountant-approved PPM rate and effective period for Efeonce?
