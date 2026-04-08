> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-04-07 por Claude
> **Ultima actualizacion:** 2026-04-08 por Codex
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)

# Modulos de Caja — Cobros, Pagos, Banco y Posicion de Caja

## Que son estos modulos

Finance separa explícitamente los **documentos comerciales** (facturas de venta y compra) de los **movimientos de caja** (dinero que realmente entra y sale).

| Concepto | Modulo | Que representa |
|----------|--------|----------------|
| Ventas | `/finance/income` | Facturas emitidas a clientes (devengo) |
| Compras | `/finance/expenses` | Facturas recibidas de proveedores (obligaciones) |
| **Cobros** | `/finance/cash-in` | Dinero efectivamente recibido |
| **Pagos** | `/finance/cash-out` | Dinero efectivamente pagado |
| **Banco** | `/finance/bank` | Tesoreria por instrumento: saldo, coverage, discrepancia y cierre |
| **Posicion de caja** | `/finance/cash-position` | Saldo real: cobrado menos pagado |

## Cobros (Cash In)

- Muestra todos los pagos recibidos contra facturas de venta
- Cada cobro esta vinculado a una factura especifica
- Se puede registrar un cobro desde el detalle de la factura ("Registrar pago")
- El cobro real queda persistido en `greenhouse_finance.income_payments`
- Registrar un cobro dispara el evento reactivo `finance.income_payment.recorded`
- Los cobros se pueden reconciliar contra extractos bancarios
- En la tabla de `Cobros`, el **estado del movimiento** significa que el dinero ya entro (`Cobrado`); la **conciliacion** es un eje aparte (`Conciliado` / `Por conciliar`)
- KPIs: Total cobrado, Pagos recibidos, Sin conciliar

## Pagos (Cash Out)

- Muestra todos los pagos realizados contra compromisos (facturas de compra, nomina, impuestos, etc.)
- Se agrupan por tipo: Proveedor, Nomina, Prevision, Impuesto, Bancario
- Se puede registrar un pago desde el detalle del documento de compra
- El pago real queda persistido en `greenhouse_finance.expense_payments`
- Registrar un pago dispara el evento reactivo `finance.expense_payment.recorded`
- Soporta pagos parciales (multiples pagos contra un mismo documento)
- En la tabla de `Pagos`, el **estado del movimiento** significa que la salida de caja ya ocurrio (`Pagado`); la **conciliacion** es independiente (`Conciliado` / `Por conciliar`)
- KPIs: Total pagado, desglose por tipo (proveedores, nomina, fiscal)

## Posicion de Caja

- Vista de resumen que responde: "cuanto dinero tenemos realmente"
- Muestra:
  - **Posicion neta**: cobros menos pagos del periodo
  - **Por cobrar**: facturas emitidas pendientes de cobro
  - **Por pagar**: compromisos pendientes de pago
  - **Grafico 12 meses**: cobros vs pagos vs flujo neto mensual
  - **Cuentas bancarias**: listado de cuentas activas con saldo de apertura

## Banco (Treasury)

- Vista operativa de tesoreria por instrumento real: cuenta bancaria, tarjeta, fintech o wallet
- Lee desde `account_balances`, settlement legs y payment ledgers, no desde flags documentales
- Responde preguntas como:
  - cuanto saldo estimado tiene cada cuenta
  - cuantos movimientos del periodo quedaron sin instrumento asignado
  - cual es la discrepancia contra el ultimo periodo de conciliacion
  - que instrumentos tienen el periodo cerrado
- KPIs visibles:
  - saldo CLP
  - saldo USD
  - equivalente CLP consolidado
  - instrumentos activos
  - coverage de asignacion
  - resultado cambiario

### Lo que muestra Banco

- **Saldos por instrumento**
  - apertura
  - ingresos
  - salidas
  - saldo estimado
  - discrepancia
  - estado de conciliacion
  - estado del cierre del periodo
- **Tarjetas de credito**
  - cupo
  - consumo del periodo
  - disponible estimado
- **Detalle por cuenta**
  - historial de 12 meses
  - movimientos recientes
  - cierre de periodo por cuenta

### Coverage de instrumentos

