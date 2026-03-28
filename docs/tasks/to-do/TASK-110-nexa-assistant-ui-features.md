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

Adoptar las funcionalidades built-in de `@assistant-ui/react` que hoy no estamos usando en NexaPanel/NexaThread. La libreria ya esta instalada (Slice E de TASK-009) pero solo usamos primitivos basicos (Thread, Composer, Message). Hay funcionalidades de alto valor como copy, retry, cancel, scroll-to-bottom, suggestions nativas, tool calling UI, y floating modal que mejorarian significativamente la experiencia de Nexa.

## Why This Task Exists

El NexaPanel actual usa `@assistant-ui/react` solo para el runtime y rendering basico de mensajes. La libreria ofrece un ecosistema completo de interacciones de chat que hoy reimplementamos a mano o simplemente no tenemos:

- No hay boton de copiar respuesta
- No hay retry de respuesta fallida (el usuario tiene que reescribir)
- No hay cancel mientras Nexa piensa
- Los suggestion chips usan un handler manual en vez del primitivo nativo
- No hay scroll-to-bottom cuando el usuario sube en el chat
- No hay tool calling (Nexa no puede consultar datos reales del portal)
- Nexa solo vive en `/home` — no esta disponible desde otras paginas

## Architecture Alignment

- TASK-009 Slice E (assistant-ui migration) — completado
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `@assistant-ui/react` ya instalado (`package.json`)

## Dependencies & Impact

### Depends on

- TASK-009 Slice A+B+E (completados) — Home Nexa funcional con assistant-ui
- `/api/home/nexa` (Gemini via Vertex AI) — backend funcional

### Impacts to

- `src/views/greenhouse/home/components/NexaThread.tsx` — agrega ActionBar, ScrollToBottom, Cancel
- `src/views/greenhouse/home/components/NexaHero.tsx` — migra suggestions a ThreadPrimitive.Suggestion
- `src/views/greenhouse/home/HomeView.tsx` — agrega tool definitions
- `src/app/api/home/nexa/route.ts` — agrega tool calling backend
- Potencialmente todas las paginas si se implementa floating modal

### Files owned

- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaHero.tsx`
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx` (nuevo)
- `src/lib/nexa/nexa-tools.ts` (nuevo)

## Inventario de funcionalidades assistant-ui disponibles

### Primitivos disponibles en `@assistant-ui/react`

| Primitivo | Descripcion | Estado actual |
|-----------|-------------|---------------|
| `ThreadPrimitive.Root` | Container del thread | Usado |
| `ThreadPrimitive.Viewport` | Viewport con auto-scroll | Usado |
| `ThreadPrimitive.Messages` | Lista de mensajes con custom components | Usado |
| `ThreadPrimitive.ScrollToBottom` | Boton flotante para bajar cuando hay scroll | **No usado** |
| `ThreadPrimitive.Suggestion` | Chip de sugerencia con `prompt` + `autoSend` | **No usado** (manual) |
| `ThreadPrimitive.Empty` | Render condicional cuando no hay mensajes | **No usado** |
| `ComposerPrimitive.Root` | Container del composer | Usado |
| `ComposerPrimitive.Input` | Input de texto | Usado |
| `ComposerPrimitive.Send` | Boton de enviar | Usado |
| `ComposerPrimitive.Cancel` | Boton para cancelar generacion | **No usado** |
| `ComposerPrimitive.Dictate` | Input por voz (Web Speech API) | **No usado** |
| `MessagePrimitive.Root` | Container del mensaje | Usado |
| `MessagePrimitive.Content` | Renderiza partes del mensaje | Usado |
| `MessagePrimitive.If` | Render condicional por rol/estado | **No usado** |
| `ActionBarPrimitive.Root` | Container de acciones por mensaje | **No usado** |
| `ActionBarPrimitive.Copy` | Copiar respuesta al clipboard | **No usado** |
| `ActionBarPrimitive.Reload` | Regenerar ultima respuesta | **No usado** |
| `ActionBarPrimitive.Edit` | Editar mensaje de usuario | **No usado** |
| `ActionBarPrimitive.Speak` | Leer respuesta en voz alta (TTS) | **No usado** |
| `ActionBarPrimitive.FeedbackPositive` | Thumbs up | **No usado** |
| `ActionBarPrimitive.FeedbackNegative` | Thumbs down | **No usado** |
| `ActionBarPrimitive.ExportMarkdown` | Exportar conversacion | **No usado** |
| `AssistantModalPrimitive.*` | Modal flotante (trigger + content) | **No usado** |
| `BranchPickerPrimitive.*` | Navegar versiones de respuesta | **No usado** |
| `ThreadListPrimitive.*` | Historial de threads (sidebar) | **No usado** |

### Funcionalidades de runtime

| Feature | API | Estado |
|---------|-----|--------|
| `makeAssistantTool` | Registrar tool que Nexa puede llamar | **No usado** |
| `useAssistantToolUI` | Renderizar resultado de tool inline | **No usado** |
| `SuggestionAdapter` | Generar sugerencias dinamicas post-respuesta | **No usado** |
| `FeedbackAdapter` | Persistir feedback positivo/negativo | **No usado** |
| `SpeechSynthesisAdapter` | Text-to-speech custom | **No usado** |
| `DictationAdapter` | Speech-to-text custom | **No usado** |
| `AttachmentAdapter` | Subir archivos al chat | **No usado** |
| `ThreadHistoryAdapter` | Persistir conversaciones | **No usado** |

