# TASK-115 — Nexa UI: Edit, Suggestions, Feedback, Floating & Thread History

## Delta 2026-03-29

- `TASK-114` quedó implementada y cerrada.
- El backend ya expone endpoints reales para:
  - `POST /api/home/nexa/feedback`
  - `GET /api/home/nexa/threads`
  - `GET /api/home/nexa/threads/[threadId]`
- `POST /api/home/nexa` ya retorna `threadId` y `suggestions` dinámicas, así que `Slice B` y `Slice D` quedan desbloqueados sin depender de mocks.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `42`
- Domain: `home / ui`
- Assigned to: **Claude**

## Summary

Completar la adopción de assistant-ui en Nexa con las features de UI que quedaron pendientes de TASK-110: edición inline de mensajes, follow-up suggestions, feedback thumbs, floating modal portal-wide, thread history sidebar, y deprecación de `NexaPanel.tsx`. Consume los endpoints que TASK-114 provee.

## Why This Task Exists

TASK-110 Lane B / Slice 1 entregó ActionBar Copy/Reload, Cancel, ScrollToBottom, error UI y animaciones. Falta cerrar la experiencia "assistant product" con:

- No se puede editar un mensaje ya enviado → pierde productividad
- No hay follow-up suggestions → el usuario tiene que inventar qué preguntar
- No hay feedback visual → no hay señal de calidad
- Nexa solo existe en `/home` → debería estar disponible portal-wide
- No hay historial → cada sesión empieza de cero
- `NexaPanel.tsx` sigue existiendo como legacy → drift

## Architecture Alignment

- Styling: **Opción B** — primitivos assistant-ui con wrapping MUI via `asChild` (GREENHOUSE_NEXA_ARCHITECTURE_V1.md §2.1)
- Icons: Tabler (`tabler-*`), no Lucide
- Animaciones: `sx` + `@keyframes`, no tailwindcss-animate
- Runtime: `LocalRuntime` con `ChatModelAdapter` en HomeView

## Contrato explícito con Backend (TASK-114)

### Lo que la UI espera recibir

#### 1. Feedback endpoint

```
POST /api/home/nexa/feedback
Body: { responseId: string, sentiment: 'positive' | 'negative', comment?: string }
Response: { ok: boolean }
```

La UI envía feedback después de que el usuario haga click en thumbs up/down. Fire-and-forget (no bloquea la interacción).

#### 2. Suggestions en NexaResponse

```typescript
// Ya existe en nexa-contract.ts, el backend la puebla:
interface NexaResponse {
  // ...campos existentes...
  suggestions?: string[]    // ← backend llena con 2-3 follow-ups
  threadId?: string         // ← backend asigna
}
```

La UI renderiza `suggestions` como chips clicables debajo de la última respuesta del assistant. Si `suggestions` es `[]` o `undefined`, no muestra nada.

#### 3. Thread history endpoints

```
GET /api/home/nexa/threads
→ NexaThreadListItem[] (últimos 20 threads)

GET /api/home/nexa/threads/[threadId]
→ NexaThreadDetail { threadId, messages: NexaThreadMessage[] }
```

La UI muestra un sidebar/drawer con threads anteriores y permite recargar uno.

#### 4. Thread ID en POST /api/home/nexa

```
POST /api/home/nexa
Body: { prompt, history, model, threadId?: string }
Response: NexaResponse (incluye threadId)
```

La UI envía `threadId` si existe un thread activo. Si la response trae `threadId`, la UI lo guarda para siguientes mensajes.

---

## Scope

### Slice A — Edit inline de mensajes user

| Item | Detalle |
|------|---------|
| `ActionBarPrimitive.Edit` | Botón pencil en hover sobre mensajes user |
| `EditComposer` | `ComposerPrimitive.Root` dentro de `MessagePrimitive.Root` |
| Toggle content/edit | Conditional render basado en edit state del message context |
| Save + Cancel | `ComposerPrimitive.Send` (guardar) + `ComposerPrimitive.Cancel` (cancelar) |

