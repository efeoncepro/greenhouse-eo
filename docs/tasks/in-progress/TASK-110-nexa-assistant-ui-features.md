# TASK-110 — Nexa: assistant-ui Feature Adoption

## Delta 2026-03-28 — Lane B UI polish (Slice 1)

- `NexaThread.tsx` reescrito con primitivos assistant-ui reales:
  - `ActionBarPrimitive.Root` con `autohide='not-last'` y `hideWhenRunning` en respuestas assistant
  - `ActionBarPrimitive.Copy` con feedback visual (`data-copied` → tabler-check verde)
  - `ActionBarPrimitive.Reload` para regenerar respuesta
  - `ComposerPrimitive.Cancel` toggle: botón stop (rojo) reemplaza Send mientras Nexa genera
  - `ThreadPrimitive.ScrollToBottom` flotante con auto-hide, posicionado absolute sobre el viewport
  - `MessagePrimitive.Error` con border error, icono y botón "Reintentar" via `ActionBarPrimitive.Reload`
  - Animaciones fade-in + slide-up (`@keyframes nexa-msg-in`) en mensajes user y assistant
- `NexaHero.tsx` refactorizado: sugerencias self-contained con `useAui().thread().append()` (sin prop `onSuggestionClick`); `SuggestionPrimitive.Trigger` no acepta `prompt` en v0.12 — se usa el patrón manual pero encapsulado en el componente
- `HomeView.tsx` adapter modificado: errores HTTP y de red ahora lanzan `throw` → assistant-ui captura → `MessagePrimitive.Error` renderiza UI de error; abort se re-lanza limpio; se eliminó `useAui` y `onSuggestionClick` de HomeContent
- **Pendiente Slice 1b** (brief visual, no implementado):
  - `ActionBarPrimitive.Edit` + `EditComposer` inline para mensajes user — requiere manejo de edit state en message context; complejidad media, dejar para próxima iteración
  - `FollowupSuggestions` post-respuesta — requiere que backend envíe suggestions en metadata de respuesta; cuando existan, usar chips con `useAui().thread().append()`
  - `NexaPanel.tsx` deprecación formal — legacy, no tocar; eliminar cuando NexaThread cubra 100% de features

## Delta 2026-03-28 — Lane A runtime operativo

- `TASK-110` pasa a `in-progress` por ejecución explícita de la Lane A.
- `/api/home/nexa` ya devuelve `toolInvocations` reales y `HomeView.tsx` los traduce a `tool-call` parts del runtime de `@assistant-ui/react`, sin depender todavía del rediseño de Lane B.
- El backend de Nexa ya expone contratos operativos para `check_payroll`, `get_otd`, `check_emails`, `get_capacity` y `pending_invoices` en `src/lib/nexa/nexa-tools.ts`.
- `NexaService` ya usa function calling con Gemini y un segundo turno de síntesis grounded; si el modelo decide usar tools, el resultado queda persistido en la respuesta del runtime.
- Se agregó `src/views/greenhouse/home/components/NexaToolRenderers.tsx` como renderer mínimo de tool results para no bloquear la adopción visual posterior.
- `NexaPanel.tsx` no se tocó; cualquier drift visual entre esa pieza legacy y el runtime real sigue siendo hallazgo para Lane B.

## Delta 2026-03-28

- La integración real de Nexa sí usa `@assistant-ui/react` en `/home`, pero solo con primitives básicos (`AssistantRuntimeProvider`, `useLocalRuntime`, `ThreadPrimitive`, `ComposerPrimitive`, `MessagePrimitive`).
- El runtime activo vive en `src/views/greenhouse/home/HomeView.tsx`, `src/views/greenhouse/home/components/NexaHero.tsx` y `src/views/greenhouse/home/components/NexaThread.tsx`; `src/views/greenhouse/home/components/NexaPanel.tsx` sigue existiendo como implementación legacy paralela y no debería tomarse como source of truth.
- `/api/home/nexa` está conectado y funcional, pero la integración actual usa `lightContext` con módulos visibles y `history`; no existe todavía tool calling real ni acceso operativo a payroll, OTD, emails, capacidad o facturas.
- Las features principales prometidas por esta task siguen mayormente pendientes: no hay `ActionBarPrimitive`, `ComposerPrimitive.Cancel`, `ThreadPrimitive.ScrollToBottom`, `ErrorPrimitive`, `AssistantModalPrimitive`, `useAssistantToolUI`, feedback persistido ni thread history.
- Estado real recomendado: `Slice 1` parcial; `Slice 2`, `Slice 3` y `Slice 4` pendientes.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `In Progress` |
| Domain | `home` |

