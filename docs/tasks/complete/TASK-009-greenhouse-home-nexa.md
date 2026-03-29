# TASK-009 - Greenhouse Home Nexa v2: Home conversacional y client-first sobre el runtime real del portal

## Delta 2026-03-29

- `TASK-009` se cierra como baseline principal de `Home + Nexa v2`.
- El runtime base ya quedó materializado en `/home`, con snapshot server-side, `HomeView`, `Nexa` operativo y adopción sustantiva de assistant-ui sobre la integración real del portal.
- Lo pendiente deja de bloquear el objetivo principal y se divide así:
  - `TASK-119` — rollout final de navegación y cutover de `/home`
  - `TASK-110` — evolución de Nexa como asistente (`tool calling`, UI avanzada, feedback, floating entrypoint)
- `Slice D` de enriquecimiento operativo del snapshot queda absorbido por la evolución de Nexa/Home en tareas derivadas, no como blocker de cierre de esta baseline.

## Delta 2026-03-26

- Se implementó el MVP de `Home` como nueva superficie de entrada client-first en `/home`.
- El redirect stub a `/dashboard` fue reemplazado por `HomeView`, y `portalHomePath` para cliente ahora aterriza en `/home`.
- Se agregó el snapshot server-side:
  - `GET /api/home/snapshot`
  - greeting rotativo
  - módulos resueltos por capacidades
  - shortlist de notificaciones no leídas
- Se agregó `POST /api/home/nexa` con `NexaService` sobre Google GenAI, grounded en el `HomeSnapshot` del usuario.
- Se implementó la UI inicial:
  - `GreetingCard`
  - `ModuleGrid`
  - `TaskShortlist`
  - `NexaPanel`
- Pendiente posterior:
  - tool calling y grounding más profundo sobre métricas/consumers operativos
  - tests unitarios/RTL de la nueva superficie

## Estado

Baseline canonica de implementacion cerrada al 2026-03-29.

Esta version conserva la vision de producto de `CODEX_TASK_Greenhouse_Home_Nexa.md`, pero reescribe su base tecnica para alinearla con el repo vivo:
- `portalHomePath` y redirects existentes
- route groups reales del proyecto
- `dashboard` / `internal/dashboard` como superficies ya activas
- `@google/genai` ya instalado
- `Nexa` como slice incremental, no como reescritura total del portal de entrada

## Resumen

Implementar una nueva vista `Home` del portal como superficie de entrada mas guiada y conversacional para Greenhouse.

La v2 mantiene la tesis correcta del brief original:
- una entrada menos fria que el dashboard clasico
- una capa conversacional llamada `Nexa`
- accesos rapidos a modulos
- pendientes visibles
- tono de producto mas intencional

La implementacion cambia:
- `Home` no reemplaza de golpe todo el sistema de redirects
- `Home` se integra con `portalHomePath`
- `Nexa` arranca como bloque o panel acotado dentro de la vista
- la data se apoya primero en consumers y queries existentes del portal

## Decision de arquitectura

### Principios

- `Home` es una nueva superficie, no una negacion de `/dashboard` o `/internal/dashboard`
- el redirect de entrada debe seguir respetando `portalHomePath`
- `client`, `internal`, `admin`, `finance`, `hr`, `people`, `agency` siguen siendo los boundaries reales
- `Nexa` no debe introducir un runtime paralelo innecesario ni consultas ad hoc a cinco fuentes por mensaje si ya existen consumers reutilizables
- la experiencia debe ser `client-first`, con variantes posteriores para `internal/admin`

## Lo que Home + Nexa es y no es

`Home + Nexa` si es:
- una landing operacional mas guiada
- una capa de bienvenida y orientacion
- una superficie para shortcuts, pendientes y preguntas rapidas
- una oportunidad de hacer la primera pantalla mas clara y mas Greenhouse

`Home + Nexa` no es:
- un reemplazo inmediato de `Pulse`
- un reemplazo de `internal/dashboard`
- una app de chat completa
- un workflow engine
- una razon para rehacer auth, sidebar o navigation contracts

## Alineacion con la arquitectura viva

