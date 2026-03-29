# CODEX TASK — Greenhouse Home: Vista Principal con Agente Conversacional Nexa

## Delta 2026-03-28
- El runtime activo de `/api/home/nexa` ya soporta tool calling operativo y devuelve `toolInvocations` para `check_payroll`, `get_otd`, `check_emails`, `get_capacity` y `pending_invoices` — cerrado por trabajo en `TASK-110`.

## Estado 2026-03-19

Este brief se conserva como framing de producto y UX para la superficie `Home + Nexa`.

Para implementación nueva y decisiones técnicas, usar como baseline:
- `docs/tasks/to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md`

En particular, no implementar literalmente desde esta versión:
- `/home` como redirect universal obligatorio para todos los perfiles
- el modelo de acceso `client | operator | admin` como si fuera el boundary canónico del repo
- una estructura App Router basada en `src/app/[lang]/...` que no coincide con el workspace actual
- un contexto de Nexa construido exclusivamente con fan-out de queries BigQuery ad hoc por mensaje si ya existen consumers y contracts reutilizables

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `project_context.md`
- `docs/tasks/to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md`

## Resumen

Implementar la **vista Home** del portal Greenhouse como la primera pantalla que ve el usuario al ingresar. El centro de la experiencia es un **agente conversacional (Nexa)** que permite al usuario interactuar con su operación en lenguaje natural. Arriba de la caja de chat, **textos rotativos de bienvenida personalizados** al estilo de interfaces conversacionales modernas. Debajo, **module cards** de acceso rápido a los módulos más usados por el usuario y una lista de **tareas/pendientes** que requieren su atención.

**Nexa** es la tercera voz derivada del ecosistema de marca Efeonce (después de la voz institucional y la de Julio Reyes). Es una AI influencer que hereda creencias y valores de Efeonce pero habla desde la experiencia de ejecutar, no de diseñar. Tiene más chispa, humor y personalidad magnética. En el contexto del portal Greenhouse, Nexa opera como asistente operativo que conoce la data del usuario y responde con el tono de marca definido en el Brand Voice v1.0.

**Esta tarea NO toca la lógica de ningún módulo existente.** Crea una vista nueva (`/home`) y componentes nuevos. Es aditiva.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/home-nexa`
- **Framework:** Next.js 16.1.1 (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI 7.x
- **React:** 19.x
- **TypeScript:** 5.9+
- **Deploy:** Vercel
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery datasets:** `notion_ops`, `hubspot_crm`, `greenhouse`, `greenhouse_conformed`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` (en el repo) | Modelo de roles, route groups, enforcement server-side |
| `project_context.md` (en el repo) | Schema real de BigQuery, campos disponibles |
| `authorization.ts` (en el repo) | Sistema de autorización actual |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, colores, tipografía, microcopy |
| `Brand_Voice_Tone_Personality_Efeonce_v1.docx` (proyecto Claude) | Voz de Nexa: sección 8, Voz 3 |
| `CODEX_TASK_Agency_Operator_Layer.md` (proyecto Claude) | Modelo de roles operator/admin, tipografía por elemento |
| `CODEX_TASK_Typography_Hierarchy_Fix.md` (proyecto Claude) | Reglas Poppins vs DM Sans (normativo) |

---

## Dependencias previas

### DEBE existir

- [ ] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [ ] Guard server-side para rutas protegidas
- [ ] Pipeline `notion-bigquery` operativo sincronizando `notion_ops.tareas`, `notion_ops.proyectos`, `notion_ops.sprints`
- [ ] Tabla `greenhouse_core.spaces` con los Spaces activos
- [ ] Sidebar dinámico implementado
- [ ] Constantes de nomenclatura en `src/config/greenhouse-nomenclature.ts`
- [ ] Vertex AI API habilitada en proyecto `efeonce-group` (`gcloud services enable aiplatform.googleapis.com`)
- [ ] Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con rol `aiplatform.user`
- [ ] Package `@google/genai` instalado en el repo (`pnpm add @google/genai`)

### Deseable pero no bloqueante

- [ ] ICO Engine con métricas calculadas en BigQuery (si no existe, los greetings contextuales muestran conteos simples en vez de métricas ICO)
- [ ] Agency Operator Layer implementado (para diferenciar home de client vs operator vs admin)
- [ ] Creative Hub Module implementado (aparece como module card si la capability está activa)

---

## Modelo de acceso

### Ruta

| Ruta | Quién accede | Qué ve |
|------|-------------|--------|
| `/home` | `client` | Su home personalizado: greeting, Nexa, sus módulos, sus pendientes |
| `/home` | `operator` | Home con módulos de agencia + pendientes cross-space |
| `/home` | `admin` | Igual que operator + acceso a módulos admin |

### Post-login redirect

Después del login exitoso, el usuario aterriza en `/home` en vez de `/dashboard`. La ruta `/dashboard` (Pulse) pasa a ser un módulo accesible desde el sidebar y desde las module cards del home.

**Cambio en `authOptions` o `portalHomePath`:** actualizar el redirect post-login para apuntar a `/home`.

---

## Arquitectura de la vista

