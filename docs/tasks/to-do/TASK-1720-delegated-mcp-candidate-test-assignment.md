# TASK-1720 — Delegated MCP Candidate Test Assignment

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Status real: `Diseno; write MCP fail-closed hasta policy y grant delegado`
- Rank: `TBD`
- Domain: `hr|platform|identity`
- Blocked by: `TASK-1718, TASK-1719, TASK-1631`
- Branch: `Greenhouse develop; Efeonce MCP main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Federa en `mcp.efeonce.org` la asignación y cancelación gobernadas de un candidate test mediante tools
propose→confirm sobre los commands canónicos de `TASK-1719`. Codex, Claude u otro host MCP puede preparar una
acción, mostrar sus efectos y ejecutarla sólo con confirmación explícita, identidad humana delegada y capability
`hiring.assessment.author` revalidada en Greenhouse.

El gateway no elige template, no genera links, no accede a DB/storage, no guarda tokens y no contiene reglas de
Hiring. Las tools de escritura nacen registradas pero fail-closed hasta que exista un grant revocable compatible
con `TASK-1631`; nunca se habilitan agregando write scope al cliente PKCE público compartido.

## Why This Task Exists

`TASK-1718` crea la lectura agent-safe de candidatos, pero deliberadamente prohíbe write-back, stage moves,
assessment assignment y correo. Mezclar escritura en esa task ampliaría el blast radius de un reader de PII y
haría imposible promover/retirar ambos carriles por separado.

`TASK-1719` aporta policy, preview, confirm, assignment, cancelación, audit e idempotencia dentro de Hiring. Falta
el adapter MCP que preserve identidad humana de extremo a extremo y convierta una conversación en una acción
confirmada sin aceptar payloads mutables después del preview.

El cliente DCR/PKCE público que usan Claude Code/Claude Desktop no puede recibir write scopes por defecto: hoy
no existe allí un grant Greenhouse per-human/per-capability suficientemente revocable. Esta task no “arregla”
`insufficient_scope` ampliando consentimiento global; integra el carril y lo mantiene cerrado hasta que
`TASK-1631` entregue ese control o una ADR aceptada pruebe una alternativa equivalente.

## Goal

- Agregar tools MCP para proponer/confirmar asignación y proponer/confirmar cancelación, sin duplicar policy.
- Preservar initiating human, agent workload, delegated grant y downstream Greenhouse user como identidades
  distintas y auditables.
- Asegurar que confirm recibe sólo una autoridad/proposal one-shot ligada al effect digest mostrado al usuario.
- Retornar outcomes y delivery status tipados, nunca raw token, URL privada o un `ok: true` ambiguo.
- Probar allow/deny/revoked/expired/replay/fault desde clientes MCP reales antes de habilitar escritura.

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

- Gateway MCP = transporte/OAuth/discovery/routing/redacción. Greenhouse = source of truth, policy, proposal,
  authorization, command, idempotencia, audit y delivery.
- La tool `propose` acepta `applicationId` + purpose/reason acotado. No acepta `templateId`, email, token,
  openingId, tenant ni time limit; Greenhouse los resuelve desde la policy efectiva.
- La tool `confirm` acepta sólo `proposalId`/`authorityId` y una idempotency key. No repite los campos del effect;
  cualquier drift/expiry/revocation obliga a proponer de nuevo.
- Assignment y cancellation usan propose→confirm independiente. Cancelar sin preview es write no autorizado.
- La confirmación explícita ocurre en el host y queda ligada al usuario, proposal digest y timestamp. Texto como
  “sí” no es suficiente si no se vincula al proposal vigente mostrado.
- Scope OAuth clasifica el blast radius; Greenhouse revalida capability y recurso en cada ejecución. Scope no
  sustituye `hiring.assessment.author` ni tenant interno activo.
- `efeonce.mcp.hiring.write` nunca se agrega a `requiredResourceAccess` del cliente público compartido. La tool
  puede estar registrada y responder `insufficient_scope` hasta que exista grant revocable per-human.
- No usar ecosystem fixed-token lane para ejecutar este write. El path es App API/sister-platform token exchange
  preservando OID/subject humano y workload; no email fallback.
- Subject/access token sólo se usa para token exchange exacto; no se loggea, persiste, devuelve ni pasa como
  bearer directo al command.
- Nunca retornar assessment access token o link al agente. El email de TASK-1689 es el delivery canónico.
- El resultado no implica que el correo fue enviado. `deliveryStatus=pending|sent|failed|skipped` se obtiene de
  readback, no se inventa desde la creación del assessment.
- Las tools no mueven etapa, no interpretan CV/score, no deciden ni ejecutan batch.

## Normative Docs

- `docs/tasks/to-do/TASK-1718-hiring-candidate-review-packet-delegated-mcp-reader.md`
- `docs/tasks/to-do/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `docs/tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md`
- `docs/tasks/complete/TASK-1689-hiring-lifecycle-transactional-emails.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`

