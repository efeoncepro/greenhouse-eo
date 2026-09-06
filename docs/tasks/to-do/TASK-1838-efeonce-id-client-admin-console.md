# TASK-1838 — Consola del administrador del cliente (Efeonce ID): invitar, reenviar y revocar a su propia gente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1838-client-admin-console.md`
- Flow: `docs/ui/flows/TASK-1838-client-admin-console-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-044`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity|ui`
- Blocked by: `comparación de dirección de la composición (Slice 1 de esta task)`
- Desbloqueo 2026-09-06: la lane delegada está en producción (release `b3e324cb5c8d`, ambos flags ON) y sus commands de reenvío y revocación ya están mergeados.
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La persona que aceptó una invitación como administradora designada de su organización hoy tiene
autoridad (TASK-1837: `designated_admin_profile_id`, lane ecosystem `GET/POST
/api/platform/ecosystem/identity/invitations`) pero **ninguna pantalla** desde la que ejercerla:
sólo un agente MCP podría invitar en su nombre. Esta task construye la consola en Efeonce ID
(`auth.efeonce.org/account/organization`) donde ese administrador ve a su gente con el estado real
de entrega, invita, reenvía y revoca, sin escribirle a Efeonce y sin ver jamás un token.

## Why This Task Exists

`TASK-1837` dejó el contrato gobernado y lo verificó end-to-end en staging (invitación delegada por
la lane con correo real, 2026-09-06). Su `## Out of Scope` y `## Follow-ups` declaran explícitamente
que la consola del administrador «exige wireframe y flow propios y dirección de diseño aprobada;
sin eso no nace». Sin esta superficie, la promesa de EPIC-044 —que el cliente administre a su
propia gente— sólo se cumple para agentes conectados al gateway, no para una persona con un
navegador. Y la persona externa **no tiene** dónde más hacerlo: no tiene `client_users`, no tiene
sesión NextAuth, no tiene ROLE_CODES; su única identidad es la del emisor (`__Host-efeonce_auth`).
Ponerla en Greenhouse sería crear la segunda identidad que EPIC-044 prohíbe.

Dos huecos del contrato quedan expuestos por esta consola y **no se inventan aquí como hechos**:
la lane delegada no tiene verbos de reenvío ni de revocación (los commands existentes
`resendExternalInvitation` y `revokeExternalAccess` son de Efeonce, con actor y capability admin),
y el flag `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` se lee sólo en Vercel mientras la consola
correría en el auth-server (Cloud Run). Ambos se declaran como prerrequisito de `TASK-1837`.

## Goal

- Que el administrador designado vea, en una sola página de Efeonce ID, quién de su organización
  está adentro o en camino, con el estado de entrega honesto (enviada, entregada, rebotó, no salió,
  con acceso, vencida, revocada).
- Que pueda invitar a una persona más (correo + motivo), reenviar una invitación abierta y revocar
  una invitación o un acceso de su propio binding, con confirmación explícita para lo destructivo.
- Que la consola sea un consumer más del mismo contrato que la lane MCP (Full API Parity): cero
  lógica propia, cero token en pantalla, fail-closed si la entrega del sistema no está habilitada
  en su runtime.
- Que el tope de asientos, el tope por hora y la ausencia de autoridad se vean como estados
  honestos con recuperación, no como errores genéricos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` — el emisor propio y su población externa.
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` — CSP, cookies `__Host-`, páginas server-rendered.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI es cliente del primitive, igual que el gateway.
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` — §Auth resilience y las reglas de TASK-1837 sobre el token.
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` — Composition Shell / Adaptive Card se evalúan y se declara por qué no aplican en este runtime.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — dirección visual, first fold, GVC premium, scorecard.
- `DESIGN.md` — tokens; el emisor los consume por el CSS generado (`styles.generated.ts`).

Reglas obligatorias:

- La consola NUNCA muestra un token, una URL `/i/<token>` ni un correo completo distinto del que el administrador acaba de escribir (`maskEmail`).
- La autoridad sale de la membership `designatedAdmin` resuelta por `(environment, subject)` de la sesión; el `?binding=` sólo elige entre memberships propias; ajeno ⇒ `denied` sin distinguir causa.
- Toda mutación es `POST` same-origin con CSRF del mecanismo existente de `src/lib/auth-server/persons/`; ningún `GET` muta; respuesta PRG (`303`).
- La consola invoca commands de `@/lib/identity/external-access` in-process (igual que `persons/adapters.ts`); no escribe en `store.ts`, no duplica reglas del dominio, no llama a la lane ecosystem por HTTP.
- Fail-closed: si `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` o la entrega del sistema no están habilitadas en el runtime del emisor, la página responde `unavailable`; jamás cae a `delivery:'manual'`.
- Copy es-CL en `src/lib/copy/auth-server.ts` (`org_console_*`), validado con `greenhouse-ux-writing`; nada inline en el HTML.
- Sin React, sin MUI, sin JavaScript en la página: mismas primitives HTML y CSP que TASK-1835.

## Normative Docs

