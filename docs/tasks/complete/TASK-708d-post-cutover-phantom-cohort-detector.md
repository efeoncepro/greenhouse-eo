# TASK-708d — Post-Cutover Phantom Cohort Detector

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-708d-post-cutover-phantom-cohort-detector`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Agregar un detector operativo para phantoms post-cutover que fueron auto-adoptados por reglas D5 sin evidencia de cartola bancaria. El caso guía es `PAY-NUBOX-inc-3968936`: una fila que parece resuelta por regla de cuenta, pero no tiene respaldo de `bank_statement_rows`.

La task no reemplaza `TASK-708c`; esta es la guardia de calidad de evidencia post-cutover, mientras `TASK-708c` queda reservado para simplificar el CHECK tras 30+ días de estabilidad.

## Why This Task Exists

`TASK-708` y `TASK-708b` cerraron la contaminación histórica conocida, pero dejaron una lección importante: una regla D5 de cuenta puede resolver el instrumento correcto sin probar que hubo cash real. Esa resolución es útil para routing, pero no debe equivaler automáticamente a evidencia bancaria cuando el origen fue un phantom.

Si no existe un detector explícito, un phantom post-cutover puede quedar "limpio" en invariantes estructurales (`payment_account_id` no nulo, leg con instrumento) y aun así contaminar saldos, conciliación o cost attribution.

## Goal

- Detectar payments post-cutover auto-adoptados por D5 sin evidencia de cartola o match equivalente.
- Separar claramente "cuenta inferida" de "cash probado".
- Exponer la cohorte D como señal de ledger-health / runbook operativo accionable.
- Evitar falsos positivos cuando sí existe `bank_statement_row`, reconciliation row, settlement evidence o source canónica confiable.

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
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `bank_statement_rows` y reconciliation evidence son evidencia de cash; una regla D5 por si sola no lo es.
- No borrar pagos ni movimientos historicos. Toda correccion debe usar supersede/dismiss/adjudication auditada.
- La deteccion debe ser idempotente y segura para correr muchas veces.
- Si se agrega UI o action admin, debe explicitar ambos planos de acceso: `views` / `authorizedViews` y `entitlements` / capabilities.

## Normative Docs

- `docs/tasks/complete/TASK-708-nubox-documents-only-and-reconciliation-sot-cutover.md`
- `docs/tasks/complete/TASK-708b-nubox-phantom-cohort-remediation.md`
- `docs/tasks/to-do/TASK-708c-promote-payment-account-id-not-null.md`
- `docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md`
- `docs/operations/runbooks/_template-external-signal-remediation.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Dependencies & Impact

### Depends on

- `src/lib/finance/external-cash-signals/historical-remediation.ts`
- `src/lib/finance/external-cash-signals/rule-evaluator.ts`
- `src/lib/finance/ledger-health.ts`
- `greenhouse_finance.external_cash_signals`
- `greenhouse_finance.account_signal_matching_rules`
- `greenhouse_finance.bank_statement_rows`
- `greenhouse_finance.income_payments`
- `greenhouse_finance.expense_payments`
- `greenhouse_finance.settlement_legs`

### Blocks / Impacts

- `TASK-708c` evidence window: no promover CHECK universal si aparece cohorte D activa.
- Reliability / ledger-health de Finance.
- Runbooks futuros de remediacion por señales externas.
- Conciliacion bancaria post-cutover.

### Files owned

- `src/lib/finance/ledger-health.ts`
- `src/lib/finance/external-cash-signals/*`
- `src/lib/reliability/finance/*` si la señal sube al dashboard
- `scripts/finance/*` para detector/backfill operativo
- `docs/operations/runbooks/*`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Current Repo State

### Already exists

- `TASK-708` separo Nubox documents-only de cash real y creo `external_cash_signals`.
- `TASK-708b` ejecuto remediacion historica con outcomes `repaired_with_account`, `superseded_replaced` y `dismissed_no_cash`.
- `ledger-health.ts` ya tiene metricas TASK-708 para phantoms, settlement legs sin instrumento y reconciliaciones contra targets sin cuenta.
- El runbook `TASK-708b` ya documenta que antes de pedir evidencia externa hay que buscar primero en `bank_statement_rows`.

