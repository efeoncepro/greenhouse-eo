# Backend/Data Task Addendum

Addendum copiable para tasks `TASK-###` que tocan backend, datos, DB, API routes, readers, commands, migraciones, crons, webhooks, sync jobs o integraciones externas.

No reemplaza `TASK_TEMPLATE.md`: se pega como `## Backend/Data Contract` dentro de Zone 1 cuando `Execution profile: backend-data` o `Backend impact != none`.

## Cuándo usarlo

Usar este addendum si la task cambia cualquiera de estos planos:

- API routes, route handlers, commands, readers o contracts consumidos por UI/agentes/MCP.
- Schemas, tablas, views, migrations, seeds, backfills o policies de DB.
- Jobs async, crons, outbox, webhooks, sync consumers, reliability signals o observabilidad runtime.
- Integraciones externas como HubSpot, Notion, Teams, GCP, Azure, Vercel, WordPress/Kinsta o providers AI.
- Semántica sensible de finance, payroll, identity, auth, billing, access, legal, contractor, data quality o source of truth.

No usarlo para docs puros, copy-only UI, cambios visuales sin API/data, refactors locales sin contract público ni persistencia.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `[backend-lite|backend-standard|backend-critical]`
- Impacto principal: `[api|db|migration|command|reader|sync|cron|webhook|integration]`
- Source of truth afectado: `[schema/table/reader/service/API/integration]`
- Consumidores afectados: `[UI/API/MCP/cron/worker/external]`
- Runtime target: `[local|staging|production|worker|cron|external]`

### Contract surface

- Contrato existente a respetar: `[path/schema/route/type/OpenAPI/ADR]`
- Contrato nuevo o modificado: `[endpoint/command/reader/event/schema]`
- Backward compatibility: `[compatible|breaking|gated|not applicable]`
- Full API parity: `[como la UI/agente consume primitive server-side, no tabla/boton ad hoc]`

### Data model and invariants

- Entidades/tablas/views afectadas: `[schema.name]`
- Invariantes que no se pueden romper:
  - `[invariante 1]`
  - `[invariante 2]`
- Tenant/space boundary: `[como se deriva space_id/account/member/session]`
- Idempotency/concurrency: `[idempotency key, transaction boundary, lock, retry, exactly/at-least-once]`
- Audit/outbox/history: `[append-only log, event, signal, none with rationale]`

### Migration, backfill and rollout

- Migration posture: `[none|additive|destructive|backfill|seed|view refresh]`
- Default state: `[flag OFF|read-only|shadow|disabled|enabled with rationale]`
- Backfill plan: `[dry-run/apply/allowlist/batch size/rollback]`
- Rollback path: `[flag off/revert PR/reverse migration/restore snapshot/manual repair]`
- External coordination: `[secrets/env vars/redeploy/webhook subscription/provider config/operator sign-off]`

### Security and access

- Auth/access gate: `[session/capability/role/ecosystem token/HMAC/service account]`
- Sensitive data posture: `[PII/payroll/finance/secrets/no sensitive data]`
- Error contract: `[canonical error codes, no raw errors, captureWithDomain]`
- Abuse/rate-limit posture: `[rate limit, quotas, replay guard, circuit breaker, none with rationale]`

### Runtime evidence

- Local checks: `[tests/scripts]`
- DB/runtime checks: `[psql/read-only query/migration verify/smoke]`
- Integration checks: `[provider smoke/webhook dry-run/staging call]`
- Reliability signals/logs: `[signal names/dashboard/log query]`
- Production verification sequence: `[ordered smoke steps or N/A with rationale]`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Aplica cuando la task **introduce o modifica una capability** (cualquier acción de negocio que afecte estado, permisos, datos, aprobaciones, exports, recoveries, reportes o configuración). Si la task no toca una capability (refactor local, doc, copy), marcá `N/A — no capability` con razón.

**Base:** Full API Parity (contrato gobernado a nivel capability). **Consecuencia:** Nexa y los 10 consumers la operan por construcción. Fuente: `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (§North Star + §Canonical consumers), CLAUDE.md §"Full API Parity Principle".

- [ ] **Lógica en el primitive, no en la UI.** La regla de negocio vive en `src/lib/**` (command/reader/projection), no dentro de un componente UI.
- [ ] **Modelada como aggregate/recurso/command, no como click-handler** acoplado a la pantalla.
- [ ] **Read** expuesto como reader/recurso canónico; **write** como command con: command semantics, **authorization fina** (capability/entitlement, NO admin-coarse), idempotencia si es reintentable, audit/outbox cuando aplique, errores canónicos sanitizados, observabilidad.
- [ ] **Capability + grant en el MISMO PR** (si gatea): registry + grant a ≥1 rol real + coverage test (TASK-873/935).
- [ ] **Camino programático declarado:** Product API / `api/platform/app` / `api/platform/ecosystem` (MCP) / CLI / o task follow-up explícita. `UI-only por ahora` solo con deuda documentada (owner + condición de retiro).
- [ ] **Write apto para `propose → confirm → execute`** (runtime de acción gobernada). NO construir integración Nexa-específica.
- [ ] **Un primitive, muchos consumers:** cero lógica duplicada por consumer (UI/Nexa/MCP/app/ecosystem/webhook/Teams/async/CLI/E2E).
- [ ] **Parity check = SÍ:** "¿esta capability tiene contrato gobernado a nivel capability?" Si sí → todos los consumers (incl. Nexa) la operan por construcción. Si no → la feature NO está completa.

> Para capabilities **existentes** que la task toca: aplica el mismo gate con regla *touch-it/fix-it* (estrangulamiento). No retrofitear backlog cold; sí subir a parity lo que se modifica, o registrar la brecha como deuda visible.

## Rigor Levels

| Rigor | Cuándo basta | Evidencia mínima |
|---|---|---|
| `backend-lite` | Refactor local, reader additive, tooling/doc con contract menor, no migration ni external write | Unit/focal test o static check + no-runtime-impact rationale |
| `backend-standard` | API/reader/command/schema additive, reliability signal, non-destructive migration, internal integration | Tests + migration/read smoke cuando aplique + rollout/rollback concreto |
| `backend-critical` | Finance/payroll/auth/identity/billing, destructive migration, backfill mutante, external writes, webhooks/crons prod, source-of-truth switch | Staging/live evidence, dry-run/apply plan, rollback verified, flags/cutover, owner/sign-off |

## Migration rule for existing tasks

No migrar backlog historico masivamente. Cuando una task `to-do/` o `in-progress/` existente se edite, se rankee o se tome y toque backend/data, agregar:

- `Execution profile: backend-data`
- `Backend impact: ...`
- `## Backend/Data Contract` completo

`complete/` queda como historia salvo que se reabra.
