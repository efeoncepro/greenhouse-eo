/**
 * TASK-1094 — Feature flag del webhook de auto-ingest de knowledge.
 *
 * Patrón canónico Greenhouse `process.env.X === 'true'` (sin drift, default OFF).
 * Kill-switch: cuando OFF, el handler ACK-ea el handshake de verificación pero
 * dropea los eventos (cero re-fetch, cero outbox emit). Activación operador-side
 * deliberada tras configurar la suscripción Notion + el secret HMAC.
 */

export const isNotionKnowledgeWebhookEnabled = (): boolean =>
  process.env.NOTION_KNOWLEDGE_WEBHOOK_ENABLED === 'true'