## Dependencies & Impact

### Depends on

- `TASK-1718`: provider `greenhouse-hiring`, read scope, identity-preserving App API pattern y candidate review
  contract. Esta task extiende el provider con flags/scopes separados; no reabre el reader.
- `TASK-1719`: commands canónicos `proposeCandidateTestAssignment`, `confirmCandidateTestAssignment` y
  `cancelCandidateTest`/proposal de cancelación.
- `TASK-1631`: grant revocable per-tenant/per-capability para writes MCP. Sin cierre verificable, confirm/cancel
  permanecen fail-closed en clientes estándar.
- `src/lib/sister-platforms/mcp-token-exchange.ts` y
  `src/app/api/integrations/v1/sister-platforms/oauth/token/route.ts`.
- `src/lib/api-platform/core/app-auth.ts` y `runAppReadRoute`/write equivalent vigente en Discovery.
- `../efeonce-mcp/src/providers/greenhouse-hiring.ts` creado por TASK-1718.

### Blocks / Impacts

- Operación de Talent desde Codex/Claude: puede revisar con 1718 y asignar/cancelar con confirmación cuando el
  grant write esté habilitado.
- OAuth protected-resource metadata, scope catalog, provider policy y canary del gateway.
- No impacta auto-assignment por etapa: TASK-1719 funciona aunque esta integración siga fail-closed.
- Una futura tool de stage transition debe consumir `updateHiringApplicationStage` y el auto trigger de 1719;
  no se incluye aquí.

### Files owned

- `src/lib/api-platform/resources/app-hiring-candidate-test-assignment.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/candidate-tests/assignments/propose/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/candidate-tests/assignments/confirm/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/candidate-tests/cancellations/propose/route.ts` *(nuevo)*
- `src/app/api/platform/app/hiring/candidate-tests/cancellations/confirm/route.ts` *(nuevo)*
- `src/lib/sister-platforms/mcp-token-exchange.ts`
- `../efeonce-mcp/src/providers/greenhouse-hiring.ts`
- `../efeonce-mcp/src/config.ts`
- `../efeonce-mcp/src/mcp.ts`
- `../efeonce-mcp/scripts/*hiring*canary*.mjs` *(nuevo; nombre exacto en Plan Mode)*
- gateway deploy contract/secret refs, provider catalog, architecture y runbook afectados

## Current Repo State

### Already exists

- Gateway Streamable HTTP/OAuth y adapters provider read-only con allow/deny/fault patterns.
- Un flujo RFC 8693 exacto para sister-platform write de Globe, con token exchange y one-shot authority.
- App API lane que revalida identidad/capability humana, distinto del ecosystem lane de token fijo.
- TASK-1718 especifica provider/read packet Hiring internal-only y el contrato de subject humano delegado.
- TASK-1719 especifica proposal/confirm/cancel, typed outcomes y email-only delivery.
- El command directo actual `assignCandidateTest` usa `applicationId` + `templateId`, requiere
  `hiring.assessment.author` y sólo devuelve el token raw una vez para el flujo interno. No es App API ni contrato
  MCP: nunca se reexpone ese token/link al host, ni se usa el `templateId` libre como input de esta task.
- La alerta interna de assessment submitted está en production mediante `0fe2420ed894`, pero no se ejecutó una
  entrega candidata real; cualquier delivery status sigue siendo readback del ledger, nunca una inferencia del deploy.

### Gap

- No existe scope de blast-radius Hiring write ni policy de tool que lo exija.
- No existen App API resources de assignment/cancellation para sister-platform delegated calls.
- No existen tools MCP propose/confirm/cancel ni annotations/conformance/parity guard para Hiring write.
- El cliente PKCE público compartido no posee ni debe recibir write scope; falta grant revocable de TASK-1631.
- No existe canary que demuestre usuario allow, usuario deny, revocación, proposal drift/expiry, replay y provider
  fault mediante el front door público.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse App API/token exchange/commands en Vercel; provider/OAuth/tool registry en
  `../efeonce-mcp` sobre Cloud Run