### Layout (ASCII diagram)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         [Greeting rotativo + subtítulo]         │   ← Zona de experiencia
│               · · · · · (dots)                  │
│                                                 │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │  🟢 Nexa                                  │  │
│  │                                           │  │   ← Chat container
│  │  ┌─────────────────────────────┐  [Send]  │  │
│  │  │ Pregunta algo sobre tu...   │          │  │
│  │  └─────────────────────────────┘          │  │
│  │                                           │  │
│  │  [chip 1] [chip 2] [chip 3] [chip 4]     │  │   ← Suggestion chips
│  └───────────────────────────────────────────┘  │
│                                                 │
│  TUS MÓDULOS                                    │   ← Section header (overline)
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐ │
│  │ Pulse    │ │Proyectos │ │ Ciclos   │ │ +N │ │   ← Module cards (grid)
│  │ Vista gen│ │ 4 activos│ │ Día 8/15 │ │    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────┘ │
│                                                 │
│  PENDIENTES                                     │   ← Section header (overline)
│  ┌─────────────────────────────────────────────┐│
│  │ 🟡 Revisión campaña Q1 — Acme   [Review]   ││
│  │ 🔵 Key visual lanzamiento       [Progress] ││   ← Task list
│  │ 🟢 Social kit stories Abril     [Listo]    ││
│  └─────────────────────────────────────────────┘│
│                                                 │
└─────────────────────────────────────────────────┘
```

### Ancho máximo del contenido

`max-width: 720px` centrado. El home NO es un dashboard full-width. Es una experiencia focalizada, conversacional, tipo "landing interna". El sidebar sigue visible.

---

## Componente 1: Greeting rotativo

### Comportamiento

- Al cargar la vista, se selecciona un greeting **aleatorio** (no secuencial, para evitar que el usuario siempre vea el mismo al entrar).
- Cada 5 segundos, rota al siguiente con animación de **fade-in desde abajo** (translateY + opacity).
- Indicador de dots (máx 5) debajo del subtítulo, muestra posición en el ciclo visible.
- El `{nombre}` se resuelve desde la sesión del usuario (`session.user.name` o `firstName`).

### Componente Vuexy / MUI

- `<Typography variant="h3">` para el greeting principal (Poppins SemiBold 600, 22px)
- `<Typography variant="body2" color="text.secondary">` para el subtítulo (DM Sans Regular 400, 14px)
- Animación con CSS `@keyframes` — NO usar librerías de animación externas.

### Los 18 greetings rotativos

Tono: capa de experiencia Greenhouse. Cálido, profesional-directo, tratamiento de tú, spanglish natural, sin emojis, sin signos de exclamación dobles. Compatible con Brand Voice v1.0, registro de Nexa (más chispa que la voz institucional, pero no informal).

**Cada greeting tiene dos partes: `main` (con nombre del usuario) y `sub` (contextual).**

Los subtítulos marcados con `[dinámico]` se alimentan de data real vía la API. Los que no tienen marca son estáticos.

```typescript
// src/config/greenhouse-home-greetings.ts

export const GH_HOME_GREETINGS: Array<{
  main: (name: string) => string
  sub: string | ((ctx: GreetingContext) => string)
}> = [
  // --- Grupo 1: Estado de la operación ---
  {
    main: (n) => `${n}, tu Greenhouse está al día`,
    sub: (ctx) => `${ctx.pendingTasks} tareas necesitan tu atención`,  // [dinámico]
  },
  {
    main: (n) => `Todo listo, ${n}`,
    sub: 'Tu equipo estuvo activo — hay cosas nuevas',
  },
  {
    main: (n) => `${n}, la operación no para`,
    sub: 'Revisa qué hay de nuevo en tus proyectos',
  },
  {
    main: (n) => `${n}, el ciclo avanza bien`,
    sub: (ctx) => `RpA promedio en ${ctx.avgRpa} — dentro de target`,  // [dinámico]
  },

  // --- Grupo 2: Regreso / continuidad ---
  {
    main: (n) => `Hola ${n}, sigamos con la siguiente aventura`,
    sub: 'Tu operación está en movimiento',
  },
  {
    main: (n) => `De vuelta al Greenhouse, ${n}`,
    sub: 'Aquí tienes el pulso de hoy',
  },
  {
    main: (n) => `Bienvenido de nuevo, ${n}`,
    sub: (ctx) => `Tu ciclo actual va al ${ctx.sprintProgress}% de avance`,  // [dinámico]
  },
  {
    main: (n) => `Qué bueno verte, ${n}`,
    sub: (ctx) => `Tu equipo completó ${ctx.recentDeliveries} deliveries desde ayer`,  // [dinámico]
  },

  // --- Grupo 3: Call to action suave ---
  {
    main: (n) => `${n}, buen momento para revisar tu operación`,
    sub: 'Hay avances desde tu última visita',
  },
  {
    main: (n) => `${n}, hay feedback esperando por ti`,
    sub: (ctx) => `${ctx.assetsForReview} assets listos para tu revisión en Frame.io`,  // [dinámico]
  },
  {
    main: (n) => `${n}, tienes cosas por aprobar`,
    sub: 'Tu feedback acelera la operación',
  },
  {
    main: (n) => `${n}, tu operación necesita unos minutos`,
    sub: (ctx) => `Hay decisiones pendientes en ${ctx.projectsWithPending} proyectos`,  // [dinámico]
  },

  // --- Grupo 4: Data como saludo ---
  {
    main: (n) => `${n}, hoy es un buen día para revisar resultados`,
    sub: (ctx) => `El OTD% del ciclo actual va en ${ctx.otdPercent}%`,  // [dinámico]
  },
  {
    main: (n) => `Listo para el update, ${n}?`,
    sub: 'Preparamos el resumen de tu semana',
  },
  {
    main: (n) => `${n}, tu equipo avanzó mientras no estabas`,
    sub: (ctx) => `${ctx.newDeliveries} entregas nuevas esperan tu review`,  // [dinámico]
  },

  // --- Grupo 5: Metáfora Greenhouse sutil ---
  {
    main: (n) => `Tu Greenhouse creció, ${n}`,
    sub: 'Nuevas métricas disponibles en Pulse',
  },
  {
    main: (n) => `Hola ${n}, el Greenhouse te tiene al día`,
    sub: 'Todo sincronizado con tu última sesión',
  },
  {
    main: (n) => `${n}, revisemos juntos el avance`,
    sub: 'Pregunta lo que necesites a Nexa',
  },
]

