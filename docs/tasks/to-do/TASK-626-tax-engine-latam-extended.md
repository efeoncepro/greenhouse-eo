# TASK-626 — Tax Engine LATAM Extendido (Colombia + Mexico + Peru + Brasil futuro)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (alto cuando expansion LATAM)
- Effort: `Medio` (~3 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data` / `finance`
- Blocked by: `none`
- Branch: `task/TASK-626-tax-engine-latam-extended`

## Summary

Extender el tax engine actual (Chile IVA hardcoded) a engine generico + plugins per-pais. v1 cubre Chile (existing) + Colombia (IVA + retencion en la fuente) + Mexico (IVA + IEPS para ciertos productos) + Peru (IGV directo). Brasil queda spec-ready para Fase 2 (ICMS + PIS + COFINS + IPI es el mas complejo de LATAM).

## Why This Task Exists

RESEARCH-005 Decision 12 v1.3 ya cerro: "engine generico + plugins per-pais". Sin esto, primer cliente colombiano choca con falta de retencion en la fuente; primer cliente mexicano choca con IEPS faltante.

## Goal

- Engine generico `calculateTaxes(quote, country)` con plugins
- 4 plugins productivos: CL (existing), CO, MX, PE
- 1 plugin spec-ready (BR) para activar cuando se justifique
- `quotation_line_items.tax_breakdown jsonb` con detalle por linea
- PDF rendering muestra desglose tributario correcto per pais
- Reports finance separados per pais para SII / DIAN / SAT / SUNAT

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/research/RESEARCH-005...` Decision 12 v1.3 + Delta v1.9

## Dependencies & Impact

### Depends on

- Tax engine actual Chile IVA (existe en `src/lib/finance/tax/`)
- `client.country_code` columna en clients table

### Blocks / Impacts

- TASK-619 (firma valida en LATAM, ya cerrado)
- TASK-624 (renewals respetan tax engine vigente al renewal)
- Reports a SII / DIAN / SAT / SUNAT

### Files owned

- `migrations/YYYYMMDD_task-626-tax-breakdown-column.sql` (nuevo)
- `src/lib/finance/tax/engine.ts` (refactor a generico + plugin loader)
- `src/lib/finance/tax/plugins/cl-iva.ts` (existing, refactor as plugin)
- `src/lib/finance/tax/plugins/co-iva-retencion.ts` (nuevo)
- `src/lib/finance/tax/plugins/mx-iva-ieps.ts` (nuevo)
- `src/lib/finance/tax/plugins/pe-igv.ts` (nuevo)
- `src/lib/finance/tax/plugins/br-icms-pis-cofins-ipi.ts` (spec-ready, no implementado v1)
- `src/lib/finance/pdf/tax-breakdown-section.tsx` (nuevo)

## Scope

### Slice 1 — Engine refactor + plugin contract (1 dia)

```typescript
// src/lib/finance/tax/engine.ts

export interface TaxPlugin {
  countryCode: string
  taxCodes: string[]                  // ['cl_iva_19', 'cl_iva_exempt'] etc.
  calculate: (line: QuoteLineInput, context: TaxContext) => TaxBreakdown
}

const PLUGINS: Record<string, TaxPlugin> = {
  CL: clIvaPlugin,
  CO: coIvaRetencionPlugin,
  MX: mxIvaIepsPlugin,
  PE: peIgvPlugin
  // BR: spec-ready
}

export const calculateLineItemTaxes = async (line, context) => {
  const plugin = PLUGINS[context.countryCode]
  if (!plugin) throw new Error(`No tax plugin for ${context.countryCode}`)
  return plugin.calculate(line, context)
}
```

Migracion:

```sql
ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN tax_breakdown jsonb;
-- Estructura: { country: 'CL', taxes: [{code: 'cl_iva_19', label: 'IVA 19%', rate: 0.19, amount: 1900}], totals: {tax: 1900, retencion: 0, neto: 10000} }
```

### Slice 2 — Plugin Chile (refactor) (0.25 dia)

Existing logic IVA 19% / IVA Exempt / No Afecto -> wrap en plugin contract. Cero functional change.

### Slice 3 — Plugin Colombia (0.5 dia)

```typescript
export const coIvaRetencionPlugin: TaxPlugin = {
  countryCode: 'CO',
  taxCodes: ['co_iva_19', 'co_iva_5', 'co_iva_exempt', 'co_retencion_2_5', 'co_retencion_4'],
  calculate: (line, context) => {
    const ivaAmount = line.subtotal * 0.19  // standard COL IVA
    // Retencion en la fuente solo si client es retenedor
    const retencion = context.clientIsRetenedor ? line.subtotal * 0.025 : 0
    return { iva: ivaAmount, retencion, total: line.subtotal + ivaAmount - retencion }
  }
}
```

### Slice 4 — Plugin Mexico + Peru (0.75 dia)

Mexico: IVA 16% + IEPS variable per categoria producto.
Peru: IGV 18% directo.

### Slice 5 — PDF rendering tax breakdown + tests (0.5 dia)

`<TaxBreakdownSection>` en PDF muestra desglose correcto per country:
- Chile: solo "IVA 19%"
- Colombia: "IVA 19% + Retencion 2.5%"
- Mexico: "IVA 16% + IEPS [si aplica]"
- Peru: "IGV 18%"

Tests:
- Per plugin: input -> expected breakdown
- Multi-currency taxes (quote USD para client Chile -> IVA en CLP equivalente)

### Slice 6 — BR spec stub (no implementado) (mezclado)

`br-icms-pis-cofins-ipi.ts` con interface declarada pero `throw new Error('Brazil tax engine not yet implemented; see TASK-626-BR-followup')`. Documenta complejidad para futuro.

## Out of Scope

- Brazil implementation real (spec-ready, activar cuando justify)
- Avalara integration (Decision v1.3: solo si escalas fuera LATAM)
- Tax exemption per cliente (solo per quote en v1)
- Withholding agent variations (Mexico tiene varios escenarios) - simplificado v1

## Acceptance Criteria

- [ ] engine refactor con plugin contract
- [ ] 4 plugins productivos (CL existing + CO + MX + PE)
- [ ] BR plugin stub con error clarificador
- [ ] tax_breakdown column poblada en nuevas quotes
- [ ] PDF renderiza desglose correcto per country
- [ ] tests passing (unitarios per plugin + integration)
- [ ] aplicado en prod

## Verification

- Crear quote en CO -> verificar IVA + retencion calculados correctamente
- Verificar PDF muestra desglose
- Reports finance separan correctamente per pais

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con tax matrix por pais documentada
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` updated seccion "Tax Engine Plugins"
