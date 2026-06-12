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
