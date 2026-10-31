# TASK-2085 — Flujo de «Actividad de agentes», reversa y navegación del equipo

Contrato de navegación escrito el 2026-10-31 desde el código de `efeonce-rooms` (`src/app/rooms/**`,
`src/components/authoring/*`, `src/components/invitations/invitation-management.tsx`) y el
[ADR del carril de agentes](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md). La composición visual no
está aprobada (ver [wireframe](../wireframes/TASK-2085-rooms-agent-activity-surface.md)); los nodos, transiciones y
estados de este documento sí son el contrato que el canvas debe respetar.

## Flujo maestro del programa

**No existe un flujo maestro de EPIC-052 en `docs/ui/flows/`.** Las tasks de Rooms lo declaran ausente
([TASK-2059](TASK-2059-rooms-first-experience-flow.md), [TASK-2068](TASK-2068-rooms-invitation-and-guest-experience-flow.md),
[TASK-2071](TASK-2071-rooms-private-image-authoring-and-viewer-flow.md)). El documento
[rooms-v1.md](rooms-v1.md) es un flujo de programa del 2026-10-07 en estado **Proposed**, anterior al canvas aprobado
y al carril de agentes: describe autoría → entrega, explorar y presentar, pero no la casa del equipo ni la reversa.

Nodos entre superficies que esta task toca y que el flujo maestro deberá unir:

| Nodo | Superficie | Task dueña | Relación con esta task |
|---|---|---|---|
| Aviso a la persona | Correo/Teams y actividad de Rooms (canal por definir) | TASK-2084 | Su enlace aterriza en `?accion=:actionId` de esta superficie |
| **Actividad de agentes (global)** | `/rooms` | **TASK-2085** | Casa del equipo |
| **Actividad por sala** | `/rooms/:roomId/actividad` | **TASK-2085** | Vista por sala |
| La sala como cliente | `/rooms/:roomId/editions/:editionId` | TASK-2059 | «Ver como cliente» desde una entrada o la fila |
| Mesa de autoría | `/rooms/:roomId/authoring` | TASK-2071 | «Abrir autoría» (hoy sin ningún enlace) y destino de «Crear sala» |
| Invitaciones | `/rooms/:roomId/invitations` | TASK-2068 / TASK-2080 | Desde una entrada de invitación o la fila |
| «Qué cambió» | `/rooms/:roomId/editions/:editionId/cambios?desde=:baseId` | TASK-2071 | Desde una entrada de publicación y desde el conflicto de reversa |
| Acceso interno | `members.*` (sólo API/CLI hoy) | TASK-2082 | Entradas de `access` y su reversa `members.revokeInternal` |
| Error de login | `/auth/error` | TASK-2083 | Antes de llegar a la casa, si el acceso falla |
| Rechazo del bearer | Señal `rooms.agent.bearer_rejected` | TASK-2087 | Entrada «rechazado» cuando se puede atribuir |

Follow-up: crear `docs/ui/flows/EPIC-052-rooms-UI-FLOW.md` con estos nodos y los de los recorridos del cliente.

## Puntos de entrada

| Desde | Destino | Condición |
|---|---|---|
| Login exitoso (`returnTo=/rooms`) | `/rooms` | Sesión interna con acceso a Rooms |
| Aviso de una acción `release`/`access` de un agente | `/rooms?accion=:actionId` o `/rooms/:roomId/actividad?accion=:actionId` | La persona del aviso o alguien que puede ver esa sala |
| Fila de una sala → «Actividad» | `/rooms/:roomId/actividad` | Sesión interna |
| Entrada → nombre de la sala | `/rooms/:roomId/actividad` | Sesión interna |
| `/rooms/:roomId` (redirección existente) | `/rooms/:roomId/editions/:editionId` | Sin cambio en esta task |
| URL directa | `/demo/actividad` | Sólo fixture para GVC |

## Nodos y transiciones

| Nodo | Entrada | Salida |
|---|---|---|
| Casa | Login, migas, logo | Filtro (`?alcance=`, `?quien=`), «Ver más actividad» (`?cursor=`), «Crear sala», atajos de una fila, enlaces de una entrada, reversa |
| Vista por sala | Fila o entrada | Migas a la casa, «Ver como cliente», «Abrir autoría», «Invitaciones», «Qué cambió», reversa |
| Entrada enfocada | `?accion=` | La entrada recibe foco y resaltado; el resto del feed se comporta igual |
| Diálogo de reversa | Botón de reversa de una entrada | «Cancelar»/Escape → la entrada sin cambios; confirmar → pending → resultado en la entrada |
| Diálogo «Crear sala» | «Crear sala» | «Cancelar»/Escape → casa; crear → `/rooms/:roomId/authoring` (navegación de documento) |
| Aviso de tope | Franja de la casa o de la sala | «Ver lo que alcanzó a hacer» → `?quien=…&agente=:clientId&desde=:inicioVentana` |

Filtros, paginación y foco por acción son **navegación de documento** con query params (como hoy en `/rooms`, por
el `eslint-disable` de `@next/next/no-html-link-for-pages`: la autoridad privada se revalida en el servidor sin
snapshots del router). El selector móvil «Actividad | Salas» usa `?vista=salas` con la misma regla.

## Secuencia de la reversa

