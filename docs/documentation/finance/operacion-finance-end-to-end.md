> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-06-15 por Codex
> **Modulo:** Finance
> **Rutas principales:** `/finance`, `/finance/income`, `/finance/expenses`, `/finance/cash-in`, `/finance/cash-out`, `/finance/bank`, `/finance/reconciliation`, `/finance/payment-orders`, `/finance/intelligence`, `/finance/contractor-payments`, `/finance/payment-profiles`, `/admin/payment-instruments`
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md), [GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md), [GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md), [GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md), [GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md](../../architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md)
> **Manuales de uso:** [Registrar ingresos, egresos, pagos y ordenes de pago](../../manual-de-uso/finance/registrar-ingresos-egresos-y-ordenes-de-pago.md), [Caja, cobros, pagos y liquidaciones](../../manual-de-uso/finance/caja-cobros-pagos-y-liquidaciones.md), [Conciliacion bancaria operativa](../../manual-de-uso/finance/conciliacion-bancaria-operacion.md), [Instrumentos de pago y Banco](../../manual-de-uso/finance/instrumentos-de-pago-y-banco.md)

# Operacion Finance end-to-end

## Para que sirve este documento

Este documento explica como funciona Finance en Greenhouse de punta a punta: que modulo registra cada hecho, que hace el sistema automaticamente, que debe ejecutar un operador y como se conectan documentos, caja, banco, conciliacion, ordenes de pago y P&L operativo.

La regla central es simple:

```text
Documento != caja != banco != P&L != contabilidad legal
```

Greenhouse hoy es la verdad operativa para documentos financieros, pagos, tesoreria, conciliacion, costos, margen y cierre interno. No es un libro legal de partida doble ni reemplaza a Nubox/SII para contabilidad tributaria formal.

## Mapa de modulos actuales

| Surface | Ruta | Que responde | Source of truth principal |
|---|---|---|---|
| Dashboard Finance | `/finance` | Estado general de finanzas operativas | Lectores agregados finance/cost intelligence |
| Ventas / Ingresos | `/finance/income` | Que facturas/ingresos existen y cuanto falta cobrar | `greenhouse_finance.income` |
| Compras / Egresos | `/finance/expenses` | Que obligaciones/proveedores/gastos existen y cuanto falta pagar | `greenhouse_finance.expenses` |
| Cobros | `/finance/cash-in` | Que dinero entro realmente | `greenhouse_finance.income_payments` |
| Pagos | `/finance/cash-out` | Que dinero salio realmente | `greenhouse_finance.expense_payments` |
| Banco / Tesoreria | `/finance/bank` | Que saldo e instrumento real explica la caja | `account_balances`, `settlement_legs`, payment ledgers |
| Conciliacion | `/finance/reconciliation` | Que movimientos de banco estan explicados por objetos canonicos | bank statement rows + anchors canonicos |
| Ordenes de pago | `/finance/payment-orders` | Que obligaciones se agruparon, aprobaron, enviaron y pagaron | `payment_orders`, `payment_order_lines`, `payment_obligations` |
| Perfiles de pago | `/finance/payment-profiles` | Donde se paga a una persona/beneficiario y si esta aprobado | `beneficiary_payment_profiles` |
| Instrumentos de pago | `/admin/payment-instruments` | Que cuentas, tarjetas, fintechs, processors o cuentas internas pueden usarse para ruteo, banco y conciliacion | `greenhouse_finance.accounts`, `payment_provider_catalog`, audit logs |
| Pagos a contractors | `/finance/contractor-payments` | Que payables de contractors estan listos para Finanzas | contractor payables + payment obligations |
| Economia operativa | `/finance/intelligence` | Margen/P&L/cierre operativo por periodo y scope | `period_closure_status`, `operational_pl_snapshots` |
| Clientes / Economics | `/finance/clients`, `/finance/clients/[id]` | Rentabilidad y relacion financiera por cliente | income/expenses + serving economics |
| Productos, quotes, contratos | `/finance/products`, `/finance/quotes`, `/finance/contracts` | Oferta comercial y quote-to-cash | dominios comerciales sobre rutas Finance legacy |