## Summary

Adoptar las funcionalidades built-in de `@assistant-ui/react` que hoy no estamos usando en NexaThread. La libreria ya esta instalada (Slice E de TASK-009) pero solo usamos primitivos basicos (Thread, Composer, Message). Hay 29 componentes pre-styled en el paquete `packages/ui/` que resuelven UX profesional de chat con copy, retry, cancel, scroll-to-bottom, suggestions nativas, tool calling UI, error display, edit-in-place, y floating modal.

## Why This Task Exists

El NexaThread actual reimplementa a mano lo que assistant-ui ya resuelve:

| Lo que hacemos manual | assistant-ui lo resuelve con |
|---|---|
| `TextPart` component custom | `MarkdownText` con syntax highlighting (Shiki) |
| `ThinkingIndicator` dots custom | Streaming cursor nativo (`dot.css`) |
| Burbujas con `sx` props | CSS classes con fade-in/slide-in animations |
| Sin boton copiar | `ActionBarPrimitive.Copy` con feedback ✓ |
| Sin retry | `ActionBarPrimitive.Reload` |
| Sin cancel | `ComposerPrimitive.Cancel` (boton ⬛) |
| Sin scroll-to-bottom | `ThreadPrimitive.ScrollToBottom` con auto-hide |
| Sin edit message | `ActionBarPrimitive.Edit` + `EditComposer` inline |
| Sin error display | `ErrorPrimitive` con border destructive |
| Sin welcome screen | `ThreadWelcome` con heading + suggestions grid |
| Suggestions con `Chip` + handler manual | `SuggestionPrimitive.Trigger` con auto-send |
| Sin floating modal | `AssistantModalPrimitive` (boton esquina → popup) |

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` — documento canonico de Nexa
- **Seccion 2.1 (Decision de styling: Opcion B)** — primitivos assistant-ui con wrapping MUI/Vuexy via `asChild`
- TASK-009 Slice E (assistant-ui migration) — completado
- `@assistant-ui/react` + `@assistant-ui/react-markdown` ya instalados

### Regla de styling (Opcion B)

Los primitivos de assistant-ui (`ActionBarPrimitive`, `ComposerPrimitive`, etc.) se usan con `asChild` para wrappear componentes MUI/Vuexy. Esto preserva la logica de assistant-ui (autohide, hideWhenRunning, copy feedback) con el look visual de Greenhouse. Ver seccion 2.1 del doc de arquitectura para ejemplos y tabla de mapeo shadcn → MUI.

## Dependencies & Impact

### Depends on

- TASK-009 Slice A+B+E (completados) — Home Nexa funcional con assistant-ui
- `/api/home/nexa` (Gemini via Vertex AI) — backend funcional

### Impacts to

- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaHero.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/app/api/home/nexa/route.ts`
- Layout principal del dashboard (floating modal)

### Files owned

- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaHero.tsx`
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx` (nuevo)
- `src/lib/nexa/nexa-tools.ts` (nuevo)
- `src/components/greenhouse/NexaFloatingButton.tsx` (nuevo)

## Source code reference: assistant-ui pre-built components

### Paquete `packages/ui/src/components/assistant-ui/` — 29 componentes

Source: https://github.com/assistant-ui/assistant-ui/tree/main/packages/ui/src/components/assistant-ui

