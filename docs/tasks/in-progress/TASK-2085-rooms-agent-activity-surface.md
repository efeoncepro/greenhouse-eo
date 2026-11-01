# TASK-2085 — Rooms: pantalla «Actividad de agentes» con reversa

## Delta 2026-10-31 — propuesta del slice 1 en el canvas (aprobada 2026-10-31)

- Canvas `https://claude.ai/artifact/DX8VgavaqqZmHYXRbKVjeL`, fila «El lado de Efeonce — lo que hicieron tus agentes»:
  artboards `Actividad.dc.html` (casa 1440 × 900, con vista por sala desde la lista de salas, filtros, tope, rechazo,
  aviso enfocado y diálogo de reversa), `CrearSala.dc.html` (pedírselo al agente o crearla a mano) y
  `ActividadMovil.dc.html` (390 × 844, selector «Actividad | Salas» y hoja de confirmación). Se retiraron las entradas
  `Salas.dc.html` e `Invitar.dc.html`, que no tenían archivo.
- Concepto propuesto: **el umbral**. Una línea vertical separa «tu mesa» de «ya salió de tu mesa» (banda oscura).
  Cada acción `release`/`access` cruza esa línea con un hilo y un punto del otro lado; deshacer recoge el hilo y deja
  el punto hueco; un tope o un rechazo choca contra el umbral. Las acciones `author` se quedan del lado de la mesa.
- Agrega movimiento propio (gramática en la nota «Motion — el umbral» del canvas). Si el operador lo aprueba, se crea
  `docs/ui/motion/TASK-2085-rooms-agent-activity-surface-motion.md` y `Motion` deja de ser `none`.
- **Aprobado por el operador el 2026-10-31** («Bien, aprobadas»). Motion en `docs/ui/motion/TASK-2085-rooms-agent-activity-surface-motion.md`.

## Delta 2026-10-31 — nombres finales de TASK-2084 (implementada en local)

- Reader `agents.activity` (`GET /api/v1/agents/activity?organizationId&scope=self|organization&limit&cursor`, SDK
  `agentActivity`). Cada item trae: `operation`, `scope` (clase), `roomId`, `personId`, `agentClientId`, `channel`,
  `summary` (generado por el servidor), `noticeId`, `acknowledgedAt` y `reversal` `{ operation, payload, state:
  available|done|unavailable, reason }`.
- Comando `agents.acknowledgeNotice { noticeId }`: solo la persona; un agente recibe `forbidden`.
- La reversa de publicar es `editions.republish` (existe). Si ya hay una edición más reciente, `state: unavailable`
  con motivo.
- Los contadores de cuota **no** salen por el reader; están en `pnpm access:health` (`agentLane`).
- Nombres visibles de agente y persona: hoy el reader entrega `agentClientId` y `personId`, sin nombres legibles.
  Resolverlo en esta task o en un delta de TASK-2084.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2085-rooms-agent-activity-surface.md`
- Flow: `docs/ui/flows/TASK-2085-rooms-agent-activity-surface-flow.md`
- Motion: `docs/ui/motion/TASK-2085-rooms-agent-activity-surface-motion.md`
- Backend impact: `none`
- Epic: `EPIC-052`
- Status real: `En producción 2026-10-31 (autorizado: «Ok despliega»): PR efeoncepro/efeonce-rooms#8 mergeado a main@21b10a9, deploy dpl_J84WwdMnotLTQkPwvc3oG5B6kaSV, alias efeonce-rooms.vercel.app reasignado. Verificado: /rooms sin sesión → Efeonce ID «Entra a Rooms» (redirect por streaming RSC, no 307 de servidor), /demo/actividad 200 con el umbral, /api/auth/session 401. Falta: primer login real del operador con la casa nueva, redirect 307 en servidor, nombre legible del espacio (no existe en la base), campos del reader (topes/rechazos, filtro por sala, edición, invitado enmascarado, detalle), pnpm fe:capture + scorecard.`
- Rank: `después de TASK-2084; el slice 1 (canvas) puede empezar antes`
- Domain: `platform`
- Blocked by: `TASK-2084 (slices 2 a 6; el slice 1 de canvas no depende de ella)`
- Branch: `efeonce-rooms: rama propia sin push (main = producción); Greenhouse: docs y escenario GVC en develop; sin worktrees`