// Tipo del contexto dinámico
export interface GreetingContext {
  pendingTasks: number
  avgRpa: string          // ej: "1.4"
  sprintProgress: number  // ej: 73
  recentDeliveries: number
  assetsForReview: number
  projectsWithPending: number
  otdPercent: number      // ej: 91
  newDeliveries: number
}
```

### Lógica de selección

```typescript
// Al montar el componente:
// 1. Fetch greeting context desde /api/home/greeting-context
// 2. Seleccionar greeting aleatorio
// 3. Si el greeting tiene sub como función, evaluar con ctx
// 4. Si el ctx no tiene data (null/undefined), fallback a greeting con sub estático
// 5. Iniciar intervalo de rotación cada 5 segundos
```

### Fallback cuando no hay data

Si la API de greeting context falla o no hay métricas disponibles, **solo se muestran greetings con subtítulo estático** (los que no están marcados `[dinámico]`). Hay 8 greetings estáticos — suficientes para rotación sin repetir.

---

## Componente 2: Chat de Nexa (agente conversacional)

### Identidad de Nexa en el portal

Nexa es la asistente conversacional del Greenhouse. Su personalidad está definida en el Brand Voice v1.0, sección 8, Voz 3:

> "Habla desde la experiencia de ejecutar, no de diseñar. Tiene más chispa, humor, personalidad magnética."

**En el portal, Nexa:**
- Conoce la data del Space del usuario (proyectos, tareas, métricas ICO, equipo)
- Responde en español LATAM con spanglish natural de la industria
- Es directa, útil, con personalidad — no es un chatbot genérico
- Usa tratamiento de tú
- No usa emojis en sus respuestas
- Puede citar datos específicos del usuario ("Tu proyecto Acme tiene RpA 1.2 este ciclo")

### Componente Vuexy / MUI a usar

**Referencia Vuexy:** El template full-version incluye un componente de **Chat App** (`src/app/[lang]/(dashboard)/apps/chat/`). Usar como base:

- `<Card>` de MUI como contenedor del chat (con `variant="outlined"`)
- Área de mensajes con scroll: `<CardContent>` con `overflow-y: auto`, `max-height: 400px`
- Input area: `<TextField variant="outlined" fullWidth>` + `<IconButton>` de send
- Avatar de Nexa: `<Avatar>` con color `GH_COLORS.coreBluePrimary` e iniciales "N" o ícono custom
- Mensajes de Nexa: `<Box>` con `bgcolor` del background-secondary y border-radius
- Mensajes del usuario: `<Box>` con `bgcolor` de Core Blue (8% opacity) y border-radius

**NO crear un chat app completo.** Es una interfaz conversacional simple:
- Input de texto
- Historial de mensajes en la sesión (no persistido entre sesiones en MVP)
- Typing indicator cuando Nexa está procesando
- Suggestion chips debajo del input

### Suggestion chips

Los chips sugieren preguntas frecuentes. Se muestran siempre debajo del input (incluso después de que el usuario ya envió mensajes). Se ocultan si el historial tiene más de 4 mensajes para no saturar.

```typescript
// src/config/greenhouse-home-suggestions.ts

export const GH_HOME_SUGGESTIONS = {
  client: [
    'Status de mis proyectos',
    'Resumen del ciclo actual',
    'Assets pendientes de feedback',
    'Comparar RpA por proyecto',
  ],
  operator: [
    'Resumen de Spaces activos',
    'Capacidad del equipo esta semana',
    'Alertas de OTD% en riesgo',
    'Pipeline de entregas pendientes',
  ],
  admin: [
    'Overview de la agencia',
    'Spaces sin actividad reciente',
    'Métricas ICO consolidadas',
    'Estado de pipelines de sync',
  ],
} as const
```

**Componente MUI:** `<Chip variant="outlined" clickable>` dentro de un `<Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>`.

### Arquitectura del agente

Nexa es un agente conversacional real respaldado por **Gemini via Vertex AI**. No es keyword matching — es un LLM con system prompt de personalidad, context injection con data del Space del usuario, y streaming de respuestas.

#### Decisión arquitectónica: dónde corre

| Opción | Veredicto | Razón |
|--------|-----------|-------|
| **API Route en Vercel (Next.js)** | **ELEGIDA** | Un solo repo, un solo deploy. Auth nativa via NextAuth. Vercel Pro soporta streaming con Edge/Serverless (timeout 300s). Gemini Flash responde en 1-3s. |
| Cloud Run dedicado | Descartada para MVP | Agrega complejidad de deploy separado, auth service-to-service, y CORS. Reservar para cuando el contexto sea tan pesado que supere los 300s de Vercel. |
| Cloud Function | Descartada | Timeout de 60s en 1st gen, 3600s en 2nd gen pero cold starts lentos. No justificado para chat interactivo. |

**Si en producción con Gemini 2.5 Pro el contexto se vuelve muy pesado**, la migración a Cloud Run es trivial: extraer `NexaService` a un microservicio independiente. La interfaz HTTP no cambia.

#### Stack del agente

| Componente | Tecnología | Versión/Detalle |
|------------|-----------|-----------------|
| **SDK** | `@google/genai` | SDK unificado de Google Gen AI para TypeScript (reemplaza `@google-cloud/vertexai` que está deprecated) |
| **Modelo MVP** | `gemini-2.5-flash` | Rápido, económico, suficiente para chat operativo |
| **Modelo producción** | `gemini-2.5-pro` | Mayor capacidad de razonamiento, contexto más largo. Cambio es una sola línea de config |
| **Auth GCP** | Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` | Ya tiene permisos BigQuery. Agregar rol `aiplatform.user` para Vertex AI |
| **Streaming** | `generateContentStream()` del SDK | Streaming nativo via `ReadableStream` en la API route |
| **Fallback** | Si streaming falla, `generateContent()` con respuesta completa | El frontend maneja ambos modos |

#### Flujo completo

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND (NexaChat.tsx)                                             │
│                                                                     │
│ 1. Usuario escribe mensaje                                         │
│ 2. POST /api/home/nexa (con conversation history)                  │
│ 3. Leer stream con ReadableStream / EventSource                    │
│ 4. Renderizar tokens a medida que llegan                           │
│ 5. Al terminar, agregar mensaje completo al historial local        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│ API ROUTE (/api/home/nexa/route.ts)                                │
│                                                                     │
│ 1. Validar sesión (NextAuth) → extraer space_id, role, userName    │
│ 2. Fetch context del Space desde BigQuery (parallel queries)       │
│ 3. Construir system prompt: personalidad Nexa + context del Space  │
│ 4. Llamar Gemini con generateContentStream()                       │
│ 5. Pipe stream al cliente como text/event-stream                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│ VERTEX AI (proyecto efeonce-group, región us-central1)             │
│                                                                     │
│ Modelo: gemini-2.5-flash (MVP) / gemini-2.5-pro (prod)            │
│ System prompt: personalidad Nexa + data del Space                  │
│ Conversation history: últimos N mensajes de la sesión              │
│ Safety settings: block medium and above para todas las categorías  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Inicialización del SDK (server-side only)

