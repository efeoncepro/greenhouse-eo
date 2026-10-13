# TASK-1917 — Efeonce ID: delegación por corrida de agente con claim `act` (RFC 8693)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Epic: `EPIC-044`
- Status real: `Diseno — registrada 2026-09-26 como unidad U22 de EPIC-044 por decisión del operador (Julio Reyes): la delegación para corridas de agente en segundo plano vive en Efeonce ID, no en EPIC-049. Sin implementación`
- Rank: `TBD`
- Domain: `identity|platform`
- Blocked by: `Nueva definición del contrato de escritura delegada de Studio (TASK-1899 retirada por el operador el 2026-10-04; no reactivarla automáticamente) · TASK-1914 (lista blanca versionada de tools por rol, fuente de los scopes permitidos) · TASK-1913 (work item y assignment_id a los que se ata la delegación)`
- Branch: `Greenhouse develop (services/auth-server, src/lib/auth-server, src/lib/sister-platforms, docs) · efeonce-mcp rama + PR (verificación del token de corrida en el gateway) · efeonce-marketing-studio main sólo para el consumidor (TASK-1915); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Efeonce ID (`auth.efeonce.org`) emite **tokens de delegación por corrida**, cortos y revocables, con los que un
agente trabaja en segundo plano en nombre de la persona que le asignó el trabajo: la persona es el sujeto (`sub`) y
el rol de agente versionado es el actor (claim `act` de RFC 8693). Los scopes del token son un subconjunto de la
lista blanca del rol, y el token queda atado a la organización, al work item y a la corrida. La autorización sigue
pasando, en cada llamada, por el canje RFC 8693 que Greenhouse ya hace para Marketing Studio, de modo que el agente
nunca tiene más autoridad que la persona. Único consumidor inicial: el modo delegado en segundo plano de TASK-1915.

## Why This Task Exists

- El ADR de operación híbrida con agentes (§4.4) decidió que la delegación para corridas en segundo plano la emite
  **sólo Efeonce ID** y dejó la mecánica abierta (§11, pregunta 1). TASK-1915 tiene su Slice 5 bloqueado porque
  ninguna unidad de EPIC-044 poseía ese trabajo. El operador resolvió el 2026-09-26 crear esta unidad nueva.
- Hoy el emisor sólo acepta `authorization_code` y `refresh_token` (`src/lib/auth-server/oauth/token.ts`) y no emite
  tokens con `act`; el canje de Greenhouse (`src/lib/sister-platforms/mcp-token-exchange.ts`) verifica sólo tokens
  Entra de la persona; el gateway no distingue un token de corrida de uno interactivo.
- Sin esta pieza, la única forma de que un agente trabaje sin la persona presente sería darle una credencial de
  servicio o un refresh de larga vida, que el ADR prohíbe.

## Goal

- Contrato del token de corrida publicado en la arquitectura del emisor: `sub` = persona, `act` = rol de agente con
  versión, audiencia `mcp.efeonce.org`, scopes ⊆ lista del rol, contexto de corrida (organización, work item,
  corrida), vida corta, sin refresh.
- Registro de delegaciones consentidas en `greenhouse_auth`, revocable por la persona, por la cancelación del work
  item y al cerrar la corrida.
- El canje RFC 8693 de Greenhouse acepta el token de corrida como sujeto, vuelve a evaluar la capability exacta de la
  persona en cada llamada y propaga `act` y el contexto de corrida al token canjeado.
- El gateway verifica emisor, `act`, contexto y scopes antes de despachar; Studio rechaza cualquier confirmación `T2`
  que llegue con `act`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` (emisor nativo, llave KMS HSM, clases de token)
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (§4 tokens, §5 consentimiento, §7 tablas, §10 invariantes)
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D8–D11: el grant nativo v2 no delega Studio;
  sumar una clase nueva exige autorización nueva, no un flag)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md` (§4.4 identidad y
  autoridad, §11 pregunta 1 resuelta el 2026-09-26)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` y
  `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **Sólo Efeonce ID emite la delegación.** Ni el gateway, ni Studio, ni el despachador, ni un proveedor de modelo
  acuñan tokens de corrida.
- **El agente nunca tiene más autoridad que la persona:** el token de corrida no concede nada por sí mismo; la
  autoridad efectiva es la capability de la persona, releída en cada llamada por el canje, intersectada con la lista
  blanca del rol.
- **Scopes ⊆ lista blanca del rol en la versión asignada**; un scope fuera de la lista se rechaza al emitir, no se
  recorta en silencio.
- **Corta, revocable y sin refresh.** El token nunca se entrega a un proveedor de modelo con capacidad de renovarse.
- **Una confirmación `T2` con `act` nunca es válida** (`403 confirmation_requires_direct_person`): la confirma la
  persona en un cliente interactivo o en la UI.
- **Revocar falla cerrado en la siguiente llamada**, no al expirar el token.
- Nunca loggear el token ni su valor parcial más allá del prefijo de diagnóstico que ya usa el canje.

## Normative Docs

- `docs/tasks/to-do/TASK-1915-marketing-studio-agent-dispatcher-claude-openai-adapters.md` (consumidor: Slice 5)
- `docs/tasks/to-do/TASK-1899-marketing-studio-mcp-writes-approvals.md` (tabla de contratos de canje y guarda sin `act`)
- `docs/tasks/to-do/TASK-1914-marketing-studio-agent-role-registry-role-cards.md` (lista blanca por rol)
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (§ Provider Marketing Studio)
- `.claude/skills/efeonce-mcp-platform/SKILL.md` y `.claude/skills/efeonce-marketing-studio/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1899`: contratos de canje por capability exacta y el hook de kernel que rechaza confirmaciones `T2` con `act`.
- `TASK-1914`: `PortableAgentSpec` con la lista de tools por rol y versión.
- `TASK-1913`: `work_item_id` y `assignment_id` estables.
- Emisor productivo de EPIC-044 (U01/U02, `services/auth-server/`): llave KMS HSM, tabla de clientes, audit.

### Blocks / Impacts

- `TASK-1915` Slice 5 (modo delegado en segundo plano) queda bloqueado sólo por esta task y por la evaluación de
  TASK-1916.
- `TASK-1899`: su guarda sin `act` pasa de defensiva a ejercitada con tokens reales.
- `TASK-1840` (U15, logout multiproducto): cerrar todas las sesiones de una persona debe revocar sus delegaciones de
  corrida vigentes; coordinar el fan-out.
- `TASK-1833` (U08): el red-team incluye el token de corrida (escalamiento de scope, reuso fuera de la corrida,
  confirmación `T2` con `act`).

### Files owned

- Greenhouse: `src/lib/auth-server/oauth/token.ts`, `src/lib/auth-server/oauth/tokens.ts`,
  `src/lib/auth-server/oauth/agent-run-delegation.ts` [nuevo], `src/lib/auth-server/oauth/store/**` (tabla de
  delegaciones), migración `greenhouse_auth` [nueva], `src/lib/sister-platforms/mcp-token-exchange.ts` +
  `mcp-token-exchange.test.ts` (aceptar el token de corrida como sujeto), `services/auth-server/deploy.sh` (flag),
  `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Gateway `efeonce-mcp`: `src/auth/token-verifier.ts`, `src/auth/auth-context.ts`, `src/auth/tool-policy.ts`,
  `src/providers/marketing-studio.ts` (reenvío del contexto de corrida), `package.json`, `surface-baseline.json`

## Current Repo State

### Already exists

- Emisor `auth.efeonce.org` productivo con JWT ES256 firmado en KMS HSM, refresh rotativo, revocación e
  introspección (`src/lib/auth-server/oauth/**`, `services/auth-server/`).
- Canje RFC 8693 de Greenhouse (`exchangeMcpGatewayToken` en `src/lib/sister-platforms/mcp-token-exchange.ts`) que
  ejecuta `can(persona, capability)` en cada llamada y emite un token canjeado de 300 s.
- Gateway multi-issuer con `AuthContext` y policy por tool (`efeonce-mcp/src/auth/**`).
- Autoridad nativa interna v2 que hoy responde `unsupported` para las tools de Studio
  (`marketing_studio_native_policy_missing`).

### Gap

- El endpoint de token no acepta un grant de delegación ni emite `act`.
- No existe registro de delegaciones consentidas ni su revocación por work item o corrida.
- El canje sólo verifica tokens Entra como sujeto y no propaga actor ni contexto de corrida.
- El gateway no verifica el contexto de corrida ni distingue un token con `act`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: emisor `services/auth-server/` + `src/lib/auth-server/oauth/**` (Greenhouse), canje en `src/lib/sister-platforms/mcp-token-exchange.ts`, verificación en `efeonce-mcp/src/auth/**`
- Future candidate home: `remain-shared`
- Boundary: el emisor es la única autoridad que acuña el token de corrida; el canje de Greenhouse y el gateway sólo lo verifican; Studio y el despachador son consumidores que nunca lo fabrican
- Server/browser split: sólo servidor; el token nunca llega al navegador
- Build impact: none (sin dependencias nuevas; reutiliza `jose` y la firma KMS existente)
- Extraction blocker: el emisor comparte el schema `greenhouse_auth` y la excepción EPIC-027 del deployable `auth-server`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_auth.agent_run_delegations` (nueva) y la emisión de tokens del emisor
- Consumidores afectados: despachador de Studio (TASK-1915), canje de Greenhouse, gateway `efeonce-mcp`, Studio (auditoría y guarda `T2`)
- Runtime target: `auth-server` (Cloud Run), Greenhouse (Vercel, ruta del canje), gateway (Cloud Run), staging y production

### Contract surface

- Contrato existente a respetar: forma del access token (§4.1 del contrato del emisor), canje por capability exacta (TASK-1899), `AuthContext` del gateway
- Contrato nuevo o modificado: token de corrida (claims `sub`, `act`, `aud`, `scope`, contexto de corrida, `exp`, `jti`); command de consentimiento y revocación de delegación; aceptación del token de corrida como sujeto del canje
- Backward compatibility: `gated` (flag apagado; los tokens interactivos no cambian)
- Full API parity: consentir, listar y revocar delegaciones tienen command, ruta y consumo programático; la persona puede revocar sin UI

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_auth.agent_run_delegations` [nueva, forma exacta en Discovery]: persona, organización, rol y versión, `work_item_id`, `run_id`, scopes concedidos, estado, `expires_at`, `revoked_at`, motivo
- Invariantes que no se pueden romper:
  - scopes emitidos ⊆ lista blanca del rol en la versión asignada; fuera de lista ⇒ rechazo al emitir
  - un token de corrida sin delegación vigente es inválido aunque su `exp` no haya vencido
  - el token canjeado conserva `act` y el contexto de corrida; nunca los descarta
  - confirmación `T2` con `act` ⇒ `403 confirmation_requires_direct_person`
  - la persona que perdió la capability falla cerrada en la siguiente llamada
  - sin refresh token para tokens de corrida
- Write-target allowlist: `greenhouse_auth` (dominio del emisor)
- Tenant/space boundary: la delegación queda atada a una organización; una llamada con `organizationId` distinto falla antes del provider
- Idempotency/concurrency: una delegación por `(assignment_id, run_id)`; reemitir para la misma corrida devuelve la delegación vigente
- Audit/outbox/history: audit del emisor por consentimiento, emisión y revocación; auditoría de Studio «persona X, ejecutado por agente `<rol>@<versión>` (corrida R)»

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: flag del emisor apagado; el gateway no acepta tokens de corrida hasta su release
- Backfill plan: ninguno
- Rollback path: flag OFF en el emisor + revocación masiva de delegaciones vigentes; el gateway vuelve a rechazar el issuer para corridas; revert PR
- External coordination: release del gateway; registro del cliente confidencial del despachador en el emisor; D10 (autorización nueva) para la clase de delegación

### Security and access

- Auth/access gate: emitir exige delegación consentida por la persona al asignar; el despachador se autentica como cliente confidencial con identidad de workload; cada llamada pasa por `can(persona, capability exacta)`
- Sensitive data posture: el token no se loggea; el proveedor de modelo recibe sólo el token de la corrida, nunca un refresh
- Error contract: `delegation_unavailable`, `delegation_revoked`, `delegation_scope_exceeds_role`, `confirmation_requires_direct_person` (compartidos con TASK-1915)
- Abuse/rate-limit posture: límite de delegaciones vigentes por persona y por organización; vida corta del token

### Runtime evidence

- Local checks: tests de emisión (scopes ⊆ rol, rechazo fuera de lista, sin refresh), verificación en el canje (sujeto Efeonce ID con `act`, capability releída, delegación revocada), guarda `T2`
- DB/runtime checks: migración con bloque `DO` de verificación; `SELECT` de la tabla en staging
- Integration checks: canary en staging de una corrida sobre `CMP-900` que lee y escribe un borrador `T1`, intenta un `T2` (rechazado), y falla cerrada tras revocar la delegación
- Reliability signals/logs: `auth.agent_run_delegation.revoked_but_used` (estado estable 0), proporción de rechazos por scope

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio, en el mismo PR.
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

### Slice 1 — Contrato del token de corrida

- Delta en `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (§4) con la forma del token de corrida, su vida máxima, la
  ausencia de refresh y la relación con el access token interactivo.
- Delta en `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` que registra la delegación de corrida como autoridad
  nueva con su propia autorización (D10), no como ampliación del grant v2.

### Slice 2 — Registro de delegaciones y emisión

- Migración aditiva de `greenhouse_auth.agent_run_delegations` con bloque `DO` de verificación.
- Command de consentimiento que registra la delegación cuando la persona asigna un work item a un rol en modo
  segundo plano, y commands de revocación (por la persona, por cancelación del work item, al cerrar la corrida).
- Emisión por el endpoint de token del emisor para el cliente confidencial del despachador, con `act` y contexto de
  corrida, scopes ⊆ lista del rol, detrás del flag.

### Slice 3 — Canje de Greenhouse

- `exchangeMcpGatewayToken` acepta el token de corrida de Efeonce ID como sujeto, comprueba que la delegación siga
  vigente, ejecuta `can(persona, capability)` como hoy y propaga `act` y el contexto de corrida al token canjeado.

### Slice 4 — Gateway y guarda en Studio

- `efeonce-mcp`: verificación del issuer, `act`, contexto de corrida y scopes en `token-verifier`/`tool-policy`;
  reenvío del contexto al provider `marketing-studio`; bump de versión y `surface:baseline`.
- Studio recibe el contexto y aplica la guarda `confirmation_requires_direct_person` (hook de TASK-1899) y la
  auditoría por corrida (TASK-1915).

### Slice 5 — Canary, señales y docs

- Canary en staging y production (con permiso del operador) de extremo a extremo; señal de uso tras revocación;
  runbook de revocación masiva; fila en el ledger de flags con sus runtimes.

## Out of Scope

- El despachador, sus adaptadores y el ledger de corridas (TASK-1915).
- La identidad de servicio por rol del modo programado (TASK-1915 Slice 6; su emisor se define allí con EPIC-044).
- Ampliar el grant nativo v2 a las tools de Studio.
- UI para listar o revocar delegaciones (follow-up consumidor; la revocación queda disponible por API y MCP).

## Detailed Spec

Principios fijados por el operador el 2026-09-26 (no se reabren en Discovery):

| Aspecto | Decisión |
|---|---|
| Emisor | Sólo Efeonce ID (`auth.efeonce.org`) |
| Sujeto / actor | `sub` = persona que asignó; `act` = rol de agente con versión (`agent:<rol>@<versión>`) |
| Scopes | ⊆ lista blanca del rol en la versión asignada |
| Atadura | Organización, work item y corrida |
| Vida | Corta, revocable, sin refresh |
| Autoridad efectiva | Canje RFC 8693 existente de Greenhouse, con la capability exacta releída en cada llamada |
| Consumidor inicial | Modo delegado en segundo plano de TASK-1915 |

Quedan para Discovery (ver Open Questions): vida máxima exacta del token, forma del consentimiento al asignar, cómo
se autentica el despachador ante el emisor y la forma exacta de la tabla.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contrato) → Slice 2 (registro y emisión, flag apagado) → Slice 3 (canje) → Slice 4 (gateway y guarda) →
  Slice 5 (canary). El gateway no acepta tokens de corrida antes de que el canje los verifique.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Agente con más autoridad que la persona | identity | low | scopes ⊆ rol al emitir + capability releída por el canje en cada llamada | rechazos `delegation_scope_exceeds_role` |
| Token de corrida reutilizado fuera de su corrida | identity | medium | atadura a work item y corrida verificada en canje y gateway; vida corta | `auth.agent_run_delegation.revoked_but_used` |
| Confirmación `T2` hecha por un agente | identity | low | guarda `confirmation_requires_direct_person` en Studio | conteo de `403 confirmation_requires_direct_person` |
| Revocación que no corta a tiempo | identity | medium | verificación de delegación vigente en el canje, no sólo `exp` | uso tras revocación |

### Feature flags / cutover

- Flag del emisor para emitir tokens de corrida (nombre y runtimes en Discovery; declarado en `services/auth-server/deploy.sh` y en el ledger de flags), apagado por defecto. El gateway acepta el issuer para corridas sólo tras su release.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del delta documental | < 10 min | sí |
| Slice 2 | flag OFF + revocación masiva de delegaciones vigentes | < 15 min | sí |
| Slice 3 | revert PR; el canje vuelve a aceptar sólo sujetos Entra | < 30 min | sí |
| Slice 4 | release anterior del gateway por dispatch manual | < 30 min | sí |
| Slice 5 | sin cambio de runtime propio | < 5 min | sí |

### Production verification sequence

1. Staging: emisión con flag ON, canje y gateway con una corrida sobre `CMP-900`; `T2` rechazado; revocación corta la siguiente llamada.
2. Production: flag ON sólo con permiso del operador y con TASK-1915 listo para consumir; canary con una persona interna.
3. Observación de la señal de uso tras revocación durante siete días.

### Out-of-band coordination required

- Autorización del operador para la clase de delegación (D10) y para cada flip en production.
- Release del gateway `efeonce-mcp` (dispatch manual).
- Coordinación con TASK-1840 para que el logout global revoque delegaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El emisor emite tokens de corrida con `sub` = persona, `act` = `agent:<rol>@<versión>`, audiencia `mcp.efeonce.org`, contexto de corrida y sin refresh token.
- [ ] Pedir un scope fuera de la lista blanca del rol se rechaza al emitir (`delegation_scope_exceeds_role`).
- [ ] El canje de Greenhouse acepta el token de corrida, ejecuta `can(persona, capability)` en cada llamada y propaga `act` y el contexto de corrida.
- [ ] Revocar la delegación (persona, cancelación del work item o cierre de la corrida) hace fallar cerrada la siguiente llamada.
- [ ] Una confirmación `T2` con `act` responde `403 confirmation_requires_direct_person`.
- [ ] El gateway rechaza un token de corrida con organización, work item o corrida distintos a su contexto.
- [ ] Canary de extremo a extremo verde en staging; production sólo con permiso del operador.
- [ ] Flag registrado en el ledger con sus runtimes.

## Verification

- `pnpm local:check`
- `pnpm test src/lib/auth-server src/lib/sister-platforms`
- Tests y `surface:baseline` del gateway `efeonce-mcp`
- Canary de corrida en staging

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `EPIC-044` (U22) y `TASK-1915` reflejan el estado de esta task.
- [ ] Skills `efeonce-mcp-platform` y `efeonce-marketing-studio` actualizadas y espejadas.

## Follow-ups

- Superficie de la persona para listar y revocar sus delegaciones (consumidor de U17/TASK-1842 o de la UI de Studio).
- Reutilizar el mecanismo para otros productos con agentes en segundo plano cuando exista un segundo consumidor.

## Open Questions

- Vida máxima del token de corrida y si se reemite por tramos durante corridas largas (sin refresh).
- Forma del consentimiento de la persona al asignar: confirmación en el propio command de asignación de TASK-1913 o
  una pantalla del emisor.
- Cómo se autentica el despachador ante el emisor (cliente confidencial con identidad de workload, como el canje
  actual con Google ID token, u otra forma) y si la emisión usa `grant_type` de token-exchange con `actor_token`.
