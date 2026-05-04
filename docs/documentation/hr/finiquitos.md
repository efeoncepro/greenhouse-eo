# Finiquitos Chile

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-04 por Codex
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

## Que es el settlement final

El finiquito en Greenhouse es un aggregate de Payroll separado de la nomina mensual. Representa el calculo auditable de haberes y descuentos finales de una relacion laboral que ya tiene un caso de offboarding aprobado.

No se calcula desde `contractEndDate`, `member.active` ni una desactivacion administrativa. La fuente de verdad es el `OffboardingCase` con:

- causal `resignation`
- `effective_date`
- `last_working_day`
- snapshot contractual
- lane `internal_payroll`

## Alcance V1

V1 soporta solo renuncia de trabajador dependiente Chile con:

- contrato `indefinido` o `plazo_fijo`
- `pay_regime = chile`
- `payroll_via = internal`

Quedan fuera del engine V1:

- honorarios
- contractors
- EOR/Deel
- internacional
- despido, mutuo acuerdo, termino por plazo fijo u otras causales
- indemnizaciones por anos de servicio, aviso previo o recargos

## Que calcula

El settlement separa componentes:

- `pending_salary`: remuneracion pendiente si el periodo mensual no cubre el ultimo dia trabajado.
- `pending_fixed_allowances`: haberes fijos proporcionales.
- `proportional_vacation`: feriado pendiente o proporcional desde saldo conciliado de vacaciones.
- `statutory_deductions`: descuentos legales asociados a remuneraciones finales.
- `other_agreed_deductions`: descuentos manuales solo con `source_ref`.

Cada linea guarda formula, base, fuente y tratamiento tributario/previsional.

## Readiness

Antes de aprobar, Greenhouse revisa:

- caso de offboarding aprobado o agendado
- regimen soportado
- compensacion vigente al corte
- saldo de vacaciones auditable
- overlap con nomina mensual
- evidencia de cotizaciones previsionales
- tratamiento tributario/previsional por componente
- necesidad de revision legal cuando hay ajustes manuales

Los blockers impiden calcular o aprobar. Los warnings quedan como evidencia para revision humana.

## Versionamiento

Un settlement aprobado no se modifica silenciosamente. Si hay que recalcular, V1 exige cancelar y reemitir una version nueva.

## Documento formal

Desde TASK-762, el settlement aprobado habilita el documento formal de finiquito:

- El documento vive en `greenhouse_payroll.final_settlement_documents`.
- El PDF queda como asset privado en `greenhouse_core.assets`.
- El documento guarda `snapshot_json`, `snapshot_hash` y `content_hash`; no se recalcula desde datos vivos despues de renderizar.
- La aprobacion del documento usa `workflow_approval_snapshots` y es distinta de la aprobacion del calculo.
- La emision deja el documento pendiente de firma/ratificacion externa. Greenhouse registra evidencia, reserva de derechos, rechazo, anulacion o reemision, pero no reemplaza al proceso externo.

## Fronteras

El flujo de finiquito no crea payment orders, no marca pagos como ejecutados y no ejecuta offboarding/acceso. La emision documental tampoco cambia por si sola el estado del settlement calculado.
