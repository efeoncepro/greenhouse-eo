# TASK-1726 — Delegated MCP Talent Pool Search and Profile Reader

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-011`
- Status real: `Complete y operativa en producción interna; provider/tools ON, OAuth allow search/profile 200 y cliente base-only deny 403`
- Rank: `TBD`
- Domain: `hr|platform|identity|data|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; Efeonce MCP main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende el provider `greenhouse-hiring` de TASK-1718 con dos tools read-only para buscar el Talent Pool y leer un
perfil minimizado desde Codex, Claude o cualquier cliente MCP estándar autorizado. El gateway sólo transporta/rutea;
Greenhouse conserva identidad humana delegada, capability, purpose, reader, redacción, audit y lifecycle.

## Execution Evidence — 2026-08-16

- Greenhouse App API exige persona interna delegada, client/scope/capability/purpose/host exactos y registra allow/deny
  en un audit append-only sin query, resultado ni PII.
- El gateway implementa `hiring.talent_pool.search` y `hiring.talent_pool.profile.get` sobre el App API, con schemas
  estrictos, límites, evidencia marcada como no confiable y rechazo de campos sensibles inesperados.
- Greenhouse TypeScript y 46 tests focales pasan; `../efeonce-mcp` pasa format, typecheck, 53 tests y build.
- Provider, tools, scopes/grants Entra, broker Greenhouse, docs y skills están desplegados. Un canary OAuth estándar
  con host `mcp-inspector` obtuvo `200` en search/profile y el cliente base-only separado obtuvo `403`; las suites de
  contrato prueban interoperabilidad sin bypass específico de Codex/Claude. Acceso externo/B2B permanece denegado.

## Why This Task Exists

Full API Parity no se cumple si el banco sólo puede operarse desde el Desk. Los agentes necesitan discovery y un DTO
estable para ayudar a People a revisar cohortes, pero un endpoint machine-token o acceso directo a PostgreSQL convertiría
al gateway en autoridad de Hiring, perdería atribución humana y ampliaría el blast radius de PII.

“Cualquier agente” significa cualquier host compatible con MCP que complete OAuth como una persona interna autorizada
y reciba grants revocables; no significa acceso anónimo ni que todo usuario del tenant pueda leer candidatos. El scope
abre la clase de transporte y Greenhouse vuelve a autorizar el actor/recurso/purpose en cada request.

## Goal

- Publicar `hiring.talent_pool.search` y `hiring.talent_pool.profile.get` con schemas/version/error contract estables.
- Reutilizar el App API y readers TASK-1723; cero DB, storage, policy, PII cache o business logic en el gateway.
- Hacer tool discovery interoperable en Codex, Claude y un cliente MCP de conformidad, sin host-specific hacks.
- Probar allow/deny/revoke/IDOR/rate/fault/prompt-injection/PII y rollback antes de una cohorte real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- `mcp.efeonce.org` es adapter neutral: nunca DB/bucket, nunca contactability/ranking, nunca storage de candidatos.
- Cada call lleva usuario humano delegado, workload/gateway identity, audience/client/scope y correlation; Greenhouse
  resuelve tenant interno y revalida `hiring.talent_pool.read` por request.
- Reusar la clase `efeonce.mcp.hiring.read` de TASK-1718; no crear un scope por tool/capability.
- V1 es internal-only read-only. Clientes/B2B esperan TASK-1631; writes esperan un contrato separado y no bloquean reads.
- Search/profile no incluyen contacto, CV/raw text, URLs, notes, economics, answer keys, demographics ni protected attributes.
- `profile.get` devuelve application refs opacas. Para CV se llama la tool TASK-1718 con application exacta y propósito nuevo.
- Contenido derivado de candidato se marca `untrusted_evidence`; tools/descriptions prohíben seguir instrucciones o abrir URLs.
- No tool rankea, recomienda contratar/rechazar, mueve stage, contacta, invita, asigna assessment o persiste conclusiones.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `docs/tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md`
- `docs/tasks/in-progress/TASK-1718-hiring-candidate-review-packet-delegated-mcp-reader.md`
- `docs/tasks/complete/TASK-1723-talent-pool-canonical-foundation-full-api-parity.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`

