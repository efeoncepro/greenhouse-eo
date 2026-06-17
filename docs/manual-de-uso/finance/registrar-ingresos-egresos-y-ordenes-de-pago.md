# Registrar ingresos, egresos, pagos y ordenes de pago

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-06-15 por Codex
> **Modulo:** Finance
> **Rutas en portal:** `/finance/income`, `/finance/expenses`, `/finance/cash-in`, `/finance/cash-out`, `/finance/payment-orders`, `/finance/reconciliation`, `/finance/bank`
> **Documentacion relacionada:** [Operacion Finance end-to-end](../../documentation/finance/operacion-finance-end-to-end.md), [Modulos de Caja](../../documentation/finance/modulos-caja-cobros-pagos.md), [Ordenes de pago](../../documentation/finance/ordenes-de-pago.md), [Pagos a Contractors](pagos-a-contractors.md), [Sugerencias asistidas de conciliacion](sugerencias-asistidas-conciliacion.md)

## Para que sirve

Usa este manual cuando necesites operar Finance desde el portal: registrar una venta/ingreso, registrar una compra/egreso, registrar un cobro o pago real, preparar una orden de pago, aprobarla, marcarla pagada y dejar el movimiento listo para conciliacion bancaria.

El principio que evita casi todos los errores:

```text
Primero existe el documento.
Despues se registra caja real.
Despues se explica el banco.
Despues impacta P&L/cierre con evidencia suficiente.
```

## Antes de empezar

- Necesitas un rol de Finanzas (`finance_admin`, `finance_analyst`) o `efeonce_admin`.
- Si vas a aprobar perfiles de pago u ordenes, debe respetarse maker-checker: quien crea no deberia aprobar cuando el flujo exige aprobacion.
- Ten a mano documento, monto, moneda, fecha, proveedor/cliente, referencia bancaria y cuenta/instrumento cuando aplique.
- No uses SQL directo ni edites snapshots para "arreglar" caja o P&L. Usa el write path del portal o scripts canonicos documentados.
- Si el pago involucra Payroll, contractors, Previred, SII o bancos externos, confirma que el objeto fuente este aprobado/cerrado antes de moverlo a Tesoreria.

## Elegir el camino correcto

| Necesitas... | Donde partir | Resultado esperado |
|---|---|---|
| Registrar una factura/venta emitida | `/finance/income` | Documento de ingreso pendiente de cobro |
| Registrar el dinero recibido por esa venta | Detalle del ingreso o `/finance/cash-in` | Cobro en `income_payments` |
| Registrar una factura/compra/proveedor | `/finance/expenses` | Documento de egreso pendiente de pago |
| Registrar un pago ya ejecutado | Detalle del egreso o `/finance/cash-out` | Pago en `expense_payments` |
| Preparar pago batch con aprobacion | `/finance/payment-orders` | Orden de pago viva |
| Pagar contractors del mes | `/finance/contractor-payments` y luego `/finance/payment-orders` | Payables en orden de pago |
| Revisar si el banco calza | `/finance/reconciliation` | Match, missing, extra o phantom resuelto |
| Revisar saldo por cuenta/instrumento | `/finance/bank` | Saldos, coverage y drift por instrumento |

## Registrar un ingreso

### 1. Crear el documento

1. Abre **Finanzas -> Ventas / Ingresos** (`/finance/income`).
2. Usa la accion de crear ingreso.
3. Completa cliente, fecha, moneda, subtotal, impuestos si aplica, total, tipo de ingreso y referencia externa.
4. Guarda.

Al guardar, Greenhouse:

- valida campos minimos;
- crea el ID mensual `INC-...`;
- calcula snapshot tributario si aplica;
- resuelve FX a CLP cuando la moneda lo requiere;
- deja el ingreso normalmente como **Pendiente** si no tiene cobros asociados.

### 2. Revisar antes de cobrar

Abre el detalle del ingreso y verifica:

- cliente correcto;
- moneda y monto correctos;
- fecha y vencimiento;
- IVA/debito fiscal cuando aplique;
- referencia externa o documento emitido;
- estado de pago.

