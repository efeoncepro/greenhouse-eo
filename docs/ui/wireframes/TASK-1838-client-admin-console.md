# TASK-1838 — Efeonce ID: consola del administrador del cliente (wireframe)

## Meta

- Status: `draft`
- Owner task: TASK-1838
- Product Design asset: dirección visual heredada de Efeonce ID «Nocturno editorial» (aprobada e implementada por TASK-1835: `docs/ui/visual-directions/TASK-1835-efeonce-id-direction.md` + Delta 2026-09-05 del wireframe `docs/ui/wireframes/TASK-1835-efeonce-id-login-consent-screens.md`; render vivo en `src/lib/auth-server/oauth/pages/render.ts`). La COMPOSICIÓN de la consola (lista + formulario + acciones por fila) no tiene dirección propia todavía: el Slice 1 de la task la compara en `docs/ui/visual-directions/TASK-1838-client-admin-console-direction.md` antes de escribir HTML. Mientras esa comparación no exista, `UI ready` se queda en `no`.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: la persona externa que aceptó una invitación con `designated_admin=true` y hoy es `designated_admin_profile_id` de un binding (`greenhouse_core.external_organization_bindings`); el operador Efeonce sólo en pruebas y canaries (TASK-1832). NO la usa nadie con sesión NextAuth del portal Greenhouse.
- Copy source: `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER`, ids nuevos con prefijo `org_console_*`).
- Primitive decision: `extend` — reusa las primitives HTML del emisor (`IdShell`, `IdCard`, `IdStatus`, `IdButton`, `IdField` de TASK-1835, funciones `render*(input) → string` en `src/lib/auth-server/oauth/pages/`) y agrega DOS kinds nuevos dentro del mismo módulo: `IdInvitationRow` (fila de persona con estado + acciones) e `IdSeatMeter` (asientos usados / tope). Sin React, sin MUI: el runtime es `node:http` con CSP estricta.
- UI ready target: `no`

## Brief

Una página dentro de Efeonce ID, bajo la sesión `__Host-efeonce_auth` de la persona, donde el
administrador designado de una organización cliente **ve a su gente, invita, reenvía y revoca** sin
escribirle a Efeonce. Responde en este orden: **de qué organización** soy administrador (y cuántos
asientos me quedan), **quién está adentro o en camino** (lista con estado honesto de entrega), y
**qué puedo hacer ahora** (invitar a una persona más). Nunca muestra un token, nunca muestra un
correo completo ajeno al administrador más allá de lo que él mismo escribió, y nunca promete
«enviado» si el correo no salió.

La consola vive en `auth.efeonce.org/account/organization`, no en Greenhouse: la persona externa
no tiene `client_users` ni sesión NextAuth, y su única identidad es la del emisor. Todo lo que
la página hace pasa por los commands gobernados de TASK-1837 en el mismo proceso
(`listDelegatedExternalInvitations`, `issueDelegatedExternalInvitation`) más los dos commands
delegados que faltan (reenviar y revocar la invitación propia), que son prerrequisito de
`TASK-1837` y no de esta task.

## Desktop Target — 1440×1000

Conserva la columna centrada de las pantallas de decisión de Efeonce ID (consentimiento, sesión),
NO la composición dividida del login: es una pantalla de trabajo breve, no una bienvenida. Ancho
de lectura mayor que el consentimiento (la tabla necesita respirar), con tres bloques apilados en
una sola tarjeta clara sobre el campo de marca: (1) cabecera de organización con nombre, entorno
`auth.efeonce.org` y el medidor de asientos; (2) formulario de invitación en una línea (correo +
motivo opcional + botón); (3) lista de personas, una fila por invitación viva o persona ligada,
con estado de entrega, fecha y acciones por fila. Títulos Poppins 700, cuerpo y datos Geist con
`tabular-nums` para fechas y contadores. Las acciones destructivas (revocar) van en `IdButton
link` con confirmación en la misma página (segundo POST), nunca en un modal.

## Mobile Target — 390×844

Una columna. La cabecera de organización se compacta a nombre + medidor de asientos en una
línea. El formulario apila correo, motivo y botón a ancho completo. La lista se vuelve tarjetas
apiladas (`IdInvitationRow` en modo `stacked`): correo enmascarado arriba, estado de entrega como
etiqueta con icono + texto, acciones abajo con área táctil ≥ 44 px. Sin scroll horizontal:
`scrollWidth === clientWidth` en cada estado. Sin altura fija ni scroll interior.

