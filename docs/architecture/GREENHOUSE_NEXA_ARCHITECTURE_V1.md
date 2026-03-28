# GREENHOUSE_NEXA_ARCHITECTURE_V1.md

## Objetivo

Definir el contrato arquitectonico de Nexa: el asistente IA conversacional de Greenhouse. Este documento es la fuente canonica de la capa de IA del portal — que es, como funciona, que puede hacer, y como se integra con el resto del sistema.

## 1. Que es Nexa

Nexa es el asistente operativo de Greenhouse. Su mision es ayudar al equipo interno de Efeonce a navegar su operacion diaria a traves de lenguaje natural.

Nexa **es**:
- un asistente grounded en datos reales del portal (payroll, OTD, finanzas, equipo)
- una capa conversacional sobre la operacion, no un chatbot generico
- el centro de gravedad de la superficie `/home`
- extensible via tool calling para consultar cualquier modulo del portal

Nexa **no es**:
- un reemplazo de los modulos (Nomina, Finanzas, People siguen siendo las superficies operativas)
- un chatbot de soporte al cliente
- un motor de workflow o automatizacion
- un generador de contenido

## 2. Stack tecnico

| Capa | Tecnologia | Rol |
|------|-----------|-----|
| UI framework | `@assistant-ui/react` | Primitivos composables para chat: Thread, Composer, Message, ActionBar |
| UI extras | `@assistant-ui/react-markdown` | Markdown rendering con streaming cursor |
| Runtime | `LocalRuntime` + `ChatModelAdapter` | Estado de mensajes gestionado por assistant-ui, adapter hace fetch al backend |
| Backend API | `POST /api/home/nexa` | Next.js API route, auth via NextAuth |
| LLM | Google Gemini (Vertex AI) | `@google/genai` con `gemini-2.5-flash` |
| Credenciales | `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Service account de GCP con acceso a Vertex AI |

### Diagrama de flujo

```
Browser (assistant-ui LocalRuntime)
  |
  | fetch POST /api/home/nexa
  | body: { prompt, history[] }
  |
  v
Next.js API Route (/api/home/nexa)
  |
  | 1. getServerSession() → auth
  | 2. resolveCapabilityModules() → context ligero
  | 3. NexaService.generateResponse() → Gemini
  |      (futuro: tool calling → queries PG/BQ)
  |
  v
Google Vertex AI (Gemini)
  |
  | response: { content: string }
  |
  v
Browser: assistant-ui renderiza mensaje con MarkdownTextPrimitive
```

## 3. Superficie UI

### 3.1 Home Landing (`/home` — estado sin conversacion)

La vista de entrada del portal. Nexa es el hero de la pagina.

```
[Avatar Nexa ✦]
Heading rotativo: "¿Que revisamos hoy, {name}?"
Subtitle: "Tu operacion al alcance de una pregunta."

[Input hero centrado — ComposerPrimitive]

[Chips de sugerencia × 6]

Accesos directos (modulos)    |  Tu operacion hoy (status)

Disclaimer: "Nexa usa IA generativa..."
```

Componentes:
- `NexaHero.tsx` — avatar + greeting + input + chips
- `QuickAccess.tsx` — module cards
- `OperationStatus.tsx` — status highlights

### 3.2 Chat (`/home` — estado con conversacion)

Al enviar el primer mensaje, la pagina transiciona (Fade) a un thread full-width.

```
← Inicio                        Nexa AI ✦

[Thread de mensajes — max-width 720px]
  - User message (burbuja derecha, primary)
  - Assistant message (burbuja izquierda, con avatar Nexa)
    - Markdown rendering
    - ActionBar on hover: Copy, Reload, More
    - FollowupSuggestions post-respuesta
  - Error display (ErrorPrimitive)
  - ScrollToBottom (boton flotante ↓)

[Composer sticky bottom]
  - Input con auto-resize
  - Send (↑) / Cancel (⬛) toggle
```

Componentes:
- `NexaThread.tsx` — thread completo con ActionBars
- Adapter en `HomeView.tsx`

### 3.3 Floating Modal (futuro — portal-wide)

Nexa disponible como boton flotante en cualquier pagina del portal.

```
[Cualquier pagina: /hr/payroll, /finance, /people...]

                              [✦ Nexa button — esquina inferior derecha]
                                    |
                                    v
                              [Popup 400×500px]
                              [Thread completo]
