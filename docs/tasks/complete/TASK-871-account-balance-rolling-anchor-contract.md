# TASK-871 — Account Balance Rolling Anchor Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Implementación shipped 2026-05-13 directo en develop (commits a918ecd4 → 23ba4c2a → 8524d745 → 689d35cf → ec16aca9). Recovery 3 cuentas + release develop→main pendientes de autorización operador. ISSUE-069 actualizado: fix parcial; TASK-871 cierra contrato completo.`
- Rank: `TBD`
- Domain: `finance|ops|data|reliability`
- Blocked by: `none`
- Branch: `develop` (pattern TASK-822..827)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Pre-Execution OQ Resolution (2026-05-13)

**Open Question original**:
> Confirmar durante Discovery si la ventana rolling de negocio debe ser "ultimos 7 dias calendario incluyendo hoy" o "7 dias previos mas hoy".

**Resolución canonical (lens 4-pilar)**: **Interpretación B — `targetStartDate = today - lookbackDays`**.

Para `today=2026-05-13` con `lookbackDays=7`:
- `targetStartDate = 2026-05-06` (today - 7)
- `seedDate = 2026-05-05` (targetStartDate - 1, ancla muda)
- `materializeStartDate = 2026-05-06` (primer día observed; SE materializa, NO ancla muda)
- `materializeEndDate = 2026-05-13` (today inclusive)
- Total días materializados: 8 (lookbackDays + 1 inclusivo)
- Total días observados: 8 (window)

**Rationale 4-pilar**:

- **Safety**: Interpretación B da 1 día más de buffer para movements registered retroactivamente. Caso real del incidente 2026-05-13: drift en `2026-05-05` con movements registered ese día. Con interpretación A (7 días observed estrictos = 2026-05-07..2026-05-13), el día 2026-05-05 quedaría fuera del observed window completamente → drift persistiría indefinidamente. Con interpretación B (8 días observed = 2026-05-06..2026-05-13), 2026-05-05 = seed con integrity check (Slice 2 invariant) → si hay movements canonicos en seed day, expandir backward hasta seed limpio.
- **Robustness**: Matches el comportamiento POST-ISSUE-069 (`seedDate = today - (lookbackDays + 1)` ya implementado). Cambio mínimo desde el contracto actual; menos risk de breakage cross-system.
- **Resilience**: Reliability signal `finance.account_balances.fx_drift` observa los últimos 90 días sin respeto al rolling window. Cuanto más ancho el window observed por el cron, menos days quedan invisibles al daily refresh.
- **Scalability**: Diferencia 7 vs 8 días observed = O(1) overhead. Trivial en cost daily.

**Invariante canonical asociado**: el `seedDate` siempre es ancla muda (NO se materializa); el `materializeStartDate` siempre es `seedDate + 1 = targetStartDate`. Si `seedDate` tiene movements canonicos (`settlement_legs` / `income_payments_normalized` / `expense_payments_normalized`) con persisted `period_inflows/outflows=0`, expandir el window backward 1 día y recalcular `seedDate` recursive hasta encontrar ancla limpia (max 30 días backward, defense in depth contra OTB anchor cross).

**Implementación**: la primitive `computeRollingRematerializationWindow(today, lookbackDays)` devuelve `{targetStartDate, seedDate, materializeStartDate, materializeEndDate, lookbackDays, policy: 'rolling_window_repair'}`. El cron consume esta primitive y delega a `rematerializeAccountBalanceRange` con `seedDate` (que puede haber expandido si el integrity check disparó). Detalle en Slice 2.

## Summary

Formalizar e implementar el contrato canonico de anclaje para rematerializacion rolling de saldos de cuenta. El fix debe cerrar la clase de bugs donde el primer dia de la ventana se usa como seed silencioso y por eso sus movimientos quedan fuera del replay.

La task nace del incidente del 2026-05-13: el smoke Playwright de `finance.account_balances.fx_drift` fallo porque tres cuentas persistieron `period_inflows=0` / `period_outflows=0` en un dia que si tenia settlement legs reales.

## Why This Task Exists

