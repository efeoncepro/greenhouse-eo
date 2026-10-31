# TASK-2083 — Rooms: página «el acceso se detuvo» en vez de JSON crudo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2083-rooms-access-issue-page.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-052`
- Status real: `2026-10-31: código local en efeonce-rooms claude/rooms-durable-internal-access (adb1db0 + 510ab42, sin push). Con TASK-2082, identity_unbound muestra el código de solicitud (XXXX-XXXX) en vez de la referencia. verify 385/385; GVC rooms-access-issue OK en 1440/1280/390 con código. Falta: mirada del operador (UI ready), merge y deploy autorizados.`
- Rank: `junto con TASK-2082; independiente de ella`
- Domain: `platform|identity`
- Blocked by: `ninguno para el corte local; producción espera autorización de merge`
- Branch: `efeonce-rooms: claude/rooms-durable-internal-access, sin push; Greenhouse: docs en develop`

## Summary

Cuando el login de Rooms falla en `/login` o `/auth/callback`, el navegador mostraba JSON crudo. Desde esta task,
esas navegaciones redirigen a `/auth/error?reason=…&ref=…`: una escena de la familia de la invitación (anillo sin
esfera, una palabra, el motivo, qué hacer y una referencia de soporte copiable). Los clientes que piden sólo JSON
conservan el contrato de error.

## Why This Task Exists

El 2026-10-31 el primer login real del dueño terminó en `identity_unbound` y vio
`{"error":{"code":"identity_unbound",…}}`. Una persona no debe leer un objeto de API ni adivinar si el problema es
suyo, temporal o de configuración.

## Goal

- Cada motivo de falla del login tiene título, explicación y la acción correcta (o ninguna si no sirve).
- La referencia se puede buscar en los logs del runtime.
- Sin bucles: la página es terminal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md` (parte B)
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md` (callback, `iss` y transacción de un uso)
- `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`

Reglas obligatorias:

- La página sólo lee `reason` (lista cerrada) y `ref` (UUID). Ningún otro dato del query o del proveedor se muestra.
- La redirección conserva `private, no-store`, borra la cookie de transacción y no crea sesión.
- La página nunca redirige sola.

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`
- `.claude/skills/efeonce-graphic-line/SKILL.md` (La órbita)
- `docs/ui/wireframes/TASK-2068-rooms-invitation-and-guest-experience.md` (familia visual)

## Dependencies & Impact

### Depends on

- Primitivas de TASK-2079 (`Orbit`, `DepthLayers`).

### Blocks / Impacts

- TASK-2082: la referencia de `identity_unbound` pasará a ser el código de la solicitud de acceso.

### Files owned

- `../efeonce-rooms/src/app/auth/error/page.tsx`
- `../efeonce-rooms/src/components/access-issue-stage.tsx`
- `../efeonce-rooms/src/styles/access-issue.css`
- `../efeonce-rooms/src/server/auth/http.ts` y `root-runtime.ts` (redirección)
- `../efeonce-rooms/src/domain/auth-contracts.ts` (`ACCESS_ISSUE_REASONS`)
- `../efeonce-rooms/src/lib/copy/rooms.ts` (`ACCESS_ISSUE_COPY`)
- `scripts/frontend/scenarios/rooms-access-issue.scenario.ts`

## Current Repo State

### Already exists

- `src/server/auth/http.ts` con mensajes es-CL por código, pero entregados como JSON.
- `StateSurface` y `AccessState` (estados genéricos claros, sin motivo ni referencia).

### Gap

- Sin página para fallas del login; JSON crudo en el navegador.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-rooms` (`src/app/auth/error`, `src/components`)
- Future candidate home: `remain-shared`
- Boundary: adapter HTTP de auth y una página pública sin datos
- Server/browser split: motivos y validación en `src/domain/auth-contracts.ts`; escena cliente
- Build impact: una ruta dinámica nueva
- Extraction blocker: ninguno

## Hybrid Execution Justification

- Why not split: el cambio de API es una sola rama del adapter HTTP (redirigir en vez de responder JSON) y no tiene
  sentido sin la página que lo recibe; separarlo dejaría un 404 entre dos tasks.