```typescript
// src/lib/nexa/gemini-client.ts

import { GoogleGenAI } from '@google/genai'

// Singleton — se inicializa una vez por cold start de Vercel
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID!,       // 'efeonce-group'
  location: process.env.GCP_REGION!,           // 'us-central1'
})

export const NEXA_MODEL = process.env.NEXA_MODEL || 'gemini-2.5-flash'

export { ai }
```

**Variables de entorno nuevas en Vercel:**

| Variable | Valor | Scope |
|----------|-------|-------|
| `GCP_PROJECT_ID` | `efeonce-group` | Producción + Preview |
| `GCP_REGION` | `us-central1` | Producción + Preview |
| `NEXA_MODEL` | `gemini-2.5-flash` (MVP) → `gemini-2.5-pro` (prod) | Producción |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path al JSON del service account (o usar Workload Identity Federation) | Producción + Preview |

**Nota sobre auth GCP en Vercel:** La opción más limpia es **Workload Identity Federation** (sin JSON key). Si no está configurado, usar el JSON del service account como env var `GOOGLE_APPLICATION_CREDENTIALS_JSON` (stringified) y escribirlo a `/tmp` en runtime. El agente debe verificar qué método está disponible en el repo.

#### Context injection: qué sabe Nexa del usuario

Antes de cada llamada a Gemini, la API route ejecuta queries paralelas a BigQuery para armar el contexto del Space. Este contexto se inyecta en el system prompt — **el usuario nunca lo ve, Nexa lo usa para responder con data real**.

```typescript
// src/lib/nexa/context-builder.ts

export interface NexaSpaceContext {
  spaceName: string
  spaceId: string
  role: string
  userName: string

  // Proyectos
  projects: Array<{
    name: string
    status: string
    taskCount: number
    completedCount: number
  }>

  // Sprint activo
  activeSprint: {
    name: string
    startDate: string
    endDate: string
    progress: number  // 0-100
    tasksTotal: number
    tasksCompleted: number
  } | null

  // Métricas ICO (si están disponibles)
  metrics: {
    avgRpa: number | null
    otdPercent: number | null
    cycleTimeDays: number | null
    assetsInReview: number
    assetsInProgress: number
    assetsCompleted: number
  }

  // Tareas que necesitan atención
  pendingTasks: Array<{
    name: string
    project: string
    status: string
    daysUntilDeadline: number | null
    reviewRound: number
  }>

  // Equipo asignado (si existe)
  teamMembers: Array<{
    name: string
    role: string
    serviceLine: string
  }>
}
```

**Queries paralelas (ejecutadas con `Promise.all`):**

```typescript
// src/lib/nexa/context-queries.ts

export async function buildSpaceContext(spaceId: string): Promise<NexaSpaceContext> {
  const [projects, sprint, metrics, tasks, team] = await Promise.all([
    queryProjects(spaceId),
    queryActiveSprint(spaceId),
    queryICOMetrics(spaceId),
    queryPendingTasks(spaceId),
    queryTeamMembers(spaceId),
  ])

  return { projects, activeSprint: sprint, metrics, pendingTasks: tasks, teamMembers: team }
}
```

**Cada query tiene timeout de 5 segundos.** Si falla, ese campo del contexto se omite y Nexa responde con la data que sí tiene. Nunca se bloquea por una query lenta.

#### System prompt de Nexa

El system prompt tiene dos partes: **personalidad** (estática, versionada en Git) y **contexto** (dinámico, inyectado por request).

```typescript
// src/lib/nexa/system-prompt.ts

export function buildNexaSystemPrompt(context: NexaSpaceContext): string {
  return `${NEXA_PERSONALITY}

${formatSpaceContext(context)}`
}

const NEXA_PERSONALITY = `Eres Nexa, la asistente inteligente del Greenhouse de Efeonce.

## Tu personalidad
Heredas los valores de Efeonce pero hablas desde la experiencia de ejecutar, no de diseñar. Tienes chispa, eres directa, útil, con personalidad — no eres un chatbot genérico. Hablas como alguien que está en la trinchera operativa todos los días.

## Reglas de comunicación
- Tratamiento de tú. Siempre.
- Español LATAM con spanglish natural de la industria (feedback, asset, sprint, delivery, brief se dejan en inglés).
- Sin emojis. Nunca.
- Sin signos de exclamación dobles. Máximo uno cuando es genuinamente relevante.
- Respuestas concisas. Si puedes decirlo en 2 oraciones, no uses 4. El usuario está en un portal operativo, no leyendo un blog.
- Cuando cites datos, sé específica: "Tu proyecto Acme tiene RpA 1.2 este ciclo" — no "tu RpA está bien".
- Si no tienes data para responder algo, dilo directo: "No tengo esa información en tu Greenhouse todavía." No inventes.
- Las métricas ICO siempre en inglés: RpA, OTD%, Cycle Time, FTR%, Brief Clarity Score. No las traduzcas.
- Si el usuario pregunta algo fuera de tu alcance (clima, noticias, código), responde: "Eso está fuera de mi cancha. Yo me muevo en tu operación creativa — pregúntame sobre proyectos, métricas o tu equipo."

## Tu alcance
Puedes responder sobre:
- Estado de proyectos y tareas del Space del usuario
- Métricas ICO (RpA, OTD%, Cycle Time, etc.)
- Sprint/ciclo activo y su progreso
- Equipo asignado al Space
- Assets pendientes de revisión o feedback
- Comparativas entre proyectos del mismo Space
- Recomendaciones operativas basadas en la data visible

