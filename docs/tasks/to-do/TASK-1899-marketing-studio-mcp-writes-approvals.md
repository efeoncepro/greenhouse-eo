# TASK-1899 — Marketing Studio: escrituras y aprobaciones por MCP

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
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno. Regla del operador (2026-09-25): «todo lo que se pueda hacer por la UI debe poderse hacer por API, y por consiguiente por MCP», incluidas las aprobaciones, que decide siempre una persona.`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-1891 (provider marketing-studio de lectura en el gateway), TASK-1894 (commands de escritura, tools de clase write en el manifiesto y capability marketing_studio.campaign.write). Depende además de que el emisor nativo auth.efeonce.org porte la identidad de la persona hasta Studio (Slices 2–3 de esta task). NO depende de TASK-1898: la identidad MCP llega desde Efeonce ID vía el gateway, no desde la sesión web de Studio.`
- Branch: `Greenhouse develop (emisor nativo, scopes, capability, readers, docs) · efeonce-mcp main vía PR (auto-deploy de Cloud Run) · efeonce-marketing-studio main (actor delegado y guardas); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Federa en el provider `marketing-studio` de `efeonce-mcp` todas las tools de clase `write` del manifiesto de Studio
(crear y editar campaña, brief, conceptos, piezas y versiones con su intención de subida, copys, anuncios, líneas del
plan de medios, posts del calendario, transiciones de estado y aprobaciones), con dos scopes de clase nuevos
(`efeonce.mcp.marketing_studio.write` y `efeonce.mcp.marketing_studio.approve`). La persona viaja hasta Studio como
un token delegado RFC 8693 que emite `auth.efeonce.org` con audiencia Studio; Studio verifica ese token, relee
capability y membership en Greenhouse y audita a la persona con `via=mcp:<cliente>`. Toda escritura admite `dryRun`,
y toda aprobación exige una confirmación que repite el digest de la propuesta. Un guard bidireccional impide que
exista una escritura de la UI sin API ni tool.

## Why This Task Exists

- TASK-1891 federa sólo lecturas y TASK-1894 publica las tools de escritura en el manifiesto sin federarlas: hoy un
  agente puede leer Studio pero no operarlo. Eso incumple Full API Parity y la regla del operador.
- El operador quiere que un agente, actuando por una persona autorizada, pueda también **aprobar** (presupuesto
  `approved`, Creatividad `→ approved`, Autorización de medios `→ authorized`, aprobación del brief). La aprobación la
  decide la persona; el agente la ejecuta en su nombre.
- En el lane ecosystem el actor es la máquina `mcp:<consumer>`: no hay chequeo de capability por persona y el scope
  OAuth es la única compuerta que depende de quién es la persona. Si el gateway llamara a Studio sólo con su
  `api_client`, Studio auditaría al gateway, no a la persona, y cualquiera con el scope escribiría con la autoridad de
  la máquina. La autoridad por persona tiene que viajar de forma **explícita y verificable**, no inferida.
- Studio no puede aceptar el access token MCP de la persona: su audiencia es `https://mcp.efeonce.org/mcp` y el ADR de
  relying parties exige rechazar un token MCP en un RP por audiencia antes de la lógica de dominio. Hace falta un token
  nuevo, emitido para Studio, que conserve la identidad de la persona y declare quién actúa en su nombre.
- El emisor nativo hoy sólo admite `authorization_code` y `refresh_token`, y el contexto interno v2 delega sólo
  `growth.seo.observation.read` (D9). Incorporar las clases de Studio exige autorización nueva (D10), no un flag.

## Goal

- Todas las operaciones de escritura del OpenAPI de Studio tienen tool federada en el gateway o exclusión con razón;
  el guard falla nombrando la operación, la tool o la exclusión que sobra o falta.
- Una persona con capability y membership escribe y aprueba en Studio desde un agente MCP, y el `audit_event` de Studio
  la registra a ella (no al gateway ni al modelo) con `via=mcp:<clientId>`.
- Un `api_client` de máquina sin persona no puede aprobar (`approval_requires_person`, 403), y una persona sin
  capability recibe denegación antes de escribir.
- Toda escritura soporta `dryRun`; una aprobación sin confirmación que repita el digest de su propuesta no se ejecuta.
- Canary en producción sobre una campaña sandbox: allow, deny, fault, reintento idempotente y conflicto 412.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (§«El scope de escritura NO se cablea al cliente
  público compartido»; Deltas 2026-09-10 TASK-1852 y 2026-09-15 TASK-1845)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (§0 manifiesto, §5 federar es parte de listo,
  §9 versión y superficie, §11 status; «Autoridad nativa antes de dispatch»; «Escritura con autoridad humana delegada
  por exchange»)
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D8 actor ≠ objetivo, D9 v2 base-only, D10
  consentimiento fresco, D11 revocación ≤ 60 s y sin caché positiva)
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` (sesiones y audiencias aisladas;
  cross-audience rechazado antes del dominio)
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (endpoints, grants soportados, step-up de writes)
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` [verificar ruta]
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` §5 (mapa de commands) y §5.3 (agentes: `propose → confirm`,
  aprobar por MCP)

Reglas obligatorias:

- **Un scope por clase de radio de daño, nunca por capability.** Esta task agrega exactamente dos clases (ver Detailed
  Spec §Decisión 1). Federar la escritura N+1 de Studio no crea scope nuevo.
- **Ningún scope de escritura o aprobación se cablea al cliente PKCE público compartido**, ni se anuncia en el PRM, ni
  se agrega a `scopes_supported`, ni se publica como mínimo del emisor. Llega sólo por el `403 insufficient_scope` de la
  tool y por consentimiento explícito con step-up.
- **La autoridad por persona viaja explícita**: token RFC 8693 firmado por el emisor, audiencia Studio, `sub` de la
  persona y `act` del actor. Nunca un header libre con el id de la persona, nunca el access token MCP reenviado, nunca
  una aserción firmada por el gateway.
- **Los argumentos nunca eligen autoridad.** El scope y la política se deciden por el nombre de la tool; por eso toda
  aprobación es una tool propia (no un valor de un enum dentro de una tool genérica).
- `organizationId` explícito en cada llamada; el objetivo se resuelve por el reader canónico de v2 sin caché positiva, y
  Studio vuelve a comprobarlo.
- El gateway sólo transporta: sin lógica de campañas, sin SQL, sin decidir transiciones. Studio decide datos y reglas;
  Greenhouse decide capability y membership; el emisor decide identidad y delegación.
- Default OFF y fail-closed en los tres runtimes; un Studio o un emisor degradado no rompe el discovery de otros
  providers.
- Bump minor del gateway + `pnpm surface:baseline` después de decidir el bump; `efeonce.gateway.status` reporta el
  estado del carril de escritura en el mismo PR, probado por la puerta HTTP.

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `references/native-authority.md` + `references/capability-intake.md` +
  `references/verification-matrix.md` [verificar nombres de references]
- Skill `mcp-craft` (descripciones de tools de escritura, anotaciones `destructiveHint`/`idempotentHint`, diseño de
  errores, radar de protocolo antes de apoyarse en elicitation)
- Skill `arch-architect` (decisión de delegación y deltas de ADR)
- Skill `greenhouse-backend` (command semantics, errores canónicos) y `greenhouse-secret-hygiene` (secreto del cliente
  confidencial de exchange)
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`, `docs/operations/runbooks/auth-server.md`,
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `TASK-1891`: provider `marketing-studio`, sync del manifiesto con `manifestHash`, guard bidireccional de lecturas,
  bearer de servicio y secreto `marketing-studio-mcp-gateway-token`.