## Evidencia runtime revisada el 2026-06-15

Esta version fue reconciliada contra codigo y DB real en modo solo lectura. No se debe tratar como un resumen aspiracional.

### Superficies y APIs verificadas

- `/finance/cash-in` usa `GET /api/finance/cash-in` y el drawer `RegisterCashInDrawer`; registra cobros contra `income_payments`.
- `/finance/cash-out` usa `GET /api/finance/cash-out` y el drawer `RegisterCashOutDrawer`; registra pagos contra `expense_payments`.
- `/finance/bank` usa `GET /api/finance/bank`; lee snapshot materializado y no rematerializa saldos inline.
- `/finance/reconciliation` usa `/api/finance/reconciliation` y subrutas de `statements`, `candidates`, `match`, `unmatch`, `exclude`, `auto-match` e `intelligence`.
- `/finance/payment-orders` usa `/api/admin/finance/payment-obligations`, `/payment-orders`, KPIs, eventos y reconciliacion.
- `/admin/payment-instruments` usa `/api/admin/payment-instruments`; gobierna instrumentos reales con catalogo de providers, readiness, ruteo, datos sensibles enmascarados y audit log.
- Transferencias internas usan `/api/finance/bank/transfer` y crean `settlement_groups`/`settlement_legs`, no ingresos ni egresos.

### Tablas y vistas verificadas

En `greenhouse_finance` existen, entre otras: `income`, `income_payments`, `income_payments_normalized`, `expenses`, `expense_payments`, `expense_payments_normalized`, `accounts`, `account_balances`, `account_balances_monthly`, `bank_statement_rows`, `reconciliation_periods`, `reconciliation_ai_suggestions`, `settlement_groups`, `settlement_legs`, `payment_obligations`, `payment_orders`, `payment_order_lines`, `payment_order_artifacts`, `payment_order_processor_funding_policies`, `beneficiary_payment_profiles`, `beneficiary_payment_profile_audit_log`, `payment_provider_catalog`, `suppliers`, `purchase_orders`, `service_entry_sheets`, `shareholder_accounts`, `shareholder_account_movements`, `factoring_operations`, `vat_ledger_entries` y `vat_monthly_positions`.

En otros schemas relacionados se verificaron `greenhouse_hr.contractor_payables` y serving layers como `greenhouse_serving.operational_pl_snapshots`, `period_closure_status`, `commercial_cost_attribution` y `member_capacity_economics`.

### Estado real observado

La DB contiene datos operativos para documentos, caja, instrumentos, saldos, ordenes, perfiles, contractors y serving P&L. Tambien muestra que algunas capacidades estan en estados incipientes o con baja poblacion, por ejemplo `bank_statement_rows` y `reconciliation_ai_suggestions`. Nexa debe explicar estas fronteras con honestidad: si una capacidad existe como API/UI pero el ambiente tiene pocos datos, no debe inventar ejemplos ni afirmar ejecucion masiva.

## Capas y responsabilidades

### 1. Documento financiero

Un documento financiero representa una obligacion o derecho economico. No prueba por si solo que el dinero entro o salio.

- **Ingreso / venta:** se registra en `greenhouse_finance.income`.
- **Egreso / compra:** se registra en `greenhouse_finance.expenses`.
- **Documento tributario externo:** Nubox/SII siguen siendo fuente tributaria cuando aplica.
- **Estado documental:** `pending`, `partial`, `paid`, etc. se deriva de pagos asociados, no debe inventarse manualmente.

### 2. Ledger de caja

El ledger de caja representa dinero efectivamente recibido o pagado.

- **Cobro:** `income_payments`.
- **Pago:** `expense_payments`.
- **Evento:** registrar pago/cobro dispara eventos outbox como `finance.income_payment.recorded` o `finance.expense_payment.recorded`.
- **Pagos parciales:** varios pagos pueden liquidar un mismo documento.

