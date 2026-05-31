# Contratistas — Flujo de Pago Completo (end-to-end) y Convergencia con la Nómina Mensual

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-31 por Claude (revisión exhaustiva del backend, sin inferencias)
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md) · [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)

> **Nota de honestidad:** este documento describe el estado REAL del sistema al 2026-05-31, verificado leyendo el código. Distingue explícitamente lo que ya funciona, lo que existe en backend pero sin pantalla, y lo que todavía NO está construido (gaps). No describe comportamiento aspiracional como si existiera.

## Para qué sirve

Un contratista (honorarios, freelance, internacional) NO es nómina: no tiene sueldo, finiquito ni descuentos previsionales. Pero **se le paga**, y el compromiso de Efeonce es pagar a colaboradores y contratistas **dentro de los primeros 5 días posteriores al cierre de mes**. Este documento explica, paso a paso y en simple, cómo viaja el dinero desde que el contratista declara su trabajo hasta que la plata sale del banco — y dónde se junta ese flujo con el ciclo de pago mensual de la nómina.

## El flujo completo, paso a paso

El pago de un contratista pasa por **8 estaciones**. Cada una tiene un dueño (contratista, HR o Finanzas) y un estado en el sistema.

| # | Estación | Quién | Qué pasa | ¿Tiene pantalla hoy? |
|---|---|---|---|---|
| 1 | **Declarar trabajo** | Contratista | Registra el trabajo del período (timesheet/hito/entregable) y adjunta su boleta/evidencia. El monto NO lo escribe: se deriva del monto acordado que fijó HR. | ✅ Sí — `/my/contractor` |
| 2 | **Aprobar el trabajo** | HR | Revisa y aprueba (o disputa/rechaza). Aprobar NO es pagar: es el insumo del pago. | ✅ Sí — `/hr/contractors` |
| 3 | **Crear el pago (payable)** | Finanzas | Se calcula el monto: **bruto − retención SII = neto**. Para honorarios CL la retención sale de la tasa snapshot del engagement (15,25% en 2026). | ❌ **No hay pantalla** (solo API) → TASK-974 |
| 4 | **Listo para Finanzas** | Finanzas | El pago pasa por el control de readiness (¿boleta?, ¿perfil de pago?, ¿RUT verificado?, ¿no excede lo acordado?). Si todo cuadra, queda "listo". | ❌ **No hay pantalla** (solo API) → TASK-974 |
| 5 | **Obligación de pago** | Sistema (automático) | Apenas el pago queda "listo", el sistema crea **una obligación de pago** (`payment_obligation`) por el **neto**. Esto es automático y reactivo. | ✅ Automático (sin intervención) |
| 6 | **Orden de pago** | Finanzas | Finanzas junta una o más obligaciones en una **orden de pago** (`payment_order`), la aprueba (doble firma) y la envía a procesar. | ✅ Sí — `/finance/payment-orders` (pantalla genérica, sirve para nómina y contractors) |
| 7 | **Salida del banco** | Finanzas | Se marca la orden como pagada: rebaja la cuenta bancaria origen y deja el registro contable (expense payment + settlement). | ⚠️ **Bloqueado para contractors en V1** (ver gap abajo) |
| 8 | **Comprobante de pago** | Contratista / HR | El contratista recibe su **Comprobante de Pago** (`EO-RA-NNNNNN`), visible in-app y descargable en PDF. | ✅ Sí — `/my/contractor` + `/hr/contractors` |

> Detalle técnico: estaciones 1-2 = TASK-790/792/796; estación 3-4 = TASK-793/794/968; estación 5 = bridge reactivo `contractor_payable_finance_obligation` (TASK-793); estaciones 6-7 = payment orders TASK-748/750/765; estación 8 = TASK-960.

## Lo que el dinero "es" en cada estación

- **Monto acordado** (lo fija HR): la base. Ej. $600.000 mensual.
- **Bruto** (estación 3): lo que se reconoce por el trabajo del período (= monto acordado, o cantidad × tarifa).
- **Retención SII** (solo honorarios CL): impuesto que se retiene y se remesa al Estado (F29), NO es plata que llega al contratista.
- **Neto** = bruto − retención: **esto es lo que efectivamente se le paga al contratista** y lo que viaja por la obligación → orden → banco.
- **Categoría económica**: el pago al contratista es `labor_cost_external` (costo de trabajo externo) — **nunca** nómina dependiente. No toca `payroll_entries` ni `contract_type`.