## Summary

La casa del equipo en Rooms (`/rooms`) pasa a contar primero lo que hicieron los agentes, en nombre de quién: crear,
armar, publicar, invitar y dar acceso, global y por sala. Cada acción que llega al cliente muestra quién (agente y
persona), qué, cuándo, un resumen generado por el servidor y su reversa con confirmación. Cierra además dos huecos de
la casa actual: no hay botón «Crear sala» ni enlace a la mesa de autoría.

## Why This Task Exists

- El [ADR del carril de agentes](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md) (Accepted
  2026-10-31) deja que un agente publique, invite y dé acceso sin aprobación previa. El riesgo aceptado se contiene
  con atribución, aviso a la persona y reversa con un clic (D3, D4). TASK-2084 construye esos contratos; sin una
  pantalla, la persona no tiene dónde ver ni deshacer lo que hizo su agente, y el aviso no tiene destino.
- La casa actual (`efeonce-rooms/src/app/rooms/page.tsx`) lista salas con «Abrir sala» e «Invitaciones». Crear una
  sala sólo se puede por API o CLI y la mesa `/rooms/:roomId/authoring` existe pero ningún enlace lleva a ella
  ([quién ve qué](../../documentation/rooms/quien-ve-que-en-rooms.md)).
- Las pantallas de administración del canvas se pausaron el 2026-10-31 para rediseñarlas con los agentes primero. Esta
  task es ese rediseño y su implementación.

## Goal

- Una persona interna ve, en su casa de Rooms, cada acción `release` y `access` que un agente hizo en su nombre, con
  quién, qué, cuándo, el resumen del servidor y la forma de deshacerla.
- Revertir es un clic más una confirmación, con resultado claro en todos los casos (hecho, ya revertida, conflicto,
  sin permiso, incierto).
- Desde la casa se crea una sala y se llega a la autoría, a la sala como cliente, a invitaciones y a «Qué cambió».
- Nada de JSX antes de que el operador apruebe el diseño en el canvas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D2 clases, D3 actor y aviso, D4 reversa, D7
  cuotas y señales)
- `docs/architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md` (`members.*`, guarda del último
  administrador)
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md` (`POST /api/v1/commands`, idempotencia,
  `expectedRevision`)
- `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`

Reglas obligatorias:

- La pantalla es cliente de los contratos de TASK-2084 y de los comandos existentes; no agrega lógica de negocio. La
  reversa la describe el reader: si no hay descriptor, no hay botón.
- Nunca componer dos comandos en el navegador (por ejemplo `editions.reopen` + `editions.publish` para republicar).
- Los datos del invitado se muestran tal como el reader los entrega, enmascarados según quien mira.
- Bricolage en texto de varias líneas alterna pesos (frase clave pesada, el resto ligero); nunca un bloque entero en
  negrita. Regla del operador del 2026-10-31.
- Dirección visual aprobada el 2026-10-31 («el umbral», canvas de Rooms); implementar desde los artboards y el contrato de motion, sin reinventar.

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`
- `.claude/skills/efeonce-graphic-line/SKILL.md` (La órbita)
- `docs/documentation/rooms/quien-ve-que-en-rooms.md`
- `docs/ui/flows/TASK-2071-rooms-private-image-authoring-and-viewer-flow.md` (autoría y «Qué cambió»)
- `docs/ui/wireframes/TASK-2083-rooms-access-issue-page.md` (precedente del contraste de pesos)

## Dependencies & Impact

### Depends on

- TASK-2084 (`docs/tasks/in-progress/TASK-2084-rooms-agent-attribution-reversal-quotas.md`): columnas de actor, reader
  `agents.activity` (nombre final en su Discovery), DTO y descriptores de reversa en
  `src/domain/agent-lane-contracts.ts`, avisos `rooms.agent_action_notices`, contadores `rooms.agent_lane_counters`,
  error `agent_quota_exceeded` y señales `rooms.agent.quota_hit` y `rooms.agent.release_actions`.