### 3. Settlement y banco

El settlement explica como se movio el dinero entre instrumentos reales.

- Un pago puede salir directo desde una cuenta, tarjeta, fintech o wallet.
- Un pago puede pasar por un intermediario operativo.
- Fees, FX y conversiones se modelan como settlement legs, no como columnas paralelas inventadas.
- Banco/Tesoreria lee instrumentos reales y saldos materializados, no flags de documentos.

### 4. Conciliacion

Conciliar significa unir un movimiento bancario con su objeto canonico: cobro, pago, orden, transferencia interna, fee, factoring, ajuste o phantom controlado.

La conciliacion no crea la verdad comercial. Valida que el banco refleje la operacion esperada.

### 5. Management accounting / P&L operativo

Finance y Cost Intelligence consolidan ingresos, costos, payroll, capacity, attribution y cierre para explicar margen operativo.

- Finance posee documentos, caja, banco y conciliacion.
- Cost Intelligence consolida periodos, P&L y readiness de cierre.
- Management Accounting gobierna cierre, variance, planificacion y lectura ejecutiva.
- En runtime actual existen serving layers de costo como `member_capacity_economics`, `commercial_cost_attribution` y `operational_pl_snapshots`.
- Member Loaded Cost Model es la especificacion forward-going para evolucionar el costo cargado por miembro; no debe presentarse como si toda su dimension completa ya estuviera operable en Finance.

## Ciclo de vida de un ingreso

```text
Cliente / quote / contrato
  -> documento de ingreso
  -> cobro registrado
  -> settlement / cuenta destino
  -> conciliacion bancaria
  -> revenue en P&L operativo
  -> cierre de periodo
```

### Registro del ingreso

El operador registra o importa un ingreso en `/finance/income`. El sistema valida campos minimos, resuelve contexto de cliente/tenant, calcula snapshot tributario cuando aplica, resuelve tipo de cambio CLP si la moneda no es CLP y crea un ID mensual estable.

Campos funcionales relevantes:

- cliente;
- fecha de factura/documento;
- moneda;
- subtotal, IVA/impuestos y total;
- tipo de ingreso;
- referencia comercial o documento externo;
- due date o condicion de pago cuando aplique.

### Que hace automaticamente el sistema

- Genera un ID tipo `INC-...` usando secuencia mensual.
- Persiste el documento en Postgres como source of truth.
- Usa fallback BigQuery solo para lectura legacy o write fallback controlado por flag cuando corresponda.
- Inicializa `paymentStatus='pending'` si no se informa otro estado valido.
- Calcula campos tributarios de venta con el helper canonico de income tax.
- Resuelve FX a CLP si la moneda requiere equivalencia.
- Publica eventos para proyecciones downstream cuando el write path lo contempla.

### Que hace el operador

- Confirma que el cliente, monto, moneda y fecha sean correctos.
- Registra el cobro cuando el dinero realmente entra.
- Selecciona instrumento/cuenta destino cuando el flujo lo permite.
- No marca un documento como cobrado si no existe pago real.
- Revisa conciliacion bancaria posterior.

### Registro del cobro

El cobro se registra desde el detalle del ingreso o desde la superficie de caja. El operador informa monto, fecha, referencia y, si aplica, instrumento, fee o FX override. El sistema crea una fila en `income_payments`, recalcula pagado/pendiente y actualiza el estado del documento a pendiente/parcial/cobrado.

## Ciclo de vida de un egreso

```text
Proveedor / payroll / impuesto / gasto operativo
  -> documento de egreso
  -> clasificacion economica, fiscal y operacional
  -> pago directo o obligacion para orden de pago
  -> settlement / cuenta origen
  -> conciliacion bancaria
  -> costo en P&L operativo
  -> cierre de periodo
```

### Registro del egreso

El operador registra un egreso en `/finance/expenses`, o el sistema lo materializa desde otro dominio autorizado como Payroll, contractors, Nubox sync o procesos reactivos.