NO puedes:
- Modificar datos, crear tareas, ni ejecutar acciones
- Acceder a Spaces de otros clientes
- Dar opiniones sobre estrategia de negocio del cliente
- Responder sobre temas fuera de la operación del Greenhouse`

function formatSpaceContext(ctx: NexaSpaceContext): string {
  let context = `## Contexto actual del Space
- Space: ${ctx.spaceName} (ID: ${ctx.spaceId})
- Usuario: ${ctx.userName} (rol: ${ctx.role})
- Fecha actual: ${new Date().toISOString().split('T')[0]}\n`

  if (ctx.projects.length > 0) {
    context += `\n### Proyectos\n`
    ctx.projects.forEach(p => {
      context += `- ${p.name}: ${p.status} (${p.completedCount}/${p.taskCount} tareas completadas)\n`
    })
  }

  if (ctx.activeSprint) {
    const s = ctx.activeSprint
    context += `\n### Ciclo activo\n`
    context += `- ${s.name}: ${s.progress}% avance (${s.tasksCompleted}/${s.tasksTotal} tareas). Termina ${s.endDate}\n`
  }

  if (ctx.metrics.avgRpa !== null) {
    const m = ctx.metrics
    context += `\n### Métricas ICO\n`
    context += `- RpA promedio: ${m.avgRpa}\n`
    context += `- OTD%: ${m.otdPercent}%\n`
    context += `- Cycle Time promedio: ${m.cycleTimeDays} días\n`
    context += `- Assets en revisión: ${m.assetsInReview}\n`
    context += `- Assets en progreso: ${m.assetsInProgress}\n`
    context += `- Assets completados (período): ${m.assetsCompleted}\n`
  }

  if (ctx.pendingTasks.length > 0) {
    context += `\n### Tareas pendientes de atención\n`
    ctx.pendingTasks.forEach(t => {
      const deadline = t.daysUntilDeadline !== null
        ? (t.daysUntilDeadline < 0 ? `VENCIDA hace ${Math.abs(t.daysUntilDeadline)} días` : `${t.daysUntilDeadline} días para deadline`)
        : 'sin deadline'
      context += `- ${t.name} (${t.project}): ${t.status}, ronda ${t.reviewRound}, ${deadline}\n`
    })
  }

  if (ctx.teamMembers.length > 0) {
    context += `\n### Equipo asignado\n`
    ctx.teamMembers.forEach(m => {
      context += `- ${m.name}: ${m.role} (${m.serviceLine})\n`
    })
  }

  return context
}
```

**El system prompt se versiona en Git.** Cambios al prompt pasan por PR como cualquier otro cambio de código. No se edita en runtime.

#### API Route con streaming

```typescript
// src/app/api/home/nexa/route.ts

import { ai, NEXA_MODEL } from '@/lib/nexa/gemini-client'
import { buildSpaceContext } from '@/lib/nexa/context-queries'
import { buildNexaSystemPrompt } from '@/lib/nexa/system-prompt'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  // 1. Auth
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await request.json()
  // messages: Array<{ role: 'user' | 'model', content: string }>

  const spaceId = session.user.spaceId  // o clientId según el modelo actual
  const userName = session.user.name || session.user.email

  // 2. Build context (parallel BigQuery queries, 5s timeout each)
  const spaceContext = await buildSpaceContext(spaceId)
  spaceContext.userName = userName
  spaceContext.role = session.user.role

  // 3. Build system prompt
  const systemPrompt = buildNexaSystemPrompt(spaceContext)

  // 4. Format conversation history for Gemini
  const geminiHistory = messages.slice(-10).map((m: any) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))

  try {
    // 5. Streaming response
    const response = await ai.models.generateContentStream({
      model: NEXA_MODEL,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,      // Algo de personalidad pero no alucinaciones
        topP: 0.9,
        maxOutputTokens: 1024, // Respuestas concisas
      },
      contents: geminiHistory,
    })

    // 6. Pipe stream to client as SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              )
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    // 7. Fallback: respuesta completa sin streaming
    console.error('Nexa streaming failed, falling back:', error)
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: NEXA_MODEL,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
        contents: geminiHistory,
      })

      return Response.json({
        text: fallbackResponse.text,
        streamed: false,
      })
    } catch (fallbackError) {
      return Response.json(
        { error: 'Nexa no pudo procesar tu mensaje. Intenta de nuevo.' },
        { status: 500 }
      )
    }
  }
}
```

#### Frontend: consumo del stream

```typescript
// Dentro de NexaChat.tsx — hook o función de envío

