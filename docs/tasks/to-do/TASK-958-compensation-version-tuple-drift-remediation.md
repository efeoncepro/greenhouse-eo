# TASK-958 — Compensation Version Tuple Drift Remediation (payroll-safe) + CHECK validation

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `payroll | hr`
- Blocked by: `none` (follow-up de TASK-957, ya complete)
- Branch: `task/TASK-958-compensation-version-tuple-drift-remediation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`members.contract_type` y `compensation_versions.contract_type` pueden divergir. Caso real: Melkin Hernández es contractor internacional de Nicaragua vía Deel (member row correcto `contractor/international/deel`) pero su comp version vigente tiene `(indefinido, international)` — tupla inválida grandfathered. Remediar el dato de forma **payroll-neutral verificada** + **validar** el CHECK `NOT VALID` que dejó pasar la fila → cierra el drift class para todos + señal del gap `deel_contract_id` NULL.

## Why This Task Exists

Surfaceado durante TASK-957 (audit de contractors internacionales). El CHECK `compensation_versions_contract_pay_regime_check` que valida `(contract_type, pay_regime)` existe pero está **`NOT VALID`** (`convalidated=false`) — nunca se validó contra filas existentes, así que la comp version `(indefinido, international)` de Melkin quedó grandfathered. Hoy se le paga bien (va por `payroll_via='deel'` → passthrough Deel, que ignora `contract_type` para deducciones), pero es una **mina latente**: si `payroll_via` cambiara, el motor lo calcularía como empleado dependiente chileno sobre un sueldo internacional. El CHECK de `members` (3-way) sí está validado → member-level drift = 0; el gap es solo en `compensation_versions` + el `deel_contract_id` NULL.

## Goal

- Remediar la(s) comp version(s) con tupla inválida vigente para que coincidan con la clasificación canónica del member, **garantizando output de payroll idéntico** (verificado before/after, no solo asumido).
- **Validar** el CHECK `compensation_versions_contract_pay_regime_check` (`NOT VALID → VALID`) → prevención escalable: ninguna comp version puede volver a tener una tupla inconsistente (existentes + nuevas).
- Señal de observabilidad para el gap operacional `deel_contract_id` NULL en contractors/eor vía Deel.
- Cero cambio de comportamiento de payroll; finiquito + offboarding intactos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migrations, CHECK NOT VALID + VALIDATE)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- **Garantía dura del operador**: "si la toca, no se rompe payroll". La remediación DEBE ser payroll-neutral **verificada empíricamente** (computar el payroll entry del member antes y después, assertar idéntico campo a campo; solo aplicar si idénticos).
- **NUNCA** mutar `compensation_versions.contract_type`/`pay_regime` por SQL ad-hoc. Pasa por el primitivo documentado/gateado/reversible (espejo del patrón TASK-957 `scripts/payroll/close-contractor-orphan-comp-version-task957.ts`).
- **NUNCA** tocar `final_settlements`/`final_settlement_documents` ni el status/lanes del offboarding (hard rule TASK-957).
- **CHECK NOT VALID + VALIDATE atomic** (patrón TASK-766/774/768): validar SOLO después de remediar todos los violadores; migración con DO block que verifique 0 violadores pre-VALIDATE.
- `captureWithDomain(err, 'payroll', ...)` — nunca `Sentry.captureException` directo.
- SQL signal reader: validar contra PG real (proxy) antes de mergear; sin `EXTRACT(EPOCH FROM (date - date))` (gate TASK-893).

## Normative Docs

- `docs/tasks/complete/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md` (origen del hallazgo + patrón de script de remediación).
- `CLAUDE.md` §"Contractor ↔ Legacy Payroll double-rail exclusion + current work classification (TASK-957)".

## Dependencies & Impact

### Depends on

- CHECK `compensation_versions_contract_pay_regime_check` (existe, `NOT VALID`).
- CHECK `members_contract_payroll_tuple_check` (existe, validado).
- Señal `payroll.contract_taxonomy.invalid_tuple_drift` (`src/lib/reliability/queries/payroll-contract-taxonomy-invalid-tuple-drift.ts`) — detección existente del drift.
- Motor de cálculo payroll (`src/lib/payroll/calculate-payroll.ts`) — para la verificación before/after.
- Patrón script: `scripts/payroll/close-contractor-orphan-comp-version-task957.ts`.

### Blocks / Impacts

- Lleva `payroll.contract_taxonomy.invalid_tuple_drift` (comp-version dimension) a steady=0.
- El VALIDATE del CHECK afecta a TODA escritura futura de `compensation_versions` (rechaza tuplas inconsistentes) — impacto deseado.

### Files owned

- `scripts/payroll/reconcile-compensation-version-tuple.ts` (nuevo) `[verificar nombre]`
- `migrations/` (nueva: VALIDATE constraint + DO block 0-violadores)
- `src/lib/reliability/queries/payroll-deel-member-without-contract-id.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up señal)