- Primary execution profile: `ui-ux`.
- Contract boundary: `src/server/auth/http.ts` decide redirigir y qué dos parámetros salen; la página sólo los lee.
- Risk controls: sin migración ni datos; `Accept: application/json` conserva el contrato anterior; tests de
  location, cookies y JSON; slices 1 y 2 en el mismo commit.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite` (presentación del error; no cambia identidad, sesión ni datos)
- Impacto principal: `api`
- Source of truth afectado: ninguno
- Consumidores afectados: navegador en `/login` y `/auth/callback`; SDK/clientes que piden JSON
- Runtime target: local en esta task; producción con merge autorizado

### Contract surface

- Contrato existente a respetar: errores de auth `{ error: { code, message }, correlationId }` con su estado HTTP.
- Contrato nuevo o modificado: en `login`/`callback`, si `Accept` no es sólo JSON, 303 a
  `/auth/error?reason=<ACCESS_ISSUE_REASONS>&ref=<correlationId>`; `root-runtime` redirige con
  `reason=configuration` cuando la configuración falla.
- Backward compatibility: `compatible` para clientes con `Accept: application/json`.
- Full API parity: el JSON sigue disponible para todo cliente programático.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna.
- Invariantes que no se pueden romper:
  - La redirección no crea sesión y borra la cookie de transacción.
  - Ningún dato de entrada del callback (`error_description`, `code`, `state`) llega a la URL de destino.
- Write-target allowlist: ninguna escritura nueva.
- Tenant/space boundary: no aplica; página pública sin datos.
- Idempotency/concurrency: no aplica.
- Audit/outbox/history: log estructurado `rooms.auth.browser_error` con `target`, `code` y `correlationId`.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: activo con el deploy.
- Backfill plan: ninguno.
- Rollback path: revertir commit y redeploy.
- External coordination: autorización de merge a `main` de `efeonce-rooms`.

### Security and access

- Auth/access gate: sin cambio.
- Sensitive data posture: sólo código en lista cerrada y UUID; `Cache-Control: private, no-store`.
- Error contract: mismo set de códigos de auth.
- Abuse/rate-limit posture: sin cambio (`rate_limited` conserva `Retry-After`).

### Runtime evidence

- Local checks: `tests/auth-http.test.ts` (8/8), `tests/integration-env.test.ts`, `tests/auth-logout-readiness.test.ts`.
- DB/runtime checks: `auth-logout-readiness` corre contra la PG local del repo.
- Integration checks: GVC sobre `next start` del build de producción.
- Reliability signals/logs: `rooms.auth.browser_error`.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona interna o invitada que vuelve de Efeonce ID y no llega a la sala.
- Momento del flujo: después de `/auth/callback` (o `/login`) fallido.
- Resultado perceptible esperado: entiende qué pasó, de quién es la culpa y qué hacer, en una mirada.
- Friccion que debe reducir: leer JSON, reintentar a ciegas en `identity_unbound`, pedir ayuda sin dato.
- No-goals UX: pedir acceso desde la página (lo resuelve TASK-2082), cerrar sesión de Efeonce ID.

### Surface & system decision

- Surface: página completa `/auth/error`, escena oscura de la familia de la invitación.
- Nav placement: `none` — destino de redirección, no de navegación.
- Composition Shell: `no aplica` — runtime de Rooms, no portal Greenhouse.
- Primitive decision: `reuse` — `Orbit` (anillo sin esfera), `DepthLayers`, `Button` AXIS.
- Adaptive density / The Seam: `no aplica` — una sola escena.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: `src/lib/copy/rooms.ts` → `ACCESS_ISSUE_COPY`.
- Access impact: `none`.

### State inventory

- Default: motivo con palabra, título, cuerpo, acción y referencia.
- Loading: no aplica (render de servidor sin datos).
- Empty: sin `ref` válido no se muestra el bloque de referencia.
- Error: motivo desconocido se muestra como `unavailable`.
- Degraded / partial: `disabled`/`configuration` sin acción, sólo explicación.
- Permission denied: `identity_unbound` (la identidad existe, falta acceso en Rooms).
- Long content: títulos con `text-wrap: balance`; cuerpo hasta 52 ch.
- Mobile / compact: una columna, anillo de radio 128.
- Keyboard / focus: «Saltar al contenido»; foco visible en «Volver a entrar» y «Copiar referencia».
- Reduced motion: sin entrada de palabra ni cuerpo.

### Interaction contract

- Primary interaction: «Volver a entrar» o «Reintentar» → `/login?returnTo=/rooms` (documento).
- Hover / focus / active: los de `Button` AXIS sobre oscuro.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: copiar anuncia «Referencia copiada» en `role="status"`.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: la órbita se dibuja una vez (TASK-2079); la palabra entra con recorte y el cuerpo sube.
- Layout morph: ninguno.
- Stagger: palabra a 200 ms, cuerpo a 700 ms.
- Timing / easing token: `--room-ease-arrive`.
- Reduced-motion fallback: sin animación de palabra ni cuerpo; órbita con su fallback.
- Non-goal motion: sin bucles ni movimiento permanente.

### Implementation mapping

- Route / surface: `src/app/auth/error/page.tsx`.
- Primitive / variant / kind: `Orbit` con `measure={{ value: 0, total: 1 }}`; `Button` sólido, contorno y fantasma.
- Component candidates: `AccessIssueStage` (`src/components/access-issue-stage.tsx`).
- Copy source: `ACCESS_ISSUE_COPY`.
- Data reader / command: ninguno; `reason` y `ref` del query.
- API parity: los clientes con `Accept: application/json` reciben el error JSON de siempre.
- Access / capability: pública.
- States to implement: los nueve motivos de `ACCESS_ISSUE_REASONS`.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/rooms-access-issue.scenario.ts`
- Route: `/auth/error?reason=identity_unbound&ref=7b6ef4e7-a936-4ec6-84ac-9865732e40d3`
- Viewports: 1440 × 900, 1280 × 800, 390 × 844
- Quality profile: `premium`
- Required steps: marca `identity-unbound` y sonda de teclado.
- Required captures: `identity-unbound` y `keyboard-login-then-copy` por viewport.
- Required `data-capture` markers: `access-issue`, `access-issue-reference`.
- Assertions: `h1` visible, referencia visible, sin error boundary.
- Scroll-width checks: layout del perfil premium.
- Reduced-motion / focus evidence: `reducedMotionCheck` y foco visible en la sonda.
- Review dossier: `.captures/<ISO>_rooms-access-issue/index.html`.
- Baseline decision / surface ID: sin baseline; superficie `rooms-access-issue`.

