# TASK-2093 — Rooms: interfaz para que el comprador sume a su comité

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2093-rooms-buyer-committee-colleague-access.md`
- Flow: `docs/ui/flows/TASK-2093-rooms-buyer-committee-colleague-access-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-052`
- Status real: `Diseño. Wireframe y flujo escritos; falta la propuesta en canvas y su aprobación.`
- Rank: `después de TASK-2092; el slice 1 (canvas) puede empezar antes`
- Domain: `platform`
- Blocked by: `TASK-2092 (slices 2 a 4; el slice 1 de canvas no depende de ella)`
- Branch: `efeonce-rooms: rama propia y PR (main = producción, alias manual tras deploy); Greenhouse: docs y escenario GVC en develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Las dos caras visibles del acceso de colegas: en la sala, el invitado ve «Sumar a alguien de tu equipo» y propone a
un colega con su correo; en la gestión de invitaciones, el equipo de Efeonce ve «Solicitudes de tu cliente» para
aprobar o rechazar los correos de otro dominio, y el origen de cada invitación. Consume el contrato de TASK-2092.

## Why This Task Exists

- TASK-2092 crea las reglas y los commands, pero sin interfaz el comprador no sabe que puede sumar a su comité y el
  equipo no ve las solicitudes pendientes.
- Es una acción del comprador dentro de la sala, el momento más sensible de la experiencia: tiene que sentirse
  natural, sin lenguaje de seguridad, y no competir con la lectura.

## Goal

- El invitado propone a un colega en menos de 30 segundos y entiende el resultado (acceso inmediato o revisión).
- El equipo resuelve una solicitud pendiente con un clic y confirmación, desde la sala o desde la casa.
- Desktop y 390 px, teclado y movimiento reducido cubiertos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/ui/flows/rooms-v1.md` (flujo maestro de Rooms; esta task es su nodo de ampliación del acceso)
- `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md` («La órbita»)
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md` §6 (el champion)
- `docs/tasks/to-do/TASK-2092-rooms-buyer-committee-colleague-access.md` (contrato)

Reglas obligatorias:

- La interfaz no decide nada: dominio, tope y herencia los resuelve el servidor y llegan en el DTO.
- El invitado nunca ve correos completos de otros invitados.
- Primitivas de `@efeoncepro/axis-ui-primitives/react`; copy en `src/lib/copy/invitations.ts` de Rooms.

## Normative Docs

- `docs/tasks/in-progress/TASK-2068-rooms-invitation-and-guest-experience.md` (gestión de invitaciones existente)
- `docs/tasks/in-progress/TASK-2085-rooms-agent-activity-surface.md` (casa y lista de salas)

## Dependencies & Impact

### Depends on

- TASK-2092: commands `invitations.requestColleague` y `invitations.decideColleague`, reader `invitations.colleagueRequests`.

### Blocks / Impacts

- TASK-2068 (gestión de invitaciones) y TASK-2085 (casa): ambas superficies ganan un bloque o insignia.

### Files owned

- `efeonce-rooms/src/components/invitations/colleague-request.tsx` [nuevo]
- `efeonce-rooms/src/components/invitations/colleague-requests-inbox.tsx` [nuevo]
- `efeonce-rooms/src/components/invitations/session-actions.tsx`
- `efeonce-rooms/src/components/invitations/invitation-management.tsx`
- `efeonce-rooms/src/lib/copy/invitations.ts`
- `docs/ui/wireframes/TASK-2093-rooms-buyer-committee-colleague-access.md`
- `docs/ui/flows/TASK-2093-rooms-buyer-committee-colleague-access-flow.md`

## Current Repo State

### Already exists

- Sala del invitado envuelta en `GuestSessionBoundary` con «Salir de la sala» (`session-actions.tsx`).
- Gestión de invitaciones con diálogo de invitar, reemitir y revocar (`invitation-management.tsx`).
- Casa con lista de salas y actividad de agentes (TASK-2085).

### Gap

