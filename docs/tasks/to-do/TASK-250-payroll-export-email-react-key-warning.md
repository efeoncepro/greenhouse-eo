# TASK-250 — Payroll Export Email React Key Warning Cleanup

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-250-payroll-export-email-react-key-warning`
- Legacy ID: `none`

## Summary

Eliminar el warning de React `Each child in a list should have a unique "key" prop.` que hoy aparece en `PayrollExportReadyEmail` durante la corrida del suite. El objetivo es limpiar la señal operativa del summary de observabilidad sin cambiar el contrato funcional del email de exportación de nómina.

## Why This Task Exists

El MVP de observabilidad de tests ya quedó operativo con `TASK-249`, pero la última corrida completa sigue reportando un warning no fatal en el summary generado desde `artifacts/tests/vitest.log`. Ese warning viene de `src/emails/PayrollExportReadyEmail.tsx`, donde el render de `breakdowns.map(...)` devuelve múltiples hijos por iteración sin una `key` estable. El problema no rompe la suite, pero contamina la lectura humana del summary y deja ruido innecesario en CI para una lane que debería reflejar solo señales reales.

## Goal

- Eliminar el warning de React `key` en `PayrollExportReadyEmail`.
- Mantener intacto el HTML visible y la cobertura existente del template de exportación.
- Dejar la corrida de observabilidad sin este falso warning residual en el summary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/12-testing-development.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- No cambiar el contrato funcional ni el copy del email salvo lo estrictamente necesario para corregir el warning.
- La corrección debe usar una `key` estable en la estructura renderizada; no introducir hacks de testing para silenciar el warning.
- La validación debe confirmar que el suite focalizado del email sigue pasando y que la observabilidad ya no reporta este warning.

## Normative Docs

- `AGENTS.md`
- `docs/tasks/complete/TASK-104-payroll-export-email-redesign.md`
- `docs/tasks/complete/TASK-249-test-observability-mvp.md`

## Dependencies & Impact

### Depends on

- `src/emails/PayrollExportReadyEmail.tsx`
- `src/emails/PayrollExportReadyEmail.test.tsx`
- `artifacts/tests/vitest.log`
- `artifacts/tests/summary.md`

### Blocks / Impacts

- `TASK-249` — mejora la calidad de la señal del summary de observabilidad ya implementado
- Lane de emails transaccionales de Payroll — preserva el template de `Payroll export ready` sin warnings React evitables
- Revisión de PRs y handoffs — el summary deja de reportar un warning no accionable una vez resuelto

### Files owned

- `src/emails/PayrollExportReadyEmail.tsx`
- `src/emails/PayrollExportReadyEmail.test.tsx`
- `docs/tasks/to-do/TASK-250-payroll-export-email-react-key-warning.md`

## Current Repo State

### Already exists

- `TASK-104` ya rediseñó `PayrollExportReadyEmail` con breakdowns multi-moneda y tests dedicados
- `TASK-249` ya institucionalizó el summary de observabilidad y hoy publica warnings no fatales relevantes desde `vitest.log`
- La última corrida de `pnpm test:observability` pasó completa y dejó artifacts locales vigentes bajo `artifacts/tests/` y `artifacts/coverage/`
- `src/emails/PayrollExportReadyEmail.test.tsx` cubre tres escenarios del template: multi-moneda, single-moneda y adjuntos

### Gap

- `PayrollExportReadyEmail` sigue renderizando `breakdowns.map(...)` con un fragmento sin `key`, por lo que React emite el warning en los tres tests del template
- El summary de observabilidad sigue mostrando ese warning como si fuera una señal abierta del suite, aunque el problema sea localizado y no fatal
- No existe todavía una lane formal para limpiar este warning residual como follow-on corto de `TASK-104` y `TASK-249`

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

### Slice 1 — React key correctness in PayrollExportReadyEmail

- Corregir el render de `breakdowns.map(...)` para que cada iteración tenga una `key` estable
- Preservar el markup visible, el orden de las filas y el contenido textual del email
- Evitar introducir IDs artificiales que no existan en el contrato del template si una composición estable con datos existentes es suficiente

### Slice 2 — Focused regression + observability cleanup

- Validar `src/emails/PayrollExportReadyEmail.test.tsx` después del cambio
- Re-ejecutar el carril mínimo necesario para comprobar que el warning deja de aparecer en el log/summary de observabilidad
- Confirmar que el summary ya no reporta este warning como residual del suite

## Out of Scope

- Rediseñar el email de exportación de nómina
- Cambiar subject, copy, metadata o attachments del template
- Limpiar otros warnings no relacionados del suite
- Introducir nuevas capacidades de observabilidad o cambiar la policy de `TASK-249`

## Detailed Spec

La implementación esperada es pequeña y localizada.

- El warning actual aparece en `src/emails/PayrollExportReadyEmail.test.tsx` durante los tres casos cubiertos.
- La causa observable está en `src/emails/PayrollExportReadyEmail.tsx`, donde `breakdowns.map(...)` retorna varias filas dentro de un fragmento sin `key`.
- La corrección preferida es usar un `Fragment` explícito con `key` estable o una estructura equivalente que mantenga el output HTML sin drift visible.

La validación final debe demostrar dos cosas al mismo tiempo:

1. El template sigue renderizando igual para los tests existentes.
2. El warning deja de contaminar la observabilidad del suite.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/emails/PayrollExportReadyEmail.tsx` deja de emitir el warning `Each child in a list should have a unique "key" prop.`
- [ ] `src/emails/PayrollExportReadyEmail.test.tsx` sigue pasando sin cambiar su intención funcional
- [ ] La corrida de observabilidad ya no reporta este warning en `artifacts/tests/summary.md`

## Verification

- `pnpm exec vitest run src/emails/PayrollExportReadyEmail.test.tsx`
- `pnpm test:observability`

## Closing Protocol

- [ ] Actualizar `Handoff.md` solo si el warning resultó ser síntoma de otro patrón repetido en templates de email
- [ ] Registrar follow-up adicional solo si la corrección revela warnings equivalentes en otros templates

## Follow-ups

- Auditar otros templates de `src/emails/**` si aparece más de un warning `key` después de la corrección focalizada
- Endurecer el summary de observabilidad para agrupar warnings por archivo si el volumen de ruido vuelve a crecer
