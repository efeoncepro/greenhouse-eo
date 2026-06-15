# TASK-1129 — Telemetría de turno de Nexa (promptVersion/family + provider/runtime metadata)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Domain: `nexa|platform|observability`

## Por qué existe

Follow-up de TASK-1124 y de la revision de robustez backend de Nexa (2026-06-15).
`buildNexaSystemPrompt` ya devuelve `{ text, version, family }`, y `NexaResponse` persiste
`modelId`. Pero la **version del prompt** con la que se genero cada respuesta **no se persiste**.
Ademas, Nexa no deja un rastro estructurado del turno: provider plan, provider resuelto, failover,
latencias, tools usados, outcome, sugerencias y errores degradados. Cuando convivan V2/V3, router
auto, Claude/Gemini y rollback por flags, no habra forma suficiente de responder "que runtime produjo
esta respuesta y bajo que condiciones?".

## Qué hacer

1. Propagar `systemPromptResult.version` + `family` al `NexaResponse` (campo nuevo opcional, p.ej.
   `promptVersion` / `promptFamily`) sin romper consumers.
2. Persistir junto al turno (donde ya se persiste `modelId`, p.ej. `nexa_messages`) o en un ledger
   aditivo si el schema de mensajes no debe crecer.
3. Registrar metadata minima del turno:
   - provider plan calculado;
   - provider/model que resolvio;
   - si hubo failover y desde que provider;
   - latencia total, latencia por provider y latencia por tool;
   - tools invocados y availability;
   - outcome (`success`, `graceful_fallback`, `tool_degraded`, `provider_failed`, `aborted`);
   - suggestion generation outcome.
4. Preparar el contrato para tokens/costo cuando el SDK exponga usage de forma estable; si no existe,
   persistir `null` con version de contrato.
5. Exponer una lectura interna/reliability signal para filtrar regresiones por prompt/provider/outcome.

## Aceptación

- Cada respuesta de Nexa registra la version + familia del prompt con la que se genero.
- Se puede responder "que version de prompt, provider, modelo y outcome generaron esta respuesta?"
  desde datos persistidos.
- Failovers, provider errors y degradaciones quedan auditables sin depender de `console.warn`.
- La telemetria no incluye prompt completo, contenido sensible innecesario ni secretos.

## Referencias

- `docs/architecture/nexa-intelligence/` (system-prompt + behavior + technical layers) + `GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`.
- Codigo: `src/lib/nexa/nexa-service.ts` (ya tiene `systemPromptResult`), `NexaResponse`,
  `src/lib/nexa/store.ts`, persistencia `nexa_messages`.
- Relacionada: `TASK-1134` (routing truth), `TASK-1135` (runtime resilience).
- Procedencia: TASK-1124.