### Design decision log

- Decision: escena oscura de la invitación con anillo sin esfera, palabra y motivo.
- Alternatives considered: `StateSurface` (claro, sin motivo) y `AccessState` (un botón a login; bucle en `identity_unbound`).
- Why this pattern: es la misma puerta que la invitación y la acción depende del motivo.
- Reuse / extend / new primitive: reuse; componente de página nuevo.
- Open risks: la referencia hoy es el `correlationId`; con TASK-2082 pasa a ser el código de solicitud.

### Visual verification

- GVC scenario: `rooms-access-issue`
- Viewports: 1440, 1280, 390
- Required captures: ver plan
- Required `data-capture` markers: `access-issue`, `access-issue-reference`
- Scroll-width check: sin scroll horizontal en 1440 ni 390
- Accessibility/focus checks: axe del perfil premium y sonda de teclado
- Before/after evidence: antes JSON crudo (recibo del 2026-10-31); después las capturas del escenario
- Known visual debt: ninguna conocida
- Visual scorecard: pendiente de la mirada del operador
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Redirección

- `/login` y `/auth/callback` redirigen 303 a `/auth/error` cuando el navegador no pidió sólo JSON; registro
  estructurado `rooms.auth.browser_error` con código y `correlationId`.

### Slice 2 — Página

- Motivos en el dominio, copy, escena, estilos y escenario GVC.

## Out of Scope

- Solicitud de acceso con código propio (TASK-2082).
- Cerrar la sesión de Efeonce ID desde Rooms.
- Push, merge y deploy sin autorización.

## Detailed Spec

Ver wireframe `docs/ui/wireframes/TASK-2083-rooms-access-issue-page.md`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 y 2 van en el mismo commit: redirigir sin página dejaría un 404.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un cliente programático esperaba JSON | identity | low | `Accept: application/json` conserva el JSON (test) | Errores de parseo en SDK |
| Bucle callback ↔ página | identity | low | La página no redirige sola (test de location) | Muchas visitas seguidas a `/auth/error` |
| Fuga de datos del proveedor en la URL | identity | low | Sólo `reason` en lista cerrada y `ref` UUID (test) | Query distinta de `reason`+`ref` |

### Feature flags / cutover

- Sin flag: el cambio es de presentación del error; el login exitoso no cambia.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir commit y redeploy | minutos | sí |
| Slice 2 | Revertir commit y redeploy | minutos | sí |

### Production verification sequence

- Tras el deploy autorizado: abrir `/auth/callback?error=x` en producción y ver la página con `reason=invalid_transaction`.

### Out-of-band coordination required

- Autorización de merge a `main` de `efeonce-rooms` (= producción).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Un callback fallido desde el navegador redirige 303 a `/auth/error` con sólo `reason` y `ref` (test `auth-http`).
- [x] Con `Accept: application/json` se conserva el error JSON (test).
- [x] La cookie de transacción se borra y no se crea sesión en `identity_unbound` (test).
- [x] El copy visible vive en `src/lib/copy/rooms.ts` (`ACCESS_ISSUE_COPY`).
- [x] Reusa `Orbit`, `DepthLayers` y `Button` AXIS; sin primitive nueva.
- [x] Movimiento reducido apaga la entrada de palabra y cuerpo.
- [x] GVC desktop + mobile capturado y mirado (1440, 1280, 390), sin hallazgos.
- [x] `LC_ALL=en_US.UTF-8 pnpm verify` pasa (0 fallas; 24 omitidas por PG explícito y multimedia, ajenas a auth).
- [ ] `UI ready` permanece `no` hasta la mirada del operador; si pasa a `yes`, `pnpm task:lint --task TASK-2083` sin hallazgos. (Pendiente: mirada humana.)
- [ ] Verificado en producción tras merge autorizado. (Pendiente: autorización.)

## Verification

- `efeonce-rooms`: `LC_ALL=en_US.UTF-8 pnpm verify`
- `AGENT_AUTH_BASE_URL=<origen local de Rooms> pnpm fe:capture rooms-access-issue --env=local`
- `pnpm task:lint --task TASK-2083`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.

## Follow-ups

- Con TASK-2082: mostrar el código de solicitud de acceso en `identity_unbound`.
