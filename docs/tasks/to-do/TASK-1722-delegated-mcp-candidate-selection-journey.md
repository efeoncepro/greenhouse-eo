# TASK-1722 — Delegated MCP Candidate Selection Journey

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Diseno; MCP write fail-closed hasta TASK-1721 y grant delegado TASK-1631`
- Rank: `TBD`
- Domain: `hr|platform|identity|ops`
- Blocked by: `TASK-1718, TASK-1721, TASK-1631`
- Branch: `Greenhouse develop; Efeonce MCP main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Federa en `mcp.efeonce.org` la capacidad de iniciar, consultar y continuar el recorrido gobernado de selección de
`TASK-1721`. Codex, Claude u otro host autorizado puede presentar una postulación exacta, obtener confirmación
humana y seguir un único journey; Greenhouse ejecuta la decisión y coordina checkpoints hasta el próximo gate.

La familia de tools usa `propose→confirm`, identidad humana delegada, authority one-shot y capability por step.
No existe una “magic tool” con superpermisos: para el usuario es un recorrido único, pero cada aprobación sensible
se vuelve a presentar y confirmar. El gateway permanece neutral, sin DB, PII, policy de Hiring ni transacciones.

## Why This Task Exists

`TASK-1721` crea el primitive durable y `TASK-1718` permite leer una aplicación/CV de forma agent-safe. Falta una
superficie MCP que conecte ambas sin automatizar la UI ni pasar un bearer de sistema. Reusar directamente endpoints
internos o conceder todas las capabilities al workload convertiría al agente en un confused deputy capaz de
aprobar handoff, crear un miembro o abrir onboarding sin consentimiento contextual.

La selección afecta empleo y datos personales; debe ser atribuible a una persona, contestable y reversible sólo
por las transiciones que el dominio permita. Esta task hace el recorrido amigable para agentes, conservando un
preview exacto, confirmaciones vinculadas a effects y estados honestos ante pasos pendientes o bloqueados.

## Goal

- Exponer una familia MCP mínima para `start.propose`, `start.confirm`, `status.get`, `advance.propose`,
  `advance.confirm`, `cancel.propose` y `cancel.confirm`.
- Permitir que el host presente “seleccionar y comenzar recorrido” como una sola intención conversacional.
- Preservar initiating human, agent workload, delegated grant, authority y actor Greenhouse en cada call.
- Revalidar scope, capability, application/run y effect digest por step; nunca heredar autorización indefinida.
- Retornar estados/checkpoints/next action/delivery tipados, sin PII, CV, assessment answers ni raw links.
- Probar Codex y Claude desde el front door público con allow/deny/revoked/replay/timeout/fault antes de habilitar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
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
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Gateway MCP posee transporte, OAuth, discovery, routing, timeout y redacción; Greenhouse posee proposal,
  selection policy, commands, journey, capabilities, audit, idempotencia y reconciliation.
- La tool nunca decide quién contratar ni recomienda ejecutar confirm. El agente puede resumir evidencia; el humano
  elige la aplicación exacta y confirma el effect mostrado.
- `start.propose` acepta `applicationId` y campos de intención allowlisted que el command canónico ya soporta. No
  acepta tenant, candidateId suelto, email, CV URL, score, template, memberId, handoffId ni downstream IDs.
- `start.confirm` acepta sólo authority/proposal ID + idempotency key. No repite application/destination/start date.
- `advance.propose` recibe sólo `journeyRunId`; Greenhouse deriva el próximo step, capability, owner y effects desde
  state real. El caller no escoge un command arbitrario.
