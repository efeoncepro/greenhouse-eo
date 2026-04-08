> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-07 por Claude
> **Ultima actualizacion:** 2026-04-07 por Claude
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)

# Modulos de Caja — Cobros, Pagos y Posicion de Caja

## Que son estos modulos

Finance separa explícitamente los **documentos comerciales** (facturas de venta y compra) de los **movimientos de caja** (dinero que realmente entra y sale).

| Concepto | Modulo | Que representa |
|----------|--------|----------------|
| Ventas | `/finance/income` | Facturas emitidas a clientes (devengo) |
| Compras | `/finance/expenses` | Facturas recibidas de proveedores (obligaciones) |
| **Cobros** | `/finance/cash-in` | Dinero efectivamente recibido |
| **Pagos** | `/finance/cash-out` | Dinero efectivamente pagado |
| **Posicion de caja** | `/finance/cash-position` | Saldo real: cobrado menos pagado |

## Cobros (Cash In)

- Muestra todos los pagos recibidos contra facturas de venta
- Cada cobro esta vinculado a una factura especifica
- Se puede registrar un cobro desde el detalle de la factura ("Registrar pago")
- Los cobros se pueden reconciliar contra extractos bancarios
- KPIs: Total cobrado, Pagos recibidos, Sin conciliar

## Pagos (Cash Out)

- Muestra todos los pagos realizados contra compromisos (facturas de compra, nomina, impuestos, etc.)
- Se agrupan por tipo: Proveedor, Nomina, Prevision, Impuesto, Bancario
- Se puede registrar un pago desde el detalle del documento de compra
- Soporta pagos parciales (multiples pagos contra un mismo documento)
- KPIs: Total pagado, desglose por tipo (proveedores, nomina, fiscal)

## Posicion de Caja

- Vista de resumen que responde: "cuanto dinero tenemos realmente"
- Muestra:
  - **Posicion neta**: cobros menos pagos del periodo
  - **Por cobrar**: facturas emitidas pendientes de cobro
  - **Por pagar**: compromisos pendientes de pago
  - **Grafico 12 meses**: cobros vs pagos vs flujo neto mensual
  - **Cuentas bancarias**: listado de cuentas activas con saldo de apertura

## Como registrar un pago

1. Ir al detalle del documento (factura de venta o de compra)
2. En la tarjeta "Registrar pago", ingresar:
   - **Monto**: cuanto se pago (muestra el saldo pendiente como referencia)
   - **Fecha**: cuando se realizo el pago
   - **Referencia**: numero de transferencia, comprobante, etc.
3. Hacer clic en "Registrar pago"
4. El sistema actualiza automaticamente el estado del documento (pendiente → parcial → pagado)

## Diferencia con P&L

El P&L (Estado de Resultados) usa **base devengada**: cuenta ingresos y gastos por fecha de factura, independiente de si se cobraron o pagaron. Los modulos de caja muestran la **base de caja**: dinero real que entro y salio. Ambas vistas coexisten y son complementarias.

> Detalle tecnico: ver [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), seccion expense_payments y cash management endpoints.
