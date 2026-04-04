# TASK-218 - ICO Time-to-Market & Activation Evidence Contract

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `5`
- Domain: `delivery / ico / activation`

## Summary

Formalizar `Time-to-Market (TTM)` como métrica puente canónica de `ICO`, definiendo qué significa `brief efectivo`, qué significa `asset activo en mercado`, qué evidencias de activación son válidas y cómo se calcula de forma auditable por `space`, campaña y período.

## Why This Task Exists

`Contrato_Metricas_ICO_v1` define `TTM` como una de las métricas puente que conecta la operación con `Revenue Enabled`.

Hoy Greenhouse ya tiene drivers operativos relevantes (`OTD`, `FTR`, `RpA`, `cycle time`), pero todavía no institucionaliza completamente:

- el evento de inicio válido del flujo (`brief aprobado`)
- el evento real de salida a mercado (`activation`)
- la evidencia que respalda esa activación
- la semántica para medir días ganados y soportar `Early Launch Advantage`

`TASK-215` ya deja un patrón canónico de runtime para señales operativas sensibles:

- `valid`
- `low_confidence`
- `suppressed`
- `unavailable`

Si `TTM` necesita estado de calidad o evidencia parecida, debe reusar esa disciplina y no inventar un vocabulario paralelo.

Sin ese contrato, no se puede sostener `Revenue Enabled` más allá de narrativa.

## Goal

- Definir un contrato canónico para `TTM`.
- Unificar fuentes y evidencia de activación.
- Habilitar una base auditable para `Early Launch Advantage`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- `TTM` no puede depender de heurísticas UI locales.
- la activación debe tener evidencia trazable y fuente explícita.
- si no existe evidencia suficiente, el estado debe ser `unavailable` o `low-confidence`, no un falso positivo.

## Dependencies & Impact

### Depends on

- `TASK-214`
- `TASK-216`
- `TASK-188`
- `TASK-213`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`

### Impacts to

- `TASK-221`
- `TASK-222`
- `Agency`
- `QBR / CVR`
- futuros readers de performance y activation

### Files owned

- `src/lib/ico-engine/*`
- `src/lib/agency/*`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`

## Current Repo State

### Ya existe

- `Cycle Time` y `OTD` ya tienen carriles más maduros
- el contrato maestro ya declara `TTM` como métrica puente

### Gap actual

- no existe source policy canónica para `TTM`
- no existe contrato de activación soportado por evidencia
- no existe un baseline runtime de `brief efectivo -> asset live`

## Scope

### Slice 1 - Start event contract

- definir qué fecha inicia `TTM`
- explicitar estados y bordes de `brief efectivo`

### Slice 2 - Activation evidence contract

- definir qué fuentes y pruebas cuentan como activación válida
- formalizar confianza y fallback por canal/fuente

### Slice 3 - Runtime metric contract

- modelar `TTM` como métrica de engine / serving
- dejarla lista para consumers estratégicos y `Revenue Enabled`

## Out of Scope

- calcular directamente `Revenue Enabled`
- integrar todas las plataformas de activación en una sola lane
- rediseñar superficies comerciales

## Acceptance Criteria

- [ ] `TTM` tiene definición canónica de start event y activation event
- [ ] La activación se respalda en evidencia trazable por fuente
- [ ] El runtime puede distinguir `valid`, `low-confidence` y `unavailable` para `TTM`
- [ ] `TTM` queda listo como insumo serio para `Early Launch Advantage`

## Verification

- `pnpm exec vitest run src/lib/ico-engine/*.test.ts`
- `pnpm exec eslint src/lib/ico-engine src/lib/agency`
- validación manual contra ejemplos de activación reales cuando exista data fuente