## Dónde se junta con la nómina mensual (la convergencia)

El punto donde el riel del contratista y el riel de la nómina se encuentran es **la capa de órdenes de pago (estación 6)**:

- La **nómina** genera obligaciones de pago (`obligation_kind='employee_net_pay'`, `source_kind='payroll'`).
- El **contratista** genera obligaciones de pago (`obligation_kind='provider_payroll'`, `source_kind='contractor_payable'`).
- Ambas llegan a la **misma tabla** de obligaciones y, desde ahí, Finanzas arma **órdenes de pago** en la misma pantalla `/finance/payment-orders`.

Esa es la convergencia: **al cierre de mes, Finanzas paga a colaboradores y contratistas desde el mismo workbench de órdenes de pago**, respetando el compromiso de los primeros 5 días.

## ⚠️ Gaps verificados al 2026-05-31 (lo que todavía NO está)

Revisión exhaustiva del código. Estos son hechos, no opiniones:

1. **No hay pantalla para crear/procesar el pago del contratista (estaciones 3-4).** El backend existe y calcula el neto correctamente, pero solo se accede por API/script. **Bloqueante operativo.** → **TASK-974** (Finance Contractor Payments Workbench).

2. **La salida del banco (estación 7) está bloqueada para contractors en V1.** El motor de liquidación (`recordPaymentForOrder` / `markPaymentOrderPaidAtomic`) **solo procesa líneas de nómina** (`source_kind='payroll'` AND `obligation_kind='employee_net_pay'`); cualquier otra línea — incluido el contratista (`provider_payroll`) — lanza `out_of_scope_v1`. Es decir: **una orden de pago de contratista hoy NO se puede marcar como pagada por el camino canónico**. Esto es un gap de **backend**, no de UI — ninguna de las tasks de pantallas (974/975/976) lo cubre. → requiere extender el resolver de liquidación.

3. **No existe lógica de calendario de pago para contractors.** No hay ninguna regla de "cierre de mes + 5 días" en el código (ni en el dominio contractor, ni en payment-obligations, ni en payment-orders, ni en el calendario operativo). El campo `due_date` del payable es **entrada manual** (default vacío); no se computa automáticamente desde el cierre del período. → el compromiso de los 5 días hoy es **operativo/manual**, no está enforced por el sistema.

4. **No existe un "corrida mensual de pago a contractors"** (batch). Las órdenes se arman a mano desde obligaciones sueltas. → candidato a orquestación futura.

## Qué falta para cerrar la convergencia (resumen)

| Gap | Tipo | Cubierto por |
|---|---|---|
| Pantalla Finanzas para crear/listar/procesar payables | UI | TASK-974 |
| Liquidación al banco para contractors (`provider_payroll`) | **Backend** | **sin task — requiere extender el resolver de settlement** |
| `due_date` automático desde cierre de mes + 5 días | Backend/regla | sin task — decisión de diseño pendiente |
| Corrida mensual / batch de pago contractor | Orquestación | sin task — futuro |

## Qué no hacer

- No interpretar el pago del contratista como nómina: es `labor_cost_external`, no toca `payroll_entries` ni el finiquito.
- No asumir que "aprobar el trabajo" paga: el pago nace en la estación 3 (payable) y sale en la 7 (banco).
- No asumir que el compromiso de los 5 días está garantizado por el sistema: hoy es operativo/manual hasta que se construya la regla de calendario.

## Referencias técnicas

- Dominio contractor + payables: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)
- Órdenes y obligaciones de pago: [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)
- Compensación + guardrail: [contratistas-compensacion.md](contratistas-compensacion.md)
- Comprobante de pago: [contratistas-comprobante-de-pago.md](contratistas-comprobante-de-pago.md)
- Self-service + workbench: [contratistas-self-service.md](contratistas-self-service.md)
- Código del gap de settlement: `src/lib/finance/payment-orders/mark-paid-atomic.ts` (línea ~348) + `src/lib/finance/payment-orders/record-payment-from-order.ts` (línea ~218)
