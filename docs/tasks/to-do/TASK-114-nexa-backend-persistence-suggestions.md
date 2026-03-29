# TASK-114 — Nexa Backend: Persistence, Feedback & Dynamic Suggestions

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `41`
- Domain: `home / ai`
- Assigned to: **Codex**

## Summary

Crear la capa backend de persistencia y generación dinámica para Nexa: feedback de respuestas, historial de threads, y suggestions post-respuesta. Todo vive en `greenhouse_ai` schema y se expone a través de contratos TypeScript que la UI ya espera.

## Why This Task Exists

TASK-110 Lane A entregó tool calling real y Lane B entregó UI polish con assistant-ui. Pero la experiencia es stateless:

- No se persiste feedback (thumbs up/down) → no hay señal para mejorar calidad
- No hay historial de threads → cada sesión empieza de cero
- Las suggestions post-respuesta vienen vacías (`suggestions: []`) → la UI no puede ofrecer follow-ups

Este task cierra la brecha de persistencia sin tocar UI.

## Architecture Alignment

- Schema: `greenhouse_ai` (ya declarado en CLAUDE.md)
- Acceso runtime: credenciales `runtime` (`GREENHOUSE_POSTGRES_USER`)
- Migraciones: credenciales `migrator` (`GREENHOUSE_POSTGRES_MIGRATOR_USER`)
- Patrón: server-only modules en `src/lib/nexa/`
- Contrato compartido: `src/lib/nexa/nexa-contract.ts`

## Contrato explícito con UI (TASK-115)

### 1. Feedback — `POST /api/home/nexa/feedback`

La UI va a enviar:

```typescript
// Request body
interface NexaFeedbackRequest {
  responseId: string        // el `id` de NexaResponse
  sentiment: 'positive' | 'negative'
  comment?: string          // opcional, texto libre del usuario
}

// Response
interface NexaFeedbackResponse {
  ok: boolean
}
```

**Tabla PG requerida:** `greenhouse_ai.nexa_feedback`

```sql
CREATE TABLE greenhouse_ai.nexa_feedback (
  feedback_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id    TEXT NOT NULL,               -- NexaResponse.id
  user_id        TEXT NOT NULL,               -- session user
  client_id      TEXT NOT NULL,               -- tenant
  sentiment      TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative')),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Qué debe hacer el endpoint:**
- Validar sesión (igual que `/api/home/nexa`)
- Insertar fila en `greenhouse_ai.nexa_feedback`
- Retornar `{ ok: true }`
- No duplicar: si ya existe feedback para ese `response_id` + `user_id`, hacer upsert

**Archivo:** `src/app/api/home/nexa/feedback/route.ts`

---

### 2. Thread History — `GET /api/home/nexa/threads` + `GET /api/home/nexa/threads/[threadId]`

La UI va a pedir:

```typescript
// GET /api/home/nexa/threads → lista de threads del usuario
interface NexaThreadListItem {
  threadId: string
  title: string             // primer mensaje del user truncado a 80 chars
  messageCount: number
  lastMessageAt: string     // ISO timestamp
  createdAt: string
}

// GET /api/home/nexa/threads/[threadId] → mensajes de un thread
interface NexaThreadDetail {
  threadId: string
  messages: NexaThreadMessage[]
}