- `docs/tasks/in-progress/TASK-1837-efeonce-id-external-invitation-delivery-delegated-authority.md` — contrato de la autoridad delegada, topes, códigos de error, desviaciones de ejecución.
- `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md` — evidencia viva de la lane delegada (200/403/422/201) y del correo real.
- `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` — flujo maestro; esta consola es su nodo nuevo S11.
- `docs/ui/wireframes/TASK-1835-efeonce-id-login-consent-screens.md` + `docs/ui/visual-directions/TASK-1835-efeonce-id-direction.md` — dirección «Nocturno editorial» y primitives del emisor que esta task extiende.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md` — gates de wireframe/flow y `UI ready`.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — filas de `EXTERNAL_INVITATION_*` (hoy runtime Vercel únicamente) y bloque «Auth server propio».

## Dependencies & Impact

### Depends on

- `TASK-1837` en producción: commands `issueDelegatedExternalInvitation`, `listDelegatedExternalInvitations`, `resolveDelegatedAuthority` (`src/lib/identity/external-access/commands.ts`), migración `20260906004450748` aplicada (columnas `delivery_*`).
- Prerrequisito declarado en `TASK-1837` §Follow-ups: commands delegados `resendDelegatedExternalInvitation` y `revokeDelegatedExternalInvitation` (envoltorios de `resendExternalInvitation` / `revokeExternalAccess` detrás de `resolveDelegatedAuthority`, con `invitation.bindingId === authority.membership.bindingId`, actor `external-admin:<profileId>`, audit con `delegated:true`) y sus verbos en la lane ecosystem. **No existen hoy**; esta task no los implementa.
- `TASK-1830` — sesión `__Host-efeonce_auth`, `resolvePersonSession`, `return_to`, CSRF (`src/lib/auth-server/persons/`).
- `TASK-1835` — `IdShell`/`IdCard`/`IdField`/`IdButton`/`IdStatus` y el harness `pnpm auth-server:dev-ui` (`scripts/auth-server/dev-ui-server.ts`).
- `services/auth-server/deploy.sh` — declaración de flags del runtime del emisor (destructivo `--set-env-vars`).

### Blocks / Impacts

- `TASK-1832` — la cohorte puede administrarse desde el navegador, no sólo por agentes.
- `TASK-1836` — decide si los administradores internos resuelven como `designatedAdmin` y si esta consola los sirve; recibe `## Delta` con la decisión del Slice 1.
- `TASK-1837` — recibe el prerrequisito (commands delegados + flag de entrega en el runtime del emisor) y el `Delta` con el resultado.
- `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` — suma el nodo S11.

### Files owned

- `src/lib/auth-server/oauth/pages/account-organization.ts` *(nuevo: render de la consola, confirmación, kinds `IdInvitationRow` e `IdSeatMeter`, variante `IdCard wide`)*
- `src/lib/auth-server/persons/account-organization.ts` *(nuevo: controlador sesión → autoridad → command → PRG)*
- `src/lib/auth-server/persons/pages.ts` (`PERSON_AUTH_PATHS.accountOrganization*`) y `src/lib/auth-server/persons/routes.ts` (`isPersonAuthPath` + despacho)
- `src/lib/auth-server/oauth/pages/styles.generated.ts` *(tokens nuevos de la variante `wide`, el medidor y las filas; regenerado desde el SSOT)*
- `src/lib/copy/auth-server.ts` (`org_console_*`)
- `scripts/auth-server/dev-ui-server.ts` (fixtures de la consola)
- `scripts/frontend/scenarios/task1838-client-admin-console.scenario.ts` *(nuevo)*
- `services/auth-server/deploy.sh` (`AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED`)
- `docs/ui/wireframes/TASK-1838-client-admin-console.md`, `docs/ui/flows/TASK-1838-client-admin-console-flow.md`, `docs/ui/visual-directions/TASK-1838-client-admin-console-direction.md` *(nuevo)*, `docs/ui/reviews/TASK-1838-client-admin-console.scorecard.json` *(nuevo)*
- `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` (nodo S11)
- `docs/documentation/identity/` + `docs/manual-de-uso/identity/` (consola del administrador del cliente)

## Current Repo State

### Already exists

- Contrato gobernado y verificado: `issueDelegatedExternalInvitation` (auto-elevación 422, tope de asientos 422, tope por hora 429, actor `external-admin:<profileId>`), `listDelegatedExternalInvitations` (sólo el binding propio), `resolveDelegatedAuthority` (403 anti-oráculo) — `src/lib/identity/external-access/commands.ts`; lane `src/lib/api-platform/resources/ecosystem-identity-invitations.ts` + `src/app/api/platform/ecosystem/identity/invitations/route.ts`.
- Entrega del sistema con ciclo de vida: `delivery_status`/`delivery_attempts`/`last_delivery_at`/`last_delivery_error_code` en `external_member_invitations`; reenviar = rotar (3 por cadena); rebote proyectado por el ops-worker; `maskEmail` en `src/lib/identity/external-access/delivery.ts`; señales `identity.external_invitation.{undelivered,expired_unaccepted,token_revealed}`.
- Sesión de persona en el emisor (`resolvePersonSession`, cookie `__Host-efeonce_auth`, `return_to`), CSRF de formularios y consumo in-process de `acceptExternalInvitation` desde `src/lib/auth-server/persons/adapters.ts`: el auth-server ya bundlea el dominio y escribe en `greenhouse_core` sólo a través de sus commands (`src/lib/auth-server/boundary-domain.test.ts`).
- Primitives HTML del emisor y dirección «Nocturno editorial» implementada (`src/lib/auth-server/oauth/pages/render.ts`, `styles.generated.ts`, `assets.ts`, `icons.ts`); harness visual `pnpm auth-server:dev-ui` con rutas fijas de fixture.
- Copy del emisor en `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER`), incluido `error_correlation` y los ids de invitación de TASK-1830.

### Gap

