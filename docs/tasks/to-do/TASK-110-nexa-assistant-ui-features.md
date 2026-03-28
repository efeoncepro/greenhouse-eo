# TASK-110 — Nexa: assistant-ui Feature Adoption

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño completo` |
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
