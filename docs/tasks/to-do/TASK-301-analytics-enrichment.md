# TASK-301 — Analytics Enrichment: Revenue Enabled Trend & Benchmarking

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `17`
- Domain: `agency`
- Blocked by: `TASK-287, TASK-291`
- Branch: `task/TASK-301-analytics-enrichment`

## Summary

Enriquecer la vista de Analytics con Revenue Enabled trend, BCS trend y benchmarking contextual usando thresholds del Contrato ICO. Metricas sin contexto son numeros sueltos — "tu OTD esta en el top 20%" le da al CMO algo que decir en su board.

## Why This Task Exists

Analytics muestra tendencias de RpA, OTD, throughput y cycle time — pero sin Revenue Enabled, sin Brief Clarity Score, y sin contexto de benchmarking. Para un executive enterprise, los numeros solos no cuentan la historia. Necesitan saber si estan bien o mal, mejorando o empeorando, y como se comparan.

## Goal

- Revenue Enabled trend en Analytics (depende de V1)
- BCS trend (depende de V5)
- Benchmarking: badges o rangos contextuales por metrica (World-class/Strong/Attention/Critical)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.2 M6
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — thresholds

## Dependencies & Impact

### Depends on

- TASK-287 (Revenue Enabled API para trend data)
- TASK-291 (Brief Clarity API para BCS trend)
- Thresholds ICO definidos

### Files owned

- `src/app/(dashboard)/analytics/page.tsx` (modificar)
- `src/views/greenhouse/` (componentes de analytics)
- `src/app/api/analytics/` (modificar)

## Scope

### Slice 1 — Benchmarking contextual

- Agregar badges de threshold ICO a cada metrica existente: OTD%, RpA, FTR%
- Badges: World-class (verde), Strong (azul), Attention (amarillo), Critical (rojo)
- Usar thresholds del contrato ICO

### Slice 2 — Revenue Enabled y BCS trends

- Agregar chart de Revenue Enabled trend (reutilizar API de TASK-287)
- Agregar chart de BCS trend (reutilizar API de TASK-291)
- Integrar en la pagina de Analytics existente

## Out of Scope

- Comparacion vs otros clientes reales (privacy concern)
- Custom benchmarks por industria

## Acceptance Criteria

- [ ] Cada metrica en Analytics tiene badge de threshold (World-class/Strong/Attention/Critical)
- [ ] Revenue Enabled trend chart visible (si TASK-287 completada)
- [ ] BCS trend chart visible (si TASK-291 completada)
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