## Current Repo State

### Already exists

- CHECK `compensation_versions_contract_pay_regime_check` (`NOT VALID`) + CHECK `members_contract_payroll_tuple_check` (validado).
- Señal `payroll.contract_taxonomy.invalid_tuple_drift` (detección, ya cuenta a Melkin).
- Script patrón `scripts/payroll/close-contractor-orphan-comp-version-task957.ts` (dry-run default, idempotente, before/after, resuelve fecha de fuente autoritativa).
- Motor `calculate-payroll.ts` (para before/after): contract_type entra al path Deel solo vía `remoteAllowanceEnabled`; `CONTRACT_COMPENSATION_POLICIES` tiene `indefinido={true}` y `contractor={true}` → `indefinido→contractor` payroll-neutral para Melkin.

### Gap

- La fila vigente de Melkin con tupla inválida (grandfathered por el CHECK NOT VALID).
- El CHECK de comp_versions no está validado → no enforce sobre filas existentes.
- No hay señal para "Deel member sin deel_contract_id".

## Scope

### Slice 1 — Primitivo de reconciliación payroll-safe + remediar Melkin

- Script `scripts/payroll/reconcile-compensation-version-tuple.ts` (espejo del de TASK-957): `--member-id=<id>` (req), `--apply` (default dry-run).
- Resuelve la clasificación canónica del member (cuando `members` tuple es válido); identifica la(s) comp version(s) vigente(s) con tupla inválida; computa el target `(contract_type, pay_regime)` que matchea el member.
- **Verificación payroll-neutral (load-bearing)**: computa el payroll entry del member con la tupla ACTUAL y con la TARGET (vía el motor canónico `calculate-payroll`), asserta output **idéntico campo a campo** (gross, net, todas las deducciones). Si difieren → **aborta + reporta, NO muta**. Si idénticos → procede.
- `--apply`: UPDATE de la(s) comp version(s) en `withGreenhousePostgresTransaction`, before/after logging, idempotente. Guard: solo si member tuple válido + cv es el drift.
- Remediar Melkin: comp version v2 `indefinido → contractor` (`pay_regime international` se queda) — confirmado payroll-neutral (passthrough Deel).

### Slice 2 — VALIDATE del CHECK (prevención escalable)

- Migración `pnpm migrate:create` que ejecuta `ALTER TABLE greenhouse_payroll.compensation_versions VALIDATE CONSTRAINT compensation_versions_contract_pay_regime_check`.
- DO block anti pre-up-marker que verifica **0 violadores** ANTES del VALIDATE (RAISE EXCEPTION si count>0) → la migración falla limpio si quedó algún drift sin remediar (fuerza el orden Slice 1 → Slice 2).
- Down migration: documentar que VALIDATE no es reversible a NOT VALID de forma trivial (se puede `DROP` + re-`ADD ... NOT VALID` si se requiere revertir).

### Slice 3 — Señal Deel-sin-contract-id

- `src/lib/reliability/queries/payroll-deel-member-without-contract-id.ts`: `SELECT COUNT(*) FROM members WHERE active AND payroll_via='deel' AND (deel_contract_id IS NULL OR deel_contract_id='')`. kind=`data_quality`, moduleKey=`payroll`, severity warning si count>0, steady=0. Wire en `get-reliability-overview.ts`.
- El backfill del valor real del `deel_contract_id` es **operacional** (Deel dashboard/API) — fuera de scope de código; la señal lo hace visible hasta que el operador lo complete.

## Out of Scope

