> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Codex
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)

# IVA en Compras — Crédito Fiscal vs Costo Efectivo

## Que cambio

Greenhouse ahora distingue explícitamente dos cosas cuando registra una compra o gasto:

- **IVA recuperable**: queda como crédito fiscal y no debe inflar el costo operativo.
- **IVA no recuperable**: sí pasa a formar parte del costo o gasto efectivo.

Antes, muchos consumers sumaban el total bruto del documento y eso podía mezclar impuestos recuperables con costo real.

## Como lo entiende ahora el sistema

Cada gasto puede persistir:

- un **código tributario** (`tax_code`)
- un **snapshot tributario congelado**
- una **recoverability** (`full`, `partial`, `none`, `not_applicable`)
- tres montos distintos:
  - `recoverableTaxAmount`
  - `nonRecoverableTaxAmount`
  - `effectiveCostAmount`

La regla simple es:

- **Costo efectivo** = neto del documento + IVA no recuperable
- el IVA recuperable queda fuera del costo

## Casos operativos

### 1. Compra con crédito fiscal normal

- Neto: `$100.000`
- IVA: `$19.000`
- Recoverability: `full`

Resultado:

- `recoverableTaxAmount = 19.000`
- `nonRecoverableTaxAmount = 0`
- `effectiveCostAmount = 100.000`

### 2. Compra con IVA no recuperable

- Neto: `$100.000`
- IVA: `$19.000`
- Recoverability: `none`

Resultado:

- `recoverableTaxAmount = 0`
- `nonRecoverableTaxAmount = 19.000`
- `effectiveCostAmount = 119.000`

### 3. Compra parcialmente recuperable

Si parte del IVA queda explícitamente marcada como no recuperable:

- esa parte entra al costo
- la parte recuperable queda fuera

Ejemplo:

- Neto: `$100.000`
- IVA total: `$19.000`
- IVA no recuperable explícito: `$4.000`

Resultado:

- `recoverableTaxAmount = 15.000`
- `nonRecoverableTaxAmount = 4.000`
- `effectiveCostAmount = 104.000`

## Que módulos se benefician

- **Expenses / Compras** guardan el contrato tributario correcto.
- **Nubox sync** deja listas las compras nuevas con el mismo contrato.
- **P&L operacional y economics** dejan de inflar costo con IVA recuperable.
- **Service attribution** y readers de costos reutilizan `effectiveCostAmountClp`.
- **VAT ledger mensual** (follow-up) puede separar crédito fiscal vs IVA capitalizado sin heurísticas downstream.

## Que no cambia

- El documento de compra sigue guardando su monto total.
- La caja y los pagos siguen leyendo el documento/pago real.
- El cambio afecta la forma en que Greenhouse interpreta el IVA para costo operativo y reporting.

## Importante para Finance

- Si el IVA es recuperable, no debe leerse como costo.
- Si el IVA no es recuperable, sí debe entrar al costo.
- `vat_common_use_amount` hoy marca el caso como parcial, pero su liquidación tributaria completa queda para el ledger mensual de IVA.