**Archivos:** `src/views/greenhouse/home/components/NexaThread.tsx`

**Patrón assistant-ui:**
```tsx
// Dentro de UserMessage:
<MessagePrimitive.Root>
  {/* Content mode */}
  <Box>
    <MessagePrimitive.Content ... />
    <ActionBarPrimitive.Root autohide='always'>
      <ActionBarPrimitive.Edit asChild>
        <IconButton><i className='tabler-pencil' /></IconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  </Box>
  {/* Edit mode — ComposerPrimitive dentro del message context actúa como EditComposer */}
  <ComposerPrimitive.Root>
    <ComposerPrimitive.Input ... />
    <ComposerPrimitive.Send>Guardar</ComposerPrimitive.Send>
    <ComposerPrimitive.Cancel>Cancelar</ComposerPrimitive.Cancel>
  </ComposerPrimitive.Root>
</MessagePrimitive.Root>
```

**Esfuerzo:** ~1 hora

---

### Slice B — Follow-up suggestions + feedback thumbs

| Item | Detalle |
|------|---------|
| FollowupSuggestions | Chips debajo de la última respuesta, leen `suggestions` de NexaResponse |
| Feedback thumbs | 👍/👎 en ActionBar del assistant message, POST a `/api/home/nexa/feedback` |
| Visual feedback | Thumb seleccionado cambia a filled/color, fire-and-forget |

**Depende de:** TASK-114 (endpoint feedback + suggestions pobladas)

**Archivos:**
- `src/views/greenhouse/home/components/NexaThread.tsx` (feedback en ActionBar + suggestions)
- `src/views/greenhouse/home/HomeView.tsx` (pasar suggestions del adapter a la UI)

**Patrón sugerido para follow-ups:**
```tsx
// Después del último AssistantMessage:
{lastMessage?.suggestions?.map(suggestion => (
  <Chip
    key={suggestion}
    label={suggestion}
    size='small'
    variant='outlined'
    onClick={() => aui.thread().append({ role: 'user', content: [{ type: 'text', text: suggestion }] })}
  />
))}
```

**Patrón sugerido para feedback:**
```tsx
// En AssistantMessage ActionBar:
<ActionBarPrimitive.FeedbackPositive asChild>
  <IconButton size='small'><i className='tabler-thumb-up' /></IconButton>
</ActionBarPrimitive.FeedbackPositive>
<ActionBarPrimitive.FeedbackNegative asChild>
  <IconButton size='small'><i className='tabler-thumb-down' /></IconButton>
</ActionBarPrimitive.FeedbackNegative>
```

Nota: `ActionBarPrimitive.FeedbackPositive/Negative` necesita un `FeedbackAdapter` en el runtime. Si assistant-ui v0.12 no lo soporta nativamente en `LocalRuntime`, implementar como botones manuales con `fetch` directo.

**Esfuerzo:** ~1.5 horas

---

### Slice C — Floating modal portal-wide (Nexa en todas las páginas)

| Item | Detalle |
|------|---------|
| `NexaFloatingButton` | Botón circular fixed bottom-right con sparkles icon |
| Modal/Popover | Click abre un panel 400×550 con Thread completo |
| Layout integration | Registrado en `src/layouts/` o `src/components/layout/` |
| Context preservation | Si el usuario ya estaba chateando en `/home`, el floating retoma el thread |

**Archivos:**
- `src/components/greenhouse/NexaFloatingButton.tsx` (nuevo)
- `src/components/layout/vertical/VerticalLayout.tsx` o similar (integración)