| Componente | Proposito | Prioridad para Nexa |
|-----------|-----------|---------------------|
| `thread.tsx` | Thread completo: Welcome + Messages + Composer + ActionBars + ScrollToBottom | **P0** — reemplaza NexaThread |
| `follow-up-suggestions.tsx` | Chips post-respuesta con `SuggestionPrimitive.Trigger` | **P0** — reemplaza chips manuales |
| `tooltip-icon-button.tsx` | Boton con tooltip para Copy/Reload/Edit | **P0** — dependencia de ActionBars |
| `markdown-text.tsx` | Markdown con Shiki syntax highlighting | **P0** — ya parcialmente usado |
| `assistant-modal.tsx` | Boton flotante → popup de chat (esquina inferior derecha) | **P1** — Nexa portal-wide |
| `tool-fallback.tsx` | UI fallback para tool calls sin renderer custom | **P1** — para tool calling |
| `tool-group.tsx` | Agrupa multiples tool calls en bloque visual | **P1** — para tool calling |
| `shiki-highlighter.tsx` | Syntax highlighting para code blocks | P2 |
| `reasoning.tsx` | Chain-of-thought expandible (accordion) | P2 |
| `sources.tsx` | Cards de fuentes/citas en respuesta | P2 |
| `diff-viewer.tsx` | Diffs de codigo inline | P3 |
| `attachment.tsx` | File attachments en composer | P3 |
| `context-display.tsx` | Muestra contexto del modelo | P3 |
| `mermaid-diagram.tsx` | Diagramas Mermaid inline | P3 |
| `thread-list.tsx` | Historial de threads (sidebar) | P3 |
| `threadlist-sidebar.tsx` | Sidebar con lista de conversaciones | P3 |
| `assistant-sidebar.tsx` | Sidebar alternativo al modal | P3 |
| `model-selector.tsx` | Selector de modelo IA | No aplica |
| `composer-mention.tsx` | @ mentions en composer | No aplica |
| `heat-graph.tsx` | Grafico de calor | No aplica |

### Anatomia del `thread.tsx` oficial (source analizado)

El componente Thread pre-styled incluye:

**1. `ThreadWelcome`** — Pantalla de bienvenida con heading + grid de sugerencias 2-col
```
ThreadWelcome.Root → ThreadWelcome.Center → heading h1 + p
                   → ThreadSuggestions → grid 2-col → SuggestionPrimitive.Trigger
```

**2. `Composer`** con switch Send/Cancel:
```
ComposerPrimitive.Root → AttachmentDropzone
  → ComposerAttachments
  → ComposerPrimitive.Input (auto-resize, max-h-32)
  → ComposerAction:
      cuando !isRunning → Send button (↑)
      cuando isRunning  → Cancel button (⬛)
```

**3. `AssistantMessage`** con ActionBar + Error:
```
MessagePrimitive.Root (fade-in slide-in animation)
  → MessagePrimitive.Parts:
      text → MarkdownText (con Shiki)
      tool-call → toolUI ?? ToolFallback
  → MessageError (ErrorPrimitive con border destructive)
  → footer:
      BranchPicker (← 1/3 →)
      AssistantActionBar:
        Copy (📋 → ✓ feedback)
        Reload (🔄)
        More (⋯ → Export Markdown)
```

**4. `UserMessage`** con Edit:
```
MessagePrimitive.Root (grid layout)
  → UserMessageAttachments
  → content (rounded-2xl bg-muted)
  → UserActionBar: Edit (✏️)
  → BranchPicker
```

**5. `EditComposer`** — inline editing:
```
ComposerPrimitive.Root (dentro de MessagePrimitive.Root)
  → Input (auto-resize)
  → Cancel + Send buttons
```

**6. `ThreadScrollToBottom`** — boton flotante:
```
ThreadPrimitive.ScrollToBottom (absolute -top-12, rounded-full, disabled:invisible)
```

## Scope

### Slice 1 — Rewrite NexaThread con componentes pre-styled

