# TASK-1834 — Greenhouse Login Convergence on Efeonce ID

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
- Execution profile: `backend-data`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Flow: `docs/ui/flows/TASK-1834-greenhouse-login-convergence-native-issuer-flow.md`
- Motion: `docs/ui/motion/TASK-1834-greenhouse-login-convergence-native-issuer-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Especificación corregida el 2026-09-06 contra código real y ampliada por dirección del operador: Efeonce ID será la identidad humana canónica de todos los productos para clientes e internos. Sin implementación; el emisor aún no ofrece un contrato OIDC reusable y la dirección multiproducto requiere Delta ADR más unidades dueñas antes del primer cambio de código.`
- Rank: `TBD`
- Domain: `platform|identity|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Establecer **Efeonce ID** como la identidad humana canónica de los productos Efeonce para clientes externos y
colaboradores internos, y convertir Greenhouse en su primer relying party de referencia. Cada producto actual o
futuro debe autenticar la misma cuenta Efeonce mediante un cliente OIDC propio, pero conservar audiencia, cookie,
sesión y autorización de producto separadas.

Esta task integra Greenhouse de forma aditiva. Debe consumir un contrato OIDC reusable, separado de los access
tokens MCP, resolver la identidad canónica y después un único contexto de sesión Greenhouse vigente en Person 360 /
Account 360 hasta un `TenantAccessRecord`. No implementa el runtime de Globe ni de productos futuros.

Esta task entrega coexistencia segura y medible y prueba el patrón del primer producto. No declara convergencia
final del ecosistema ni autoriza retirar métodos; cada producto requiere adopción, paridad, assurance, rollout y
rollback propios.

## Why This Task Exists

La versión anterior asumía que `auth.efeonce.org` ya era un provider OIDC listo para NextAuth. El runtime publica
`openid-configuration`, pero el contrato vigente no acepta `openid`, no emite `id_token`, no expone `userinfo` y
sus access tokens tienen audiencia MCP. También resolvía sólo `identity_profile`, aunque el portal necesita un
`client_users` elegible, organización, roles y vistas vigentes.

La versión anterior además excluía colaboradores internos, declaraba `UI impact: none` pese a agregar un botón,
intentaba ocultarlo por organización antes de conocerla y trataba TASK-1832/TASK-1833 como blockers de código en
vez de gates de activación. Esta revisión corrige esas contradicciones.

La dirección del operador del 2026-09-06 amplía el objetivo: Greenhouse no puede ser el dueño permanente del login
de Globe ni un producto nuevo puede crear otra cuenta humana. Efeonce ID será el front door común; Microsoft,
Google, passkey y magic link son métodos upstream vinculados a la misma persona, no identidades separadas. Una
identidad común tampoco concede acceso universal: cada producto y organización continúan resolviendo su contexto y
aplicando su autoridad local.

## Goal

- Formalizar por Delta ADR a Efeonce ID como autoridad canónica de autenticación humana multiproducto, separando
  issuer, método upstream, relaciones/poblaciones, contexto seleccionado y autoridad efectiva.
- Consumir un perfil OIDC first-party reusable y registrar Greenhouse como cliente de referencia con audiencia
  propia; nunca adaptar un access token MCP como identidad del portal ni incrustar conceptos Greenhouse en el
  contrato base del emisor.
- Resolver el sujeto nativo a una identidad canónica y después a exactamente un contexto Greenhouse elegible con
  sus claims Person 360 / Account 360 actuales, sin búsqueda, merge ni provisión por correo ni unión de permisos.
- Exponer Efeonce ID de forma aditiva en `/login`, preservar todos los métodos actuales y probar rollout,
  revocación y rollback por población.
- Dejar registrado el contrato de onboarding/conformance para nuevos relying parties y las unidades separadas que
  migrarán Globe y cualquier otro producto; TASK-1834 no implementa esos consumers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **Una cuenta Efeonce, varios productos.** Efeonce ID es la autoridad canónica de autenticación humana para
  Greenhouse, Globe y todo producto Efeonce futuro, tanto para clientes como para internos. Los upstreams
  Microsoft, Google, passkey y magic link se vinculan a esa cuenta; nunca crean identidades de producto paralelas.
- **Una identidad no implica una sola relación.** La misma persona puede ser interna, cliente y miembro de varias
  organizaciones simultáneamente. Después de autenticar se selecciona exactamente un contexto válido por
  producto/organización; nunca se unen roles, workspaces, módulos, capabilities o entitlements entre relaciones.
- **Cada relying party queda aislado.** Cada producto usa `client_id`, audiencia, redirects, política de assurance,
  token family, cookie, sesión, logout y rollback propios. Un code/token/cookie emitido o guardado para Greenhouse
  se rechaza en Globe y viceversa; sólo la sesión SSO del issuer puede facilitar reautenticación.
- **Tener Efeonce ID no aprovisiona acceso.** Un producto nuevo resuelve `subject -> identity_profile -> contextos
  elegibles -> contexto seleccionado -> autorización local`; ausencia o ambigüedad falla cerrada.
- **Issuer no determina población.** El mismo issuer puede autenticar a una persona interna o externa; la
  población y autoridad se resuelven server-side desde vínculos y relaciones canónicas vigentes.
- **Autenticación no concede autorización.** Microsoft, Google, passkey o magic link sólo prueban el método;
  principal, tenant, roles, route groups, vistas, permission sets, módulos, entitlements, scopes de datos,
  startup policy y revocaciones efectivas del portal provienen de Greenhouse.
- **La convergencia cambia quién autentica, no quién autoriza el portal.** El `id_token` de Efeonce Auth es
  evidencia de autenticación; nunca es una fuente de permisos Greenhouse.
- `openid` y el cliente OIDC de Greenhouse forman un carril distinto del catálogo MCP. NUNCA agregar `openid` a
  `EFEONCE_MCP_SCOPES`, reutilizar `GrantsVersionPort` para emitir identidad del portal ni exigir un grant MCP
  para iniciar sesión en Greenhouse.
- NUNCA traducir `scope`, `scp`, `gv`, `roles`, `groups`, organization IDs, views o capabilities recibidos del
  issuer a `roleCodes`, `routeGroups`, `authorizedViews`, módulos o entitlements del portal. `gv` versiona la
  autoridad del binding MCP; no es una versión de autorización NextAuth.
- Un `external_capability_grants` activo no abre el portal y un módulo/entitlement del portal no permite emitir
  un scope ni ejecutar una tool MCP. Ambos planos conservan sus propios enforcement points y revocaciones.
- El portal interno conserva `authorizedViews`/permission sets/overrides; el portal cliente conserva su primitive
  `module_assignments + vistas base - user_view_overrides.revoke`. No colapsarlos en un claim común.
- NUNCA compartir cookie, secreto, sesión, access token MCP ni refresh token entre el emisor y el portal.
- NUNCA compartir cookies, sesiones, client secrets, authorization codes o tokens entre productos.
- NUNCA aceptar el access token con audiencia `https://mcp.efeonce.org/mcp` como identidad NextAuth.
- NUNCA hacer fallback por email o dominio, fusionar perfiles, crear `identity_profile`, `client_users`,
  `members`, `person_memberships`, source links, bindings o roles desde el callback.