- Campos que esta pantalla necesita y TASK-2084 no declara todavía (resumen del servidor, nombre legible del agente y
  de la persona, estado de reversa, acciones `author`); se le piden como `## Delta` al tomar esta task [verificar].
  Lista completa en el wireframe, sección «Contrato de datos consumido».
- Comando para republicar una edición anterior: hoy `editions.publish` sólo publica el borrador abierto
  (`efeonce-rooms/src/domain/persistence-contracts.ts`); TASK-2084 lo agrega en su slice 4 si su Discovery lo
  confirma [verificar nombre].
- TASK-2087 para que existan rechazos de bearer atribuibles a una persona (estado `rejected`).
- Canvas de administración `https://claude.ai/artifact/DX8VgavaqqZmHYXRbKVjeL` (fila pausada).

### Blocks / Impacts

- TASK-2084: el aviso a la persona necesita un destino; esta pantalla es `?accion=:actionId`.
- TASK-2071: «Abrir autoría» y «Crear sala» se vuelven las entradas visibles de la mesa.
- TASK-2091: el eval de oficio puede usar la actividad para revisar lo que el agente publicó.
- `docs/documentation/rooms/quien-ve-que-en-rooms.md`: la tabla «Lo que todavía falta en la interfaz» cambia al
  cerrar.

### Files owned

- `../efeonce-rooms/src/app/rooms/page.tsx`
- `../efeonce-rooms/src/app/rooms/[roomId]/actividad/page.tsx`
- `../efeonce-rooms/src/app/demo/actividad/page.tsx`
- `../efeonce-rooms/src/components/agent-activity/*`
- `../efeonce-rooms/src/styles/agent-activity.css`
- `../efeonce-rooms/src/lib/copy/rooms.ts` (`AGENT_ACTIVITY_COPY`, `ROOMS_HOME_COPY`)
- `scripts/frontend/scenarios/rooms-agent-activity.scenario.ts`
- `docs/ui/wireframes/TASK-2085-rooms-agent-activity-surface.md`
- `docs/ui/flows/TASK-2085-rooms-agent-activity-surface-flow.md`
- `docs/ui/reviews/TASK-2085-rooms-agent-activity-surface.scorecard.json`

## Current Repo State

### Already exists

- `efeonce-rooms/src/app/rooms/page.tsx`: lista de salas por espacio con `listRooms`, cursor, «Abrir sala» e
  «Invitaciones» (con `access.read`); copy en `INVITATION_COPY.workspace*` de `src/lib/copy/invitations.ts`.
- Rutas que la pantalla enlaza: `/rooms/:roomId/editions/:editionId`, `.../cambios`, `/rooms/:roomId/authoring`,
  `/rooms/:roomId/invitations`, `/rooms/context`.
- Comandos de reversa existentes: `invitations.revoke`, `access.revoke`, `members.revokeInternal`, `rooms.archive`;
  `rooms.create` y `blankManifest` (`src/domain/content-validation.ts`).
- Patrones a reusar: `ProductHeader`, `AccessState`, `SessionExit`; `Dialog` de AXIS con `returnFocusRef` en
  `src/components/invitations/invitation-management.tsx`; tostada `role="status"` de la mesa de autoría.
- Tokens en `src/styles/theme.ts` (`--room-weight-light`, `--room-weight-bold`, `--room-font-display`, etc.).
- Escenarios GVC de Rooms en `scripts/frontend/scenarios/rooms-*.scenario.ts` con rutas `/demo/*`.
- Canvas: sólo el artboard «Recorrido · Efeonce y el cliente» en la fila de administración.

### Gap