La implementacion debe respetar:
- `dashboard` sigue siendo la vista ejecutiva cliente existente
- `internal/dashboard` sigue siendo la control tower interna
- auth y autorizacion viven en guards/layouts y helpers server-side
- `portalHomePath` sigue siendo el contrato de aterrizaje por usuario/tenant
- `space_id` sigue siendo el tenant boundary

## Decision sobre redirect

La task original proponia mover todo login a `/home`.

La v2 corrige eso:
- no imponer `/home` como redirect universal
- introducir `/home` como nueva opcion valida de `portalHomePath`
- permitir rollout gradual:
  - algunos tenants o usuarios pueden seguir en `/dashboard`
  - internos pueden seguir en `/internal/dashboard`
  - clientes seleccionados pueden aterrizar en `/home`

### Regla MVP

`/home` se habilita como entrada principal del lado `client`.

Mapa recomendado de aterrizaje:
- `client` -> `/home`
- `internal` -> `/internal/dashboard`
- `finance` -> `/finance`
- `hr` -> `/hr/payroll`
- `admin` -> mantener el home especializado que mejor refleje su rol dominante hasta que exista una variante propia de `Home`

No hacer que `internal` o `admin` aterricen automaticamente en la misma composicion client-first sin una variante especifica para su contexto.

## Audiencias

### Cliente

Es la audiencia principal de `Home` v2 y su entrada por defecto deseada en el portal.

Ve:
- greeting
- Nexa
- modulos recomendados
- pendientes

### Internal / Admin

No son el foco del MVP.

Opciones validas:
- seguir usando `internal/dashboard`
- o exponer `/home` con variante especifica en fase posterior

### Finance / HR / People

No deben romper su redirect natural actual por introducir `Home`.

## Scope MVP

Incluye:
- nueva vista `/home`
- greeting rotativo
- module cards basadas en capacidades / surfaces reales
- lista corta de pendientes
- bloque `Nexa` conversacional simple
- APIs dedicadas de `home` para greeting/modules/tasks
- `Nexa` con contexto acotado y seguro
- rollout via `portalHomePath`

No incluye:
- migrar a todos los usuarios a `/home`
- reemplazar `/dashboard`
- reemplazar `/internal/dashboard`
- analytics avanzada de orden por uso real
- persistencia de historial multi-sesion
- contexto gigante armado por queries ad hoc para cada mensaje

## UI / UX

### Estructura MVP

```text
Greeting
Nexa panel
Tus modulos
Pendientes
```

### Regla de jerarquia

El home debe verse como una landing focalizada, no como dashboard plano de cards iguales.

### Regla por audience

La composicion `max-width` conversacional encaja especialmente bien en cliente.

Para audiencias internas, si se implementa despues, conviene otra variante mas ancha y mas operativa.

## Nexa en v2

### Decision de producto

`Nexa` sigue existiendo como asistente del portal.

Pero en el MVP:
- no tiene que dominar toda la pantalla
- no tiene que ser el unico centro de gravedad del home
- puede vivir como panel principal encima de modulos y pendientes

### Decision tecnica

- `@google/genai` ya existe en el repo
- `Nexa` puede correr en API route del portal
- usar streaming cuando sea viable
- fallback a respuesta completa si streaming falla

### Contexto MVP

No construir el contexto con un fan-out arbitrario de queries crudas por mensaje si ya existe una capa reutilizable.

Preferencia:
1. consumers y helpers existentes del portal
2. semantic endpoints ya disponibles
3. queries nuevas solo donde falte una pieza clara

### Contexto sugerido en MVP

- `spaceId`
- `spaceName`
- nombre del usuario
- 3 a 5 proyectos visibles
- resumen corto del ciclo activo si existe
- 3 a 5 pendientes
- 2 o 3 metricas visibles de alto nivel si ya existen via consumers estables

### Regla de seguridad

- nunca aceptar `space_id` desde el request body
- resolverlo desde sesion / tenant context
- no responder con data fuera del scope del usuario

## API surface MVP

- `GET /api/home/greeting-context`
- `GET /api/home/modules`
- `GET /api/home/tasks`
- `POST /api/home/nexa`