- No existe ninguna página del emisor bajo sesión de persona más allá de `/session` y las de autenticación; `PERSON_AUTH_PATHS` no tiene rutas `account/*`.
- No existen commands delegados de reenvío ni de revocación; la lane ecosystem sólo tiene `GET`/`POST`.
- `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` se declara y se lee sólo en Vercel; el runtime del emisor no lo tiene y `readExternalInvitationConfig()` allí lo vería OFF (entrega manual ⇒ token), exactamente lo que esta consola no puede permitir.
- No hay dirección aprobada para la composición lista + formulario + acciones por fila dentro del `IdShell`; sólo existen pantallas de una decisión.
- Los kinds `IdInvitationRow` e `IdSeatMeter` y la variante `IdCard wide` no existen; el CSS generado no tiene tokens para una lista.
- El flujo maestro EPIC-044 declara la gestión de la organización como «task futura» y no tiene el nodo S11.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `services/auth-server` (Cloud Run, runtime `node:http`) con render en `src/lib/auth-server/oauth/pages/**`, controlador en `src/lib/auth-server/persons/**` y commands en `src/lib/identity/external-access/**`
- Future candidate home: `worker`
- Boundary: la página consume `resolvePersonSession`, `resolveExternalAccess`, `listDelegatedExternalInvitations`, `issueDelegatedExternalInvitation` y los commands delegados de reenvío/revocación; consumers autorizados de la página: sólo el navegador de la persona con sesión del emisor
- Server/browser split: render completo en servidor (`render*(input) → string`); el navegador recibe HTML sin JavaScript; ningún store, secreto ni SDK cruza al cliente
- Build impact: none — mismo bundle del auth-server; tokens nuevos regenerados en `styles.generated.ts` desde el SSOT
- Extraction blocker: sesión y CSRF del emisor (`__Host-efeonce_auth`) y acceso PG del auth-server a `greenhouse_core` vía los commands del dominio; la consola no puede vivir fuera del proceso que verifica esa cookie

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona externa con sesión en Efeonce ID que es `designated_admin_profile_id` de ≥ 1 binding de su organización cliente.
- Momento del flujo: después de entrar (S8 sesión iniciada) o al abrir la URL directa; también al volver tras recibir un rebote o al agotar asientos.
- Resultado perceptible esperado: en un vistazo sabe cuántos asientos le quedan, quién está adentro o en camino y si algún correo no llegó; en una acción invita a alguien más y recibe confirmación honesta.
- Friccion que debe reducir: escribirle a Efeonce para cada alta, reenvío o baja; no saber si la invitación llegó.
- No-goals UX: administrar permisos/scopes (los grants los define Efeonce), designar otros administradores (422 por contrato), ver o copiar tokens, gestionar dispositivos o passkeys de terceros.

### Surface & system decision

- Surface: `auth.efeonce.org/account/organization` (auth-server, HTML server-rendered bajo `__Host-efeonce_auth`); entrada desde S8 «Sesión iniciada» sólo cuando hay autoridad.
- Nav placement: `none` — la consola NO es un destino del portal Greenhouse (ni sidebar, ni avatar, ni ⌘K): la persona externa no tiene sesión NextAuth ni `client_users`, y el contrato de `NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md` gobierna el rail del portal, no el emisor. Su único punto de entrada es el enlace condicional en la pantalla de sesión del emisor (S8) y la URL directa.
- Composition Shell: `no aplica` — el runtime es `node:http` sin React: `CompositionShell` no es ejecutable ahí. Se evaluó primero (regla de UI Platform) y se registra la excepción: la consola usa la gramática de regiones del `IdShell` del emisor (marca / tarjeta / pie), que es el substrato sancionado para Efeonce ID por TASK-1835.
- Primitive decision: `extend` — kinds `IdInvitationRow open|linked|closed` (modo `stacked` bajo 40rem) e `IdSeatMeter`, variante `IdCard wide`, dentro de `src/lib/auth-server/oauth/pages/`; ninguna primitive paralela ni React.
- Adaptive density / The Seam: `no aplica` — sin `card-density`/framer en este runtime; la adaptación al ancho se resuelve con container query CSS en el CSS generado (`IdInvitationRow stacked`), con la misma regla de condensación honesta (el correo enmascarado y el estado NUNCA desaparecen).
- Floating/Sidecar/Dialog decision: ninguno; la confirmación de revocación es una página de decisión en la misma ruta (`?confirm=revoke`), sin modal ni JavaScript.
- Copy source: `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER.org_console_*`).
- Access impact: `none` en el modelo del portal (sin `routeGroups`/`views`/entitlements): la autoridad es la membership `designatedAdmin` del emisor; flag `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` (runtime auth-server) gatea la superficie.

### State inventory

- Default: cabecera de organización + medidor de asientos + formulario + lista con filas (`ready`).
- Loading: no existe en cliente (render de servidor, POST sin JavaScript); la señal de progreso es la del navegador. Documentado para que nadie agregue un spinner.
- Empty: `org_console_list_empty` + la fila del propio administrador con badge; formulario habilitado.
- Error: `org_console_error_generic` con `correlationId` (`role=alert`); enlace de vuelta.
- Degraded / partial: filas `failed`/`bounced` con `IdStatus warning` y «Reenviar» en la fila; `unavailable` cuando el flag o la entrega del sistema están OFF en el runtime (sin formulario).
- Permission denied: `denied` («No administras ninguna organización»), sin PII, sin distinguir causa; `?binding=` ajeno cae aquí.
- Long content: lista de hasta `delegatedSeatLimit` (25 por defecto) filas más las cerradas; sin paginación en V1, orden `issued` → `linked` → cerradas, cada grupo por fecha descendente; las cerradas (`revoked`/`expired`) van en un `<details>` colapsado.
- Mobile / compact: una columna; filas apiladas (`stacked`); botones a ancho completo con área ≥ 44 px; sin scroll horizontal.
- Keyboard / focus: foco inicial en el `h1`; tras `?result=` en la región de estado; tras `invalid_input` en el campo; en la confirmación, «Volver sin cambios» antes que «Sí, revocar» en el DOM.
- Reduced motion: sin transiciones ni animación del medidor.

### Interaction contract

- Primary interaction: escribir correo (+ motivo) y activar «Invitar» → `POST` → `303 ?result=sent|not_sent|exists|seats|hourly`.
- Hover / focus / active: estados CSS Tier 1 del CSS generado (mismos que `IdButton` en TASK-1835); foco visible de 2 px por token.
- Pending / disabled: «Invitar» deshabilitado sólo en `seat_cap` (razón visible al lado); «Reenviar» ausente en filas no `issued`; sin doble submit (PRG).
- Escape / click-away: sin overlays; no aplica.
- Focus restore: tras PRG el foco va a la región de estado (`tabindex=-1`), luego `Tab` sigue al formulario.
- Latency feedback: ninguna en cliente; el servidor responde el `303` en el mismo request que el command (envío de correo incluido, como en la ruta admin de TASK-1837).
- Toast / alert behavior: una sola región viva; éxitos `role=status`, fallos `role=alert`; ningún toast flotante.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: sin entrada animada (coherente con las pantallas de decisión del emisor).
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: transiciones Tier 1 de hover/focus con los tokens `short` del CSS generado; nada más.
- Reduced-motion fallback: las transiciones Tier 1 se apagan bajo `prefers-reduced-motion`.
- Non-goal motion: animación del medidor de asientos, aparición escalonada de filas, confirmaciones animadas.