- Backfill del valor real de `deel_contract_id` (operacional, requiere acceso a Deel).
- CHECK `payroll_via='deel' ⇒ deel_contract_id NOT NULL` (futuro, tras backfill — se puede agregar como NOT VALID + validar).
- Mutación de `member.contract_type` (ya es correcto para Melkin — el drift es solo en la comp version).
- La consistencia cross-table `cv.contract_type ↔ member.payroll_via` como CHECK (no expresable single-table; la cubre la señal `invalid_tuple_drift` existente).
- Finiquito + offboarding (hard rule).

## Detailed Spec

**Por qué `indefinido → contractor` es payroll-neutral para Melkin** (verificado en código, a re-verificar empíricamente en Slice 1): Melkin va por `payroll_via='deel'` → `deelGrossTotal = adjustedBaseSalary + adjustedRemoteAllowance + adjustedFixedBonusAmount + bonusOtdAmount + bonusRpaAmount`. `contract_type` solo entra vía `remoteAllowanceEnabled = allowsRemoteAllowance(contract_type)`, y `CONTRACT_COMPENSATION_POLICIES` da `indefinido={true}` y `contractor={true}` → `adjustedRemoteAllowance` idéntico → `deelGrossTotal` idéntico. Las otras puertas (`usesDiscretionaryBonuses`, `skipsAttendanceAdjustments`) dependen de `honorarios`/`deel`, sin cambio. La rama Deel pone deducciones Chile en `null` igual. La aserción before/after del primitivo lo prueba empíricamente — si algún caso futuro NO fuera neutral (e.g. un member que NO va por Deel), el primitivo aborta.

**Generalización**: el primitivo no es Melkin-only — reconcilia cualquier comp version vigente cuya tupla no matchee la clasificación canónica del member, con la garantía payroll-neutral como gate universal. Si un caso requiere cambio NO neutral (e.g. una transición real empleado→contractor con compensación distinta), el primitivo aborta y escala a decisión humana (no auto-muta algo que cambie el pago).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (remediar Melkin) DEBE ir antes que Slice 2 (VALIDATE).** El VALIDATE falla si queda un violador → el DO block lo enforce. No se puede validar el CHECK con la fila de Melkin aún inválida.
- Slice 3 (señal) es independiente — puede ir en cualquier orden.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El cambio de tupla altera el pago de Melkin | payroll | low | aserción before/after payroll idéntico (aborta si difiere); proven payroll-neutral (deel passthrough, ambos contract types → remote allowance true) | `pnpm vitest run src/lib/payroll` + before/after del script |
| VALIDATE falla por otro violador no remediado | migration/payroll | low | DO block verifica 0 violadores pre-VALIDATE → falla limpio, no aplica nada | migración aborta con RAISE EXCEPTION |
| El primitivo muta algo que NO es payroll-neutral (caso futuro non-Deel) | payroll | low | guard payroll-neutral universal: aborta + reporta si output difiere | aserción del script |
| Regresión en finiquito/offboarding | payroll/hr | low | hard rule read-only + gate `pnpm vitest run src/lib/payroll` | test suite rojo |

### Feature flags / cutover

- Sin flag — la remediación es un script one-shot operador-gated (dry-run default) + una migración VALIDATE. El VALIDATE es additive (enforce una regla ya existente como NOT VALID). Revert: `DROP` + re-`ADD ... NOT VALID` si fuera necesario (documentado en down migration).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir la comp version a la tupla previa (before/after logueado) vía el mismo script con target inverso, o UPDATE manual auditado | <10 min | sí (before/after registrado) |
| Slice 2 | `ALTER TABLE ... DROP CONSTRAINT` + re-`ADD ... NOT VALID` | <5 min | sí |
| Slice 3 | revert PR (señal read-only) | <5 min | sí |

### Production verification sequence

1. Slice 1 dry-run en staging/dev → verificar que reporta Melkin + la aserción payroll-neutral pasa (output idéntico).
2. Slice 1 `--apply` → comp version v2 = contractor; re-verificar `invalid_tuple_drift` comp-version count = 0 + `pnpm vitest run src/lib/payroll` verde.
3. `pnpm migrate:up` (Slice 2) → DO block pasa (0 violadores) + VALIDATE OK; verificar `convalidated=true`.
4. Slice 3 señal live contra PG real → count = 1 (Melkin sin deel_contract_id) hasta backfill operacional.
5. Repetir en producción con verificación del signal post-deploy.