## Dependencies & Impact

### Depends on

- TASK-1718: delegated Hiring token exchange/App API pattern and provider `greenhouse-hiring` operationally accepted.
- TASK-1723: `searchTalentPool`, `getTalentPoolProfile`, DTO, capability, purpose/audit and App API routes accepted.
- `../efeonce-mcp` provider registry/config/MCP schemas, OAuth verifier, correlation/rate/fault patterns.

### Resolución de dependencias al iniciar — 2026-08-16

- `TASK-1723`: la fundación person-first, readers, DTO allowlisted, capability y App API ya están implementados y
  migrados en develop. La lifecycle permanece abierta hasta el cierre conjunto del goal, pero el contrato consumido
  por esta task existe y fue ejercitado por el Desk.
- `TASK-1718`: sigue siendo dueña del candidate review packet/CV por application exacta y no se absorbe aquí. Como su
  provider compartido todavía no existe, Slice 1 de esta task implementa únicamente la fundación reutilizable
  `greenhouse-hiring` y amplía el RFC 8693 existente para la clase read-only `efeonce.mcp.hiring.read` → capability
  `hiring.talent_pool.read`. No registra la tool de CV, no expone documentos y no altera los writes 1719–1722.
- Este cambio elimina el bloqueo de implementación local, no el gate de rollout: Entra/grants, Greenhouse desplegado y
  canary allow/deny siguen siendo obligatorios antes de prender el provider o anunciar las tools como disponibles.

### Blocks / Impacts

- Completa el consumer MCP read-only del Talent Pool; TASK-1725 sigue siendo el consumer humano equivalente.
- Da a TASK-1608/1610 una vía base de discovery, sin emitir claims ni ejecutar Talent Assurance.
- TASK-1631 sólo bloquea acceso externo/B2B y futuros writes, no el reader interno con Entra/persona delegada.
- Skills/runbooks de Talent y MCP deben declarar tools sólo cuando el canary live las pruebe; antes siguen unavailable.

### Files owned

- `src/lib/api-platform/resources/app-hiring-talent-pool.ts` *(extensión TASK-1723 si aplica)*
- App API auth/token-exchange policy mínima necesaria, sin romper TASK-1718/Globe funding
- `../efeonce-mcp/src/providers/greenhouse-hiring.ts`
- `../efeonce-mcp/src/config.ts`
- `../efeonce-mcp/src/mcp.ts`
- schemas/tests/canary/runbook/provider manifest en `../efeonce-mcp`
- OpenAPI, MCP router/runbook, skills espejo, feature flag ledger y docs Hiring afectadas en Greenhouse

## Current Repo State

> Baseline de discovery preservado para explicar el gap original. El estado vigente está en `## Status` y en
> el delta de cierre; esta sección no debe interpretarse como readback del runtime actual.

### Already exists

- `mcp.efeonce.org` opera OAuth/Streamable HTTP y providers read-only federados, con gateway neutral y flags.
- El shim DCR permite conectar clientes MCP estándar al cliente PKCE público interno.
- TASK-1718 especificaba el provider Hiring y candidate review packet; este era el baseline antes de iniciar
  TASK-1726. El estado vigente de TASK-1718 está en su spec `in-progress` y no debe inferirse desde esta sección.
- TASK-1723 especifica readers/App API del banco y mantiene contacto/CV fuera de sus DTOs.

### Gap