- Future candidate home: `api`
- Boundary: cuatro tools MCP traducen schemas a cuatro App API operations; Greenhouse proposal/confirm/cancel es
  el único lugar con business policy y side effects
- Server/browser split: OAuth tokens, proposal authority, capabilities, commands, audit y provider secrets son
  server-only; el host recibe preview/outcome minimizado
- Build impact: `none` — JSON/HTTP sobre clients existentes; sin SDK/DB/storage/parser nuevo en gateway
- Extraction blocker: write identity/grant depende de TASK-1631; Greenhouse conserva transacción y audit;
  gateway conserva OAuth/discovery/deploy

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: ninguno en gateway; commands/proposals/assessment/audit de TASK-1719 en Greenhouse
- Consumidores afectados: Codex, Claude Code, Claude Desktop y hosts MCP internos autorizados
- Runtime target: Greenhouse Vercel + `mcp.efeonce.org` Cloud Run en staging/production

### Contract surface

- Contrato existente a respetar: provider `greenhouse-hiring`, sister-platform token exchange, App API auth,
  MCP 2025-11-25, commands/outcomes de TASK-1719
- Contrato nuevo o modificado: scope Hiring write; cuatro App API operations; cuatro tools MCP; provider policy,
  flags y canary
- Backward compatibility: `gated`; reader 1718 permanece independiente; writes registradas/disabled y fail-closed
- Full API parity: MCP llama el mismo proposal/confirm/cancel que Product API; gateway no reimplementa reglas ni
  toca tablas

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla adicional; usa proposal/audit/assessment de TASK-1719
- Invariantes que no se pueden romper:
  - Initiating human, MCP workload, delegated grant y Greenhouse user se preservan y auditan por separado.
  - Propose no muta assessment ni envía email.
  - Confirm ejecuta exactamente el digest propuesto una vez; replay retorna outcome estable sin side effects.
  - Application/template/time/tenant no pueden cambiarse en confirm.
  - Cancelación sólo ejecuta una propuesta propia y command pre-inicio de TASK-1719.
  - Raw candidate token/link nunca cruza App API/MCP ni aparece en telemetry.
  - `insufficient_scope` o capability revocada fallan antes del command.
  - Reader scope nunca autoriza write y write scope nunca amplía acceso a PII reader.
- Tenant/space boundary: token exchange resuelve tenant/user Greenhouse real; downstream exige interno activo y
  autoriza application/assessment exactos; ningún tenant input es aceptado
- Idempotency/concurrency: proposal one-shot + command idempotency; correlation/request id no es authorization;
  retries sólo para fallos seguros antes de outcome conocido, con readback ante timeout incierto
- Audit/outbox/history: Greenhouse audita proposal/confirm/cancel; gateway registra sólo tool/status/latency/policy
  reason/correlation opacos, sin PII/body/token

### Migration, backfill and rollout

- Migration posture: `none` en gateway/App API; depende de migration completa de TASK-1719
- Default state: `GREENHOUSE_HIRING_WRITES_ENABLED=false`; write scope no asignado al cliente público
- Backfill plan: ninguno
- Rollback path: provider write flag OFF + revocar grant/scope/client binding + redeploy; proposals expiran y
  assignments ya confirmados se manejan con cancellation command, no DELETE
- External coordination: Entra scope/app roles/consent, DCR metadata, grant TASK-1631, Cloud Run/Vercel deploy,
  Talent/Identity/MCP owner sign-off

### Security and access

- Auth/access gate: scope propuesto `efeonce.mcp.hiring.write` por clase de blast radius + exact OAuth client/grant
  + RFC 8693 + usuario interno activo + `hiring.assessment.author` por request
- Sensitive data posture: candidate PII minimizada en preview; sin email/teléfono/token/respuestas/score. Nombre
  display sólo si ya está autorizado por reader 1718 y es necesario para confirmación humana
- Error contract: `insufficient_scope | delegated_grant_missing | forbidden | not_found |
  assignment_proposal_expired | assignment_effect_mismatch | assessment_already_assigned |
  assignment_blocked | cancellation_not_allowed | dependency_unavailable | uncertain_outcome`; sanitizado
