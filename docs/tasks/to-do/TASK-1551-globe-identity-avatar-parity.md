# TASK-1551 — Globe Identity Avatar Parity

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1551-globe-identity-avatar-parity.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Diseño y contrato separados de TASK-1505; no implementado`
- Rank: `TBD`
- Domain: `identity|creative|ui|platform`
- Blocked by: `none`
- Branch: `task/TASK-1551-globe-identity-avatar-parity`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entregar paridad de avatar para la cuenta de Globe: la foto canónica que Greenhouse sincroniza desde Microsoft
Entra aparece en Globe mediante el broker OAuth y un BFF same-origin. La cuenta conserva iniciales como fallback
seguro y estable; Globe no lee Microsoft Graph, GCS ni las cookies de Greenhouse.

## Why This Task Exists

La UI actual de Globe sólo recibe nombre/email y por eso genera iniciales locales, aun cuando Greenhouse ya
dispone de una foto canónica. Este es un concern de identidad compartida y de media privada, no de Producer: si
permanece dentro de `TASK-1505`, el cierre de la surface creativa queda ligado a una integración transversal.

## Goal

- Proyectar de forma aditiva la disponibilidad y versión opaca del avatar del actor en el broker OAuth de
  Greenhouse.
- Servir el avatar exclusivamente al actor autenticado y permitir que Globe lo consuma por BFF server-side.
- Mostrar foto o fallback de iniciales en la cuenta de Globe, con aislamiento, accesibilidad y revalidación.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`

Reglas obligatorias:

- Greenhouse es el único source of truth: Entra/Graph → GCS privado → `client_users.avatar_url` → Person 360.
- Globe conserva su sesión local y consume una proyección mínima; no comparte DB, cookies, bucket, secretos ni
  tokens Microsoft con Greenhouse.
- El browser de Globe sólo carga una URL same-origin. Actor, token y media se resuelven server-side; ningún
  `gs://`, URL privada, token o user id interno entra al DOM o a logs.
- El reader no acepta un usuario objetivo. Avatar ausente, acceso inválido y tentativa cross-user no revelan
  existencia de otra persona.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `.codex/skills/greenhouse-globe/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1519` — human bridge y sesión/BFF de Globe ya desplegados internal-only.
- `src/lib/entra/profile-sync.ts` y `greenhouse_serving.person_360` — sync y proyección canónicos existentes.
- `src/lib/sister-platforms/oauth-broker.ts` y `/api/integrations/v1/sister-platforms/oauth/userinfo` — contrato
  OAuth vigente de Globe.

### Blocks / Impacts

- Desbloquea la paridad visual de identidad en el header/panel de Globe sin bloquear ni ampliar `TASK-1505`.
- El descriptor puede reutilizarse después por colaboradores/mentions de Storyboard, pero esa surface no entra en
  este scope.

### Files owned

- `src/lib/sister-platforms/oauth-broker.ts`
- `src/lib/sister-platforms/oauth-broker-workspace-bindings.test.ts` o suite focal equivalente
- `src/app/api/integrations/v1/sister-platforms/oauth/userinfo/route.ts`
- Nueva ruta `src/app/api/integrations/v1/sister-platforms/oauth/userinfo/avatar/route.ts`
- `../efeonce-globe/apps/studio-web/src/app.ts`
- `../efeonce-globe/apps/studio-web/src/ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- Tests registrados de `../efeonce-globe/apps/studio-web`
- `docs/ui/wireframes/TASK-1551-globe-identity-avatar-parity.md`

## Current Repo State

### Already exists

- `src/lib/entra/profile-sync.ts` descarga la foto de Graph y persiste el path canónico en Greenhouse.
- `src/lib/person-360/resolve-avatar.ts` resuelve el avatar para consumidores Greenhouse.
- `SisterPlatformOAuthIdentityPayload` y userinfo ya entregan identidad mínima, mientras Globe mantiene
  `BrokerIdentity`/`GlobeUiIdentity` y renderiza iniciales en su cuenta.
- Globe ya usa BFF same-origin para la sesión humana; no requiere nuevo secreto, grant o permiso Graph.

### Gap

- Falta el descriptor seguro de avatar, el reader OAuth self-only, el proxy de Globe y el render de foto/fallback.
- El endpoint Greenhouse `/api/media/users/[id]/avatar` depende de la sesión Greenhouse y no es un contrato
  cross-origin reutilizable para Globe.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/sister-platforms/**` + `src/app/api/integrations/v1/sister-platforms/**` en Greenhouse;
  `../efeonce-globe/apps/studio-web/**` para BFF y presentación.