**Patrón assistant-ui:**
```tsx
import { AssistantModalPrimitive } from '@assistant-ui/react'

// En layout global:
<AssistantModalPrimitive.Root>
  <AssistantModalPrimitive.Anchor style={{ position: 'fixed', bottom: 16, right: 16 }}>
    <AssistantModalPrimitive.Trigger asChild>
      <Fab color='primary'><i className='tabler-sparkles' /></Fab>
    </AssistantModalPrimitive.Trigger>
  </AssistantModalPrimitive.Anchor>
  <AssistantModalPrimitive.Content style={{ width: 400, height: 550 }}>
    <NexaThread compact />
  </AssistantModalPrimitive.Content>
</AssistantModalPrimitive.Root>
```

**Consideraciones:**
- Verificar que `AssistantModalPrimitive` existe en v0.12 (si no, usar MUI `Drawer` o `Popover` manual)
- El runtime provider debería estar en el layout para compartir estado entre `/home` y el floating
- No mostrar el floating cuando el usuario está en `/home` (ya tiene Nexa inline)

**Esfuerzo:** ~2 horas

---

### Slice D — Thread history + NexaPanel cleanup

| Item | Detalle |
|------|---------|
| Thread sidebar/drawer | Drawer izquierdo con lista de threads anteriores |
| Load thread | Click carga mensajes del thread seleccionado vía `GET /api/home/nexa/threads/[id]` |
| New thread | Botón "Nueva conversación" resetea el thread |
| Thread ID tracking | HomeView mantiene `threadId` state, lo envía en cada POST |
| NexaPanel.tsx | Eliminar archivo legacy — NexaThread ya cubre todo |

**Depende de:** TASK-114 (endpoints threads)

**Archivos:**
- `src/views/greenhouse/home/components/NexaThreadSidebar.tsx` (nuevo)
- `src/views/greenhouse/home/HomeView.tsx` (threadId state + sidebar toggle)
- `src/views/greenhouse/home/components/NexaPanel.tsx` (eliminar)

**Esfuerzo:** ~2 horas

---

## Dependencies & Impact

### Depends on

- TASK-110 Lane B / Slice 1 (completado) — ActionBar, Cancel, ScrollToBottom, error UI
- TASK-114 (backend) — feedback endpoint, thread persistence, dynamic suggestions
  - **Slice A** (Edit) no depende de TASK-114 → se puede hacer ya
  - **Slice B** (Suggestions + Feedback) requiere TASK-114 endpoints
  - **Slice C** (Floating) no depende de TASK-114 → se puede hacer ya
  - **Slice D** (Thread history) requiere TASK-114 endpoints

### Impacts to

- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaHero.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx` (nuevo)
- Layout global del dashboard

### Files owned

- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaHero.tsx`
- `src/views/greenhouse/home/components/NexaThreadSidebar.tsx` (nuevo)
- `src/components/greenhouse/NexaFloatingButton.tsx` (nuevo)
- `src/views/greenhouse/home/HomeView.tsx`

## Orden de ejecución recomendado

1. **Slice A** (Edit inline) — sin dependencia backend, se puede hacer ya
2. **Slice C** (Floating modal) — sin dependencia backend, se puede hacer ya
3. **Slice B** (Suggestions + Feedback) — después de TASK-114
4. **Slice D** (Thread history + cleanup) — después de TASK-114

## Out of Scope

- Backend de persistencia (eso es TASK-114)
- Cambios en el modelo de IA
- Thread branching (BranchPicker)
- Voice interface
- Attachment uploads

## Acceptance Criteria

- [ ] Edit inline funcional en mensajes user (Edit → ComposerPrimitive → Save/Cancel)
- [ ] Follow-up suggestions se renderizan como chips clicables cuando `suggestions` viene poblado
- [ ] Feedback thumbs up/down envía POST y muestra estado visual
- [ ] Nexa flotante disponible en todas las páginas del dashboard (excepto `/home` donde ya es inline)
- [ ] Thread history cargable desde sidebar/drawer
- [ ] `NexaPanel.tsx` eliminado sin regresión
- [ ] Zero TS errors, lint clean, `pnpm build` pasa