No registres un cobro si solo existe promesa de pago. El cobro representa dinero recibido.

### 3. Registrar el cobro

1. En el detalle del ingreso, busca **Registrar pago** o la tarjeta de cobro.
2. Ingresa monto recibido.
3. Ingresa fecha efectiva del cobro.
4. Agrega referencia bancaria/comprobante.
5. Selecciona instrumento/cuenta destino si la UI lo solicita.
6. Si hubo fee de recaudacion o FX distinto, usa el registro avanzado.
7. Confirma.

Despues de confirmar:

- se crea un registro en `income_payments`;
- el ingreso cambia a **Parcial** o **Cobrado/Pagado** segun saldo pendiente;
- Cobros (`/finance/cash-in`) muestra la entrada;
- Banco y conciliacion pueden usar ese movimiento como objeto canonico.

### 4. Conciliar el cobro

1. Abre **Finanzas -> Conciliacion**.
2. Busca el movimiento bancario.
3. Revisa sugerencias si existen.
4. Confirma match solo si monto, moneda, fecha y counterparty explican el cobro.
5. Si el banco muestra fee o conversion FX, registra settlement/legs correspondientes en vez de alterar el ingreso base.

## Registrar un egreso

### 1. Crear el documento

1. Abre **Finanzas -> Compras / Egresos** (`/finance/expenses`).
2. Usa la accion de crear egreso.
3. Completa descripcion, proveedor/beneficiario, fecha, vencimiento, moneda, subtotal, impuestos y total.
4. Clasifica tipo de gasto y categoria economica.
5. Si corresponde, indica cliente, servicio, miembro, payroll, impuesto, social security o overhead.
6. Guarda.

Al guardar, Greenhouse:

- valida campos minimos;
- crea el ID mensual del egreso;
- hidrata proveedor si seleccionaste uno existente;
- separa IVA recuperable/no recuperable cuando aplica;
- calcula costo efectivo;
- resuelve FX a CLP;
- deja el egreso normalmente como **Pendiente**.

### 2. Revisar clasificacion

Antes de pagar, revisa:

- proveedor correcto;
- documento y fecha;
- IVA recuperable vs no recuperable;
- categoria economica;
- si es costo directo de cliente/servicio o overhead;
- si el egreso nacio desde Payroll, Nubox, banco o carga manual.

La clasificacion importa porque P&L no debe inferir margen desde textos libres.

### 3. Decidir: pago directo u orden de pago

Usa **pago directo** cuando:

- el pago ya ocurrio y solo estas registrando la caja;
- es una factura puntual;
- no necesita aprobacion batch;
- no pertenece a payroll/contractor run;
- el comprobante bancario ya existe.

Usa **orden de pago** cuando:

- hay una obligation pendiente;
- hay varios beneficiarios o lineas;
- requiere aprobacion maker-checker;
- pertenece a payroll o contractors;
- se va a instruir al banco/processor desde un batch;
- necesitas calendario, artifacts o audit de envio.

## Registrar un pago directo de egreso

1. Abre el detalle del egreso.
2. Busca **Registrar pago**.
3. Ingresa monto pagado.
4. Ingresa fecha efectiva.
5. Agrega referencia externa.
6. Selecciona instrumento de salida si aplica.
7. Si el pago paso por un intermediario, usa settlement avanzado.
8. Registra fee o FX override solo cuando tengas evidencia.
9. Confirma.

Despues de confirmar:

- se crea `expense_payment`;
- el egreso queda **Parcial** o **Pagado** segun saldo;
- Pagos (`/finance/cash-out`) muestra la salida;
- Banco puede rebajar el instrumento;
- Conciliacion puede anclar el pago contra extracto.

## Crear una orden de pago

### 1. Revisar obligaciones disponibles

1. Abre **Finanzas -> Tesoreria -> Ordenes de pago** (`/finance/payment-orders`).
2. Entra a la pestaña **Obligaciones**.
3. Filtra por periodo, beneficiario, moneda o tipo.
4. Revisa bloqueos: perfil de pago faltante, moneda no soportada, route pendiente, source account faltante.