## Action Hierarchy

- Primary: «Invitar» (envía `POST /account/organization/invitations`; el único primario de la página).
- Secondary: «Reenviar invitación» (por fila; `POST …/invitations/<id>/resend`), «Cambiar de organización» (sólo si la persona administra más de un binding), «Cerrar sesión» (pie).
- Destructive: «Revocar» (por fila) → segunda pantalla de confirmación en la misma ruta con el correo enmascarado y el efecto («La persona pierde el acceso a las herramientas conectadas de {org}») → «Sí, revocar». Sin modal, sin JavaScript.
- Selection vs action: elegir organización cambia el `?binding=` de la URL y re-renderiza; no muta nada.
- Pending / disabled: sin estado de carga en el cliente (POST sin JavaScript por CSP); el botón primario queda deshabilitado sólo cuando el tope de asientos o el tope por hora ya se alcanzó, con la razón visible al lado.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Campo de marca «Nocturno editorial» | mismo `IdShell` que consentimiento/sesión (degradado sobre la rampa azul AXIS generado en `styles.generated.ts`) | Continuidad con el resto de Efeonce ID | Un fondo distinto «porque es una consola» |
| Tarjeta clara centrada | `IdCard` con la variante de ancho `wide` (nueva, tokenizada en el CSS generado) | Ancho de lectura para la lista | `max-width` en px suelto |
| Medidor de asientos | `IdSeatMeter`: texto «7 de 25 asientos» + barra con `role=meter` | El tope es visible antes de chocar con él | Barra sin número; color como única señal |
| Estados de entrega (`state-design`) | `IdStatus` inline por fila: `info` (enviado), `success` (ligado), `warning` (rebotó / falló), `neutral` (revocada / vencida) | Estado nunca sólo por color | Chips de color sin texto |
| Tipografía | `typography-tokens.ts`: Poppins títulos, Geist cuerpo; `tabular-nums` en fechas y contador | Misma voz que el portal | `font-size` inline; monospace |
| Espaciado | escala 4n del SSOT en el CSS generado | Ritmo de tabla legible | `px` sueltos |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Brand header | Legitimidad: isotipo + «Efeonce ID» + `auth.efeonce.org` | `IdShell` | `GH_AUTH_SERVER.brand_title`, `brand_domain` |
| 1 | Organization header | Nombre de la organización, entorno, medidor de asientos, selector si hay varias | `IdCard` header + `IdSeatMeter` | `resolveExternalAccess(environment, subject).memberships` filtradas por `designatedAdmin`; `readExternalInvitationConfig().delegatedSeatLimit`; conteo `issued+accepted+linked` |
| 2 | Invite form | Correo (obligatorio) + motivo (opcional, ≤ 200) + «Invitar» | `IdField email` · `IdField text` · `IdButton primary` | `POST /account/organization/invitations` → `issueDelegatedExternalInvitation` |
| 3 | Result status | Resultado del último POST: enviada / no pudo enviarse / tope / error | `IdStatus` (`role=status` o `role=alert`) | `IssueExternalInvitationResult.delivery` |
| 4 | People list | Una fila por invitación viva y por persona ligada; estado, fecha, acciones | `IdInvitationRow` (kinds `open`, `linked`, `closed`) | `listDelegatedExternalInvitations` → `ExternalMemberInvitation[]` |
| 5 | Row actions | Reenviar (sólo `issued`), Revocar (`issued` o `linked`) | `IdButton secondary` · `IdButton link` | commands delegados de reenvío/revocación (prerrequisito TASK-1837) |
| 6 | Footer | Cerrar sesión, ayuda, privacidad | `IdShell` footer | `PERSON_AUTH_PATHS.logout`, `EFEONCE_URL_HTTPS` |

## Copy Ledger