### Implementation mapping

- Route / surface: `GET /account/organization[?binding=][&confirm=revoke&invitation=][&result=]`, `POST /account/organization/invitations`, `POST /account/organization/invitations/<id>/resend`, `POST /account/organization/invitations/<id>/revoke` en `services/auth-server`; rutas en `PERSON_AUTH_PATHS` + `isPersonAuthPath`.
- Primitive / variant / kind: `IdShell` · `IdCard wide` · `IdSeatMeter` · `IdField email|text` · `IdButton primary|secondary|link` · `IdStatus info|success|warning|neutral` · `IdInvitationRow open|linked|closed` (`stacked` bajo 40rem).
- Component candidates: `src/lib/auth-server/oauth/pages/account-organization.ts` (render), `src/lib/auth-server/persons/account-organization.ts` (controlador), fixtures en `scripts/auth-server/dev-ui-server.ts`.
- Copy source: `src/lib/copy/auth-server.ts` (`org_console_*`).
- Data reader / command: `resolvePersonSession` → `resolveExternalAccess` → `listDelegatedExternalInvitations` (lectura); `issueDelegatedExternalInvitation` con `delivery:'system'` (escritura); commands delegados de reenvío/revocación (prerrequisito TASK-1837).
- API parity: mismo contrato que `GET/POST /api/platform/ecosystem/identity/invitations` (+ `resend`/`revoke` que TASK-1837 agrega a la lane en el mismo Delta); la consola no crea rutas en Greenhouse.
- Access / capability: membership `designatedAdmin` por `(environment, subject)`; flags `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` + `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` en `services/auth-server/deploy.sh` (fail-closed).
- States to implement: ready, empty, partial, error, denied, seat_cap, rate_limited, invalid_input, revoke_confirm, unavailable, unauthenticated (redirect).

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1838-client-admin-console.scenario.ts`
- Route: harness `pnpm auth-server:dev-ui` (rutas fijas de fixture: `/account/organization`, `/empty`, `/partial`, `/seat-cap`, `/denied`, `/unavailable`, `/revoke-confirm`, `/rate-limited`); runtime real en staging con el binding de prueba de TASK-1837.
- Viewports: 1440×1000 y 390×844.
- Quality profile: `premium`
- Required steps: ready → invitar (`sent`) → repetido (`exists`) → partial → reenviar (`resent`) → revocar → confirmación → `revoked` → seat_cap → rate_limited → denied → unavailable.
- Required captures: 11 estados × 2 viewports + foco tras cada PRG + reduced-motion.
- Required `data-capture` markers: `id-shell`, `id-org-header`, `id-org-seats`, `id-org-invite-form`, `id-org-status`, `id-org-list`, `id-org-row-actions`, `id-org-revoke-confirm`.
- Assertions: `scrollWidth === clientWidth`; ningún frame con token, `/i/` ni correo completo ajeno; «Invitar» deshabilitado en seat_cap con razón visible; orden DOM de la confirmación; CSP `script-src` sin `unsafe-inline`; axe sin violaciones serias.
- Scroll-width checks: en las 22 capturas.
- Reduced-motion / focus evidence: misma secuencia con la preferencia activada; orden de tabulación en el dossier.
- Review dossier: `pnpm fe:capture:review task1838-client-admin-console`.
- Baseline decision / surface ID: baseline nuevo `efeonce-id-account-organization` derivado de `efeonce-id` (TASK-1835); repo-native, sin surface ID de Figma.

### Design decision log

- Decision: página server-rendered del emisor, una tarjeta ancha (cabecera + medidor + formulario + lista), acciones por `POST` con CSRF y PRG, confirmación de revocación en la misma ruta; commands delegados in-process.
- Alternatives considered: consola en el portal Greenhouse (`/my/organization`) — rechazada por exigir una segunda identidad; SPA sobre la lane del gateway — rechazada (JS, CSP laxa, salto sin beneficio); tabla HTML — rechazada por no apilarse con honestidad en 390 px; modal de confirmación — rechazada (sin JS; «una decisión por pantalla»); acciones por `GET` — rechazada (prefetch/escáner mutaría).
- Why this pattern: cero secretos en el navegador, paridad real con la lane MCP, cada estado es una URL verificable, recargar nunca repite un envío, misma legitimidad visual que el consentimiento.
- Reuse / extend / new primitive: `extend` (kinds `IdInvitationRow`, `IdSeatMeter`; variante `IdCard wide`).
- Open risks: composición sin dirección aprobada (Slice 1); commands delegados de reenvío/revocación inexistentes (TASK-1837); flag de entrega Vercel-only vs runtime del emisor (multi-runtime + ledger); población de administradores internos (TASK-1836).

### Visual verification

- GVC scenario: `task1838-client-admin-console`
- Viewports: 1440×1000 y 390×844.
- Required captures: los 11 estados en ambos viewports, foco tras PRG, reduced-motion.
- Required `data-capture` markers: los ocho declarados arriba.
- Scroll-width check: `document.documentElement.scrollWidth === clientWidth` en cada captura.
- Accessibility/focus checks: orden de tabulación, `role=status|alert`, `role=meter`, contraste ≥ 4.5:1, axe.
- Before/after evidence: antes = no existe la superficie (captura de `/session` sin enlace); después = dossier completo.
- Known visual debt: ninguna declarada; la lista no pagina en V1 (tope de 25 asientos hace innecesario paginar).
- Visual scorecard: `docs/ui/reviews/TASK-1838-client-admin-console.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5` (estándar premium; más exigente que el mínimo del addendum)

## Backend/Data Contract

Contrato de CONSUMO, no una segunda implementación backend. El dominio `identity` activa este addendum por
sensibilidad; `Backend impact` permanece `none` porque esta task no crea ni modifica commands, readers, tablas,
migraciones, rutas de Greenhouse ni eventos: pinta sobre contratos que ya existen (TASK-1837) o que TASK-1837
agrega como prerrequisito suyo. Si durante Discovery aparece la necesidad de un command nuevo, se escribe como
`## Delta` en TASK-1837 (dueña de `src/lib/identity/external-access/**`), nunca dentro de esta task.

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: ninguno — consumo in-process de commands existentes desde el runtime del emisor
- Source of truth afectado: ninguno se modifica; se lee `greenhouse_core.external_member_invitations` a través de `listDelegatedExternalInvitations` y se escribe sólo a través de `issueDelegatedExternalInvitation` y los commands delegados de reenvío/revocación (prerrequisito de TASK-1837)
- Consumidores afectados: sólo la página nueva del auth-server; la lane ecosystem y las rutas `api/admin/**` no cambian
- Runtime target: auth-server (Cloud Run) en staging y producción

