# Contratistas — Flujo de Pago Completo (end-to-end) y Convergencia con la Nómina Mensual

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-05-31 por Claude (revisión exhaustiva del backend, sin inferencias)
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md) · [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)

> **Actualización 2026-09-03:** el snapshot inicial de mayo quedó superado por las entregas de Finance workbench, calendario y corrida mensual. Este documento describe los contratos disponibles en código; flags y liquidación efectiva se verifican contra el runtime antes de ejecutar. El manual operativo vigente es [Pagos a contractors](../../manual-de-uso/finance/pagos-a-contractors.md).

## Para qué sirve

Un contratista (honorarios, freelance, internacional) NO es nómina: no tiene sueldo, finiquito ni descuentos previsionales. Pero **se le paga**, y el compromiso de Efeonce es pagar a colaboradores y contratistas **dentro de los primeros 5 días hábiles posteriores al cierre de mes**. Este documento explica, paso a paso y en simple, cómo viaja el dinero desde que el contratista declara su trabajo hasta que la plata sale del banco — y dónde se junta ese flujo con el ciclo de pago mensual de la nómina.

## El flujo completo, paso a paso

El pago de un contratista pasa por **8 estaciones**. Cada una tiene un dueño (contratista, HR o Finanzas) y un estado en el sistema.

| # | Estación | Quién | Qué pasa | ¿Tiene pantalla hoy? |
|---|---|---|---|---|
| 1 | **Declarar trabajo** | Contratista | Registra el trabajo del período (timesheet/hito/entregable) y adjunta su boleta/evidencia. El monto NO lo escribe: se deriva del monto acordado que fijó HR. | ✅ Sí — `/my/contractor` |
| 2 | **Aprobar el trabajo** | HR | Revisa y aprueba (o disputa/rechaza). Aprobar NO es pagar: es el insumo del pago. | ✅ Sí — `/hr/contractors` |
| 3 | **Crear el pago (payable)** | Finanzas | Se calcula el monto: **bruto − retención SII = neto**. Para honorarios CL la retención sale de la tasa snapshot del engagement (15,25% en 2026). | ✅ Sí — `/finance/contractor-payments` |
| 4 | **Listo para Finanzas** | Finanzas | El pago pasa por el control de readiness (¿boleta?, ¿perfil de pago?, ¿RUT verificado?, ¿no excede lo acordado?). Si todo cuadra, queda "listo". | ✅ Sí — `/finance/contractor-payments` |
| 5 | **Obligación de pago** | Sistema (automático) | Apenas el pago queda "listo", el sistema crea **una obligación de pago** (`payment_obligation`) por el **neto**. Esto es automático y reactivo. | ✅ Automático (sin intervención) |
| 6 | **Orden de pago** | Finanzas | Finanzas junta una o más obligaciones en una **orden de pago** (`payment_order`), la aprueba (doble firma) y la envía a procesar. | ✅ Sí — `/finance/payment-orders` (pantalla genérica, sirve para nómina y contractors) |
| 7 | **Salida del banco** | Finanzas | Se marca la orden como pagada: rebaja la cuenta bancaria origen y deja el registro contable (expense payment + settlement). | ✅ Flujo de órdenes de pago; sujeto a flag, readiness y confirmación bancaria |
| 8 | **Comprobante de pago** | Contratista / HR | El contratista recibe su **Comprobante de Pago** (`EO-RA-NNNNNN`), visible in-app y descargable en PDF. | ✅ Sí — `/my/contractor` + `/hr/contractors` |

> Detalle técnico: estaciones 1-2 = TASK-790/792/796; estación 3-4 = TASK-793/794/968; estación 5 = bridge reactivo `contractor_payable_finance_obligation` (TASK-793); estaciones 6-7 = payment orders TASK-748/750/765; estación 8 = TASK-960.

## Lo que el dinero "es" en cada estación