Propuestas para `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER`), validadas con `greenhouse-ux-writing`
antes de implementar. Correos siempre enmascarados con `maskEmail` (`a***@cliente.cl`) salvo el
que el propio administrador acaba de escribir en el formulario.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| org_console_title | 1 | Tu organización en Efeonce | — | h1 |
| org_console_intro | 1 | Administras el acceso de {orgName} a las herramientas conectadas de Efeonce. | orgName | nuevo |
| org_console_seats | 1 | {used} de {limit} asientos | used, limit | `IdSeatMeter`; `tabular-nums` |
| org_console_seats_full | 1 | Alcanzaste el máximo de asientos. Para ampliarlo, escribe a tu contacto en Efeonce. | — | deshabilita «Invitar» |
| org_console_switch_label | 1 | Cambiar de organización | — | sólo con ≥ 2 bindings administrados |
| org_console_invite_title | 2 | Invitar a una persona | — | h2 |
| org_console_invite_email_label | 2 | Correo de trabajo de la persona | — | `autocomplete=off`, `inputmode=email` |
| org_console_invite_reason_label | 2 | Motivo (opcional) | — | ≤ 200 caracteres; visible para Efeonce en el audit |
| org_console_invite_cta | 2 | Invitar | — | primario |
| org_console_invite_hint | 2 | Le enviaremos un enlace válido por 72 horas. Al aceptarlo entra con su propio acceso, sin contraseña. | — | bajo el formulario |
| org_console_invite_sent | 3 | Invitación enviada a {maskedEmail}. | maskedEmail | `role=status` |
| org_console_invite_not_sent | 3 | Creamos la invitación pero el correo no salió. Puedes reintentar con «Reenviar invitación». | — | `role=alert`; NUNCA «enviada» |
| org_console_invite_exists | 3 | Esa persona ya tiene una invitación abierta. Reenvíala desde la lista. | — | `created:false` |
| org_console_limit_hourly | 3 | Hiciste muchas acciones en poco tiempo. Espera unos minutos y vuelve a intentarlo. | — | 429 `rate_limited` |
| org_console_limit_seats | 3 | No quedan asientos disponibles en {orgName}. | orgName | 422 `limit_reached` |
| org_console_invalid_email | 3 | Revisa el correo: no tiene un formato válido. | — | inline, `aria-describedby` |
| org_console_list_title | 4 | Personas de {orgName} | orgName | h2 |
| org_console_list_empty | 4 | Todavía no invitaste a nadie. La primera persona que invites aparecerá aquí. | — | empty |
| org_console_row_status_sent | 4 | Invitación enviada · vence {expiresAt} | expiresAt | `IdStatus info` |
| org_console_row_status_delivered | 4 | Invitación entregada · vence {expiresAt} | expiresAt | `IdStatus info` |
| org_console_row_status_failed | 4 | El correo no salió. Reenvía la invitación. | — | `IdStatus warning` |
| org_console_row_status_bounced | 4 | El correo rebotó. Revisa la dirección y reenvía. | — | `IdStatus warning` |
| org_console_row_status_linked | 4 | Con acceso desde {linkedAt} | linkedAt | `IdStatus success` |
| org_console_row_status_expired | 4 | Invitación vencida | — | `IdStatus neutral`; permite «Invitar de nuevo» |
| org_console_row_status_revoked | 4 | Acceso revocado el {revokedAt} | revokedAt | `IdStatus neutral`; sin acciones |
| org_console_row_admin_badge | 4 | Administra esta organización | — | fila propia; sin acciones sobre sí mismo |
| org_console_resend_cta | 5 | Reenviar invitación | — | sólo `issued`; máximo 3 por cadena |
| org_console_resend_done | 3 | Reenviamos la invitación a {maskedEmail}. El enlace anterior dejó de servir. | maskedEmail | reenviar = rotar |
| org_console_resend_exhausted | 3 | Ya reenviaste esta invitación el máximo de veces. Revócala y crea una nueva si hace falta. | — | 429 en la cadena |
| org_console_revoke_cta | 5 | Revocar | — | `IdButton link` |
| org_console_revoke_confirm_title | 5 | ¿Revocar el acceso de {maskedEmail}? | maskedEmail | segunda pantalla |
| org_console_revoke_confirm_body | 5 | La persona pierde el acceso a las herramientas conectadas de {orgName}. Podrás invitarla de nuevo más adelante. | orgName | — |
| org_console_revoke_confirm_cta | 5 | Sí, revocar | — | destructivo |
| org_console_revoke_cancel_cta | 5 | Volver sin cambios | — | — |
| org_console_revoke_done | 3 | Revocamos el acceso de {maskedEmail}. | maskedEmail | `role=status` |
| org_console_not_admin_title | — | No administras ninguna organización | — | denied |
| org_console_not_admin_body | — | Tu acceso a Efeonce está activo, pero la administración de personas la tiene otra persona de tu organización. | — | sin PII; sin decir quién |
| org_console_unavailable_title | — | La consola no está disponible por ahora | — | flag OFF en este runtime o entrega del sistema apagada |
| org_console_unavailable_body | — | Puedes seguir usando tu acceso. Para invitar personas, escribe a tu contacto en Efeonce. | — | degradación honesta |
| org_console_error_generic | 3 | No pudimos completar la acción. Referencia: {correlationId} | correlationId | reusa `error_correlation` |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Tu organización en Efeonce | Cabecera + formulario + lista con ≥ 1 fila | Invitar · Reenviar · Revocar | Foco inicial en el h1 |
| loading | Tu organización en Efeonce | La página es un render de servidor: no existe estado de carga en el cliente. Tras un POST, la única señal es la navegación del navegador (mismo criterio que TASK-1835). | — | Documentado para que nadie agregue un spinner |
| empty | Tu organización en Efeonce | Cabecera + formulario + `org_console_list_empty` | Invitar | La fila del propio administrador SÍ aparece (kind `linked` + badge) |
| partial | Tu organización en Efeonce | Lista con filas `failed`/`bounced` marcadas con `IdStatus warning` y su recuperación | Reenviar invitación | «Parcial» = hay gente en camino que no recibió el correo; nunca se oculta |
| error | No pudimos completar la acción | `org_console_error_generic` con referencia | Volver a la consola | Sin detalle interno; el `correlationId` es el del request |
| denied | No administras ninguna organización | `org_console_not_admin_body` | Cerrar sesión · Volver a la aplicación | Persona `bound` sin `designatedAdmin`; sin distinguir causa |
| seat_cap | Tu organización en Efeonce | `org_console_seats_full` junto al medidor lleno | Formulario visible con «Invitar» deshabilitado | El tope viene de `delegatedSeatLimit`; la razón está al lado del botón |
| rate_limited | Tu organización en Efeonce | `org_console_limit_hourly` en la región 3 | Reintentar más tarde | 429; sin contador exacto |
| revoke_confirm | ¿Revocar el acceso de {maskedEmail}? | `org_console_revoke_confirm_body` | Sí, revocar · Volver sin cambios | Misma ruta con `?confirm=revoke&invitation=<id>`; foco en el h1 |
| unavailable | La consola no está disponible por ahora | `org_console_unavailable_body` | Volver a la aplicación | `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED=false` o entrega del sistema apagada en el runtime del emisor: fail-closed, NUNCA modo manual con token |
| unauthenticated | (redirect) | Sin sesión → `302 /login?return_to=/account/organization` | — | Reusa el contrato de `return_to` de TASK-1830 |