### Contract surface

- Contrato existente a respetar: `IssueExternalInvitationResult` (`delivery` sin `token` para esta superficie), `ExternalMemberInvitation` (`deliveryStatus`, `deliveryAttempts`, `expiresAt`, `linkedAt`, `revokedAt`), `ExternalAccessError` (`forbidden`, `limit_reached`, `rate_limited`, `invitation_not_open`, `invalid_request`), `resolvePersonSession` + CSRF de `src/lib/auth-server/persons/`, `readExternalInvitationConfig`
- Contrato nuevo o modificado: ninguno en Greenhouse; rutas HTML nuevas del emisor (`/account/organization*`) que son adapters de los commands
- Backward compatibility: `not applicable` — superficie nueva detrás de `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED`
- Full API parity: la consola y la lane `GET/POST /api/platform/ecosystem/identity/invitations` son dos consumers del mismo primitive; los verbos `resend`/`revoke` nacen en TASK-1837 como command + lane antes de que esta task los pinte

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna con cambio de schema; lectura/escritura sólo vía commands
- Invariantes que no se pueden romper:
  - el controlador nunca lee `token` del resultado ni pasa `delivery:'manual'`;
  - la autoridad sale de `resolveDelegatedAuthority` con la sesión `(environment, subject)`, nunca del query string;
  - ningún `GET` muta; todo `POST` lleva CSRF.
- Write-target allowlist: sin tablas nuevas; el boundary test `src/lib/auth-server/boundary-domain.test.ts` sigue exigiendo que el auth-server no escriba `greenhouse_core` fuera de los commands del dominio (se extiende su allowlist de commands si la regla lo pide)
- Tenant/space boundary: `bindingId` → `organizationId` resuelto por la membership de la persona; el `?binding=` sólo elige entre memberships propias
- Idempotency/concurrency: PRG (`303`) evita reenvíos por recarga; la idempotencia de los commands es la de TASK-1837 (tope por hora, `FOR UPDATE` en rotación)
- Audit/outbox/history: la producen los commands (`invitation_issued` con `delegated:true`, `invitation_resent`, `invitation_revoked`); la UI no emite nada

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF` (`AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED=false` en `services/auth-server/deploy.sh`)
- Backfill plan: sin backfill
- Rollback path: flag OFF + `Auth Server Deploy` (o revert PR)
- External coordination: declarar `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` en `services/auth-server/deploy.sh` (prerrequisito de TASK-1837) y la fila del flag nuevo en el ledger

### Security and access

- Auth/access gate: sesión `__Host-efeonce_auth` activa + membership `designatedAdmin`; CSRF por formulario
- Sensitive data posture: PII (correos) enmascarada con `maskEmail`; ningún token ni URL `/i/` en el HTML
- Error contract: `ExternalAccessError` → `?result=` con copy `org_console_*`; excepciones a `captureWithDomain(err, 'identity', …)` con `correlationId` visible
- Abuse/rate-limit posture: la del dominio (20 acciones por binding/hora, 3 reenvíos por cadena, tope de asientos); la consola no agrega ni relaja topes

### Runtime evidence

- Local checks: tests de render como string y del controlador (sesión, CSRF, `denied`, cada `result`)
- DB/runtime checks: lectura de `external_member_invitations` tras cada acción en staging (estado, `delivery_attempts`, `revoked_at`)
- Integration checks: correo real a `delivered@resend.dev` / `bounced@resend.dev` desde la consola en staging; token rotado rechazado por `accept`
- Reliability signals/logs: `identity.external_invitation.{undelivered,expired_unaccepted}` sin cambio; readback del flag en la revisión activa del auth-server
- Production verification sequence: la de `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Sin tablas nuevas; el boundary test del auth-server sigue verde con la consola incluida.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Dirección de la composición y nodo S11

- `docs/ui/visual-directions/TASK-1838-client-admin-console-direction.md`: comparar 2–3 composiciones para lista + formulario + acciones dentro del `IdShell` (tarjeta ancha única · dos tarjetas apiladas · formulario en cabecera con lista debajo) con capturas del harness en 1440 y 390; elegir una y registrar token mapping y anti-patrones.
- Copy `org_console_*` en `src/lib/copy/auth-server.ts` validado con `greenhouse-ux-writing` (sin implementar HTML todavía).
- Nodo `S11 · Consola de la organización` agregado a §3 y §4 de `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md`; decisión escrita sobre la población admitida (externa; interna sólo si TASK-1836 lo confirma) como `## Delta` en TASK-1836.
- Verificar que el prerrequisito de TASK-1837 (commands delegados de reenvío/revocación + flag de entrega declarado en `services/auth-server/deploy.sh`) esté mergeado; si no, la task queda `Blocked by` y no avanza al Slice 2.