- Ninguna pantalla muestra acciones de agentes ni ofrece reversa; Rooms aún no distingue persona de agente.
- No hay botón para crear una sala ni enlace a la mesa de autoría.
- No hay dirección visual aprobada para la administración agentes primero.
- No existe flujo maestro de EPIC-052 en `docs/ui/flows/`.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-rooms` (`src/app/rooms`, `src/components/agent-activity`), runtime Next.js de Rooms en Vercel
- Future candidate home: `remain-shared`
- Boundary: consume el reader de actividad y los comandos de reversa de TASK-2084, `rooms.create` y `listRooms`; la UI no es dueña de ninguna regla
- Server/browser split: las páginas son Server Components que leen readers del servidor; el feed y los diálogos son Client Components que reciben un DTO browser-safe del dominio y escriben sólo por `POST /api/v1/commands`
- Build impact: dos rutas dinámicas nuevas y una ruta de demo; sin dependencias nuevas
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona interna de Efeonce con acceso a Rooms (operador, administrador de salas); en segundo plano,
  quien recibió el aviso de una acción de su agente.
- Momento del flujo: al entrar a Rooms cada día y al abrir el enlace del aviso.
- Resultado perceptible esperado: en una mirada sabe qué hizo cada agente en su nombre, en qué sala, si llegó al
  cliente, y lo deshace en dos clics si estuvo mal.
- Friccion que debe reducir: leer logs o preguntarle al agente qué hizo; revertir por CLI; escribir a mano la URL de
  autoría; crear salas sólo por API.
- No-goals UX: aprobar antes de publicar (descartado por el ADR); administrar cuotas o consentimientos; la consola de
  presentación y las señales del cliente.

### Surface & system decision

- Surface: casa `/rooms` agentes primero y vista por sala `/rooms/:roomId/actividad`, en el runtime de Rooms.
- Nav placement: `none` — no agrega destinos al portal Greenhouse; dentro de Rooms se llega desde la casa y desde la
  fila de cada sala.
- Composition Shell: `no aplica` — runtime de Rooms, no portal Greenhouse.
- Primitive decision: `reuse` — `Button`, `Badge` y `Dialog` de AXIS; `ProductHeader`, `AccessState` y `SessionExit`
  de Rooms; componentes de página nuevos sin primitive nueva.
- Adaptive density / The Seam: `no aplica` — lista editorial de una columna con región secundaria.
- Floating/Sidecar/Dialog decision: `Dialog` de AXIS para confirmar la reversa y para «Crear sala»; sin sidecar.
- Copy source: `src/lib/copy/rooms.ts` → `AGENT_ACTIVITY_COPY`, `ROOMS_HOME_COPY`.
- Access impact: `none` — usa las capacidades existentes (`activity.read`, `access.read`, `access.manage`,
  `content.edit`, `rooms.create`, `members.manage`) evaluadas en el servidor.

### State inventory

- Default: feed agrupado por día con entradas `release`/`access` «En mi nombre» y región de salas.
- Loading: esqueleto de tres entradas con «Cargando actividad…» en `role="status"`.
- Empty: «Todavía no hay **acciones de agentes.**» con dos pesos; salas completas; sin salas, ofrece «Crear sala».
- Error: error por región (actividad o salas) con «Reintentar»; ambas fallan → `AccessState internal`.
- Degraded / partial: sin alcance `team` el filtro no aparece; entrada sin resumen muestra quién, qué y cuándo.
- Permission denied: sin sesión interna `AccessState`; `?accion=` ajena «Esa acción no está disponible para ti.»;
  reversa sin permiso → sin botón y con explicación.
- Long content: nombres de sala y de agente con corte por línea; resumen ≤ 72 ch por línea; correos largos con
  `overflow-wrap: anywhere`.
- Mobile / compact: una columna, selector «Actividad | Salas», reversa a ancho completo.
- Keyboard / focus: orden entrada → enlaces → reversa; diálogo con foco al título y retorno al botón.
- Reduced motion: sin desplazamientos animados al enfocar `?accion=`; el resto es estático.
- Específicos: quota (franja + entrada), rejected (entrada atribuible), pending, reverted y failed reversa.

### Interaction contract

- Primary interaction: «Revertir» (verbo específico) → `Dialog` → confirmar → comando del descriptor.
- Hover / focus / active: los de `Button` AXIS sobre papel; foco visible en enlaces de texto.
- Pending / disabled: botón «Revirtiendo…» deshabilitado; el diálogo no cierra mientras está pendiente.
- Escape / click-away: cierran el diálogo sin efecto si no hay comando pendiente.
- Focus restore: al cerrar sin efecto vuelve al botón; tras revertir, al estado «Revertida por…» de la entrada.
- Latency feedback: texto «Revirtiendo…»; sin spinner de órbita.
- Toast / alert behavior: el resultado se anuncia en `role="status"` dentro de la entrada; el error queda bajo el
  botón con el motivo.

### Motion & microinteractions

- Motion primitive: `CSS` con tokens de movimiento de Rooms (contrato «el umbral», ver Motion en Status)
- Enter / exit: el `Dialog` de AXIS conserva su comportamiento por defecto; nada propio.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: sin desplazamiento animado al enfocar una acción; el diálogo hereda el fallback de AXIS.
- Non-goal motion: entradas que llegan en vivo, contadores animados u órbitas como loader. El canvas aprobado agrega
  movimiento propio; su contrato vive en `docs/ui/motion/TASK-2085-rooms-agent-activity-surface-motion.md`.

### Implementation mapping

- Route / surface: `src/app/rooms/page.tsx` (casa) y `src/app/rooms/[roomId]/actividad/page.tsx` (por sala);
  `src/app/demo/actividad/page.tsx` (fixture).
- Primitive / variant / kind: `Button` sólida (`line="growth"`) sólo en «Crear sala»; contorno para la reversa;
  `Badge tone="neutral"` con icono para estados; `Dialog` con `returnFocusRef`.
- Component candidates: `ActivityFeed`, `ActivityEntry`, `ActivityFilters`, `QuotaBanner`, `ReversalDialog`,
  `RoomsRail`, `CreateRoomDialog` en `src/components/agent-activity/`.
- Copy source: `AGENT_ACTIVITY_COPY` y `ROOMS_HOME_COPY` en `src/lib/copy/rooms.ts`.
- Data reader / command: reader de actividad de TASK-2084; reversas `invitations.revoke`, `access.revoke`,
  `members.revokeInternal`, `rooms.archive` y el comando de republicar de TASK-2084; `rooms.create`; `listRooms`.
- API parity: cada acción visible es un comando o reader existente con el mismo camino por CLI y MCP.
- Access / capability: decidida por el reader y por `can` en el servidor; la UI sólo muestra lo permitido.
- States to implement: los de State inventory y la tabla State Copy del wireframe.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/rooms-agent-activity.scenario.ts`
- Route: `/demo/actividad`
- Viewports: 1440 × 900, 1280 × 800, 390 × 844
- Quality profile: `premium`
- Required steps: filtro «Todo»; abrir y cancelar reversa; confirmar reversa; reversa en conflicto; tope; rechazo;
  vacío; vista por sala; «Crear sala»; en móvil, selector «Salas».
