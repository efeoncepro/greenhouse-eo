# TASK-2085 — Rooms: «Actividad de agentes» con reversa

Contrato de contenido, estados e interacción escrito el 2026-10-31 desde el código de `efeonce-rooms`
(`main@a2d72c0` + rama `claude/rooms-owner-auto-renew`), el
[ADR del carril de agentes](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md) (Accepted) y
[quién ve qué](../../documentation/rooms/quien-ve-que-en-rooms.md).

> **La dirección visual de esta superficie NO está aprobada.** En el canvas de administración
> (`https://claude.ai/artifact/DX8VgavaqqZmHYXRbKVjeL`), la fila «El lado de Efeonce — administrar salas» se pausó el
> 2026-10-31 para rediseñarla con los agentes primero. Ahí sólo existe el artboard «Recorrido · Efeonce y el cliente»
> (mapa de pasos con modo «Qué existe hoy»). No hay artboard de «Actividad de agentes», de la vista por sala, del
> diálogo de reversa ni de «Crear sala». Las regiones de este documento son **estructura de contenido** para diseñar
> esos artboards en el slice 1, no una composición aprobada. `UI ready` sigue en `no` hasta que el operador apruebe
> el canvas y este documento se actualice con el asset aprobado.

## Problema

1. El ADR aceptó que los agentes publican, invitan y dan acceso directo, sin aprobación previa. La seguridad depende
   de que la persona **vea** lo que hizo su agente y lo pueda **deshacer con un clic** (D3, D4). Hoy no existe ninguna
   pantalla para eso: Rooms ni siquiera distingue a la persona del agente.
2. La casa del equipo (`/rooms`) es una lista de salas con «Abrir sala» e «Invitaciones». No hay botón para crear una
   sala (sólo API o CLI) y ningún enlace lleva a la mesa de autoría `/rooms/:roomId/authoring`: hay que escribir la
   dirección.
3. El trabajo diario lo hacen agentes. La casa tiene que contar primero qué hicieron en nombre de quién, y después
   ofrecer las salas.

## Visual Direction Contract

- Estado: **pendiente**. Ninguna dirección aprobada para esta superficie.
- Modo previsto: `source-led`, con el canvas de administración como fuente duradera una vez aprobado.
- Dirección madre vigente: [Rooms — dirección visual V1](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md)
  (canvas «la sala es una órbita», aprobado el 2026-10-29 para la experiencia del cliente y la autoría). Aplica a esta
  superficie lo que es sistema: La órbita (skill `efeonce-graphic-line`), Bricolage para decir, Poppins para explicar y
  operar, tokens de `src/styles/theme.ts`, botones y diálogos de AXIS, estados con forma y texto (nunca semáforo).
- Lo que NO aplica sin decisión nueva: la órbita como gesto. La actividad no mide un recorrido real; una órbita aquí
  sólo entra si el canvas encuentra algo concreto que rodear o medir (regla de §3 de la dirección madre).
- Regla de tipografía del operador (2026-10-31): Bricolage Grotesque en texto de varias líneas **alterna pesos**: la
  frase clave en `--room-weight-bold`, el resto en `--room-weight-light`, mismo tamaño y color. Nunca un bloque
  entero en negrita. Aplica al `h1` de la casa, al `h1` de la vista por sala si ocupa dos líneas, al título del
  estado vacío y a cualquier titular editorial que el canvas agregue. Los títulos de una línea (nombre de sala) no se
  parten.
- Familia de referencia ya implementada: la página `/auth/error` (TASK-2083, aprobada) usa ese contraste de pesos en
  su `h1`; es el precedente directo de la regla.
- Quality profile previsto: `premium`.

## Rutas y superficies