Hace unos dias ISSUE-069 supuestamente habia corregido el "seed-day blind spot", pero el fix fue parcial: el helper actual calcula un seed y luego el rematerializador empieza en `seedDate + 1`. En el cron diario del 2026-05-13, el dia `2026-05-05` quedo como anchor de la ventana y no fue recalculado, aunque tenia movimientos reales.

El control plane de TASK-842 tampoco cerro la brecha completa: el remediator usa una estrategia demasiado amplia (`active_otb`) para drifts recientes y puede chocar con evidencia historica protegida que no deberia bloquear una reparacion rolling mas estrecha.

Esta task no es para apagar el smoke, bajar severidad ni hacer updates manuales. Es para corregir el contrato de rematerializacion y dejar guardrails de dominio que impidan la reincidencia.

## Goal

- Definir un contrato explicito: `targetStartDate = today - lookbackDays`, `seedDate = targetStartDate - 1`, materializar `targetStartDate..today`.
- Separar dos politicas operativas: `rolling_window_repair` para drift reciente acotado e `historical_restatement` para replay amplio con evidencia y controles mas fuertes.
- Mantener el evidence guard activo: si hay evidencia protegida dentro del dia/rango afectado, bloquear o exigir restatement historico; si la evidencia protegida esta antes del rango, reducir scope en vez de cruzarla innecesariamente.
- Recuperar los saldos afectados solo mediante primitives canonicas, auditables e idempotentes.

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
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No hacer `UPDATE` / `DELETE` manual directo sobre `account_balances` como solucion del incidente.
- No desactivar ni suavizar `finance.account_balances.fx_drift` para que Playwright pase.
- No desactivar `account-balance-evidence-guard`; si bloquea, ajustar el alcance del replay o escalar a restatement historico.
- No subir timeouts ni cambiar el smoke E2E como workaround.
- Un rolling job no puede crear o dejar un seed row sintetico en `account_balances` para una fecha con movimientos reales dentro del horizonte observado. Debe preservar un checkpoint real, usar el cierre materializado previo, o materializar tambien esa fecha desde un anchor anterior.
- Cualquier cambio al contrato de rematerializacion debe quedar documentado como ADR/delta en arquitectura de finance o en un ADR dedicado, e indexado si aplica.

## Normative Docs

- `docs/tasks/complete/TASK-842-finance-fx-drift-auto-remediation-control-plane.md`
- `docs/tasks/to-do/TASK-774-account-balance-clp-native-reader-contract.md`
- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`
- `docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md`
- `docs/documentation/finance/saldos-de-cuenta-fx-consistencia.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Dependencies & Impact

### Depends on

- `services/ops-worker/server.ts`
- `services/ops-worker/finance-rematerialize-seed.ts`
- `services/ops-worker/finance-rematerialize-seed.test.ts`
- `src/lib/finance/account-balances-rematerialize.ts`
- `src/lib/finance/account-balance-evidence-guard.ts`
- `src/lib/finance/account-balances-fx-drift-remediation.ts`
- `src/lib/finance/account-balances-fx-drift-remediation.test.ts`
- `src/lib/reliability/queries/account-balances-fx-drift.ts`
- `tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts`
- `scripts/finance/backfill-account-balances-fx-fix.ts`

### Blocks / Impacts

- Playwright smoke `finance.account_balances.fx_drift`.
- Cron Cloud Scheduler `ops-finance-rematerialize-balances`.
- Cron Cloud Scheduler `ops-finance-fx-drift-remediate`.
- Banco / saldos de cuenta / conciliacion bancaria.
- Reliability Overview para el subsystem de finance.

### Files owned

- `services/ops-worker/server.ts`
- `services/ops-worker/finance-rematerialize-seed.ts`
- `services/ops-worker/finance-rematerialize-seed.test.ts`
- `src/lib/finance/account-balances-rematerialize.ts`
- `src/lib/finance/account-balance-evidence-guard.ts`
- `src/lib/finance/account-balances-fx-drift-remediation.ts`
- `src/lib/finance/account-balances-fx-drift-remediation.test.ts`
- `src/lib/reliability/queries/account-balances-fx-drift.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/saldos-de-cuenta-fx-consistencia.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/tasks/to-do/TASK-871-account-balance-rolling-anchor-contract.md`