Reescribir `NexaThread.tsx` usando la anatomia del `thread.tsx` oficial como referencia, adaptado a MUI/Greenhouse:

| Feature | Que cambia |
|---------|-----------|
| **ActionBar assistant** | Copy (📋→✓) + Reload (🔄) en hover sobre cada respuesta |
| **ActionBar user** | Edit (✏️) para editar y reenviar mensajes |
| **EditComposer** | Inline editing de mensajes ya enviados |
| **Cancel** | Boton ⬛ reemplaza Send mientras Nexa genera |
| **ScrollToBottom** | Boton flotante ↓ con auto-hide |
| **Suggestions nativas** | `SuggestionPrimitive.Trigger` con `autoSend` en NexaHero |
| **FollowupSuggestions** | Chips post-respuesta en el thread |
| **Error display** | `ErrorPrimitive` con border error para respuestas fallidas |
| **Animations** | fade-in + slide-in en cada mensaje nuevo |

**Esfuerzo:** ~2 horas

### Slice 2 — Tool calling (Nexa operativa)

Nexa consulta datos reales del portal via tool calling.

**Tools:**

| Tool | Datos | Source |
|------|-------|--------|
| `check_payroll` | Status nomina, headcount, net total | `payroll_periods` |
| `get_otd` | OTD global del equipo | `ico_organization_metrics` |
| `check_emails` | Correos fallidos ultimas 24h | `email_deliveries` |
| `get_capacity` | Capacidad asignada vs contratada | `member_capacity_economics` |
| `pending_invoices` | Facturas pendientes de cobro | `fin_income` |

**UI:** `useAssistantToolUI` renderiza resultados como cards MUI inline.

**Esfuerzo:** ~4 horas

### Slice 3 — Feedback y persistencia

| Feature | Implementacion | Esfuerzo |
|---------|---------------|----------|
| Feedback thumbs up/down | `ActionBarPrimitive.FeedbackPositive/Negative` + `FeedbackAdapter` → PG | Medio |
| Thread history | `ThreadHistoryAdapter` → PG table `nexa_threads` | Alto |
| Dynamic suggestions | `SuggestionAdapter` genera follow-ups post-respuesta | Bajo |

### Slice 4 — Nexa flotante (portal-wide)

Basado en `assistant-modal.tsx` oficial:

```
AssistantModalPrimitive.Root
  → Anchor (fixed right-4 bottom-4)
  → Trigger (boton circular con icono sparkles)
  → Content (popup 400x500, contiene Thread completo)
```

Registrado en layout principal del dashboard → disponible en todas las paginas.

**Esfuerzo:** ~2 horas

## Orden de ejecucion

1. **Slice 1** (UI polish) → rewrite NexaThread con ActionBars + Cancel + ScrollToBottom
2. **Slice 2** (tool calling) → Nexa consulta datos reales
3. **Slice 3** (feedback + persistencia) → mejora gradual
4. **Slice 4** (floating modal) → Nexa en todas las paginas

## Estado real por slice

### Slice 1 — assistant-ui UX polish

- `Implementado` (Lane B, 5/7 items cerrados)
- Resuelto:
  - `ActionBarPrimitive.Copy` con feedback visual (copy → check verde)
  - `ActionBarPrimitive.Reload` en assistant messages
  - `ComposerPrimitive.Cancel` toggle Send/Stop
  - `ThreadPrimitive.ScrollToBottom` flotante con auto-hide
  - `MessagePrimitive.Error` con border error + botón reintentar
  - Adapter lanza `throw` en errores → error state nativo de assistant-ui
  - Animaciones fade-in + slide-up en mensajes
  - Suggestions self-contained en NexaHero via `useAui`
- Pendiente (Slice 1b):
  - `ActionBarPrimitive.Edit` + `EditComposer` inline
  - `FollowupSuggestions` post-respuesta (requiere backend)
  - Deprecación formal de `NexaPanel.tsx`

### Slice 2 — tool calling operativa

