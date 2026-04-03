# TASK-123 — Nexa Product Hardening: Streaming, Rich Tools, UX Polish

## Delta 2026-04-03 — Rich KPI cards must respect the ICO metric contract

- Los tool results ricos que muestren `OTD`, `FTR`, `RpA` u otras métricas `ICO` deben alinearse a `docs/architecture/Contrato_Metricas_ICO_v1.md`.
- Regla nueva:
  - las cards no deben mostrar solo el valor; deben poder incorporar benchmark/trust semantics cuando el payload lo soporte
  - Nexa no debe presentar como madura ninguna métrica puente o estratégica (`TTM`, `Iteration Velocity`, `Revenue Enabled`) antes de las tasks `TASK-218` a `TASK-221`
- Esta task mejora la experiencia, pero no redefine el contrato semántico de métricas.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `—`
- Domain: `home / nexa / ai`
- Assigned to: **Claude**

## Summary

Llevar Nexa de "chat funcional" a "producto AI enterprise" con streaming de respuestas, tool results como cards ricas, code block copy, timestamps, keyboard shortcuts, context chips, conversation export y runtime compartido. Este es el siguiente paso natural después de TASK-115 (UI completion) y el visual redesign.

## Why This Task Exists

Nexa ya tiene la baseline completa: edit inline, suggestions, feedback, floating portal-wide, thread history, y el visual redesign enterprise 2025. Pero la experiencia todavía tiene gaps frente a productos AI modernos:

- **Sin streaming**: el usuario espera 3-8 segundos sin feedback hasta que la respuesta completa llega. ChatGPT, Claude.ai y v0 streamean token por token.
- **Tool results como texto**: los tool invocations (payroll, OTD, emails) se renderizan como texto plano cuando podrían ser cards con KPIs inline.
- **Sin copy en code blocks**: estándar en todo producto AI, falta en Nexa.
- **Sin timestamps**: no hay contexto temporal en los mensajes.
- **Sin shortcuts**: power users no tienen Cmd+Enter, Escape, etc.
- **Sin indicador de fuentes**: el usuario no sabe qué datos consultó Nexa para responder.
- **Sin export**: no se puede compartir una conversación con el equipo.
- **Runtimes separados**: el floating y el inline tienen estados distintos.

## Slices

### Slice 1 — Streaming de respuestas (Medio → Transformativo)

**El cambio con mayor impacto en percepción de producto.**

| Item | Detalle |
|------|---------|
| Backend | Cambiar `POST /api/home/nexa` para retornar `ReadableStream` (SSE o NDJSON) en vez de JSON completo |
| Vertex AI | Google Genai SDK ya soporta `generateContentStream` — cambiar `generateContent` por streaming |
| Adapter | Reescribir `createNexaAdapter` para usar `run` con streaming: retornar un `AsyncGenerator` o usar `ChatModelRunResult` con `content` parcial |
| assistant-ui | `LocalRuntime` soporta streaming nativo via `ChatModelAdapter.run` que retorna `AsyncIterable<ChatModelRunResult>` |
| Thread persistence | El backend debe persistir el mensaje completo al finalizar el stream, no durante |
| Suggestions | Las suggestions llegan al final del stream como evento final |
| Tool invocations | Los tool calls llegan como eventos intermedios del stream |

**Archivos:**
- `src/app/api/home/nexa/route.ts` — streaming response
- `src/lib/nexa/nexa-service.ts` — `generateContentStream`
- `src/views/greenhouse/home/HomeView.tsx` — adapter streaming

**Esfuerzo:** ~4 horas
**Riesgo:** Medio — requiere cambiar el contrato API de JSON a stream

---

### Slice 2 — Copy button en code blocks (Bajo → Alto)