- `TASK-1894`: commands de escritura en `packages/domain/src/commands/**` con `Idempotency-Key`, `If-Match`, `dryRun`,
  auditoría append-only; tools de clase `write` con `requiresPerson` en el manifiesto; capability
  `marketing_studio.campaign.write`; error `approval_requires_person`; campaña sandbox (Delta de TASK-1894 para
  TASK-1895).
- Emisor nativo `auth.efeonce.org` (EPIC-044, TASK-1828/1829/1830/1836/1844) con contexto interno v2 y ledger de `jti`.
- Reader de acceso a producto de Greenhouse (TASK-1898 Slice 2). Es un primitive compartido: si esta task llega
  antes, lo construye con el mismo contrato y TASK-1898 lo consume; el resto de TASK-1898 (login web, sesión de
  Studio, cierre del modo `open`) **no** es requisito.

### Blocks / Impacts

- `MS-N7` del flujo maestro deja de ser sólo lectura cuando esta task cierra.
- `TASK-1894`: pide dos deltas (ver Detailed Spec §Deltas a otras tasks): tools de aprobación propias y exigencia del
  digest de confirmación en el kernel de commands para toda vía.
- `TASK-1895` (UI de edición): el diálogo de confirmación de aprobaciones consume `dryRun` y envía el digest.
- `TASK-1898`: reutiliza el reader de acceso a producto y el verificador JWKS del emisor.
- `TASK-1896` (observabilidad): debe cerrar antes del flag ON en producción.
- Futuras escrituras delegadas de otros productos: el grant RFC 8693 del emisor queda como primitive reutilizable con
  allowlist de audiencias.

### Files owned