| Ruta | Superficie | Quién llega |
|---|---|---|
| `/rooms` | **Casa del equipo, agentes primero**: actividad global + salas del espacio + «Crear sala» | Persona interna con sesión y acceso a Rooms |
| `/rooms?quien=…&alcance=…&cursor=…` | La misma casa filtrada o paginada (navegación de documento) | Filtros y «Ver más actividad» |
| `/rooms?accion=:actionId` | La casa con una acción enfocada y resaltada | Enlace del aviso a la persona (D3) |
| `/rooms/:roomId/actividad` | **Vista por sala**: la actividad de esa sala con sus atajos | Desde la fila de la sala o desde una entrada |
| `/rooms/:roomId/actividad?accion=:actionId` | Vista por sala con una acción enfocada | Aviso de una acción sobre esa sala |
| `/demo/actividad` | Fixture sintética (cliente ficticio volta) para GVC, sin red | Sólo GVC y revisión de diseño |

Rutas existentes que esta superficie enlaza (no las cambia): `/rooms/:roomId/editions/:editionId` («Ver como
cliente»), `/rooms/:roomId/editions/:editionId/cambios?desde=:baseId` («Qué cambió»),
`/rooms/:roomId/authoring` («Abrir autoría»), `/rooms/:roomId/invitations` («Invitaciones»), `/rooms/context`
(«Cambiar de espacio»).

## Regiones (estructura de contenido, sin composición aprobada)

### Casa del equipo `/rooms`

1. **Encabezado de producto** — `ProductHeader mode="internal"` con `SessionExit` (existente, sin cambio).
2. **Introducción** — ojal «Espacio de trabajo · {espacio}» y «Cambiar de espacio» (lo que hoy está en
   `private-intro`); `h1` en Bricolage con dos pesos: `lead` ligero «Lo que hicieron» + `key` pesado «tus agentes.»;
   una línea en Poppins que dice para qué sirve («Cada acción que llegó al cliente, en nombre de quién y cómo
   deshacerla.»). A la derecha, la acción principal **«Crear sala»**.
3. **Aviso de tope** (sólo si hay un tope vigente en la última hora): franja con el agente, la clase y la hora en que
   se reabre; enlace «Ver lo que alcanzó a hacer» que filtra la actividad.
4. **Actividad** (región dominante):
   - barra de filtros: **alcance** «Llega al cliente» (por defecto: `release` + `access`) / «Todo» (suma `author`);
     **quién** «En mi nombre» (por defecto) / «Todo el equipo» (sólo si el reader lo ofrece al que mira; TASK-2084
     propone exigir `members.manage`);
   - grupos por día («Hoy», «Ayer», fecha en es-CL) con entradas en orden descendente;
   - «Ver más actividad» al final (cursor del reader).
5. **Salas del espacio** (región secundaria): la lista actual, con cada fila enriquecida:
   - título de la sala, estado («Edición publicada» / «Borrador» / «Archivada»), la última acción de un agente sobre
     ella en una línea («Publicó la edición 4 · hace 2 h»);
   - atajos: «Abrir sala», **«Abrir autoría»** (nuevo; sólo con `content.edit`), «Invitaciones» (con
     `access.read`), **«Actividad»** (nuevo);
   - «Ver más salas» con el cursor de `listRooms` que ya existe.

### Vista por sala `/rooms/:roomId/actividad`

1. Migas: «Tus salas» → nombre de la sala.
2. Encabezado de la sala: nombre (Bricolage, una línea), estado y edición vigente; atajos «Ver como cliente»,
   «Abrir autoría», «Invitaciones» y «Qué cambió» (este último sólo si hay edición anterior).
3. Aviso de tope de esa sala, si aplica.
4. Actividad de la sala con los mismos filtros de alcance (el filtro «quién» se conserva).

### Anatomía de una entrada

