# Finiquitos Chile

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-04 por Codex
> **Modulo:** HR / Payroll
> **Ruta en portal:** `/hr/offboarding`
> **Documentacion relacionada:** [Finiquitos Chile](../../documentation/hr/finiquitos.md), [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

## Para que sirve

El motor de finiquitos calcula y guarda el cierre final de una renuncia Chile dependiente, separado de la nomina mensual.

## Antes de empezar

- Necesitas acceso a `equipo.offboarding`.
- Necesitas capability `hr.final_settlement`.
- Para documento formal necesitas capability `hr.final_settlement_document`.
- El caso de offboarding debe estar `approved` o `scheduled`.
- El colaborador debe ser Chile dependiente con payroll interno.
- Debe existir compensacion vigente y saldo de vacaciones conciliado.
- Debe existir evidencia operativa de cotizaciones previsionales o quedara warning.

## Paso a paso operativo

1. Abre el caso en `HR > Offboarding`.
2. Confirma causal `resignation`, fecha efectiva y ultimo dia trabajado.
3. Ejecuta el calculo de final settlement.
4. Revisa el breakdown de haberes, vacaciones, descuentos y neto.
5. Revisa readiness: blockers detienen el flujo; warnings requieren criterio HR/legal.
6. Si esta correcto, aprueba el settlement.
7. En el carril `Finiquito`, renderiza el documento.
8. Envia el documento a revision.
9. Aprueba el documento.
10. Emite el documento y descarga el PDF privado.
11. Cuando exista evidencia externa, registra firma/ratificacion. Si la persona firma con reserva de derechos, marca la reserva y deja nota.

## Estados

| Estado | Significado |
| --- | --- |
| `draft` | Settlement aun no calculado o bloqueado. |
| `calculated` | Calculo persistido y auditable. |
| `reviewed` | Reservado para revision operacional posterior. |
| `approved` | Aprobado para documentacion/pago futuro. |
| `issued` | Reservado para documento formal emitido. |
| `cancelled` | Cancelado; permite recalcular una nueva version. |

## Estados del documento

| Estado | Significado |
| --- | --- |
| `rendered` | PDF generado desde settlement aprobado y snapshot inmutable. |
| `in_review` | Documento enviado a revision HR. |
| `approved` | Aprobacion documental lista para emision. |
| `issued` | Documento emitido; queda pendiente de firma/ratificacion externa. |
| `signed_or_ratified` | Evidencia o referencia externa registrada. |
| `rejected` | Rechazado por trabajador/a. |
| `voided` | Anulado con razon auditable. |
| `superseded` | Reemplazado por una nueva version. |

## Que no hacer

- No uses nomina mensual como sustituto del finiquito.
- No calcules finiquito si solo existe `contractEndDate`.
- No apruebes si hay blockers de regimen, compensacion o vacaciones.
- No uses descuentos manuales sin `source_ref`.
- No trates honorarios, Deel/EOR o internacionales como Chile dependiente.
- No marques `signed_or_ratified` sin evidencia o referencia externa.
- No uses el PDF como prueba de pago: el flujo documental no crea ni ejecuta pagos.

## Problemas comunes

### El calculo queda bloqueado por vacaciones

Revisa el saldo de vacaciones del colaborador. Si no existe balance auditable, primero hay que reconciliar leave.

### El sistema dice que el regimen no esta soportado

V1 solo cubre renuncia de trabajador dependiente Chile con payroll interno. Otros regimenes requieren lane externa o una task futura.

### Necesito recalcular un settlement aprobado

Cancela el settlement con razon auditable y vuelve a calcular. No se sobrescribe el historico aprobado.

## Referencias tecnicas

- `greenhouse_payroll.final_settlements`
- `greenhouse_payroll.final_settlement_events`
- `greenhouse_payroll.final_settlement_documents`
- `greenhouse_payroll.final_settlement_document_events`
- `src/lib/payroll/final-settlement/**`
- `/api/hr/offboarding/cases/[caseId]/final-settlement`
- `/api/hr/offboarding/cases/[caseId]/final-settlement/document`