Reglas:
- helpers server-side de tenant context
- sin `middleware.ts`
- filtrado por scope del usuario
- degradacion elegante si una fuente no responde

## Module cards

La task original acierta en mostrar accesos rapidos, pero la v2 cambia el criterio:

- basarse en surfaces reales del portal
- respetar capabilities y route groups existentes
- no asumir modulos que todavia no sean contratos UI estables

### Cliente

Base razonable:
- Pulse
- Proyectos
- Ciclos
- Updates
- capabilities activas

### Internal/Admin

Fase posterior:
- no mezclar a la fuerza `Pulse Global`, `HR`, `Finanzas` y otros modulos en una sola version client-first sin diseno especifico

## Pendientes

La idea es correcta, pero el MVP debe priorizar una fuente simple y confiable.

Preferencia:
- tareas visibles que requieren atencion dentro del scope del usuario
- maximo 5
- status y CTA claros

Evitar:
- una definicion demasiado ambiciosa de “pendiente” que mezcle demasiadas logicas de negocio en la primera salida

## Integracion con surfaces existentes

La v2 no degrada:
- `/dashboard`
- `/internal/dashboard`
- sidebar
- `portalHomePath`

La introduccion correcta es:
- mantener `/home` como ruta nueva
- reemplazar el redirect stub existente
- habilitar el uso por configuracion gradual

## File structure sugerida

```text
src/app/(dashboard)/home/page.tsx
src/views/greenhouse/home/*
src/app/api/home/*
src/lib/nexa/*
src/config/greenhouse-home-greetings.ts
src/config/greenhouse-home-suggestions.ts
src/types/home.ts
```

Regla:
- reutilizar `src/components/greenhouse/*` para primitives compartidos
- no inventar componentes genericos dentro de `views` si sirven fuera de Home

## Fases recomendadas

### Fase 1

- reemplazar redirect stub de `/home`
- greeting rotativo
- module cards
- pendientes
- layout client-first

### Fase 2

- `Nexa` con chat simple
- contexto acotado
- streaming + fallback
- suggestion chips

### Fase 3

- rollout via `portalHomePath`
- variantes por audience
- mejores metas dinamicos
- orden por uso real

### Fase 4

- historial persistente opcional
- enrichment conversacional mas profundo
- posible convergencia con otras superficies AI internas si tiene sentido

## Regla operativa final

Esta `v2` conserva la intuicion correcta:
- Greenhouse si necesita una entrada mas guiada y con mas personalidad

Pero corrige la estrategia:
- primero un `Home` solido y client-first
- luego `Nexa` incremental
- sin romper redirects, dashboards y contracts que ya existen

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `project_context.md`
- `AGENTS.md`

---

## Dependencies & Impact

- **Depende de:**
  - Auth y tenant context del portal (ya implementado)
  - `portalHomePath` redirect mechanism (ya implementado)
  - `@google/genai` (ya instalado)
  - Capabilities y route groups existentes
- **Impacta a:**
  - Ninguna otra task directamente — `/home` es una nueva superficie aditiva
- **Archivos owned:**
  - `src/app/(dashboard)/home/page.tsx`
  - `src/views/greenhouse/home/*`
  - `src/app/api/home/*`
  - `src/lib/nexa/*`
  - `src/config/greenhouse-home-greetings.ts`
  - `src/config/greenhouse-home-suggestions.ts`
  - `src/types/home.ts`
## Delta 2026-03-26
- Se retiro temporalmente el rollout de `/home` como landing por defecto del portal y `/home` volvio a redirigir a `/dashboard` para estabilizar ingreso en `staging`.
- La implementacion del modulo `Home/Nexa` sigue presente en codigo, pero quedo fuera del camino critico hasta aislar el freeze reportado por usuarios.

## Delta 2026-03-28 — Auditoria completa y plan de reactivacion

### Lifecycle: `in-progress`
La task estaba en `complete/` pero la feature esta deshabilitada en produccion y staging. No puede considerarse cerrada. Se realizo auditoria completa de los 12 archivos de la implementacion.

### Root cause del freeze

La cadena que congela el browser es:

