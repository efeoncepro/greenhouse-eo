# Greenhouse EO — Vocabulario Contable Canónico V1

> **Versión:** 1.0
> **Creado:** 2026-06-20 por Claude (TASK-1208)
> **Tipo:** Contrato de vocabulario (agent-facing + operador) — fija la semántica contable de los objetos finance.
> **Fundamento:** IFRS 15 (reconocimiento de ingresos) · IAS 7 (flujo de efectivo) · Chile NIIF / SII (F29 devengado).

## Por qué existe este documento

El símbolo físico `greenhouse_finance.income` **se llama "income" (ingreso) pero NO es un ingreso de caja: es la factura emitida / cuenta por cobrar (AR)**. La propia documentación de columnas de la tabla la describe como *"the receivable"* / *"the invoice"*. Esto causó una confusión contable real (2026-06-20): el contador vio el IVA neto de una factura y no entendió por qué no era el total a pagar del F29 — la raíz es semántica.

La **estructura** del repo es correcta: separa el plano **devengado** (facturas) del plano **percibido** (caja/banco). Lo que está mal es el **naming**: "income" sugiere caja cuando en realidad es la factura por cobrar. Este documento fija el vocabulario canónico para que humanos y agentes (Nexa) nunca confundan **factura** con **plata**.

**Decisión (3 lentes — finanzas/arquitectura/commercial, TASK-1208):** se arregla la **capa semántica** (este glosario + copy), **NO** se renombra el símbolo físico (`income` se mantiene como deuda de naming documentada; el rename físico es un programa gobernado por fases, opcional, fuera de alcance).

## Los dos planos contables

| Plano | Qué mide | Pregunta que responde | Forma SII / financiera |
|---|---|---|---|
| **Devengado (accrual)** | Lo facturado/reconocido, exista o no la plata | "¿Cuánto vendí / debo, por ventas y compras del período?" | P&L · **F29** (IVA débito/crédito sale de las facturas) |
| **Percibido (caja)** | El movimiento real de plata por el banco | "¿Cuánta plata entró/salió por el banco?" | Flujo de caja (IAS 7) · saldo bancario |

Regla mental: **una factura NO es plata.** Reconozco el ingreso (devengado) cuando emito la factura (IFRS 15 §31); recibo la plata (percibido) cuando me cobran y entra al banco. Pueden ser meses distintos (DSO = AR / Revenue × 365).

## Mapeo canónico objeto ↔ término ↔ plano

| Objeto / tabla | Qué ES contablemente | Plano | Término correcto (UI/copy) | Término **incorrecto** |
|---|---|---|---|---|
| `greenhouse_finance.income` | Factura emitida / **cuenta por cobrar (AR)** | **Devengado** | Factura · Ventas (facturadas) · Por cobrar | ~~Ingreso de caja~~ |
| `income_payments` (+ `settlement_legs`) | **Cobro** contra la factura (la plata que entra) | **Percibido** | Cobro · **Ingreso (de caja)** | ~~Factura~~ |
| `greenhouse_finance.expenses` | Factura de compra / **cuenta por pagar (AP)** | **Devengado** | Factura de compra · Por pagar · Gasto (devengado) | ~~Egreso de caja~~ |
| `expense_payments` | **Pago** contra la factura (la plata que sale) | **Percibido** | Pago · **Egreso (de caja)** | ~~Factura~~ |
| `account_balances` | Saldo del banco | **Percibido** | Saldo · Banco · Caja | — |

> Detalle técnico: la conciliación devengado↔caja del lado AR vive en la VIEW `income_settlement_reconciliation` / `src/lib/finance/income-settlement.ts` (compone cobros + factoring + retenciones — NUNCA sumar `income_payments` solo). El plano caja se materializa en `account_balances` (TASK-774).

## Regla de copy (de-conflación)

- **"Ingresos / Egresos / Cobros / Pagos"** → reservados para el **plano caja** (`income_payments`/`expense_payments`/`account_balances`). Ahí "Ingresos" es **correcto** (cash-in, banco, posición de caja).
- **"Factura / Por cobrar / Por pagar / Facturado / Devengado"** → para el **plano devengado** (`income`/`expenses`). Cuando una superficie muestre el objeto `income` como tal (su monto, su IVA, su estado), NO lo presentes como si fuera plata en mano: es facturado/por cobrar.
- **Anti-patrón:** rotular un monto de `income` (factura) como "Ingreso" a secas en un contexto que sugiere caja (junto a banco, saldo, "disponible"). Si el monto es la factura, di **"Facturado"** o aclara **"devengado, no caja"**.

Esta regla se aplica **superficie por superficie** (no es un reemplazo global): el `/finance/income` como sección de ventas/facturación es vernáculo de negocio aceptable ("ingresos por ventas" = devengado), pero NO debe presentarse como caja disponible.

## Hard rules (agentes)

- **NUNCA** llamar "ingreso (de caja)" a una fila de `greenhouse_finance.income` — es una **factura / cuenta por cobrar (AR)**. El ingreso de caja es el **cobro** (`income_payments` → banco).
- **NUNCA** sumar `income` y tratarlo como flujo de caja: eso es P&L devengado, no tesorería. Para caja, usar `income_payments`/`account_balances`.
- **NUNCA** renombrar el símbolo físico `greenhouse_finance.income` ni columnas sin un programa de rename gobernado por fases (alias-view → cutover); es una puerta de un solo sentido (F29, marts BQ, sync Nubox/HubSpot, lint `no-untokenized-fx-math`).
- **SIEMPRE** que una UI/Nexa muestre el objeto `income`, presentarlo como facturado/por cobrar; reservar "Ingresos" para movimientos de banco.

## Para Nexa / agentes

Cuando un usuario pregunte por "ingresos", desambiguar: ¿quiere lo **facturado** (devengado, ventas del período → `income`) o lo **cobrado** (caja, lo que entró al banco → `income_payments`/`account_balances`)? Son cifras distintas y normalmente no coinciden (DSO). Nunca responder un monto de factura como si fuera plata en el banco.

## Referencias

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — modelo income/expenses + payments + account_balances.
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — FX/CLP.
- IFRS 15 §31 (reconocimiento de revenue) · IAS 7 (cashflow) · SII F29 (devengado fiscal).
- Precedente de capa semántica sin rename físico: TASK-768 (`economic_category` junto a `expense_type`).
