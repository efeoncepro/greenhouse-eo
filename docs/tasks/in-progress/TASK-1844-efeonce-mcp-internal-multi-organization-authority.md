# TASK-1844 — Efeonce MCP: autoridad interna multiorganización por objetivo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `copy`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1835-efeonce-id-login-consent-screens.md`
- Flow: `docs/ui/flows/TASK-1835-efeonce-id-login-consent-screens-flow.md`
- Motion: `docs/ui/motion/TASK-1835-efeonce-id-login-consent-screens-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `2026-09-08: goal confirmado; discovery, plan y checkpoint humano P1/Alto aprobados; inicia implementación. PG real exige context_version=1 y unicidad sin versión; el plan propone transición coordinada y permisos efectivos por target. Baseline: 52 pruebas focales passed; tipos y lint sin errores (26 warnings UI previos); gateway check con 154 passed, 0 skipped y build correcto. Delta ADR Accepted. Sin código v2, migración, cambio de permisos, deploy ni activación.`
- Rank: `Después del cierre de TASK-1813; antes del uso interno multiorganización en Codex o Claude`
- Domain: `identity|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; gateway en el repo hermano efeonce-mcp main mediante PR; checkouts compartidos; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extender el acceso MCP del personal interno para que una sola conexión de Codex o Claude pueda operar cualquier
organización que Greenhouse autorice para esa persona. El token conserva un contexto interno como ancla del actor;
cada tool org-scoped recibe una `organizationId` explícita y Greenhouse revalida en vivo la combinación exacta
`actor + capability + organización objetivo` antes del dispatch.

## Why This Task Exists

El carril productivo de `TASK-1836`/`TASK-1831` es correcto y fail-closed, pero su contrato es deliberadamente
uniorganización: `InternalAuthorizationContext` persiste un `bindingId` y una `organizationId`; el access token
lleva `authorization_context_id` y un solo `gv`; el reader interno responde una sola organización; y el resolver
del gateway envuelve esa respuesta en un array de una membership.

Eso permitió certificar identidad corporativa, consentimiento, token, lectura propia, rechazo ajeno, refresh y
revocación sin mezclar tenants. No satisface el requisito posterior del operador: su conexión personal interna debe
poder trabajar en todas las organizaciones que su autoridad Greenhouse vigente permita.

El gateway ya posee parte de la forma necesaria: `evaluateToolAuthority` filtra memberships por capability,
requiere coincidencia exacta de `organizationId` y reemplaza el argumento antes de llamar al provider. Lo faltante
no es rehacer el multi-issuer de `TASK-1831`, sino diseñar y entregar la autoridad multiorganización interna de
punta a punta: proyección canónica, versión de consentimiento, contrato reader, adaptación del resolver y prueba
real en clientes.

## Goal

- Una conexión interna base-only puede descubrir sus organizaciones autorizadas y elegir una por ID canónico.
- Cada llamada org-scoped se autoriza con datos vigentes de Greenhouse; una organización no autorizada se deniega
  antes del provider y nunca se infiere por correo, dominio, rol global o primer match.
- Agregar o retirar autoridad organizacional se refleja sin reconectar en cada cambio; la transición inicial sí
  exige consentimiento fresco y nunca eleva consentimientos anteriores silenciosamente.
- Codex y Claude verifican A/B permitidas, C denegada, revocación y aislamiento concurrente sin ampliar el canary
  sintético ni el scope OAuth base.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

Reglas obligatorias:

- El contexto firmado sigue siendo el ancla de identidad, cliente, audiencia, población y sesión corporativa; no
  se incrusta una lista de organizaciones ni un wildcard en el JWT.
- `efeonce.mcp.read` expresa la clase de acción del cliente, no autoridad sobre tenants. No se agrega un scope por
  organización ni se amplía discovery.
- La organización objetivo proviene de un argumento explícito validado contra el schema de la tool. Greenhouse
  decide autoridad con un reader machine-only y vigente; el gateway sólo consume el resultado.
- El provider conserva el recheck de módulo, entitlement y regla de negocio. El reader de identidad no reemplaza
  autorización del dominio.