- Repo `efeonce-mcp`: `src/providers/marketing-studio.ts` (carril de escritura), `src/providers/marketing-studio-tool-manifest.generated.ts`, `src/providers/marketing-studio-tool-parity.ts`, `src/auth/marketing-studio-delegation.ts` [nuevo], `src/auth/tool-policy.ts`, `src/config.ts`, `src/mcp.ts`, herramienta de status [verificar ruta], `.github/workflows/deploy.yml`, `scripts/marketing-studio-write-canary.mjs` [nuevo], `surface-baseline.json`, `package.json`, tests asociados.
- Greenhouse: `src/lib/auth-server/oauth/scopes.ts` + `scopes.test.ts`, `src/lib/auth-server/oauth/token.ts`, `src/lib/auth-server/oauth/token-exchange.ts` [nuevo], `src/lib/auth-server/oauth/metadata.ts`, `src/lib/auth-server/oauth/audit.ts`, `src/lib/auth-server/oauth/clients.ts`, `src/lib/auth-server/internal/consent-context.ts` [verificar], `src/lib/identity/internal-access/target-authority.ts`, reader de acceso a producto `src/lib/identity/product-access/**` [verificar ruta; compartido con TASK-1898], `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, `migrations/*marketing-studio-approve-capability*`, `migrations/*mcp-marketing-studio-exchange-client*`, `services/auth-server/deploy.sh`, `docs/mcp/skills/marketing-studio/SKILL.md`, `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`, `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`, `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`, `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`, `docs/architecture/marketing-studio/**`, `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, skill `efeonce-mcp-platform` (ambos espejos).
- Repo `efeonce-marketing-studio`: `apps/web/src/server/auth/delegated-actor.ts` [nuevo], `packages/domain/src/actor.ts`, `packages/domain/src/commands/_kernel.ts` [verificar nombre], `packages/domain/src/confirmation-digest.ts` [nuevo], `packages/contracts/src/tool-manifest.ts`, `packages/contracts/src/errors.ts`, `apps/web/test/ui-write-parity.test.ts` [nuevo], `scripts/` de campaña sandbox [verificar].

## Current Repo State

### Already exists

- Gateway `efeonce-mcp` multi-issuer con policy por tool (`allowedIssuers`, `nativeUnsupportedReason`,
  `requiredCapabilities`, `organizationPolicy`), ocho clases de scope y el patrón de escritura con autoridad humana
  delegada por exchange (TASK-1852, provider `greenhouse-client-services`).
- Intercambio RFC 8693 en Greenhouse (`src/lib/sister-platforms/mcp-token-exchange.ts`): verifica la identidad de
  workload del gateway (Google ID token) y el token Entra de la persona, y emite un token opaco `gh_mcp_*` con
  audiencia Greenhouse (TTL 300 s). Sólo sirve a Greenhouse: Studio no puede verificarlo sin introspección.
- Emisor nativo con JWT firmados por KMS, JWKS público, ledger de `jti`, `introspect` (RFC 7662) para clientes
  confidenciales, consentimiento por scope y step-up para scopes de escritura; `grant_types_supported` =
  `authorization_code`, `refresh_token`.
- `src/lib/auth-server/oauth/scopes.ts` con `EFEONCE_MCP_WRITE_SCOPES` (cinco clases) y test de paridad contra el
  gateway.
- Reader de objetivo v2 `src/lib/identity/internal-access/target-authority.ts` (hoy sólo `growth.seo.observation.read`).
- En Studio: `Actor` con `anonymous_open | api_client | user | operator_cli` (`packages/domain/src/actor.ts`); tras
  TASK-1894, commands con `dryRun`, idempotencia, revisión y auditoría.

### Gap

- Ninguna tool de escritura de Studio federada; ningún scope de clase para Studio.
- El emisor no tiene grant `urn:ietf:params:oauth:grant-type:token-exchange` ni audiencias fuera del MCP.
- El contexto v2 no delega capabilities de Studio; su consentimiento no describe clases de Studio.
- Studio no conoce un actor `user` delegado por MCP ni verifica tokens del emisor.
- No existe capability de aprobación separada de la de escritura [verificar tras TASK-1894].
- No hay digest de confirmación ni guard que impida escrituras sólo-UI.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-mcp (Cloud Run efeonce-mcp-gateway) + greenhouse-eo (services/auth-server y src/lib/auth-server, readers de identidad, capability) + repo efeonce-marketing-studio (apps/web server y packages/domain)`
- Future candidate home: `api`
- Boundary: `el emisor autentica y emite la delegación (grant RFC 8693 con allowlist de actores y audiencias); Greenhouse autoriza (target-authority v2 y reader de acceso a producto); el gateway transporta y aplica scope y policy por nombre de tool; Studio verifica la delegación, relee autoridad y ejecuta sólo por sus commands`
- Server/browser split: `sólo server-side; ningún token delegado, digest ni secreto llega al navegador`
- Build impact: `none sobre el bundle del portal; en Studio, una dependencia JOSE server-only (la misma que elija TASK-1898, una sola)`
- Extraction blocker: `none — cada pieza vive en su runtime; el emisor ya es un servicio propio`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `superficie pública del gateway MCP; catálogo de scopes y grants del emisor auth.efeonce.org; capabilities marketing_studio.* en Greenhouse; studio.audit_event (autor real de cada escritura)`
- Consumidores afectados: `Claude, Codex, ChatGPT y agentes internos conectados a mcp.efeonce.org; UI de Studio (TASK-1895) vía el digest de confirmación; futuros productos con delegación`
- Runtime target: `production (Cloud Run efeonce-mcp-gateway, Cloud Run efeonce-auth-server compartido staging/producción, Vercel de studio.efeonce.org, Vercel de Greenhouse)`

### Contract surface

- Contrato existente a respetar: `manifiesto de Studio (TASK-1890/1894) y su guard; OpenAPI v1 de Studio; errores { error, code, actionable }; policy por tool del gateway; contrato OAuth del emisor; D8–D11; ADR de relying parties`
- Contrato nuevo o modificado: `tools de clase write/approve de Studio en el gateway; scopes efeonce.mcp.marketing_studio.write y efeonce.mcp.marketing_studio.approve; grant token-exchange en POST /oauth/token (audiencia allowlisted https://studio.efeonce.org); token delegado typ delegated+jwt; header Efeonce-Delegated-Token hacia Studio; campo confirmation.proposalDigest en aprobaciones y destructivas; capability marketing_studio.campaign.approve`
- Backward compatibility: `compatible (minor en el gateway: agrega tools; el emisor agrega un grant detrás de flag y no cambia los existentes)`
- Full API parity: `UI, API, CLI y MCP invocan el mismo command de Studio; el guard ui-write-parity impide una mutación de la UI sin operación OpenAPI, y el guard del gateway impide una operación de escritura sin tool ni exclusión`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_auth (clients, audit y ledger de tokens del emisor) [verificar schema]; greenhouse_core.capabilities_registry (+marketing_studio.campaign.approve); studio.audit_event (actor user delegado); studio.idempotency_record (sin cambios de forma)`
- Invariantes que no se pueden romper:
  - Cada operación de escritura del OpenAPI de Studio tiene exactamente una tool federada o una exclusión con razón; cada tool federada existe en el manifiesto; el guard falla nombrando la diferencia.
  - Ninguna mutación de la UI de Studio usa una ruta u operación ausente del OpenAPI ni una server action que escriba; el test `ui-write-parity` falla nombrando el archivo.
  - Toda aprobación es una tool propia con `requiresPerson: true` y scope `...approve`; ninguna tool genérica de transición o de presupuesto acepta un destino de aprobación.
  - Studio acepta una escritura delegada sólo si el token delegado es válido (firma JWKS del emisor, `iss`, `aud`, `typ`, `exp` ≤ 300 s, `jti` no repetido) **y** el bearer de servicio pertenece al `api_client` del gateway **y** `act.sub` coincide con el actor registrado para ese `api_client`.
  - El token delegado nunca crea sesión en Studio ni sirve para otra audiencia; el token MCP de la persona nunca llega a Studio.
  - Studio relee capability (`marketing_studio.campaign.write` o `.approve`) y membership de la persona sobre la organización de la campaña en cada llamada, sin caché positiva; `organizationId` del input debe coincidir con `campaign.organization_id` o responde `404` anti-oráculo.
  - Un `api_client` sin token delegado nunca aprueba: `403 approval_requires_person` antes de abrir transacción.
  - `dryRun` no escribe ninguna fila (ni entidad, ni `idempotency_record`, ni `audit_event`) y devuelve el diff, la `revision` base y el `proposalDigest`.
  - Una aprobación o una escritura destructiva sin `confirmation.proposalDigest` responde `428 confirmation_required`; con un digest que no coincide con el recalculado sobre el estado vigente, `409 confirmation_mismatch`; en ambos casos sin escribir.
  - El `audit_event` de toda escritura delegada registra `actor = user:<subject>`, `via = mcp:<clientId>`, `authority.kind = delegated_oauth`, `accessTokenId` (el `jti` del token delegado) y `correlationId`; nunca el token, el digest como credencial ni claims crudos.
  - El gateway nunca genera la `Idempotency-Key`: la recibe del agente y la reenvía; ante timeout responde `upstream_timeout_unknown_outcome` y no reintenta por su cuenta.
- Write-target allowlist: `N/A — ni el gateway ni el emisor escriben en tablas de dominio; Studio mantiene su domain-boundary-gate (sólo packages/domain/src/commands e import escriben en studio.*)`
- Tenant/space boundary: `persona (token nativo v2) → organizationId explícito → target-authority v2 en el gateway antes del dispatch → token delegado con sub de la persona → Studio relee el reader de acceso a producto y compara con campaign.organization_id`
- Idempotency/concurrency: `Idempotency-Key obligatorio en ejecuciones (input idempotencyKey de la tool, reutilizado en reintentos y entre dryRun y ejecución); If-Match desde el input expectedRevision; 412 obliga a releer y volver a proponer; jti del token delegado de un solo uso en Studio (replay → 401); el exchange no se cachea entre llamadas`
- Audit/outbox/history: `studio.audit_event append-only con autor real; audit del emisor por cada exchange (token_exchange_granted | token_exchange_denied con razón cerrada); logs del gateway con correlationId y sujeto hasheado; sin outbox`

### Migration, backfill and rollout

- Migration posture: `additive — seed de capability marketing_studio.campaign.approve con grant a roles reales; alta del cliente confidencial efeonce-mcp-marketing-studio en el emisor por command gobernado o migración seed [verificar mecanismo vigente]; sin DROP`
- Default state: `MARKETING_STUDIO_MCP_WRITES_ENABLED=false en el gateway; AUTH_SERVER_TOKEN_EXCHANGE_ENABLED=false en el emisor; STUDIO_DELEGATED_ACTOR_ENABLED=false en Studio; ningún cliente porta las clases nuevas`
- Backfill plan: `sin backfill de datos; la delegación de las clases de Studio en v2 exige consentimiento fresco por cliente (D10), nunca se promueve un consentimiento previo`
- Rollback path: `flag del gateway a false + redeploy (las tools responden policy_blocked); flag del emisor a false (deja de emitir delegaciones; las vigentes vencen en ≤ 300 s); flag de Studio a false (rechaza delegados); revocar el consentimiento de la clase por cliente; revert de PR en cada repo`
- External coordination: `secreto del cliente confidencial de exchange en Secret Manager (scalar crudo) con secretAccessor sólo para la SA del gateway; deploy.sh del emisor y deploy.yml del gateway declaran todas sus variables (--set-env-vars destructivo); release de Greenhouse con scopes, capability y reader antes del deploy del gateway; una sesión humana para el consentimiento con step-up y el canary`

### Security and access

- Auth/access gate: `gateway: issuer nativo (contexto interno v2) + scope de clase exacto + requiredCapabilities + organizationPolicy membership con target-authority; emisor: subject token nativo vigente con la clase, actor allowlisted (identidad de workload de la SA del gateway + cliente confidencial), audiencia allowlisted; Studio: bearer del api_client del gateway + token delegado + capability y membership releídas`
- Sensitive data posture: `presupuestos propuestos y aprobados, copys, configuración de anuncios, URLs firmadas de subida (credencial efímera de un objeto); sin PII personal; tokens, secretos y URLs firmadas nunca en logs`
- Error contract: `Studio: approval_requires_person 403, confirmation_required 428, confirmation_mismatch 409, delegation_invalid 401, más los de TASK-1894; gateway: insufficient_scope (403 con challenge), policy_blocked (writes_disabled, native_delegation_unavailable), not_found anti-oráculo, conflict (412 con instrucción de releer), invalid_request, upstream_unavailable, upstream_timeout_unknown_outcome; emisor: invalid_grant, invalid_target, unauthorized_client, códigos cerrados sin detalle JOSE`
- Abuse/rate-limit posture: `rate limit del gateway por persona y tool (aprobaciones con cupo menor que ediciones); rate limit del grant de exchange por actor; jti de un solo uso; TTL corto; sin caché positiva de autoridad`

### Runtime evidence

- Local checks: `pnpm check en efeonce-mcp (guard bidireccional, policy, delegación, versión, surface); pnpm check en Studio (verificación de token delegado con JWKS de prueba, requiresPerson, digest, ui-write-parity); pnpm local:check + pnpm test src/lib/auth-server src/lib/identity src/lib/entitlements en Greenhouse`
- DB/runtime checks: `capability y grant presentes en capabilities_registry; cliente confidencial registrado y activo en el emisor; audit del emisor con token_exchange_granted por cada ejecución del canary; studio.audit_event con actor user delegado y via mcp`
- Integration checks: `canary de escritura contra producción sobre campaña sandbox: allow, deny (sin capability; máquina sin persona aprobando; organización ajena), fault (Studio caído; emisor sin exchange), reintento idempotente, 412, confirmación ausente y alterada`
- Reliability signals/logs: `efeonce.gateway.status reporta el carril de escritura de marketing-studio; logs del emisor token_exchange_*; logs de Studio con correlationId; señales de TASK-1896`
- Production verification sequence: `ver Rollout Plan`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La regla de negocio vive en los commands de Studio; el gateway y el emisor no deciden nada de campañas.
- [ ] Toda escritura y aprobación es un command con authorization fina por persona, idempotencia, auditoría y errores canónicos.
- [ ] Capability `marketing_studio.campaign.approve` (si no existe) + grant a ≥1 rol real + coverage test en el mismo PR.
- [ ] Camino programático completo: UI → `/api/v1` → tool MCP, verificado por los dos guards.
- [ ] Writes aptos para `propose → confirm → execute` (`dryRun` + digest + confirmación humana).
- [ ] Un primitive, muchos consumers: UI, CLI, API y MCP invocan el mismo command.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente ejecuta estos slices en orden, respetando el plan
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decisión y contratos

- Delta en `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`: clases `marketing_studio.write` y `marketing_studio.approve`,
  delegación por token RFC 8693 con audiencia de producto y el porqué frente a las alternativas descartadas.
- Delta en `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`: incorporación de las clases de Studio al contexto v2 con
  consentimiento fresco (D10), sin tocar lo ya consentido.
- Delta en `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`: grant `token-exchange`, claims del token delegado, allowlists,
  TTL, auditoría y errores.
- Delta en `MCP_TOOL_SURFACE_INVARIANTS.md`: «aprobación = tool propia», digest de confirmación, `requiresPerson`.
- Deltas pedidos a TASK-1894 y TASK-1895 registrados en esas tasks (tools de aprobación propias; digest en el kernel).

### Slice 2 — Greenhouse: scopes, capability y autoridad

- `scopes.ts`: agregar `efeonce.mcp.marketing_studio.write` y `efeonce.mcp.marketing_studio.approve` a
  `EFEONCE_MCP_WRITE_SCOPES` con su comentario de clase; `scopes.test.ts` en paridad con el gateway; ninguno se publica
  como mínimo.
- Capability `marketing_studio.campaign.approve` en `entitlements-catalog.ts` + seed en `capabilities_registry` + grant
  en `runtime.ts` a roles reales de `src/config/role-codes.ts` (ver Open Questions) + `capability-grant-coverage.test.ts`
  verde. Si TASK-1894 ya la creó, sólo se verifica.
- `target-authority.ts`: el contexto v2 resuelve `marketing_studio.campaign.write` y `.approve` sobre el objetivo exacto,
  con la misma precedencia de permisos y sin caché positiva.
- Consentimiento del contexto v2: descripción de las dos clases (copy es-CL validado con `greenhouse-ux-writing`),
  step-up obligatorio, versión de contexto nueva.
- Reader de acceso a producto (primitive compartido con TASK-1898): «¿este sujeto tiene capability X de
  `marketing_studio` sobre la organización Y?», lane ecosystem con credencial de consumer de Studio.

### Slice 3 — Emisor: grant RFC 8693 con audiencia de producto

- `token-exchange.ts` + rama en `token.ts`: `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`,
  `subject_token` = access token nativo de la persona (se verifica firma, `jti` en el ledger, revocación, contexto v2 y
  que porte la clase pedida), `actor_token` = ID token de workload de la SA del gateway, autenticación del cliente
  confidencial `efeonce-mcp-marketing-studio`, `audience` en allowlist (`https://studio.efeonce.org`).
- Mapeo cerrado clase → scope de producto: `efeonce.mcp.marketing_studio.write` → `studio:write`,
  `efeonce.mcp.marketing_studio.approve` → `studio:approve`. Nada más se puede pedir.
- Token emitido: JWT `typ=delegated+jwt`, `iss`, `aud` Studio, `sub` de la persona, `act.sub` del cliente de exchange,
  `azp` = cliente MCP original, `scope`, `jti`, `exp` ≤ 300 s, sin refresh token.
- Flag `AUTH_SERVER_TOKEN_EXCHANGE_ENABLED` (default `false`) + allowlists en `services/auth-server/deploy.sh`;
  `grant_types_supported` lo anuncia sólo con el flag ON. Auditoría `token_exchange_granted|denied`.
- Tests: replay, subject revocado, subject sin la clase, audiencia fuera de allowlist, actor no allowlisted, token MCP
  presentado como delegado, TTL, rate limit.

### Slice 4 — Studio: actor delegado, guardas de aprobación y digest

- `delegated-actor.ts`: con `STUDIO_DELEGATED_ACTOR_ENABLED=true`, una llamada con bearer del `api_client` del gateway
  y header `Efeonce-Delegated-Token` construye `Actor { kind: 'user', subject, via: 'mcp:<azp>', authority:
  'delegated_oauth', accessTokenId }`. Verificación JWKS del emisor, `typ`, `aud`, `act.sub` ligado al `api_client`,
  `jti` de un solo uso. Sin el header, el actor sigue siendo el `api_client`.
- Autorización por persona en cada llamada con el reader de acceso a producto (Slice 2) y comparación con
  `campaign.organization_id`.
- Kernel de commands: `requiresPerson` ⇒ `approval_requires_person` para actores sin persona; `confirmation-digest.ts`
  (SHA-256 sobre JSON canónico de operación, entidad, `revision` base, payload normalizado, diff y sujeto) devuelto por
  `dryRun` y exigido en aprobaciones y destructivas para **toda** vía, UI incluida.
- Manifiesto: tools de aprobación propias (ver Detailed Spec) con `requiresPerson: true` y clase `write`; las
  transiciones genéricas rechazan destinos de aprobación.
- `ui-write-parity.test.ts`: recorre `apps/web/src/**` y falla ante una mutación (`fetch` con método distinto de `GET`,
  server action que escriba) cuyo destino no sea una operación del OpenAPI con tool o exclusión.

### Slice 5 — Gateway: carril de escritura del provider

- Sync del manifiesto con las tools `write` y `requiresPerson`; guard bidireccional extendido: operaciones de escritura
  del OpenAPI ↔ manifiesto ↔ tools registradas ↔ exclusiones con razón.
- `marketing-studio-delegation.ts`: exchange por llamada contra el emisor (sin caché), con la identidad de workload de
  la SA y el secreto del cliente confidencial; reenvío a Studio con bearer de servicio + `Efeonce-Delegated-Token`,
  `Idempotency-Key`, `If-Match`, `correlationId`.
- Policy por tool: `allowedIssuers: ['native']` con contexto interno v2; Entra `unsupported`
  (`studio_native_delegation_only`); `requiredScopes` exacto por clase; `requiredCapabilities` según la tool;
  `organizationPolicy: 'membership'`; aprobaciones rechazan tokens sin persona antes del exchange.
- Inputs comunes de escritura: `organizationId`, `idempotencyKey`, `expectedRevision` (mutaciones), `dryRun`,
  `confirmation.proposalDigest` (aprobaciones y destructivas). Descripciones con el protocolo `propose → confirm`.
- `studio.asset.upload.request` devuelve la URL firmada de subida sólo en la respuesta de la tool, nunca en logs.
- Mapeo de errores de Studio y del emisor; flag `MARKETING_STUDIO_MCP_WRITES_ENABLED` en `config.ts` y `deploy.yml`
  (OFF ⇒ `policy_blocked: writes_disabled` sin exchange); `efeonce.gateway.status` reporta el carril.
- Bump minor + `pnpm surface:baseline`; PR con CI verde.

### Slice 6 — Deploy, consentimiento y canary

- Orden: release de Greenhouse (scopes, capability, reader, emisor con flag OFF) → deploy de Studio (flag OFF) →
  deploy del gateway (flag OFF) → flags ON en emisor, Studio y gateway, en ese orden.
- Consentimiento humano de la clase con step-up desde un cliente real (Claude Code o Codex).
- `scripts/marketing-studio-write-canary.mjs` contra producción sobre la campaña sandbox: los casos de Verification.
  Flag ON definitivo sólo con canary verde; si falla, los tres flags vuelven a OFF.

### Slice 7 — Documentación

- Runbook del gateway (carril de escritura del provider, receta del canary), runbook del emisor (grant de exchange),
  arquitectura de Studio (§Agentes), manual servido `docs/mcp/skills/marketing-studio/SKILL.md` (cómo proponer, cómo
  confirmar, qué hacer ante 412/428/409, que aprobar es de la persona), skill `efeonce-mcp-platform` (ambos espejos),
  `FEATURE_FLAG_STATE_LEDGER.md` (tres flags con su runtime), Handoff, changelog y EPIC-049.

## Out of Scope

- Los commands de escritura, su semántica y sus matrices de estado (TASK-1894).
- Login web de Studio, su sesión y el cierre del modo `open` (TASK-1898).
- Acceso de personas externas o de clientes: requiere grant en `external_capability_grants`, consentimiento, piloto y
  firma propia; las tools quedan `unsupported` para poblaciones externas.
- Ampliar el cliente PKCE público compartido o el contexto v2 fuera de las dos clases de Studio.
- Operaciones sólo de operador por CLI (`cutover:campaign`, `export:catalog`, `api-client:*`, `media:ingest`): son
  exclusiones con razón.
- Publicar posts o lanzar anuncios en proveedores: Studio no publica.
- UI de consentimiento nueva: se reutiliza la del emisor; sólo se agregan las descripciones de clase.

## Detailed Spec

### Decisión 1 — Dos clases de scope, no una

| Clase | Qué autoriza | Tools |
|---|---|---|
| `efeonce.mcp.marketing_studio.write` | crear y editar el material de trabajo de una campaña (borradores, propuestas, versiones, calendario) | todas las `write` sin `requiresPerson` |
| `efeonce.mcp.marketing_studio.approve` | registrar decisiones que comprometen a la organización: aprobar el brief, la creatividad, el presupuesto y autorizar medios | sólo las tools de aprobación |

Por qué dos: el radio de daño es distinto. Editar un borrador es reversible y no compromete dinero; aprobar un
presupuesto o autorizar medios compromete gasto, igual que la clase `globe.credits.funding.ensure`, que tiene scope
propio porque mueve dinero. Además la persona puede consentir por cliente: dejar que un agente edite sin dejarlo
aprobar. Una sola clase obligaría a elegir entre no delegar nada o delegar también la aprobación. Tres o más clases
(una por estado) ya sería un scope por capability, que la regla prohíbe.

### Decisión 2 — Identidad delegada: RFC 8693 en el emisor nativo

| Opción | Veredicto | Razón |
|---|---|---|
| Reenviar el token MCP de la persona a Studio | descartada | audiencia MCP; el ADR de relying parties exige rechazarlo antes del dominio |
| Aserción firmada por el gateway (JWKS del gateway) | descartada | convierte al gateway en emisor de identidad (el gateway no es authorization server); un compromiso del gateway fabricaría a cualquier persona; nueva llave y rotación |
| Exchange en el broker de Greenhouse (`gh_mcp_*`) | descartada | token opaco con audiencia Greenhouse; Studio necesitaría introspección nueva; el broker sólo acepta sujetos Entra |
| **Exchange RFC 8693 en `auth.efeonce.org` con audiencia Studio** | **elegida** | el emisor re-verifica de forma independiente el token de la persona (el gateway no puede delegar a alguien que no le presentó un token vigente); una sola ancla de confianza para Studio (el mismo JWKS que usará TASK-1898); audiencia aislada; revocación coherente con D11; reutilizable por otros productos |

Hacia Studio viajan dos credenciales con papeles distintos: `Authorization: Bearer <api_client del gateway>`
(canal de confianza registrado) y `Efeonce-Delegated-Token: <JWT delegado>` (quién actúa). Studio exige ambas y su
vínculo (`act.sub` registrado para ese `api_client`). No es un header libre: su contenido es un token firmado y
verificable.

### Decisión 3 — Toda aprobación es una tool propia

El gateway decide scope y policy por el nombre de la tool; los argumentos nunca eligen autoridad. Por eso
`studio.media_plan.budget_line.set` queda sólo para `kind=proposed` y las transiciones genéricas rechazan destinos de
aprobación. Tools de aprobación (nombres a confirmar con `mcp-craft` y el manifiesto de TASK-1894):

| Aprobación | Tool | Capability | Scope |
|---|---|---|---|
| Aprobar el brief | `studio.campaign.brief.approve` | `marketing_studio.campaign.approve` | `...approve` |
| Creatividad `final_available → approved` | `studio.campaign.creative.approve` | `marketing_studio.campaign.approve` | `...approve` |
| Autorización de medios `pending → authorized` | `studio.campaign.media_authorization.authorize` | `marketing_studio.campaign.approve` | `...approve` |
| Presupuesto `kind=approved` con referencia | `studio.media_plan.budget_line.approve` | `marketing_studio.campaign.approve` | `...approve` |

Las demás tools de clase `write` del manifiesto (campaña, brief, concepto, pieza, versión e intención de subida, copy,
anuncio, flight y línea propuesta, post del calendario, transiciones no aprobatorias) usan `...write` y
`marketing_studio.campaign.write`.

### Decisión 4 — Protocolo del agente y digest de confirmación

1. El agente llama la tool con `dryRun=true`; Studio devuelve `diff`, `baseRevision` y `proposalDigest` sin escribir.
2. El agente muestra el diff a la persona y pide aceptación explícita en la conversación.
3. Con la aceptación, repite la llamada sin `dryRun`, con la misma `idempotencyKey`, el mismo `expectedRevision` y
   `confirmation.proposalDigest`.
4. `412` ⇒ releer y volver al paso 1; nunca reintentar con la revisión nueva sin mostrar el diff otra vez.

El digest prueba que lo ejecutado es exactamente lo propuesto sobre esa revisión y para ese sujeto; **no prueba que la
persona lo haya visto**. Esa parte la sostienen el consentimiento por clase y por cliente, las descripciones de las
tools, la auditoría con `via` y, cuando el cliente la soporte, una confirmación por elicitation (verificar en el radar
de `mcp-craft`; no se depende de ella). Se exige en aprobaciones y destructivas; en ediciones reversibles basta
`If-Match`.

### Deltas a otras tasks

- TASK-1894: tools de aprobación propias con `requiresPerson: true`; transiciones genéricas sin destinos
  aprobatorios; digest exigido por el kernel para toda vía; capability `marketing_studio.campaign.approve` si se decide
  crearla allí.
- TASK-1895: el diálogo de aprobación llama `dryRun`, muestra el resumen y envía el digest.
- TASK-1898: consume el reader de acceso a producto y el verificador JWKS; el actor `user` de sesión y el delegado
  comparten el mismo `Actor`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1891 y TASK-1894 cerradas en producción → Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6 → Slice 7.
- El release de Greenhouse (Slices 2–3) sale **antes** que el gateway: sin scopes, capability y grant, las tools
  responderían `insufficient_scope` o `upstream_unavailable` contra producción.
- Los tres flags se prenden en orden emisor → Studio → gateway, y se apagan en orden inverso.
- TASK-1896 cerrada antes de prender el flag del gateway en producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El scope de escritura o aprobación llega a un cliente público compartido | identity | low | regla dura + test de paridad que falla si aparece en `scopes_supported` o en el mínimo del emisor | test rojo; PRM con más de un scope |
| Studio audita al gateway en vez de a la persona | Studio | medium | actor delegado obligatorio en tools `write`; test que exige `actor=user:*` y `via=mcp:*` | canary: `audit_event` sin persona |
| Un agente aprueba sin que la persona lo vea | MCP | medium | clase `approve` separada con consentimiento y step-up; digest; descripciones; auditoría | canary de confirmación ausente/alterada |
| Replay del token delegado | Studio | low | `jti` de un solo uso, TTL ≤ 300 s, audiencia única | log `delegation_invalid` |
| El emisor emite delegaciones para otra audiencia | auth-server | low | allowlist cerrada de audiencias y actores; tests negativos | audit `token_exchange_denied` |
| Deploy borra env o secretos (`--set-*` destructivo) | Cloud Run | medium | declarar todo en `deploy.sh`/`deploy.yml`; readback de la revisión activa | status tool / readyz |
| Cambio del emisor afecta staging y producción a la vez (servicio compartido) | auth-server | medium | grant detrás de flag OFF; tests de no-regresión de `authorization_code` y `refresh_token` | canary de login y refresh |
| Timeout deja una escritura en estado incierto | MCP | medium | `upstream_timeout_unknown_outcome` + reintento con la misma llave (idempotente) | canary de reintento |
| UI gana una mutación sin API ni tool | Studio | medium | `ui-write-parity` + guard del gateway en CI | CI rojo |
| Deriva manifiesto ↔ gateway o superficie sin bump | MCP | medium | guard bidireccional + `surface.ts` + `test/version.test.ts` | CI rojo |

### Feature flags / cutover

- Gateway `MARKETING_STUDIO_MCP_WRITES_ENABLED` (default `false`): OFF ⇒ tools registradas que responden
  `policy_blocked: writes_disabled` sin intentar exchange.
- Emisor `AUTH_SERVER_TOKEN_EXCHANGE_ENABLED` (default `false`) + allowlists de audiencias y actores en
  `services/auth-server/deploy.sh`: OFF ⇒ `unsupported_grant_type`.
- Studio `STUDIO_DELEGATED_ACTOR_ENABLED` (default `false`): OFF ⇒ `Efeonce-Delegated-Token` se rechaza con
  `delegation_invalid`.
- Los tres se registran en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime. Revertir = OFF en orden gateway → Studio →
  emisor + redeploy donde el runtime no toma env en caliente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert de docs | minutos | sí |
| Slice 2 | revert del PR; la capability queda sin grant y los scopes sin cliente | < 30 min con release | sí |
| Slice 3 | flag del emisor OFF + redeploy; delegaciones vigentes vencen en ≤ 300 s | < 10 min | sí |
| Slice 4 | flag de Studio OFF; revert del deploy de Vercel | < 5 min | sí |
| Slice 5 | flag del gateway OFF + redeploy, o volver a la revisión anterior al 100 % | < 10 min | sí |
| Slice 6 | los tres flags OFF; revocar el consentimiento de la clase del cliente del canary | < 15 min | sí; las escrituras del canary quedan en la campaña sandbox, auditadas y sin retorno automático |
| Slice 7 | revert de docs | minutos | sí |

### Production verification sequence

1. Release de Greenhouse con emisor en flag OFF; verificar que `authorization_code` y `refresh_token` siguen verdes y
   que el PRM anuncia sólo el scope base.
2. Deploy de Studio y del gateway con flags OFF; `efeonce.gateway.status` muestra el carril de escritura `disabled` y
   una tool de escritura responde `policy_blocked`.
3. Flag del emisor ON; un exchange de prueba con un sujeto sin la clase responde `invalid_grant`.
4. Flag de Studio ON; una llamada con token delegado de otra audiencia responde `delegation_invalid`.
5. Consentimiento humano de las dos clases con step-up; flag del gateway ON.
6. Canary completo sobre la campaña sandbox; readback de `studio.audit_event` (persona + `via`) y del audit del emisor.
7. Readback de las tres revisiones activas: env y secretos presentes.

### Out-of-band coordination required

- Una persona interna con la capability de aprobación para el consentimiento con step-up y el canary (PKCE
  interactivo; nunca desatendido).
- Una segunda identidad interna sin capability para el caso deny [verificar disponibilidad; si no existe, usar una
  identidad sintética sandbox anunciada antes a los peers].
- Aviso previo a los peers antes de tocar el emisor compartido staging/producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cada operación de escritura del OpenAPI de Studio tiene una tool federada o una exclusión con razón, y el guard del gateway falla nombrando la operación, tool o exclusión que sobra o falta.
- [ ] `ui-write-parity` falla en CI ante una mutación de la UI de Studio sin operación OpenAPI con tool o exclusión (verificado agregando una mutación de prueba).
- [ ] `efeonce.mcp.marketing_studio.write` y `efeonce.mcp.marketing_studio.approve` existen en la policy del gateway y en `src/lib/auth-server/oauth/scopes.ts` con test de paridad verde, y ninguno aparece en el PRM, en `scopes_supported` ni en el cliente PKCE compartido.
- [ ] Toda aprobación es una tool propia con `requiresPerson: true`, y la tool genérica de transición o de presupuesto rechaza un destino aprobatorio.
- [ ] `marketing_studio.campaign.approve` existe en catálogo y registry con grant a ≥1 rol real y `capability-grant-coverage.test.ts` verde.
- [ ] El emisor emite un token `typ=delegated+jwt` con `aud` Studio, `sub` de la persona, `act`, `jti` y `exp` ≤ 300 s, y rechaza subject revocado, subject sin la clase, audiencia o actor fuera de allowlist y token MCP presentado como delegado.
- [ ] Con capability y membership, una persona aprueba la creatividad de la campaña sandbox desde un cliente MCP real, y `studio.audit_event` registra `actor=user:<subject>`, `via=mcp:<clientId>` y `authority.kind=delegated_oauth`.
- [ ] Una persona sin capability recibe denegación sin escritura, y un `api_client` sin token delegado que intenta aprobar recibe `403 approval_requires_person`.
- [ ] Una organización que no es la de la campaña responde `not_found` sin escritura.
- [ ] `dryRun` devuelve `diff`, `baseRevision` y `proposalDigest` y no escribe filas (verificado contando `audit_event` e `idempotency_record` antes y después).
- [ ] Una aprobación sin `confirmation.proposalDigest` responde `428 confirmation_required`, y con un digest alterado responde `409 confirmation_mismatch`, ambas sin escribir.
- [ ] Repetir la misma ejecución con la misma `idempotencyKey` devuelve la misma respuesta y un solo `audit_event`.
- [ ] Una ejecución con `expectedRevision` vieja devuelve `412` mapeado a `conflict` con instrucción de releer, sin escribir.
- [ ] Con Studio inaccesible, las tools de Studio responden `upstream_unavailable` y los demás providers siguen sirviendo; con el emisor sin exchange, responden `policy_blocked` sin llamar a Studio.
- [ ] Con `MARKETING_STUDIO_MCP_WRITES_ENABLED=false`, toda tool de escritura responde `policy_blocked: writes_disabled` sin exchange.
- [ ] `efeonce.gateway.status` reporta el carril de escritura de `marketing-studio` en la revisión activa.
- [ ] La versión del gateway subió un minor y `surface-baseline.json` quedó actualizado.
- [ ] Los tres flags figuran en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime y su estado real.
- [ ] Deltas de ADR (gateway, autoridad nativa, contrato OAuth), invariantes MCP, runbooks, manual servido, skill (ambos espejos), Handoff, changelog y EPIC-049 actualizados.

## Verification

- `pnpm check` en `efeonce-mcp` (guard, policy, delegación, versión, surface)
- `pnpm check` en `efeonce-marketing-studio` (actor delegado, digest, `requiresPerson`, `ui-write-parity`)
- `pnpm local:check` y `pnpm test src/lib/auth-server src/lib/identity src/lib/entitlements` en Greenhouse
- `node scripts/marketing-studio-write-canary.mjs` contra producción: allow (aprobar creatividad en campaña sandbox),
  deny (sin capability; máquina sin persona aprobando; organización ajena), fault (Studio caído; emisor sin exchange),
  reintento idempotente, 412, confirmación ausente y alterada
- Sesión MCP humana: `tools/list` con las tools de escritura y una aprobación real en la campaña sandbox
- `pnpm docs:closure-check` y `pnpm flags:audit --strict --no-vercel`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] EPIC-049 actualizado y `MS-N7` del flujo maestro marcado con escritura
- [ ] Deltas registrados en TASK-1894, TASK-1895 y TASK-1898

## Follow-ups

- Escrituras de Studio para personas externas (grant en `external_capability_grants`, consentimiento, piloto).
- Reutilizar el grant RFC 8693 del emisor para otros productos first-party con escrituras delegadas.
- Confirmación por elicitation cuando los clientes certificados la soporten.

## Open Questions

- Roles con `marketing_studio.campaign.approve`: propuesta `efeonce_admin`, `efeonce_account` y `efeonce_operations`
  (sin `designer`, que escribe pero no aprueba). ¿La creatividad la puede aprobar `designer`? Si sí, ¿hace falta
  separar la aprobación creativa de la de presupuesto y medios, o basta con la capability y la matriz de TASK-1894?
- ¿La capability de aprobación la crea TASK-1894 (dueña de los commands) o esta task? Esta task la crea sólo si
  TASK-1894 cierra sin ella.
- ¿Se acepta también el sujeto Entra (carril legacy) en el exchange durante la transición? Propuesta: no; los writes de
  Studio sólo por Efeonce ID nativo.
- `studio.asset.upload.request` devuelve una URL firmada al contexto del agente: ¿se acepta así (TTL corto, un objeto,
  tipo y tamaño fijados) o se agrega una subida inline acotada para archivos pequeños?
- ¿El grant RFC 8693 del emisor merece su propia task (es un primitive reutilizable del emisor) en vez de un slice de
  esta? Decidir en Discovery según tamaño.