| Parte | Contenido | Fuente |
|---|---|---|
| Quién | «{Agente} para {Persona}» (D3). Si actuó la persona: sólo su nombre. Si el canal es `cli` y no hay agente identificado: «{Persona} · línea de comandos» | `actor_kind`, `agent_client_id`, `principal`, `channel` del reader |
| Qué | Verbo + objeto en una oración: «publicó la edición 4 de *Llega antes*», «invitó a c•••@volta.cl», «dio acceso de administración a Karo» | Resumen generado por el servidor; la UI no arma frases desde el diff |
| Detalle | Resumen del cambio del servidor: piezas que entran y salen, permisos dados, vigencia | `summary`/diff del reader |
| Cuándo | Hora relativa con `<time datetime>` y hora absoluta en el título accesible | `occurredAt` |
| Canal | Chip neutro «Gateway», «Línea de comandos» o «Navegador» | `channel` |
| Enlaces | «Ver como cliente», «Qué cambió», «Abrir autoría» o «Invitaciones», según la acción | Rutas existentes |
| Reversa | Botón con el verbo de la reversa («Volver a la edición 3», «Revocar invitación», «Quitar acceso»), sólo si el reader la devuelve permitida para quien mira | Descriptor de reversa del reader |
| Estado de reversa | «Revertida por Julio · hace 5 min» con enlace a la entrada de la reversa | Reader |

## Reversa por tipo de acción

La UI muestra el botón **sólo** cuando el reader de TASK-2084 entrega un descriptor de reversa permitido para quien
mira. Nunca deduce la reversa ni compone dos comandos en el navegador.

| Acción del agente | Clase | Reversa ofrecida | Comando (TASK-2084) | Si no hay reversa |
|---|---|---|---|---|
| Publicar la edición N | `release` | «Volver a la edición N−1» | Republicar la edición anterior. Hoy `editions.publish` sólo publica el borrador abierto (`{roomId, expectedRevision}`); TASK-2084 (slice 4) agrega el comando si su Discovery lo confirma [verificar nombre] | Primera edición: «Archivar la sala» (`rooms.archive`) |
| Archivar la sala | `release` | ninguna con un clic (el ADR no define desarchivar) | — | «Cómo corregirlo» con enlace a la sala |
| Invitar / reemitir invitación | `release` | «Revocar invitación» | `invitations.revoke` | Invitación ya vencida o revocada: entrada marcada «Ya no estaba activa» |
| Responder o resolver una pregunta | `release` | ninguna con un clic (D4: nueva respuesta o reapertura) | — | Enlace a la sala en el punto de la pregunta |
| Dar acceso a una sala | `access` | «Quitar acceso» | `access.revoke` | Acceso ya vencido: «Ya no estaba vigente» |
| Dar o renovar acceso interno | `access` | «Quitar acceso interno» | `members.revokeInternal` | Último administrador: el comando lo rechaza y la entrada lo explica |
| Quitar acceso | `access` | ninguna con un clic | — | Enlace a «Invitaciones» o al manual de acceso interno |
| Crear sala, editar borrador | `author` | ninguna (no llega al cliente) | — | «Abrir autoría» |

## Desktop Target

1440 × 900: la actividad es la región dominante y se lee sin scroll hasta la tercera entrada; la región de salas
queda visible en el primer viewport (lateral o debajo, lo decide el canvas). Ancho de lectura de una entrada ≤ 72 ch.
1280 × 800: misma estructura, sin recortar acciones de la entrada.

## Mobile Target

390 × 844: una columna. Arriba la introducción y «Crear sala»; un selector «Actividad | Salas» alterna las dos
regiones sin cambiar de ruta (estado en `?vista=salas`). En cada entrada, la reversa queda visible como botón de
ancho completo debajo del detalle; los enlaces secundarios pasan a una fila que se envuelve. Nada depende de hover.
Sin scroll horizontal; objetivos ≥ 24 px (AXIS ≥ 44 px táctil donde el componente lo da).

## Action Hierarchy

| Lugar | Principal | Secundarias |
|---|---|---|
| Casa | «Crear sala» (sólida, `line="growth"`) | Filtros, «Cambiar de espacio», «Ver más actividad» |
| Entrada `release`/`access` con reversa | La reversa (contorno; la acción es correctiva, no la tarea del día) | «Ver como cliente», «Qué cambió», «Invitaciones» como enlaces de texto |
| Entrada `author` | «Abrir autoría» (enlace) | — |
| Fila de sala | «Abrir sala» | «Abrir autoría», «Invitaciones», «Actividad» |
| Diálogo de reversa | Confirmar con el verbo exacto («Volver a la edición 3») | «Cancelar» |
| Diálogo «Crear sala» | «Crear y abrir autoría» | «Cancelar» |