## Accessibility Contract

- Heading order: `h1` «Tu organización en Efeonce»; `h2` «Invitar a una persona» y «Personas de {org}»; la cabecera de marca no es heading.
- Chart/table alternatives: la lista es `ul > li` semántica (no `table`): cada `li` lleva el correo enmascarado como texto principal y el estado como `IdStatus` con icono + texto; el medidor es `<div role="meter" aria-valuenow aria-valuemin aria-valuemax aria-label="Asientos usados">` con el número visible al lado.
- Aria labels: `main aria-labelledby=h1`; una sola región viva (`IdStatus` de la región 3, `role=status` para éxitos y `role=alert` para fallos); los botones por fila llevan texto visible + `aria-describedby` con el correo enmascarado («Reenviar invitación a a***@cliente.cl»).
- Focus notes: foco inicial en el `h1`; tras un POST con error de formulario, foco en el campo con `aria-invalid` + `aria-describedby`; tras un POST exitoso, foco en la región 3; en la confirmación de revocación, foco en el `h1` de la confirmación y «Volver sin cambios» antes que «Sí, revocar» en el DOM.
- Color-independent state labels: cada estado de entrega tiene texto e icono; los `warning` (rebotó / no salió) además llevan la acción de recuperación en la misma fila.
- Formularios: `label` explícito, `type=email`, `inputmode=email`, `autocomplete=off` (es el correo de otra persona, no el propio), `maxlength` del motivo, errores asociados por `aria-describedby`, `Enter` envía sólo el formulario de invitación (revocar exige activar el botón de confirmación).
- CSRF: cada formulario lleva el token del mecanismo existente de `src/lib/auth-server/persons/` (mismo que magic link / passkeys); un POST sin token es 403 sin render de datos.
- Contraste ≥ 4.5:1 en todos los estados sobre la tarjeta clara; foco visible de 2 px por token.