- No hay acción del invitado para proponer colegas ni bandeja de solicitudes para el equipo.
- La lista de invitaciones no muestra el origen ni ofrece revocación en cascada.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-rooms` (`src/components/invitations`, `src/app/rooms`), runtime Next.js de Rooms en Vercel
- Future candidate home: `remain-shared`
- Boundary: consume el reader y los commands de TASK-2092; la UI no es dueña de ninguna regla
- Server/browser split: las páginas son Server Components que leen el reader; la hoja y la bandeja son Client Components que escriben sólo por `POST /api/v1/commands`
- Build impact: dos componentes nuevos; sin dependencias nuevas
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: invitado comprador (champion) y equipo de Efeonce con `access.manage`
- Momento del flujo: el comprador ya leyó la propuesta y quiere llevarla a su comité
- Resultado perceptible esperado: el colega recibe su acceso de inmediato o queda en revisión, y el comprador lo sabe
- Friccion que debe reducir: pedirle otra invitación a Efeonce o reenviar un enlace que no funciona
- No-goals UX: gestionar el comité del cliente, ver quién leyó qué desde el lado del invitado

### Surface & system decision

- Surface: acción en la sala del invitado, hoja de propuesta, bloque «Solicitudes de tu cliente» en la gestión de invitaciones e insignia en la casa
- Nav placement: `none` — no agrega destinos; usa la sala y la gestión existentes
- Composition Shell: `no aplica` — Rooms tiene su propio marco de producto («La órbita»), no el shell de Greenhouse
- Primitive decision: `reuse` — `Dialog`, `Field`, `Input`, `Button`, `Badge` de AXIS
- Adaptive density / The Seam: `no aplica` — tarjetas simples de lista
- Floating/Sidecar/Dialog decision: diálogo en desktop y hoja inferior a pantalla completa en 390 px
- Copy source: `src/lib/copy/*`
- Access impact: `entitlements` (capability `colleagues.request` de la invitación y `access.manage` del equipo)

### State inventory

- Default: acción visible para el invitado con capability; bloque visible para el equipo sólo si hay solicitudes
- Loading: «Enviando…» en el botón y campos bloqueados; esqueleto en la bandeja
- Empty: sin solicitudes el bloque no se renderiza
- Error: resultados `invalid_input`, `conflict`, `quota_exceeded` y envío incierto con copy propio
- Degraded / partial: si el reader de solicitudes falla, la lista de invitaciones sigue y el bloque muestra un aviso
- Permission denied: acción y bloque ocultos
- Long content: motivo hasta 200 caracteres con contador; correos largos con corte y título completo accesible
- Mobile / compact: hoja inferior, botones apilados a ancho completo
- Keyboard / focus: foco al título al abrir, Esc cierra sin envío en curso, foco vuelve al botón de origen
- Reduced motion: cambio de estado sin desplazamiento

### Interaction contract

- Primary interaction: enviar la propuesta (invitado) y aprobar o rechazar (equipo)
- Hover / focus / active: estados de las primitivas AXIS, sin estilos propios
- Pending / disabled: botón deshabilitado durante el envío; la misma clave idempotente al reintentar
- Escape / click-away: cierran sólo si no hay envío en curso
- Focus restore: al botón que abrió la hoja o a la tarjeta decidida
- Latency feedback: «Enviando…» inmediato; resultado en la misma hoja
- Toast / alert behavior: sin toasts; el resultado vive en la hoja y en la lista

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: apertura y cierre de diálogo y hoja con las primitivas de «La órbita»
- Layout morph: la tarjeta decidida sale de la bandeja y la invitación aparece en la lista
- Stagger: sin escalonado
- Timing / easing token: tokens de motion de AXIS
- Reduced-motion fallback: cambio inmediato sin desplazamiento
- Non-goal motion: sin animaciones de celebración

### Implementation mapping

- Route / surface: `/rooms/[roomId]/editions/[editionId]` (invitado), `/rooms/[roomId]/invitations` y `/rooms` (equipo)
- Primitive / variant / kind: `Dialog`, `Field`, `Input`, `Button` (`line="growth"` para la acción principal), `Badge`
- Component candidates: `colleague-request.tsx`, `colleague-requests-inbox.tsx`, extensión de `session-actions.tsx` e `invitation-management.tsx`
- Copy source: `COLLEAGUE_COPY` en `src/lib/copy/invitations.ts`
- Data reader / command: `invitations.colleagueRequests`, `invitations.requestColleague`, `invitations.decideColleague`, `invitations.revoke`
- API parity: `POST /api/v1/commands` y readers existentes; sin endpoints de pantalla
- Access / capability: `colleagues.request` (invitado), `access.manage` (equipo)
- States to implement: los del State inventory

### GVC scenario plan

- Scenario file: escenario de Rooms en el entorno local de integración (personas fixture del launcher) [verificar ruta]
- Route: sala `test-design-room-a` como cliente fixture y gestión como administrador fixture
- Viewports: 1440×900 y 390×844
- Quality profile: `premium`
- Required steps: abrir hoja, proponer mismo dominio, proponer Gmail, aprobar pendiente, revocar con cascada
- Required captures: hoja vacía, resultado automático, resultado pendiente, bandeja con dos solicitudes, revocación con casilla
- Required `data-capture` markers: `colleague-sheet`, `colleague-result`, `colleague-inbox`, `colleague-origin`
- Assertions: correos ajenos no visibles para el invitado; insignia de origen presente
- Scroll-width checks: sin scroll horizontal en 390 px
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion` y foco restaurado
- Review dossier: `docs/ui/reviews/TASK-2093-rooms-buyer-committee-colleague-access.scorecard.json`
- Baseline decision / surface ID: superficies nuevas, sin baseline previo

### Design decision log

- Decision: acción quieta en el encabezado más invitación editorial al final del recorrido
- Alternatives considered: botón flotante permanente (compite con la lectura); sólo en un menú (no se descubre)
- Why this pattern: el final del recorrido es cuando el comprador piensa en su comité; el encabezado lo deja a mano
- Reuse / extend / new primitive: reuse de AXIS
- Open risks: la nota de dominio debe ser clara sin sonar a desconfianza; se valida en canvas

### Visual verification

- GVC scenario: el del GVC scenario plan
- Viewports: 1440×900 y 390×844
- Required captures: las del GVC scenario plan
- Required `data-capture` markers: `colleague-sheet`, `colleague-result`, `colleague-inbox`, `colleague-origin`
- Scroll-width check: sin scroll horizontal en 390 px
- Accessibility/focus checks: foco al abrir y al cerrar, etiquetas de campo, contraste AXIS
- Before/after evidence: sala y gestión antes y después
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-2093-rooms-buyer-committee-colleague-access.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Propuesta en canvas

- Artboards de la acción en la sala, la hoja con sus seis resultados, la bandeja del equipo y la revocación en
  cascada, en 1440 y 390. Aprobación del operador y registro de los artboards en el wireframe.

### Slice 2 — Lado del invitado

- Acción en el encabezado y al final del recorrido, hoja de propuesta y resultados, copy `COLLEAGUE_COPY`.

### Slice 3 — Lado del equipo

- Bloque «Solicitudes de tu cliente», insignia de origen, casilla de revocación en cascada e insignia en la casa.

### Slice 4 — Verificación visual

- Escenario GVC, capturas, scorecard y docs (funcional y manual de operación).

## Out of Scope

- Reglas, commands y migración (TASK-2092).
- Correo al equipo por solicitudes pendientes y contactos de HubSpot (follow-ups de TASK-2092).
- Rediseño de la sala o de la gestión de invitaciones más allá de los bloques nuevos.

## Detailed Spec

El wireframe y el flujo de `Status` gobiernan regiones, campos, estados, copy y transiciones.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (canvas aprobado) → Slice 2 y Slice 3 (requieren TASK-2092 en producción) → Slice 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La acción distrae de la lectura | UI | medium | variante quieta y validación en canvas | revisión del scorecard |
| La nota de dominio suena a desconfianza | UI | medium | copy revisado con `greenhouse-ux-writing` | revisión del operador |
| El invitado ve correos de otros | UI | low | DTO sin correos ajenos (TASK-2092) y aserción GVC | aserción del escenario |

### Feature flags / cutover

- Sin flag propio: la acción sólo aparece si la invitación tiene `colleagues.request`, que controla TASK-2092.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | sin efecto en runtime (sólo canvas) | inmediato | sí |
| Slice 2 | revert del PR y redeploy con alias manual | < 15 min | sí |
| Slice 3 | revert del PR y redeploy con alias manual | < 15 min | sí |
| Slice 4 | sólo docs y escenario | inmediato | sí |

### Production verification sequence

1. TASK-2092 en producción.
2. Merge, deploy y `vercel alias set`.
3. Recorrido real con una invitación interna: proponer un colega del mismo dominio y uno de Gmail, y aprobar.

### Out-of-band coordination required

- Aprobación del operador del canvas y del deploy de Rooms.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Canvas aprobado por el operador y registrado en el wireframe antes de escribir JSX.
- [ ] `UI ready` sigue en `no` hasta tener implementation mapping, plan GVC y design decision log completos, y `pnpm task:lint --task TASK-2093` sin hallazgos.
- [ ] El invitado con `colleagues.request` ve la acción en el encabezado y al final del recorrido; sin ella, no la ve.
- [ ] La hoja muestra los seis resultados del wireframe con su copy de `COLLEAGUE_COPY`.
- [ ] El equipo aprueba o rechaza una solicitud con confirmación, y la lista muestra el origen.
- [ ] Revocar a un invitado con colegas ofrece la casilla de cascada, desmarcada por defecto.
- [ ] Evidencia GVC en 1440 y 390 px, sin scroll horizontal, con foco y movimiento reducido.
- [ ] Ningún correo de otro invitado visible para el invitado (aserción GVC).

## Verification

- `pnpm lint`, `pnpm typecheck` y `pnpm test` en `efeonce-rooms`
- Escenario GVC y scorecard
- Recorrido real del Production verification sequence

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] doc funcional `quien-ve-que-en-rooms.md` y manual de solicitudes de colegas actualizados

## Follow-ups

- Mapa del comité en la sala para el equipo (quién propuso a quién y quién leyó qué).

## Open Questions

- Ninguna bloqueante; la composición final se decide en el canvas del slice 1.