| Item | Detalle |
|------|---------|
| Target | Cada `<pre>` dentro del markdown del assistant |
| Botón | `<IconButton>` absoluto top-right del `<pre>`, `tabler-copy`/`tabler-check`, 28×28 |
| Feedback | Click copia al clipboard, icono cambia a check por 2s, luego vuelve a copy |
| Implementación | Custom `CodeBlock` component pasado a `MarkdownTextPrimitive` via `components` |

**Archivos:**
- `src/views/greenhouse/home/components/NexaThread.tsx` — prose styles + CodeBlock component

**Esfuerzo:** ~1 hora

---

### Slice 3 — Tool results como cards ricas (Medio → Alto)

| Item | Detalle |
|------|---------|
| Actual | `NexaToolRenderer` muestra tool results como texto/JSON básico |
| Target | Cada tool type renderiza una card semántica con KPIs |
| `check_payroll` | Card con: colaboradores activos, gasto total, régimen breakdown usando `HorizontalWithSubtitle` o `ExecutiveMiniStatCard` |
| `get_otd` | Card con: OTD%, proyectos tracked, semáforo visual |
| `check_emails` | Card con: enviados, fallidos, pending delivery |
| `get_capacity` | Card con: FTE total, dedicación promedio, roles breakdown |
| `pending_invoices` | Card con: facturas pendientes, monto total, aging |
| Fallback | Para tools desconocidos, mantener el renderer actual |

**Archivos:**
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx` — rewrite con cards por tool type

**Esfuerzo:** ~3 horas

---

### Slice 4 — Timestamps en mensajes (Bajo → Medio)

| Item | Detalle |
|------|---------|
| User messages | `<Typography variant='caption' color='text.disabled'>` con hora (HH:mm) alineado a la derecha, debajo del mensaje |
| Assistant messages | Hora junto al label "Nexa" o debajo del ActionBar |
| Formato | `Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })` |
| Fuente | `Date.now()` al momento de render (client-side) o `createdAt` del thread message si viene del backend |

**Archivos:**
- `src/views/greenhouse/home/components/NexaThread.tsx` — UserMessage + AssistantMessage

**Esfuerzo:** ~30 minutos

---

### Slice 5 — Keyboard shortcuts (Bajo → Medio)

| Shortcut | Acción |
|----------|--------|
| `Cmd+Enter` / `Ctrl+Enter` | Enviar mensaje (alternativa al botón) |
| `Escape` | Cancelar generación en curso |
| `Cmd+Shift+N` / `Ctrl+Shift+N` | Nueva conversación |
| `Cmd+Shift+H` / `Ctrl+Shift+H` | Toggle historial de threads |

**Implementación:** `useEffect` con `keydown` listener en el thread component. Bind a las acciones existentes (composer send, cancel, new thread, history toggle).

**Archivos:**
- `src/views/greenhouse/home/components/NexaThread.tsx` o `HomeView.tsx`

**Esfuerzo:** ~1 hora

---

### Slice 6 — Context chips (fuentes consultadas) (Bajo → Medio)

| Item | Detalle |
|------|---------|
| Qué | Chips debajo de la respuesta del assistant que muestran qué datos consultó |
| Fuente | `toolInvocations` del response — cada invocation tiene `toolName`, `result.source`, `result.scopeLabel` |
| Visual | `<Chip size='small' variant='tonal' color='info' icon={<i className='tabler-database' />} label={scopeLabel} />` |
| Posición | Entre el contenido del assistant y el ActionBar |
| Solo si | `toolInvocations.length > 0` |

**Archivos:**
- `src/views/greenhouse/home/components/NexaThread.tsx` — AssistantMessage

**Esfuerzo:** ~1 hora (requiere exponer toolInvocations al component)

---

### Slice 7 — Conversation export (Bajo → Medio)

| Item | Detalle |
|------|---------|
| Trigger | Botón en el header del thread (icono `tabler-download`) o en el ActionBar |
| Formato | Markdown file (`.md`) con todos los mensajes formateados |
| Contenido | `## Tu\n{mensaje}\n\n## Nexa\n{respuesta}\n\n---\n` por cada par |
| Nombre archivo | `nexa-{fecha}-{threadId-short}.md` |
| Método | `Blob` + `URL.createObjectURL` + `link.click()` (mismo patrón que CSV export) |