- `advance.confirm` consume sólo authority one-shot. Una authority de selección no sirve para handoff/activation.
- Cancelación también usa propose→confirm; explica qué puede detenerse y qué historia no puede revertirse.
- `efeonce.mcp.hiring.write` es scope por clase de blast radius y se reutiliza de TASK-1720. No crear scope por tool.
- El write scope nunca se cablea al cliente PKCE público compartido. `insufficient_scope` no se resuelve ampliándolo.
- Greenhouse revalida capability y recurso por request; scope OAuth no sustituye autorización fina.
- El gateway no usa ecosystem fixed-token lane para este write y no ejecuta DB/storage/email directamente.
- Tokens OAuth, subject tokens, authority internals, raw errors, CV/PII y payloads no se loggean.
- Un resultado `accepted|in_progress` no se presenta como `completed`; el correo tiene delivery status independiente.
- No batch selection, no auto-reject de otros candidatos, no background continuation más allá del próximo gate.

## Normative Docs

- `docs/tasks/to-do/TASK-1718-hiring-candidate-review-packet-delegated-mcp-reader.md`
- `docs/tasks/to-do/TASK-1720-delegated-mcp-candidate-test-assignment.md`
- `docs/tasks/to-do/TASK-1721-governed-hiring-selection-journey-orchestrator.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `docs/tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`

## Dependencies & Impact

### Depends on

- `TASK-1718`: `greenhouse-hiring` provider, read packet y delegated subject pattern.
- `TASK-1721`: proposal/confirm/status/advance/cancel commands y DTOs; esta task no puede anticipar sus schemas.
- `TASK-1631`: grant humano revocable para write MCP. Sin evidencia, toda confirm permanece fail-closed.
- `TASK-1720`: scope `efeonce.mcp.hiring.write`, write policy y canary conventions reutilizables.
- `src/lib/sister-platforms/mcp-token-exchange.ts` y App API auth/token exchange vigentes.
- `../efeonce-mcp` gateway/provider registry/runtime.

### Blocks / Impacts

- Operación completa de Hiring desde hosts agentic internos autorizados.
- Paridad de Application 360/Nexa/MCP sobre un único selection journey.
- OAuth metadata/provider catalog/canary del gateway, sin cambiar el reader TASK-1718.
- No bloquea el recorrido manual existente ni el orquestador Greenhouse si MCP sigue cerrado.

### Files owned

- `src/lib/api-platform/resources/app-hiring-selection-journey.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/selection-journeys/start/propose/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/selection-journeys/start/confirm/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/selection-journeys/[runId]/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/selection-journeys/[runId]/advance/propose/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/selection-journeys/[runId]/advance/confirm/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/selection-journeys/[runId]/cancel/propose/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/selection-journeys/[runId]/cancel/confirm/route.ts` *(nuevo)*
- `../efeonce-mcp/src/providers/greenhouse-hiring.ts`
- `../efeonce-mcp/src/config.ts`
- `../efeonce-mcp/src/mcp.ts`
- `../efeonce-mcp/scripts/*hiring-selection*canary*.mjs` *(nuevo; nombre exacto en Plan Mode)*
- provider catalog, OAuth metadata, architecture/runbook y parity guard afectados

## Current Repo State

### Already exists

- `mcp.efeonce.org` ofrece Streamable HTTP, OAuth, provider isolation y DCR compatibility para clientes estándar.
- TASK-1718 especifica reader agent-safe y provider `greenhouse-hiring` read-only.
- TASK-1720 especifica el primer write Hiring, scope por blast-radius, App API delegada y fail-closed policy.
- Token exchange sister-platform preserva separación entre subject humano y downstream service identity.
- TASK-1721 define la única business primitive autorizada para este journey.
- No existe provider `greenhouse-hiring`, catálogo OAuth, scope Hiring write ni tool de selección registrados en
  `mcp.efeonce.org`. Las routes directas de decisión/handoff y el panel portal no deben exponerse mientras
  `TASK-1721` y el grant revocable `TASK-1631` sigan pendientes.

### Gap

- No existen tools ni App API operations para selection journey.
- No existe mapping MCP de proposal/effect/next action/checkpoints/errors tipados.
- No existe contract que obligue una authority nueva al cruzar handoff/activation gates.
- No existe canary agent-host que demuestre selección exacta, pause/resume, revocación y no-PII.
- El shared PKCE client no tiene ni debe recibir write scope; falta grant TASK-1631 para ejecución real.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse App API/Vercel y provider `greenhouse-hiring` en `../efeonce-mcp`/Cloud Run
- Future candidate home: `api`
- Boundary: MCP adapta siete operaciones cerradas a commands/readers TASK-1721; no business logic ni state propio
- Server/browser split: OAuth/token exchange/authority/capabilities/commands son server-only; host recibe preview/status
  redactado y presenta confirmación al humano
- Build impact: `none` — JSON/HTTP sobre clients existentes, sin SDK/DB/storage nuevo en gateway
- Extraction blocker: identidad/grant depende de TASK-1631 y orchestration de TASK-1721; gateway conserva deploy/OAuth

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: ninguno en gateway; Greenhouse TASK-1721 conserva proposals/runs/checkpoints/audit
- Consumidores afectados: Codex, Claude Code/Desktop, otros hosts MCP internos autorizados
- Runtime target: Greenhouse Vercel + `mcp.efeonce.org` Cloud Run, staging/production

### Contract surface

- Contrato existente a respetar: provider Hiring TASK-1718, scope/write identity TASK-1720, RFC 8693/App API,
  MCP protocol y commands/readers TASK-1721
- Contrato nuevo o modificado: siete App API operations y siete MCP tools/annotations/policy mappings
- Backward compatibility: `gated`; readers/test-assignment permanecen independientes; tools selection nacen disabled
- Full API parity: MCP usa exactamente TASK-1721; no llama decide/handoff/activation endpoints por separado

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna en gateway/App API; consume el model de TASK-1721
- Invariantes que no se pueden romper:
  - Human subject, workload, delegated grant, authority y actor Greenhouse se preservan por call/checkpoint.
  - Proposal no muta Hiring; confirm ejecuta exactamente un effect digest vigente.
  - Status nunca amplia access respecto de application/run original.
  - Advance es server-derived; el MCP input no elige capability, command ni downstream ID.
  - Una authority no cruza steps ni runs; replay retorna outcome estable sin repetir side effect.
  - Cancel no borra decisión/checkpoints y declara irreversibilidad.
  - Raw candidate token/link, CV, answers, PII/economics y logs sensibles nunca cruzan el gateway.
  - `insufficient_scope`, grant/capability revocados o subject inactivo fallan antes de llamar al command.
- Tenant/space boundary: deriva exclusivamente de identidad verificada + application/run; ningún tenant libre
- Idempotency/concurrency: authority one-shot y command idempotency; gateway no reintenta writes de outcome incierto;
  hace status/readback por correlation/run ID
- Audit/outbox/history: Greenhouse audita effect/actor/outcome; gateway registra tool/status/latency/policy reason y
  correlation opacos, nunca bodies/PII/token

### Migration, backfill and rollout

- Migration posture: `none` en gateway/App API; depende de TASK-1721 completa y migrada
- Default state: `GREENHOUSE_HIRING_SELECTION_MCP_ENABLED=false`; scope no asignado al cliente público
- Backfill plan: ninguno
- Rollback path: provider flag OFF + revocar grant/client binding + redeploy; runs existentes continúan en Greenhouse
- External coordination: Entra/auth authority TASK-1631, Cloud Run/Vercel config, Talent/Identity/MCP sign-off

### Security and access

- Auth/access gate: `efeonce.mcp.hiring.write` + exact revocable grant/client + RFC 8693 + active internal human +
  downstream capability requerida por el step
- Sensitive data posture: preview usa display name/opening/destination/evidence summary mínimo autorizado por TASK-1718;
  no email/teléfono/document/answers/salary/member legal fields
- Error contract: `insufficient_scope | delegated_grant_missing | forbidden | not_found |
  selection_proposal_expired | selection_effect_mismatch | approval_required | capability_revoked |
  journey_blocked | journey_superseded | cancellation_not_allowed | dependency_unavailable | uncertain_outcome`
- Abuse/rate-limit posture: per-user/workload/application/run quotas, no batch, authority TTL/replay protection,
  circuit breaker y stop ante repeated uncertain outcomes

### Runtime evidence

- Local checks: tool schemas/annotations, no-free-form IDs, token exchange, scope/capability negatives, redaction
- DB/runtime checks: gateway action aparece atribuida al subject/workload/grant correcto en TASK-1721 audit
- Integration checks: Codex y Claude initialize/discovery/call; allow/deny/revoked/base-only/public-client; pause/resume
- Reliability signals/logs: `mcp.hiring_selection_denied`, `mcp.hiring_selection_provider_unavailable`,
  `mcp.hiring_selection_uncertain`; sin PII
- Production verification sequence: provider OFF → discovery policy → deny → dedicated allowlisted grant → one journey
  → revoke → deny → rollback

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] TASK-1721 permanece único dueño de proposal/run/checkpoints/commands/policy.
- [ ] MCP tools y App API sólo adaptan schemas/auth/transport/redaction.
- [ ] Start, advance y cancel conservan propose→confirm; status es read-only.
- [ ] Cada step revalida capability/grant; no existe super-capability ni authority reutilizable.
- [ ] Reader TASK-1718, test write TASK-1720 y selection write tienen flags/policies y rollback independientes.
- [ ] El gateway no toca DB/storage/email ni encadena endpoints de dominio manualmente.

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

### Slice 0 — MCP write decision and threat model

- Extender ADR MCP/Hiring con tool family, trust boundaries, scope/grant/capability matrix y failure behavior.
- Verificar el grant exacto de TASK-1631; si no existe, mantener todas las confirms fail-closed.
- Fijar effect preview, confirmation binding, TTL, revocation, timeout, uncertain outcome y redaction.
- Threat model: confused deputy, approval laundering, subject-token passthrough, proposal substitution, replay,
  cross-application IDOR, batch selection, prompt injection y log leakage.

### Slice 1 — Greenhouse App API delegated resources

- Crear siete operations delgadas sobre TASK-1721 con request/response schemas cerrados.
- Start propose resuelve effect; start confirm recibe sólo authority+idempotency.
- Status devuelve state/checkpoints/blockers/next action/delivery minimizados.
- Advance/cancel propose derivan effect server-side; confirms reciben sólo authority+idempotency.
- Token exchange preserva human/workload/grant; coverage evita regresiones en Globe/SEO/Hiring test write.

### Slice 2 — MCP provider tools and fail-closed policy

- Extender `greenhouse-hiring` con:
  - `hiring.candidate_selection.journey.start.propose`
  - `hiring.candidate_selection.journey.start.confirm`
  - `hiring.candidate_selection.journey.status.get`
  - `hiring.candidate_selection.journey.advance.propose`
  - `hiring.candidate_selection.journey.advance.confirm`
  - `hiring.candidate_selection.journey.cancel.propose`
  - `hiring.candidate_selection.journey.cancel.confirm`
- Descriptions instruyen al agente a mostrar preview/irreversibilidad y pedir confirmación explícita.
- Annotations distinguen reads/writes/destructive cancel; provider flag y scope policy son fail-closed.
- Actualizar parity guard para toda la familia `hiring.*`, no regex fijado a readers.

### Slice 3 — Host conformance, fault handling and observability

- Contract tests en Codex/Claude: exact schema, human confirmation, no hidden retries y typed status.
- Negativos: base-only/shared public client, grant/capability revoked, wrong run/application, stale authority, replay,
  prompt-injected CV y PII sentinels.
- Faults: Greenhouse timeout antes/después de command, provider unavailable y unknown outcome con status readback.
- Métricas/signal/runbook sin body/token/PII.

### Slice 4 — Controlled live canary and rollback drill

- Deploy provider con flag OFF y verificar initialize/discovery/deny sin afectar TASK-1718/1720.
- Habilitar un client/grant/actor/opening allowlisted sólo si TASK-1631 cerró.
- Ejecutar start→status→pause en handoff→advance autorizado→status y comprobar audit/checkpoints.
- Revocar grant y comprobar deny inmediato; apagar flag y verificar reader/test assignment intactos.

## Out of Scope

- Business logic, schema o reconciler del journey; pertenece a TASK-1721.
- Lectura/extracción de CV; pertenece a TASK-1718.
- Asignación/cancelación de candidate test; pertenece a TASK-1720/TASK-1719.
- Selección automática, ranking, recomendación final, batch o rechazo de otras aplicaciones.
- Autorizar handoff/activation con la confirmación inicial o crear un “super-scope”.
- Wirear write scope al public PKCE client o habilitar clientes externos/B2B sin TASK-1631.
- UI visible en Greenhouse o en hosts MCP.

## Detailed Spec

Para el usuario, el host puede decir “seleccionar a esta persona e iniciar el recorrido”. Técnicamente ejecuta:

1. `start.propose`, muestra persona/vacante/destino/effects y solicita confirmación;
2. `start.confirm`, que registra la selección y devuelve el mismo `journeyRunId`;
3. `status.get`, que avanza/observa materializaciones seguras y muestra el próximo gate;
4. cuando se requiere autoridad nueva, `advance.propose` muestra exactamente ese step y `advance.confirm` lo ejecuta;
5. el ciclo continúa hasta `completed`, `blocked`, `cancelled` o `superseded`.

El agente no debe presentar `advance.confirm` como aceptación implícita del primer “sí”. Cada preview declara
capability, owner, efectos, reversibilidad y datos faltantes. El gateway no guarda conversación como autoridad.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1718 + TASK-1721 + TASK-1631 → Slice 0 → Slice 1 → Slice 2 → Slice 3 → Slice 4.
- TASK-1720 puede compartir scope/provider patterns, pero selection tools conservan flag independiente.
- No ejecutar canary write mientras el shared public client sea la única identidad disponible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Write scope público concede contratación amplia | OAuth/Identity | high | nunca wirear PKCE público; grant revocable exacto | `mcp.hiring_selection_denied` |
| Agente reutiliza confirmación entre steps | MCP/Hiring | medium | authority one-shot per effect/step | replay/authority mismatch |
| Gateway se vuelve orchestrator de negocio | Platform/HR | medium | App API única sobre TASK-1721 | parity/architecture gate |
| Timeout duplica selección/activation | Integration | medium | no blind retry; status readback | `mcp.hiring_selection_uncertain` |
| CV induce al agente a llamar confirm | Agent safety | medium | content-untrusted + explicit human confirmation | host conformance failure |
| PII/token aparece en logs | Security | low | structured redaction + sentinel tests | security log scan |

### Feature flags / cutover

- `GREENHOUSE_HIRING_SELECTION_MCP_ENABLED=false` en gateway por defecto.
- TASK-1721 conserva su flag propio en Greenhouse; ambos deben estar ON para ejecución.
- Reader TASK-1718 y test write TASK-1720 no dependen de este flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | revert/supersede decision antes de rollout | horas | sí/parcial |
| 1 | disable App API selection resource; journey manual sigue | <15 min | sí |
| 2 | gateway flag OFF + redeploy | <15 min | sí |
| 3 | disable canary/signal consumer; preservar logs redactados | <15 min | sí |
| 4 | revoke grant/scope binding + flag OFF; runs siguen en Greenhouse | <15 min | sí |

### Production verification sequence

1. Contract tests locales y deny por defecto.
2. Greenhouse App API staging allow/deny/revoked con TASK-1721 real.
3. Gateway staging flag OFF: initialize/discovery/reader regression.
4. Dedicated grant allowlisted: start proposal, confirm y status desde Codex y Claude.
5. Verify pausa en approval; advance deny sin capability y allow con nueva authority.
6. Replay/stale/wrong-run/timeout/PII negatives.
7. Revocar grant y verificar deny inmediato; flag OFF rollback y reader/test tools saludables.

### Out-of-band coordination required

- Identity/MCP: grant/client exacto y revocación de TASK-1631; cambios Entra/OAuth sólo por runbook.
- Talent/People: actor/opening/candidato sintético o autorizado para canary.
- Vercel/Cloud Run: flags y secret refs separados, sin secret values en repo/logs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Siete tools MCP consumen exclusivamente App API/commands/readers TASK-1721.
- [ ] Start/advance/cancel usan propose→confirm y status es read-only.
- [ ] Confirm inputs contienen sólo authority/proposal ID e idempotency key; no repiten mutable effects.
- [ ] Advance deriva el próximo step server-side y no acepta command/capability/downstream ID libres.
- [ ] Cada step preserva y audita human subject, workload, grant, authority y Greenhouse actor.
- [ ] Scope `efeonce.mcp.hiring.write` se reutiliza por blast radius y nunca se cablea al public PKCE client.
- [ ] Sin TASK-1631/grant exacto, confirm/advance/cancel fallan cerrados aunque las tools estén registradas.
- [ ] No existe DB/storage/email/business logic en gateway ni encadenamiento directo de endpoints de dominio.
- [ ] Status representa `accepted|in_progress|blocked|completed|cancelled|superseded` y delivery por separado.
- [ ] DTOs/logs pasan sentinels de CV/PII/answers/economics/token/URL privada/raw error.
- [ ] Allow/deny/revoked/base-only/public-client/stale/replay/IDOR/prompt-injection/fault tests pasan.
- [ ] Canary Codex y Claude prueba start→pause→advance/status con audit y checkpoints Greenhouse reales.
- [ ] Revocación y flag OFF detienen writes sin afectar reader TASK-1718 ni test tools TASK-1720.
- [ ] OAuth metadata, provider catalog, parity guard, architecture y runbook reflejan estado live.

## Verification

- `pnpm task:lint --task TASK-1722`
- Greenhouse App API contract/authorization tests
- `../efeonce-mcp`: typecheck, tests, provider parity y MCP inspector
- OAuth metadata/scope/client round-trip sin modificar el PKCE público
- Codex + Claude allow/deny/revoked/replay/timeout canary
- Greenhouse DB/audit/checkpoint readback por `journeyRunId`
- public front-door unauthenticated `401` y provider fault isolation
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1718/1720/1721/1631, EPIC-011, MCP ADR/router/runbook y provider catalog reflejan el boundary final
- [ ] Runtime se declara `operativamente bloqueado` si no existe grant write real, aunque compile y registre tools

## Follow-ups

- Host UX/prompt guidance compartida para presentar approvals sin dark patterns, si conformance revela divergencia.
- Staff Augmentation advance sólo cuando TASK-1721 integre un command de placement canónico.
- B2B/external rollout después de TASK-1631 y entitlements tenant-safe; no es consecuencia automática.

## Delta 2026-08-15

- Task creada como consumer MCP de TASK-1721 y sibling de TASK-1720. Se usa una familia de tools pequeña y
  composable en vez de una única llamada con superpermisos; el host puede presentarla como un journey único.

## Open Questions

- ¿Qué cliente/grant de TASK-1631 habilitará el primer canary interno sin ampliar el PKCE público?
- ¿El host debe solicitar siempre una confirmación nueva para `complete_activation`, incluso cuando readiness ya
  está verde, o basta la authority emitida al aprobar ese checkpoint? Resolver en ADR con People/Identity.