async function sendMessage(userMessage: string) {
  // Agregar mensaje del usuario al historial local
  setMessages(prev => [...prev, { role: 'user', content: userMessage }])
  setIsStreaming(true)

  // Placeholder para la respuesta de Nexa
  let nexaResponse = ''
  setMessages(prev => [...prev, { role: 'model', content: '' }])

  try {
    const res = await fetch('/api/home/nexa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: userMessage }],
      }),
    })

    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      // Streaming mode
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6) // Remove 'data: '
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              nexaResponse += parsed.text
              // Actualizar el último mensaje (Nexa) en el historial
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'model', content: nexaResponse }
                return updated
              })
            }
          } catch {}
        }
      }
    } else {
      // Fallback: respuesta completa
      const data = await res.json()
      if (data.text) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'model', content: data.text }
          return updated
        })
      }
    }
  } catch (error) {
    setMessages(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = {
        role: 'model',
        content: 'No pude conectar con el Greenhouse. Intenta de nuevo en unos segundos.',
      }
      return updated
    })
  } finally {
    setIsStreaming(false)
  }
}
```

#### Límites y seguridad

| Concern | Solución |
|---------|----------|
| **Costo** | Gemini 2.5 Flash es ~$0.15/1M input tokens, ~$0.60/1M output tokens. Con respuestas de ~200 tokens y contexto de ~2K tokens, cada mensaje cuesta ~$0.0005. A 1000 mensajes/día = ~$0.50/día. |
| **Rate limiting** | Máximo 20 mensajes por sesión (frontend). Después: "Llegaste al límite de esta sesión. Recarga la página para empezar de nuevo." |
| **Context size** | El space context se limita a ~3K tokens. Si un Space tiene 50+ proyectos, se envían solo los 10 más recientes + un resumen. |
| **Conversation history** | Se envían solo los últimos 10 mensajes al modelo. No persistimos historial entre sesiones en MVP. |
| **Prompt injection** | El system prompt incluye instrucciones explícitas de no ejecutar acciones, no acceder a otros Spaces, y rechazar temas fuera de alcance. El contexto del Space es data read-only inyectada server-side — el usuario no la ve ni la controla. |
| **Tenant isolation** | `space_id` se extrae de la sesión server-side. Imposible que un usuario vea data de otro Space — la sesión es la fuente de verdad, no el request body. |
| **PII** | El contexto no incluye emails ni datos personales de contactos. Solo nombres de proyectos, tareas, métricas agregadas y nombres del equipo asignado. |

#### Modelo escalable: MVP → Producción

| Aspecto | MVP (Flash) | Producción (Pro) |
|---------|-------------|------------------|
| Modelo | `gemini-2.5-flash` | `gemini-2.5-pro` |
| Cambio requerido | — | Cambiar `NEXA_MODEL` env var |
| Context window | 1M tokens | 1M tokens |
| Calidad de razonamiento | Buena para datos tabulares y resúmenes | Excelente para análisis, comparativas, recomendaciones |
| Latencia first token | ~300ms | ~800ms |
| Costo estimado/día (1000 msgs) | ~$0.50 | ~$3.00 |
| Infraestructura | Vercel API Route | Evaluar Cloud Run si context > 300s |

---

## Componente 3: Module cards (acceso rápido)

### Comportamiento

Las module cards muestran los módulos disponibles para el usuario según sus capabilities activas. Ordenadas por **frecuencia de uso** (si hay analytics) o por **prioridad default**.

### Prioridad default (si no hay analytics de uso)

| Prioridad | Módulo | Icono (Tabler) | Condición de visibilidad |
|-----------|--------|-----------------|--------------------------|
| 1 | Pulse | `IconActivity` | Siempre visible |
| 2 | Proyectos | `IconFolder` | Siempre visible |
| 3 | Ciclos | `IconClock` | Siempre visible |
| 4 | Creative Hub | `IconBrush` | Capability `agencia_creativa` activa |
| 5 | Mi equipo | `IconUsers` | Siempre visible |
| 6 | Mi Greenhouse | `IconSettings` | Siempre visible |

**Para operator/admin, se agregan:**

| Prioridad | Módulo | Icono | Condición |
|-----------|--------|-------|-----------|
| 1 | Pulse Global | `IconWorld` | Role operator o admin |
| 2 | Spaces | `IconBuilding` | Role operator o admin |
| 3 | Capacidad | `IconChartBar` | Role operator o admin |
| 4 | HR | `IconId` | Role admin + route group `/hr/` |
| 5 | Finanzas | `IconCoin` | Role admin + route group `/finance/` |

### Componente Vuexy / MUI

Usar **`<Card variant="outlined">`** de MUI como base. Layout:

```tsx
<Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'divider' } }}>
  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
    <Avatar
      variant="rounded"
      sx={{
        width: 36,
        height: 36,
        bgcolor: moduleColor + '15',  // 15% opacity
        color: moduleColor,
      }}
    >
      <ModuleIcon size={18} />
    </Avatar>
    <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 14 }}>
      {moduleName}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {moduleMeta}  {/* ej: "4 proyectos activos" */}
    </Typography>
  </CardContent>
</Card>
```

**Grid:** `<Grid container spacing={1.5}>` con `<Grid item xs={6} sm={4} md={3}>` para 4 columnas en desktop, 2 en mobile.

### Module meta (subtítulo dinámico)

| Módulo | Meta | Source |
|--------|------|--------|
| Pulse | "Vista general de tu operación" | Estático |
| Proyectos | "{n} proyectos activos" | `notion_ops.proyectos` count |
| Ciclos | "Ciclo {n} — día {d} de {total}" | `notion_ops.sprints` activo |
| Creative Hub | "{n} assets en producción" | `notion_ops.tareas` count en CSC |
| Mi equipo | "{n} personas asignadas" | `greenhouse_core.team_members` count |
| Pulse Global | "{n} Spaces activos" | `greenhouse_core.spaces` count |

### Colores por módulo

Usar colores de la Core Palette con 15% opacity para el icono background:

| Módulo | Color |
|--------|-------|
| Pulse | `#0375db` (Core Blue) |
| Proyectos | `#6B4EAA` (Orchid Purple) |
| Ciclos | `#0F8E6C` (derivado de teal) |
| Creative Hub | `#D85A30` (Sunset Orange) |
| Mi equipo | `#993C1D` (Coral derivative) |
| Mi Greenhouse | `#667085` (Neutral) |
| Pulse Global | `#022a4e` (Midnight Navy) |
| Spaces | `#185FA5` (Deep Azure) |
| Capacidad | `#534AB7` (Purple) |

---

## Componente 4: Task list (pendientes)

### Comportamiento

Muestra las tareas que requieren acción del usuario, ordenadas por urgencia:
1. Tareas con deadline vencido o próximo (< 3 días)
2. Tareas en estado `Listo para revisión` (esperan feedback del cliente)
3. Tareas con comentarios sin resolver

**Máximo 5 tareas visibles.** Si hay más, mostrar link "Ver todas →" que lleva a Proyectos.

### Source

```sql
SELECT
  t.nombre_tarea,
  t.proyecto_nombre,
  t.estado,
  t.fase_csc,
  t.rondas_revision,
  t.fecha_limite,
  t.ultima_actividad
FROM `efeonce-group.notion_ops.tareas` t
WHERE t.space_id = @spaceId
  AND t.estado IN ('Listo para revisión', 'Cambios Solicitados', 'En proceso')
  AND t.archivado = false
ORDER BY
  CASE
    WHEN t.fecha_limite < CURRENT_DATE() THEN 0          -- Vencidas primero
    WHEN t.fecha_limite < DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY) THEN 1  -- Próximas
    WHEN t.estado = 'Listo para revisión' THEN 2         -- Esperan feedback
    ELSE 3
  END,
  t.ultima_actividad DESC
LIMIT 5
```

