# Órdenes de Pago — Finanzas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-01 por Julio Reyes
> **Ultima actualizacion:** 2026-05-05 por Julio Reyes
> **Documentacion tecnica:** [docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)

## Processor vs instrumento de salida

Una orden de pago separa dos decisiones:

- **Processor / metodo:** quien ejecuta o coordina el pago (`Deel`, `Global66`, banco, etc.).
- **Instrumento de salida:** cuenta, fintech o tarjeta real que se rebaja o contrae deuda.

Ejemplos:

- **Deel contractor:** `processor=deel`, pero el instrumento de salida puede ser `Santander Corp TC`. Deel no aparece como cuenta origen si solo opera como rail.
- **Global66 contractor:** `processor=global66` y el instrumento de salida puede ser `Global66` si existe como fintech/cuenta activa.
- **Banco directo:** `processor` puede quedar vacío o `bank_transfer`, y el instrumento de salida es la cuenta bancaria real.

No marques una orden como pagada usando un processor como si fuera caja. Si falta el instrumento de salida, la orden queda bloqueada hasta asignarlo.

## Que es

Órdenes de Pago es la capa operativa que convierte obligaciones financieras (lo
que la empresa debe pagar) en ordenes auditables (cuando, como y a quien se
paga). Vive en `/finance/payment-orders`.

Cada orden:

- agrupa una o mas obligaciones (nomina, proveedores, impuestos),
- tiene una fecha programada y un metodo de pago,
- pasa por maker-checker (quien la crea no la aprueba),
- emite eventos auditados al outbox en cada cambio de estado,
- queda lockeada al obligation hasta que se pague o se cancele.

## Para que sirve

- Centralizar el flujo de pagos en un solo tablero.
- Auditar quien creo, aprobo, envio y marco como pagada cada orden.
- Programar pagos con fecha (bloqueada o ajustable segun permisos).
- Detectar drift entre lo que se debe pagar y lo que efectivamente se pago.
- Habilitar batches de pago multi-beneficiario (transferencia bancaria con
  CSV consolidado).

## Modelo

```
Obligation (lo que se debe)  →  Order (cuando y como se paga)  →  Expense Payment (pago real)
        TASK-748                       TASK-750                        TASK-722
```

Una obligation **vive en una sola orden viva a la vez**. Si la orden se
cancela, la obligation queda libre para reasignarse.

## Estados de una orden

| Estado              | Que significa                                                            |
|---------------------|--------------------------------------------------------------------------|
| Borrador            | Aun no ha sido confirmada                                                |
| Pendiente aprobacion| Esperando firma del checker (otro usuario distinto al maker)             |
| Aprobada            | Lista para programar o enviar                                            |
| Programada          | Tiene fecha de ejecucion en el calendario                                |
| Enviada             | Operador subio el archivo al banco / processor                           |
| Pagada              | Confirmacion del banco; obligaciones marcadas pagadas                    |
| Conciliada          | Cruzada contra extracto bancario                                         |
| Cerrada             | Audit completo, no admite cambios                                        |
| Fallida             | El banco rechazo el envio                                                |
| Cancelada           | Operador la cancelo antes del envio; libera obligations                  |

## Flujo tipico

1. **Generar obligaciones**: al exportar una nomina, el sistema crea
   automaticamente las `payment_obligations` (neto colaborador, cotizaciones
   empleador, retenciones).
2. **Seleccionar y crear orden**: en la pestaña Obligaciones, marcar las
   obligaciones a pagar y click en "Crear orden de pago". Configurar metodo
   de pago, fecha programada y maker-checker.
3. **Aprobar (maker-checker)**: un usuario distinto al creador entra a la
   orden y hace click en Aprobar. El sistema valida que `approved_by !=
   created_by`.
4. **Programar (opcional)**: setear fecha en el calendario para que aparezca
   como "scheduled" en la pestaña Calendario.
5. **Enviar al banco**: marcar la orden como enviada. Aca el operador subio
   el CSV/wire al banco. Se puede capturar el numero de operacion como
   `external_reference`.
6. **Marcar pagada**: cuando el banco confirma, marcar la orden como pagada.
   Las obligations vinculadas pasan a `paid`.
7. **Conciliar (TASK-722)**: el modulo Conciliacion cruza el pago contra el
   extracto bancario.

## Reglas duras

- **Maker-checker**: el creador NO puede aprobar su propia orden. El sistema
  lo bloquea en 3 capas: trigger DB, helper TS, UI.
- **Currency uniforme**: una orden no puede mezclar CLP y USD. Crear una
  orden por moneda.
- **Inmutabilidad post-aprobacion**: cambios crean nueva orden + cancelacion.
- **Cancelar libera locks**: una orden cancelada suelta las obligations.

## Eventos auditados

Cada accion publica un evento en `greenhouse_sync.outbox_events`:

- `finance.payment_order.created`
- `finance.payment_order.approved`
- `finance.payment_order.scheduled`
- `finance.payment_order.submitted`
- `finance.payment_order.paid`
- `finance.payment_order.cancelled`

> Detalle tecnico: helpers en [src/lib/finance/payment-orders/](../../../src/lib/finance/payment-orders/).
> API en [src/app/api/admin/finance/payment-orders/](../../../src/app/api/admin/finance/payment-orders/).
> Schema en [migrations/20260501143749876_task-750-payment-orders.sql](../../../migrations/20260501143749876_task-750-payment-orders.sql).