### Slice 2 — Primitives y render (lectura)

- `IdCard wide`, `IdSeatMeter`, `IdInvitationRow open|linked|closed` (+ `stacked`) en `src/lib/auth-server/oauth/pages/account-organization.ts`; tokens en `styles.generated.ts` regenerados desde el SSOT.
- `GET /account/organization` con sesión → autoridad → `listDelegatedExternalInvitations` → render de `ready`/`empty`/`partial`/`seat_cap`/`denied`/`unavailable`; `?binding=` entre memberships propias; enlace condicional en la pantalla de sesión (S8).
- Flag `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` (default `false`) en `services/auth-server/deploy.sh` + fila en `FEATURE_FLAG_STATE_LEDGER.md`; fail-closed si la entrega del sistema no está habilitada en el runtime.
- Tests de render como string (`account-organization.test.ts`): sin token, sin `/i/`, correos enmascarados, estados, `role=meter`.
- Fixtures del harness y primer first fold capturado (1440 + 390) revisado antes de seguir.

### Slice 3 — Acciones (invitar, reenviar, revocar) con PRG

- `POST /account/organization/invitations` → `issueDelegatedExternalInvitation` con `delivery:'system'` → `303 ?result=`; `invalid_input` re-render sin PRG; mapeo de `ExternalAccessError` a `result` (`exists`, `seats`, `hourly`, `not_open`, `exhausted`).
- `POST …/<id>/resend` y `POST …/<id>/revoke` sobre los commands delegados; pantalla `?confirm=revoke`.
- CSRF en los tres formularios con el mecanismo existente; tests del controlador (sesión ausente → 302, CSRF inválido → 403, binding ajeno → `denied`, cada `result`).
- Manual `docs/manual-de-uso/identity/consola-administrador-cliente.md` + doc funcional en `docs/documentation/identity/`.

### Slice 4 — GVC premium, staging y cierre

- Scenario `task1838-client-admin-console` completo: 11 estados × 2 viewports + foco + preferencia de movimiento reducido del sistema; dossier y scorecard ≥ 4.5.
- Staging: flag ON en el auth-server (deploy.sh + `Auth Server Deploy`), binding de prueba de TASK-1837 con la persona sintética re-invitada como administradora; recorrido real invitar → correo → reenviar → revocar; evidencia en `docs/audits/`.
- Delta en TASK-1837, TASK-1836 y TASK-1832; cierre documental (`greenhouse-documentation-governor`) y QA (`greenhouse-qa-release-auditor`).

## Out of Scope

- Los commands delegados de reenvío y revocación y sus verbos en la lane ecosystem: prerrequisito de `TASK-1837` (dueña de `src/lib/identity/external-access/**`), no de esta task.
- Designar otros administradores desde la consola (el contrato lo rechaza con 422; sólo Efeonce designa).
- Administrar grants/scopes, dispositivos, passkeys o consentimientos de terceros.
- Una consola en el portal Greenhouse para el equipo de Efeonce (las rutas `api/admin/**` ya existen; su UI es otra task).
- Paginación, búsqueda o filtros de la lista (tope de 25 asientos en V1).
- Cambiar el diseño de login/consentimiento (`TASK-1835`) o el flujo de autenticación (`TASK-1830`).
- La invitación del portal Greenhouse (`inviteClientPortalUser`) y su convergencia (`TASK-1839`).

## Detailed Spec

### Resolución de autoridad en la página

```text
GET /account/organization
  resolvePersonSession(cookie)            → no active  → 302 /login?return_to=/account/organization
  flags(consola, entrega del sistema)     → OFF        → 200 unavailable (sin formulario)
  resolveExternalAccess(env, subject)     → memberships.filter(designatedAdmin)
     0                                    → 200 denied
     1                                    → binding implícito
     n                                    → ?binding= ∈ propias → elegido; ∉ → 200 denied
  listDelegatedExternalInvitations(env, subject, bindingId) → filas
  asientos = count(status ∈ issued|accepted|linked) vs readExternalInvitationConfig().delegatedSeatLimit
  render(ready | empty | partial | seat_cap) con ?result= si viene
```

### Mapa `ExternalAccessError` → `?result=`

| Código del dominio | HTTP en la lane | `result` | Copy |
|---|---|---|---|
| — (`created:true`, `delivery.status='sent'`) | 201 | `sent` | `org_console_invite_sent` |
| — (`created:true`, `delivery.status='failed'`) | 201 | `not_sent` | `org_console_invite_not_sent` |
| — (`created:false`) | 200 | `exists` | `org_console_invite_exists` |
| `limit_reached` | 422 | `seats` | `org_console_limit_seats` |
| `rate_limited` (binding/hora) | 429 | `hourly` | `org_console_limit_hourly` |
| `rate_limited` (cadena de reenvíos) | 429 | `exhausted` | `org_console_resend_exhausted` |
| `invitation_not_open` | 409 | `not_open` | `org_console_error_generic` con referencia |
| `forbidden` | 403 | (render `denied`) | `org_console_not_admin_*` |
| `invalid_request` (correo) | 422 | (re-render inline) | `org_console_invalid_email` |

### Lo que la consola NUNCA hace