## Current Repo State

### Already exists

- `computeRematerializeSeedDate(today, lookbackDays)` existe en `services/ops-worker/finance-rematerialize-seed.ts`.
- El cron `/finance/rematerialize-balances` en `services/ops-worker/server.ts` calcula un seed y llama `rematerializeAccountBalanceRange`.
- `rematerializeAccountBalanceRange` materializa desde el dia posterior al seed.
- `finance.account_balances.fx_drift` ya detecta diferencias entre movimientos esperados y saldos persistidos.
- TASK-842 agrego remediator y control plane, pero su estrategia actual es demasiado amplia para este bug class.
- Playwright ya falla loud cuando el signal queda en `error`.

### Gap

- El contrato actual no distingue formalmente `targetStartDate` de `seedDate`.
- El primer dia de la ventana rolling puede convertirse en seed silencioso y no recalcularse.
- Los tests existentes cubren el helper parcial de ISSUE-069, no el contrato cron end-to-end.
- El remediator no tiene una politica estrecha para drift reciente con firma de "seed blind spot".
- La documentacion dice que la clase estaba resuelta, pero el runtime del 2026-05-13 mostro que no.

### Incident Evidence 2026-05-13

- GitHub Actions fallidos:
  - `25797613600` commit `86890bae`
  - `25798094627` commit `fde07952`
  - `25799128668` commit `c2744d3e`
- Test fallido: `tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts:17`
- Signal: `finance.account_balances.fx_drift`, `severity=error`, `count=3`.
- Filas afectadas:
  - `santander-corp-clp`, `2026-05-05`, expected outflows `685189.19`, persisted `0`.
  - `santander-clp`, `2026-05-05`, expected outflows `2537986.43`, persisted `0`.
  - `global66-clp`, `2026-05-05`, expected inflows `1942800`, expected outflows `1953965.41`, persisted `0/0`.
- Hay `settlement_legs` activos en `2026-05-05` para esas cuentas.
- `account_balances` de `2026-05-05` fue computado el `2026-05-13T09:00:00Z` con movements en cero.
- `ops-finance-fx-drift-remediate` fallo con `502` y registro `seen=0 remediated=0 blocked=0 residual=0`.
- `source_sync_runs` mostro bloqueo por evidencia protegida historica de `santander-corp-clp` en `2026-04-29`, aunque no habia evidencia protegida en las tres cuentas afectadas entre `2026-05-04` y `2026-05-13`.

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

### Slice 1 — Discovery + Architecture Decision

- Confirmar contra runtime actual la ruta exacta `cron -> seed helper -> rematerialize range -> evidence guard -> fx drift reader`.
- Revisar si `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` puede recibir un delta embebido o si se requiere ADR dedicado.
- Documentar decision: diferencia normativa entre `rolling_window_repair` e `historical_restatement`.

### Slice 2 — Rolling Window Contract

- Reemplazar o complementar `computeRematerializeSeedDate` con una primitive que exponga explicitamente:
  - `targetStartDate`
  - `seedDate`
  - `materializeStartDate`
  - `materializeEndDate`
  - `policy`
- Ajustar el cron para que el primer dia de la ventana sea materializado, no usado como seed.
- Bloquear por diseño el caso peligroso: crear o preservar un seed row sintetico con `period_inflows=0`, `period_outflows=0`, `transaction_count=0` en una fecha donde existen movimientos canonicos (`settlement_legs`, `income_payments_normalized` o `expense_payments_normalized`).
- Si existe evidencia protegida dentro de la ventana, elegir checkpoint seguro y materializar despues de ese checkpoint sin esconder movimientos del dia objetivo.

### Slice 3 — Remediation Policy Split

- Agregar policy `rolling_window_repair` para drift reciente elegible:
  - `transaction_count=0`
  - persisted inflows/outflows en cero
  - movimientos esperados presentes
  - periodo abierto o no protegido
  - sin snapshot protegido en el dia exacto afectado
- Mantener `historical_restatement` para replay amplio desde OTB o periodos protegidos.
- Hacer que el remediator reduzca alcance cuando la evidencia protegida esta antes del rango afectado, en vez de cruzarla innecesariamente.
- Mantener auditoria/run tracking y Sentry con errores redacted.