- Abuse/rate-limit posture: per-user/workload/application proposal/confirm quotas, one-shot authority, TTL,
  confirmation freshness, circuit breaker y no batch

### Runtime evidence

- Local checks: MCP schemas/annotations, token exchange mappings, audience/scope/capability negatives, effect
  binding, replay y no-token sentinel
- DB/runtime checks: audit Greenhouse atribuye actor/workload/proposal/outcome; una confirm genera una instancia y
  email event; replay no duplica
- Integration checks: initialize/discovery/call desde Codex y Claude con allow/deny/revoked; shared public client
  sin write scope falla; dedicated/granted client ejecuta cuando TASK-1631 cierre
- Reliability signals/logs: `mcp.hiring_write_denied`, `mcp.hiring_write_provider_unavailable`,
  `hiring.assessment_assignment_uncertain`; sin PII
- Production verification sequence: public-edge canary con provider OFF→deny→allow controlado→revoke→rollback

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Business logic permanece en TASK-1719; MCP provider sólo adapta transporte/schema/auth.
- [ ] Tools representan proposal/confirm/cancel capabilities, no endpoints ad hoc ni DB access.
- [ ] Authorization fina y grant real se prueban allow/deny/revoked; scope no sustituye capability.
- [ ] Un proposal confirmado una vez es idempotente, auditado y produce outcome/readback tipado.
- [ ] Write usa App API delegada, nunca ecosystem fixed-token lane.
- [ ] Reversa de cancelación viaja en el mismo provider y conserva propose→confirm.
- [ ] Reader 1718 y writes 1720 tienen flags/scopes separados y rollback independiente.

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

### Slice 0 — ADR/write identity acceptance

- Extender ADR MCP/Hiring con write class, human/workload/grant identities, trust transitions y ownership.
- Revalidar TASK-1631 contra necesidad interna: identificar client/grant exacto que entrega per-human capability
  sin ampliar el PKCE público. Si no existe, mantener confirm/cancel fail-closed.
- Fijar scope, authority binding, TTL, confirmation UX contract, error/redaction, timeout y uncertain outcome.
- Threat model: confused deputy, token passthrough, consent escalation, proposal substitution, replay, IDOR,
  revoked user, bulk assignment y log leakage.

### Slice 1 — Greenhouse App API delegated resources

- Crear cuatro operations App API sobre commands TASK-1719 con schemas cerrados y errores canónicos.
- Propose input: `applicationId`, purpose enum y reason code/texto acotado. Response: proposalId, effect digest,
  display-safe preview, blockers, expiry y `requiresExplicitConfirmation=true`.
- Confirm input: proposalId/authorityId + idempotency key. No application/template/time fields.
- Cancellation replica el patrón sobre assessmentId; confirm sólo recibe cancellation proposal authority.
- Token exchange mapping exacto por client/scope; preservar tests/contratos Globe existentes.

### Slice 2 — Provider tools y policy fail-closed

- Extender `greenhouse-hiring` con:
  - `hiring.candidate_test.assignment.propose`
  - `hiring.candidate_test.assignment.confirm`
  - `hiring.candidate_test.cancellation.propose`
  - `hiring.candidate_test.cancellation.confirm`
- `additionalProperties=false`, enums/lengths/limits, annotations write/approval correctas y tool descriptions
  que obligan a mostrar preview antes de confirm.
- Confirm/cancel tools sólo visibles/ejecutables conforme a provider policy; reader tools no heredan write flag.
- Provider env/deploy/secret refs declarados de forma completa y reproducible.

### Slice 3 — OAuth scope/grant and conformance

- Declarar `efeonce.mcp.hiring.write` como blast-radius class sin añadirlo al public PKCE client.
- Integrar el grant revocable de TASK-1631: subject, tenant, capabilities/resource constraints, expiry/revocation y
  audience exacta.
- Tests de metadata/consent: base/read token no llama write; write token sin Greenhouse capability tampoco;
  usuario revocado falla en la siguiente call.
- Verificar que `az ad app update`/IaC preserve el array completo de scopes; snapshot before/after redacted.

### Slice 4 — Canary, uncertain outcome y rollback

- Canary Codex + Claude: initialize, read candidate packet, propose assignment, display preview, confirm, readback
  assessment/delivery, replay, propose+confirm cancellation.