- Pasar `delivery:'manual'` ni leer `token` del resultado del command (el tipo lo trae para consumidores in-process; el controlador lo descarta y un test lo fija).
- Aceptar `designatedAdmin:true` en el formulario (no existe el campo).
- Mostrar `email` sin `maskEmail` en la lista (el correo completo sólo aparece en el `value` del campo tras un `invalid_input`).
- Mutar por `GET`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (dirección + S11 + verificación del prerrequisito) → Slice 2 (render de lectura, flag OFF) → Slice 3 (acciones) → Slice 4 (GVC + staging + cierre).
- Slice 3 NO empieza si los commands delegados de reenvío/revocación no están mergeados: sin ellos la consola sólo puede invitar, y una consola que lista sin poder revocar es una superficie a medias que nadie debe ver.
- El flag `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` se prende en staging sólo después de que `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` esté declarado y ON en `services/auth-server/deploy.sh` (multi-runtime).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La consola corre con la entrega del sistema OFF en el auth-server y el command cae a modo manual (token en el resultado) | identity | medium | Fail-closed: `unavailable` si el flag no está ON en el runtime; test que fija que el controlador nunca lee `token`; flag declarado en `deploy.sh` (destructivo) + ledger | `identity.external_invitation.undelivered` no cambia; el síntoma sería una invitación `not_attempted` creada desde actor `external-admin:*` — agregar assert al smoke |
| Un `?binding=` ajeno lista o muta otra organización | identity | low | La autoridad sale de `resolveDelegatedAuthority`; el query sólo elige entre memberships propias; test negativo | `identity.external_access.unbound_dispatch_attempt` (existente) + audit |
| Un `GET` con prefetch/escáner de correo revoca o reenvía | identity | low | Ningún `GET` muta; revocar exige `POST` con CSRF tras confirmación | audit `invitation_revoked` sin `POST` correlacionado — no signal, emerge en logs |
| CSRF ausente en un formulario nuevo | auth | low | Mismo mecanismo de `persons/`; test 403 por formulario | no signal — emerge en tests |
| La página expone correos completos o el token en un estado no previsto | identity | low | `maskEmail` en el render; assert GVC «ningún frame con token/`/i/`/correo completo»; test de string | no signal — emerge en GVC |
| Administradores internos (TASK-1836) resuelven como `designatedAdmin` y ven una consola pensada para externos | identity | medium | Decisión escrita en Slice 1 (filtrar por población o admitir); test por población | no signal — emerge en Delta de TASK-1836 |
| Deploy del auth-server con `--set-env-vars` borra el flag prendido a mano | cloud | medium | Declararlo en `deploy.sh` ANTES de prender; verificar en la revisión activa | readback `gcloud run services describe auth-server` |

### Feature flags / cutover

- `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` (nuevo; default `false`; runtime **auth-server únicamente**, `services/auth-server/deploy.sh`): OFF ⇒ `GET /account/organization` responde `unavailable` (200, sin formulario) y los `POST` responden 404; la pantalla de sesión no muestra el enlace. Fila nueva en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.
- `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` (existente, hoy Vercel-only): debe declararse TAMBIÉN en `services/auth-server/deploy.sh` (prerrequisito de TASK-1837); su fila del ledger pasa a decir «Vercel + auth-server».
- Sin flag en Greenhouse (Vercel): esta task no toca el portal.
- Cutover: staging con ambos flags ON en el auth-server → recorrido real → producción con el siguiente release del control plane (`Auth Server Deploy`) → 24 h de señales antes de anunciar a la primera organización.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir docs y copy; sin runtime | inmediato | si |
| Slice 2 | Flag `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED=false` en `deploy.sh` + `Auth Server Deploy` (o revert PR) | < 15 min (deploy del emisor) | si |
| Slice 3 | Mismo flag OFF: los `POST` responden 404; las invitaciones ya emitidas siguen su ciclo normal (revocables por Efeonce vía `api/admin/**`) | < 15 min | si — el estado creado se administra con los commands existentes |
| Slice 4 | Sin cambios de runtime propios; revertir evidencia/docs si se retira la feature | inmediato | si |

### Production verification sequence

1. Prerrequisito: TASK-1837 en `main` con flags ON en Vercel Production; commands delegados de reenvío/revocación mergeados; `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` declarado en `services/auth-server/deploy.sh`.
2. Staging: `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED=true` en `deploy.sh` + `Auth Server Deploy` → readback en la revisión activa.
3. Persona sintética (org fixture de TASK-1837) re-invitada como administradora → sesión → `GET /account/organization` 200 `ready`.
4. Invitar a `delivered@resend.dev` → `?result=sent` → fila `sent`; invitar a `bounced@resend.dev` → tras el drenaje del ops-worker la fila muestra `bounced` y `identity.external_invitation.undelivered` pasa a warning.
5. Reenviar la rebotada → `?result=resent`, `deliveryAttempts=2`; cuarto reenvío → `exhausted`.
6. Revocar → confirmación → `?result=revoked`; el medidor baja; el token de esa invitación rechaza `accept` (`invitation_not_open`).
7. Negativos: sesión de persona sin autoridad → `denied`; `?binding=` ajeno → `denied`; sin cookie → 302; `POST` sin CSRF → 403; flag OFF → `unavailable`.
8. GVC premium en staging (no sólo harness) para los estados alcanzables; dossier + scorecard.
9. Producción con el siguiente release; 24 h de `identity.external_invitation.*` y `auth.person.*` sin anomalías antes de anunciar a la primera organización real (TASK-1832).

### Out-of-band coordination required

