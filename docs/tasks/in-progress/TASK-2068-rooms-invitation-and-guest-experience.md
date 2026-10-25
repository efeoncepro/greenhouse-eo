# TASK-2068 — Rooms: invitación, entrada con código y lectura compartida

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2068-rooms-invitation-and-guest-experience.md`
- Flow: `docs/ui/flows/TASK-2068-rooms-invitation-and-guest-experience-flow.md`
- Motion: `docs/ui/motion/TASK-2068-rooms-invitation-and-guest-experience-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `Contratos de recovery, gestión, delegación y coexistencia implementados con65 pruebas focalizadas PASS; backend2066 conserva151 previas. Readiness técnico para OTP y lectura textualV2; mediaR05 queda fuera del slice. UI en ejecución, sin aceptación visual ni rollout.`
- Rank: `TBD`
- Domain: `ui|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; efeonce-rooms main para runtime; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer operable desde Rooms el acceso ya construido: el administrador invita a un destinatario, un solo correo contiene enlace y código, y la persona entra el código en Rooms para leer la edición publicada. La entrega incluye recuperación, administración mínima de invitaciones y lectura de DTOs reales de PostgreSQL; el contenido autorizado en esta etapa sigue siendo sintético.

## Why This Task Exists

TASK-2066/2067 materializan la autoridad y el correo, pero Rooms sólo tiene pantallas de demostración. Conectar sus botones a servicios reales sin separar chrome, contenido y autoridad produciría rutas incorrectas, datos Nómada donde no corresponden y permisos derivados de una persona de demo. TASK-2059 conserva la primera experiencia y su aceptación visual; esta unidad posee el consumidor autenticado, sin duplicar issuer ni policy.

## Goal

- Completar el recorrido invitación → código → edición → salida/recovery en desktop y móvil.
- Gestionar creación, reemisión y revocación con permisos efectivos, revisión e idempotencia.
- Reutilizar La órbita, AXIS, lectura editorial y visores, conservando privacidad y fidelidad de las piezas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md`
- `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md`
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`

ADR vigente: OTP guest autentica una invitación limitada; no crea SSO ni membresía global. Cualquier delta a DTOs/entrega o selección explícita de sesión se acuerda con el dueño backend y se registra en el ADR antes de cambiar el contrato. Esta task no modifica la precedencia actual de cookies por su cuenta.

## Normative Docs

- `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`
- `docs/ui/visual-directions/TASK-2059-rooms-first-experience-direction.md`
- `docs/ui/visual-directions/TASK-2068-rooms-invitation-and-guest-experience-direction.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`

## Dependencies & Impact

### Depends on

- TASK-2065: consumer OIDC interno y selección de contexto, implementación local complete.
- TASK-2066: contrato Rooms de invitaciones, grants guest, cookies y API/CLI.
- TASK-2067: issuer OTP S2S y correo único gobernado; sin invocar un mailer desde UI.
- TASK-2062: publicación/DTO V1 y V2, incluidos perfiles independientes y evidencia declarada.
- TASK-2059: componentes, tokens, assets oficiales y regresiones del demo existentes.

### Blocks / Impacts

- EPIC-052 R04: recorrido humano de acceso. No cierra autoría, uploads, tours ni rollout real.
- La apertura pública de datos reales necesita infraestructura, entrega media, canary y autorización de release propias.

### Files owned

Paths runtime relativos a `../efeonce-rooms`; docs permanecen aquí.

- `src/app/invite/page.tsx`, `src/app/rooms/page.tsx`, `src/app/rooms/[roomId]/invitations/page.tsx`, `src/app/rooms/[roomId]/editions/[editionId]/page.tsx` y estados de esas rutas.
- `src/components/invitations/**`, `src/components/guest-session-boundary.tsx`, `src/components/room-reader.tsx`, `src/components/content/**`.
- Extracción acotada de `src/components/brand.tsx`, `room-experience.tsx`, `state-surface.tsx` y `room-motion.tsx`; mantener regresión demo.
- `src/lib/copy/invitations.ts`, `src/styles/invitations.css`; adapter SSR de presentación bajo `src/server/presentation/**`, sin policy/SQL.
- Tests UI/contratos de consumo y escenario GVC `scripts/frontend/scenarios/rooms-invitations.scenario.ts` en Greenhouse.
- Task, plan, wireframe, flow, motion y dossier TASK-2068.

Fuera de ownership: issuer, session/authority, migraciones, reglas de grants y DTOs canónicos. Sus cambios pequeños son dependencias coordinadas con TASK-2066/2062, no implementaciones escondidas en la vista.

## Current Repo State

### Already exists

- `src/server/invitations/http.ts`: start/verify/resend/session/logout; transacción y sesión guest HttpOnly, código sólo S2S, errores genéricos.
- `src/server/http/runtime.ts`: commands create/reissue/revoke y listado por room; paridad CLI/API.
- `src/server/persistence/content-projection.ts`: DTO de audiencia V1/V2 filtrado por can.
- AXIS Button, Badge, Dialog, Tabs, Field/Input/Checkbox y forms.css instalados; marca oficial y motion con reduced motion.

### Readiness resuelta 2026-10-25

- GET `/api/invitations/transaction` recupera la transacción sin PII ni envío, con entryGate por presencia de cookie interna. Verify devuelve409 antes del issuer si requiere salida interna explícita.
- GET `/api/v1/rooms/:roomId/invitations/management?organizationId=...` exige access.read sobre room y devuelve serverNow/organizationId/roomId/revision/currentEditionId, permissions canRead/canManage, issuance enabled/capabilities/maxTtlSeconds/maxExpiresAt/capabilityExpiresAt/unavailableReason y lista con recipientEmail/actions autorizados.
- Writer/reader comparten helper de autoridad persistida; sesión vigente autoriza y principal/membresía/grants fijan techo hasta24h. Revoke/list conservados con emisiónOFF; no simular can desde el rol.
- Session guest incluye initialEditionId autorizado. Sesión interna conserva precedencia; salida explícita revoca durable incluso con loginOFF y reporta503 si falla persistencia.
- TASK2066/2067 siguen abiertos por rollout/cierre, no por ausencia de estos contratos locales.65 pruebas focalizadas backend PASS, cero skips; suite completa del corte previo151PASS.
- MediaR05 no bloquea entrada y lectura textualV2. Renderizar editorial/diagnostic/plan/evidencia real; media sin entrega autorizada muestra indisponibilidad explícita. No sustituir por assets Nómada ni declarar visor multimedia completo.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `efeonce-rooms/src/app`, componentes y adapters de presentación del mismo runtime Next.
- Future candidate home: `portal`
- Boundary: presentación consume DTO de audiencia y operaciones canónicas; AXIS conserva primitives/tokens, issuer conserva OTP.
- Server/browser split: RSC deriva actor/room/edición y entrega sólo DTO autorizado; browser recibe estados seguros, nunca fixtures/stores/secrets/proofs/tokens de sesión.
- Build impact: estilos/forms existentes; sin nuevo framework, SDK de proveedor ni fuentes de red.
- Extraction blocker: identidad y SSR permanecen locales al producto; no crear paquetes compartidos anticipadamente.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: invitado cliente y persona interna con `access.read`/`access.manage`; operador nominal no implica permiso.
- Momento del flujo: recepción del correo, acceso a edición y gestión de una sala existente.
- Resultado perceptible esperado: entrar sin elegir producto/proveedor y reconocer quién conserva acceso a la sala.
- Friccion que debe reducir: repetir solicitudes de código, pasos decorativos, estados ambiguos y pérdida de contexto al fallar.
- No-goals UX: signup global, editor, uploads, dashboards, simulación de envíos y activación pública automática.

### Surface & system decision

- Surface: `/invite` pública de entrada; `/rooms` y detalle protegido; invitaciones como destino contextual de cada room.
- Nav placement: `shortcuts` — acción contextual en fila/detalle de sala; sin nueva sidebar global.
- Composition Shell: no aplica el shell Vuexy; reutilizar marco nativo Rooms.
- Primitive decision: `reuse` — AXIS Button, Badge, Dialog, Field, Input, Checkbox y Tabs existentes.
- Adaptive density / The Seam: no aplica panel lateral persistente; lista amplia y formulario puntual.
- Floating/Sidecar/Dialog decision: entrada OTP es página; crear/reemitir/revocar usan un diálogo único con cierre superior y devolución de foco.
- Copy source: `src/lib/copy/invitations.ts`.
- Access impact: `views` — proyecciones reales server-side; nunca usar selector demo como identidad.

### State inventory

- Default: campo único de seis dígitos; lista con estado/expiración; lector publicado.
- Loading: feedback local estable, sin duplicar submit ni ocultar todo el contexto.
- Empty: sin token/sesión, sin invitaciones, sin salas accesibles; próximo paso real.
- Error: código inválido, enlace no disponible, conflicto de revisión, fallo de entrega, servicio no disponible.
- Degraded / partial: delivery pending/failed, emisor OFF, evidencia no autorizada, media sin entrega autorizada (gate, no placeholder de pieza final).
- Permission denied: sin filtrar existencia de sala/destinatario; no fallback a demo.
- Long content: correo/títulos multilínea, artículo extenso y evidencia con scroll interior controlado.
- Mobile / compact: 390 y 320px; input y CTA en una columna, lista apilada conservando labels.
- Keyboard / focus: Enter explícito, pegar código completo, foco al error, Escape/cierre y retorno al disparador; no campos OTP de un dígito.
- Reduced motion: mismos estados y foco, actualización inmediata sin snapshots de autoridad.

### Interaction contract

- Primary interaction: “Entrar a la sala”; “Enviar invitación” tras destinatario/alcance/expiración visibles.
- Hover / focus / active: variantes oficiales AXIS y foco contrastado; controles con nombre accesible.
- Pending / disabled: impedir doble envío mientras esa operación está pendiente; límites/cooldown basados en respuesta del servidor.
- Escape / click-away: el diálogo cierra con Escape/control; si hay datos editados, confirmar descarte sin modales anidados.
- Focus restore: volver al disparador o al encabezado estable si su fila deja de existir; lector conserva foco al cerrar piezas/evidencia.
- Latency feedback: estado persistente de verificación/envío; no éxito optimista de autenticación, envío o revocación.
- Toast / alert behavior: resultado junto al campo/fila con aria-live moderado; no anunciar cada segundo del cooldown ni usar toast como única evidencia.

### Motion & microinteractions

- Motion primitive: `CSS` y helper View Transitions existente dentro de la misma sesión/edición.
- Enter / exit: desplazamiento breve del panel sin bajar contraste del texto.
- Layout morph: sólo capítulos/piezas dentro de lector ya autorizado.
- Stagger: none; formulario y contenido funcional disponibles juntos.
- Timing / easing token: roles AXIS ya mapeados en `src/styles/theme.ts`; no nuevos literales de diseño.
- Reduced-motion fallback: instantáneo, foco y semántica equivalentes.
- Non-goal motion: logo animado, introducción obligatoria, transición entre actores o snapshot de contenido revocado.

### Implementation mapping

- Route / surface: las cuatro rutas del ownership; contexto interno se coordina con `/auth/context` existente (route handler JSON, no page en el mismo path).
- Primitive / variant / kind: Field+Input tipo texto/inputMode numeric/autocomplete one-time-code; Checkbox para evidencia opcional; Button/Badge/Dialog oficiales.
- Component candidates: InvitationEntry, InvitationList, InvitationCreateDialog, GuestSessionBoundary, RoomReader y ContentBlockRenderer.
- Copy source: `src/lib/copy/invitations.ts`.
- Data reader / command: endpoints `/api/invitations/*`, `listRooms`, `listInvitations`, `getEdition`, create/reissue/revoke; adapters de consumo, nunca SQL desde UI.
- API parity: mismo command registry/API/CLI de TASK-2066; acción nueva requiere contrato primero.
- Access / capability: can sobre recurso correcto; evidencia opcional sólo dentro del techo delegable fresco; expiración limitada por servidor.
- States to implement: inventario anterior y flow TASK-2068; invitados no reciben lista interna, email ni notas.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/rooms-invitations.scenario.ts` (a crear al implementar).
- Route: entrada, edición V1/V2 y gestión interna con fixtures locales publicados y emisor controlado.
- Viewports: 1440×900, 1024×768, 390×844, 320×740 y texto 200%.
- Quality profile: `premium`.
- Required steps: token → código erróneo/correcto → lectura → evidencia → salida; expiración → resend explícito; crear/reemitir/revocar/conflicto.
- Required captures: entrada sin token, código, error, cooldown, publicado, sesión expirada, lista vacía/poblada, create review, entrega pending/failed, revoke y 409.
- Required `data-capture` markers: invitation-entry, invitation-code, invitation-recovery, invitation-management, invitation-create, guest-room, guest-session-state.
- Assertions: ningún secreto/PII extra en DOM/URL, foco íntegro, ratio contain, badges honestos, no autoridad client-side, errores/console limpios.
- Scroll-width checks: document.scrollWidth <= viewport, también texto 200%, todos los estados y diálogos.
- Reduced-motion / focus evidence: mismo recorrido teclado con API soportada, ausente y reduced; auth/logout/revoke nunca snapshot.
- Review dossier: `docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience/`.
- Baseline decision / surface ID: nueva superficie `rooms-invitations-v1`; baseline candidata hasta revisión humana, no screenshot de demo como aprobación.

### Design decision log

- Decision: formulario directo con una sola entrada de código y gestión contextual por sala.
- Alternatives considered: seis casillas OTP (pegar/foco peor), login global (scope incorrecto), sidecar permanente (ocupa lectura), duplicar demo (mezcla datos).
- Why this pattern: correo ya contiene ambos factores del mismo canal; una acción clara conduce a la edición sin onboarding.
- Reuse / extend / new primitive: reutilizar AXIS, extraer chrome/reader de demo; componentes de producto, no nueva primitive del sistema.
- Open risks: verificar UI integrada y pérdida de autoridad; entrega mediaR05 excluida explícitamente, sin sustituciones.

### Visual verification

- GVC scenario: escenario anterior y e2e navegador contra backend/issuer local.
- Viewports: los cuatro anchos +200%.
- Required captures: mismos estados que GVC; inspección real con Product Design en in-app browser.
- Required `data-capture` markers: los anteriores, estables en su ruta/estado.
- Scroll-width check: medido, sin ocultar overflow para hacer pasar QA.
- Accessibility/focus checks: axe, teclado, foco de diálogos, live regions, contraste final/transitorio y touch targets.
- Before/after evidence: demo existente como referencia de marca; capturas nuevas comparadas al mismo viewport con dirección aprobable.
- Known visual debt: no capturas nuevas ni aceptación humana todavía.
- Visual scorecard: `docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience.scorecard.json` (a generar con evidencia, nunca precalificar).
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` por consumo de identidad/acceso.
- Impacto principal: `integration`.
- Source of truth afectado: servicios TASK-2065/2066/2067 y reader de contenido publicado; esta unidad no cambia schemas ni grants.
- Consumidores afectados: UI/RSC; API/CLI mantienen paridad.
- Runtime target: `local` primero; rollout posterior coordinado.

### Contract surface

- Contrato existente a respetar: `src/domain/invitation-contracts.ts`, `src/server/invitations/http.ts`, `src/server/http/api.ts` y `src/server/persistence/content-projection.ts`.
- Contrato nuevo o modificado: adapters SSR/cliente sin autoridad nueva; DTOs faltantes requieren delta separado del dueño backend antes del consumo.
- Backward compatibility: compatible/aditivo; demo y API permanecen.
- Full API parity: comandos existentes con expectedRevision/idempotencyKey; no server action que replique reglas.

### Data model and invariants

- Entidades/tablas/views afectadas: lectura indirecta de rooms, editions, invitations y invitation_sessions por servicios existentes; cero SQL nuevo de UI.
- Invariantes: link solo no autentica; código nunca a logs/storage; invitación sólo sala; publicación y grants frescos; evidencia filtrada; accepted no equivale delivered.
- Write-target allowlist: N/A, sin destino SQL nuevo; los commands usan el allowlist/autoridad del dominio existente.
- Tenant/space boundary: contexto de sesión derivado por servidor; IDs enviados por browser sólo intersectan.
- Idempotency/concurrency: conservar key al retry incierto y payload exacto; 409 requiere relectura y revisión humana de la acción, no retry ciego con revisión nueva.
- Audit/outbox/history: conservados en commands, sin auditoría duplicada en componentes.

### Migration, backfill and rollout

- Migration posture: none.
- Default state: `ROOMS_INVITATIONS_ENABLED` y `ROOMS_FIRST_PARTY_AUTH_ENABLED` mantienen OFF donde no estén autorizados/configurados.
- Backfill plan: none; fixtures sintéticos sólo local.
- Rollback path: revert del consumidor; no down de DB ni revocación masiva por revert visual.
- External coordination: issuer/registro RP, PG cloud y media protegida necesarios para rollout real, fuera de esta creación documental.

### Security and access

- Auth/access gate: cookies HttpOnly y can server-side; UI muestra acciones pero no es frontera de autorización.
- Sensitive data posture: scrub fragment antes de fetch, no analytics en entrada, no local/sessionStorage de token/OTP/proof; email sólo en gestión autorizada.
- Error contract: usar códigos públicos normalizados y correlationId, nunca raw exception; enlace inválido/vencido/revocado genérico.
- Abuse/rate-limit posture: respetar Retry-After y cooldown; no auto-resend, no polling de verificación, no bypass de presupuestos del issuer.

### Runtime evidence

- Local checks: lint/types/build, pruebas de consumo y E2E contra PG/issuer local.
- DB/runtime checks: efectos leídos por API; no mocks que afirmen entrega o publicación.
- Integration checks: crear invitación → correo controlado único → entrar código → lectura → revoke → acceso denegado; reales sólo con destinatario definido y autorización.
- Reliability signals/logs: correlationId y estado sanitizado; sin datos del correo/código/token.
- Production verification sequence: local primero, preview con flags OFF, canary separado de release; no promover por score visual.

## Hybrid Execution Justification

- Why not split: backend de negocio ya está separado en TASK-2065/2066/2067; esta UI requiere adapters SSR/HTTP de presentación y pruebas integradas para ser usable. Los gaps de policy/DTO/media no se absorben como backend nuevo oculto.
- Primary execution profile: `ui-ux`.
- Contract boundary: DTOs/commands existentes o delta formal del dueño backend; cero SQL/issuer en componentes.
- Risk controls: hook/readiness antes de JSX, tests de no filtración y revisión de acceso independiente; bloqueos explícitos hasta congelar contratos.

<!-- ZONE 2 — PLAN MODE
Plan vigente: docs/tasks/plans/TASK-2068-plan.md. Contratos locales resueltos; root ejecuta hook/readiness antes de JSX.

ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Readiness y separación de presentación

Cerrar gaps con dueños backend, mapear V1/V2/entrega y sesión, fijar dirección/flow/motion, ejecutar hook y ui:readiness-check. Extraer chrome demo/guest/internal y reader real sin datos simulados por fallback.

### Slice 2 — Entrada y lectura guest

Implementar fragment scrub, código único, errores/cooldown/reload, verify y navegación sin snapshot a edición publicada. Renderer V1/V2 con perfiles independientes, media sólo de entrega autorizada, evidencia declarada y logout/recovery.

### Slice 3 — Gestión mínima interna

Lista de salas/contexto autorizado, lista de invitaciones identificables, creación/reemisión/revocación con revisión y resultados reales. Contexto interno reutiliza TASK-2065 sin reconstruir login.

### Slice 4 — Verificación y presentación

Regresiones demo, E2E reales locales, GVC cuatro anchos, Product Design review y dossier. Presentar build concreto a Julio; registrar aceptación sólo si ocurre.

## Out of Scope

Editor de contenido, uploads/transcoding, claims reales de clientes, nuevos roles/grants, SSO guest, mailer propio, issuer OTP, analítica de compra, tours, despliegue/DB cloud y envío real automático. No resetear trabajo paralelo ni sustituir assets oficiales.

## Detailed Spec

Wireframe, flow, motion y plan TASK-2068 gobiernan rutas, campos, estados y archivos. El primer correo trae link+código; reenviar sólo acción explícita tras expiración/cooldown. La UI distingue invitación activa/vencida/revocada de estado de entrega pending/accepted/failed. No presentar el correo como leído/entregado sin evidencia adicional.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contratos backend congelados → readiness/hook → chrome/reader real → entrada guest y gestión (paralelizables con DTOs fijos) → QA integrada → revisión humana. Nunca construir acceso feliz con fixtures si el reader real aún no soporta la edición.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Snapshot privado cruza actor | UI/auth | medium | navegación de documento y limpiar vista al perder autoridad | E2E bfcache/visibility/revoke |
| URL/código/PII filtrados | invitaciones | medium | fragment scrub, no storage/logs, DTO mínimo | auditoría DOM/network |
| Doble correo o falso éxito | delivery | medium | key estable, estado real y resend explícito | requestId/provider receipt |
| Imagen ficticia en room durable | renderer | high | entrega autorizada e identidad de asset, sin fallback demo | contenido/ratio/hash |
| Invitar con scope insuficiente | can | medium | DTO room resource y validación server-side | negative tests rol/TTL |
| Conflicto borra intención | UI/commands | medium | conservar form, relectura explícita | test409/doble pestaña |

### Feature flags / cutover

Flags de auth/invitación existentes conservan su estado; no habilitación por agregar páginas. Producción actual puede servir demo y estado no disponible honesto. Gestión read/revoke existente no se confunde con disponibilidad de creación/reemisión.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert adapters/UI sin tocar policy ni DB | un deploy | sí |
| 2 | revert rutas guest; conservar servicios/revocación | un deploy | sí; sesiones siguen política vigente |
| 3 | revert consumidor admin; API/CLI conserva control | un deploy | sí; invitaciones ya enviadas no se desenvían |
| 4 | volver a build previo verificado | un deploy | sí |

### Production verification sequence

1. Fixture local PG + issuer, recorrido real completo y regresión demo.
2. Preview sin activar providers ni mandar correo real; confirmar OFF/401/no-store.
3. Revisar dirección/capturas con Julio; aceptación visual independiente del rollout.
4. Sólo tras infraestructura y autorización específica del canary, destinatario definido, probar una invitación y revocación con readback. Envío aceptado no acredita entrega.

### Out-of-band coordination required

Peer Auth posee registro y OTP; root posee release, DB y secrets. No pedir otra aprobación de las decisiones ya confirmadas: correo único, código en Rooms y can. La aceptación humana que falta es del resultado visual construido, no una autorización técnica inventada.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Readiness verifica el recovery implementado y resuelve los restantes gaps documentados y pasa hook/lint; UI ready sólo cambia con evidencia.
- [ ] Token del fragmento se limpia antes de iniciar; reload y enlace inválido/vencido/revocado tienen recovery sin filtrar destinatario.
- [ ] Un solo correo inicial, código pegable en campo único; resend explícito, cooldown y errores reales.
- [ ] Verificación abre edición publicada con DTO real V1/V2 y media autorizada; sin fixtures, notas internas o evidencia no permitida en payload.
- [ ] Salida, expiración/revocación, bfcache y sesión interna coexistente no muestran contenido bajo actor equivocado.
- [ ] Gestión usa permisos room correctos y destinatario identificable; rol operador no habilita writes por sí mismo.
- [ ] Create/reissue/revoke preservan revisión/idempotencia; conflicto mantiene intención; accepted/pending/failed honestos.
- [ ] AXIS/logo/fuentes/motion reutilizados; sin regresión del demo ni nueva primitive paralela.
- [ ] GVC1440/1024/390/320 +200%, teclado/axe/contraste/foco y reduced/fallback PASS, capturas inspeccionadas.
- [ ] Se presentó el resultado renderizado y quedó registrada la respuesta humana; no se sustituye por pruebas automáticas.

## Verification

- Greenhouse: `pnpm task:lint --task TASK-2068`, `pnpm ui:readiness-check --task TASK-2068` antes de JSX.
- Rooms: `pnpm lint`, `pnpm typecheck`, `pnpm build` y tests focalizados de consumo/seguridad y Playwright.
- GVC premium y revisión in-app browser Product Design; scorecard con evidencia real.
- Los gates no prueban despliegue, entrega de correo ni aceptación humana por sí solos.

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry sincronizados con evidencia y pendientes honestos.
- [ ] Handoff/changelog y EPIC-052 actualizados por root, sin pisar peer Auth.
- [ ] Manual de uso distingue demo/local/prod, sesión interna/guest, send accepted/delivered.
- [ ] Revisión de impacto sobre TASK-2059/2062/2065/2066/2067 y ADRs.
- [ ] Sin secretos ni datos reales en capturas, fixtures, logs o commits.

## Follow-ups

Activación cloud y canary real siguen unidad de release; autoría visual y entrega media completa conservan sus boundaries. Si la entrega protegida no puede cerrarse como delta acotado, root reserva foundation separada antes de habilitar media V2; no cerrar esta task con piezas falsas.