Una sola acción sólida por viewport: «Crear sala». La reversa es contorno para no competir con la tarea principal,
pero nunca se esconde detrás de un menú.

## Visual Fidelity Mapping

| Elemento | Fuente en código | Regla |
|---|---|---|
| Fondo, tinta, atenuado, líneas | `--room-paper`, `--room-ink`, `--room-muted`, `--room-line`, `--room-rule` (`src/styles/theme.ts`) | Ningún hex en componentes ni en `agent-activity.css` |
| `h1` de la casa | `--room-font-display`, tamaño `--room-display`; `lead` en `--room-weight-light`, `key` en `--room-weight-bold` | Mismo tamaño y color; `text-wrap: balance` |
| Nombre de sala | `--room-font-display`, `--room-subheading`, `--room-weight-medium` | Una línea; no se parte en pesos |
| Oración de la entrada, detalle, filtros, chips | `--room-font-body` (Poppins), `--room-body` / `--room-small` / `--room-caption` | El agente y la persona en `--room-weight-medium`, el resto regular |
| Estado de la entrada («Revertida», «Tope», «Rechazado») | `Badge` de AXIS `tone="neutral"` con icono + texto | Forma y texto; nunca color solo |
| Botones | `Button` de `@efeoncepro/axis-ui-primitives/react`, `line="growth"` | Sólida sólo «Crear sala»; reversa en contorno |
| Diálogos | `Dialog` de AXIS con `returnFocusRef` (patrón de `invitation-management.tsx`) | Foco al título al abrir; vuelve al botón que lo abrió |
| Separadores de día y de entrada | `--room-rule` + `--room-line` (patrón `private-row`) | Sin tarjeta por entrada: lista editorial, no grid de cards |
| Espaciado | múltiplos de `--room-space`, `--room-inset`, `--room-content-gap` | Sin literales |

## Copy Ledger

Copy nuevo en `src/lib/copy/rooms.ts` (es-CL neutro, tuteo, sin voseo), validado con `greenhouse-ux-writing`:

- `AGENT_ACTIVITY_COPY`
  - `eyebrow`, `title: { lead, key }`, `intro`, `changeSpace` (hoy en `INVITATION_COPY.workspace*`; se mueve aquí y
    `INVITATION_COPY` conserva sólo lo de invitaciones);
  - `filters`: `reach` «Llega al cliente», `all` «Todo», `mine` «En mi nombre», `team` «Todo el equipo»,
    `groupLabel` (aria);
  - `day`: `today` «Hoy», `yesterday` «Ayer», `date(fecha)`;
  - `actor(agente, persona)` «{agente} para {persona}», `cliOnly(persona)` «{persona} · línea de comandos»;
  - `channel`: `gateway` «Gateway», `cli` «Línea de comandos», `browser` «Navegador»;
  - `revert`: `republish(n)` «Volver a la edición {n}», `archive` «Archivar la sala», `revokeInvitation` «Revocar
    invitación», `revokeAccess` «Quitar acceso», `revokeInternal` «Quitar acceso interno»;
  - `confirm`: `title(verbo)`, `body` por tipo (qué ve el cliente después), `cancel` «Cancelar», `pending`
    «Revirtiendo…»;
  - `result`: `done` «Listo. Lo revertiste.», `reverted(persona, cuándo)` «Revertida por {persona} · {cuándo}»,
    `alreadyReverted` «Esta acción ya estaba revertida.», `noLongerActive` «Ya no estaba activa: no hubo nada que
    revertir.»;
  - `failure`: `conflict` «Después de esta acción hubo otros cambios en la sala. Revisa qué cambió antes de
    revertir.», `forbidden` «Ya no tienes permiso para revertir esto. Pídeselo a quien administra la sala.»,
    `lastAdmin` «No se puede quitar: es la última persona que administra Rooms.», `uncertain` «No pudimos confirmar
    el resultado. Vuelve a intentarlo: no se duplica.», `unavailable` «No pudimos revertir ahora. Vuelve a
    intentarlo en unos minutos.»;
  - `quota`: `banner(agente, clase, hora)`, `entry(agente, rechazos)` «Rooms frenó {n} acciones más de {agente} en
    esta hora.», `seeWhat` «Ver lo que alcanzó a hacer»;
  - `rejected`: `entry(agente)` «Rooms rechazó un intento de {agente} en tu nombre.», `reason` por motivo (permiso
    vencido o revocado, sin la identidad del gateway, permiso no consentido, tu acceso a Rooms venció), `help`;
  - `empty`: `title: { lead, key }` «Todavía no hay» + «acciones de agentes.», `body`; `emptyRoom`;
    `emptyFiltered` «Nada con este filtro.» + `clearFilter`;
  - `loading` «Cargando actividad…», `error` «No pudimos cargar la actividad.», `retry` «Reintentar»,
    `loadMore` «Ver más actividad»;
  - `links`: `viewAsClient` «Ver como cliente», `whatChanged` «Qué cambió», `openAuthoring` «Abrir autoría»,
    `invitations` «Invitaciones», `activity` «Actividad», `howToFix` «Cómo corregirlo»;
  - `focused` «Esta es la acción del aviso.», `focusedMissing` «Esa acción no está disponible para ti.».