## Implementation Mapping

- Route / surface: `services/auth-server` (`auth.efeonce.org`): `GET /account/organization[?binding=<bindingId>][&confirm=revoke&invitation=<id>]` (HTML, exige sesión `__Host-efeonce_auth` con `status:'active'`), `POST /account/organization/invitations` (invitar), `POST /account/organization/invitations/<invitationId>/resend`, `POST /account/organization/invitations/<invitationId>/revoke`. Todas responden HTML (PRG: `303` de vuelta al `GET` con `?result=<code>`), `Cache-Control: no-store`, CSP idéntica al resto del emisor. Rutas nuevas en `src/lib/auth-server/persons/pages.ts` (`PERSON_AUTH_PATHS.accountOrganization*`) y handler en `src/lib/auth-server/persons/routes.ts` (o módulo hermano `account-routes.ts` si el archivo ya es demasiado largo).
- Primitive / variant / kind: `IdShell` + `IdCard wide` (variante nueva) + `IdField email|text` + `IdButton primary|secondary|link` + `IdStatus info|success|warning|neutral` + kinds nuevos `IdInvitationRow open|linked|closed` (modo `stacked` bajo 40rem) e `IdSeatMeter`. Todo como funciones `render*(input) → string` en `src/lib/auth-server/oauth/pages/` con tokens del CSS generado (`styles.generated.ts`).
- Component candidates: `src/lib/auth-server/oauth/pages/account-organization.ts` (render de la página + confirmación), `src/lib/auth-server/persons/account-organization.ts` (controlador: sesión → autoridad → command → PRG), fixtures del harness en `scripts/auth-server/dev-ui-server.ts` (`/account/organization`, `…/empty`, `…/partial`, `…/seat-cap`, `…/denied`, `…/unavailable`, `…/revoke-confirm`).
- Copy source: `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER.org_console_*`), validado con `greenhouse-ux-writing`.
- Data reader / command: lectura `resolveExternalAccess({ environmentId, subject })` (memberships con `designatedAdmin`) + `listDelegatedExternalInvitations({ environmentId, subject, bindingId })`; escritura `issueDelegatedExternalInvitation({ …, email, reason, delivery: 'system' })`; reenvío y revocación por los commands delegados que TASK-1837 agrega como prerrequisito (`resendDelegatedExternalInvitation`, `revokeDelegatedExternalInvitation`; ambos pasan por `resolveDelegatedAuthority` y verifican `invitation.bindingId === authority.membership.bindingId`). Todo in-process desde `@/lib/identity/external-access`, igual que `acceptExternalInvitation` en `persons/adapters.ts`.
- API parity: la consola es un consumer más del mismo contrato que la lane `GET/POST /api/platform/ecosystem/identity/invitations` (gateway MCP); cero lógica propia. Reenviar y revocar delegados nacen como command + lane ecosystem en TASK-1837 ANTES de que esta task los pinte.
- Access / capability: autoridad = membership `designatedAdmin` del binding resuelto por `(environment, subject)` de la sesión; nunca del query string (el `?binding=` sólo elige entre las memberships propias; ajeno ⇒ `denied` sin distinguir causa). Sin ROLE_CODES: las personas externas no los tienen. Flag `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` (default OFF, runtime auth-server, `services/auth-server/deploy.sh`) + `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` declarado TAMBIÉN en el runtime del emisor (hoy es Vercel-only): si la entrega del sistema no está habilitada en este runtime, la consola responde `unavailable`, jamás cae a `delivery:'manual'` (el token no existe para esta superficie).
- States to implement: ready, empty, partial, error, denied, seat_cap, rate_limited, revoke_confirm, unavailable, unauthenticated (redirect).
- Print/email/PDF considerations: no aplica; la única salida es HTML.
- GVC markers: `id-shell`, `id-org-header`, `id-org-seats`, `id-org-invite-form`, `id-org-status`, `id-org-list`, `id-org-row-actions`, `id-org-revoke-confirm`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1838-client-admin-console.scenario.ts` (nuevo al implementar).
- Route: harness local `pnpm auth-server:dev-ui` (`http://127.0.0.1:8787`) con rutas fijas de fixture (`/account/organization`, `/account/organization/empty`, `/partial`, `/seat-cap`, `/denied`, `/unavailable`, `/revoke-confirm`, `/rate-limited`); el harness sigue sirviendo fixtures ficticias sin autenticación, como en TASK-1835. Runtime real sólo en staging con el binding de prueba de TASK-1837 (org fixture `ZZZ Q2C Smoke Fixture`) y la persona sintética `jreyes+task1837@efeoncepro.com` re-invitada como administradora.
- Viewports: desktop 1440×1000 y mobile 390×844.
- Quality profile: `premium`.
- Required steps: ready → invitar (PRG con `result=sent`) → invitar correo repetido (`result=exists`) → partial (fila `bounced` + reenviar → `result=resent`) → revocar → confirmación → `result=revoked` → seat_cap → rate_limited → denied → unavailable.
- Required captures: cada estado en ambos viewports + foco visible tras cada POST + `prefers-reduced-motion`.
- Required `data-capture` markers: los ocho de arriba, registrados en el render antes de capturar.
- Assertions: `document.documentElement.scrollWidth === clientWidth` en todas; ningún frame contiene un token ni una URL `/i/`; ningún correo completo salvo el recién escrito; «Invitar» deshabilitado en `seat_cap` con la razón visible; el DOM de la confirmación lista «Volver sin cambios» antes que «Sí, revocar»; CSP `script-src` sin `unsafe-inline`; axe sin violaciones serias.
- Scroll-width checks: en las 22 capturas (11 estados × 2 viewports).
- Reduced-motion / focus evidence: misma secuencia con la preferencia activada; entrada de tarjeta sin transición; orden de tabulación registrado en el dossier.
- Review dossier: `pnpm fe:capture:review task1838-client-admin-console` obligatorio antes de pedir aprobación.
- Baseline decision / surface ID: baseline nuevo `efeonce-id-account-organization` derivado del baseline `efeonce-id` de TASK-1835 (repo-native; sin surface ID de Figma). Rebaseline sólo con decisión escrita en el dossier.