- Required captures: `home-ready`, `filter-all`, `reversal-confirm`, `reversal-done`, `reversal-conflict`,
  `quota-banner`, `rejected-entry`, `empty`, `room-activity`, `create-room-dialog`, `mobile-rooms`.
- Required `data-capture` markers: `agent-activity`, `agent-activity-entry`, `agent-activity-reversal`,
  `rooms-rail`, `create-room`.
- Assertions: `h1` visible, al menos una entrada con reversa, sin error boundary.
- Scroll-width checks: `scrollWidth <= clientWidth` en los tres anchos.
- Reduced-motion / focus evidence: `reducedMotionCheck`; sondas `reversal-dialog-escape` y `reversal-confirm-focus`.
- Review dossier: `.captures/<ISO>_rooms-agent-activity/index.html`
- Baseline decision / surface ID: `rooms.agent-activity`; sin baseline hasta la aprobación del canvas.

### Design decision log

- Decision: la casa del equipo es la actividad de agentes, con las salas como región secundaria; reversa en diálogo
  desde el descriptor del reader.
- Alternatives considered: pantalla de actividad aparte con `/rooms` sin cambios; actividad sólo por sala; bandeja de
  aprobación (descartada por el ADR).
- Why this pattern: el ADR pone la seguridad en ver y deshacer; la casa es donde la persona llega cada día y donde
  aterriza el aviso.