- `ROOMS_HOME_COPY.createRoom`: `cta` «Crear sala», `title`, `fields` (nombre de la sala, marca del cliente,
  perfiles, origen del contenido, referencia de procedencia), `submit` «Crear y abrir autoría», `pending`
  «Creando…», `error`, `conflict`.

## State Copy

| Estado | Copy visible | Comportamiento y recuperación |
|---|---|---|
| ready | Grupos por día con entradas «{Agente} para {Persona} publicó la edición 4 de *Llega antes*», detalle, enlaces y reversa | Cada entrada es independiente; revertir una no recarga la página entera |
| loading | `loading.tsx` de `/rooms` con el esqueleto de tres entradas y «Cargando actividad…» en `role="status"` | Render de servidor; el esqueleto no simula un porcentaje ni usa la órbita |
| empty | «Todavía no hay **acciones de agentes.**» (dos pesos) + «Cuando un agente publique, invite o dé acceso en tu nombre, aparecerá aquí con la forma de deshacerlo.»; la región de salas sigue completa | Sin salas además: el estado vacío ofrece «Crear sala» |
| empty filtrado | «Nada con este filtro.» + «Ver todo» | Vuelve al filtro por defecto |
| partial | El reader responde pero sin `team` para quien mira: el filtro «Todo el equipo» no aparece. Una entrada sin resumen del servidor muestra sólo quién, qué y cuándo | Nunca se inventa el resumen |
| error | «No pudimos cargar la actividad.» + «Reintentar»; la región de salas se renderiza si `listRooms` respondió | Fallas independientes por región |
| denied | Sin sesión interna: `AccessState internal` (existente). Deep link a una acción ajena: «Esa acción no está disponible para ti.» sin revelar sala ni actor | No distingue «no existe» de «no puedes verla» |
| quota | Franja «{Agente} llegó al tope de invitaciones de esta hora. Las siguientes se rechazan hasta las 15:00.» + entrada «Rooms frenó 2 acciones más de {agente} en esta hora.» (conteo de `agent_quota_exceeded` en `rooms.agent_lane_counters`) | «Ver lo que alcanzó a hacer» filtra por ese agente y esa ventana; sin botón para subir el tope |
| rejected | Entrada «Rooms rechazó un intento de {agente} en tu nombre.» + motivo + qué hacer | Sólo cuando el rechazo se puede atribuir a la persona (depende de TASK-2087); sin entrada en otro caso |
| pending reversa | Botón «Revirtiendo…» deshabilitado; el resto de la entrada sigue legible | Clave de idempotencia fija para ese intento |
| reverted | Badge «Revertida» con icono + «Revertida por {persona} · hace 5 min» y enlace a la entrada de la reversa | Si la reversa la hizo un agente, aparece arriba como entrada nueva; si la hizo la persona, aparece en «Todo» sólo si el reader incluye acciones de personas† |
| failed reversa | Mensaje bajo el botón según el motivo (`conflict`, `forbidden`, `lastAdmin`, `uncertain`, `unavailable`); en `conflict`, enlace «Qué cambió» | `uncertain` reintenta con la misma clave; `conflict` y `forbidden` no ofrecen reintento |
| sin reversa | «Cómo corregirlo» con el enlace correcto | Nunca un botón deshabilitado sin explicación |