- Personas: allow con capability, deny interna, base/read-only, revoked y application ajena/no existente.
- Fault injection: Greenhouse timeout antes/después de commit; gateway no reintenta confirm a ciegas, usa readback
  por proposal/idempotency y reporta uncertain sólo si no puede resolver.
- Ejercitar provider flag OFF, scope/grant revocation y rollback en staging antes de production canary.
- Evidencia sin PII: fixtures sintéticos e IDs redactados.

## Out of Scope

- Policy opening→template, stage consumer, assignment/cancel command o email: TASK-1719.
- Candidate/CV reader: TASK-1718.
- Agregar Hiring write al cliente PKCE público compartido o usar ecosystem fixed token.
- Mover etapa por MCP, batch assignment, reminders o campaigns.
- Template authoring, question generation, scoring, ranking o hiring decision.
- Retornar/copiar/enviar token del assessment desde MCP.
- Acceso cliente/B2B antes del evidence gate de TASK-1631.

## Detailed Spec

### Tool contract V1

```ts
type ProposeAssignmentInput = {
  applicationId: string
  purpose: 'candidate_test_assignment'
  reasonCode: 'stage_followup' | 'manual_evaluation' | 'recovery'
  reason?: string
}

type ConfirmAssignmentInput = {
  proposalId: string
  idempotencyKey: string
}
```

El confirm no admite overrides. Si el usuario quiere otra plantilla/time limit, primero cambia la policy mediante
su command gobernado y después crea un proposal nuevo.

### Confirmation behavior

El host debe renderizar antes de confirm: candidato display, opening, template+version, time limit, delivery=email,
assessment existente/blockers, expiration y reversibilidad. El modelo no puede resumir ocultando efectos. La
confirmación se liga al proposalId vigente; una frase del usuario fuera de contexto no autoriza otro proposal.

### Typed result

```ts
type AssignmentToolResult = {
  proposalId: string
  status: 'assigned' | 'already_assigned' | 'blocked' | 'stale'
  assessmentId?: string
  deliveryStatus?: 'pending' | 'sent' | 'failed' | 'skipped'
  reasonCode?: string
  requiresOperatorFollowup: boolean
}
```

El agent reporta `deliveryStatus=pending` como pendiente; no afirma “correo enviado” hasta readback `sent`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1718 + TASK-1719 completas → Slice 0 → Slice 1 → Slice 2 → Slice 3 → Slice 4.
- Provider/tools pueden compilar antes de TASK-1631, pero confirm/cancel permanecen fail-closed.
- Scope/grant allow nunca se promueve antes de deny/revoked/public-client negative tests.
- Rollback drill debe pasar antes del primer assignment real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Write scope termina en cliente público | Entra/MCP | high | hard test requiredResourceAccess + review snapshot | `mcp.hiring_write_public_client_exposed` |
| Gateway ejecuta como machine sin actor humano | identity | high | App API token exchange + actor required | audit sin human subject |
| Agent cambia template tras preview | Hiring | medium | confirm sólo proposalId + effect digest revalidation | `assignment_effect_mismatch` |
| Replay/timeout crea dos tests | API/MCP | medium | one-shot/idempotency/readback, no blind retry | duplicate-prevented/uncertain signal |
| Agent afirma correo enviado cuando está pending | candidate experience | medium | typed delivery status + tool instruction/eval | eval `delivery_overclaim` |
| Token/PII aparece en traces o tool result | privacy | low-medium | content capture OFF + sentinel tests | DLP/PII sentinel |
| Reader scope habilita write por error de policy | gateway | medium | scopes/flags separados + negative test | write with read-only token succeeds |
| Cancellation se ejecuta sin confirmación | Hiring | low-medium | cancellation propose→confirm | audit missing proposal |

### Feature flags / cutover

- `GREENHOUSE_HIRING_PROVIDER_ENABLED` de TASK-1718 conserva reader.
- `GREENHOUSE_HIRING_WRITES_ENABLED=false` controla exclusivamente las cuatro write/approval tools.
- OAuth scope/grant es un segundo gate independiente; flag ON sin grant sigue fail-closed.
- Cutover: tools hidden/disabled → registered+deny → allow staging persona → canary synthetic → one operator/opening
  production → expand.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | rechazar/superseder ADR; sin runtime | inmediato | sí |