Campos funcionales relevantes:

- descripcion;
- proveedor o beneficiario;
- fecha de documento y vencimiento;
- moneda, subtotal, impuestos y total;
- tipo de gasto;
- categoria economica;
- scope directo: cliente, miembro, servicio o overhead;
- metodo de pago / instrumento / provider cuando se conoce;
- referencia externa del documento.

### Que hace automaticamente el sistema

- Genera un ID mensual estable.
- Valida monto, moneda y campos minimos.
- Hidrata nombre de proveedor desde `supplierId` cuando existe.
- Calcula snapshot tributario de compra: IVA recuperable/no recuperable y costo efectivo.
- Resuelve FX a CLP.
- Inicializa estado de pago pendiente si no hay pago asociado.
- Permite bulk create transaccional: si una fila invalida falla, el lote no se crea parcialmente.
- Expone campos de source type para distinguir gasto manual, payroll, social security, tax, sync externo o bank statement.
- Alimenta Cost Intelligence y attribution con la semantica del gasto, sin que P&L tenga que adivinar desde nombres.

### Que hace el operador

- Clasifica bien el gasto: proveedor, fiscal, payroll, financiero, bancario, overhead o costo directo.
- Decide si corresponde pago directo o una orden de pago.
- Registra el pago solo cuando existe ejecucion real.
- No usa `expense_type` como si fuera P&L; para margen importan costo efectivo, categoria economica y attribution.
- Corrige categorias o allocations cuando el sistema muestra drift o coverage incompleta.

### Registro del pago

El pago se registra contra el egreso. Puede ser directo o via intermediario. El operador informa monto, fecha, referencia externa, instrumento de funding, fee, moneda y FX override si aplica. El sistema crea `expense_payments`, settlement legs y recalcula pagado/pendiente.

## Diferencia entre pago directo y orden de pago

| Caso | Usar pago directo | Usar orden de pago |
|---|---|---|
| Ya se pago una factura puntual y solo falta registrar caja | Si | No necesariamente |
| Pago batch de payroll o contractors | No | Si |
| Pago requiere aprobacion maker-checker | No | Si |
| Varios beneficiarios/obligaciones se agrupan | No | Si |
| Pago por tarjeta ya ejecutado | Si | No, salvo que haya obligation previa |
| Pago a processor con cuenta de funding real separada | Depende | Si hay workflow de tesoreria |
| Ajuste historico o backfill controlado | Usar write path canonico | Solo si representa orden viva |

La regla practica:

- **Pago directo** registra una salida ya ocurrida contra un documento.
- **Orden de pago** prepara, aprueba, envia y luego registra la salida real de una obligacion.

## Ordenes de pago

Payment Orders es el runtime entre una obligacion financiera y el pago real. No reemplaza al banco y no paga automaticamente.

```text
payment_obligation
  -> payment_order draft/pending_approval
  -> approved
  -> scheduled/submitted
  -> paid
  -> reconciled/closed
```

### Que puede crear obligaciones

- Payroll exportado.
- Payables de contractors enviados a Finanzas.
- Obligaciones manuales o futuras integraciones aprobadas.
- Otros consumers que respeten el contrato `payment_obligations`.

### Que hace automaticamente el sistema

- Bloquea que una obligation viva este en dos ordenes activas al mismo tiempo.
- Agrupa ordenes por moneda; V1 no acepta ordenes multimoneda.
- Resuelve ruta de pago desde `beneficiary_payment_profiles` cuando el caller no entrega processor/metodo.
- Snapshot de routing por linea para auditoria.
- Aplica maker-checker si `requireApproval=true`.
- Valida processor/source account con policy server-side.
- Al marcar pagada, emite `finance.payment_order.paid`.
- Para payroll/contractor consumers soportados, el cascade crea o enlaza payments/legs y marca downstream como paid.

### Que hace el operador