interface NexaThreadMessage {
  messageId: string
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: NexaToolInvocation[]  // ya definido en nexa-contract.ts
  suggestions?: string[]
  modelId?: string
  createdAt: string
}
```

**Tablas PG requeridas:**

```sql
CREATE TABLE greenhouse_ai.nexa_threads (
  thread_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  client_id      TEXT NOT NULL,
  title          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_ai.nexa_messages (
  message_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      UUID NOT NULL REFERENCES greenhouse_ai.nexa_threads(thread_id),
  role           TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content        TEXT NOT NULL,
  tool_invocations JSONB,    -- NexaToolInvocation[] serializado
  suggestions    TEXT[],      -- follow-up suggestions generadas
  model_id       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nexa_threads_user ON greenhouse_ai.nexa_threads(user_id, client_id);
CREATE INDEX idx_nexa_messages_thread ON greenhouse_ai.nexa_messages(thread_id, created_at);
```

**Qué debe hacer:**
- `GET /threads`: retornar últimos 20 threads del user (ordenados por `last_message_at DESC`)
- `GET /threads/[threadId]`: retornar thread con sus mensajes ordenados por `created_at ASC`
- Validar que el thread pertenece al user/client de la sesión

**Persistencia de mensajes:**
- Modificar `POST /api/home/nexa` para que ADEMÁS de retornar la respuesta, persista el par user+assistant en `nexa_messages`
- Si no existe `threadId` en el body, crear un thread nuevo y retornar `threadId` en la response
- Si existe `threadId`, agregar mensajes al thread existente

**Cambio en NexaResponse:**

```typescript
// Agregar a NexaResponse en nexa-contract.ts:
export interface NexaResponse {
  id: string
  role: 'assistant'
  content: string
  suggestions?: string[]
  timestamp: string
  toolInvocations?: NexaToolInvocation[]
  modelId?: string
  threadId?: string          // ← NUEVO: thread al que pertenece
}
```

**Archivos:**
- `src/app/api/home/nexa/threads/route.ts` (GET lista)
- `src/app/api/home/nexa/threads/[threadId]/route.ts` (GET detalle)
- `src/app/api/home/nexa/route.ts` (modificar para persistir)
- `src/lib/nexa/nexa-contract.ts` (agregar `threadId`)

---

### 3. Dynamic Suggestions — poblar `suggestions` en NexaResponse

Hoy `NexaService.generateResponse()` retorna `suggestions: []`. El contrato ya existe.

**Qué debe hacer:**
- Después de generar la respuesta principal, hacer una segunda llamada ligera al modelo (o parsear del mismo turno) para generar 2-3 follow-up questions relevantes
- Retornarlas en `suggestions: string[]` del `NexaResponse`
- Si falla la generación de suggestions, retornar `[]` sin bloquear la respuesta principal

**Ejemplo de output esperado:**

```json
{
  "id": "nexa-abc123",
  "content": "El OTD global del equipo es 91.2%...",
  "suggestions": [
    "¿Qué miembros están por debajo del target?",
    "¿Cómo se compara con el mes anterior?",
    "Muéstrame el desglose por proyecto"
  ],
  "toolInvocations": [...]
}
```

**Archivo:** `src/lib/nexa/nexa-service.ts` (modificar `generateResponse`)

---

## Dependencies & Impact

### Depends on

- TASK-110 Lane A (completada) — contratos y service ya existen
- Schema `greenhouse_ai` — debe existir en Postgres
- Credenciales `migrator` para DDL

### Impacts to

- TASK-115 (UI) — consume estos endpoints y contratos
- `/api/home/nexa` — se modifica para persistir
- `src/lib/nexa/nexa-contract.ts` — se extiende con `threadId`

### Files owned

- `src/app/api/home/nexa/feedback/route.ts` (nuevo)
- `src/app/api/home/nexa/threads/route.ts` (nuevo)
- `src/app/api/home/nexa/threads/[threadId]/route.ts` (nuevo)
- `src/app/api/home/nexa/route.ts` (modificar)
- `src/lib/nexa/nexa-service.ts` (modificar suggestions)
- `src/lib/nexa/nexa-contract.ts` (extender)
- Migración DDL para tablas

## Out of Scope

- UI de feedback, thread list, o suggestions (eso es TASK-115)
- Cambios en el modelo de IA o tool calling
- Auth/permisos avanzados (trust session como hoy)
- Retention policy o cleanup de threads viejos

## Acceptance Criteria

- [ ] `POST /api/home/nexa/feedback` persiste feedback en `greenhouse_ai.nexa_feedback`
- [ ] `GET /api/home/nexa/threads` retorna threads del usuario
- [ ] `GET /api/home/nexa/threads/[threadId]` retorna mensajes del thread
- [ ] `POST /api/home/nexa` persiste mensajes y retorna `threadId`
- [ ] `NexaResponse.suggestions` se puebla con 2-3 follow-ups reales
- [ ] `NexaResponse.threadId` presente en la response
- [ ] Migraciones DDL incluidas y documentadas
- [ ] Zero TS errors, lint clean
