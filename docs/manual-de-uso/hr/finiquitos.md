# Finiquitos Chile

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-05 por Codex
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
8. Abre el PDF y valida que cada monto relevante tenga respaldo suficiente. En `Feriado proporcional`, confirma que aparezcan dias habiles a indemnizar, dias corridos compensados, base diaria y formula del monto.
9. Envia el documento a revision.
10. Aprueba el documento.
11. Emite el documento y descarga el PDF privado.
12. Cuando exista evidencia externa, registra firma/ratificacion. Si la persona firma con reserva de derechos, marca la reserva y deja nota.

Si un caso ya aparece como `Ejecutado` pero no tiene finiquito, no desaparece de `/hr/offboarding`: usa `Calcular` en el carril `Finiquito` para recuperar el settlement desde las fechas canonicas del caso. Esta recuperacion existe para corregir cierres incompletos; el flujo normal debe aprobar settlement y emitir documento antes de ejecutar la salida.

## Reemision de documento

Si el PDF ya fue generado con una plantilla o contenido incorrecto, no se corrige el asset anterior. Usa `Reemitir` desde el carril `Finiquito`, escribe una razon operacional clara y confirma la accion.

Greenhouse marca el documento activo como `superseded`, conserva el PDF anterior como evidencia historica y genera una nueva version con snapshot, hash y asset privado nuevos. La razon queda en los eventos del documento para auditoria.

No se puede reemitir un documento que ya esta `signed_or_ratified`. En ese caso se debe tratar como remediacion legal/operativa separada, porque ya existe evidencia externa asociada.

## Revision del calculo

Antes de aprobar, confirma tres puntos:

- `Feriado proporcional` debe aparecer como no renta/no imponible y no debe cargar AFP, salud, AFC ni IUSC por si solo.
- El PDF debe mostrar el desglose del feriado proporcional desde el snapshot versionado: dias habiles, dias corridos compensados, base diaria, formula y respaldo DT/saldo de vacaciones.
- Si el mes de salida ya esta calculado/aprobado/exportado, el ledger de overlap debe explicar que descuentos mensuales ya quedaron cubiertos.
- Un neto negativo solo es aprobable si existe una `authorized_deduction` con evidencia estructurada; de lo contrario el sistema bloquea.

## Lanes no laborales

No todos los casos de offboarding son finiquitos:

- `Finiquito laboral`: Chile dependiente con payroll interno. Permite calcular, aprobar y generar documento.
- `Cierre contractual`: honorarios. No muestra `Calcular finiquito`; revisa pago pendiente/boleta/retencion SII por los flujos de payroll mensual que correspondan.
- `Cierre proveedor`: Deel/EOR/contractor externo. Greenhouse registra el cierre operativo; el proveedor es owner del payroll legal.
- `Revision legal requerida`: clasificacion ambigua. No fuerces calculo automatico.

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
- No apruebes un liquido negativo sin evidencia de deduccion autorizada.
- No emitas documento si falta RUT verificado del trabajador o identidad legal de la entidad empleadora.
- No marques `signed_or_ratified` sin evidencia o referencia externa.
- No uses el PDF como prueba de pago: el flujo documental no crea ni ejecuta pagos.
- No ejecutes un caso `Payroll interno` sin cálculo aprobado y documento emitido; Greenhouse bloquea esa transición para evitar cierres laborales incompletos.

## Problemas comunes

### El calculo queda bloqueado por vacaciones

Revisa el saldo de vacaciones del colaborador. Si no existe balance auditable, primero hay que reconciliar leave.

### El sistema dice que el regimen no esta soportado

V1 solo cubre renuncia de trabajador dependiente Chile con payroll interno. Otros regimenes requieren lane externa o una task futura.

### Necesito recalcular un settlement aprobado

Cancela el settlement con razon auditable y vuelve a calcular. No se sobrescribe el historico aprobado.

### Necesito regenerar solo el PDF/documento

Usa `Reemitir` con una razon de al menos 10 caracteres. Esto no recalcula el settlement aprobado: solo reemplaza funcionalmente el documento activo por una nueva version auditable.

### El documento no se puede renderizar por identidad legal

Revisa `Datos legales` del trabajador. El PDF formal exige RUT/documento verificado desde el perfil legal canonico; no usa `organizations.tax_id` para personas naturales.

## Referencias tecnicas

- `greenhouse_payroll.final_settlements`
- `greenhouse_payroll.final_settlement_events`
- `greenhouse_payroll.final_settlement_documents`
- `greenhouse_payroll.final_settlement_document_events`
- `src/lib/payroll/final-settlement/**`
- `/api/hr/offboarding/cases/[caseId]/final-settlement`
- `/api/hr/offboarding/cases/[caseId]/final-settlement/document`
- `/api/hr/offboarding/cases/[caseId]/final-settlement/document/reissue`