- Selecciona obligaciones correctas.
- Revisa beneficiarios, moneda, neto, fechas y fuente de funding.
- Aprueba con usuario distinto al creador cuando corresponde.
- Sube/instruye el pago en banco o processor externo.
- Marca enviada cuando el pago fue instruido.
- Marca pagada solo cuando existe confirmacion bancaria o comprobante externo suficiente.
- Concilia despues contra banco.

### Processor no es lo mismo que fuente de fondos

Payment Orders distingue:

- `processor_slug`: rail/procesador operativo (`deel`, `global66`, etc.).
- `payment_method`: metodo visible.
- `source_account_id`: instrumento real que financia la salida.

Ejemplo: Deel puede ejecutar el payout, pero si se financia con tarjeta Santander Corp, la salida real rebaja Santander, no Deel. Si el processor no mantiene saldo propio, queda como counterparty/intermediario auditable.

## Perfiles de pago

Los perfiles de pago resuelven donde pagar a un beneficiario. Son sensibles y versionados.

Estados principales:

- `draft`;
- `pending_approval`;
- `active`;
- `superseded`;
- `cancelled`.

Reglas:

- Solo puede existir un perfil activo por beneficiario/moneda.
- Aprobar un perfil nuevo supersede el activo anterior.
- Datos sensibles se muestran enmascarados por defecto.
- Revelar cuenta completa requiere permiso, motivo y audit log.
- El creador no debe aprobar su propio perfil cuando maker-checker aplica.

Sin perfil activo, una obligation puede quedar bloqueada como `profile_missing` o `profile_pending_approval`.

## Contractors

El flujo contractor separa HR, payable, orden y banco.

```text
Contractor sube boleta/evidencia
  -> HR aprueba envio
  -> Finance crea payable
  -> readiness / perfil de pago / excepciones
  -> ready_for_finance
  -> payment obligation
  -> corrida mensual crea payment order
  -> aprobacion / envio / pago
  -> payable paid + comprobante
  -> conciliacion bancaria
```

Reglas:

- Aprobar un envio HR no paga.
- Crear payable no paga.
- Enviar a Finanzas prepara el puente.
- La corrida mensual prepara ordenes, no las aprueba ni paga.
- Marcar pagada la orden habilita el cascade hacia contractor payable.
- La retencion SII no viaja al contractor; queda como pasivo separado.

## Payroll y pagos de nomina

Payroll calcula entradas y exporta obligaciones. Finance no recalcula payroll.

Cuando una orden de pago de payroll queda `paid`, el consumer reactivo puede crear `expense_payment` y `settlement_leg` por linea soportada. El reader de estado downstream es read-only para Payroll: muestra si cada entrada esta sin obligacion, esperando orden, aprobada, enviada, pagada sin conciliar, conciliada, cerrada o bloqueada por perfil.

Reglas:

- Payroll mantiene ownership del calculo.
- Finance mantiene ownership de pago, settlement y conciliacion.
- Reliquidaciones crean deltas; no se sobreescribe historico silenciosamente.

## Conciliacion bancaria

Conciliacion responde si el banco esta explicado.

Estados conceptuales:

- **Correcto:** banco y objeto canonico calzan.
- **Phantom + canonico:** existe row bancario y existe objeto canonico, pero aun no estan anclados.
- **Missing:** el sistema esperaba un movimiento que no aparece en banco.
- **Extra:** el banco trae un movimiento sin objeto canonico claro.

El operador confirma matches sugeridos, resuelve phantoms y no fuerza matches si montos, fechas, moneda o counterparty no explican el movimiento.

## Economia operativa y P&L

El P&L operativo no es una suma ingenua de facturas menos pagos.

Consume:

- ingresos operativos;
- gastos efectivos y clasificados;
- costo laboral desde Payroll/Team Capacity;
- attribution comercial;
- overhead y costo cargado;
- estado de cierre de periodo;
- ajustes de FX, fees y financieros cuando aplican.

Reglas:

- Cost Intelligence no registra ingresos ni gastos; lee Finance.
- Finance no recalcula payroll ni member loaded cost.
- El cierre de periodo congela snapshots operativos y muestra drift si aparece informacion retroactiva.
- Si faltan datos, el sistema debe degradar honestamente, no devolver ceros silenciosos.

