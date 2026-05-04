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
7. Usa el settlement aprobado como input para la documentacion formal cuando TASK-762 este disponible.

## Estados

| Estado | Significado |
| --- | --- |
| `draft` | Settlement aun no calculado o bloqueado. |
| `calculated` | Calculo persistido y auditable. |
| `reviewed` | Reservado para revision operacional posterior. |
| `approved` | Aprobado para documentacion/pago futuro. |
| `issued` | Reservado para documento formal emitido. |
| `cancelled` | Cancelado; permite recalcular una nueva version. |

## Que no hacer

- No uses nomina mensual como sustituto del finiquito.
- No calcules finiquito si solo existe `contractEndDate`.
- No apruebes si hay blockers de regimen, compensacion o vacaciones.
- No uses descuentos manuales sin `source_ref`.
- No trates honorarios, Deel/EOR o internacionales como Chile dependiente.

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
- `src/lib/payroll/final-settlement/**`
- `/api/hr/offboarding/cases/[caseId]/final-settlement`
