# Caja, cobros, pagos y liquidaciones

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-06-15 por Codex
> **Modulo:** Finance
> **Rutas en portal:** `/finance/cash-in`, `/finance/cash-out`, `/finance/bank`, `/finance/reconciliation`
> **Documentacion relacionada:** [Operacion Finance end-to-end](../../documentation/finance/operacion-finance-end-to-end.md), [Modulos de Caja](../../documentation/finance/modulos-caja-cobros-pagos.md), [Registrar ingresos, egresos, pagos y ordenes de pago](registrar-ingresos-egresos-y-ordenes-de-pago.md)

## Para que sirve

Usa este manual para operar caja real: registrar dinero recibido, registrar dinero pagado, revisar que esos movimientos tengan instrumento financiero, entender settlement legs y dejar los movimientos listos para conciliacion bancaria.

La regla principal:

```text
Income/Expense explica el documento.
Cash-in/Cash-out explica el dinero real.
Settlement explica el camino del dinero.
Reconciliation explica el extracto bancario.
```

## Donde vive cada cosa

| Necesitas revisar | Ruta | Runtime principal |
|---|---|---|
| Cobros recibidos | `/finance/cash-in` | `greenhouse_finance.income_payments` + `income_payments_normalized` |
| Pagos ejecutados | `/finance/cash-out` | `greenhouse_finance.expense_payments` + `expense_payments_normalized` |
| Saldos por instrumento | `/finance/bank` | `account_balances`, `settlement_legs`, ledgers de pago |
| Extracto vs sistema | `/finance/reconciliation` | `bank_statement_rows`, anchors canonicos |
| Instrumentos disponibles | `/admin/payment-instruments` | `accounts` + catalogo provider/admin |

## Registrar un cobro

1. Abre `/finance/cash-in`.
2. Usa **Registrar cobro**.
3. Selecciona cliente con ingresos pendientes o parciales.
4. Selecciona el documento de ingreso.
5. Revisa el monto pendiente sugerido.
6. Ajusta monto solo si es pago parcial o diferencia real.
7. Informa fecha efectiva de recepcion.
8. Agrega referencia bancaria, comprobante o identificador externo.
9. Selecciona metodo de pago.
10. Selecciona instrumento/cuenta destino cuando corresponda.
11. Si el cobro no es CLP, revisa tipo de cambio; usa override solo con evidencia.
12. Registra fee si existe costo de recaudacion.
13. Confirma.

Al confirmar, Greenhouse crea una fila en `income_payments`, recalcula pagado/pendiente del ingreso y expone el movimiento en `/finance/cash-in`. Si se informo instrumento, Banco puede reflejarlo en saldos y Conciliacion puede usarlo como candidato canonico.

## Registrar un pago

1. Abre `/finance/cash-out`.
2. Usa **Registrar pago**.
3. Selecciona proveedor o beneficiario.
4. Selecciona el documento de egreso.
5. Revisa monto pendiente.
6. Informa fecha efectiva de salida.
7. Agrega referencia bancaria o comprobante.
8. Selecciona metodo de pago.
9. Selecciona el instrumento desde el cual se pago.
10. Si el pago paso por intermediario, usa `settlementMode` adecuado.
11. Si hay funding separado, selecciona instrumento de funding.
12. Registra fee o FX override solo con evidencia.
13. Confirma.

Al confirmar, Greenhouse crea una fila en `expense_payments`, recalcula pagado/pendiente del egreso y expone el movimiento en `/finance/cash-out`. Si aplica, el sistema puede crear o enlazar settlement legs para explicar el recorrido del dinero.

## Entender `amount` vs `amountClp`

Los listados de caja muestran monto nativo y resumen en CLP. Para saldos, KPIs y P&L operativo, usa los campos normalizados:

- `income_payments_normalized.payment_amount_clp`;
- `expense_payments_normalized.payment_amount_clp`.

No multipliques manualmente `payment.amount` por el FX del documento si el payment ya esta en CLP. Ese patron ya causo KPIs inflados en el pasado y esta documentado como anti-patron.

## Asignar instrumento a pagos existentes

Cuando un cobro o pago fue registrado sin instrumento, Banco mostrara coverage incompleta.

1. Abre `/finance/bank`.
2. Revisa la seccion de movimientos sin instrumento.
3. Usa el flujo de asignacion.
4. Selecciona el instrumento correcto.
5. Selecciona los cobros/pagos que pertenecen a ese instrumento.
6. Confirma.

Esto usa `POST /api/finance/bank` para asignar el `payment_account_id` a ledgers existentes. No crea un nuevo pago y no cambia el documento base.

## Transferencia interna