## Accessibility Contract

- `h1` único por página; cada grupo de día es un `h2`; cada entrada es un `article` con `aria-labelledby` a su
  oración; la lista es `ol` (orden temporal).
- Hora relativa en `<time datetime>` con la hora absoluta en `title` y en el texto accesible.
- Filtros como enlaces con `aria-current="true"` en el activo (navegación de documento, igual que la paginación
  actual), agrupados en `nav aria-label`.
- Diálogo de reversa: foco al título al abrir; Escape y «Cancelar» cierran sin efecto; el foco vuelve al botón que lo
  abrió. Tras revertir, el foco va al texto «Revertida por…» de la misma entrada y el resultado se anuncia en
  `role="status"`.
- `?accion=` enfoca la entrada (`tabIndex=-1`) y anuncia «Esta es la acción del aviso.»; el resaltado no depende del
  color (borde + texto).
- Estados con forma y texto, nunca sólo color. Objetivos ≥ 24 px. Movimiento reducido: sin desplazamientos animados
  al enfocar una acción.

## Contrato de datos consumido (TASK-2084)

[TASK-2084](../../tasks/to-do/TASK-2084-rooms-agent-attribution-reversal-quotas.md) declara: reader
`agents.activity` (nombre final en su Discovery) con sala, operación, momento, `agent_client_id`, canal y descriptor
de reversa; DTO browser-safe en `src/domain/agent-lane-contracts.ts`; avisos en `rooms.agent_action_notices` (con
`acknowledged_at`); contadores por hora en `rooms.agent_lane_counters` (`quota_hit`, y `bearer_rejected` reservado
para TASK-2087); la vista de toda la organización exige `members.manage` (decisión a confirmar en su Discovery).

Lo que esta superficie necesita por entrada. Lo marcado con † no está declarado en TASK-2084 y se le pide como
`## Delta` al tomar esta task [verificar]:

- `actionId`, `occurredAt`, `roomId`, nombre de sala y edición afectada†;
- `actor_kind` (`person|agent`), `agent_client_id` con nombre legible del agente†, persona (`principal_id` con
  nombre†) y `channel` (`browser|cli|gateway`);
- `operation` y clase (`author|release|access`) según la clasificación D2 (las acciones `author` en el reader†);
- resumen o diff generado por el servidor†, con los datos del invitado ya enmascarados según lo que puede ver quien
  mira;
- descriptor de reversa: comando, entrada, si está permitida para quien mira y por qué no†;
- estado de reversa (quién, cuándo, `actionId` de la reversa)†;
- topes de la última hora desde `rooms.agent_lane_counters` (agente, clase, conteo de rechazos, hora de reapertura)
  y, con TASK-2087, rechazos de bearer atribuibles a la persona;
- cursor; alcance `mine|team` ofrecido a quien mira.

## Implementation Mapping