- Deploy del auth-server (Cloud Run) por el control plane (`Auth Server Deploy`): el flag vive en `deploy.sh`, no en Vercel.
- Decisión del operador sobre la primera organización real que usará la consola (misma decisión pendiente de TASK-1837/TASK-1832).
- Aviso al equipo de Efeonce (People/Account) de que los clientes con administrador designado ya no necesitan escribir para altas/bajas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: flow`; `Wireframe` y `Flow` apuntan a `docs/ui/wireframes/TASK-1838-client-admin-console.md` y `docs/ui/flows/TASK-1838-client-admin-console-flow.md`, y ambos existen.
- [ ] `UI ready` permanece `no` hasta que exista `docs/ui/visual-directions/TASK-1838-client-admin-console-direction.md` con la composición elegida y `pnpm task:lint --task TASK-1838` pase sin hallazgos; si está en `yes`, el lint pasa.
- [ ] `Nav placement: none` declarado con razón (la consola no es destino del portal Greenhouse); ningún ítem nuevo en `GH_INTERNAL_NAV` ni en el rail.
- [ ] Full API Parity: la consola invoca sólo `listDelegatedExternalInvitations`, `issueDelegatedExternalInvitation` y los commands delegados de reenvío/revocación de `@/lib/identity/external-access`; `grep` sobre `src/lib/auth-server/**` no encuentra SQL sobre `external_member_invitations` ni lógica de topes/estados duplicada.
- [ ] El controlador nunca lee `token` del resultado del command ni pasa `delivery:'manual'`; un test lo fija y el assert GVC «ningún frame con token ni `/i/`» pasa en los 11 estados.
- [ ] Todos los correos de la lista se renderizan con `maskEmail`; el único correo completo visible es el `value` del campo tras `invalid_input`.
- [ ] Ningún `GET` muta: revocar y reenviar exigen `POST` con CSRF; sin CSRF → 403 (test por formulario); sin sesión → `302 /login?return_to=/account/organization`.
- [ ] `?binding=` ajeno y persona `bound` sin `designatedAdmin` responden `denied` sin distinguir causa (tests negativos); la autoridad sale de `resolveDelegatedAuthority`.
- [ ] Flag `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` declarado en `services/auth-server/deploy.sh` (default `false`) con fila en `FEATURE_FLAG_STATE_LEDGER.md`; con el flag OFF o la entrega del sistema OFF en el runtime, la página responde `unavailable` sin formulario (test).
- [ ] Los estados ready, empty, partial, error, denied, seat_cap, rate_limited, invalid_input, revoke_confirm y unavailable tienen copy `org_console_*` en `src/lib/copy/auth-server.ts` validado con `greenhouse-ux-writing`; ningún string visible inline en el HTML.
- [ ] La confirmación de revocación es una página propia (`?confirm=revoke&invitation=`), con «Volver sin cambios» antes que «Sí, revocar» en el DOM y foco inicial en el `h1`.
- [ ] `IdSeatMeter` expone `role=meter` con `aria-valuenow/min/max` y el número visible; en `seat_cap` «Invitar» está deshabilitado con `org_console_seats_full` al lado.
- [ ] GVC premium desktop 1440 + mobile 390 capturado y mirado para los 11 estados; dossier `pnpm fe:capture:review task1838-client-admin-console` y scorecard `docs/ui/reviews/TASK-1838-client-admin-console.scorecard.json` con promedio ≥ 4.5, piso ≥ 4 y fidelidad/resistencia a template ≥ 4.5.
- [ ] `document.documentElement.scrollWidth === clientWidth` en las 22 capturas; recorrido completo por teclado documentado en el dossier; axe sin violaciones serias; CSP `script-src` sin `unsafe-inline`.
- [ ] Sin efectos de movimiento más allá de los estados Tier 1 de hover/focus; apagados bajo la preferencia de movimiento reducido del sistema (captura de evidencia).
- [ ] Reuse/extend declarado: nacen sólo los kinds `IdInvitationRow` e `IdSeatMeter` y la variante `IdCard wide` dentro de `src/lib/auth-server/oauth/pages/`; ninguna primitive React/MUI paralela.
- [ ] Nodo S11 agregado a `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` §3 y §4; `## Delta` en TASK-1836 (población admitida), TASK-1837 (prerrequisito consumido) y TASK-1832 (consola disponible).
- [ ] Recorrido real en staging (invitar → correo → reenviar → revocar) con evidencia fechada en `docs/audits/`; manual en `docs/manual-de-uso/identity/` y doc funcional en `docs/documentation/identity/`.

## Verification

- `pnpm local:check` (lint + typecheck + gates) y `pnpm test src/lib/auth-server src/lib/identity/external-access`.
- `pnpm task:lint --task TASK-1838`, `pnpm ui:wireframe-check --task TASK-1838`, `pnpm ui:flow-check --task TASK-1838`, `pnpm ui:readiness-check --task TASK-1838`.
- `pnpm auth-server:dev-ui` → first fold 1440/390 revisado antes del Slice 3.
- `pnpm fe:capture task1838-client-admin-console --env=staging` + `pnpm fe:capture:review task1838-client-admin-console`; `pnpm ui:quality` sobre el scorecard.
- `pnpm flags:audit --strict --no-vercel` (fila del flag nuevo en el ledger) y `pnpm docs:closure-check`.
- Readback del runtime: `gcloud run services describe auth-server` muestra `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` en la revisión activa (staging y producción).
- `pnpm identity:external-access:smoke` (read-only) tras el recorrido en staging: señales sin `unknown`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] El flag `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` con el estado real por runtime, y la fila de `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` declara «Vercel + auth-server».
- [ ] `greenhouse-documentation-governor` y `greenhouse-qa-release-auditor` ejecutados; si falta evidencia en staging/producción, el estado es `code complete, rollout pendiente`.

## Follow-ups

- Consola del equipo de Efeonce en el portal (`api/admin/identity/external-access/**` ya existe sin UI): task `ui-ux` aparte, con Nav placement en Admin Center.
- Paginación/búsqueda si algún cliente supera el tope de asientos por decisión comercial.
- Aviso por correo al administrador cuando una invitación rebota (hoy sólo lo ve al entrar a la consola).
- Convergencia con la invitación del portal: `TASK-1839`.

## Open Questions

- ¿Las acciones de escritura (invitar/revocar) exigen `authLevel: 'step_up'` cuando la persona tiene segundo factor enrolado, o basta la sesión primaria (12 h)? Propuesta: sesión primaria en V1 (revocar a alguien de su propia organización no es un scope de escritura MCP); registrar la decisión en el Slice 1 y alinearla con TASK-1833.
- ¿La consola sirve también a administradores internos (población `internal`, TASK-1836) o sólo a externos? Se decide en el Slice 1 con `## Delta` en TASK-1836.
- ¿El enlace desde S8 basta como único punto de entrada, o el correo de invitación al administrador debe mencionarlo? Decisión de copy con `greenhouse-ux-writing` en el Slice 1.