Si una obligacion esta bloqueada por perfil:

1. Abre `/finance/payment-profiles`.
2. Crea o aprueba el perfil activo.
3. Vuelve a la obligation y refresca.

### 2. Crear la orden

1. Selecciona una o mas obligaciones compatibles.
2. Click en **Crear orden**.
3. Verifica titulo, periodo, batch kind, moneda y fecha.
4. Revisa processor, metodo e instrumento fuente si el dialog los muestra.
5. Si el sistema resuelve ruta automaticamente, revisa el resultado.
6. Confirma.

Reglas:

- No mezcles monedas en una misma orden.
- No incluyas obligaciones de distintos procesos si necesitan aprobaciones distintas.
- No uses processor como cuenta de salida si el processor no mantiene saldo propio.

### 3. Aprobar

1. Abre la orden en la pestaña **Ordenes**.
2. Revisa lineas, beneficiarios, montos, moneda y ruta de pago.
3. Si requiere aprobacion, un usuario distinto al creador debe usar **Aprobar**.
4. Si el sistema bloquea maker-checker, pide aprobacion a otra persona autorizada.

Aprobar no paga. Solo deja lista la orden para programar o enviar.

### 4. Programar o enviar

1. Si hay fecha futura, usa **Programar**.
2. Cuando el pago se instruya en banco/processor, usa **Marcar enviada**.
3. Registra referencia externa si existe.

Marcar enviada significa "instruida", no "pagada".

### 5. Marcar pagada

1. Espera confirmacion bancaria o comprobante externo suficiente.
2. Abre la orden.
3. Usa **Marcar pagada**.
4. Informa fecha real y referencia si la UI lo pide.
5. Confirma.

Al marcar pagada, Greenhouse:

- actualiza estado de la orden;
- marca obligations correspondientes como pagadas cuando corresponde;
- emite evento `finance.payment_order.paid`;
- crea/enlaza payments y settlement legs para consumers soportados;
- permite que contractors/payroll muestren downstream pagado;
- deja el movimiento pendiente de conciliacion bancaria.

### 6. Conciliar la orden pagada

1. Abre `/finance/reconciliation`.
2. Busca el movimiento bancario real.
3. Confirma match con la orden/pago generado.
4. Si hay diferencia por fee, FX o intermediario, modela settlement legs.
5. Cuando calce, la orden puede avanzar hacia reconciled/closed segun flujo.

## Flujo especial: contractors

Para contractors no empieces en Payment Orders si el payable todavia no existe.

1. Abre `/finance/contractor-payments`.
2. Crea payable desde envio aprobado o off-cycle si corresponde.
3. Revisa readiness.
4. Resuelve perfil de pago o excepcion.
5. Envia a Finanzas.
6. Ejecuta corrida mensual.
7. Abre la orden creada en `/finance/payment-orders`.
8. Aprueba, envia, marca pagada y concilia.

Recuerda:

- HR aprueba entrega/evidencia.
- Finance crea y prepara payable.
- Payment Orders agrupa y controla tesoreria.
- Banco confirma la salida real.
- Conciliacion explica el extracto.

## Flujo especial: payroll

Payroll calcula. Finance paga.

1. Verifica que el periodo de nomina este calculado/exportado segun proceso HR/Payroll.
2. Revisa obligations generadas para el periodo.
3. Crea orden de pago desde obligations.
4. Resuelve perfiles bloqueados.
5. Aprueba con maker-checker.
6. Envia/paga con evidencia bancaria.
7. Conciliacion valida el movimiento bancario.

No recalcules montos de payroll en Finance. Si el monto esta mal, vuelve al flujo de Payroll o reliquidacion.

## Que hace automaticamente el sistema

- Genera IDs mensuales para income/expenses.
- Calcula tax snapshots de venta/compra.
- Separa IVA recuperable y no recuperable.
- Resuelve FX a CLP cuando corresponde.
- Recalcula pagado, pendiente y estado parcial/pagado.
- Publica eventos outbox para proyecciones.
- Mantiene locks para que una obligation no viva en dos ordenes activas.
- Resuelve rutas de pago desde perfiles activos.
- Enmascara datos sensibles de perfiles.
- Valida policy processor/source account.
- Agrupa contractors por moneda en corridas mensuales.
- Rematerializa saldos y muestra drift/coverage.
- Sugiere conciliaciones cuando la capacidad esta habilitada.
- Alimenta P&L operativo desde snapshots y serving layers.

