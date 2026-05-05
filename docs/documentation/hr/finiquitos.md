# Finiquitos Chile

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-05 por Codex
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

## Que es el settlement final

El finiquito en Greenhouse es un aggregate de Payroll separado de la nomina mensual. Representa el calculo auditable de haberes y descuentos finales de una relacion laboral que ya tiene un caso de offboarding aprobado.

No se calcula desde `contractEndDate`, `member.active` ni una desactivacion administrativa. La fuente de verdad es el `OffboardingCase` con:

- causal `resignation`
- `effective_date`
- `last_working_day`
- snapshot contractual
- lane `internal_payroll`

La pantalla `/hr/offboarding` debe mantener visibles los casos `executed` no cancelados para recuperacion auditada. Si un caso fue ejecutado antes de tener settlement, Greenhouse permite calcularlo desde sus fechas canonicas y deja evidencia en el aggregate de finiquito. Ese camino es recuperacion, no el flujo feliz.

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

Desde TASK-783 cada componente trae una policy explicita:

- `proportional_vacation`: indemnizacion legal, no renta, no imponible. No dispara AFP, salud, AFC ni IUSC.
- `pending_salary` y remuneraciones pendientes: remuneracion tributable/imponible. Solo ellas pueden generar descuentos legales del trabajador.
- `statutory_deductions`: se calcula sobre delta de remuneracion pendiente, no sobre todo el finiquito.
- `authorized_deduction`: exige evidencia estructurada antes de permitir neto negativo.

Si aparece un componente sin policy, el calculo falla cerrado.

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

## Overlap con nomina mensual

El settlement consulta un `PayrollOverlapLedger` para saber si el mes de salida ya tiene payroll mensual calculado/aprobado/exportado. Si la nomina mensual ya materializo Isapre, AFP, AFC o IUSC, el finiquito no duplica esos descuentos.

Ejemplo: renuncia el 30/04 con abril exportado y solo feriado proporcional pendiente. El resultado esperado es feriado proporcional como haber no imponible/no renta y descuentos previsionales adicionales en `$0`, salvo que exista remuneracion imponible pendiente no cubierta o una deduccion autorizada con evidencia.

## Versionamiento

Un settlement aprobado no se modifica silenciosamente. Si hay que recalcular, V1 exige cancelar y reemitir una version nueva.

El documento formal tambien es versionado. Si el PDF activo fue generado con una plantilla equivocada o requiere regeneracion sin cambiar el calculo aprobado, la salida canonica es `Reemitir`: Greenhouse exige una razon auditable, marca el documento activo como `superseded`, conserva su asset privado anterior y genera una nueva version con snapshot/hash/content hash propios. No se reemiten documentos `signed_or_ratified`, porque ya existe evidencia externa asociada.

## Documento formal

Desde TASK-762, el settlement aprobado habilita el documento formal de finiquito:

- El documento vive en `greenhouse_payroll.final_settlement_documents`.
- El PDF queda como asset privado en `greenhouse_core.assets`.
- El documento guarda `snapshot_json`, `snapshot_hash` y `content_hash`; no se recalcula desde datos vivos despues de renderizar.
- La aprobacion del documento usa `workflow_approval_snapshots` y es distinta de la aprobacion del calculo.
- La emision deja el documento pendiente de firma/ratificacion externa. Greenhouse registra evidencia, reserva de derechos, rechazo, anulacion o reemision, pero no reemplaza al proceso externo.
- Desde TASK-783, el PDF debe mostrar marca Greenhouse, entidad legal/RUT, trabajador/RUT, estado textual, tabla `Concepto / Tratamiento / Evidencia / Monto`, totales separados y snapshot/template. La emision formal falla cerrado si falta RUT verificado del trabajador o identidad legal de la entidad empleadora.

## Cierre contractual y proveedor

Honorarios y proveedores no pasan por el engine laboral de finiquito. En `/hr/offboarding` deben verse como `Cierre contractual` o `Cierre proveedor`; no corresponde `Calcular finiquito`. Si hay pagos pendientes de honorarios, se resuelven por el payroll mensual/boleta y retencion SII de honorarios, no por feriado proporcional ni cotizaciones de trabajador dependiente.

El cutoff de elegibilidad payroll futura aplica a todos los lanes: un caso ejecutado con `last_working_day` anterior al inicio del periodo queda fuera del roster mensual siguiente aunque `members.active` siga verdadero para self-service o documentos.

## Fronteras

El flujo de finiquito no crea payment orders, no marca pagos como ejecutados y no ejecuta offboarding/acceso. La emision documental tampoco cambia por si sola el estado del settlement calculado.

Para evitar cierres incompletos, una ejecucion futura de offboarding `internal_payroll` exige settlement aprobado y documento emitido o ratificado. Si falta cualquiera de esos hitos, la transicion a `executed` falla cerrada y la persona sigue en la cola operativa.