Usa transferencia interna cuando el dinero se mueve entre instrumentos propios: por ejemplo, Santander CLP a Global66 CLP, o una conversion entre una cuenta CLP y una cuenta USD propia.

1. Abre `/finance/bank`.
2. Usa **Transferencia interna**.
3. Selecciona instrumento origen.
4. Selecciona instrumento destino.
5. Ingresa monto y moneda de origen.
6. Ingresa fecha efectiva.
7. Agrega referencia y notas.
8. Si las monedas son distintas, informa FX override solo con evidencia.
9. Confirma.

Greenhouse crea un `settlement_group` con `group_direction='internal'` y `mode='internal_transfer'`. Luego inserta `settlement_legs`:

- salida del instrumento origen;
- entrada al instrumento destino;
- legs de `fx_conversion` si las monedas difieren.

No se crea `income` ni `expense`. Una transferencia interna no es ingreso, gasto ni revenue.

## Liquidaciones y settlement legs

Algunos pagos no son una sola fila simple. Pueden tener:

- cobro/pago principal;
- fee del procesador;
- conversion FX;
- funding desde otra cuenta;
- transferencia interna previa;
- intermediario operativo.

Para esos casos, usa la orquestacion de settlement desde el pago o desde la superficie que la expone.

Tipos de leg frecuentes:

| Leg | Uso |
|---|---|
| `receipt` | Entrada de dinero recibida |
| `payout` | Salida de dinero pagada |
| `funding` | Cuenta que financia un processor/intermediario |
| `fee` | Costo bancario, gateway o processor |
| `fx_conversion` | Conversion entre monedas |
| `internal_transfer` | Movimiento entre instrumentos propios |

La conciliacion puede anclar un row bancario a un payment o a un settlement leg. Si el banco muestra el fee separado, no fuerces el match contra el documento completo: registra o usa el leg correspondiente.

## Que hace automatico Greenhouse

- Lee cobros desde `income_payments`.
- Lee pagos desde `expense_payments`.
- Usa readers normalizados para CLP.
- Calcula resumen de cobros, pagos y pendientes por periodo.
- Expone movimientos no conciliados.
- Muestra instrumento y provider cuando existen.
- Rematerializa saldos mediante procesos canonicos, no dentro de la consulta de Banco.
- Publica eventos outbox cuando el write path lo contempla.

## Que decide el operador

- Si el dinero realmente entro o salio.
- Que documento queda asociado al movimiento.
- Que fecha efectiva corresponde.
- Que referencia bancaria o comprobante usar.
- Que instrumento explica la entrada o salida.
- Si un fee/FX/intermediario debe modelarse como settlement.
- Si un movimiento queda listo para conciliacion.

## Problemas comunes

### "El pago aparece en cash-out pero no en Banco"

Revisa si tiene instrumento asignado. Si no, usa la asignacion desde `/finance/bank`. Si ya tiene instrumento, revisa freshness de saldos y materializacion.

### "El monto CLP no coincide con el documento"

Puede ser pago en moneda distinta, pago parcial, fee, FX override o un payment CLP contra documento USD. Revisa el payment normalizado antes de recalcular manualmente.

### "Pague con processor, pero se debe rebajar una tarjeta"

Processor no siempre es cuenta. Registra `source_account_id` o settlement/funding leg correcto. El processor queda como rail o counterparty, no como saldo propio si no mantiene fondos.

### "Quiero registrar un traspaso entre cuentas"

Usa transferencia interna. No crees ingreso ni egreso.

### "El banco trae un movimiento sin documento"

No inventes un documento para cuadrar. Primero clasifica si es fee, transferencia, factoring, ajuste, gasto real, cobro real, extra o phantom. Luego usa el write path correcto.

## Que no hacer

- No marcar caja si solo existe una promesa de pago.
- No editar estados de documentos para simular cobro/pago.
- No crear ingresos o egresos para transferencias internas.
- No tratar `amount` nativo como CLP si la moneda no lo es.
- No usar SQL directo para insertar pagos si existe ruta de portal/API.
- No cerrar conciliacion con movimientos sin instrumento cuando el instrumento es obligatorio para explicar saldo.

## Referencias tecnicas utiles

- `src/app/api/finance/cash-in/route.ts`
- `src/app/api/finance/cash-out/route.ts`
- `src/app/api/finance/bank/route.ts`
- `src/app/api/finance/bank/transfer/route.ts`
- `src/views/greenhouse/finance/drawers/RegisterCashInDrawer.tsx`
- `src/views/greenhouse/finance/drawers/RegisterCashOutDrawer.tsx`
- `src/views/greenhouse/finance/drawers/InternalTransferDrawer.tsx`
- `src/views/greenhouse/finance/drawers/SettlementOrchestrationDrawer.tsx`
- `src/lib/finance/internal-transfers.ts`