```
/home mounts → HomeView useEffect → fetch('/api/home/snapshot') SIN timeout
  → getHomeSnapshot() → NotificationService.getNotifications() SIN try/catch
  → query PG sin timeout (tabla puede no existir en staging)
  → endpoint colgado → fetch colgado → browser frozen en skeleton
```

**Causa 1 (critica): `NotificationService.getNotifications()` sin try/catch ni timeout**

`get-home-snapshot.ts` linea 52 llama:
```typescript
const { items: notifications } = await NotificationService.getNotifications(input.userId, {
  unreadOnly: true,
  pageSize: 5
})
```

Si la tabla `greenhouse_core.notifications` no existe en staging, o Cloud SQL esta lento, el endpoint se cuelga indefinidamente. No hay catch, no hay fallback.

**Causa 2 (critica): Fetch sin timeout en HomeView**

`HomeView.tsx` linea 52:
```typescript
const res = await fetch('/api/home/snapshot')
```

No tiene `AbortController` ni `AbortSignal.timeout()`. Si el API se cuelga, el componente se queda en skeleton forever. El usuario percibe un freeze.

**Causa 3 (descartada): render loop** — `useEffect` tiene `[]` como deps, corre una sola vez.

**Causa 4 (descartada): Gemini API** — `NexaService` solo se invoca en `POST /api/home/nexa` (chat), no en la carga inicial.

### Inventario completo de issues

Se auditaron los 12 archivos. Aqui todos los problemas encontrados, no solo el freeze:

| # | Severidad | Archivo | Problema |
|---|-----------|---------|----------|
| 1 | **Critico** | `HomeView.tsx` | `fetch('/api/home/snapshot')` sin timeout ni AbortController — causa el freeze |
| 2 | **Critico** | `get-home-snapshot.ts` | `NotificationService.getNotifications()` sin try/catch — si falla, tira todo el snapshot |
| 3 | **Alto** | `NexaPanel.tsx` | `fetch('/api/home/nexa')` sin timeout — si Gemini no responde, se cuelga el chat |
| 4 | **Alto** | `nexa/route.ts` | Llama `getHomeSnapshot()` completo antes de generar respuesta IA — doble cuello secuencial |
| 5 | **Alto** | `NexaPanel.tsx` | Envia `history: messages` completo en cada request — payload crece sin limite |
| 6 | **Medio** | `HomeView.tsx` | Sin error boundary alrededor de `NexaPanel` — un error en Nexa mata toda la Home |
| 7 | **Medio** | `google-genai.ts` | Escribe credenciales a disco en cada init — race condition si hay requests concurrentes |
| 8 | **Bajo** | `NexaPanel.tsx` | `useEffect` de scroll en `[messages]` — reflows en cada mensaje, no debounced |

### Archivos auditados

| Archivo | Estado |
|---------|--------|
| `src/app/(dashboard)/home/page.tsx` | Redirect defensivo a /dashboard — correcto, se quitara al reactivar |
| `src/views/greenhouse/home/HomeView.tsx` | **Fix F1 + F2 + F6** |
| `src/lib/home/get-home-snapshot.ts` | **Fix F3** |
| `src/app/api/home/snapshot/route.ts` | OK — tiene try/catch en endpoint |
| `src/app/api/home/nexa/route.ts` | **Fix F5** — optimizar context |
| `src/views/greenhouse/home/components/GreetingCard.tsx` | OK — componente puro |
| `src/views/greenhouse/home/components/ModuleGrid.tsx` | OK — componente puro |
| `src/views/greenhouse/home/components/NexaPanel.tsx` | **Fix F4 + F7** |
| `src/views/greenhouse/home/components/TaskShortlist.tsx` | OK — componente puro |
| `src/lib/nexa/nexa-service.ts` | OK — solo se invoca en POST |
| `src/config/home-greetings.ts` | OK — constantes |
| `src/config/home-suggestions.ts` | OK — constantes |

### Plan de fixes

#### Slice A — Corregir freeze (blocker)

