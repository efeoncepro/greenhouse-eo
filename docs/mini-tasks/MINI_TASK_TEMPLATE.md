# Mini Task Template

Plantilla copiable para cambios pequeños, acotados y verificables. El lifecycle operativo vive en `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`.

## Instrucciones

1. Copiar esta plantilla en `docs/mini-tasks/to-do/MINI-###-short-slug.md`
2. Reservar el siguiente ID disponible en `docs/mini-tasks/MINI_TASK_ID_REGISTRY.md`
3. Mantener el brief corto y accionable
4. Si al redactarlo ya se ve cross-module, arquitectura o rollout complejo, no usar esta plantilla: crear `TASK-###`

## Template

```md
# MINI-### — [Short Title]

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Domain: `[finance|hr|platform|identity|ui|data|ops|content|crm|delivery|agency]`
- Type: `mini-improvement`
- Branch: `mini/MINI-###-short-slug`
- Related Task: `none`
- Related Issue: `none`

## Summary

[Que se quiere ajustar y por qué vale la pena capturarlo.]

## Why Mini

[Por qué esto no es un issue ni una task completa.]

## Current State

- [surface, flujo o archivo actual]
- [restricción o dolor observable]

## Proposed Change

- [cambio 1]
- [cambio 2]

## Acceptance Criteria

- [ ] [criterio verificable]
- [ ] [criterio verificable]

## Verification

- [validación manual o técnica acotada]

## Notes

- [contexto extra, referencias, screenshots, paths]

## Follow-ups

- [si algo podría escalar a TASK-### más adelante]
```