- Reuse / extend / new primitive: reuse; componentes de página nuevos.
- Open risks: sin dirección visual aprobada; republicar una edición anterior aún no es comando; rechazos atribuibles
  dependen de TASK-2087; «Crear sala» depende de que `rooms.create` acepte una sala vacía.

### Visual verification

- GVC scenario: `rooms-agent-activity`
- Viewports: 1440, 1280, 390
- Required captures: ver plan
- Required `data-capture` markers: ver plan
- Scroll-width check: sin scroll horizontal en 1440 ni 390
- Accessibility/focus checks: axe del perfil premium, objetivos ≥ 24 px y las dos sondas de teclado
- Before/after evidence: antes la lista de salas actual (`operator-workspace` en `/rooms`); después las capturas del
  escenario
- Known visual debt: sin dirección aprobada al crear la task
- Visual scorecard: `docs/ui/reviews/TASK-2085-rooms-agent-activity-surface.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Diseño en el canvas y aprobación del operador

- En `https://claude.ai/artifact/DX8VgavaqqZmHYXRbKVjeL`, fila «El lado de Efeonce — administrar salas»: artboards
  de la casa agentes primero (1440 y 390), vista por sala, diálogo de reversa (confirmar, hecho, conflicto, incierto),
  tope, rechazo, vacío, error y «Crear sala».
- Cumplir la regla de pesos de Bricolage y la dirección madre de Rooms; comparar al menos dos composiciones (por
  ejemplo región de salas lateral o debajo) antes de presentar.
- Aprobación explícita del operador, citada; actualizar el wireframe con el asset aprobado, el Visual Direction
  Contract y el decision log. Sin aprobación, la task no pasa al slice 2.

### Slice 2 — Copy, fixture y demo

- `AGENT_ACTIVITY_COPY` y `ROOMS_HOME_COPY` en `src/lib/copy/rooms.ts`; mover `INVITATION_COPY.workspace*` a la copy
  de la casa.
- Fixture sintética volta con la forma exacta del DTO de TASK-2084 y ruta `/demo/actividad`.
- Escenario `rooms-agent-activity.scenario.ts` corriendo contra la demo.

### Slice 3 — Casa agentes primero y huecos de navegación

- `src/app/rooms/page.tsx` con feed global, filtros por query params, región de salas con «Abrir autoría» y
  «Actividad», paginación de ambas regiones y errores por región.
- «Crear sala» con `rooms.create` y destino `/rooms/:roomId/authoring`.

### Slice 4 — Vista por sala y foco por aviso

- `src/app/rooms/[roomId]/actividad/page.tsx` con atajos «Ver como cliente», «Abrir autoría», «Invitaciones» y «Qué
  cambió».
- `?accion=:actionId` en ambas rutas: foco, resaltado y mensaje cuando la acción no es visible.

### Slice 5 — Reversa y estados de tope y rechazo

- `ReversalDialog` con descriptor del reader, `Idempotency-Key` por intento, resultados hecho, ya revertida, ya no
  activa, conflicto, sin permiso, último administrador e incierto.
- Franja y entrada de tope; entrada de rechazo cuando el reader la entrega.

### Slice 6 — Evidencia y cierre de diseño

- GVC en 1440, 1280 y 390 con movimiento reducido; scorecard; recorrido real en local contra la integración.
- `UI ready: yes` sólo con lo anterior y `pnpm task:lint --task TASK-2085` sin hallazgos.

## Out of Scope

- Columnas de actor, reader, comandos de reversa, cuotas, señales y aviso por correo o Teams (TASK-2084).
- Verificador del bearer (TASK-2087) y provider `rooms` del gateway (TASK-2088).
- Administrar topes o consentimientos; desarchivar una sala.
- Los permisos de invitación que faltan en la pantalla de invitaciones (por ejemplo preguntar).
- Consola de presentación y señales del cliente.
- Crear el flujo maestro de EPIC-052 (follow-up).
- Push, merge o deploy de `efeonce-rooms` sin autorización.

