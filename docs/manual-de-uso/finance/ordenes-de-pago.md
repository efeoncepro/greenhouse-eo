# Órdenes de Pago — Manual de uso

> **Para que sirve:** convertir obligaciones financieras (nomina, facturas,
> impuestos) en ordenes de pago auditables con maker-checker, programacion
> y trazabilidad de envio al banco.

## Antes de empezar

- Necesitas pertenecer al route group `finance` o tener rol `efeonce_admin`.
- Las obligaciones de nomina se crean automaticamente al exportar un
  periodo en `/hr/payroll`. Las facturas de proveedores y obligaciones
  tributarias se materializaran en proximas iteraciones.
- Para aprobar una orden necesitas un segundo usuario distinto al creador
  (regla maker-checker).

## Crear una orden de pago

1. Entra a `Finanzas → Tesoreria → Ordenes de pago` (o directamente
   `https://greenhouse.efeoncepro.com/finance/payment-orders`).
2. En la pestaña **Obligaciones** veras todas las obligaciones por programar.
   Marca el checkbox de las que quieres incluir en la orden.
3. La barra superior te muestra cuantas obligaciones seleccionaste y el
   total por moneda. Click en **Crear orden de pago**.
4. En el dialog:
   - **Titulo**: descripcion humana (e.g. "Nomina abril 2026 — 12 colaboradores").
   - **Metodo de pago**: bank_transfer, wire, paypal, wise, deel, etc.
   - **Fecha programada (opcional)**: cuando se va a ejecutar el pago.
   - **Requiere aprobacion**: dejarlo activo (default) salvo casos puntuales.
5. Click en **Crear orden**.

> Si las obligaciones tienen monedas mixtas (CLP + USD), el sistema te
> pedira crear una orden por moneda.

## Aprobar una orden (maker-checker)

1. Entra a la pestaña **Ordenes**.
2. Busca la orden en estado "Pendiente aprobacion".
3. Click en la fila para abrir el drawer detalle.
4. Si tu usuario es distinto al maker, veras el boton **Aprobar**. Click.
5. La orden pasa a estado "Aprobada" y queda lista para programar o enviar.

> Si el sistema te dice "el creador no puede aprobar su propia orden",
> significa que hay que pedirle a otro usuario que apruebe.

## Programar una fecha

Solo aplica a ordenes en estado **Aprobada** o **Programada** (re-programar).

1. Abre el drawer detalle.
2. Click en **Programar** (o **Re-programar**).
3. Ingresa la fecha en formato YYYY-MM-DD (ej. `2026-05-15`).

La orden aparecera en la pestaña **Calendario** con el estado
"Programada" o "Enviar hoy" si la fecha es hoy o pasada.

## Marcar como enviada

1. Abre el drawer detalle de una orden Aprobada o Programada.
2. Click en **Marcar enviada**.
3. (Opcional) ingresa el numero de operacion del banco como referencia
   externa.

A partir de aca el sistema asume que el archivo de pago ya fue subido al
banco. La orden pasa a estado "Enviada" y las lineas tambien.

## Marcar como pagada

1. Cuando el banco confirme el pago, abre el drawer detalle.
2. Click en **Marcar pagada**.

Las obligations vinculadas pasan a estado `paid` automaticamente. Para
conciliar contra el extracto bancario usa el modulo `Finanzas →
Conciliacion`.

## Cancelar una orden

Solo aplica a ordenes en estado Borrador, Pendiente aprobacion, Aprobada
o Programada (no se pueden cancelar ordenes ya enviadas).

1. Abre el drawer detalle.
2. Click en **Cancelar**.
3. Ingresa el motivo (minimo 3 caracteres).

La orden pasa a Cancelada y las obligations vinculadas vuelven a estar
disponibles para una nueva orden.

## Que significan los estados

- **Borrador**: ordenado pero aun no confirmado.
- **Pendiente aprobacion**: esperando firma del checker.
- **Aprobada**: lista para programar o enviar.
- **Programada**: tiene fecha de ejecucion en el calendario.
- **Enviada**: el operador subio el archivo al banco.
- **Pagada**: el banco confirmo el pago.
- **Conciliada**: ya cruzada contra extracto.
- **Cerrada**: audit completo.
- **Fallida**: el banco rechazo el envio.
- **Cancelada**: revertida antes del envio.

## Que NO hacer

- **NO** aprobar tu propia orden — usa otro usuario para mantener
  trazabilidad.
- **NO** crear ordenes con monedas mezcladas — separa CLP de USD.
- **NO** marcar como pagada antes de tener confirmacion del banco — eso
  pasa las obligations a `paid` y el modulo Conciliacion espera ese
  pago en el extracto.
- **NO** registrar pagos sueltos en `expense_payments` para ordenes ya
  marcadas pagadas; usa el flujo Conciliacion para vincularlos.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
|---------|----------------|----------|
| "Maker-checker: el creador no puede aprobar su propia orden" | El usuario que intenta aprobar es el mismo que la creo | Pedir a otro usuario con permisos de finanzas |
| "Obligations ya en otra order viva" | Una de las obligaciones ya esta lockeada en otra orden activa | Cancelar la orden anterior o seleccionar otras obligaciones |
| "V1 no soporta orders con currencies mixtas" | Mezclaste obligaciones CLP y USD | Crear una orden por moneda |
| El boton Aprobar no aparece | La orden no esta en estado Pendiente aprobacion | Revisar el estado actual de la orden |

## Referencias tecnicas

- Spec: [docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)
- Doc funcional: [docs/documentation/finance/ordenes-de-pago.md](../../documentation/finance/ordenes-de-pago.md)
- Helpers TS: [src/lib/finance/payment-orders/](../../../src/lib/finance/payment-orders/)
- API admin: [src/app/api/admin/finance/payment-orders/](../../../src/app/api/admin/finance/payment-orders/)
- Vista UI: [src/views/greenhouse/finance/payment-orders/](../../../src/views/greenhouse/finance/payment-orders/)
- Schema migration: [migrations/20260501143749876_task-750-payment-orders.sql](../../../migrations/20260501143749876_task-750-payment-orders.sql)
- Seed migration: [migrations/20260501145618269_task-750-seed-payment-orders-view.sql](../../../migrations/20260501145618269_task-750-seed-payment-orders-view.sql)