## Design Decision Log

- Decision: la consola es una página server-rendered del emisor, dentro del `IdShell` de Efeonce ID, con una sola tarjeta ancha (cabecera de organización + formulario + lista) y confirmación de revocación en la misma ruta; los commands se invocan in-process y la respuesta es PRG.
- Alternatives considered: (a) pantalla en el portal Greenhouse bajo `/my/organization` — rechazada: la persona externa no tiene sesión NextAuth ni `client_users`, y crearle una sería la segunda identidad que EPIC-044 prohíbe; (b) SPA sobre la lane ecosystem vía el gateway MCP — rechazada: segundo salto sin beneficio (el gateway existe para tools de agentes, no para navegadores), exige JS y CSP más laxa; (c) tabla HTML clásica — rechazada: no se apila con honestidad en 390 px; la lista semántica con `IdInvitationRow stacked` sí; (d) modal de confirmación para revocar — rechazada: sin JS por CSP y el patrón del emisor es «una decisión por pantalla».
- Why this pattern: una superficie, un contrato (el mismo que la lane MCP), cero secretos en pantalla, misma legitimidad visual que el consentimiento (la persona ya aprendió a confiar en esa tarjeta), y verificable como string en tests.
- Reuse / extend / new primitive: `extend` — dos kinds nuevos (`IdInvitationRow`, `IdSeatMeter`) y una variante (`IdCard wide`) dentro de las primitives HTML del emisor; ninguna primitive paralela.
- Open risks: la composición lista + formulario en una tarjeta no tiene dirección aprobada (Slice 1 la compara); los commands delegados de reenvío/revocación no existen todavía (prerrequisito en TASK-1837); el flag de entrega es Vercel-only hoy y la consola corre en el auth-server (multi-runtime, ledger); el Delta de TASK-1836 puede sumar administradores internos con otra población — la consola debe filtrar por `population='external'` o declarar que también los sirve.
- Follow-up: extender el flujo maestro `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` con el nodo S11 (esta consola) en el Slice 1.

## Acceptance Checklist

- [ ] Dirección de la composición comparada y elegida en `docs/ui/visual-directions/TASK-1838-client-admin-console-direction.md` (2–3 opciones, capturas del harness).
- [ ] Copy `org_console_*` en `src/lib/copy/auth-server.ts`, validado con `greenhouse-ux-writing`; correos enmascarados en todos los estados.
- [ ] GVC premium desktop + 390 px sobre los 11 estados con scorecard ≥ 4.5 y `scrollWidth === clientWidth`; ningún frame con token, URL `/i/` ni correo completo ajeno.
