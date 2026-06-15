# TASK-1129 — Telemetría del prompt de Nexa por turno (promptVersion/family persistido)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Domain: `nexa|platform|observability`

## Por qué existe

Follow-up de TASK-1124. `buildNexaSystemPrompt` ya devuelve `{ text, version, family }`, y
`NexaResponse` persiste `modelId`. Pero la **versión del prompt** con la que se generó cada respuesta
**no se persiste**. Cuando convivan V2 y un futuro V3 (o se haga rollback), no habrá forma de
responder "¿con qué versión de prompt se generó esta respuesta?" — clave para auditar regresiones de
comportamiento/voz por versión.

## Qué hacer

1. Propagar `systemPromptResult.version` + `family` al `NexaResponse` (campo nuevo opcional, p.ej.
   `promptVersion` / `promptFamily`) sin romper consumers.
2. Persistir junto al turno (donde ya se persiste `modelId`, p.ej. `nexa_messages`).
3. (Opcional) Exponerlo en la observabilidad/trace para filtrar respuestas por versión de prompt.

## Aceptación

- Cada respuesta de Nexa registra la versión + familia del prompt con la que se generó.
- Se puede responder "¿qué versión de prompt generó esta respuesta?" desde los datos persistidos.

## Referencias

- `docs/architecture/nexa-intelligence/` (system-prompt layer) + `GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`.
- Código: `src/lib/nexa/nexa-service.ts` (ya tiene `systemPromptResult`), `NexaResponse`, persistencia `nexa_messages`.
- Procedencia: TASK-1124.