## Scope

### Slice 1 — Quick wins (UX polish)

Funcionalidades que mejoran la experiencia sin cambiar el backend.

| Feature | Primitivo | Cambio | Esfuerzo |
|---------|-----------|--------|----------|
| **Copy respuesta** | `ActionBarPrimitive.Copy` | ActionBar en hover sobre cada mensaje assistant con boton copiar | 10 min |
| **Retry respuesta** | `ActionBarPrimitive.Reload` | Boton retry en ActionBar — regenera la respuesta sin reescribir | 5 min |
| **Cancel generacion** | `ComposerPrimitive.Cancel` | Boton X junto al Send mientras Nexa piensa — cancela el fetch | 5 min |
| **Scroll to bottom** | `ThreadPrimitive.ScrollToBottom` | Boton flotante "↓" cuando el usuario sube en el thread | 10 min |
| **Suggestions nativas** | `ThreadPrimitive.Suggestion` | Reemplazar handler manual por `<ThreadPrimitive.Suggestion prompt="..." autoSend />` | 10 min |

**Resultado:** Chat se siente profesional — copiar, reintentar, cancelar, navegar. Sin cambios de backend.

### Slice 2 — Tool calling (Nexa operativa)

Nexa deja de ser un chatbot generico y puede consultar datos reales del portal.

**Arquitectura:**

```
Usuario pregunta "¿Como va la nomina?"
  → adapter envia a /api/home/nexa
  → Gemini decide llamar tool `check_payroll`
  → backend ejecuta la query y retorna resultado
  → Nexa muestra respuesta con datos reales
  → useAssistantToolUI renderiza card MUI inline
```

**Tools a implementar:**

| Tool | Descripcion | Datos que consulta |
|------|-------------|-------------------|
| `check_payroll` | Estado de nomina del mes actual | `payroll_periods` — status, headcount, net total |
| `get_otd` | OTD global del equipo | `ico_organization_metrics` — otd_pct |
| `check_emails` | Correos fallidos recientes | `email_deliveries` — count failed last 24h |
| `get_capacity` | Capacidad disponible del equipo | `member_capacity_economics` — assigned vs contracted |
| `pending_invoices` | Facturas pendientes de cobro | `fin_income` — status pending/overdue |

**Archivos nuevos:**
- `src/lib/nexa/nexa-tools.ts` — definicion de tools + handlers server-side
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx` — UI components para resultados de tools

**Cambios:**
- `src/app/api/home/nexa/route.ts` — agregar tool execution loop
- `src/views/greenhouse/home/HomeView.tsx` — registrar `makeAssistantTool` / `useAssistantToolUI`

### Slice 3 — Feedback y persistencia

| Feature | Que hace | Esfuerzo |
|---------|----------|----------|
| **Feedback** | Thumbs up/down en cada respuesta, persiste en PG para mejorar Nexa | Medio |
| **Thread history** | Conversaciones persisten entre sesiones (ThreadHistoryAdapter → PG) | Alto |
| **Dynamic suggestions** | Nexa sugiere follow-ups despues de cada respuesta (SuggestionAdapter) | Bajo |

### Slice 4 — Nexa flotante (portal-wide)

Nexa deja de vivir solo en `/home` y aparece como boton flotante en cualquier pagina.

| Feature | Primitivo | Que hace |
|---------|-----------|----------|
| `AssistantModalPrimitive` | Boton flotante (esquina inferior derecha) que abre un panel de chat overlay |
| Contextual grounding | El modal detecta en que pagina estas y ajusta el contexto de Nexa |
| Thread persistence | La conversacion persiste al navegar entre paginas |

**Archivos:**
- `src/components/greenhouse/NexaFloatingButton.tsx` — modal trigger global
- Registrar en layout principal del dashboard

## Orden de ejecucion recomendado

1. **Slice 1** (quick wins) — mejora inmediata de UX, no requiere backend
2. **Slice 2** (tool calling) — Nexa operativa con datos reales, requiere backend tools
3. **Slice 3** (feedback + persistencia) — mejora gradual
4. **Slice 4** (floating modal) — Nexa en todas las paginas

## Out of Scope

- Reemplazar Gemini por otro modelo
- Multi-tenant Nexa (cada Space con su contexto)
- Voice-first interface (Dictate/Speak son opcionales, no prioridad)
- Thread branching (BranchPickerPrimitive — overengineering para 3-4 usuarios)

## Acceptance Criteria

- [ ] Slice 1: Copy, Retry, Cancel, ScrollToBottom, Suggestions nativas funcionan en NexaThread
- [ ] Slice 2: Nexa puede consultar payroll, OTD, emails, capacidad, facturas con datos reales
- [ ] Slice 2: Tool results se renderizan como cards MUI inline en el chat
- [ ] Slice 3: Feedback persiste en PG y es consultable
- [ ] Slice 4: Nexa disponible como floating button en cualquier pagina
- [ ] `pnpm build && pnpm test`

## Verification

- Copiar respuesta → clipboard contiene el texto
- Retry → nueva respuesta generada sin reescribir prompt
- Cancel → fetch se aborta, Nexa deja de "pensar"
- ScrollToBottom → aparece cuando hay scroll, desaparece al bajar
- Tool calling → preguntar "como va la nomina" devuelve datos reales
- Floating modal → click en esquina abre Nexa desde /finance, /hr/payroll, etc.