- Si un cobro o pago existe pero no tiene `payment_account_id`, afecta el KPI de coverage
- `Banco` muestra un banner cuando la cobertura es menor a 100%
- La accion **Asignacion retroactiva** permite vincular pagos/cobros existentes a una cuenta para que:
  - `Banco`
  - `Cobros`
  - `Pagos`
  - `Conciliacion`
  - `Posicion de caja`
  lean el mismo instrumento canonico

### Transferencias internas

- `Banco` agrega la accion **Transferencia interna**
- Sirve para mover fondos entre instrumentos propios sin registrar un gasto o ingreso nuevo
- Caso tipico:
  - `Santander -> Global66`
  - `Banco Estado -> cuenta operativa`
- La transferencia:
  - crea settlement legs `internal_transfer`
  - puede crear legs `fx_conversion` si cruza monedas
  - rematerializa saldos de ambas cuentas
- Importante:
  - una transferencia interna no liquida una obligacion comercial
  - el pago real al proveedor o colaborador sigue viviendo en `expense_payments`

### Cierre de periodo por cuenta

- Cada cuenta puede cerrarse por periodo una vez terminado el mes
- El cierre congela el snapshot de `account_balances` para ese mes
- Si aparece movimiento retroactivo despues del cierre, Greenhouse lo muestra como drift operativo; no reescribe silenciosamente el cierre

## Como registrar un pago

1. Ir al detalle del documento (factura de venta o de compra)
2. En la tarjeta "Registrar pago", ingresar:
   - **Monto**: cuanto se pago (muestra el saldo pendiente como referencia)
   - **Fecha**: cuando se realizo el pago
   - **Referencia**: numero de transferencia, comprobante, etc.
3. Hacer clic en "Registrar pago"
4. El sistema actualiza automaticamente el estado del documento (pendiente → parcial → pagado)

### Registro avanzado de settlement

- En `Pagos`, el drawer de registro ya permite modelar:
  - pago directo
  - pago via instrumento intermediario
  - instrumento de funding
  - fee separado
  - override manual de tipo de cambio
- En `Cobros`, el drawer de registro ya permite informar:
  - instrumento
  - fee de recaudacion
  - override manual de tipo de cambio
- Desde el historial de pagos/cobros del detalle documental existe la accion **Liquidacion**, que abre el settlement group del payment y permite agregar legs manuales (`internal_transfer`, `funding`, `fx_conversion`, `fee`) sin alterar el documento base

## Regla operativa canonica

- El documento (`Ventas` / `Compras`) es la fuente comercial y tributaria
- El ledger (`income_payments` / `expense_payments`) es la fuente canonica de caja real
- Si un documento aparece como pagado o cobrado, debe existir al menos un evento en el ledger correspondiente
- Los modulos `Cobros`, `Pagos`, `Posicion de caja`, las proyecciones reactivas y los calculos de costos deben leer caja desde ese ledger, no desde un flag embebido en el documento

## Remediacion historica

- Si existen documentos legacy marcados como `paid` o `partial` pero sin fila en el ledger, Greenhouse ahora tiene un script de auditoria/remediacion:
  - `pnpm audit:finance:payment-ledgers`
  - `pnpm backfill:finance:payment-ledgers`
- El backfill usa el write path canonico para que tambien se publiquen los eventos de outbox que consumen Finance, Cost Intelligence y proyecciones operativas

## Instrumentos de pago

Cada cobro o pago puede asociarse a un **instrumento de pago** (cuenta bancaria, tarjeta de crédito, fintech, etc.). Esto permite:

- Saber desde qué cuenta se pagó o a cuál cuenta se recibió
- Ver logos de proveedores (bancos, PayPal, Wise, Deel, etc.) en las tablas de cobros y pagos
- Agrupar posición de caja por instrumento
- Registrar nuevos instrumentos desde Admin Center (`/admin/payment-instruments`)

### Categorías de instrumentos

| Categoría | Ejemplos |
|-----------|----------|
| Cuenta bancaria | BCI, Banco de Chile, Santander, Estado |
| Tarjeta de crédito | Visa, Mastercard, Amex |
| Fintech | PayPal, Wise, MercadoPago, Global66 |
| Plataforma de pago | Deel, Stripe |
| Procesador de nómina | Previred |
| Efectivo | Caja chica |

### Dónde se selecciona el instrumento

- Al registrar un cobro (drawer "Registrar cobro")
- Al registrar un pago (drawer "Registrar pago")
- Al crear una factura de venta (drawer "Registrar ingreso")
- Al crear un compromiso de compra (drawer "Registrar egreso")