## Que siempre decide el operador

- Si el documento representa un hecho real y no duplicado.
- Si el dinero efectivamente entro o salio.
- Que referencia bancaria usar.
- Que instrumento explica la entrada/salida cuando no viene resuelto.
- Si aceptar o rechazar una sugerencia de conciliacion.
- Si una excepcion de perfil/pago/override esta justificada.
- Cuando aprobar una orden.
- Cuando marcar una orden como enviada.
- Cuando marcar una orden como pagada.
- Si un periodo esta listo para cierre cuando hay warnings operativos.

## Estados que vas a ver

| Estado | Significado practico |
|---|---|
| Pendiente | Existe documento u obligacion, falta pago/cobro |
| Parcial | Hay pagos/cobros, pero queda saldo |
| Pagado/Cobrado | El ledger cubre el saldo del documento |
| Por conciliar | Hay caja registrada, falta anclar banco |
| Conciliado | El banco explica el movimiento |
| Pendiente aprobacion | Orden creada, falta maker-checker |
| Aprobada | Lista para programar/enviar |
| Programada | Tiene fecha de ejecucion |
| Enviada | Fue instruida al banco/processor |
| Pagada | Hay confirmacion de pago, falta o no conciliacion |
| Cerrada | Flujo conciliado/cerrado segun periodo |
| Bloqueada | Falta perfil, fuente, datos o aprobacion |
| Cancelada | No debe ejecutarse; libera locks si aplica |

## Problemas comunes

### "El documento dice pagado pero no aparece en caja"

Busca el historial de pagos/cobros. Si es legacy, usa los scripts canonicos de auditoria/backfill documentados para payment ledgers. No edites el estado documental a mano.

### "La orden no deja aprobar"

Puede ser maker-checker: el creador no aprueba su propia orden. Pide a otro usuario con capability de aprobacion.

### "No aparece ruta de pago"

Revisa `/finance/payment-profiles`. Puede faltar perfil activo, estar pendiente de aprobacion, tener moneda no soportada o beneficiario no soportado.

### "Deel aparece como processor, pero no quiero rebajar Deel"

Correcto. Processor no siempre es fuente de fondos. Revisa el `source_account_id`: si Deel se financia con Santander, se rebaja Santander y Deel queda como processor/counterparty.

### "El banco muestra un monto distinto"

Revisa fee, FX, intermediario o pago parcial. No alteres el documento base para forzar el match; modela settlement legs.

### "P&L no refleja un gasto"

Revisa si el gasto tiene categoria economica, costo efectivo, scope directo, periodo correcto, estado de cierre y materializacion. P&L lee serving layers, no textos libres.

### "La corrida contractor preparo ordenes, pero nadie recibio pago"

Es esperado. La corrida prepara ordenes; aun faltan aprobar, enviar, marcar pagada y conciliar.

## Que no hacer

- No registrar cobros/pagos si el dinero no se movio.
- No crear ingresos o egresos para transferencias internas.
- No usar payment orders para arreglar pagos historicos ya ejecutados si basta registrar el pago canonico.
- No mezclar monedas en una orden.
- No revelar cuentas completas sin motivo.
- No aprobar tu propia orden cuando el flujo exige maker-checker.
- No tratar conciliacion como una formalidad: es la evidencia de banco.
- No cerrar periodos con drift critico sin documentar excepcion.

## Referencias tecnicas utiles

- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/income/[id]/payments/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/[id]/payments/route.ts`
- `src/app/api/admin/finance/payment-orders/route.ts`
- `src/lib/finance/payment-orders/`
- `src/lib/finance/payments/`
- `src/views/greenhouse/finance/drawers/CreateIncomeDrawer.tsx`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `src/views/greenhouse/finance/components/PaymentRegistrationCard.tsx`