- **Monto acordado** (lo fija HR): la tarifa bruta recurrente. Ej. $600.000 brutos mensuales.
- **Bruto** (estación 3): lo que se reconoce por el trabajo del período (tarifa completa, cantidad × tarifa o monto explícito autorizado del envío).
- **Retención SII** (solo honorarios CL): impuesto que se retiene y se remesa al Estado (F29), NO es plata que llega al contratista.
- **Neto** = bruto − retención: **esto es lo que efectivamente se le paga al contratista** y lo que viaja por la obligación → orden → banco.
- **Categoría económica**: el pago al contratista es `labor_cost_external` (costo de trabajo externo) — **nunca** nómina dependiente. No toca `payroll_entries` ni `contract_type`.

## Dónde se junta con la nómina mensual (la convergencia)

El punto donde el riel del contratista y el riel de la nómina se encuentran es **la capa de órdenes de pago (estación 6)**:

- La **nómina** genera obligaciones de pago (`obligation_kind='employee_net_pay'`, `source_kind='payroll'`).
- El **contratista** genera obligaciones de pago (`obligation_kind='provider_payroll'`, `source_kind='contractor_payable'`).
- Ambas llegan a la **misma tabla** de obligaciones y, desde ahí, Finanzas arma **órdenes de pago** en la misma pantalla `/finance/payment-orders`.

Esa es la convergencia: **al cierre de mes, Finanzas paga a colaboradores y contratistas desde el mismo workbench de órdenes de pago**, respetando el compromiso de los primeros 5 días.

## Contratos construidos y límites que se mantienen

| Tramo | Contrato actual | Verificación necesaria |
|---|---|---|
| Crear/listar/preparar payable | Workbench Finance (TASK-974) | Envío aprobado disponible y no consumido |
| Liquidar al banco | Rama contractor de settlement (TASK-977) | Flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` efectivo, controles de la orden y confirmación bancaria |
| Fecha de vencimiento | Cálculo canónico automático si no se indicó `due_date` (TASK-978) | Período, calendario y fecha persistida |
| Corrida mensual | Agrupación idempotente de obligaciones (TASK-979) | Preview y órdenes realmente creadas; no significa pago |

Los antiguos gaps de mayo sobre ausencia de pantalla, calendario y batch ya no describen el código vigente. El flag de settlement conserva su propio control operativo; leer un documento o una constante default no prueba si está habilitado en producción.

Para un **mes parcial**, la tarifa fija no prorratea automáticamente por fecha. Confirma base y monto con HR y registra el proporcional en el envío antes de crear su payable. Actualizar el acuerdo recurrente no recalcula payables anteriores. Un reingreso conserva la misma persona con un episodio nuevo, mientras sus pagos históricos siguen en la etapa correspondiente. Consulta [Compensación](contratistas-compensacion.md) y [Onboarding](contratistas-onboarding.md).

## Qué no hacer

- No interpretar el pago del contratista como nómina: es `labor_cost_external`, no toca `payroll_entries` ni el finiquito.
- No asumir que "aprobar el trabajo" paga: el pago nace en la estación 3 (payable) y sale en la 7 (banco).
- No confundir el vencimiento automático con pago garantizado: readiness, orden y confirmación bancaria siguen siendo necesarios.
- No usar off-cycle para duplicar un envío aprobado ni omitir la boleta requerida.

## Referencias técnicas

- Dominio contractor + payables: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)
- Órdenes y obligaciones de pago: [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)
- Compensación + guardrail: [contratistas-compensacion.md](contratistas-compensacion.md)
- Comprobante de pago: [contratistas-comprobante-de-pago.md](contratistas-comprobante-de-pago.md)
- Self-service + workbench: [contratistas-self-service.md](contratistas-self-service.md)
- Código de settlement: `src/lib/finance/payment-orders/mark-paid-atomic.ts` (línea ~348) + `src/lib/finance/payment-orders/record-payment-from-order.ts` (línea ~218)