- Future candidate home: `remain-shared`
- Boundary: OAuth userinfo identity descriptor y reader self-only; Globe BFF es el único consumidor browser-facing.
- Server/browser split: broker, token, Person 360 lookup y bytes permanecen server-only; el browser recibe sólo
  una URL same-origin y renderiza foto o iniciales.
- Build impact: `none`; reutiliza storage/media, OAuth y runtime existentes.
- Extraction blocker: el access token y la sesión local de Globe deben mantenerse coherentes con la revalidación
  del broker sin compartir cookies o stores.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite`
- Usuario / rol: cualquier usuario autenticado de Globe.
- Momento del flujo: lectura inmediata de identidad en trigger y panel de cuenta.
- Resultado perceptible esperado: reconoce su cuenta por su foto real; si no existe o falla, ve iniciales sin
  saltos ni un icono roto.
- Fricción que debe reducir: discrepancia visual entre Greenhouse y Globe y duda sobre qué cuenta está activa.
- No-goals UX: nuevo perfil, edición de foto, galería de personas, menciones o una nueva primitive global.

### Surface & system decision

- Surface: trigger y panel de cuenta existentes de Globe Producer/Studio.
- Composition Shell: `no aplica` — refinamiento local de una affordance existente.
- Primitive decision: `extend` — avatar existente de Globe con `img` server-resuelto + fallback de iniciales.
- Adaptive density / The Seam: `no aplica` — se reserva el mismo diámetro en desktop y 390 px.
- Floating/Sidecar/Dialog decision: reutilizar panel de cuenta existente; no nace overlay nuevo.
- Copy source: copy local del account pattern existente; el nombre accesible se deriva del DTO de sesión.
- Access impact: `startup policy` — el avatar sigue la sesión válida; no agrega capability de negocio.

### State inventory

- Default: foto canónica disponible en trigger y panel.
- Loading: círculo reservado con iniciales, sin layout shift.
- Empty: iniciales derivadas de nombre.
- Error: iniciales y respuesta visual silenciosa; no expone detalle de red.
- Degraded / partial: descriptor disponible pero media no recuperable → iniciales.
- Permission denied: sesión expirada sigue el flujo existente de reautenticación; no deja imagen anterior como prueba de acceso.
- Long content: nombre completo sigue disponible como nombre accesible/texto adyacente.
- Mobile / compact: mismo diámetro, touch target y nombre accesible a 390 px.
- Keyboard / focus: trigger conserva nombre y foco; la foto es decorativa junto al nombre.
- Reduced motion: no aplica animación; loading usa fallback estable.

### Interaction contract

- Primary interaction: abrir/cerrar la cuenta existente.
- Hover / focus / active: el trigger mantiene estados actuales; la foto no agrega interacción propia.
- Pending / disabled: no hay CTA de avatar ni reintento manual.
- Escape / click-away: hereda el panel existente.
- Focus restore: hereda el trigger existente.
- Latency feedback: no bloquea el header; muestra iniciales mientras se resuelve.
- Toast / alert behavior: ninguno; la degradación es local y no intrusiva.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no aplica.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: no aplica.
- Reduced-motion fallback: estado idéntico.
- Non-goal motion: skeleton, shimmer o fade que oculten el estado de identidad.

### Implementation mapping

- Route / surface: account trigger/panel de `apps/studio-web`.
- Primitive / variant / kind: avatar circular existente con fuente image/fallback initials.
- Component candidates: `producer-ui.ts`; confirmar helper account/avatar de Globe antes de crear componente nuevo.
- Copy source: identidad ya entregada por `GlobeUiIdentity`; no duplicar nombres en constantes.
- Data reader / command: OAuth userinfo descriptor + reader self-only; no command.
- API parity: no capability de negocio; la misma proyección puede ser consumida por todos los server consumers del broker.
- Access / capability: access token OAuth válido y sesión Globe; no capability nueva.
- States to implement: present, loading, absent, unreadable, expired/revoked.

### GVC scenario plan

- Scenario file: extender el escenario existente de cuenta/Producer en Globe.
- Route: `/producer` internal-only.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `ui-lite — revisión focal`; no altera la composición de Producer.
- Required steps: abrir cuenta con avatar, sin avatar, con media fallida y con sesión expirada.
- Required captures: trigger y panel en ambos viewports.
- Required `data-capture` markers: marker existente del account trigger/panel; agregar uno sólo si falta evidencia estable.
- Assertions: diámetro estable, nombre accesible, fallback de iniciales, ausencia de URL/tokens/path privados.
- Scroll-width checks: `scrollWidth <= clientWidth` en 390 px con panel abierto.
- Reduced-motion / focus evidence: foco del trigger/panel sin dependencia visual de la foto.
- Review dossier: evidencia focal de Globe junto a la task.
- Baseline decision / surface ID: extensión del account pattern existente; no crea baseline nuevo.

### Design decision log

- Decision: BFF same-origin sirve el avatar del actor y la UI degrada a iniciales.
- Alternatives considered: browser directo a Graph/GCS/Greenhouse, URL firmada persistente, avatar hardcodeado,
  duplicar bytes en Globe, initials-only.
- Why this pattern: conserva el source of truth, authz y privacidad de Greenhouse sin romper sesión ni UX de Globe.
- Reuse / extend / new primitive: extender; no primitive nueva.
- Open risks: cache obsoleta, media rota y regresión de sesión; se mitigan con versión opaca, cache privada y fallback.

### Visual verification

- GVC scenario: cuenta Globe focal, extendida desde Producer.
- Viewports: `1440×1000` y `390×844`.
- Required captures: foto presente, ausencia/error y sesión expirada.
- Required `data-capture` markers: trigger/panel de cuenta.
- Scroll-width check: panel abierto a 390 px.
- Accessibility/focus checks: nombre accesible, foco de trigger, imagen decorativa cuando el nombre está presente.
- Before/after evidence: iniciales actuales vs foto/fallback sin cambio de densidad.
- Known visual debt: ninguno; el avatar no debe introducir uno.
- Visual scorecard: `N/A — ui-lite, revisión focal documentada`.
- Quality threshold: `sin icono roto, sin layout shift, foco/nombre accesible y sin overflow`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` — identidad, sesión y media privada.
- Impacto principal: `api`.
- Source of truth afectado: Person 360/client users sólo de lectura; no se cambia sync ni storage.
- Consumidores afectados: broker OAuth, BFF Globe y cuenta de Globe.
- Runtime target: Greenhouse + Globe internal-only.