## Conciliacion e instrumentos

- `Conciliacion` ya no debe leerse como una cola documental separada; su unidad canonica es el mismo ledger que usan `Cobros` y `Pagos`
- Cuando existe un `income_payment` o `expense_payment`, el matching operativo ocurre contra ese movimiento real, no contra un flag embebido en la factura o el gasto
- El periodo de conciliacion guarda snapshots del instrumento para que el cierre no dependa de que el catalogo cambie despues
- Reimportar el mismo extracto o reporte no debe duplicar filas: Greenhouse usa fingerprints de importacion y omite rows repetidas del mismo periodo
- El loop operativo ya quedó cerrado sobre el ledger real: si desconcilias un row, `Cobros` o `Pagos` vuelven a `Por conciliar`; si lo reconcilias otra vez, el `payment` y su `settlement leg` recuperan el estado reconciliado
- La vista detalle del periodo ahora muestra:
  - snapshot del instrumento, proveedor y moneda del periodo
  - accion `Marcar conciliado`
  - accion `Cerrar periodo`
- Un periodo solo puede marcarse como conciliado cuando:
  - tiene extracto importado
  - no quedan filas `unmatched` o `suggested`
  - la diferencia esta en cero

## Settlement y pagos internacionales

Greenhouse ya deja preparada la base para **settlement orchestration**.

- Un pago directo desde `Santander` a un proveedor o colaborador se registra como un settlement directo
- Un flujo `Santander -> Global66 -> beneficiario` ya no debe verse como un solo pago
- El fondeo a `Global66` es una **transferencia interna** o `funding`
- El leg que realmente liquida la obligacion es el `payout` al beneficiario
- `FX conversion` y `fee` pueden existir como legs separados del principal

En la base esto se representa con:

- `settlement_groups`: agrupa una ejecucion operativa completa
- `settlement_legs`: cada movimiento conciliable real (`receipt`, `payout`, `internal_transfer`, `funding`, `fx_conversion`, `fee`)

Esto permite que un mismo documento tenga:

- un pago directo simple, o
- una cadena multi-leg sin mezclar caja real, conciliacion e instrumento

### Ejemplo operativo: Santander -> Global66 -> proveedor

1. Se registra el pago contra la obligacion en `expense_payments`
2. El settlement puede quedar como:
   - `funding` desde Santander
   - `fx_conversion`
   - `payout` o `payout` directo ya asociado al payment
   - `fee`
3. Cada leg puede conciliarse por separado contra el extracto o reporte correcto
4. El documento sigue separado del settlement: `pagado` no significa automaticamente `conciliado`

## Eventos reactivos relevantes

- Registrar un cobro sigue publicando `finance.income_payment.recorded`
- Registrar un pago sigue publicando `finance.expense_payment.recorded`
- Conciliar o desconciliar movimientos ahora publica eventos canónicos de reconciliación de pago y settlement leg
- Cerrar o marcar reconciliado un período publica eventos de conciliación operativa para que otras proyecciones puedan reaccionar sin leer flags manualmente

## Tipo de cambio y resultado cambiario

Greenhouse soporta operaciones en CLP y USD. Cuando se registra un pago en USD:

- El sistema obtiene automáticamente el **dólar observado** del día desde Mindicador
- Calcula el **monto equivalente en CLP** al tipo de cambio del pago
- Compara con el tipo de cambio del documento original para calcular el **resultado cambiario** (FX gain/loss)
- El KPI "Resultado cambiario" en Posición de caja muestra la ganancia o pérdida acumulada por diferencia de tipo de cambio

> Ejemplo: una factura emitida a USD 1.000 cuando el dólar estaba a $900 CLP (= $900.000 CLP). Si el cobro se recibe cuando el dólar está a $950, el monto real es $950.000 CLP. El resultado cambiario es +$50.000 CLP.

## Diferencia con P&L

El P&L (Estado de Resultados) usa **base devengada**: cuenta ingresos y gastos por fecha de factura, independiente de si se cobraron o pagaron. Los modulos de caja muestran la **base de caja**: dinero real que entro y salio. Ambas vistas coexisten y son complementarias.

> Detalle tecnico: ver [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), seccion expense_payments y cash management endpoints.
