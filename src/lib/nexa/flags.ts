// TASK-1078 — Nexa floating chat expandable shell cutover flag. Default OFF: the
// new expandable + persisted panel ships behind this flag; with it OFF the floating
// behaves exactly as before (ephemeral mini panel). Read client-side by
// `NexaFloatingButton` (a client component), so it must be a NEXT_PUBLIC mirror.
// Accepts either the server var or the client-readable mirror; setting JUST
// `NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED=true` flips both consistently.
export const isNexaFloatingExpandableEnabled = (): boolean =>
  process.env.NEXA_FLOATING_EXPANDABLE_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED === 'true'

// TASK-1085 — Nexa Knowledge Retrieval gate. Default OFF: el tool `search_knowledge`
// (Nexa recupera del corpus gobernado vía searchKnowledge agentic + cita) solo aparece
// con este flag ON. Con OFF, Nexa se comporta exactamente como antes (cero retrieval de
// knowledge). NEXT_PUBLIC mirror para que la UI (Codex) pueda mostrar/ocultar afordances
// de citas consistentemente. No levanta el gate por aceptación de TASK-1080.
export const isNexaKnowledgeRetrievalEnabled = (): boolean =>
  process.env.NEXA_KNOWLEDGE_RETRIEVAL_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_NEXA_KNOWLEDGE_RETRIEVAL_ENABLED === 'true'

// TASK-1091 — pin explícito del provider LLM de Nexa (`google` | `anthropic`). Gana
// sobre el router. Default unset → router (si está ON) o Gemini (default). Server-only
// (no NEXT_PUBLIC): la selección de provider es decisión de runtime, no de la UI.
export const getNexaProviderOverride = (): 'google' | 'anthropic' | null => {
  const raw = process.env.NEXA_PROVIDER?.trim().toLowerCase()

  return raw === 'anthropic' || raw === 'google' ? raw : null
}

// TASK-1091 — router interno por intención + failover cross-provider. Default OFF:
// con OFF, Nexa usa SIEMPRE Gemini (comportamiento idéntico al previo a TASK-1091).
// Con ON, el router elige Anthropic para preguntas de conocimiento (cuando el retrieval
// está activo) y Gemini para el resto, con failover al otro provider si el primario falla.
export const isNexaAutoRouterEnabled = (): boolean => process.env.NEXA_AUTO_ROUTER_ENABLED === 'true'

// TASK-1124 — System Prompt V2 (prompt modular + contrato de voz Efeonce + response modes).
// Default OFF en código (rollback); se habilita por env en local/staging para prueba temprana,
// y en producción tras sign-off del operador. Con OFF, Nexa usa el prompt V1 byte-equivalente.
export const isNexaSystemPromptV2Enabled = (): boolean => process.env.NEXA_SYSTEM_PROMPT_V2_ENABLED === 'true'

// TASK-1124 — Evidence brief sintetizable para el grounding de Knowledge (in-memory, derivado
// del packet). Default OFF en código; ON en local/staging para prueba temprana. Con OFF, el
// grounding usa el resumen de excerpts saneado (sin headings crudos, sin lista "Fuentes:").
export const isNexaKnowledgeSynthesisBriefEnabled = (): boolean =>
  process.env.NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED === 'true'