### Gap

- No existe una cohorte D que detecte payments post-cutover con cuenta auto-adoptada por D5 pero sin evidencia bancaria.
- Un payment puede quedar estructuralmente valido sin estar probado por cartola.
- El caso `PAY-NUBOX-inc-3968936` necesita una regla generalizable, no una correccion ad hoc.

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

### Slice 1 — Cohort D detector

- Crear un detector idempotente para payments post-cutover que:
  - tienen `payment_account_id` o `instrument_id` por auto-adopcion D5;
  - no tienen `bank_statement_rows` reconciliada/matcheada;
  - no tienen settlement evidence equivalente aceptada;
  - no estan `superseded_at` ni dismiss/adjudicated.
- Cubrir income y expense si aplica; si Discovery demuestra que el riesgo real es solo income, documentar la razon.

### Slice 2 — Evidence model and false-positive guardrails

- Definir helper reusable `hasCashEvidence(payment)` o equivalente.
- Considerar como evidencia valida al menos:
  - `bank_statement_rows.matched_payment_id` / matched settlement leg;
  - `settlement_legs.reconciliation_row_id`;
  - source canónica no-Nubox que ya representa cash real.
- Excluir casos superseded y dismissal chains.

### Slice 3 — Ledger-health / reliability signal

- Agregar metrica `postCutoverPhantomsWithoutBankEvidence` o nombre equivalente en `src/lib/finance/ledger-health.ts`.
- Exponer severity y sample rows suficientes para operar sin SQL manual.
- Documentar el umbral esperado: `0` en steady state.

### Slice 4 — Remediation runbook

- Extender o crear runbook para Cohorte D con pasos:
  - dry-run;
  - clasificacion;
  - adjudicacion manual si hay ambigüedad;
  - dismiss/supersede/reconcile segun evidencia;
  - rematerializacion de saldos si cambia cash ledger.
- Incluir el caso `PAY-NUBOX-inc-3968936` como fixture o ejemplo operativo.

### Slice 5 — Tests

- Tests unitarios del detector con:
  - auto-adopt D5 sin cartola => flagged;
  - D5 con `bank_statement_rows` => no flagged;
  - superseded/dismissed => no flagged;
  - source cash-real no Nubox => no flagged.

## Out of Scope

- Promover los CHECK a universales (`TASK-708c`).
- Redisenar conciliacion UI.
- Borrar filas historicas.
- Cambiar D5 matching rules salvo que Discovery encuentre un bug directo.
- Resolver todos los phantoms manualmente dentro de esta task si el detector descubre una cohorte grande; en ese caso crear runbook/apply separado.

## Detailed Spec

La regla conceptual es:

```sql
-- Pseudocodigo: el agente debe adaptarlo al schema real.
SELECT payment_id
FROM candidate_cash_payments
WHERE created_at >= <task_708_cutover>
  AND source_system IN ('nubox', 'nubox_bank_sync', ...)
  AND adopted_by_rule_kind = 'D5'
  AND NOT EXISTS (<bank_statement_evidence>)
  AND NOT EXISTS (<settlement_reconciliation_evidence>)
  AND superseded_at IS NULL;
```

El resultado debe ser una señal operativa, no una mutacion automatica. La remediacion queda por outcome auditado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El detector flaggea un payment tipo `PAY-NUBOX-inc-3968936` cuando no existe evidencia de cartola.
- [ ] El detector no flaggea payments con `bank_statement_rows` o settlement reconciliation evidence valida.
- [ ] La metrica queda visible en ledger-health / reliability con steady state esperado `0`.
- [ ] Existe runbook para clasificar y remediar Cohorte D sin `DELETE`.
- [ ] Tests cubren flagged, no-flagged por evidencia, y no-flagged por supersede/dismiss.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/finance`
- Dry-run del detector contra Postgres dev.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-708c` fue revisada para confirmar si sigue bloqueada o desbloqueada por la señal Cohorte D

## Follow-ups

- UI admin para adjudicar Cohorte D si el detector descubre volumen recurrente.

## Open Questions

- Confirmar durante Discovery donde queda trazada hoy la auto-adopcion D5 por payment: `external_cash_signals`, metadata del payment, settlement leg u outbox event.