| Fix | Archivo | Cambio | Esfuerzo |
|-----|---------|--------|----------|
| F1 | `HomeView.tsx` | Agregar `AbortSignal.timeout(5000)` al fetch de snapshot | 2 min |
| F2 | `HomeView.tsx` | Si timeout, mostrar Home sin tasks (degradacion elegante, no error page) | 3 min |
| F3 | `get-home-snapshot.ts` | Envolver `NotificationService.getNotifications()` en try/catch con fallback `tasks: []` | 2 min |

#### Slice B — Hardening de Nexa

| Fix | Archivo | Cambio | Esfuerzo |
|-----|---------|--------|----------|
| F4 | `NexaPanel.tsx` | Agregar `AbortSignal.timeout(15000)` al fetch de chat | 2 min |
| F5 | `nexa/route.ts` | NO llamar `getHomeSnapshot()` completo por cada mensaje — solo pasar context minimo (modules, userName) | 5 min |
| F6 | `HomeView.tsx` | Error boundary alrededor de `NexaPanel` — si Nexa falla, Home sigue funcionando | 3 min |
| F7 | `NexaPanel.tsx` | Limitar `history` a ultimos 10 mensajes en cada request | 2 min |

#### Slice C — Navegacion y rollout

| Fix | Archivo | Cambio | Esfuerzo |
|-----|---------|--------|----------|
| F8 | `home/page.tsx` | Quitar redirect defensivo, renderizar `HomeView` | 1 min |
| F9 | `VerticalMenu.tsx` | Mover "Torre de control" a la seccion Administracion en el sidebar | 3 min |
| F10 | `access.ts` | Cambiar `portalHomePath` de internos de `/internal/dashboard` a `/home` | 2 min |

#### Slice D — Enriquecer snapshot (posterior)

Agregar datos operativos reales al `getHomeSnapshot()`:
- Periodo de nomina actual (status, headcount) desde `payroll_periods`
- Facturas pendientes de cobro (aging) desde `fin_income`
- OTD global del mes desde `ico_organization_metrics`
- Correos fallidos desde `email_deliveries`

Este slice no bloquea la reactivacion — se puede hacer despues.

#### Slice E — Migrar NexaPanel a assistant-ui

**Dependencia:** `@assistant-ui/react`, `@assistant-ui/react-markdown`

**Contexto:** El `NexaPanel` actual (180 lineas) implementa a mano: estado de mensajes, scroll, abort, retry, input, loading indicator, suggestion chips. La libreria `assistant-ui` (50k+ descargas/mes, YC-backed) resuelve todo eso con primitivos composables, ademas de agregar: streaming nativo, markdown rendering, auto-scroll inteligente, retry/cancel/edit por mensaje, keyboard shortcuts, y ARIA completo.

**Evaluacion de compatibilidad:**

| Dimension | Estado |
|-----------|--------|
| React 19 / Next.js 16 | Compatible (docs muestran React 19 support) |
| MUI coexistencia | OK — assistant-ui expone primitivos sin estilo (`ThreadPrimitive`, `MessagePrimitive`, `ComposerPrimitive`) que se wrappean con cualquier styling |
| Tailwind | Ya lo usamos en el portal — NexaPanel actual usa clases Tailwind extensivamente |
| Backend custom | `LocalRuntime` con `ChatModelAdapter` apunta a `/api/home/nexa` existente — el backend no cambia |
| Streaming | Opcional — funciona sin streaming (respuesta completa), pero la UX mejora significativamente con streaming |

**Runtime seleccionado: `LocalRuntime`**

assistant-ui maneja el estado internamente. Solo necesitamos un adapter que haga fetch a nuestro endpoint:

```typescript
const nexaAdapter: ChatModelAdapter = {
  async run({ messages, abortSignal }) {
    const lastMessage = messages[messages.length - 1]
    const prompt = lastMessage.content.filter(c => c.type === 'text').map(c => c.text).join('')
    const history = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content.filter(c => c.type === 'text').map(c => c.text).join('')
    }))

    const res = await fetch('/api/home/nexa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history }),
      signal: abortSignal
    })

    const data = await res.json()

    return { content: [{ type: 'text', text: data.content }] }
  }
}
```

**Lo que reemplaza vs lo que se mantiene:**