| Pieza | Archivo |
|---|---|
| Casa agentes primero | `src/app/rooms/page.tsx` (reemplaza la lista actual; conserva `listRooms`, el cursor y el `AccessState`) |
| Vista por sala | `src/app/rooms/[roomId]/actividad/page.tsx` (nueva) |
| Fixture GVC | `src/app/demo/actividad/page.tsx` + fixture sintética volta |
| Feed, entrada, filtros, aviso de tope | `src/components/agent-activity/activity-feed.tsx`, `activity-entry.tsx`, `activity-filters.tsx`, `quota-banner.tsx` |
| Diálogo de reversa | `src/components/agent-activity/reversal-dialog.tsx` (cliente; `POST /api/v1/commands` con `Idempotency-Key` y `expectedRevision` del descriptor) |
| Región de salas con atajos | `src/components/agent-activity/rooms-rail.tsx` |
| «Crear sala» | `src/components/agent-activity/create-room-dialog.tsx` (`rooms.create`; la base del manifiesto sale de `blankManifest` de `src/domain/content-validation.ts` [verificar si `rooms.create` acepta una sala vacía]) |
| Estilos | `src/styles/agent-activity.css` (sólo tokens de `theme.ts`) |
| Copy | `src/lib/copy/rooms.ts` → `AGENT_ACTIVITY_COPY`, `ROOMS_HOME_COPY` |
| DTO del navegador | `src/domain/agent-lane-contracts.ts` de TASK-2084 (DTO de actividad y descriptores de reversa) |
| Reader | `agents.activity` en `src/server/agents/**` (TASK-2084), leído por las páginas de servidor |

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/rooms-agent-activity.scenario.ts` (Greenhouse).
- Ruta: `/demo/actividad` (fixture sintética volta, anónima, sin red; las reversas cambian estado local).
- Quality profile: `premium`.
- Viewports: 1440 × 900, 1280 × 800 y 390 × 844.
- Marcas: `home-ready`, `filter-all`, `reversal-confirm`, `reversal-done`, `reversal-conflict`, `quota-banner`,
  `rejected-entry`, `empty`, `room-activity`, `create-room-dialog`; en móvil además `mobile-rooms`.
- Required `data-capture` markers: `agent-activity`, `agent-activity-entry`, `agent-activity-reversal`,
  `rooms-rail`, `create-room`.
- Sondas de teclado: `reversal-dialog-escape` (abrir, Escape, el foco vuelve al botón) y
  `reversal-confirm-focus` (confirmar, el foco queda en «Revertida por…»).
- Assertions: `h1` visible, al menos una entrada con reversa, sin error boundary, sin scroll horizontal en los tres
  anchos.
- Reduced motion: `reducedMotionCheck`.
- Review dossier: `.captures/<ISO>_rooms-agent-activity/index.html`; scorecard
  `docs/ui/reviews/TASK-2085-rooms-agent-activity-surface.scorecard.json`.
- Baseline decision / surface ID: `rooms.agent-activity`; sin baseline de píxeles hasta la aprobación del canvas.

## Design Decision Log

- 2026-10-31 — **Sin dirección aprobada.** La fila de administración del canvas se pausó para rediseñarla con los
  agentes primero; sólo existe el artboard «Recorrido». El slice 1 diseña y pide aprobación antes de cualquier JSX.
- 2026-10-31 — La casa del equipo es la actividad, no la lista de salas: el trabajo diario lo hacen agentes y la
  seguridad del ADR depende de ver y deshacer (D3, D4).
- 2026-10-31 — Filtro por defecto «Llega al cliente» + «En mi nombre»: es exactamente lo que el aviso de D3 le
  promete a la persona; «Todo» y «Todo el equipo» quedan a un clic.
- 2026-10-31 — La reversa sale del reader, nunca del navegador. Si no hay descriptor, no hay botón y se explica cómo
  corregirlo.
- 2026-10-31 — Lista editorial con separadores (patrón `private-row`), no una tarjeta por entrada: evita el grid de
  cards que la dirección madre rechaza.
- Alternativas consideradas: (a) pantalla de actividad aparte y `/rooms` sin cambios — descartada, la casa seguiría
  sin contar lo que pasó; (b) actividad sólo por sala — descartada, el aviso de un agente que actuó en tres salas
  obligaría a abrir tres páginas; (c) bandeja de aprobación — descartada por el ADR (sin aprobación previa).
- Reuse / extend / new: reusa `ProductHeader`, `AccessState`, `SessionExit`, `Badge`, `Button` y `Dialog` de AXIS;
  componentes de página nuevos en `src/components/agent-activity/`; sin primitive nueva.
- Riesgos abiertos: republicar una edición anterior aún no es un comando; atribución de rechazos depende de
  TASK-2087; si `rooms.create` no acepta una sala vacía, «Crear sala» necesita un comando nuevo (follow-up).