- `Pendiente`
- No existen:
  - `src/views/greenhouse/home/components/NexaToolRenderers.tsx`
  - `src/lib/nexa/nexa-tools.ts`
- `/api/home/nexa` hoy solo pasa `prompt + history + lightContext`, sin tools ni adapters operativos.

### Slice 3 — feedback y persistencia

- `Pendiente`
- No existe persistencia de:
  - feedback thumbs up/down
  - historial de threads
  - follow-up suggestions dinámicas

### Slice 4 — Nexa flotante portal-wide

- `Pendiente`
- No existe:
  - `src/components/greenhouse/NexaFloatingButton.tsx`
  - integración en layout global
  - modal/sidebar assistant-ui portal-wide

## Checklist de cierre

### Slice 1 — UI assistant-ui

- [x] Reemplazar las sugerencias manuales por primitives nativas o un patrón equivalente bien encapsulado
- [x] Agregar `Copy` + `Reload` en respuestas assistant
- [ ] Agregar edición inline de mensajes user — **brief: requiere EditComposer + message edit state, deferred a Slice 1b**
- [x] Cambiar `Send` por `Cancel` mientras Nexa está corriendo
- [x] Agregar `ScrollToBottom`
- [x] Mostrar errores técnicos como estado/error del thread y no como texto normal del asistente
- [ ] Eliminar o reclasificar `NexaPanel.tsx` para evitar drift — **brief: no tocar legacy, eliminar cuando NexaThread sea 100%**

### Slice 2 — integración operativa

- [x] Definir `nexa-tools` con contratos explícitos
- [x] Conectar tools reales al runtime de Nexa
- [x] Renderizar resultados de tools en UI dedicada mínima
- [x] Verificar por código que Nexa ya responde con datos del portal y no solo con contexto textual

### Slice 3 — persistencia

- [ ] Persistir feedback de respuestas
- [ ] Persistir threads o dejar explícitamente fuera de alcance en follow-up
- [ ] Definir patrón de suggestions dinámicas post-respuesta

### Slice 4 — portal-wide

- [ ] Diseñar y montar `Nexa` como floating entrypoint o sidebar
- [ ] Integrarlo al layout del dashboard sin romper Home
- [ ] Verificar acceso y comportamiento cross-route

## Split recomendado: backend vs UI

### Lane A — backend / integración operativa

Esta lane debería vivir separada del polish visual porque cambia capacidades reales de Nexa:

- tool calling
- contratos de datos por tool
- adapters/runtime del chat
- feedback persistence
- thread history persistence
- criterios de autorización y observabilidad

Entregables concretos:

- `src/lib/nexa/nexa-tools.ts`
- mutaciones o rutas necesarias para tool execution
- contrato de feedback/history
- actualización de `/api/home/nexa` o servicio de Nexa para soportar tools

### Lane B — UI / assistant-ui adoption

Esta lane sí es ideal para diseño/implementación con Claude porque es principalmente de interface:

- action bars
- composer states
- error states
- scroll-to-bottom
- follow-up suggestions
- floating modal/sidebar
- cleanup de `NexaPanel.tsx` vs `NexaThread.tsx`

Entregables concretos:

- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaHero.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx` o equivalente
- brief visual consistente con assistant-ui + Greenhouse

## Out of Scope

- Reemplazar Gemini por otro modelo
- Multi-tenant Nexa (cada Space con su contexto)
- Voice-first interface
- Thread branching (BranchPicker)
- Attachment uploads al chat

## Acceptance Criteria

- [ ] Slice 1: Copy, Reload, Cancel, ScrollToBottom, Edit, FollowupSuggestions, Error display, animations
- [ ] Slice 2: Nexa responde con datos reales de payroll, OTD, emails, capacidad, facturas
- [ ] Slice 2: Tool results renderizan como cards MUI inline
- [ ] Slice 3: Feedback persiste en PG
- [ ] Slice 4: Nexa disponible como floating button en cualquier pagina
- [ ] `pnpm build && pnpm test`
