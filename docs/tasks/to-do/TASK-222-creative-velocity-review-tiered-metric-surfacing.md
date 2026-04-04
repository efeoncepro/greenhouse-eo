# TASK-222 - Creative Velocity Review, Tiered Metric Surfacing & Client Narrative

## Delta 2026-04-04

- `TASK-218` ya dejó un primer consumer visible de `TTM` en campañas con estados `available`, `degraded` y `unavailable`.
- `TASK-219` ya dejó un primer contrato runtime de `Iteration Velocity` y reemplazó la heurística legacy de `Creative Hub` derivada de `RpA`.
- Para esta task cambia un supuesto importante:
  - `TTM` ya no parte desde cero
  - `Iteration Velocity` tampoco parte desde cero, pero hoy sigue siendo una lane controlada con evidencia proxy de delivery
  - pero tampoco está lista para presentarse como métrica madura en `CVR` agency-wide
- Regla nueva para `TASK-222`:
  - cualquier surfacing client-facing de `TTM` debe consumir ese contrato de evidencia y no volver a caer en heurísticas locales de `Early Launch`
  - cualquier surfacing client-facing de `Iteration Velocity` debe consumir el contrato canónico de iteraciones útiles y no volver a caer en `pipeline_velocity` ni en proxies de `RpA`
  - mientras `TTM` no entre al carril registry/materialization amplio del engine, su exposición debe tratarse como controlada y explícita en confianza
  - mientras `Iteration Velocity` no tenga evidencia observada de mercado, su exposición debe tratarse como proxy y no como métrica madura de `RE Iteration`

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `9`
- Domain: `agency / ico / client-experience`

## Summary

Traducir el sistema de métricas `ICO` a una surface y rito de negocio: `Creative Velocity Review (CVR)`, visibilidad por tier (`Basic`, `Pro`, `Enterprise`) y narrativa client-facing coherente con `Revenue Enabled` y sus métricas puente.

## Why This Task Exists

El contrato maestro ya define:

- cadencias
- `CVR`
- tiers de exposición
- reglas de comunicación

Pero hoy Greenhouse todavía no institucionaliza esa capa como surface o contrato claro de reporting.

## Goal

- Definir el contrato del `CVR`.
- Formalizar qué métricas ve cada tier.
- Alinear surfaces Agency/cliente con la narrativa comercial y con la madurez real de los datos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- no mostrar al cliente una métrica como madura si sigue en estado experimental o de baja confianza
- tiers de exposición deben respetar benchmark/confianza y el tipo de dato disponible
- la narrativa debe separar claramente métricas operativas, métricas puente y `Revenue Enabled`

## Dependencies & Impact

### Depends on

- `TASK-216`
- `TASK-217`
- `TASK-218`
- `TASK-219`
- `TASK-221`

### Impacts to

- `Agency`
- reporting client-facing
- decks/QBR/CVR
- surfaces ejecutivas futuras

### Files owned

- `src/views/agency/*`
- `src/lib/agency/*`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/changelog/CLIENT_CHANGELOG.md`

## Current Repo State

### Ya existe

- el contrato maestro ya define el rito y los tiers
- `Agency` ya tiene surfaces operativas de métricas

### Gap actual

- no existe CVR formalizado como contract de producto
- no existe tiered surfacing alineado a confianza de dato
- la narrativa client-facing aún no está pegada al serving real del portal

## Scope

### Slice 1 - CVR contract

- definir estructura, inputs y outputs del rito trimestral

### Slice 2 - Tiered surfacing

- formalizar qué métricas ve `Basic`, `Pro`, `Enterprise`
- alinear eso con confianza y madurez real

### Slice 3 - Client narrative guardrails

- documentar reglas para no vender humo
- definir cuándo una métrica puede entrar a narrativa externa

## Out of Scope

- construir todo el deck comercial
- cerrar el modelo de atribución de `Revenue Enabled`
- rediseñar todos los dashboards del portal

## Acceptance Criteria

- [ ] Existe contrato formal de `CVR`
- [ ] Existe matriz de visibilidad por tier alineada con madurez/confianza
- [ ] La narrativa client-facing distingue claramente drivers, métricas puente y `Revenue Enabled`
- [ ] La lane deja guardrails explícitos para no exponer métricas inmaduras como promesas fuertes

## Verification

- revisión manual de consistencia documental
- validación cruzada con arquitectura `ICO` y `Agency`