- Un consentimiento anterior de contexto único no obtiene acceso multiorganización. La nueva versión contractual
  fuerza una ceremonia de consentimiento por cliente antes del primer token multiorganización.
- Revocar persona, sesión, contexto, capability o acceso a una organización deniega llamadas nuevas con token aún
  vigente dentro de la cota aprobada. No hay caché positiva de autorización para la cohorte inicial.
- La población externa, el canary sintético y Entra legacy permanecen sin cambios y conservan sus propias pruebas.

## Normative Docs

- `docs/tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md`
- `docs/tasks/in-progress/TASK-1831-efeonce-mcp-gateway-multi-issuer-authorization-context.md`
- `docs/tasks/complete/TASK-1813-efeonce-mcp-oauth-client-interoperability.md`
- `docs/operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `.codex/skills/efeonce-mcp-platform/references/native-authority.md`
- `.codex/skills/efeonce-mcp-platform/references/client-certification.md`

## Dependencies & Impact

### Depends on

- `TASK-1836`: autenticación corporativa, enrollment, sesión, contexto, consentimiento y revocación internos ya
  desplegados para una organización.
- `TASK-1831`: verificación multi-issuer, reader por `jti`/contexto y autorización antes del provider ya desplegados.
- `src/lib/organization-workspace/relationship-resolver.ts` y `src/lib/entitlements/runtime.ts`: fuentes canónicas
  que el plan debe componer para decidir autoridad interna sobre una organización, sin copiar reglas.
- `src/lib/auth-server/internal/context.ts` y `src/lib/identity/internal-access/store.ts`: ancla interna vigente.
- `../efeonce-mcp/src/auth/{binding-resolver,tool-policy,authorized-tools}.ts`: consumer del contrato.

### Blocks / Impacts

- Uso personal interno multiorganización desde Codex, Claude Code y las superficies hospedadas de Claude.
- Reconexión única de los clientes internos al activar la nueva versión de consentimiento.
- No bloquea el cierre técnico de `TASK-1813` ni modifica la ventana/cleanup del canary `TASK-1832`.

### Files owned

- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (Delta ADR multiorganización)
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (versión de contexto/consentimiento)
- `src/lib/identity/internal-access/**`
- `src/lib/auth-server/internal/**`
- `src/lib/auth-server/oauth/**` (sólo integración de contexto y consentimiento)
- `src/lib/api-platform/resources/ecosystem-identity-binding.ts`
- `src/app/api/platform/ecosystem/identity/binding/route.ts`
- `../efeonce-mcp/src/auth/binding-resolver.ts`
- `../efeonce-mcp/src/auth/tool-policy.ts`
- `../efeonce-mcp/src/auth/authorized-tools.ts`
- `../efeonce-mcp/src/mcp.ts` y tests/surface baseline sólo si el plan confirma una tool de descubrimiento propia
- documentación, tests y runbooks directamente afectados por `TASK-1844`

Ampliación propuesta por discovery: merger efectivo en `src/lib/entitlements`, su consumer
`src/lib/admin/entitlements-governance.ts`, readers estrictos de tenant/relationship, verifier/context
del gateway, config/flags, SQL pendientes y copy/renderer del consentimiento. Detalle y límites en
[Files to modify del plan](../plans/TASK-1844-plan.md#files-to-modify); sujetos a aceptación del plan.

## Current Repo State

### Already exists

- `InternalAuthorizationContext` liga persona, cliente, audiencia, sesión, binding y organización, y se revalida
  contra autoridad vigente antes de emitir/renovar.
- `/api/platform/ecosystem/identity/binding` recibe credencial machine-only y todas las dimensiones firmadas; el
  gateway nunca consulta SQL directamente.
- `createNativeBindingResolver` vuelve a consultar el reader por request y no usa caché positiva interna.
- `evaluateToolAuthority` exige capability, permite seleccionar por `organizationId`, falla ante ambigüedad y
  reemplaza el argumento validado antes del provider.
- El consentimiento ya puede renderizar una colección de organizaciones; el carril interno sólo le entrega una.
- `TASK-1836` tiene pruebas de dos contextos separados A/B, aislamiento de `gv` y revocación. Eso prueba dos tokens
  uniorganización, no un token base que seleccione A o B por llamada.

### Gap

- La autoridad interna se resuelve contra el único operating entity `EO-ORG-0007`; no proyecta las organizaciones
  de clientes que la persona puede operar por autoridad Greenhouse.
- El reader interno devuelve campos escalares y el resolver del gateway fabrica una sola membership.
- El filtro de `gv` del gateway asume que la versión del contexto ancla y la de cada organización objetivo son la
  misma; esa igualdad no representa autoridad multiorganización.
- No existe contrato versionado que obligue a reconsentir al pasar de uniorganización a multiorganización.
- No hay prueba real de una misma familia/token llamando A y B, denegando C y observando revocación selectiva.
- El agente necesita una forma read-only y minimizada de descubrir IDs/nombres autorizados; la superficie exacta
  debe decidirse en el Delta ADR antes de agregar una tool.

### Discovery 2026-09-08

El [plan](../plans/TASK-1844-plan.md#discovery-summary) registra lectura real de PG/Cloud Run y cinco
archivos de pruebas existentes (52 passed). La unicidad PG no incluye versión y el writer depende de
ese índice; la transición exige expansión, writer compatible y retiro gobernado del índice anterior.
El reader de delegación actual usa sólo permisos base y la proyección de roles omite parte de su vigencia.
El texto de consentimiento también requiere un delta `ui-lite`: no puede presentar la lista actual como
alcance fijo si v2 permite altas/bajas autorizadas sin reconectar. No hay implementación v2 todavía.

## Hybrid Execution Justification

- Why not split: `el único consumer visible es el copy de la ceremonia OAuth existente; separarlo permitiría emitir una clase de autoridad cuyo alcance no se explica. No hay nueva composición ni selector. El cambio de schema pertenece íntegramente al backend y no habilita trabajo UI adicional.`
- Primary execution profile: `backend-data`; UI `ui-lite` limitada a copy/DTO del consentimiento.
- Contract boundary: `contexto server-owned v2 -> ConsentContextResolution -> renderer existente; sin stores/tokens en browser`.
- Risk controls: `aprobar primero ADR/plan; backend y migración preparados antes del delta UI; GVC del renderer y prueba GET/POST antes de emitir v2; ningún rediseño de TASK-1835`.

## UI/UX Contract

- Rigor: `ui-lite`; la estructura de TASK-1835 se reutiliza. `UI ready: no` hasta aceptar y completar
  el delta de copy/mapping antes del slice 3. Los contratos históricos enlazados son referencia, no prueba v2.
- Flow/motion: se conservan los contratos de TASK-1835; esta task no añade navegación ni animaciones.
- Primitive decision: `reuse`; `renderConsentPage`, shell, lista de organizaciones/permisos y botones existentes.
- Estados: v1/externo conserva presentación; v2 muestra clase dinámica y organizaciones actuales; actor
  sin autoridad/reader no disponible no presenta nombres ni ofrece un consentimiento engañoso.

### Implementation mapping

`src/lib/auth-server/internal/consent-context.ts` entrega contexto/versión y nombres autorizados;
`src/lib/auth-server/oauth/pages/render.ts` consume ese DTO; el nuevo texto vive en
`src/lib/copy/auth-server.ts`. No se toca CSS, composición, tokens ni navegación. GET/POST conserva
la clase de autoridad presentada, además de las protecciones de origen y retorno existentes.

### GVC scenario plan

Quality profile: premium. Renderer real en desktop y 390 px, nombres largos, 1/N organizaciones,
v1/v2 y estados de deny. Revisar capturas, teclado y `scrollWidth === clientWidth`; no confundir
fixtures visuales con tokens o clientes reales. Reutilizar el harness de consentimiento de TASK-1835
y registrar el delta de scenario/dossier antes de declarar UI ready.

### Design decision log

2026-09-08, propuesto: conservar pantalla y jerarquía actuales; explicar que el acceso sigue las
organizaciones autorizadas mientras permanezca activo y rotular la lista como estado actual.
Se descarta un selector que altere el target del token y una lista estática presentada como alcance fijo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse src/lib/identity/internal-access, src/lib/auth-server e API Platform; consumer en ../efeonce-mcp/src/auth`
- Future candidate home: `remain-shared`
- Boundary: reader machine-only de autoridad organizacional + DTO versionado consumido por el gateway; providers reciben sólo organizationId ya autorizada
- Server/browser split: `contrato íntegramente server-only; tokens, DB, stores, reader y policy nunca entran al browser`
- Build impact: `sin dependencia pesada ni filesystem input nuevo; un cambio de superficie MCP exige baseline y bump de servidor`
- Extraction blocker: `la decisión compone sesión corporativa, contexto OAuth, entitlement Greenhouse y autorización del provider en dos runtimes`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `autoridad interna Greenhouse + contexto/consentimiento OAuth; el gateway es consumer`
- Consumidores afectados: `auth-server, API Platform ecosystem, gateway MCP, Codex y Claude`
- Runtime target: `Greenhouse Production + auth-server Cloud Run + efeonce-mcp Cloud Run`

### Contract surface

- Contrato existente a respetar: `InternalAuthorizationContext`, `GrantsVersionPort`,
  `/api/platform/ecosystem/identity/binding`, `NativeBindingResolution` y `evaluateToolAuthority`
- Contrato nuevo o modificado: `proyección interna multiorganización versionada, consentimiento de nueva semántica y resolución exacta de organización objetivo`
- Backward compatibility: `gated`; tokens/contextos/consentimientos v1 siguen uniorganización y nunca se interpretan como v2
- Full API parity: `sí`; el reader de autoridad es la única primitive y OAuth/gateway/clientes son consumers

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_auth.authorization_contexts`, `greenhouse_auth.client_consents` y sólo las tablas canónicas que el Delta ADR confirme para versionar el contrato; sin lista de organizaciones en access_tokens
- Invariantes que no se pueden romper:
  - `El contexto identifica al actor; organizationId identifica el objetivo de una llamada y no modifica el actor.`
  - `Cada objetivo se autoriza por capability vigente y organización exacta antes del provider.`
  - `A y B conservan versiones/revocaciones independientes; cambiar B no invalida ni amplía A.`
  - `La misma petición nunca cruza argumentos, resolución, resultados ni handles entre organizaciones.`
- Write-target allowlist: `src/lib/auth-server/boundary-domain.test.ts`; toda tabla nueva o write nuevo se declara allí en el mismo PR
- Tenant/space boundary: `profile/subject/contexto firmados + organizationId explícita + relación/entitlement canónicos de Greenhouse`
- Idempotency/concurrency: `readers puros; creación/consentimiento de contexto mantiene transacción y unicidad vigentes; pruebas concurrentes A/B obligatorias`
- Audit/outbox/history: `consentimiento y revocación conservan oauth_audit_events; el reader emite señales sanitizadas para deny/drift sin registrar PII ni token`

### Migration, backfill and rollout

- Migration posture: `expand/contract` propuesta: CHECK 1/2 e índice versionado, writer compatible y retiro posterior del índice anterior tras readback; SQL pendientes, sin borrar datos ni backfill de permisos
- Default state: `flags nuevas OFF para issuer/reader y gateway; v1 sigue siendo el fallback explícito mientras v2 no esté activa`
- Backfill plan: `sin backfill de consentimiento; los clientes internos reautorizan y crean autoridad v2 de forma explícita`
- Rollback path: `apagar primero emisión v2, luego consumo v2 en gateway; tokens/consentimientos v2 quedan denegados y v1 uniorganización sigue disponible sólo si la policy de rollback lo autoriza`
- External coordination: `ventana de reconexión para las cuentas internas de Codex y Claude; sin cambios en Entra ni permisos de clientes`

### Security and access

- Auth/access gate: `JWT ES256 + issuer/audience/azp/scope/jti/contexto + reader machine-only + capability/organización exactas + provider recheck`
- Sensitive data posture: `identidad interna y tenants; payload minimizado, sin email, token, cookie, roles brutos ni claims upstream`
- Error contract: `denegación fail-closed y anti-oracle; errores sanitizados para contexto inválido, organización ausente/ambigua/no autorizada y reader unavailable`
- Abuse/rate-limit posture: `límites OAuth/MCP vigentes; listado paginado/minimizado y sin enumerar organizaciones fuera de autoridad`

### Runtime evidence

- Local checks: `tests focales de auth-server/identity/API Platform + pnpm mcp:manifest:check; pnpm check en ../efeonce-mcp`
- DB/runtime checks: `transición compatible y readers contra PG real mediante pnpm test:live tras apply aprobado; readback de consentimiento/contexto/token sin exponer secretos`
- Integration checks: `un token interno v2 permite A/B y deniega C antes del provider; missing/ambiguous fail-closed; external/Entra regresión verde`
- Reliability signals/logs: `deny por organización, context/version drift, revocación aún despachando y reader unavailable; nombres exactos se fijan en el Delta ADR`
- Production verification sequence: `flags OFF -> deploy compatible Greenhouse -> deploy gateway compatible -> canary interno v2 -> reconsentimiento Codex/Claude -> revocación y rollback -> flags finales/readback`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects. Evidencia: [plan propuesto 2026-09-08](../plans/TASK-1844-plan.md#backenddata-contract); implementación/aceptación pendientes.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit. Evidencia: [plan propuesto 2026-09-08](../plans/TASK-1844-plan.md#backenddata-contract); implementación/aceptación pendientes.
- [ ] Toda tabla nueva queda declarada con su justificación en `src/lib/auth-server/boundary-domain.test.ts` en el mismo PR.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk. Evidencia: [plan propuesto 2026-09-08](../plans/TASK-1844-plan.md#backenddata-contract); implementación/aceptación pendientes.
- [x] Runtime or DB evidence is listed for every contract change beyond docs. Evidencia: [plan propuesto 2026-09-08](../plans/TASK-1844-plan.md#backenddata-contract); implementación/aceptación pendientes.
- [ ] Errores, audit y señales no exponen PII, tokens, cookies, upstream claims ni organizaciones no autorizadas.

## Capability Definition of Done — Full API Parity gate

- [ ] La autoridad vive en un reader server-side canónico de Greenhouse; no en la UI, el gateway o un provider.
- [ ] OAuth, API Platform y gateway consumen el mismo DTO versionado y no duplican reglas de relación/entitlement.
- [ ] La lectura de organizaciones autorizadas es programática y paginada/minimizada; no depende de IDs escritos en prompts.
- [ ] Cada tool org-scoped conserva autorización fina, errores sanitizados y recheck del provider.
- [ ] El cambio no agrega una integración Nexa-específica ni lógica de negocio al gateway.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Execution Plan

- [Plan y auditoría TASK-1844](../plans/TASK-1844-plan.md), 2026-09-08.
- Goal, plan y Delta ADR **aprobados por el operador el 2026-09-08** («Aprobado»).
- Estrategia `sequential`, sin subagentes; Greenhouse develop y gateway main, checkouts compartidos.
- Se inicia ejecución secuencial con gates OFF. Apply y rollout se preparan para aprobación final.
- Baseline completo y precisión del enlace GET/POST del consentimiento registrados en
  [el plan](../plans/TASK-1844-plan.md#baseline-completo-previo-a-implementación--2026-09-08).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Delta ADR y contrato versionado

- Actualizar la decisión de autoridad interna con separación explícita entre contexto actor y organización
  objetivo; elegir el DTO/listado minimizado y la semántica de `gv` por ancla y por objetivo.
- Versionar contexto/consentimiento para que v1 no obtenga autoridad v2. Mantener scope base y JWT sin lista/wildcard.
- Definir flags, errores, señales, orden de rollout y retiro/rollback antes de código.

### Slice 2 — Reader canónico multiorganización en Greenhouse

- Resolver las organizaciones objetivo desde relaciones y entitlements canónicos de la persona interna, sin
  reutilizar `external_capability_grants` ni inferir por rol/email/dominio.
- Extender el reader machine-only con DTO estricto, versiones por objetivo y una lectura minimizada para discovery.
- Probar 0/1/N, A/B/C, revocación selectiva, persona/contexto inválidos, datos ambiguos y fallo de DB.

### Slice 3 — Emisor, consentimiento y continuidad OAuth

- Crear autoridad v2 desde la sesión corporativa y el actor ancla; el consentimiento muestra las organizaciones
  vigentes usando las primitives existentes, sin rediseño visual ni selector que cambie el target del token.
- Exigir consentimiento fresco por cliente para v2; code/refresh conservan identidad, contexto, scopes y auth_time
  y nunca amplían permisos por sí mismos.
- Verificar revocación de familia/contexto y que cambios posteriores de organización se leen en cada llamada.

### Slice 4 — Consumer gateway y descubrimiento agéntico

- Aceptar el DTO interno N-organizaciones sin colapsarlo; validar ancla/versión y entregar memberships frescas a
  `evaluateToolAuthority`.
- Eliminar la igualdad incorrecta entre `gv` del ancla y versiones de objetivos, sustituyéndola por el contrato
  versionado del reader. Mantener el carril v1 fail-closed.
- Definir e implementar la mínima superficie read-only para que el agente descubra ID/nombre autorizados. Si es
  una tool nueva, declarar policy/annotations, baseline, evaluación de contexto y bump minor del servidor.

### Slice 5 — Matriz local, staging y producción interna

- Mismo token/familia: listar A/B, leer A, leer B, denegar C, denegar missing/ambiguous y repetir A después del deny.
- Revocar capability global deniega A/B; retirar B no afecta A; concurrencia A/B no mezcla args/resultados/handles.
- Regresión externa/canary y Entra legacy; ningún cambio de scope, grant o redirect en esos carriles.
- Activar sólo para la cohorte interna acordada, reautorizar Codex y Claude una vez y demostrar cambios posteriores
  de autoridad sin reconectar. Ejecutar rollback real y readback final.

### Slice 6 — Cierre y transferencia de ownership

- Actualizar TASK-1836 y TASK-1831 con evidencia, sin reescribir su entrega original.
- Registrar matriz cliente, revisión/SHA/flags/readbacks, riesgos residuales y protocolo de reconexión interna.
- Cerrar sólo cuando producción y clientes demuestren el contrato; código verde con flags OFF es
  `code complete, rollout pendiente`.

## Out of Scope

- Autoridad de clientes externos, ampliación del canary sintético o el piloto comercial de `TASK-1841`.
- Scopes OAuth por organización, wildcard/lista de organizaciones en JWT, inferencia por dominio/email/rol o
  agregación de permisos sin reader canónico.
- Escrituras MCP nuevas, gasto proveedor, cambios de redirects/clientes Entra o distribución de credenciales.
- Rediseñar las pantallas de `TASK-1835`; se reutiliza su capacidad existente de mostrar N organizaciones.
- Convertir el gateway en autoridad, consultar SQL desde él o quitar el recheck del provider.
- Implementar acceso multiorganización para personas externas; esta task es exclusivamente personal interno.

## Detailed Spec

### Contrato de autoridad

```text
JWT v2 interno
  -> identifica actor/contexto ancla; no enumera organizaciones
  -> gateway valida issuer/audience/azp/scope/jti/contexto
  -> reader Greenhouse resuelve targets vigentes para ese actor
  -> tool exige organizationId exacta
  -> gateway autoriza capability+target y reemplaza el argumento
  -> provider revalida módulo/entitlement/regla de negocio
```

### Semántica de cambio de permisos

- Cambio de v1 a v2: consentimiento fresco obligatorio en cada cliente OAuth.
- Alta/baja posterior de una organización o capability: efectiva desde el siguiente readback, sin reconsentimiento
  mientras no cambie materialmente el set de scopes ni la clase de autoridad consentida.
- Revocación de familia/contexto/persona: deniega todo el actor.
- Revocación de B: deniega sólo B; A continúa si su autoridad sigue vigente.

### Compatibilidad de clientes

- Codex conserva su propia familia OAuth y requiere una reautorización v2.
- Claude Code conserva una familia separada y requiere su propia reautorización v2.
- Las superficies hospedadas de Claude comparten conector/identidad OAuth para la misma cuenta; se certifican por
  separado como UI, sin fabricar DCR adicionales.
- La prueba de un cliente no sustituye `tools/list`, dispatch, refresh y revoke en los demás.

## Rollout Plan & Risk Matrix

El cambio es auth/identity cross-runtime y se entrega aditivo, versionado y detrás de flags OFF. No se interpreta
un deploy compatible como activación. La promoción requiere evidencia local, PG, staging/canary interno, clientes
reales internos, revocación y rollback.

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5 -> Slice 6.
- El reader/DTO compatible de Slice 2 debe desplegarse antes que el gateway consuma v2.
- El gateway compatible debe desplegarse con su flag OFF antes que el emisor produzca autoridad v2.
- Ninguna activación interna general precede al canary completo y al consentimiento fresco; la prueba
  inicial usa exclusivamente la cohorte explícita del plan y requiere aprobación de rollout.
- El rollback apaga primero emisión v2 y luego consumo v2; no deja tokens v2 con un reader permisivo o ausente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cross-tenant por target manipulado | identity/MCP | medium / critical impact | organizationId explícita + reader por request + deny antes del provider | deny/dispatch mismatch por organización |
| Consentimiento v1 gana autoridad v2 | OAuth | medium | versionado + reconsentimiento obligatorio + test de migración negativa | consentimiento legacy usado por contexto v2 |
| `gv` del ancla invalida o amplía otro target | auth/gateway | medium | separar versión del ancla y versiones target; reader vigente | context/version drift |
| A/B se mezclan bajo concurrencia | MCP/provider | low / critical impact | estado por request, reemplazo defensivo de argumentos y pruebas concurrentes | correlationId con organización inconsistente |
| Catálogo/listado revela tenants ajenos | identity/data | medium | projection allowlisted y minimizada; anti-oracle/paginación | respuesta contiene organización fuera del set autorizado |
| Rollout parcial entre dos runtimes | release | medium | DTO backward-compatible, flags separadas, orden fijo y rollback probado | invalid_response/unavailable sostenido |

### Feature flags / cutover

- Greenhouse/auth-server: nueva flag `AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED`, default `false`.
- Greenhouse reader: `IDENTITY_INTERNAL_MULTI_ORG_ENABLED`, default `false`.
- Gateway: nueva flag `MCP_NATIVE_INTERNAL_MULTI_ORG_ENABLED`, default `false`.
- Cohorte inicial: `AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS`, vacía por defecto; sin wildcard.
- Las flags no sustituyen el consentimiento versionado ni el reader. Activarlas sin authority v2 válida debe
  denegar, no caer al carril externo ni sumar memberships.
- Los nombres definitivos quedan ratificados en el Delta ADR y registrados en el ledger antes del primer deploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert documental antes de Accepted; después, nueva enmienda | <1 día | sí antes de aceptación |
| 2 | flag reader OFF + revert sólo hacia writer compatible con ambos índices; conservar schema/auditoría | <15 min | sí, con revisión compatible preparada |
| 3 | flag de emisión OFF; denegar creación/refresh v2 | <15 min | sí, sin backfill |
| 4 | flag gateway OFF + tráfico a revisión compatible anterior | <15 min | sí |
| 5 | cortar cohorte v2, revocar familias de prueba y reconectar v1 sólo si la policy lo autoriza | <30 min | sí |
| 6 | corrección documental con readback; nunca borrar auditoría | <1 día | sí |

### Production verification sequence

1. Aprobar Delta ADR y fijar DTO, versiones, flags, señales y compatibilidad v1/v2.
2. Implementar/migrar local; tests focales, live serializados y readback de migration.
3. Desplegar Greenhouse compatible con flag OFF; verificar v1 idéntico y v2 denegado.
4. Desplegar gateway compatible con flag OFF; verificar Entra, external canary y v1 interno sin regresión.
5. Activar v2 sólo en cohorte interna controlada; consentimiento nuevo, token y listado A/B.
6. Probar dispatch A/B, C/missing/ambiguous deny, revocaciones y concurrencia.
7. Reautorizar Codex, Claude Code y Claude hospedado; probar refresh post-TTL y cambio de autoridad sin reconectar.
8. Ejecutar flags OFF/restore y revocación de familias de prueba; releer runtime, PG y señales.
9. Activar producción interna acordada; registrar revisión, SHA, flags y evidencia cliente sin secretos.

### Out-of-band coordination required

- Confirmación del operador antes de reautorizar o enviar llamadas desde cada cliente, porque son acciones
  representacionales externas aunque sean read-only.
- No se requiere mutación de Entra. Cualquier cambio descubierto en Entra queda fuera de alcance y exige
  autorización propia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Delta ADR aceptado separa contexto actor y organización objetivo; JWT/scopes permanecen sin wildcard ni lista de tenants. Evidencia: D8–D11 y aprobación del operador 2026-09-08; implementación por verificar.
- [ ] Consentimiento/contexto v2 son explícitos y un consentimiento v1 no puede emitir ni refrescar autoridad multiorganización.
- [ ] Reader machine-only devuelve sólo organizaciones vigentes que el actor puede operar y capability efectiva por target.
- [ ] Gateway consume N memberships internas sin convertir la versión del ancla en permiso de otra organización.
- [ ] Existe discovery read-only minimizado para que el agente elija IDs autorizados sin depender de prompts manuales.
- [ ] Tool org-scoped exige target exacto; missing/ambiguous/C ajena deniegan antes del provider y A sigue funcionando después.
- [ ] El mismo token/familia opera A y B autorizadas; retirar B no afecta A y revocar al actor deniega ambas.
- [ ] Prueba concurrente A/B demuestra aislamiento de argumentos, resoluciones, resultados, correlation IDs y handles.
- [ ] Provider conserva recheck de módulo/entitlement/regla de negocio y el gateway no contiene SQL ni reglas de producto.
- [ ] Entra legacy, población externa y canary sintético conservan scopes, grants, discovery y canaries sin widening.
- [ ] Codex y Claude completan consentimiento fresco, tools/list, A/B allow, C deny, refresh y revocación post-rollout.
- [ ] Un cambio posterior de organización/capability se refleja sin reconectar; un cambio material de scope/autoridad exige nuevo consentimiento.
- [ ] Flags OFF/restore y rollback de revisión se prueban contra runtime real con readback de PG, servicios y señales.
- [ ] Task lint, ops lint, QA auth/integration/runtime/release y cierre documental terminan sin hallazgos propios.

## Verification

- `pnpm task:lint --task TASK-1844`
- `pnpm vitest run src/lib/auth-server src/lib/identity/internal-access src/lib/api-platform/resources/ecosystem-identity-binding.internal.test.ts`
- `pnpm test:live` (serializado; nunca exportar `.env.local` completo)
- `pnpm mcp:manifest:check`
- `pnpm check` en `../efeonce-mcp`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex --task TASK-1844 --auth --integration --runtime --release --docs --production`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate después de la última edición documental
- Canaries internos Codex/Claude A/B/C, refresh, revocación y rollback con evidencia redactada

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress` o `complete/`).
- [ ] `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `EPIC-044` quedaron sincronizados.
- [ ] `Handoff.md` quedó actualizado con rollout, riesgos, flags y siguiente paso.
- [ ] `changelog.md` quedó actualizado cuando cambió comportamiento o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre TASK-1813, TASK-1831, TASK-1832, TASK-1836 y TASK-1841.
- [ ] El criterio sólo se declara completo con runtime y clientes; flags OFF o código local se reportan como `code complete, rollout pendiente`.

## Follow-ups

- La autoridad multiorganización para personas externas queda fuera de alcance y requiere una decisión separada si aparece un caso real.
- Cualquier write MCP interno nuevo conserva scope/step-up propio y no se autoriza por esta lectura base.

## Open Questions

- El Delta ADR debe decidir si discovery se entrega como tool gateway-native, resource MCP o extensión minimizada de una lectura existente; debe ser seleccionable por agentes, paginada y no filtrar tenants ajenos.
- Confirmar la cota de revocación objetivo para autoridad de una sola organización sin introducir caché positiva.