## Detailed Spec

Ver [wireframe](../../ui/wireframes/TASK-2085-rooms-agent-activity-surface.md) (regiones, anatomía de la entrada,
reversa por tipo de acción, copy, estados, accesibilidad, contrato de datos esperado) y
[flujo](../../ui/flows/TASK-2085-rooms-agent-activity-surface-flow.md) (nodos cruzados, secuencia de la reversa,
mapa de comandos, foco y retorno).

Puntos que el agente debe confirmar en Discovery:

- nombre final de `agents.activity` y forma del descriptor de reversa en `src/domain/agent-lane-contracts.ts`
  (TASK-2084) [verificar];
- nombre del comando de republicar de TASK-2084 [verificar];
- que TASK-2084 haya incorporado los campos marcados con † en el wireframe; si no, agregárselos como `## Delta`;
- si `rooms.create` acepta una sala vacía (`blankManifest` deja `profiles: []` y título vacío) y qué campos mínimos
  pide [verificar]; si no, «Crear sala» sale de esta task y se abre un follow-up backend.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (canvas aprobado) antes de cualquier JSX.
- Slice 2 necesita el DTO de TASK-2084; slices 3 a 5 necesitan su reader y comandos en local.
- Slice 5 no se fusiona sin los resultados de conflicto e incierto probados.
- Slice 6 al final, con todo lo anterior.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Revertir una publicación pisa trabajo humano posterior | UI | medium | El comando de TASK-2084 rechaza con conflicto; la UI no reintenta y enlaza «Qué cambió» | Conflictos de reversa en logs del comando |
| Doble clic duplica la reversa | UI | low | `Idempotency-Key` por intento, botón deshabilitado en pendiente | Dos entradas de reversa para la misma acción |
| Correos o nombres del invitado visibles para quien no debe | identity | low | La UI sólo pinta lo que el reader entrega enmascarado; prueba con una persona sin `access.read` | Revisión de la prueba de alcance |
| La casa nueva pierde la lista de salas o su paginación | UI | low | Región de salas con `listRooms` y cursor actuales; errores por región | GVC y prueba de paginación |
| «Crear sala» deja salas basura en producción | UI | medium | Diálogo con nombre, origen y procedencia obligatorios; destino directo a autoría | Salas sin edición después de 7 días |
| El alias público no sigue al deploy y el equipo ve la versión anterior | release | medium | `vercel alias set` después del deploy (trampa conocida de Rooms) | Hash del deploy servido distinto del de `main` |

### Feature flags / cutover

- Sin flag nueva: superficie interna, aditiva sobre readers y comandos que traen sus propias guardas. Las reversas son
  comandos existentes o de TASK-2084 con capacidad, idempotencia y `expectedRevision`.
- Si TASK-2084 llega detrás de un flag, la casa muestra el estado vacío y las salas mientras el reader no esté
  disponible.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Volver la fila del canvas a la versión anterior | minutos | sí |
| Slice 2 | Revertir commit | minutos | sí |
| Slice 3 | Revertir commit y redeploy; la lista anterior vuelve | minutos | sí |
| Slice 4 | Revertir commit y redeploy | minutos | sí |
| Slice 5 | Revertir commit y redeploy; las reversas siguen por CLI | minutos | sí |
| Slice 6 | Sin efecto en runtime | n/a | sí |

### Production verification sequence

1. Merge autorizado a `main` de `efeonce-rooms` y `vercel alias set <deploy> efeonce-rooms.vercel.app --scope efeonce-7670142f`.
2. `/rooms` con la sesión del operador: feed, salas, «Abrir autoría» y «Crear sala» visibles.
3. Con una sala sintética: un agente por CLI invita; la entrada aparece; revertir; el enlace de la invitación deja de
   abrir la sala.
4. Abrir `/rooms?accion=:actionId` desde un aviso real cuando TASK-2084 los emita.