- El camino externo usa TASK-1631; el interno reutiliza TASK-1836. Nunca probar uno como fallback del otro.
- Microsoft, Google, credenciales y magic link del portal permanecen disponibles durante esta task. La
  contraseña no se copia ni se reimplementa en Efeonce Auth.
- La revocación/expiración debe negar acceso efectivo; no basta ocultar el botón ni comparar una versión.

## Normative Docs

- `docs/tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md`
- `docs/tasks/in-progress/TASK-1835-efeonce-id-login-consent-screens.md`
- `docs/tasks/in-progress/TASK-1832-efeonce-mcp-client-canaries-and-first-customer-cohort.md`
- `docs/tasks/to-do/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md`
- `docs/tasks/to-do/TASK-1839-invitation-delivery-primitive-convergence.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`

## Dependencies & Impact

### Depends on

- TASK-1829/TASK-1830: OAuth, sesión y autenticación de personas del emisor; se extienden, no se asumen OIDC.
- TASK-1631: source links externos, invitations linked, grants y bindings Account 360.
- TASK-1836: enrollment, contexto y elegibilidad workforce para la población interna.
- `src/lib/auth.ts`, `src/lib/tenant/access.ts`, `src/lib/tenant/identity-store.ts` y
  `greenhouse_serving.session_360` como shape de sesión del portal.
- Aprobación del Delta ADR del Slice 0 antes de cambiar código.

TASK-1832 y TASK-1833 **no bloquean** dark deploy ni pruebas locales/staging de esta task. Sí bloquean la
activación externa en Production y cualquier cutover/retiro de métodos, respectivamente.

### Blocks / Impacts

- Login de clientes y colaboradores internos en `/login`.
- Delta ADR y unidad reusable del perfil OIDC first-party de `auth.efeonce.org`, distinto del resource server MCP.
- Claims y revalidación de la sesión NextAuth del portal.
- Unidad separada para migrar el login humano de Globe desde el broker sister-platform de Greenhouse hacia Efeonce
  ID, preservando su sesión, tenancy, capabilities, créditos y derechos; debe coordinarse con TASK-1480/TASK-1511.
- Contrato de onboarding/conformance para relying parties futuros, sin código ad hoc por producto en el issuer.
- TASK-1835 si una decisión posterior agrega Microsoft cliente o Google como upstreams visibles del emisor.
- TASK-1839 para provisionar un principal de portal; TASK-1834 sólo consume principals existentes.

### Files owned

- Delta ADR y actualización de `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`.
- `src/lib/auth-server/oauth/**` y `services/auth-server/**` sólo para el contrato OIDC de Greenhouse.
- `src/lib/identity/**` o `src/lib/tenant/**` para el resolver canónico, después de confirmar ownership.
- `src/lib/auth.ts`, `src/views/Login.tsx`, la page `/login` y copy canónico.
- Migración aditiva y `src/lib/auth/attempt-tracker.ts` para admitir el provider nuevo en el ledger.
- Tests focales, escenario GVC y documentación funcional/manual.
- `docs/ui/wireframes/TASK-1834-greenhouse-login-convergence-native-issuer.md`.
- `docs/ui/flows/TASK-1834-greenhouse-login-convergence-native-issuer-flow.md`.
- `docs/ui/motion/TASK-1834-greenhouse-login-convergence-native-issuer-motion.md`.

## Current Repo State

### Already exists

- Greenhouse ofrece Microsoft, Google, credenciales y magic link en el mismo login; los callbacks terminan en
  un `TenantAccessRecord` y la sesión incluye `organizationId`, `memberId` e `identityProfileId`.
- Efeonce Auth ofrece magic link externo, Microsoft Entra tenant-pinned para internos y APIs de passkey/TOTP.
  El botón passkey todavía no está expuesto en `/login` y no existe upstream Google o Microsoft cliente.
- Globe autentica hoy contra el broker sister-platform de Greenhouse, conserva cookie propia y restringe el
  callback a identidades internas; no consume Efeonce ID y su tenancy autoritativa aún está en transición.
- TASK-1631 liga el subject externo a `identity_profile` y Account 360, pero su membership MCP `linked` no es
  `person_memberships` y no crea un `client_users` del portal.
- TASK-1836 ya verifica tenant/OID, perfil, principal, member, organización operativa, membresía y relación legal
  para internos.

### Gap

- No hay `id_token`/`userinfo` ni audiencia OIDC para Greenhouse; la metadata OIDC actual no basta.
- No existe un perfil OIDC first-party reusable, registry/policy de relying parties, conformance harness ni runbook
  que permita incorporar Greenhouse, Globe y productos futuros sin modificar lógica específica del issuer.
- El pipeline actual de `/oauth/authorize` y `/oauth/token` está acoplado a audiencia, scopes, consentimiento,
  `GrantsVersionPort` y `gv` de MCP. Agregar `openid` dentro de ese mismo pipeline ligaría incorrectamente el
  login del portal a `external_capability_grants`; el Delta ADR debe separar clase de cliente y policy de emisión.
- No existe resolver `(environment, subject) -> identidad canónica -> relaciones/contextos elegibles -> contexto
  Greenhouse seleccionado -> TenantAccessRecord` con resultados cerrados para missing, inactive, collision,
  `context_required`, ambiguous y organization mismatch.
- La revalidación de sesión actual ocurre por `userId` cada cinco minutos, pero si el principal queda inactivo o
  desaparece conserva los claims anteriores; tampoco prueba source link, binding o contexto Efeonce ID.
- `greenhouse_serving.session_360` en PostgreSQL filtra roles por `active`/`effective_to`, pero no por
  `status='active'` ni `effective_from <= now`, a diferencia del fallback BigQuery. No se puede certificar
  "roles vigentes" ni paridad de providers hasta cerrar o aislar ese drift.
- Los lookups PostgreSQL de `session_360` usan `LIMIT 1` sin ordenar; una persona con más de un space/contexto
  proyectado no puede resolverse eligiendo una fila arbitraria. El binding y la organización deben producir un
  match único o `ambiguous`.