### Slice 4 — Tests Anti-Regresion

- Agregar tests unitarios del helper/window:
  - una fecha con movimientos en el primer dia objetivo se recalcula.
  - `lookbackDays=7` el `2026-05-13` materializa `2026-05-06..2026-05-13` si esa es la decision final, o `2026-05-05..2026-05-13` si el contrato aprobado define ventana inclusiva de 7 dias mas today; la decision debe quedar explicita.
  - el seed siempre es el dia anterior a `materializeStartDate`.
- Agregar tests del remediator:
  - drift reciente con firma seed blind spot elige `rolling_window_repair`.
  - evidencia protegida antes del rango no bloquea una reparacion estrecha.
  - evidencia protegida en el dia exacto afectado bloquea o exige `historical_restatement`.
- Asegurar que el smoke Playwright sigue fallando solo ante drift real, no ante intermitencia de navegacion.

### Slice 5 — Controlled Recovery

- Despues de desplegar el codigo en staging, ejecutar recuperacion acotada para:
  - `global66-clp`
  - `santander-clp`
  - `santander-corp-clp`
- Usar el anchor seguro anterior a `2026-05-05` y rematerializar hasta el dia actual.
- Refrescar read models mensuales si aplica.
- Verificar que `finance.account_balances.fx_drift` vuelve a `ok` con `count=0`.
- Re-ejecutar Playwright smoke.

### Slice 6 — Docs + Close

- Actualizar arquitectura, documentacion funcional y handoff con:
  - causa raiz
  - contrato final
  - estrategia de recuperacion
  - comandos ejecutados
  - evidencia de verificacion
- Cerrar o actualizar ISSUE-069 para declarar que el fix previo fue parcial y que TASK-871 cierra el contrato completo.

## Out of Scope

- Deshabilitar `finance.account_balances.fx_drift`.
- Hacer updates manuales en tablas de saldos para pasar CI.
- Cambiar semantica contable de `settlement_legs`, `payment_orders`, `income_payments` o `expense_payments`.
- Redisenar completo de conciliacion bancaria.
- Cambiar el contrato Playwright de navegacion smoke.
- Restatement historico amplio de todos los saldos si la reparacion rolling acotada resuelve el bug verificado.

## Detailed Spec

### Policy Definitions

`rolling_window_repair`:

- Objetivo: reparar drift reciente causado por replay incompleto o seed blind spot.
- Anchor: saldo persistido confiable del dia anterior a `materializeStartDate`.
- Alcance: acotado a ventana reciente y cuentas afectadas.
- Evidencia: no cruza snapshots protegidos dentro del rango; si hay snapshot protegido antes del rango, se usa como limite historico pero no bloquea el replay posterior.
- Autorizacion operativa: puede correr desde cron/remediator si las condiciones son deterministicamente verificables.

`historical_restatement`:

- Objetivo: rehacer historia financiera cuando hay drift que puede tocar evidencia protegida, OTB, reconciliacion cerrada o decisiones humanas aceptadas.
- Anchor: OTB o checkpoint aprobado, con audit fuerte.
- Alcance: explicitamente aprobado y documentado.
- Evidencia: requiere reason, run id, actor o job identity, y validacion posterior.
- Autorizacion operativa: no debe dispararse implicitamente como fallback de cualquier drift reciente.

### Expected Implementation Shape

El agente que tome la task debe preferir una primitive pequena y testeable, por ejemplo `computeRollingRematerializationWindow`, antes que duplicar math en el cron y en el remediator. El nombre final puede variar si el repo ya tiene una convencion mejor.

La primitive debe devolver un objeto tipado que evite ambiguedad:

```ts
type RollingRematerializationWindow = {
  targetStartDate: DateString
  seedDate: DateString
  materializeStartDate: DateString
  materializeEndDate: DateString
  lookbackDays: number
  policy: 'rolling_window_repair'
}
```

No usar strings sueltos ni math duplicada en callers.

### Recovery Guardrails