### Out-of-band coordination required

- Aprobación del operador en el canvas (slice 1).
- Autorización de merge a `main` de `efeonce-rooms` (= producción) y movimiento del alias.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El operador aprobó en el canvas los artboards de la casa, la vista por sala, la reversa y «Crear sala»; el
  wireframe cita el asset y la aprobación.
- [x] `/rooms` muestra la actividad de agentes como región principal y conserva la lista de salas con su paginación.
- [ ] (parcial: el reader no entrega resumen ni detalle; se muestra quién, qué, cuándo y canal) Cada entrada `release`/`access` muestra agente y persona, qué, cuándo, canal y el resumen del servidor.
- [x] El botón de reversa aparece sólo cuando el reader entrega un descriptor permitido; nunca se componen dos
  comandos en el navegador.
- [x] La reversa pide confirmación y cubre hecho, ya revertida, ya no activa, conflicto, sin permiso, último
  administrador e incierto (reintento con la misma `Idempotency-Key`).
- [x] Tope y rechazo tienen su estado visible con texto, no sólo color.
- [x] «Crear sala» existe y lleva a `/rooms/:roomId/authoring`; cada fila tiene «Abrir autoría» (con `content.edit`) y
  «Actividad».
- [x] `/rooms/:roomId/actividad` existe con «Ver como cliente», «Abrir autoría», «Invitaciones» y «Qué cambió».
- [x] `?accion=` enfoca la entrada o dice «Esa acción no está disponible para ti.» sin revelar datos.
- [x] Todo el copy visible vive en `src/lib/copy/rooms.ts`; sin voseo.
- [x] Ningún bloque de Bricolage de varias líneas va entero en negrita: los titulares alternan pesos.
- [x] Sin hex ni medidas literales: sólo tokens de `theme.ts`.
- [x] Movimiento reducido no desplaza la página al enfocar una acción.
- [ ] (capturas Playwright en 1440, 1280 y 390, con y sin movimiento reducido, sin scroll horizontal; falta pnpm fe:capture y scorecard) GVC desktop y móvil capturado y mirado (1440, 1280, 390) sin scroll horizontal; scorecard sobre el umbral.
- [x] `UI ready` siguió en `no` hasta tener aprobación, implementation mapping, plan GVC y decision log; si pasa a
  `yes`, `pnpm task:lint --task TASK-2085` queda sin hallazgos.
- [ ] (pendiente: no se ejercitó con un agente real) Recorrido real en local: un agente por CLI invita, la persona revierte y la invitación deja de servir.

## Verification

- `efeonce-rooms`: `LC_ALL=en_US.UTF-8 pnpm verify`
- `AGENT_AUTH_BASE_URL=<origen local de Rooms> pnpm fe:capture rooms-agent-activity --env=local`
- `pnpm task:lint --task TASK-2085`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/documentation/rooms/quien-ve-que-en-rooms.md` actualizado («Lo que todavía falta en la interfaz»).
- [ ] Manual en `docs/manual-de-uso/rooms/` para revisar y revertir acciones de agentes.
- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.

## Follow-ups

- Flujo maestro `docs/ui/flows/EPIC-052-rooms-UI-FLOW.md` con los nodos listados en el flujo de esta task.
- Si `rooms.create` no acepta una sala vacía: task backend para crear una sala mínima.
- Permisos de invitación completos en la pantalla de invitaciones.

## Open Questions

- ¿Quién ve «Todo el equipo»? TASK-2084 propone exigir `members.manage` (a confirmar en su Discovery); la pantalla
  sólo muestra el alcance que el reader ofrece.
- ¿Abrir una acción desde el aviso (`?accion=`) marca `acknowledged_at` en `rooms.agent_action_notices`? TASK-2084 no
  declara un comando para eso; si se quiere, va como `## Delta` en TASK-2084.
- ¿Las acciones `author` de un agente se agrupan (por sala y hora) en el reader o se listan una por una?
- Destino del rechazo de bearer: ¿enlace a la gestión de conexiones de Efeonce ID? Depende de EPIC-044.