```

Componente: `NexaFloatingButton.tsx` basado en `AssistantModalPrimitive`

## 4. Backend

### 4.1 Snapshot API

`GET /api/home/snapshot`

Retorna datos para la vista landing:
- Greeting (rotativo por hora del dia)
- Modulos disponibles (segun capabilities del usuario)
- Tareas pendientes (notificaciones no leidas — con try/catch fallback)
- Nexa intro message

**Source:** `src/lib/home/get-home-snapshot.ts`

Protecciones:
- AbortController con timeout 5s en el client
- try/catch en NotificationService.getNotifications() con fallback `tasks: []`

### 4.2 Chat API

`POST /api/home/nexa`

Body:
```json
{
  "prompt": "¿Como va la nomina?",
  "history": [{ "role": "user|assistant", "content": "..." }]
}
```

Response:
```json
{
  "id": "uuid",
  "role": "assistant",
  "content": "La nomina de Marzo 2026 fue cerrada...",
  "timestamp": "2026-03-28T..."
}
```

**Context:** Ligero — solo modules + firstName + role. No llama getHomeSnapshot() completo por cada mensaje.

**Source:** `src/app/api/home/nexa/route.ts`

### 4.3 NexaService

`src/lib/nexa/nexa-service.ts`

- Construye system prompt con contexto del usuario
- Prepara history para Gemini (role mapping: assistant→model, user→user)
- Llama `client.models.generateContent()` con temperature 0.2, maxOutputTokens 500
- Retorna NexaMessage

### 4.4 Tool Calling (futuro — TASK-110 Slice 2)

Nexa podra ejecutar tools para consultar datos reales:

| Tool | Query | Source table |
|------|-------|-------------|
| `check_payroll` | Status nomina actual, headcount, neto | `greenhouse_payroll.payroll_periods` |
| `get_otd` | OTD global del equipo actual | `greenhouse_serving.ico_organization_metrics` |
| `check_emails` | Count de emails fallidos 24h | `greenhouse_notifications.email_deliveries` |
| `get_capacity` | Capacidad asignada vs contratada | `greenhouse_serving.member_capacity_economics` |
| `pending_invoices` | Facturas pendientes de cobro | `greenhouse_finance.fin_income` |

Patron:
1. Gemini decide llamar un tool basado en el prompt
2. Backend ejecuta la query correspondiente
3. Resultado se pasa de vuelta a Gemini para generar respuesta natural
4. `useAssistantToolUI` renderiza el resultado como card MUI inline

## 5. assistant-ui Primitives — Mapa de adopcion

### Usados actualmente

| Primitivo | Donde | Para que |
|-----------|-------|---------|
| `ThreadPrimitive.Root` | NexaThread | Container del thread |
| `ThreadPrimitive.Viewport` | NexaThread | Viewport con auto-scroll |
| `ThreadPrimitive.Messages` | NexaThread | Lista de mensajes |
| `ComposerPrimitive.Root` | NexaHero + NexaThread | Container del input |
| `ComposerPrimitive.Input` | NexaHero + NexaThread | Campo de texto |
| `ComposerPrimitive.Send` | NexaHero + NexaThread | Boton enviar |
| `MessagePrimitive.Root` | NexaThread | Container de mensaje |
| `MessagePrimitive.Content` | NexaThread | Renderiza partes del mensaje |
| `MarkdownTextPrimitive` | NexaThread | Markdown en respuestas |
| `useLocalRuntime` | HomeView | Runtime de chat |
| `useAuiState` | NexaThread | Estado reactivo (isRunning, messages) |
| `useAui` | HomeView | API para thread.append() |
| `AssistantRuntimeProvider` | HomeView | Provider del runtime |

### Pendientes de adoptar (TASK-110)

| Primitivo | Slice | Para que |
|-----------|-------|---------|
| `ActionBarPrimitive.Copy` | 1 | Copiar respuesta al clipboard |
| `ActionBarPrimitive.Reload` | 1 | Regenerar respuesta |
| `ActionBarPrimitive.Edit` | 1 | Editar mensaje de usuario |
| `ComposerPrimitive.Cancel` | 1 | Cancelar generacion |
| `ThreadPrimitive.ScrollToBottom` | 1 | Boton flotante ↓ |
| `SuggestionPrimitive.Trigger` | 1 | Suggestions con autoSend |
| `ErrorPrimitive` | 1 | Error display en mensajes |
| `AuiIf` | 1 | Render condicional por estado |
| `makeAssistantTool` | 2 | Registrar tools |
| `useAssistantToolUI` | 2 | UI custom para resultados |
| `ActionBarPrimitive.FeedbackPositive/Negative` | 3 | Thumbs up/down |
| `AssistantModalPrimitive` | 4 | Floating modal portal-wide |
| `ThreadHistoryAdapter` | 3 | Persistencia de conversaciones |
| `SuggestionAdapter` | 3 | Sugerencias dinamicas post-respuesta |

### No aplican para Nexa

| Primitivo | Razon |
|-----------|-------|
| `BranchPickerPrimitive` | Overengineering para 3-4 usuarios |
| `AttachmentPrimitive` | No hay file uploads en Nexa |
| `DictationAdapter` | Voice-first no es prioridad |
| `SpeechSynthesisAdapter` | TTS no es prioridad |
| `ThreadListPrimitive` | Historial sidebar no prioritario |

## 6. Resiliencia y protecciones

| Proteccion | Implementacion | Estado |
|-----------|---------------|--------|
| Timeout en snapshot fetch | `AbortController` 5s en HomeView | Implementado |
| Notifications fallback | try/catch en get-home-snapshot.ts | Implementado |
| Timeout en chat fetch | `AbortSignal` 15s en adapter (via assistant-ui abortSignal) | Implementado |
| Error boundary | `NexaBoundary` envuelve todo | Implementado |
| Adapter never-throw | Catch en adapter retorna mensaje de texto con error | Implementado |
| Error visible en respuesta | API retorna `error.message` en 500, no generico | Implementado |
| Context ligero en chat | nexa/route.ts NO llama getHomeSnapshot() por mensaje | Implementado |
| History cap | Adapter envia solo ultimos 10 mensajes | Implementado |

## 7. Configuracion

| Variable | Proposito | Requerida |
|----------|-----------|-----------|
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Credenciales GCP para Vertex AI | Si |
| `GCP_PROJECT` | Project ID de GCP (`efeonce-group`) | Si |
| `GREENHOUSE_AGENT_MODEL` | Modelo Gemini (default: `gemini-2.5-flash`) | No |
| `GOOGLE_CLOUD_LOCATION` | Region Vertex AI (default: `global`) | No |

## 8. Greetings y copy

Los greetings rotativos viven en `src/config/home-greetings.ts`:
- Manana (5-12): "¿Que revisamos hoy, {name}?"
- Tarde (12-19): "¿En que te ayudo, {name}?"
- Noche (19-5): "Cerrando el dia, {name}. ¿Algo pendiente?"

Las sugerencias viven en `src/config/home-suggestions.ts`:
- 6 chips operativos: nomina, OTD, capacidad, correos, facturas, pendientes

Disclaimer: "Nexa usa IA generativa. Verifica la informacion importante."

## 9. Archivos runtime clave

### UI
- `src/views/greenhouse/home/HomeView.tsx` — vista principal con 2 estados (landing/chat)
- `src/views/greenhouse/home/components/NexaHero.tsx` — hero section del landing
- `src/views/greenhouse/home/components/NexaThread.tsx` — thread de chat full-width
- `src/views/greenhouse/home/components/QuickAccess.tsx` — module cards
- `src/views/greenhouse/home/components/OperationStatus.tsx` — status highlights

### API
- `src/app/api/home/snapshot/route.ts` — snapshot para landing
- `src/app/api/home/nexa/route.ts` — chat con Gemini

### Dominio
- `src/lib/home/get-home-snapshot.ts` — agregador de datos para landing
- `src/lib/nexa/nexa-service.ts` — NexaService con Gemini
- `src/lib/ai/google-genai.ts` — client singleton de Google GenAI

### Config
- `src/config/home-greetings.ts` — headings rotativos + subtitle + disclaimer
- `src/config/home-suggestions.ts` — suggestion chips
- `src/types/home.ts` — tipos compartidos (HomeSnapshot, ModuleCard, PendingTask, NexaMessage)

## 10. Reglas canonicas

- Nexa usa `@assistant-ui/react` como framework de UI — no reimplementar estado, scroll, o interactions de chat a mano
- El adapter nunca hace throw — siempre retorna un mensaje de texto (con el error si aplica)
- El context del chat es ligero — solo modules + user name. No el snapshot completo
- Los tool calls son server-side — Nexa no ejecuta queries en el client
- Nexa es tenant-aware — el context se resuelve desde la sesion, no desde el request body
- Las respuestas de Nexa son markdown — el rendering usa `MarkdownTextPrimitive`
- El system prompt de Nexa vive en `NexaService.buildSystemPrompt()` — no en el frontend
- Los greetings y suggestions son configurables en `src/config/` — no hardcoded en componentes
- Nexa respeta el design system de Greenhouse (MUI + tema Vuexy) — los primitivos de assistant-ui se wrappean con MUI cuando es necesario

## 11. Roadmap

| Fase | Que | Task | Estado |
|------|-----|------|--------|
| MVP | Home landing + chat basico | TASK-009 Slice A+B+E | Completado |
| Home redesign | Prompt-first centered UX | TASK-009 (commit 56739fd) | Completado |
| UI polish | ActionBars, Cancel, ScrollToBottom, Suggestions | TASK-110 Slice 1 | Pendiente |
| Tool calling | Nexa consulta datos reales | TASK-110 Slice 2 | Pendiente |
| Feedback | Thumbs up/down persistente | TASK-110 Slice 3 | Pendiente |
| Portal-wide | Floating modal en todas las paginas | TASK-110 Slice 4 | Pendiente |
| Enriquecer snapshot | Payroll + OTD + emails en landing | TASK-009 Slice D | Pendiente |
| Navegacion | Control Tower → admin, /home como default | TASK-009 Slice C | Pendiente |