| Componente actual | Reemplazo assistant-ui |
|-------------------|----------------------|
| `useState<NexaMessage[]>` manual | `LocalRuntime` state management |
| `fetch` con `AbortSignal.timeout` manual (F4) | `abortSignal` nativo del adapter |
| `messages.slice(-10)` manual (F7) | Configurable en el adapter |
| `useEffect` scroll en `[messages]` (F8) | Auto-scroll inteligente built-in |
| `CircularProgress` loading | Typing indicator built-in |
| `Chip` suggestion chips | Se mantienen (UI custom fuera del chat) |
| Error catch → mensaje de error | Retry button built-in por mensaje |
| `NexaBoundary` error boundary (F6) | Se mantiene como safety net externo |

**Ganancia neta:** NexaPanel pasa de ~180 lineas a ~60, eliminando 3 fixes manuales (F4, F7, F8) y ganando streaming, markdown, retry, cancel, edit, y accessibility ARIA completa.

**Archivos afectados:**

| Archivo | Cambio |
|---------|--------|
| `package.json` | `pnpm add @assistant-ui/react @assistant-ui/react-markdown` |
| `src/views/greenhouse/home/components/NexaPanel.tsx` | Reescribir con `LocalRuntime` + `ChatModelAdapter` + primitivos assistant-ui |
| `src/app/api/home/nexa/route.ts` | Sin cambios (o migrar a streaming con `ReadableStream` para UX optima) |
| `src/lib/nexa/nexa-service.ts` | Sin cambios (o agregar `generateStream()` si se habilita streaming) |

**Fase opcional: streaming**

Si se habilita streaming, `NexaService.generateStream()` devuelve un `ReadableStream` y el adapter usa `async *run()` (generator) en vez de `async run()`. Esto permite que Nexa "escriba" la respuesta en tiempo real. No es blocker — assistant-ui funciona con respuestas completas tambien.

#### Slice D — Enriquecer snapshot (posterior)

Agregar datos operativos reales al `getHomeSnapshot()`:
- Periodo de nomina actual (status, headcount) desde `payroll_periods`
- Facturas pendientes de cobro (aging) desde `fin_income`
- OTD global del mes desde `ico_organization_metrics`
- Correos fallidos desde `email_deliveries`

Este slice no bloquea la reactivacion — se puede hacer despues.

### Orden de ejecucion

1. ~~Slice A (corregir freeze)~~ → **Completado 2026-03-28** (commit `1d4fbd2`)
2. ~~Slice B (hardening Nexa)~~ → **Completado 2026-03-28** (commit `1d4fbd2`)
3. Slice C (navegacion + rollout) → **Pendiente** — requiere validacion manual en staging primero
4. Slice E (assistant-ui) → **Pendiente** — mejora de UX, no blocker
5. Slice D (enriquecer snapshot) → **Pendiente** — iterativo

### Validacion pre-rollout (Slice C)

Antes de habilitar `/home` como landing:
1. Deploy Slice A+B a staging (ya hecho)
2. Navegar a `dev-greenhouse.efeoncepro.com/home` manualmente
3. Verificar: greeting carga, modules grid aparece, NexaPanel no congela
4. Si tasks estan vacias (notifications table vacia), es esperado — no es error
5. Probar chat de Nexa: enviar un mensaje, verificar respuesta
6. Si todo OK: aplicar Slice C (quitar redirect, mover Control Tower, cambiar portalHomePath)

### Decision de navegacion post-reactivacion

| Ruta | Vista | Quien la usa | Cuando |
|------|-------|-------------|--------|
| `/home` | Home Nexa (reactivada) | Todos los internos | Cada dia al entrar |
| `/internal/dashboard` | Control Tower (actual) | Solo admin | Cuando hace onboarding o revisa tenant health |

Control Tower se mueve a la seccion Administracion en el sidebar (junto a Spaces, Usuarios, Roles, Correos).
El sidebar "Torre de control" como item principal del menu desaparece — pasa a ser un hijo mas de Administracion.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `home`

## Follow-ups

- `TASK-119` - Home landing rollout and navigation cutover
- `TASK-110` - Nexa assistant-ui feature adoption