### Out-of-band coordination required

- **Deel contract ID de Melkin**: el valor real lo provee el operador desde Deel (dashboard/API). La señal lo hace visible; el backfill es manual/operacional.

## Acceptance Criteria

- [ ] El script `reconcile-compensation-version-tuple.ts` en dry-run reporta la(s) comp version(s) con tupla inválida + el target + el resultado de la aserción payroll-neutral, sin mutar.
- [ ] El script con `--apply` SOLO muta si el payroll entry before/after es idéntico campo a campo; si difiere, aborta con mensaje claro y no muta.
- [ ] Tras `--apply` para Melkin: su comp version v2 = `(contractor, international)`; `payroll.contract_taxonomy.invalid_tuple_drift` (comp-version dimension) = 0.
- [ ] Su payroll proyectado/calculado es idéntico antes y después (gross, net, deducciones).
- [ ] La migración Slice 2 valida el CHECK (`convalidated=true`) y su DO block aborta si quedan violadores.
- [ ] Tras el VALIDATE, un INSERT/UPDATE de comp version con tupla inconsistente (e.g. `indefinido, international`) es rechazado por el CHECK.
- [ ] Señal `payroll.deel_member_without_contract_id` wired + steady=0 esperado post-backfill; detecta a Melkin (count=1) hasta entonces.
- [ ] Gate de no-regresión verde: `pnpm vitest run src/lib/payroll` (incluye finiquito).
- [ ] Finiquito + offboarding intactos.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm vitest run src/lib/payroll` (gate de no-regresión)
- `pnpm vitest run src/lib/reliability` (señal)
- `pnpm migrate:status` + verificar `convalidated=true` post-VALIDATE
- Live-verify SQL de la señal contra PG real (proxy)
- `pnpm build` + `pnpm test` (full) al cierre

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-957 follow-up resuelto)
- [ ] CLAUDE.md: nota si el patrón de reconciliación de tupla se vuelve canónico reusable
- [ ] señal documentada en RELIABILITY_CONTROL_PLANE si aplica

## Follow-ups

- CHECK `payroll_via='deel' ⇒ deel_contract_id NOT NULL` (NOT VALID → validar tras backfill operacional).
- Evaluar promover el primitivo `reconcileCompensationVersionTuple` a helper canónico reusable si emerge una segunda cohorte.

## Open Questions

1. ¿El primitivo debe ser un script one-shot (como el de TASK-957) o un helper canónico + endpoint admin? Recomendación: script one-shot para V1 (cohorte = 1); promover a helper si emerge una segunda cohorte (ver Follow-ups).
2. ¿Agregar el CHECK `deel_contract_id NOT NULL` ahora (NOT VALID) o esperar al backfill? Recomendación: esperar — sin el valor real, un CHECK NOT VALID no aporta hasta poder validarlo; la señal cubre la detección mientras tanto.

## Delta 2026-05-31 — Deel contract ID de Melkin provisto + verificación payroll-neutral

- **Valor del gap operacional resuelto**: el operador proveyó el Deel contract ID de **Melkin Hernández = `m4ye2qg`**. Al ejecutar Slice 1, backfillear `members.deel_contract_id = 'm4ye2qg'` para `member_id='melkin-hernandez'` (hoy NULL).
- **Verificado payroll-neutral** (`grep` en `src/lib/payroll/`): `deel_contract_id` es **puramente informativo** — fluye al payroll entry como label de display (`calculate-payroll.ts:395`, receibo/PDF/Excel: `Contrato Deel: <id>`) y NO entra en ningún cálculo ni gate de readiness. Setearlo de NULL → `m4ye2qg` solo agrega la referencia visible en su recibo; ningún monto cambia. Igualmente correr el gate `pnpm vitest run src/lib/payroll` antes/después.
- **Pendiente de acceso a PG**: al momento de capturar el valor, la sesión local GCP ADC estaba expirada (`invalid_rapt` / reauth). Aplicar requiere `gcloud auth login` + `gcloud auth application-default login` previo. El valor queda registrado aquí; se aplica al ejecutar Slice 1 (junto con el backfill) o ad-hoc con PG re-autenticado.