**Archivos:**
- `src/views/greenhouse/home/components/NexaThread.tsx` — header o nuevo botón

**Esfuerzo:** ~1 hora

---

### Slice 8 — RuntimeProvider compartido (Medio → Arquitectural)

| Item | Detalle |
|------|---------|
| Actual | HomeView crea su propio runtime, NexaFloatingButton crea otro runtime separado |
| Target | Un solo `NexaRuntimeProvider` a nivel de layout que comparte el estado |
| Beneficio | Conversación iniciada en el floating continúa en `/home` y viceversa |
| Implementación | Extraer `createNexaAdapter` + `useLocalRuntime` a un provider client component montado en el layout |
| Consideración | El layout es server component — el provider debe ser client component importado dinámicamente |

**Archivos:**
- `src/components/greenhouse/NexaRuntimeProvider.tsx` (nuevo)
- `src/app/(dashboard)/layout.tsx` — mount provider
- `src/views/greenhouse/home/HomeView.tsx` — consumir provider en vez de crear runtime
- `src/components/greenhouse/NexaFloatingButton.tsx` — consumir provider

**Esfuerzo:** ~2 horas

---

## Orden de ejecución recomendado

| Orden | Slice | Esfuerzo | Dependencia |
|-------|-------|----------|-------------|
| 1 | **Slice 2** — Copy en code blocks | ~1h | Ninguna |
| 2 | **Slice 4** — Timestamps | ~30min | Ninguna |
| 3 | **Slice 5** — Keyboard shortcuts | ~1h | Ninguna |
| 4 | **Slice 6** — Context chips | ~1h | Ninguna |
| 5 | **Slice 7** — Conversation export | ~1h | Ninguna |
| 6 | **Slice 3** — Tool results como cards | ~3h | Ninguna |
| 7 | **Slice 1** — Streaming | ~4h | Cambio de contrato API |
| 8 | **Slice 8** — RuntimeProvider compartido | ~2h | Después de streaming |

Quick wins primero (2, 4, 5, 6, 7), luego los slices estructurales (3, 1, 8).

## Dependencies & Impact

### Depends on
- TASK-115 (completada) — UI completion baseline
- TASK-114 (completada) — backend persistence, feedback, threads
- Visual redesign enterprise 2025 (completado) — prose styles, contained ActionBar, shimmer skeleton

### Impacts to
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/app/api/home/nexa/route.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/components/greenhouse/NexaFloatingButton.tsx`
- `src/app/(dashboard)/layout.tsx` (solo Slice 8)

### Files owned
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/components/greenhouse/NexaRuntimeProvider.tsx` (nuevo, Slice 8)

## Out of Scope

- Voice interface / dictation
- Attachment uploads / file analysis
- Thread branching (BranchPicker)
- Multi-modal (images, charts generados por AI)
- Rate limiting UI / AI credits display (track separado)
- Virtualización del thread (optimización futura para 50+ mensajes)

## Acceptance Criteria

- [ ] Streaming: respuestas aparecen token por token, no en bloque
- [ ] Code blocks: botón copy en esquina superior derecha de cada `<pre>`
- [ ] Tool results: al menos 3 tool types renderizan como cards con KPIs
- [ ] Timestamps: hora visible en cada mensaje (user y assistant)
- [ ] Shortcuts: Cmd+Enter envía, Escape cancela, Cmd+Shift+N nueva conversación
- [ ] Context chips: fuentes consultadas visibles debajo de respuestas con tools
- [ ] Export: conversación descargable como Markdown
- [ ] Runtime compartido: floating y inline comparten estado (opcional, Slice 8)
- [ ] Zero TS errors, lint clean, `pnpm build` pasa