- El Admin Center combina `role_entitlement_defaults`/`user_entitlement_overrides` para mostrar permisos
  efectivos, pero el hot path `getTenantEntitlements()`/`can()` inspeccionado deriva desde claims y no aplica esos
  overlays. Es una brecha preexistente: TASK-1834 no puede usar la vista administrativa como prueba de enforcement.
- SSO directo admite principals `invited`, mientras el refresh de claims sólo conserva `active`; el Delta ADR debe
  fijar una única semántica de elegibilidad sin activación implícita desde el callback.
- El acceso efectivo no cabe sólo en `roles/views`: internos usan roles, route groups, permission sets, overrides
  y entitlements; clientes usan módulos vigentes y vetos personales mediante un primitive cacheado, además de
  scopes de filas en sus readers.
- `greenhouse_serving.auth_attempts.provider` no admite `efeonce-auth`; la task requiere migración aditiva.
- El login anónimo no conoce organización. La decisión de esta task es botón global gated + resolución y deny
  anti-enumeración después del callback, no discovery por correo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/auth-server/**` + `services/auth-server/**` y portal `src/lib/auth.ts`/`src/views/Login.tsx`
- Future candidate home: `remain-shared`
- Boundary: perfil OIDC first-party reusable + cliente Greenhouse aislado + resolver server-side
  `subject -> identity_profile -> contexto Greenhouse -> TenantAccessRecord`
- Server/browser split: discovery, token validation, stores, población, claims y access exclusivamente server-side; browser sólo inicia el provider y muestra estados sanitizados
- Build impact: sin SDK nuevo esperado; cualquier input nuevo del auth-server debe entrar en sus build gates
- Extraction blocker: contrato de sesión NextAuth pertenece al portal y la autoridad canónica vive en Greenhouse; no compartir runtimes ni cookies

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente externo o colaborador interno con identidad Efeonce ID ya enlazada y principal de portal activo.
- Momento del flujo: entrada a `/login`, salida a `auth.efeonce.org`, retorno al callback y apertura del home autorizado.
- Resultado perceptible esperado: elegir Efeonce ID sin perder Microsoft, Google, contraseña o magic link; entender y recuperar fallos sin revelar si una cuenta existe.
- Friccion que debe reducir: ausencia del nuevo método, confusión entre invitación y login, y errores que no ofrecen alternativa segura.
- No-goals UX: signup público, selector de organización por email, rediseño completo del login, provisión de personas o retiro de métodos.

### Surface & system decision

- Surface: `/login` y sus estados de retorno de provider.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — reutiliza la composición de autenticación existente.
- Primitive decision: `reuse` — mismo patrón/button de providers existente, sin primitive nueva.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: `src/lib/copy/*`.
- Access impact: `routeGroups|views|entitlements` resueltos sólo en server.

### State inventory

- Default: Efeonce ID visible detrás de flag junto a todos los métodos actuales.
- Loading: provider readiness y redirect pending sin doble submit.
- Empty: no aplica.
- Error: provider unavailable, identity unlinked, access inactive, ambiguous principal y session revoked con copy no enumerable.
- Degraded / partial: Efeonce ID degradado no bloquea métodos clásicos.
- Permission denied: misma respuesta pública para missing/inactive/mismatch; diagnóstico detallado sólo en señal sanitizada.
- Long content: nombres de método y mensajes no rompen la composición.
- Mobile / compact: paridad a 390 px sin scroll horizontal.
- Keyboard / focus: provider accesible por teclado; retorno de error restaura foco al resumen y mantiene alternativas.
- Reduced motion: feedback conserva significado sin animación.

### Interaction contract

- Primary interaction: `Continuar con Efeonce ID` inicia el provider; los métodos existentes conservan su jerarquía actual.
- Hover / focus / active: reutilizar estados del botón provider.
- Pending / disabled: sólo la acción elegida queda pending; evitar doble redirect.
- Escape / click-away: no aplica.
- Focus restore: al resumen de error; siguiente tab entra en la primera alternativa disponible.
- Latency feedback: estado inmediato y error recuperable si discovery/callback falla.
- Toast / alert behavior: alerta inline, sin raw OAuth error ni identificadores.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: conservar comportamiento existente.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: none.
- Reduced-motion fallback: resultado inmediato equivalente.
- Non-goal motion: no introducir motion nueva.

### Implementation mapping

- Route / surface: `/login`, NextAuth provider/callback y error return existente.
- Primitive / variant / kind: provider button existente.
- Component candidates: `src/views/Login.tsx` y page server que entrega provider readiness.
- Copy source: `src/lib/copy/*`.
- Data reader / command: resolver server-side de identidad/acceso; UI no consulta DB ni bindings.
- API parity: autenticación de sesión; autoridad se resuelve en el mismo primitive server-side para callback y revalidación.
- Access / capability: roles/views vigentes del `TenantAccessRecord`; ningún grant nace en UI.
- States to implement: default, pending, degraded, denied y callback error.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1834-greenhouse-login-convergence.scenario.ts`.
- Route: `/login`.
- Viewports: 1440x900 y 390x844.
- Quality profile: `premium`.
- Required steps: default; foco Efeonce ID; pending; provider degraded; callback denied; métodos clásicos presentes.
- Required captures: cada estado en desktop/mobile y evidencia de teclado/reduced motion.
- Required `data-capture` markers: login surface, provider list, Efeonce ID action y error summary.
- Assertions: los cinco métodos declarados por el portal siguen alcanzables según configuración; sin PII/raw errors; sin doble submit.
- Scroll-width checks: `scrollWidth === clientWidth` en ambos viewports.
- Reduced-motion / focus evidence: foco visible y resultado equivalente.
- Review dossier: requerido antes de `UI ready: yes`.
- Baseline decision / surface ID: baseline runtime actual de `/login`; no se promueve una dirección nueva.

### Design decision log

- Decision: integración visual aditiva dentro del provider list existente; botón global gated y autorización post-callback.
- Alternatives considered: ocultar por organización antes de login; discovery email-first; URL tenant-scoped.
- Why this pattern: el login anónimo no conoce organización y el email no es autoridad; el deny post-callback evita una segunda pantalla y mantiene rollback simple.
- Reuse / extend / new primitive: `reuse`.
- Open risks: jerarquía exacta y copy requieren revisión visual; `UI ready` permanece `no` hasta completar wireframe/GVC.

### Visual verification

- GVC scenario: `task1834-greenhouse-login-convergence`.
- Viewports: 1440x900 y 390x844.
- Required captures: default, pending, degraded y denied.
- Required `data-capture` markers: login/provider/action/error.
- Scroll-width check: obligatorio.
- Accessibility/focus checks: teclado, foco visible, summary de error y nombres accesibles.
- Before/after evidence: login actual vs provider adicional.
- Known visual debt: dirección detallada y scorecard pendientes; por eso `UI ready: no`.
- Visual scorecard: `docs/ui/reviews/TASK-1834-greenhouse-login-convergence-native-issuer.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: identidad canónica, access projection del portal, sesión NextAuth y contrato OIDC del auth-server
- Consumidores afectados: portal Greenhouse; Person 360/Account 360 como fuentes; auth-server como issuer
- Runtime target: `staging`, luego `production` por cohortes separadas

### Contract surface

- Contrato existente a respetar: `TenantAccessRecord`, `greenhouse_serving.session_360`, OAuth/JWKS del emisor y callbacks NextAuth
- Contrato nuevo o modificado: carril OIDC Greenhouse separado de MCP; resolver por subject/población; provider `efeonce-auth`; revalidación de identidad y acceso
- Backward compatibility: `gated` y aditiva
- Full API parity: callback y revalidación consumen el mismo resolver canónico; no hay lógica de acceso en `Login.tsx`

### Data model and invariants

- Entidades/tablas/views afectadas: `identity_profile_source_links`, `external_organization_bindings`, external memberships, internal enrollments/contexts, `client_users`, `members`, `person_memberships`, relaciones workforce, `session_360`, `auth_attempts`
- Invariantes que no se pueden romper:
  - Un subject produce exactamente una población y un `TenantAccessRecord` elegible o falla cerrado.
  - El external binding y el `client_users` deben resolver la misma organización canónica.
  - El camino interno verifica enrollment, member y relación vigente; el externo nunca confiere roles internos.
  - Toda autorización efectiva se deriva en Greenhouse: roles lifecycle-aware, route groups, vistas internas,
    permission sets, user overrides, módulos del cliente, entitlements, scopes de datos y startup policy.
  - `scope`/`scp`/`gv`/roles/groups/capabilities del issuer se ignoran para autorización del portal; los grants
    MCP nunca se mezclan con los entitlements del portal.
  - `module_assignments` y revocaciones de vistas cliente no se congelan como claims de sesión: las rutas siguen
    usando el primitive canónico y los actions/readers sus guards de capability y scope.
- Write-target allowlist: sólo migración aditiva/ledger `auth_attempts`; el callback no escribe identidad, membership, principals ni roles
- Tenant/space boundary: derivada por vínculos canónicos y `session_360`, nunca por parámetro, dominio o email
- Idempotency/concurrency: callback state/nonce de un uso; resolver detecta cero, uno o múltiples principals y nunca elige arbitrariamente
- Audit/outbox/history: intento sanitizado por provider/población/outcome; sin raw subject, token, código, correo ni error JOSE

### Migration, backfill and rollout

- Migration posture: `additive` para ampliar el provider permitido en `auth_attempts`; sin backfill de identidades
- Default state: flags de issuer OIDC y portal login OFF
- Backfill plan: none; cohortes sólo con vínculos y principals existentes
- Rollback path: flags OFF, revocar sesiones Efeonce ID de portal según contrato y mantener intactos los providers clásicos
- External coordination: cliente confidencial/audiencia/redirect exacto, secrets por target, auth-server deploy, Vercel env y redeploy

### Security and access

- Auth/access gate: issuer/audience/signature/expiry/nonce/state/PKCE + resolver canónico y lifecycle vigente
- Sensitive data posture: PII de identidad; claims mínimos y logs sanitizados
- Error contract: códigos cerrados para unavailable, unlinked, inactive, ambiguous, organization_mismatch y revoked; copy público anti-enumeración
- Abuse/rate-limit posture: límites del issuer + callbacks de un uso; falla del issuer no degrada providers clásicos

### Runtime evidence

- Local checks: tests focales auth-server/OIDC, resolver, NextAuth, UI y migración
- DB/runtime checks: ninguna fila nueva de identidad/principal/membership; ledger admite provider nuevo; resolución Person/Account 360 coincide
- Integration checks: matriz por población, método y plano de autorización; OIDC real; no-transferencia de grants;
  revalidación y rollback con sesión vigente
- Reliability signals/logs: intentos por outcome y latencia de revocación; steady state de collision/mismatch = 0
- Production verification sequence: dark deploy -> staging interno/externo -> assurance -> piloto interno -> cohorte externa -> observación -> decisión separada de cutover

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda escritura nueva queda en allowlist y se limita al ledger/audit declarado.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime/DB evidence prueba ausencia de nuevas identidades y paridad del principal.
- [ ] Errores y señales no exponen tokens, raw subjects, correos ni raw provider errors.

## Hybrid Execution Justification

- Why not split: issuer, resolver, callback y experiencia forman un único contrato vertical de login; separarlos sin un gate E2E permitiría que metadata/tokens, sesión y UI diverjan. Microsoft cliente y Google upstream sí quedan fuera como tasks propias.
- Primary execution profile: `backend-data`.
- Contract boundary: OIDC Greenhouse -> subject opaco -> resolver canónico -> `TenantAccessRecord` -> sesión NextAuth; la UI sólo inicia y representa estados.
- Risk controls: Slice 0 ADR, flags separados, providers clásicos intactos, implementación por slices, canaries por población, assurance antes de Production y rollback sin mutar identidad.

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

### Slice 0 — Delta ADR multiproducto, ownership y matriz de transición

- Formalizar que Efeonce ID es la única autoridad de autenticación humana de los productos Efeonce para internos y
  externos, sin inferir población, organización ni acceso por issuer.
- Decidir el perfil OIDC first-party reusable: registro de aplicaciones, strategy de `sub` y privacidad/correlación,
  account/factor linking, claims mínimos, audiences, assurance por app, sesión SSO del issuer, logout/revocación de
  relying parties y matriz de métodos upstream.
- Registrar una unidad backend-critical dueña de esa foundation reusable y otra unidad de adopción de Globe bajo
  EPIC-028, coordinada con TASK-1480/TASK-1511. TASK-1834 permanece como primer consumer Greenhouse.
- Documentar la matriz de autoridades y enforcement points: autenticación Efeonce Auth; delegación OAuth;
  gateway MCP; autorización de negocio del provider; principal/sesión portal; navegación; vistas internas;
  vistas cliente; entitlements/actions; scopes de datos.
- Aprobar una matriz de revocación por evento, mecanismo, cache/SLA y evidencia para source link/binding,
  principal, enrollment/relación workforce, rol, permission set, user override, módulo, entitlement override,
  scopes de datos, sesión upstream, sesión Efeonce Auth y sesión NextAuth.
- Decidir un mecanismo provider-neutral para invalidar sesiones NextAuth cuando el principal Greenhouse queda
  inactivo o desaparece; no crear semánticas de autorización distintas para cada método de login.
- Decidir `invited` vs `active` para cada método. El callback permanece read-only y no activa principals.
- Decidir selección de contexto cuando una identidad tenga simultáneamente relaciones internas, externas o
  multiorganización: selección autoritativa post-auth o deny `context_required/ambiguous`, nunca unión de permisos.
- Resolver en esta task o registrar como blocker de activación los drifts `session_360` PG↔BigQuery y Admin Center
  overlays↔`can()`; ninguna captura del panel sustituye una prueba del guard runtime.
- Registrar tasks separadas para Microsoft cliente y Google upstream si se decide llevarlos al emisor; no
  bloquear la integración aditiva mientras los providers directos sigan disponibles.

### Slice 1 — Consumir el perfil OIDC reusable y registrar Greenhouse

- Consumir la primitive/policy OIDC first-party aprobada por Slice 0 y registrar Greenhouse como primer relying
  party; no crear un branch Greenhouse-specific dentro del issuer.
- Agregar `openid` y un `id_token` ES256 para el cliente Greenhouse con `iss`, `sub`, `aud`, `iat`, `exp`,
  `auth_time` y `nonce`; no incluir roles, organización, población ni datos que el producto pueda resolver.
- El `id_token.aud` es el `client_id` Greenhouse. `openid` no entra en `EFEONCE_MCP_SCOPES`; el flujo OIDC no
  reutiliza `GrantsVersionPort`, `gv`, consentimientos/scopes MCP ni el access token de audiencia MCP.
- Definir la respuesta exacta del token endpoint para la clase OIDC y cualquier access token asociado; cerrar el
  drift de metadata que hoy anuncia firma de ID token sin emitirlo.
- Mantener separados cliente, audiencia, consentimientos, revocación y token families MCP/OIDC; metadata y
  comportamiento deben coincidir y sus registries no contaminarse.
- Registrar cliente confidencial y redirect exacto por environment mediante el command gobernado.
- Ejecutar conformance con un segundo relying party sintético: code, token, redirect, secreto y audiencia de un
  cliente nunca son aceptados por el otro. No requiere activar ni modificar Globe.

### Slice 2 — Identidad canónica y contexto Greenhouse

- Resolver primero un `identity_profile` único desde el subject verificado. Después enumerar relaciones/contextos
  Greenhouse elegibles sin asumir que la persona tiene una sola población global.
- Contexto externo: source link activo -> profile -> external membership/binding activo -> `client_users` activo
  de la misma organización -> `session_360`; ausencia, colisión, ambigüedad o mismatch deniegan.
- Contexto interno: reutilizar enrollment/contexto TASK-1836 -> profile -> principal -> member -> organización
  operativa -> membership/relación workforce vigentes -> `session_360`.
- Si ambos contextos o varias organizaciones son válidos, exigir selección autoritativa aprobada en Slice 0 o
  devolver `context_required/ambiguous`; nunca usar uno como fallback del otro ni sumar su autoridad.
- Resolver el `TenantAccessRecord` completo con roles vigentes, route groups, vistas internas, permission sets,
  overrides, scopes de filas, flags y startup policy. No sustituir page guards, entitlement checks ni filtros de
  query con claims del provider.
- Mantener las vistas cliente en `canSeeClientPortalView`: módulo vigente + vista base - veto personal. No usar
  `authorizedViews` como grant cliente ni congelar `module_assignments` en el JWT.
- Exigir unicidad del contexto `session_360` alineado al binding/organización; prohibido heredar `LIMIT 1` como
  selección de tenant. Corregir o aislar el filtro PG para excluir roles future-dated o con status no activo.
- Agregar revalidación provider-neutral del principal y provider-specific del vínculo Efeonce ID, con los SLA
  aprobados en Slice 0 y hard deny cuando `client_users` queda inactivo o desaparece.

### Slice 3 — Provider NextAuth, ledger y sesión

- Integrar provider `efeonce-auth` con issuer/audience/PKCE/state/nonce verificados y feature flag OFF por default.
- Emitir la misma forma de sesión/claims que los providers clásicos desde el `TenantAccessRecord` resuelto.
- Aplicar allowlist de claims de autenticación (`iss`, `sub`, `aud`, `exp`, `iat`, `nonce`, `auth_time` y los de
  assurance aprobados). Ignorar para autorización `roles`, `groups`, `scp`, `scope`, `gv`, `client_id`, tenant,
  organización, member, views o capabilities enviados por el issuer.
- Centralizar la materialización mediante `applyTenantAccessClaimsToToken` o successor único; evitar otra copia
  provider-specific de claims. Un outcome `revoked` debe neutralizar/eliminar autoridad y hacer que `session()` y
  los guards rechacen el JWT, no limitarse a actualizar `accessClaimsRefreshedAt`.
- Ampliar `auth_attempts` por migración aditiva y registrar outcomes sanitizados.
- No persistir tokens del issuer en la sesión expuesta al browser ni escribir identidad desde callbacks.

### Slice 4 — Exposición UI y recuperación

- Mostrar `Continuar con Efeonce ID` globalmente sólo cuando el flag/readiness lo permite, junto a Microsoft,
  Google, credenciales y magic link.
- Representar pending/degraded/denied sin enumeración y conservar alternativas si el issuer falla.
- Completar wireframe/flow, GVC 1440/390, teclado, reduced-motion, scorecard y `UI ready: yes` antes de JSX.

### Slice 5 — Canaries, rollout y rollback

- Probar matriz interna/externa con allow/deny/collision/revoked y un fingerprint de autorización efectiva contra
  cada método preservado: principal/tenant, roles, route groups, vistas internas, permission sets, módulos/vetos
  cliente, entitlements, scopes de datos y home.
- Probar no-transferencia entre planos: grant MCP no abre portal; módulo/entitlement portal no abre MCP; claims
  role-like falsificados no cambian autoridad; ocultar menú/botón no cuenta como deny sin atacar URL/API directa.
- Comparar el resultado real de `getTenantContext`, `getTenantEntitlements`/`can()`, el primitive de módulos/vetos
  cliente y los filtros de scopes; el JWT o el panel de gobernanza por sí solos no prueban acceso efectivo.
- Dark deploy; piloto interno y cohorte externa independientes. TASK-1833 gatea Production y TASK-1832 gatea
  activación externa; ninguna gatea la construcción detrás de flags OFF.
- Probar rollback con sesiones Efeonce ID ya emitidas y confirmar que los providers clásicos siguen operativos.
- Publicar el conformance/runbook de onboarding de relying parties y probar que un producto nuevo puede registrarse
  sin agregar lógica Greenhouse-specific al issuer ni tocar el catálogo MCP.

## Out of Scope

- Retirar Microsoft, Google, credenciales o magic link del portal.
- Crear un password store en Efeonce Auth o copiar hashes/credenciales del portal.
- Implementar Microsoft cliente o Google como upstreams externos dentro de esta task.
- Signup público, provisión automática, merge por email o creación de `client_users`; coordinar con TASK-1839.
- Cambiar autorización MCP, grants de herramientas o la semántica de su access token.
- Migrar el runtime, callback, sesión, tenancy o UI de Globe; corresponde a una unidad propia bajo EPIC-028.
- Implementar todos los productos futuros o concederles acceso por existir una cuenta Efeonce ID.
- Unificar cookies, sesiones, logout, roles, entitlements, workspaces, capabilities, créditos o derechos entre
  productos. Universal logout/device management queda sujeto al Delta ADR y a una unidad propia si se selecciona.
- Rediseñar globalmente la gobernanza de entitlements. El drift preexistente Admin Center overlays↔`can()` debe
  cerrarse en esta task o quedar en una unidad dueña que bloquee activación, sin ampliar silenciosamente el scope.
- Declarar convergencia final o cutover sólo porque el provider nuevo funcione.

## Detailed Spec

### Matriz normativa de autoridades

| Plano | Source of truth / enforcement point | Prohibición de cruce |
|---|---|---|
| Autenticación de persona | Efeonce Auth + upstream validado | Sólo afirma el sujeto y assurance; no concede permisos Greenhouse |
| Sesión SSO del ecosistema | Efeonce Auth | Facilita reautenticación; no reemplaza cookie ni sesión de un producto |
| Registro de producto | registry/policy first-party de Efeonce Auth | Cada RP conserva client, audience, redirects y assurance aislados |
| Delegación OAuth | Efeonce Auth: cliente, consentimiento, scope y nivel de autenticación | Scope es clase de acción, nunca rol/capability del portal |
| MCP edge | Gateway: issuer, audience, scope, población, `gv` y tool policy | No decide RBAC/UI Greenhouse |
| MCP negocio | Binding/contexto/grant actual + capability y policy del provider Greenhouse | `external_capability_grants` no abre portal |
| Principal y sesión portal | `client_users` + `greenhouse_serving.session_360` -> `TenantAccessRecord` | No se deriva de `id_token` salvo el subject verificado |
| Navegación amplia | `user_role_assignments` vigentes -> `roleCodes`/`routeGroups` | Claims role-like del issuer se ignoran |
| Vistas internas | registry/role-view + permission sets + user overrides | No usar grants MCP ni módulos cliente |
| Vistas cliente | `module_assignments` + vistas base - `user_view_overrides.revoke` | No usar `authorizedViews` como grant positivo |
| Acciones de negocio | `getTenantEntitlements` + overlays/guards canónicos de capability | Visibilidad de una vista no autoriza la acción |
| Scope de datos | project/campaign/client scopes + filtros del reader/relaciones | Acceso a ruta no amplía filas visibles |

El flujo OIDC de cada producto y el OAuth del resource MCP comparten issuer y primitives de seguridad sólo donde el
Delta ADR lo permita; no comparten audiencia, catálogo de scopes, grants resolver, versión de autoridad ni token
family. Greenhouse es el primer relying party, no una excepción hardcodeada. La identidad canónica puede ser una,
pero las relaciones, contextos y autoridades efectivas continúan separadas.

### Matriz transicional obligatoria

| Población | Métodos Greenhouse preservados | Método Efeonce ID de esta task | Autoridad efectiva |
|---|---|---|---|
| Cliente externo | Microsoft, Google, credenciales, magic link | magic link y passkey cuando TASK-1835 lo exponga; upstreams sociales fuera de scope | source link + invitation linked + binding Account 360 + `client_users`/roles vigentes |
| Colaborador interno | Microsoft Entra directo; Google/credenciales sólo si ya son elegibles por la política vigente | Microsoft Entra upstream de TASK-1836; step-up local cuando aplique | enrollment + profile + principal + member + organización + relación workforce + roles vigentes |

La contraseña permanece temporalmente sólo en Greenhouse. Su retiro exige una task/ADR posterior con adopción de
magic link/passkey, recuperación y soporte probados; no es criterio de cierre de TASK-1834.

### Resultado cerrado del resolver

El reader resuelve primero una identidad canónica y luego devuelve `resolved` con la relación/contexto seleccionado,
referencia de vínculo y `TenantAccessRecord`, o un outcome cerrado: `unlinked | inactive | context_required |
ambiguous | organization_mismatch | revoked | unavailable`. Una misma identidad puede tener varias relaciones
legítimas, pero una sesión opera exactamente un contexto y nunca su unión. El callback mapea esos outcomes a un
error público anti-enumeración y a diagnóstico sanitizado. Nunca selecciona el primer match ni reintenta por
email/dominio.

### Sesión y revocación

La sesión NextAuth conserva su cookie y shape. Puede guardar una referencia opaca mínima para revalidar el vínculo,
pero no access/refresh/id tokens del emisor ni claims de autoridad externos. Revocar source link, binding, principal,
relación workforce, role, permission set, user override, módulo, entitlement override o scope de datos debe producir
el efecto definido en la matriz del Slice 0 dentro de su SLA, medido con control positivo antes/después; una caché
positiva no puede superar ese SLA.

La semántica de revocación distingue tres familias:

- `client_users`, roles, permission sets, overrides, módulos, entitlements y scopes Greenhouse afectan todos los
  métodos de login según su enforcement point; no dependen de Efeonce ID.
- Source link, binding/contexto y sesión Efeonce Auth invalidan sólo sesiones iniciadas por Efeonce ID, sin cerrar
  Microsoft/Google/credenciales/magic link si su principal Greenhouse sigue vigente.
- Scopes, consentimientos, `gv` y `external_capability_grants` afectan OAuth/MCP; nunca cambian la sesión o los
  permisos del portal.

Estado base que la implementación debe corregir o preservar de forma honesta:

- El refresh NextAuth actual relee cada cinco minutos, pero ante principal ausente/inactivo deja vivos los claims
  anteriores. El nuevo contrato debe producir hard deny/invalidation provider-neutral.
- Módulos y vetos personales del portal cliente se reevalúan en su primitive con cache de hasta 60 segundos; no
  deben moverse al JWT para “unificar” el flujo.
- Permission sets/vistas internas y scopes materializados en sesión necesitan el freshness aprobado en Slice 0.
- Supervisor, contractor y contracting flags se calculan hoy de forma independiente; no se pueden presentar como
  prueba de revocación general del `TenantAccessRecord`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 aprobado -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- Ninguna exposición visible precede al provider+resolver fail-closed.
- Ningún rollout externo en Production precede a TASK-1833 y al gate aplicable de TASK-1832.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Usar access token MCP como identidad | auth | medium | audiencia OIDC propia + tests negativos | audience mismatch |
| Token/code/cookie de un producto aceptado por otro | auth | low/critical impact | clientes, audiencias, redirects y sesiones aislados + conformance cruzado | cross-RP acceptance |
| Duplicar o fusionar persona | identity | medium | resolver read-only, sin email fallback | identity write/collision |
| Vincular dos upstreams crea dos cuentas | identity | medium/high impact | account linking verificado contra profile único, nunca merge por email | upstream identity duplication |
| Cliente obtiene autoridad interna | access | low/high impact | población explícita y readers separados | population mismatch |
| Persona interna+cliente acumula permisos | access | medium/critical impact | selección de un contexto por sesión; prohibida la unión | cross-context privilege union |
| Principal portal no corresponde al binding | Account 360 | medium | igualdad de organización obligatoria | organization mismatch |
| Grant/scope MCP se convierte en permiso portal | access | low/high impact | planos separados + tests de no-transferencia | cross-plane authority drift |
| OIDC reutiliza `GrantsVersionPort`/`gv` | auth | medium/high impact | clase OIDC y policy de emisión separadas | portal login changes with MCP grant |
| Revocación deja sesión viva | session | medium | revalidación con SLA y canary | revocation latency breach |
| Población externa se clasifica interna | access | low/critical impact | resolver separado + tenantType server-owned | internal client-portal bypass |
| Role future-dated/no-active aparece vigente | access | medium/high impact | paridad lifecycle PG/BQ antes de rollout | role resolution drift |
| Contexto multiorganización elige primer row | tenancy | medium/critical impact | match único binding↔organization o ambiguous | nondeterministic tenant |
| Admin muestra deny/grant distinto de `can()` | entitlement | medium/high impact | prueba hot-path y owner/blocker explícito | governance-runtime drift |
| Nuevo issuer bloquea login clásico | UX | medium | provider aditivo y fault isolation | classic provider regression |

### Feature flags / cutover

- Definir dos flags OFF por default: contrato OIDC del issuer y provider visible/aceptado por Greenhouse.
- Si la infraestructura de flags soporta cohortes por población, separar interno/externo; si no, el resolver debe
  aplicar allowlist server-side post-callback sin enumeración.
- No existe cutover de métodos en esta task.

### Rollback plan per slice

| Slice | Rollback | Tiempo objetivo | Reversible? |
|---|---|---|---|
| 1 | flag issuer OFF; conservar OAuth/MCP existente | < 10 min | sí |
| 2–3 | provider portal OFF + redeploy; invalidar/revocar sesiones Efeonce ID | < 15 min | sí |
| 4 | ocultar acción por flag sin tocar providers clásicos | < 10 min | sí |
| 5 | retirar cohorte por población y confirmar deny | < 15 min | sí |

La migración del enum/check de `auth_attempts` es expand-only y puede permanecer tras rollback.

### Production verification sequence

1. Flags OFF: metadata legacy, MCP y cuatro métodos del portal sin regresión.
2. Staging: perfil OIDC reusable + cliente Greenhouse; segundo RP sintético prueba aislamiento; access token MCP
   rechazado como identidad.
3. Staging externo: mismo user/profile/org/roles que método clásico; casos missing/mismatch/revoked denegados.
4. Staging interno: mismo principal/member/org/roles que Entra directo; baja/revocación deniega.
5. Assurance incremental de callback, account linking, token substitution, CSRF/state/nonce y enumeración.
6. Piloto Production interno; luego cohorte externa autorizada; observar antes de ampliar.
7. Rollback completo con sesión vigente y control positivo de providers clásicos.
8. Publicar conformance/onboarding; la adopción real de Globe permanece cerrada hasta su unidad y gates propios.

### Out-of-band coordination required

- Delta ADR aprobado; cliente/audiencia/redirects; secrets y env vars por target; deploy auth-server; Vercel
  config/redeploy; cohortes nominadas; owner de assurance y soporte.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como verifico y cierro?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Delta ADR aprobado declara Efeonce ID como única autoridad de autenticación humana de productos Efeonce para
      clientes e internos; separa issuer, upstream, relaciones/poblaciones, contexto y autoridad, y actualiza los
      límites previos de MCP/Greenhouse/Entra.
- [ ] El Delta ADR fija la estrategia de `sub`, account/factor linking, privacidad/correlación, sesión SSO,
      assurance y revocación/logout por relying party sin compartir cookies o tokens entre productos.
- [ ] Existe una unidad backend-critical dueña del perfil OIDC/registry/conformance/onboarding reusable y una unidad
      separada de adopción Globe coordinada con TASK-1480/TASK-1511; TASK-1834 no declara implementadas esas unidades.
- [ ] El Delta ADR incluye la matriz de autoridades/no-transferencia y la matriz de revocación por mecanismo,
      cache, SLA y evidencia; la convergencia de login no cambia quién autoriza el portal.
- [ ] `auth.efeonce.org` ofrece un OIDC coherente para Greenhouse; `openid` produce `id_token` con nonce y
      `aud=client_id` Greenhouse, fuera de `EFEONCE_MCP_SCOPES` y sin reutilizar `GrantsVersionPort`, `gv`,
      consentimientos o access token MCP.
- [ ] El perfil OIDC reusable permite registrar un segundo RP sintético sin branch Greenhouse-specific ni cambio al
      catálogo MCP; code/token/redirect/secret/audience de un RP son rechazados por el otro.
- [ ] El resolver obtiene una identidad canónica y exactamente un contexto Greenhouse/`TenantAccessRecord`, o
      outcome cerrado, sin email/domain fallback, elección arbitraria ni unión de permisos.
- [ ] La misma identidad puede sostener relaciones internas, externas y multiorganización; `context_required` o
      `ambiguous` bloquea la sesión hasta una selección autoritativa y ninguna relación amplía a otra.
- [ ] Cliente externo nunca recibe autoridad interna y una relación interna no hereda módulos, entitlements o
      workspaces de una relación cliente sólo por compartir identidad.
- [ ] Perfil sin `client_users`, principal/profile inactivo, múltiples principals, organization mismatch,
      binding/source link revocado o relación workforce terminada fallan cerrado; rol/permission set/override/módulo/
      entitlement/scope retirado produce el deny definido por su enforcement point.
- [ ] Callback/revalidación no crean ni modifican perfiles, links, principals, memberships, bindings, members o roles.
- [ ] La misma persona obtiene `userId`, `identityProfileId`, `organizationId`, `memberId` cuando aplica y el mismo
      fingerprint efectivo que con el método clásico: roles, route groups, vistas internas, permission sets,
      módulos/vetos cliente, entitlements, scopes de datos y home.
- [ ] Permission set/rol vigente aparece y su expiración/revocación retira acceso dentro del SLA aprobado; un
      principal inactivo o ausente invalida la sesión en vez de conservar claims anteriores.
- [ ] `session_360`/resolver aplica `active`, `status`, `effective_from` y `effective_to` de roles de forma
      equivalente en el path autoritativo; principals `invited` tienen una semántica explícita y no se activan en
      callbacks read-only.
- [ ] Cero/uno/múltiples contextos de `session_360` producen respectivamente deny/resolved/ambiguous; ningún
      `LIMIT 1` selecciona silenciosamente organización, space o tenant.
- [ ] Pausar/expirar un módulo cliente y aplicar `user_view_overrides.revoke` cierra menú, command palette y URL
      directa según `canSeeClientPortalView`; `authorizedViews` no actúa como grant positivo del portal cliente.
- [ ] Retirar un project/campaign/client scope elimina filas visibles aunque la ruta permanezca abierta, y negar
      un entitlement/capability bloquea la acción aunque la vista sea visible.
- [ ] La paridad de entitlement se verifica ejecutando `getTenantEntitlements`/`can()` y el guard/API real. Si los
      overlays del Admin Center siguen sin alimentar ese hot path, existe una unidad dueña enlazada que bloquea la
      activación; el panel no se acepta como evidencia.
- [ ] Un grant MCP activo no abre ninguna superficie/acción del portal y un módulo/entitlement Greenhouse no permite
      emitir scopes ni ejecutar tools MCP.
- [ ] Claims `roles`, `groups`, `scp`, `scope`, `gv`, tenant/org/member/view/capability falsificados en el ID token
      no alteran la sesión ni el acceso resuelto; las pruebas atacan URL/API directa, no sólo visibilidad UI.
- [ ] Person 360 conserva el mismo perfil/link y Account 360 la misma organización; no se presenta invitation linked como `person_memberships`.
- [ ] Microsoft, Google, credenciales y magic link vigentes siguen funcionando con flags ON y OFF; una falla de Efeonce ID no los bloquea.
- [ ] La contraseña permanece sólo en Greenhouse; no se crea password store ni se copian hashes al emisor.
- [ ] La UI usa botón global gated, no descubre organización por email, no enumera cuentas y pasa wireframe/flow/readiness/GVC desktop-mobile/teclado/reduced-motion.
- [ ] `auth_attempts` admite el provider nuevo mediante migración aditiva y registra outcomes sanitizados sin PII/tokens/raw errors.
- [ ] Revocación de cada autoridad relevante deniega una sesión vigente dentro del SLA medido y no afecta otra población/principal.
- [ ] Rollback por población invalida/deniega sesiones Efeonce ID y mantiene intactos vínculos, perfiles y providers clásicos.
- [ ] TASK-1833 cubre el delta OIDC/callback antes de Production; TASK-1832 autoriza la cohorte externa antes de activarla.
- [ ] Microsoft cliente y Google upstream quedan en tasks separadas antes de cualquier retiro de sus providers directos.
- [ ] Un producto futuro puede aplicar el runbook de onboarding y resolver el mismo `identity_profile` sin crear
      cuenta humana, password store, lógica ad hoc en el issuer ni autorización cross-product.
- [ ] Dos métodos upstream vinculados y autorizados para la misma persona resuelven el mismo `identity_profile`;
      no se vinculan por coincidencia de email y no crean perfiles duplicados.
- [ ] Tener Efeonce ID sin membership/grant/contexto del producto falla cerrado; una cuenta común no aprovisiona
      acceso universal.
- [ ] Documentación funcional, manual, ledger de flags, task/epic y evidencia runtime quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1834`
- `pnpm ui:wireframe-check --task TASK-1834`
- `pnpm ui:flow-check --task TASK-1834`
- `pnpm ui:motion-check --task TASK-1834`
- `pnpm ui:readiness-check --task TASK-1834`
- tests focales auth-server/OIDC, resolver, NextAuth, ledger/migration y Login
- `pnpm local:check` y gates build/deploy aplicables al auth-server
- canaries reales staging/Production por población, revocación y rollback
- assurance incremental posterior al código, no sólo el pentest anterior

## Closing Protocol

- [ ] `Lifecycle`, carpeta, `Status real` y acceptance actualizados con evidencia proporcional.
- [ ] `docs/tasks/README.md`, EPIC-044, ADRs, docs funcionales/manuales y ledgers sincronizados.
- [ ] `pnpm task:lint --task TASK-1834`, QA/docs/context gates aplicables pasan.
- [ ] No se afirma cutover, retiro de provider ni convergencia final sin task/ADR y evidencia separadas.

## Follow-ups

- Registrar la foundation reusable de Efeonce ID multiproducto: registry/policy de relying parties, conformance,
  onboarding, revocación/logout y observabilidad, como unidad backend-critical de EPIC-044.
- Registrar la adopción de Efeonce ID por Globe como unidad propia de EPIC-028, sucesora del broker vigente y
  coordinada con TASK-1480/TASK-1511; preservar cookie/sesión y autorización Globe.
- Upstream Microsoft para clientes en Efeonce ID, si el Delta ADR lo selecciona.
- Upstream Google para clientes en Efeonce ID, si el Delta ADR lo selecciona.
- Migración/retiro de credenciales Greenhouse después de adopción y recuperación passwordless probadas.
- Resolver la brecha preexistente de revocación en el consume del magic link del portal fuera de esta task.

## Open Questions

- La estrategia de subject del perfil first-party (`public` estable vigente vs pairwise) debe decidirse en el Delta
  ADR con su impacto de privacidad, linking, auditoría y migración; nunca se cambia silenciosamente.
- Universal logout/device management y un password propio no están decididos. El ADR vigente es passwordless; si se
  exige contraseña en Efeonce ID, requiere decisión explícita y nunca importación de hashes Greenhouse.
- Los nombres finales de flags, SLA de revocación e IDs de las unidades nuevas se fijan antes de Slice 1.