### Componente Vuexy / MUI

Usar **`<List>`** de MUI con **`<ListItem>`** custom:

```tsx
<List disablePadding>
  {tasks.map((task) => (
    <ListItemButton
      key={task.id}
      sx={{
        border: '0.5px solid',
        borderColor: 'divider',
        borderRadius: 2,
        mb: 1,
        px: 2,
        py: 1.5,
      }}
      onClick={() => router.push(`/proyectos/${task.projectId}`)}
    >
      {/* Dot de estado */}
      <Box
        sx={{
          width: 8, height: 8, borderRadius: '50%',
          bgcolor: statusColor(task.estado),
          mr: 1.5, flexShrink: 0,
        }}
      />
      {/* Contenido */}
      <ListItemText
        primary={
          <Typography variant="body2" fontWeight={500} noWrap>
            {task.nombre_tarea} — {task.proyecto_nombre}
          </Typography>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {task.meta}
          </Typography>
        }
      />
      {/* Badge de estado */}
      <Chip
        label={statusLabel(task.estado)}
        size="small"
        sx={{
          bgcolor: statusBgColor(task.estado),
          color: statusTextColor(task.estado),
          fontWeight: 500,
          fontSize: 11,
        }}
      />
    </ListItemButton>
  ))}
</List>
```

### Colores de status dot y badge

| Estado | Dot color | Badge bg | Badge text |
|--------|-----------|----------|------------|
| Listo para revisión | `#BA7517` (Amber) | `#FAEEDA` | `#854F0B` |
| En proceso | `#0375db` (Core Blue) | `#E6F1FB` | `#185FA5` |
| Cambios Solicitados | `#BA7517` (Amber) | `#FAEEDA` | `#854F0B` |
| Completado | `#1D9E75` (Green) | `#EAF3DE` | `#3B6D11` |
| Bloqueado | `#E24B4A` (Red) | `#FCEBEB` | `#A32D2D` |

### Labels de status

| Estado (Notion) | Label en UI |
|-----------------|-------------|
| Listo para revisión | En revisión |
| En proceso | En progreso |
| Cambios Solicitados | Cambios |
| Completado | Listo |
| Bloqueado | Bloqueado |

---

## API Routes

### Nuevas rutas

| Método | Ruta | Qué hace |
|--------|------|----------|
| GET | `/api/home/greeting-context` | Retorna `GreetingContext` con conteos y métricas para los greetings dinámicos |
| POST | `/api/home/nexa` | Recibe conversation history, inyecta contexto del Space, llama Gemini via Vertex AI, retorna stream SSE (o JSON fallback) |
| GET | `/api/home/modules` | Retorna lista de módulos disponibles para el usuario con sus metas dinámicos |
| GET | `/api/home/tasks` | Retorna las tareas pendientes (máx 5) |

Todas las rutas filtran por `space_id` del usuario autenticado. Operadores con `can_view_all_spaces` en contexto de Agencia ven data agregada.

---

## File structure

```
src/
├── app/
│   └── [lang]/
│       └── (dashboard)/
│           └── home/
│               └── page.tsx                    ← Server component, data fetching
│
├── views/
│   └── greenhouse/
│       └── home/
│           ├── HomeView.tsx                    ← Client component principal
│           ├── GreetingRotator.tsx             ← Greeting con animación y rotación
│           ├── NexaChat.tsx                    ← Chat container con input, mensajes y stream
│           ├── NexaChatMessage.tsx             ← Componente individual de mensaje (Nexa o user)
│           ├── NexaStreamingMessage.tsx        ← Mensaje que se renderiza token por token
│           ├── ModuleCards.tsx                 ← Grid de module cards
│           ├── ModuleCard.tsx                  ← Card individual de módulo
│           ├── TaskList.tsx                    ← Lista de pendientes
│           ├── TaskItem.tsx                    ← Item individual de tarea
│           └── SuggestionChips.tsx             ← Chips de sugerencia
│
├── lib/
│   └── nexa/
│       ├── gemini-client.ts                    ← Singleton de @google/genai con config Vertex AI
│       ├── system-prompt.ts                    ← Personalidad de Nexa + formateo de contexto
│       ├── context-builder.ts                  ← Tipos del NexaSpaceContext
│       └── context-queries.ts                  ← Queries paralelas a BigQuery para contexto
│
├── config/
│   ├── greenhouse-home-greetings.ts            ← 18 greetings + tipos
│   └── greenhouse-home-suggestions.ts          ← Suggestion chips por rol
│
├── app/
│   └── api/
│       └── home/
│           ├── greeting-context/
│           │   └── route.ts                    ← GET greeting context
│           ├── nexa/
│           │   └── route.ts                    ← POST message → Gemini stream/fallback
│           ├── modules/
│           │   └── route.ts                    ← GET available modules
│           └── tasks/
│               └── route.ts                    ← GET pending tasks
│
└── types/
    └── home.ts                                 ← GreetingContext, NexaSpaceContext, NexaMessage, etc.
```

**Regla:** Antes de crear componentes nuevos, verificar si existe algo reutilizable en `src/components/greenhouse/`. Los componentes de este task que sean genéricos (ej: status chips, metric badges) deben vivir en `components/greenhouse/`, no en `views/greenhouse/home/`.

---

## Tipografía (según Typography Hierarchy Fix — normativo)

| Elemento | Familia / Peso | Tamaño |
|----------|---------------|--------|
| Greeting principal | Poppins SemiBold (600) | 22px |
| Greeting subtítulo | DM Sans Regular (400) | 14px |
| Section header ("TUS MÓDULOS") | Poppins Medium (500) | 11px, uppercase, tracking +1.2px |
| Module card título | Poppins Medium (500) | 14px |
| Module card meta | DM Sans Regular (400) | 12px |
| Chat input placeholder | DM Sans Regular (400) | 15px |
| Chat mensaje Nexa | DM Sans Regular (400) | 14px |
| Chat mensaje usuario | DM Sans Regular (400) | 14px |
| Nexa name label | Poppins Medium (500) | 12px |
| Suggestion chip | DM Sans Regular (400) | 13px |
| Task title | DM Sans Medium (500) | 13px |
| Task detail | DM Sans Regular (400) | 12px |
| Task badge | DM Sans Medium (500) | 11px |

