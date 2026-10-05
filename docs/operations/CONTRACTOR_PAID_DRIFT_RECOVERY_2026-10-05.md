# Contractor paid drift — plan de recuperación

Status: preview preparado; **no aplicado**. As-of: 2026-10-05T21:06:24Z. Owners: Finance / HR. Código: TASK-2009. Evidencia de sólo lectura: `.captures/contractor-fix-qa/drift-preview.json`.

## Resultado del preview

Una obligación completa y una orden ya pagadas tienen el payable todavía en `obligation_created`, sin vínculo a la orden:

| Campo | Valor confirmado |
| --- | --- |
| Payable | `EO-CPAY-0002` / `cpay-4a70e0ff-fe07-4c83-b32f-f65c7b8dbc57` |
| Obligación existente | `pob-f3044d11-3830-458c-b0bb-8498bc9e5587` |
| Orden existente pagada | `por-68676079-eff4-4606-bab5-fc537bca369f` |
| Importe liquidado en la línea | `174193.55 CLP` |
| Fecha pagada registrada | `2026-09-07T00:00:00Z` |

No se debe crear otra obligación, orden, expense payment ni transferencia. El preview general sólo acepta obligación/orden/línea paid, importe completo y moneda coincidente; deben revalidarse los estados inmediatamente antes de cualquier apply.

## Preconditions

1. Release gobernado de portal y worker con el mismo código de TASK-2009/2010, readback de versiones y canary aislado. Sin estos checks, conservar preview.
2. Repetir preview y exigir el mismo candidato y estados. Una diferencia bloquea el apply hasta revisión de Finance.
3. Aprobar explícitamente los efectos del evento paid: audit/outbox y comprobante; `contractor_payable_paid_email` puede generar PDF y enviar email al destinatario canónico. No se apaga ni elude ese consumer para simular cierre.

## Apply previsto

Usar `contractorPayablePaidCascadeProjection.refresh` para la orden existente con su `orderId` y `paidAt` confirmados. El nuevo cascade descubre el payable por la obligación, verifica el vínculo y el pago completo, y ejecuta `markPayablePaymentOrderCreated` + `markPayablePaid` en una misma transacción. Repetir no emite otro evento paid si ya converge. Esta instrucción define el command a usar después de autorización; ninguna llamada mutante fue ejecutada al preparar el plan.

## Readback y cierre

Confirmar payable `paid` vinculado a la orden existente; conteo de órdenes y líneas sin incrementos; exactamente una transición paid/outbox; remittance resoluble y outcome de correo honesto. Repetir el preview debe producir cero candidatos para ese cobro. Si un command rechaza, conservar el error de dominio seguro y el drift pendiente; nunca sustituirlo por UPDATE directo. Una corrección local o un correo generado no acredita este readback.