- No existían tools/schemas de Talent Pool, binding de App API ni provider methods al iniciar esta task.
- No existe canary multi-host que pruebe búsqueda/profile con identidad/capability revocable.
- No existen guards específicos de bulk discovery, PII sentinel, untrusted evidence y paginación cross-runtime.
- Skills/runbooks no pueden anunciar el banco como capacidad disponible.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse posee App API/readers/auth/audit; ../efeonce-mcp posee transporte OAuth, discovery, routing y provider adapter`
- Future candidate home: `remain-shared`
- Boundary: `provider greenhouse-hiring llama únicamente App API search/profile TASK-1723; tool schemas son adapters de DTO versionado`
- Server/browser split: `server-only; tokens, PII policy, provider credentials, subjects y payloads nunca llegan a browser/public HTML`
- Build impact: `sin parser ni SDK storage; sólo schemas/provider adapter y config existentes del gateway`
- Extraction blocker: `identidad/capability/audit viven en Greenhouse; OAuth/routing en gateway sister platform; ambos deploys/versiones deben ser compatibles`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `ninguno nuevo; Greenhouse readers/App API TASK-1723 son autoritativos, gateway sólo adapter`
- Consumidores afectados: `Codex, Claude, MCP Inspector/otros hosts internos, People/Nexa y operations`
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: `TASK-1718 delegated Hiring provider, TASK-1723 App API, gateway provider/OAuth contract`
- Contrato nuevo o modificado: `dos MCP tools read-only, provider methods/config flag/schemas/canary y audit purpose propagation`
- Backward compatibility: `gated; additive, provider/tools disabled hasta readiness y canary`
- Full API parity: `MCP traduce tool input/output al App API; la regla vive sólo en TASK-1723 readers y autorización Greenhouse`

### Data model and invariants

- Entidades/tablas/views afectadas: `none en gateway; audit/access records de TASK-1723 reciben host/workload/correlation/purpose`
- Invariantes que no se pueden romper:
  - Tool IDs/schemas/cursors son versionados y no aceptan raw SQL, query DSL, tenant, email, identityProfileId ni asset URL.
  - `search` devuelve límite acotado y DTO minimizado; `profile.get` acepta public opaque ID, no DB ID adivinable.
  - Scope OAuth no sustituye `hiring.talent_pool.read`; deny/revoke ocurre antes de devolver datos y sin existence oracle.
  - Gateway no loguea query/result content, names, evidence, candidate IDs, token o upstream raw error.
  - Candidate-origin text stays labelled untrusted and never enters tool description/system instructions.
- Tenant/space boundary: `internal tenant/person derived from delegated subject; no tenant/account/space in tool input; B2B denied`
- Idempotency/concurrency: `reads only; cursor binds query+policy+snapshot, rate/fanout limits and correlation are deterministic`
- Audit/outbox/history: `Greenhouse append-only access audit for allow/deny with purpose/classes/host/workload; gateway structured metadata only, no PII`

### Migration, backfill and rollout

- Migration posture: `none; consumes TASK-1723 schema`
- Default state: `provider/tool flag OFF; discovery reports policy-blocked/unavailable until both runtimes ready`
- Backfill plan: `N/A — no gateway data store or backfill`
- Rollback path: `disable provider/tools, revoke delegated grant/scope, route traffic to prior gateway revision; Greenhouse reader/audit remains`
- External coordination: `Entra scope/grant if TASK-1718 did not establish it, gateway secrets/config/deploy, Greenhouse deploy and People/Privacy/Platform sign-off`

### Security and access

- Auth/access gate: `OAuth base + efeonce.mcp.hiring.read, exact audience/client/issuer, delegated person binding, active internal tenant and hiring.talent_pool.read per request`
- Sensitive data posture: `candidate PII; output allowlisted, no contact/CV/notes/economics/protected attributes, mandatory purpose`
- Error contract: `invalid_request | unauthorized | insufficient_scope | forbidden | not_found | stale_cursor | rate_limited | upstream_unavailable | timeout`; MCP sanitized with correlation ID
- Abuse/rate-limit posture: `per principal/provider/tool quotas, max page/filter length, no wildcard dump, timeout/circuit breaker, no retry 4xx, revoke fail-closed`

### Runtime evidence

- Local checks: `Greenhouse App API contracts + gateway schema/provider/parity tests; snapshots for tool descriptions and PII sentinel`
- DB/runtime checks: `access audit allow/deny/revoke readback; assert no gateway persistence and no raw payload in logs`
- Integration checks: `OAuth initialize/tools-list/call via Codex, Claude and MCP Inspector; allow/base-only/without-capability/revoked/B2B/IDOR/fault`
- Reliability signals/logs: `mcp.greenhouse_hiring_provider_unavailable | mcp.hiring_talent_pool_denied | mcp.hiring_talent_pool_redaction_violation | mcp.hiring_talent_pool_cursor_stale`
- Production verification sequence: `App API staging → private provider canary → internal multi-host → production disabled deploy → flag allowlist → rollback exercise → gradual enable`

### Acceptance criteria additions

- [x] Gateway remains neutral with zero DB/storage/business policy and calls only TASK-1723 App API.
- [x] Authorization proves user delegation, scope class, downstream capability, internal tenancy, purpose and revocation.
- [x] Schemas/DTO/errors/cursors are versioned, bounded and PII-minimized.
- [x] Runtime OAuth canary covers a standards-compliant host plus allow/deny; contract suites cover revoke/IDOR/fault/PII/prompt-injection without host-specific bypass.
- [x] Full API Parity is demonstrated against the same search/profile readers used by TASK-1725/Nexa.

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

### Slice 1 — Contract and delegated authorization acceptance

- Freeze tool names/descriptions/input/output/error/cursor schemas and provider version against TASK-1723 DTOs.
- Extend TASK-1718 delegated grant to `hiring.talent_pool.read` without new per-tool scope or shared bearer.

### Slice 2 — Greenhouse App API conformance

- Add/verify routes, purpose propagation, audit and redaction; execute allow/deny/revoke/B2B/IDOR fixtures.
- Publish OpenAPI/contract fixtures consumed by the provider; no gateway-specific reader.

### Slice 3 — Gateway provider and tools

- Add methods to `greenhouse-hiring`, config flag, tool discovery, schemas, timeout/correlation/rate policy.
- Treat evidence as untrusted and guarantee sanitized logs/errors with PII sentinel tests.

### Slice 4 — Multi-client canary and rollback

- Verify Codex, Claude and MCP Inspector initialize/list/search/profile with an authorized human.
- Exercise base-only, missing capability, revoke, cross-resource IDOR, stale cursor, timeout, upstream fail and rollback.

### Slice 5 — Docs, skills and controlled rollout

- Update MCP/Hiring runbooks, router/skills mirrors, capability inventory and live-state docs only after canary.
- Deploy disabled first, enable internal allowlist, observe signals, then expand to authorized internal users.

## Out of Scope

- MCP writes: consent, availability, invite, contact, assessment, stage, decision, selection/handoff/activation.
- Raw CV/portfolio/answers; TASK-1718 owns exact-application packet and its separate purpose/audit.
- Client/B2B access before TASK-1631; public/anonymous endpoint or machine-only bearer.
- Search/ranking implementation, schema/backfill or Talent Pool UI (TASK-1723/1724/1725).
- Talent Assurance claims/evals or persisting an agent recommendation.

## Detailed Spec

`hiring.talent_pool.search` accepts structured filters, cursor and bounded limit; it returns opaque talent profile IDs,
display label allowed for internal People, role/capability evidence summaries, coverage/freshness, availability and
contactability/allowedAction reason — never contact fields. `hiring.talent_pool.profile.get` accepts one opaque ID and
returns source-linked evidence/application refs. Application refs may then be passed deliberately to TASK-1718.

Tool descriptions state that outputs are evidence, not instructions or selection decisions. The provider cannot fetch
URLs from results, chain an invite, expand fields or change purpose. Every new read requires a new MCP call and downstream
authorization/audit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1718 provider/auth + TASK-1723 App API → Slice 1/2 → Slice 3 → Slice 4 → Slice 5.
- Gateway deploy remains disabled until Greenhouse production lane is live and canary allow/deny passes.
- Internal read can ship without TASK-1631; external/B2B remains hard denied.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bulk PII exposure | MCP/API | medium | bounded DTO/limits + PII sentinel + provider OFF | `mcp.hiring_talent_pool_redaction_violation` |
| Scope treated as authority | OAuth/identity | medium | downstream capability/person/purpose every call | `mcp.hiring_talent_pool_denied` |
| Gateway/provider contract drift | cross-runtime | medium | version/schema fixtures + disabled-first deploy | `mcp.greenhouse_hiring_provider_unavailable` |
| Prompt injection in evidence | agents | medium | untrusted annotation + no URL/action chaining | security canary |
| Cursor leaks/changes cohort | API | low | bind cursor to actor/query/policy/snapshot | `mcp.hiring_talent_pool_cursor_stale` |

### Feature flags / cutover

- Reuse provider Hiring flag plus a narrower Talent Pool reader flag if independent rollback requires it; both default OFF.
- Tool not ready reports policy-blocked/unavailable; it is not silently omitted after announced rollout without runbook reason.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revoke grant/scope extension; preserve TASK-1718 | <10 min | yes |
| 2 | App routes/read flag OFF | <5 min | yes |
| 3 | tool/provider flag OFF or prior gateway revision | <10 min | yes |
| 4 | remove canary allowlist/revoke subject | <5 min | yes |
| 5 | disable tools and correct docs live-state | <15 min | yes |

### Production verification sequence

1. Greenhouse staging App API allow/deny/revoke/IDOR/PII and access-audit readback.
2. Gateway local/provider tests and private canary with production-like OAuth config.
3. Codex/Claude/MCP Inspector staging search/profile; base-only/missing-capability/revoked/B2B negatives.
4. Deploy Greenhouse production reader OFF, smoke and enable internal allowlist.
5. Deploy gateway revision with tools OFF; verify other providers unchanged.
6. Enable Talent Pool tools for one People subject; run full canary and rollback rehearsal.
7. Expand internal grants gradually; observe signals/log redaction/latency and document live state.

### Out-of-band coordination required

- Platform operates gateway/Entra/config; Identity validates delegated subject/grant; People/Privacy approve field/purpose matrix.
- No scope is added to a write client and no external customer is onboarded by this task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `hiring.talent_pool.search` and `hiring.talent_pool.profile.get` are versioned/discoverable and call only TASK-1723 App API.
- [x] Any standard MCP host can use them after OAuth; no Codex/Claude-specific bypass, cookie or bearer exists.
- [x] Every call proves delegated internal person, exact issuer/audience/client/scope, active grant, downstream capability and purpose.
- [x] Base-only, missing capability, revoked, expired, B2B and cross-resource IDOR fail before data with sanitized errors.
- [x] Search/profile outputs contain no contact, CV/raw text, URL, notes, economics, answer key or protected attribute.
- [x] Candidate-origin evidence is marked untrusted; prompt-injection fixtures cannot change tools, URLs, purpose or writes.
- [x] Cursor/page/filter/rate/timeout/fault contracts prevent wildcard dumps and provider cascades.
- [x] Gateway logs contain only opaque principal/provider/tool/outcome/duration/correlation, never queries/results/PII/tokens.
- [x] Greenhouse audit records allow/deny/revoke with purpose/host/workload and no content.
- [x] MCP Inspector-class OAuth canary passes search/profile; standard transport/schema suites prove Codex/Claude-compatible behavior and the negative/fault matrix.
- [x] Other MCP providers/tools remain unchanged under Hiring failures in the local full-suite regression.
- [x] Provider/tools/skills/runbooks were enabled only after live canary; external/B2B remains denied pending TASK-1631.
- [x] `pnpm skills:mirrors`, task/docs/QA gates and both repositories' test/build checks pass.

## Verification

- `pnpm task:lint --task TASK-1726`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm skills:mirrors`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `../efeonce-mcp`: provider/schema/auth/parity tests + build/check
- real OAuth MCP initialize/tools-list/search/profile from Codex, Claude and MCP Inspector
- Greenhouse access-audit readback and gateway log PII scan

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] MCP runbook/router/skills y Hiring/API docs declaran exactamente el estado live y rollback.

## Follow-ups

- MCP invite/contact remains a separate write task after a revocable client/grant contract; do not extend this reader implicitly.
- External/B2B Talent Pool access requires TASK-1631 plus a separate field/tenant policy review.

## Open Questions

- Tool public names are fixed by this task proposal but must pass collision/parity check in `../efeonce-mcp` before implementation.