- Ejecutar primero dry-run o preview si la primitive lo soporta.
- Si no existe dry-run, consultar y registrar antes/despues con queries read-only.
- No modificar cuentas no afectadas por el incidente salvo que el signal muestre drift adicional.
- Si aparece evidencia protegida en el dia exacto a reparar, detener y abrir decision de restatement.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El cron `ops-finance-rematerialize-balances` materializa el primer dia objetivo de la ventana y no lo usa como seed silencioso.
- [ ] Ningun rolling job puede crear o dejar un seed row sintetico en una fecha con movimientos canonicos reales dentro del horizonte observado.
- [ ] El contrato `targetStartDate` / `seedDate` / `materializeStartDate` esta tipado y cubierto por tests.
- [ ] El remediator distingue `rolling_window_repair` de `historical_restatement`.
- [ ] La evidencia protegida antes del rango no bloquea reparaciones rolling acotadas.
- [ ] La evidencia protegida dentro del dia/rango afectado bloquea o exige restatement historico explicito.
- [ ] No hay `UPDATE` / `DELETE` manual directo sobre `account_balances` en el runbook de recuperacion.
- [ ] `finance.account_balances.fx_drift` queda `ok` y `count=0` despues de recovery controlado.
- [ ] El smoke Playwright de finance vuelve a pasar sin debilitar sus asserts.

## Verification

- `pnpm exec vitest run services/ops-worker/finance-rematerialize-seed.test.ts src/lib/finance/account-balances-fx-drift-remediation.test.ts src/lib/reliability/queries/account-balances-fx-drift.test.ts --reporter=dot`
- `pnpm exec eslint services/ops-worker/server.ts services/ops-worker/finance-rematerialize-seed.ts src/lib/finance/account-balances-fx-drift-remediation.ts`
- `pnpm tsc --noEmit`
- `pnpm pg:doctor`
- Verificar Cloud Scheduler/logs de:
  - `ops-finance-rematerialize-balances`
  - `ops-finance-fx-drift-remediate`