## Automatico vs operador

| Area | Automatico | Operador |
|---|---|---|
| Ingresos | ID mensual, validacion, tax snapshot, FX, estado inicial, pagos agregados | Crear/importar ingreso, validar cliente/monto, registrar cobro real, revisar conciliacion |
| Egresos | ID mensual, tax snapshot, IVA recuperable/no recuperable, FX, supplier hydration, bulk transaccional | Crear/importar egreso, clasificar, asignar scope, registrar pago o enviar a orden |
| Caja | Recalculo pagado/pendiente, eventos outbox, rematerializacion de saldos | Informar monto/fecha/referencia/instrumento, resolver fees/FX override |
| Banco | Saldos por instrumento, coverage, drift, rolling rematerialization | Asignar instrumentos, cerrar periodos, resolver discrepancias |
| Conciliacion | Sugerencias, matching candidates, anchors, estados de drift | Confirmar/rechazar matches, resolver missing/extra/phantom |
| Ordenes de pago | Locks de obligation, routing, policy processor/source, outbox, cascade paid | Crear orden, aprobar, programar/enviar, marcar pagada, cancelar con motivo |
| Perfiles de pago | Versioning, enmascaramiento, audit log, active uniqueness | Crear, aprobar, cancelar, revelar sensible con motivo |
| Contractors | Bridge payable->obligation, corrida mensual por moneda, cascade paid | Crear payable, resolver readiness, iniciar corrida, operar orden |
| P&L | Materializaciones, readiness, serving snapshots | Revisar degraded states, corregir clasificacion, cerrar/reabrir periodo si corresponde |

## Lo que Nexa debe poder responder cuando tenga estos manuales

Con este paquete, Nexa deberia poder explicar:

- como registrar un ingreso;
- como registrar un egreso;
- cuando registrar un pago directo;
- cuando crear una orden de pago;
- que pasos son automaticos y cuales requieren operador;
- por que marcar una orden como pagada no equivale a conciliar;
- por que un processor no siempre es la cuenta que se rebaja;
- como llega un gasto o ingreso al P&L;
- que hacer si falta perfil de pago, categoria, instrumento o conciliacion.

La ingesta al corpus Knowledge/Nexa queda fuera de este documento y debe ejecutarse en una task separada.

## Anti-patrones

- Marcar documentos como pagados sin ledger de pago/cobro.
- Tratar una transferencia interna como ingreso o gasto.
- Usar processor como banco si no mantiene saldo propio.
- Crear endpoints ad hoc que escriben tablas finance sin pasar por helpers canonicos.
- Corregir P&L editando snapshots materializados a mano.
- Recalcular payroll desde Finance.
- Saltarse maker-checker en perfiles de pago u ordenes.
- Cerrar periodo si hay movimientos sin instrumento, conciliacion critica pendiente o coverage degradada.
- Usar SQL directo para backfills si existe write path canonico.

## Documentacion relacionada

- [Modulos de Caja — Cobros, Pagos, Banco, Cuenta Accionista y Posicion de Caja](modulos-caja-cobros-pagos.md)
- [Ordenes de pago](ordenes-de-pago.md)
- [Perfiles de pago y beneficiarios](perfiles-de-pago-beneficiarios.md)
- [Pagos a Contractors — Workbench de Finanzas](pagos-a-contractors.md)
- [Conciliacion bancaria](conciliacion-bancaria.md)
- [Distribucion de costos para P&L operativo](distribucion-costos-pnl.md)
- [Categoria economica de pagos](categoria-economica-de-pagos.md)
- [Saldos de cuenta y consistencia FX](saldos-de-cuenta-fx-consistencia.md)
- [IVA en Compras — Credito Fiscal vs Costo Efectivo](iva-compras-recuperabilidad.md)
- [Libro IVA Mensual](libro-iva-posicion-mensual.md)