---

## Colores (según Nomenclatura Portal v3 — normativo)

Todos los colores salen de `GH_COLORS` en `greenhouse-nomenclature.ts`:

| Token | Valor | Uso en home |
|-------|-------|-------------|
| `midnightNavy` | `#022a4e` | — |
| `coreBluePrimary` | `#0375db` | Avatar de Nexa, send button, links |
| `coreBlueBg` | `#0375db` + 8% opacity | Burbuja de mensaje del usuario |
| `textPrimary` | Theme default | Greeting, títulos |
| `textSecondary` | Theme default | Subtítulos, metas, descriptions |
| `divider` | Theme default | Borders de cards y tasks |

---

## Acceptance criteria

### P0 — Funcional mínimo

- [ ] Vista `/home` renderiza correctamente para roles `client`, `operator`, `admin`
- [ ] Greeting rotativo funciona con al menos los 8 greetings estáticos
- [ ] Chat de Nexa acepta input y envía a `/api/home/nexa`
- [ ] Gemini 2.5 Flash responde via streaming (tokens se renderizan en tiempo real)
- [ ] Si streaming falla, fallback a respuesta completa funciona transparentemente
- [ ] System prompt de Nexa inyecta contexto real del Space desde BigQuery
- [ ] Nexa responde con datos reales del usuario ("Tu proyecto X tiene RpA 1.2")
- [ ] Nexa rechaza preguntas fuera de alcance con respuesta on-brand
- [ ] Tenant isolation: imposible ver data de otro Space (space_id de sesión, no de request)
- [ ] Module cards muestran módulos según capabilities del Space
- [ ] Task list muestra hasta 5 tareas pendientes con status correcto
- [ ] Post-login redirect apunta a `/home` en vez de `/dashboard`
- [ ] Tipografía respeta Poppins (títulos) / DM Sans (body) según tabla
- [ ] Colores usan `GH_COLORS` — no hay colores hardcodeados fuera de nomenclatura
- [ ] Mobile responsive: layout se adapta a pantallas < 768px
- [ ] Rate limit: máximo 20 mensajes por sesión en frontend

### P1 — Experiencia completa

- [ ] Greetings dinámicos se alimentan de data real vía `/api/home/greeting-context`
- [ ] Suggestion chips cambian según rol del usuario
- [ ] Module cards muestran metas dinámicos (conteos reales)
- [ ] Typing indicator mientras Nexa procesa (antes del primer token del stream)
- [ ] Conversation history (últimos 10 mensajes) se envía al modelo para contexto multi-turn
- [ ] Context queries en BigQuery tienen timeout de 5s con graceful degradation
- [ ] Env var `NEXA_MODEL` permite cambiar de Flash a Pro sin deploy de código

### P2 — Polish y futuro

- [ ] Cambiar `NEXA_MODEL` a `gemini-2.5-pro` en producción y validar calidad de respuestas
- [ ] Evaluar si Cloud Run es necesario para Pro (medir latencias p95)
- [ ] Analytics: loguear intent implícito, latencia, tokens usados por mensaje
- [ ] Module cards ordenadas por frecuencia real de uso del usuario
- [ ] Greeting inteligente: si el usuario entró hace < 1 hora, usar greeting de "seguimos" en vez de "bienvenido"
- [ ] Persistencia opcional de historial de chat en PostgreSQL para continuidad entre sesiones

---

## Notas para el agente

1. **Leer AGENTS.md primero.** Contiene las reglas operativas del repo.
2. **Instalar `@google/genai`:** `pnpm add @google/genai`. Este es el SDK unificado de Google — NO usar `@google-cloud/vertexai` (deprecated desde junio 2025).
3. **Componentes Vuexy:** El full-version tiene un Chat App completo en `src/app/[lang]/(dashboard)/apps/chat/`. Usar como referencia para patrones de MUI (Card, TextField, Avatar, List), pero NO copiar el app entero — este es un chat mucho más simple.
4. **No instalar librerías nuevas** (excepto `@google/genai`). Todo lo demás se resuelve con MUI 7.x, Tabler Icons, y CSS. No framer-motion, no react-spring, no animate.css.
5. **La animación del greeting es CSS puro:** `@keyframes` con `translateY` y `opacity`. Se aplica condicionalmente cuando cambia el greeting.
6. **Auth GCP en Vercel:** Verificar si el repo ya tiene configurado el acceso al service account para BigQuery. Si usa JSON key, el mismo mecanismo sirve para Vertex AI. Si usa Workload Identity Federation, confirmar que el trust relationship incluye el service account del portal.
7. **El system prompt de Nexa se versiona en Git.** Vive en `src/lib/nexa/system-prompt.ts`. Cambios al prompt pasan por PR como cualquier otro cambio. No usar prompts almacenados en base de datos ni editables en runtime.
8. **Context queries con timeout.** Cada query de BigQuery para el contexto del Space tiene timeout de 5 segundos. Si falla, se omite ese campo — Nexa responde con lo que tiene. Usar `Promise.allSettled` (no `Promise.all`) para que una query lenta no bloquee las demás.
9. **Streaming en Vercel:** Las API routes de Next.js soportan `ReadableStream` nativamente. No se necesita Edge Runtime para esto — Serverless Functions en Vercel Pro también soportan streaming (timeout 300s).
10. **Space = tenant boundary.** Toda query filtra por `space_id`. El `space_id` se extrae de la sesión server-side, NUNCA del request body. Esta regla es canónica desde Account 360.
11. **Rate limit en frontend, no en backend.** Para MVP, el límite de 20 mensajes por sesión se implementa en el state de React. En producción, agregar rate limiting server-side con Redis o similar.
12. **Branch:** `feature/home-nexa`. No mergear a main — crear PR para review.
13. **Si `/home` ya existe:** Renombrar la vista existente antes de crear la nueva. No crear rutas paralelas.