| 1 | App routes disabled/revert; proposals expiran | <10 min | sí |
| 2 | write flag OFF + gateway redeploy | <5 min | sí |
| 3 | revoke grant/scope/client binding + redeploy metadata | <10 min | sí |
| 4 | flag OFF + revoke; assignments ya hechas usan cancel command | inmediato/<10 min | parcial por side effect enviado |

### Production verification sequence

1. Verificar TASK-1718/1719 operativas y TASK-1631 con grant exacto/revocable.
2. Deploy Greenhouse App routes disabled; allow/deny unit/contract y audit con fixtures.
3. Deploy gateway con write flag OFF; discovery no expone/ejecuta writes según policy.
4. Registrar tools con flag controlado pero sin grant; public/base/read clients reciben `insufficient_scope`.
5. Activar grant sólo en staging para operador canary; propose muestra effect exacto y no muta.
6. Confirm una vez; verificar assessment, event, email delivery readback y actor/workload audit.
7. Replay confirm; cero instancia/email adicional. Revocar usuario/grant; siguiente call denegada.
8. Propose+confirm cancel pre-start y verificar token inválido/readback.
9. Fault/timeout after commit; resolver por readback sin segundo write.
10. Ejercitar flag OFF + grant revoke; luego producción para una opening/candidato sintético autorizado.
11. Monitor 7 días y expandir sólo si unauthorized=0, duplicates=0, uncertain unresolved=0, PII sentinel=0.

### Out-of-band coordination required

- Identity/MCP owners: scope, client/grant, consent, revocation y DCR metadata.
- Talent: operadores autorizados, preview language, canary opening y cancellation policy.
- Operations: deploy/secret refs/flags y public-edge canary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cuatro tools MCP consumen exclusivamente App API/commands TASK-1719.
- [ ] Propose no muta y confirm recibe sólo proposal/authority + idempotency key.
- [ ] Preview muestra effect completo y confirmation queda ligada al proposal vigente.
- [ ] Gateway no acepta templateId/email/token/time/tenant en input ni accede a DB/storage.
- [ ] Identity audit distingue human subject, MCP workload, delegated grant y Greenhouse actor.
- [ ] Scope Hiring write no está cableado al public PKCE client; test automático lo congela.
- [ ] Read/base token, usuario sin capability, revocado y application ajena fallan cerrados.
- [ ] Confirm replay/timeout no duplica assessment ni email.
- [ ] Raw token/link y PII no aparecen en tool output, logs, traces, audit ni fixtures.
- [ ] Tool reporta delivery pending/sent/failed/skipped honestamente y eval impide overclaim.
- [ ] Cancellation requiere proposal+confirm y sólo opera pre-inicio.
- [ ] Reader 1718 sigue disponible con write flag OFF; rollbacks son independientes.
- [ ] Provider allow/deny/fault y front-door canary pasan desde Codex y Claude.
- [ ] Write permanece `operativamente bloqueado` mientras TASK-1631/grant no estén probados.
- [ ] Architecture, runbook, provider catalog, OAuth metadata y manual quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1720`
- `pnpm ops:lint --changed`
- tests focales App API/token exchange/Hiring commands
- tests provider/schema/auth/parity en `../efeonce-mcp`
- protected-resource metadata + OAuth allow/deny/revoked
- Codex/Claude initialize→propose→confirm→readback→cancel canary
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] TASK-1718/1719/1631, EPIC-011, ADR/router/runbook y provider catalog reflejan estado real
- [ ] no se declara operativa por compile/registration; requiere grant y canary público real

## Follow-ups

- Stage transition MCP propose→confirm sobre command canónico, reutilizando auto trigger TASK-1719.
- Batch assignment sólo con preview por item, límites y aprobación específica si Talent lo solicita.
- Recordatorio/reenvío bajo capability y policy separadas.

## Delta 2026-08-15

- Task creada como consumer cross-runtime de TASK-1719 y write sibling de TASK-1718. La separación permite
  habilitar/retirar lectura y escritura de forma independiente y preserva el hard gate de TASK-1631.

## Open Questions

- Ninguna bloquea registrar. Slice 0 fija client/grant exacto de TASK-1631, TTL/authority format, annotations MCP
  finales y si write tools se ocultan o se muestran con `insufficient_scope` mientras el grant está ausente.
