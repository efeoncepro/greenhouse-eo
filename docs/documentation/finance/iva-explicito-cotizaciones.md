# IVA Explícito en Cotizaciones — Neto, IVA y Total separados

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Claude (Opus 4.7) — TASK-530
> **Ultima actualizacion:** 2026-04-21 por Claude
> **Documentacion tecnica:**
> - Task: [TASK-530](../../tasks/complete/TASK-530-quote-tax-explicitness-chile-iva.md)
> - Spec tecnica: [GREENHOUSE_FINANCE_ARCHITECTURE_V1 § Delta Fase TASK-530](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
> - Fundacion: [TASK-529 Chile Tax Code Foundation](../../tasks/complete/TASK-529-chile-tax-code-foundation.md)
> - Docs relacionadas: [Cotizador](./cotizador.md) · [Cotizaciones gobernanza](./cotizaciones-gobernanza.md)

## Que problema resuelve

Antes, las cotizaciones mostraban un `Subtotal` y un `Total` sin separar impuestos. El cliente veía el monto final pero no entendía si incluía IVA, y Finance tenía que recalcular el neto a mano para margenes y reportes. Cuando la cotización pasaba a factura en Nubox, el IVA se calculaba de nuevo y a veces había desalineaciones por rounding.

Ahora cada cotización persiste un **snapshot tributario inmutable** al momento de emitirla, y lo expone explícito en el builder, detail, PDF y (en follow-up) email:

- **Neto**: lo que el cliente paga por el servicio en sí.
- **IVA**: el impuesto aplicado según el código tributario canónico.
- **Total**: Neto + IVA.

## Los 3 códigos tributarios canónicos (Chile)

Basados en el catálogo sembrado por TASK-529:

| Código | Etiqueta en español | Rate | Cuándo se usa |
|---|---|---|---|
| `cl_vat_19` | IVA 19% | 19% | Default. Servicios/productos afectos al IVA Chile. |
| `cl_vat_exempt` | IVA Exento | — | Servicios exentos por ley (ej. educación, exportación). |
| `cl_vat_non_billable` | No Afecto a IVA | — | Operaciones fuera del ámbito IVA (ej. honorarios anticipados sin DTE). |

## Como funciona

### Al crear o editar una cotización

El motor de pricing calcula todo en **neto** (sin IVA): subtotal, descuentos, margen. No se contamina la lógica comercial con impuestos.

Al persistir:

1. El sistema resuelve el código tributario (default `cl_vat_19`).
2. Llama al catálogo (`resolveChileTaxCode`) para obtener la tasa vigente (con efectividad por fecha + override por space si aplica).
3. Calcula el IVA sobre el neto y congela un **snapshot** con:
   - `taxCode`, `jurisdiction`, `kind`, `rate`, `recoverability`, `labelEs`
   - `taxableAmount`, `taxAmount`, `totalAmount`
   - `effectiveFrom` del catálogo + `frozenAt` (momento exacto del congelamiento)
4. Graba el snapshot en:
   - `quotations.tax_code`, `tax_rate_snapshot`, `tax_amount_snapshot`, `tax_snapshot_json`, `is_tax_exempt`, `tax_snapshot_frozen_at`
   - Cada `quotation_line_items` hereda el `tax_code` y persiste un snapshot proporcional.

### Donde se ve

- **Quote Summary Dock** (mientras editas la cotización): muestra `Subtotal · IVA · Total` en vivo con preview 19% Chile default. El total en el headline ya incluye IVA.
- **Quote Detail**: el canonical store expone el snapshot completo; downstream consumers pueden renderizarlo.
- **PDF**: sección de totales muestra una línea explícita entre Subtotal y Total:
  - `IVA 19%` con monto si aplica
  - `IVA Exento` o `No Afecto a IVA` con un guión `—` si la cotización está exenta

### Inmutabilidad

Una vez congelado, el snapshot no se re-calcula automáticamente:

- Si cambia la tasa del catálogo (ej. futura reforma tributaria), cotizaciones viejas mantienen su snapshot original.
- Re-rendereo del PDF usa el snapshot persistido, no el catálogo live.
- El `frozenAt` es la fecha exacta — soporte puede auditar qué se mostró al cliente cuando se emitió la cotización.

Para cambiar la tasa de una cotización ya emitida hay que crear una nueva versión — sigue el mismo flujo de cualquier edit post-issue.

## Pricing vs tax: dos responsabilidades separadas

| Dominio | Responsabilidad | Moneda |
|---|---|---|
| Pricing engine | Cálculo de costo, precio, margen | Neto (sin IVA) |
| Tax layer | Cálculo de IVA + snapshot | Sobre el neto del pricing |
| Documento comercial (PDF/email) | Muestra ambos | Explícito |

Esta separación es **obligatoria** — las métricas de margen que ve Finance y que consume el ICO engine / pricing engine siguen basadas en neto. El IVA nunca contamina los reportes de salud comercial.

## Quote multi-moneda

- El snapshot se computa sobre la moneda de la cotización (CLP, USD, CLF, COP, MXN, PEN).
- Ejemplo: una quote en USD por $10,000 con `cl_vat_19` genera snapshot con `taxableAmount: 10000`, `taxAmount: 1900`, `totalAmount: 11900` en USD.
- La conversión a CLP para reporting interno sigue usando el `exchange_rate_to_clp` persistido separadamente.

## Cotizaciones exentas o no facturables

Marcar una cotización como `cl_vat_exempt` o `cl_vat_non_billable` resulta en:

- `tax_amount_snapshot = 0`
- `is_tax_exempt = true`
- El total del documento equivale al neto (no se suma impuesto).
- El PDF muestra "IVA Exento" o "No Afecto a IVA" con un guión `—` en lugar de un monto.

Hoy (V1) el default es `cl_vat_19` para todas las cotizaciones nuevas. Cambiar el código a exento/no-afecto requiere un follow-up UI (dropdown en el builder).

## Consecuencias para módulos downstream

- **Income / factura**: cuando la cotización se convierte en income via `materializeInvoiceFromApprovedQuotation` (TASK-531), el income hereda el mismo `tax_code` — garantiza que la factura mantiene la misma semántica tributaria.
- **Quote-to-cash (TASK-541)**: la choreography atómica preserva el snapshot. Al convertir, el contrato y el income nacen referenciando el mismo `tax_code`.
- **VAT ledger (TASK-533)**: consumirá los snapshots para consolidar débito/crédito fiscal mensual.

## Preguntas frecuentes

**¿Qué pasa con las cotizaciones antiguas (pre-TASK-530)?**

El backfill las clasifica automáticamente:
- `tax_rate ≈ 0.19` → `cl_vat_19`
- `tax_rate = 0` → `cl_vat_exempt`
- `tax_rate IS NULL` → `cl_vat_non_billable`

Cada una obtiene un snapshot sintético con `metadata.backfillSource = 'TASK-530'` y el `frozenAt` se setea al `updated_at` / `created_at` de la row.

**¿Puedo cambiar el `tax_code` de una cotización emitida?**

No directamente — los snapshots son inmutables. Crear una nueva versión de la cotización re-computa el snapshot con la misma lógica (default `cl_vat_19`). La edición manual del `tax_code` queda como follow-up UI.

**¿El margen comercial incluye IVA?**

No. El margen siempre se calcula sobre neto. El IVA no es ingreso — es pasivo tributario.

**¿Qué pasa si Chile cambia la tasa del IVA (ej. del 19% al 20%)?**

Se actualiza el catálogo `greenhouse_finance.tax_codes` con una fila nueva (`cl_vat_19` → `cl_vat_20`, por ejemplo) con `effective_from` = fecha del cambio. Las cotizaciones antiguas mantienen su snapshot con la tasa del 19%. Las nuevas cotizaciones usan la nueva tasa automáticamente.

**¿Hay validación de coherencia?**

Sí. El snapshot persiste `taxableAmount`, `taxAmount`, `totalAmount` separados. El helper `validateChileTaxSnapshot` de TASK-529 los re-valida contra la fórmula; TASK-533 usará esto en el VAT ledger para detectar drift silencioso.

## Limitaciones conocidas (follow-ups)

1. **UI para cambiar `tax_code`**: hoy el builder siempre graba `cl_vat_19`. No hay dropdown. Follow-up: agregar selector al `QuoteContextStrip`.
2. **Per-line tax override**: el schema soporta line items con `tax_code` distinto al header, pero el UI no permite editarlo. Útil para cotizaciones con mezcla de servicios afectos + exentos.
3. **Email template**: la spec pedía "PDF y email"; no existe template de quote email todavía. Cuando se cree, debe leer `quotation.taxSnapshot` y renderizar Neto/IVA/Total igual que el PDF.
4. **Multi-jurisdiction**: Fase A es Chile-only. El schema lo soporta pero no hay otros países seedeados.
5. **Tests de integración end-to-end**: Fase A shippea unit tests del helper + constants. E2E del write path + rehidratación queda como follow-up.

> Detalle tecnico:
> - Helper server-side: [src/lib/finance/pricing/quotation-tax-snapshot.ts](../../../src/lib/finance/pricing/quotation-tax-snapshot.ts)
> - Constantes cliente-safe: [src/lib/finance/pricing/quotation-tax-constants.ts](../../../src/lib/finance/pricing/quotation-tax-constants.ts)
> - Orchestrator: [src/lib/finance/pricing/quotation-pricing-orchestrator.ts](../../../src/lib/finance/pricing/quotation-pricing-orchestrator.ts)
> - Canonical store: [src/lib/finance/quotation-canonical-store.ts](../../../src/lib/finance/quotation-canonical-store.ts)
> - PDF contract: [src/lib/finance/pdf/contracts.ts](../../../src/lib/finance/pdf/contracts.ts)
> - Migration: [20260421162238991_task-530-quote-tax-snapshot.sql](../../../migrations/20260421162238991_task-530-quote-tax-snapshot.sql)
