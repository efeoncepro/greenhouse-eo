# TASK-219 - ICO Iteration Velocity & Experimentation Signal Contract

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `7`
- Domain: `delivery / ico / experimentation`

## Summary

Definir `Iteration Velocity` como métrica puente canónica, aclarando qué cuenta como iteración útil, qué cuenta como test o variante válida, qué fuentes pueden probarlo y cómo se conecta con optimización y `Revenue Enabled`.

## Why This Task Exists

El contrato maestro plantea que el cliente gana más no solo porque lanza antes, sino porque itera más y optimiza mejor. Hoy esa parte todavía no está institucionalizada.

Sin un contrato claro, `Iteration Velocity` corre el riesgo de convertirse en:

- cantidad de comentarios
- cantidad de rondas
- cantidad de piezas

y ninguna de esas tres cosas es equivalente a iteración útil sobre performance.

## Goal

- Definir qué significa `Iteration Velocity` en Globe/ICO.
- Formalizar señales de test, variante y optimización útil.
- Preparar la base para `RE Iteration`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- `Iteration Velocity` no debe confundirse con retrabajo (`RpA`) ni con rounds de corrección.
- un test o variante debe tener una señal operativa auditable.
- la métrica debe ser usable aunque la atribución financiera posterior siga siendo parcial.

## Dependencies & Impact

### Depends on

- `TASK-214`
- `TASK-216`
- `TASK-218`
- `TASK-188`
- `TASK-213`

### Impacts to

- `TASK-221`
- `TASK-222`
- readers de performance marketing y delivery

### Files owned

- `src/lib/ico-engine/*`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- `RpA`, `FTR` y `cycle time` ya modelan parte de la fricción operativa
- el contrato maestro ya define `Iteration Velocity` como métrica puente

### Gap actual

- no existe señal canónica de variante/test útil
- no existe source policy entre Notion, ads platform u otras fuentes
- no existe distinción fuerte entre iteración para performance y corrección operativa

## Scope

### Slice 1 - Concept contract

- definir `iteración útil`, `test`, `variante` y `optimización`
- separar eso de retrabajo correctivo

### Slice 2 - Signal sources

- auditar fuentes posibles
- fijar source policy y confidence policy

### Slice 3 - Runtime metric

- modelar `Iteration Velocity` como reader / serving contract
- dejarlo listo para consumers estratégicos

## Out of Scope

- cerrar atribución final de `Revenue Enabled`
- conectar todos los ad networks en esta misma lane
- rediseñar la UI de reporting ejecutivo

## Acceptance Criteria

- [ ] Existe definición canónica de `Iteration Velocity`
- [ ] La métrica distingue iteración útil de retrabajo correctivo
- [ ] Existe source policy y confidence policy por señal de experimentación
- [ ] `Iteration Velocity` queda listo como insumo serio para `RE Iteration`

## Verification

- `pnpm exec vitest run src/lib/ico-engine/*.test.ts`
- `pnpm exec eslint src/lib/ico-engine`
- revisión manual de ejemplos de variantes/tests cuando la data fuente exista