```mermaid
sequenceDiagram
  participant P as Persona interna
  participant UI as Entrada + diálogo
  participant API as POST /api/v1/commands
  participant R as Reader de actividad (TASK-2084)
  P->>UI: «Volver a la edición 3»
  UI->>UI: abre Dialog, foco al título, muestra qué verá el cliente
  P->>UI: Confirmar
  UI->>API: comando del descriptor + expectedRevision + Idempotency-Key del intento
  alt ok
    API-->>UI: 200 con la acción de reversa
    UI->>UI: entrada en «Revertida por…», role=status, foco al estado
    UI->>R: router.refresh() (la reversa aparece arriba como entrada nueva)
  else conflict (409)
    API-->>UI: conflict
    UI->>UI: mensaje + enlace «Qué cambió»; sin reintento
  else ya revertida / ya no activa
    API-->>UI: resultado idempotente
    UI->>UI: estado final sin error
  else incierto (red o 5xx)
    API-->>UI: sin respuesta confiable
    UI->>UI: «No pudimos confirmar…»; reintento con la MISMA clave
  end
```

Reglas:

- La entrada del comando sale del descriptor del reader. La UI no arma la entrada ni encadena comandos (por ejemplo,
  `editions.reopen` + `editions.publish` para republicar no se compone en el navegador; lo resuelve TASK-2084).
- Un intento = una `Idempotency-Key`; reintentar después de un resultado incierto reutiliza la clave. Cerrar el
  diálogo descarta la clave.
- Un agente también puede revertir (D4); la entrada de la reversa muestra quién lo hizo con la misma anatomía.
- Mientras el comando está pendiente, el diálogo no se cierra con Escape ni click-away (mismo criterio que `busy` en
  `invitation-management.tsx`).

## Mapa de lectura y comandos (Full API Parity)

Todo lo que esta pantalla hace existe como contrato gobernado; la pantalla no agrega lógica de negocio.

| Acción visible | Contrato | Dueño |
|---|---|---|
| Ver la actividad global, por sala o enfocada | Reader `agents.activity` (nombre final en la Discovery de TASK-2084) | TASK-2084 |
| Ver topes de la última hora | Contadores `quota_hit` (`rooms.agent_lane_counters`) expuestos por el mismo reader [verificar] | TASK-2084 |
| Revertir una publicación | Comando de republicar la edición anterior (slice 4 de TASK-2084) [verificar nombre], o `rooms.archive` | TASK-2084 / existente |
| Revocar una invitación | `invitations.revoke` | Existente |
| Quitar acceso a una sala | `access.revoke` | Existente |
| Quitar acceso interno | `members.revokeInternal` | TASK-2082 (existente) |
| Crear sala | `rooms.create` | Existente |
| Listar salas | `listRooms` (reader del servidor) | Existente |

Cada acción tiene el mismo camino para un agente por CLI, MCP local y, después de TASK-2088, el gateway.

## Estados de error, vacío y permiso

| Situación | Respuesta |
|---|---|
| Sin sesión interna | `AccessState internal` (existente) |
| `context_required` | Redirección a `/rooms/context` (existente) |
| Reader de actividad falla, salas responden | Mensaje de error con «Reintentar» en la región de actividad; salas completas |
| `listRooms` falla, actividad responde | Actividad completa; la región de salas muestra su propio error |
| Ambos fallan | `AccessState internal` con el mensaje de carga actual |
| `?accion=` de una acción que no existe o no se puede ver | «Esa acción no está disponible para ti.» sin revelar nada; feed normal |
| `/rooms/:roomId/actividad` de una sala ajena | `AccessState` (igual que `/rooms/:roomId`) |
| Reversa sin permiso para quien mira | Sin botón; «Pídeselo a quien administra la sala» |
| «Crear sala» falla | Mensaje en el diálogo; los campos se conservan |

## Foco y retorno

- Abrir un diálogo: foco al título. Cerrar sin efecto: foco al botón que lo abrió (`returnFocusRef`).
- Confirmar una reversa: foco al texto de estado de la misma entrada.
- Volver desde «Ver como cliente», autoría o «Qué cambió»: navegación de documento; el navegador restaura el scroll
  y los query params de la casa conservan el filtro.
- `?accion=` enfoca la entrada sin desplazamiento animado cuando hay movimiento reducido.

## GVC Scenario Plan

- `rooms-agent-activity` sobre `/demo/actividad`: casa, filtro «Todo», abrir y cancelar reversa (sonda Escape),
  confirmar reversa, conflicto, tope, rechazo, vacío, vista por sala, «Crear sala»; viewports 1440 × 900,
  1280 × 800 y 390 × 844; repetir con movimiento reducido.
- Recorrido real en local contra la integración de Rooms, cuando TASK-2084 exista: un agente por CLI publica e invita,
  la persona ve ambas entradas, revierte la invitación, y la invitación revocada deja de abrir la sala.

## Design Decision Log

- 2026-10-31 — La casa y la vista por sala comparten un solo componente de feed; la sala sólo fija el filtro de sala.
- 2026-10-31 — Filtros y foco por query params con navegación de documento, igual que la paginación existente de
  `/rooms`.
- 2026-10-31 — La reversa confirma siempre en diálogo, con lo que verá el cliente después; nunca es un clic sin
  confirmación, aunque el ADR la llame «un clic» (un clic para empezar, uno para confirmar).
- 2026-10-31 — «Crear sala» lleva directo a la mesa de autoría: crear sin contenido no tiene otro destino útil.
- 2026-10-31 — Sin flujo maestro de EPIC-052: los nodos cruzados quedan listados arriba hasta que exista.