### Contract surface

- Contrato existente a respetar: `SisterPlatformOAuthIdentityPayload`, OAuth token/userinfo y
  `resolveAvatarUrl`/media canonical de Greenhouse.
- Contrato nuevo o modificado: `avatar?: { available: boolean; version?: string }` aditivo en identidad/userinfo;
  `GET .../oauth/userinfo/avatar` sólo para el actor tokenizado; endpoint same-origin equivalente en Globe.
- Backward compatibility: `compatible`; consumidores que ignoran `avatar` permanecen intactos.
- Full API parity: `N/A — no capability de negocio`; es una proyección de identidad de sesión, no una mutación.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.client_users`, `greenhouse_serving.person_360`; sin migración.
- Invariantes que no se pueden romper:
  - Sólo Greenhouse llama Graph y posee GCS/media.
  - El endpoint resuelve el usuario desde token, nunca desde query/body/path controlado por caller.
  - Avatar ausente, usuario inválido, token revocado y cross-user no dan oráculo de existencia.
- Tenant/space boundary: actor del access token y sesión local de Globe; workspace no concede acceso a otra persona.
- Idempotency/concurrency: lectura idempotente; versión opaca invalida caché privada tras sync.
- Audit/outbox/history: auditoría OAuth existente, correlation id seguro; no bytes/tokens/path privados en logs.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: descriptor ausente o error → iniciales.
- Backfill plan: ninguno; se usan fotos ya sincronizadas cuando existan.
- Rollback path: retirar descriptor/proxy y conservar fallback; no borrar fotos ni modificar el broker SSO base.
- External coordination: despliegue ordenado Greenhouse antes de Globe; no secret, permiso Graph ni bucket nuevo.

### Security and access

- Auth/access gate: bearer token OAuth validado por broker; BFF Globe requiere sesión propia.
- Sensitive data posture: foto de perfil/PII; `Cache-Control: private`, no-store cuando corresponda y URL local.
- Error contract: `invalid_token` para token inválido; media no disponible responde sin confirmar sujetos; UI degrada sin raw error.
- Abuse/rate-limit posture: mismo control del userinfo y ninguna ruta parametrizada para enumerar usuarios.

### Runtime evidence

- Local checks: tests de payload, reader self-only, token inválido/expirado y UI present/fallback.
- Integration checks: SSO humano → userinfo → BFF → foto; cambio de foto y revalidación bounded.
- Reliability signals/logs: correlation id y ratio agregado de fallback, sin PII cruda.
- Production verification sequence: Greenhouse deploy/smoke aditivo → Globe deploy → foto/sin foto/error/expiración → GVC 1440/390.

## Hybrid Execution Justification

- Why not split: el descriptor, reader, BFF y dos renderizados son una sola entrega de identidad y ninguna pieza
  es útil o segura por separado. No hay migración, capability ni primitive reutilizable de negocio.
- Primary execution profile: `backend-data` por auth/media privada; la UI es un consumidor ui-lite.
- Contract boundary: Greenhouse OAuth userinfo/self-avatar reader → Globe BFF → account trigger/panel.
- Risk controls: additive optional payload, self-only auth, cache privada/versionada, fallback, negativos de
  cross-user/expiry y rollback que sólo desactiva el consumidor.

<!-- ZONE 2 — PLAN MODE: no llenar al crear. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Greenhouse identity projection and self-avatar reader

- Resolver el avatar canónico desde Person 360/client users dentro del broker y añadir descriptor opcional.
- Exponer media self-only autenticada por bearer sin aceptar sujeto desde el request.
- Cubrir compatibilidad, ausencia, token inválido/expirado y no enumeración.

### Slice 2 — Globe BFF and account presentation

- Extender identidad de sesión y endpoint BFF same-origin usando token guardado server-side.
- Renderizar foto en trigger/panel con iniciales, dimensiones reservadas y nombre accesible como fallback.
- Registrar tests de Globe explícitamente en el script de `node --test` correspondiente.

### Slice 3 — Revalidation and evidence

- Definir cache privada/versionada y revalidación bounded al refrescar sesión/userinfo.
- Ejecutar smoke SSO y evidencia focal desktop/390, incluyendo fallos y revocación.

## Out of Scope

- Cambiar el sync Entra/Graph, su cron, permisos Microsoft, app registration o storage GCS.
- Perfil/edición de foto, avatares de terceros, menciones, comentarios o cualquier dominio Storyboard.
- Copiar bytes de avatar a Globe, hacer el media bucket público o compartir DB/cookies/secrets.
- Reabrir `TASK-1505` por rutas, feeds, viewers, promociones de modelo o rollout comercial.

## Detailed Spec

El browser nunca puede usar un bearer token para construir una URL de imagen. Greenhouse resuelve la identidad del
actor desde el token y Globe vuelve a autorizar su sesión antes de proxyear la media. El proxy conserva tipo de
contenido y cache privada, pero no reexpone headers/errores internos. Si cualquiera de esas capas falla, la UI
conserva iniciales; no intenta recuperar directamente desde Graph.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`Slice 1 Greenhouse compatible → smoke userinfo → Slice 2 Globe BFF/UI → negativos → Slice 3 revalidación/GVC`.
Globe nunca se despliega esperando un endpoint no existente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| avatar de otra persona expuesto | identity/API | low | reader self-only + BFF session + no subject parameter | cross-user 200 o URL privada en DOM |
| foto obsoleta o rota | UI/session | medium | versión opaca, cache privada y fallback de iniciales | icono roto/layout shift o fallback rate anómalo |
| regresión SSO | auth | low | payload aditivo + consumers compatibles + smoke completo | token/userinfo failure o callback fallido |

### Feature flags / cutover

Sin flag nuevo: payload opcional y fallback hacen el cutover aditivo. El orden de deploy Greenhouse → Globe es el
guardrail. Revertir Globe primero restaura iniciales sin tocar identidad.

### Rollback plan per slice

- Slice 1: mantener descriptor opcional sin consumidor o revertir reader; no toca fotos/sync.
- Slice 2: revertir BFF/render y volver a iniciales.
- Slice 3: reducir cache/revalidación o desactivar consumo; conservar sólo fallback hasta resolver evidencia.

### Production verification sequence

1. Tests locales Greenhouse y Globe.
2. Greenhouse deploy y userinfo compatible para usuario con/sin avatar.
3. Globe deploy y SSO humano; validar trigger/panel y endpoint same-origin.
4. Negativos: token expirado, sesión revocada, query/path manipulados y media no disponible.
5. Revalidación tras cambio de foto, GVC 1440/390 y revisión de logs saneados.

### Out-of-band coordination required

- Ninguna configuración Microsoft/GCS nueva. El operador autoriza deploy internal-only de ambos runtimes y ejecuta
  los smokes con una cuenta que tenga avatar y otra que no.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `TASK-1505` ya no contiene avatar, broker, BFF ni criterios de cierre de esta integración.
- [ ] El payload OAuth/userinfo expone descriptor opcional compatible sin URL, token, path privado ni user id interno.
- [ ] El reader de avatar entrega sólo al actor del token válido y no permite selección/enumeración de otro usuario.
- [ ] Globe sirve media por BFF same-origin y nunca llama Graph/GCS/Greenhouse media desde browser.
- [ ] Trigger y panel muestran foto cuando existe; loading, ausencia, error y revocación muestran iniciales sin layout shift.
- [ ] Nombre, foco, teclado y 390 px conservan accesibilidad y no hay overflow.
- [ ] Cambio de avatar aparece tras revalidación bounded; cache no queda pública ni indefinida.
- [ ] Tests y smoke cubren token inválido/expirado, sujeto manipulado, media rota y compatibilidad sin avatar.
- [ ] No se introducen migraciones, secrets, buckets, permisos Microsoft ni capabilities de negocio.

## Verification

- `pnpm task:lint --task TASK-1551`
- `pnpm ui:wireframe-check --task TASK-1551`
- Tests focales Greenhouse OAuth/avatar y Globe `node --test` registrados.
- `pnpm check && pnpm build` en `../efeonce-globe` al implementar.
- Smoke SSO interno y GVC focal 1440/390 antes de declarar rollout operativo.
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check` y `pnpm docs:context-check:strict`

## Closing Protocol

- No mover a `complete` sin evidencia de ambos runtimes desplegados internal-only y negativos de aislamiento.
- Registrar en Handoff la revisión, fallback, rollback y siguiente owner si queda rollout pendiente.
- Mantener `TASK-1505` cerrable por su propia UI y gates Producer, sin reabsorber este concern.

## Follow-ups

- Storyboard podrá consumir la misma proyección para colaboradores/mentions sólo mediante una task posterior con
  autorización y alcance explícitos.

## Open Questions

- Ninguna bloqueante: el shape exacto de `version` se decide durante Discovery contra el timestamp/asset path ya
  disponible, sin exponerlo al browser.
