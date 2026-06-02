# Contratistas — Monto Acordado y Guardrail de Pago

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-31 por Claude (TASK-968 — contractor compensation setup + agreed-amount guardrail)
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

## Que es

El **monto acordado** es cuanto se le paga a un contratista y con que cadencia (por ejemplo: $600.000 mensuales fijos). Antes el dato existia en la base pero no habia donde definirlo desde el portal; algunos contratistas quedaban sin monto y no podian cobrar.

TASK-968 cierra eso con una regla simple de **separacion de funciones (SoD)**:

- **RR.HH. fija** el monto acordado.
- **El contratista lo ve, pero nunca lo escribe.**
- **Finanzas paga** y no puede pagar por encima de lo acordado sin una autorizacion registrada.

## Las tres vistas

| Vista | Quien la usa | Que hace |
| --- | --- | --- |
| **Compensacion (workbench HR)** | RR.HH. / Finanzas / admin | Define el monto acordado, el tipo de tarifa (fija, por hora, por hito, etc.) y la cadencia. La **moneda no se cambia aqui** (se eligio al crear la contratacion). |
| **Mis Servicios (contratista)** | El contratista | Ve "Monto acordado" como dato de solo lectura. Al declarar trabajo, el monto del periodo **se calcula solo** desde lo acordado; el contratista no escribe ningun monto. Si aun no tiene monto, no puede enviar y se le pide contactar a RR.HH. |
| **Guardrail (inspector Finanzas)** | Finanzas (admin) | Muestra los pagos que **superan** el monto acordado y permite autorizar una excepcion con motivo. |

## El guardrail (control de pago)

Cuando un pago preparado supera el monto acordado, el sistema lo **bloquea** antes de que llegue a Finanzas. Para que avance hay dos caminos:

1. **Corregir el monto** del pago para que coincida con lo acordado, o
2. **Autorizar una excepcion** (override): solo Finanzas admin, con un motivo de al menos 10 caracteres, que queda **registrado** (quien y cuando).

La persona que autoriza la excepcion **no puede ser** la misma que fijo el monto: es un control de doble firma.

> El guardrail solo aplica a tarifas de **periodo** (fija, retainer, por hito, por proyecto). Para tarifas **por hora o por dia** no aplica, porque el total del periodo es cantidad × tarifa y puede superar legitimamente la tarifa unitaria.

## Senales de salud

- **Contratistas sin monto acordado:** RR.HH. ve una alerta cuando hay contrataciones activas sin monto definido (hay que fijarlo para que el contratista pueda cobrar).
- **Pagos que exceden lo acordado:** Finanzas ve una alerta cuando hay pagos bloqueados por superar lo acordado y aun sin autorizar.

> Detalle tecnico: invariantes en `CLAUDE.md` → "Contractor Agreed-Amount SoD + Guardrail invariants (TASK-968)". Codigo: `src/views/greenhouse/contractors/ContractorEngagementCompensationDrawer.tsx`, `ContractorGuardrailPanel.tsx`, `src/lib/contractor-engagements/payables/readiness.ts`. Spec: `docs/tasks/complete/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md`.