- Verificar reliability signal en staging/admin operations.
- `pnpm test:e2e tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts --project=chromium` o el comando canónico vigente del repo para smoke Playwright.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` o ADR dedicado documento el contrato final
- [ ] `docs/documentation/finance/saldos-de-cuenta-fx-consistencia.md` quedo actualizado
- [ ] ISSUE-069 quedo actualizado con la aclaracion "fix previo parcial; contrato completo cerrado por TASK-871"

## Follow-ups

- Evaluar si `historical_restatement` merece una UI/admin workflow dedicado con approval humano.
- Evaluar signal separado para "rolling repair blocked by protected evidence" si se repite.
- Evaluar runbook mensual de reconciliacion que compare snapshots protegidos vs saldos rematerializados antes de cierre contable.

## Delta 2026-05-13

Task abierta desde incidente Playwright/Sentry del 2026-05-13. Se invocaron criterios de arquitectura y finance/accounting antes de crearla. No se modifico runtime en esta apertura.

## Delta 2026-05-13 — Design Adjustment

Decision adicional de arquitectura antes de codigo: un rolling job no puede crear o dejar un seed row sintetico en `account_balances` para una fecha con movimientos reales dentro del horizonte observado. Debe preservar un checkpoint real, usar el cierre materializado previo, o materializar tambien esa fecha desde un anchor anterior.

## Open Questions

- Confirmar durante Discovery si la ventana rolling de negocio debe ser "ultimos 7 dias calendario incluyendo hoy" o "7 dias previos mas hoy". La respuesta define si el 2026-05-13 con lookback 7 debe materializar desde `2026-05-06` o desde `2026-05-05`, pero en ambos casos el seed debe ser el dia anterior al primer dia materializado.
  - **RESUELTA pre-execution 2026-05-13** con interpretación B (8 días observed window). Ver sección "Pre-Execution OQ Resolution" al inicio del documento.

## Closure 2026-05-13

### Slices ejecutados localmente

| Slice | Commit | Resumen |
|---|---|---|
| Slice 2A | `a918ecd4` | `RollingRematerializationWindow` primitive en `services/ops-worker/finance-rematerialize-seed.ts` + 13 tests (canonical shape + ISSUE-069 back-compat). |
| Slice 2B | `23ba4c2a` | `resolveCleanSeedDate` integrity check en `src/lib/finance/account-balances-clean-seed-resolver.ts` + 11 tests (clean/dirty/expand/max/incident shape). |
| Slice 2C | `8524d745` | Wire en `services/ops-worker/server.ts` `handleFinanceRematerializeBalances` — protected snapshot anchor → integrity check → clean seed o escalation Sentry `captureWithDomain('finance')`. Response shape extendido con `window` + `escalations[]`. |
| Slice 3 | `689d35cf` | `FxDriftRemediationPolicy` extendido con `rolling_window_repair` (5to value). classifier + executor con `seedMode='explicit'` + `block_on_reconciled_drift`. Helper movido a domain `src/lib/finance/`. 6 tests nuevos. |
| Slice 4 | `ec16aca9` | `services/ops-worker/finance-rematerialize-invariants.test.ts` — 4 invariantes anti-regresión (A shape, B cleanSeed, C escalation, D composition) + property test 30-iter. |
| Slice 6 docs | (pendiente este commit) | Delta arquitectónico GREENHOUSE_FINANCE_ARCHITECTURE_V1 + DECISIONS_INDEX entry + ISSUE-069 delta closure + CLAUDE.md "Rolling rematerialize anchor contract" supersede ISSUE-069 hard rules + lifecycle complete + tasks README. |

### Quality gates locales (CLAUDE.md Task Closing Quality Gate)

- `pnpm test` — 4441 passed, 17 skipped, 71s.
- `pnpm build` — production Turbopack verde end-to-end.
- `pnpm tsc --noEmit` — clean.
- `pnpm lint` — clean.

### Out of scope local — requiere autorización operador

- **Slice 5 Controlled Recovery**: `global66-clp` + `santander-clp` + `santander-corp-clp` para `2026-05-05`. Disparable via `POST /finance/rematerialize-balances` con body `{accountIds:[...],lookbackDays:14}` después del deploy automático del ops-worker via `.github/workflows/ops-worker-deploy.yml`. Alternativamente via `POST /finance/account-balances/fx-drift/remediate` con `policy='rolling_window_repair'` + `dryRun=false`.
- **Release develop → main**: orchestrator canónico `production-release.yml` con `target_sha` post-merge. Preflight + approval gate + workers parallel + Vercel READY + post-release health + manifest transition. Smoke `finance-account-balances-fx-drift.spec.ts` debe estar verde antes (recovery cierra el gap).

### Evidencia de la verificación

- Tests anti-regresión: `services/ops-worker/finance-rematerialize-seed.test.ts` (20 tests) + `src/lib/finance/account-balances-clean-seed-resolver.test.ts` (11) + `src/lib/finance/account-balances-fx-drift-remediation.test.ts` (21, +6 nuevos) + `services/ops-worker/finance-rematerialize-invariants.test.ts` (7).
- Property check 30-iter contra `(today, lookbackDays)` aleatorios pin-ea Invariant A.
- Test "reproduces the 2026-05-13 incident shape" pin-ea el fix exacto del bug class.

### Cross-impact

- `services/ops-worker/server.ts` (TASK-702 ownership): wire único en `handleFinanceRematerializeBalances`. Helper movido a `src/lib/finance/` para que `account-balances-fx-drift-remediation.ts` (TASK-842 ownership) lo pueda importar sin acoplamiento cross-runtime.
- `account-balance-evidence-guard.ts` (TASK-721 ownership): NO modificado. Sigue corriendo al final de `rematerializeAccountBalanceRange` con `block_on_reconciled_drift` default.
- Reliability signal SQL `account-balances-fx-drift.ts` (TASK-774 ownership): NO modificado. Es el oracle/ground truth.
- VIEWs canónicas TASK-766 (`expense_payments_normalized`, `income_payments_normalized`): consumed read-only por `resolveCleanSeedDate`. NO modificadas.

### Lecciones canonizadas (CLAUDE.md)

Sección "Finance — Rolling rematerialize anchor contract (TASK-871, supersedes ISSUE-069, 2026-05-13)" canoniza las 9 hard rules + helpers canónicos + tests anti-regresión. Pattern reusable cuando emerja otra primitive con "first observed day jamás materializado" — extender o componer las primitives, nunca duplicar date math.
