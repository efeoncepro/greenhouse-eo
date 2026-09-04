# Cierre de offboarding — Maggie y María Fernanda — 2026-09-03

Estado: **complete en offboarding/lifecycle y exclusión de nómina**. Conciliación histórica de Finance separada.

## Autorización y alcance

Julio Reyes confirmó en la conversación del 03/09 que ambas colaboradoras fueron despedidas, que ya se les pagó
todo y solicitó completar sus offboardings. La causal `termination` procede de esa declaración; las fechas se
conservaron de los casos existentes, sin inferirlas desde una señal de acceso. El panel de la captura estaba
seleccionado en Valentina; no se aplicó ninguna acción a Valentina ni a Felipe.

## Ejecución y readback

Dry-run global mediante `pnpm workforce:offboarding:recovery`; ambos casos quedaban fuera de sus lanes de
recuperación automática (`manual_decision_pending` / `in_lifecycle`). Se usó el flujo normal mediante los mismos
commands canónicos: `previewOffboardingCaseReview` → `reviewOffboardingCase` (`relationship_ended`, `termination`,
`approveNow=true`, actor `user-efeonce-admin-julio-reyes`, versión vigente) → `scheduled` → `executed`.
El motivo auditado incluye la confirmación de despido y pago completo. El flag de lifecycle se habilitó sólo en
el proceso operativo, como prescribe el runbook; no se modificó configuración de despliegue.

| Colaboradora | Caso | Último día / fecha efectiva conservados | Estado final |
| --- | --- | --- | --- |
| Maggie Borralles | EO-OFF-2026-39E3E596 | 2026-06-29 | executed, termination |
| Maria Fernanda Gonzalez | EO-OFF-2026-397DF398 | 2026-07-29 | executed, termination |

Preflight real: sin versiones de compensación posteriores al corte y sin relación/engagement de reingreso.
Readback en PG y readers canónicos, 2026-09-03 19:10–19:11 UTC:

- Ambas: `active=false`, `status=inactive`, `assignable=false`; `contract_end_date` igual al último día.
- Relación legal `ended`, `effective_to` igual al corte; compensación cerrada al corte y cero versiones abiertas.
- `getOffboardingWorkQueue`: ambas `closureState=complete`, `4/4 listo`, `pendingSteps=[]`, sin degradación;
  relaciones/runtime alineados, payroll excluido.
- `resolveExitEligibilityForMembers`: ambas excluidas de agosto, septiembre y octubre, `reviewRequired=false`;
  los meses de salida preservan el corte histórico.
- `hr.offboarding.unresolved_exit_signal`: 0; `hr.offboarding.executed_member_still_active`: 0.
- La nómina abierta real es `2026-08`; septiembre aún no tiene período materializado.
- `getPayrollPeriodReadiness(2026-08)`: `ready=true`, cálculo/aprobación listos, `blockingIssues=[]`; cuatro
  colaboradores incluidos. Queda una advertencia por compensación faltante de Julio Reyes. Deadline 07/09.
  No se calculó ni aprobó la nómina.

## Finance: límite de evidencia

Las obligaciones se compararon antes/después y permanecieron idénticas; no se emitieron pagos ni se modificaron
obligaciones/órdenes. La declaración de pago completo del operador está en el motivo del cierre; no equivale a
conciliación bancaria automática. Persistían en `generated`:

- María Fernanda: junio `employee_net_pay` 327.27 (`pob-6220909d-79d6-4c59-83c6-62d3e1926280`) y julio 390.00
  (`pob-d16f6ece-679c-49e4-b0f7-125604e17ca3`).
- Maggie: junio `employee_net_pay` 800.00 (`pob-543e3fa9-7d80-44ac-815d-0b2302e84f60`).

Finance debe conciliar contra los pagos existentes mediante sus commands; no repetir pagos ni marcar saldos
pagados por SQL. No se cambió código de producto, schema, contratos, flags de despliegue ni releases.

## Contratos y evidencia local

- [Runbook](../../operations/runbooks/offboarding-recovery.md).
- [Decisión aceptada de revisión y lifecycle](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md#delta-2026-09-03--task-1349-revisión-contractual-elegibilidad-temporal-por-episodio-y-writeback-de-lifecycle).
- Artefactos locales ignorados: `.tmp/offboarding-review-sep03.ts`, `.tmp/offboarding-review-sep03-result.jsonl`,
  `.tmp/offboarding-verify-sep03.ts`, `.tmp/offboarding-verify-sep03-result.jsonl`. **No repetir el apply:** los casos
  ya son terminales. Lecturas posteriores sí son seguras.
- Auditoría durable también en `offboarding_case.reviewed` y transiciones emitidas por los commands.

## Cierre documental solicitado

Runbook y manual explican los casos manuales fuera del CLI; documentación funcional distingue señal,
cierre y conciliación; skills Payroll/Talent de Codex/Claude comparten el procedimiento. Changelog,
Handoff e índice de auditorías enlazan la evidencia. Se revisó `project_context.md`: no requiere nueva
entrada porque no cambia arquitectura, runtime ni registro de skills existentes. Rige la decisión
aceptada enlazada arriba; no se crea otro ADR ni se altera el lifecycle de una task.

Validación documental: gate de skills espejo y comparación focal de la nueva sección Payroll; diff sin
errores de whitespace; cierre documental y contexto estricto. Este seguimiento no vuelve a ejecutar
salidas, pagos ni pruebas live que creen personas. Los scripts temporales quedan fuera del commit.
