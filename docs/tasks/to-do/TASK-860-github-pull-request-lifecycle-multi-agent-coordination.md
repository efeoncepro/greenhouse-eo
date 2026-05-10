# TASK-860 — GitHub Pull Request Lifecycle + Multi-Agent Coordination

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-860-github-pr-lifecycle-multi-agent`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear receiver dedicado `/api/webhooks/github/pull-request-events` (mismo patrón que TASK-857) para `pull_request`, `pull_request_review`, `pull_request_review_comment` events. Materializar a `greenhouse_sync.pr_lifecycle_events` append-only. Construir dashboard `/admin/operations/multi-agent-activity` que clasifica autores por kind (`claude`, `codex`, `cursor`, `human`) y muestra qué agente está trabajando dónde, detectando colisiones (2 agentes en mismo branch). Reliability signals: `platform.pr.stale_open`, `platform.pr.review_sla`, `platform.pr.multi_agent_collision`.

## Why This Task Exists

Greenhouse opera con multi-agente activo (Claude + Codex + humanos), documentado en `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`. Hoy NO hay observabilidad de qué agente está trabajando en qué branch/PR — colisiones se descubren cuando aparece un conflict tardío o un revert. Además, GitHub PR lifecycle (opened/closed/merged/review_requested/reviewed) es la fuente natural de DORA *lead time* y *PR-level change failure rate* — métricas hoy invisibles. TASK-857 cubre release events; PR events son scope distinto y necesitan receiver propio para preservar separación de concerns.

## Goal

- Receiver `/api/webhooks/github/pull-request-events` con HMAC + dedup `X-GitHub-Delivery` + inbox + redaction (mismo contract TASK-857).
- Tabla `greenhouse_sync.pr_lifecycle_events` append-only con todos los lifecycle transitions.
- Helper canónico `classifyPrAuthor(login, email)` → `'claude' | 'codex' | 'cursor' | 'human'`.
- Dashboard `/admin/operations/multi-agent-activity` con coordination view + collision detector.
- 3 reliability signals: `platform.pr.stale_open` (>7d sin actividad), `platform.pr.review_sla` (>48h sin review post-ready), `platform.pr.multi_agent_collision` (≥2 agentes mismo branch).
- Auto-trigger ultrareview opcional para PRs que tocan paths críticos (reusa `IRREVERSIBLE_DOMAINS` de TASK-850).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Receiver SEPARADO de TASK-857 release-events. Razón: separation of concerns (release control plane vs PR observability), bounded blast radius, auth/secret distinto si emerge.
- Reusar helpers TASK-857: `github-webhook-signature.ts`, `webhooks/store.ts`, `redactErrorForResponse`.
- `pr_lifecycle_events` es append-only enforced por trigger PG. Nunca UPDATE/DELETE.
- Author classification es PURE function (no GH API call). Heurística declarativa por email/login pattern (`claude-bot@anthropic.com`, `codex-cli@openai.com`, `cursor-bot@cursor.sh`, `noreply@anthropic.com` etc — discovery confirma signatures reales).
- Auto-trigger ultrareview es OPT-IN (NO automático sin flag opt-in per repo).
- Cero PII en `pr_lifecycle_events` — solo login + classified kind, NO email full.

## Normative Docs

- `docs/tasks/complete/TASK-857-github-webhooks-release-event-ingestion.md` (receiver pattern)
- `docs/tasks/in-progress/TASK-850-production-preflight-cli-complete.md` (`IRREVERSIBLE_DOMAINS` classifier)
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-857-github-webhooks-release-event-ingestion.md` (helper reuse)
- `src/lib/release/github-webhook-signature.ts` (re-exportable o copiable)
- `src/lib/webhooks/store.ts` (inbox infrastructure)
- `greenhouse_sync.webhook_endpoints` y `webhook_inbox_events`

### Blocks / Impacts

- Habilita observabilidad multi-agente que hoy es ciega.
- Insumo para DORA *lead time for changes* (complementa TASK-859).
- Pre-requisito para auto-ultrareview gate (V1.1+).

### Files owned

- `migrations/*-task-860-pr-lifecycle-events.sql`
- `src/app/api/webhooks/github/pull-request-events/route.ts`
- `src/lib/release/github-pr-webhook-handler.ts`
- `src/lib/release/github-pr-webhook-handler.test.ts`
- `src/lib/release/pr-author-classifier.ts`
- `src/lib/release/pr-author-classifier.test.ts`
- `src/lib/sync/projections/pr-lifecycle-events.ts`
- `src/lib/sync/projections/pr-lifecycle-events.test.ts`
- `src/lib/reliability/queries/pr-stale-open.ts`
- `src/lib/reliability/queries/pr-review-sla.ts`
- `src/lib/reliability/queries/pr-multi-agent-collision.ts`
- `src/app/(dashboard)/admin/operations/multi-agent-activity/page.tsx`
- `src/views/greenhouse/admin/multi-agent-activity/MultiAgentActivityView.tsx`
- `src/lib/copy/multi-agent-activity.ts`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (Delta sección PR events)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta subsystem `Platform PR`)
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` (Delta sección observabilidad)
- `docs/documentation/plataforma/multi-agent-coordination-dashboard.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Receiver pattern canónico: TASK-857 `/api/webhooks/github/release-events`.
- Helpers signature/dedup: `src/lib/release/github-webhook-signature.ts`, `src/lib/webhooks/store.ts`.
- Webhook endpoints registry: `greenhouse_sync.webhook_endpoints`.
- GH App `Greenhouse Release Watchdog` (App ID `3665723`) ya tiene `Pull requests: Read-only` permission [verificar — si no, agregarlo].
- Multi-agent worktree pattern documentado pero sin observabilidad runtime.

### Gap

- No existe receiver para `pull_request` events.
- No existe tabla `pr_lifecycle_events`.
- No existe classifier de autores agente vs humano.
- No existe dashboard de coordination multi-agente.
- No existe signal de collision (≥2 agentes mismo branch).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — GH App permission + endpoint registration

- Verificar/agregar `Pull requests: Read-only` permission al GH App `greenhouse-release-watchdog` (App ID `3665723`).
- Registrar webhook subscriptions: `pull_request`, `pull_request_review`, `pull_request_review_comment`.
- Insertar fila en `greenhouse_sync.webhook_endpoints` con `endpoint_key='github-pull-request-events'`, `auth_mode='provider_native'`, secret ref a GCP Secret Manager.
- Smoke test: signature válida vs inválida vía curl.

### Slice 2 — Schema + DDL

- Migration crea `greenhouse_sync.pr_lifecycle_events`:
  - `event_id BIGSERIAL PRIMARY KEY`
  - `pr_number INT NOT NULL`
  - `repo_full_name TEXT NOT NULL` (e.g. `efeoncepro/greenhouse-eo`)
  - `action TEXT NOT NULL` (`opened`, `closed`, `merged`, `synchronize`, `review_requested`, `review_submitted`, `comment`)
  - `actor_login TEXT NOT NULL`
  - `actor_classified_kind TEXT NOT NULL` (`claude` | `codex` | `cursor` | `human` | `bot_other`)
  - `head_branch TEXT NOT NULL`
  - `base_branch TEXT NOT NULL`
  - `head_sha TEXT NOT NULL`
  - `pr_title TEXT NOT NULL` (truncated 200 chars, sanitized)
  - `pr_state TEXT NOT NULL` (`open`, `closed`, `merged`)
  - `is_draft BOOLEAN NOT NULL DEFAULT FALSE`
  - `event_timestamp TIMESTAMPTZ NOT NULL`
  - `delivery_id TEXT NOT NULL UNIQUE`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
- Append-only triggers: `pr_lifecycle_events_no_update_trigger`, `pr_lifecycle_events_no_delete_trigger`.
- INDEXes: `(pr_number, event_timestamp DESC)`, `(head_branch, event_timestamp DESC)`, `(actor_classified_kind, event_timestamp DESC)`, `(action, event_timestamp DESC)`.
- Anti pre-up-marker check.

### Slice 3 — Receiver endpoint + handler

- `src/app/api/webhooks/github/pull-request-events/route.ts`: thin route, delega a handler.
- `src/lib/release/github-pr-webhook-handler.ts`: validate signature → dedup by delivery_id → parse payload → classify author → INSERT into `pr_lifecycle_events`.
- Idempotente (ON CONFLICT delivery_id DO NOTHING).
- 6 tests Vitest: signature ok / signature bad / timestamp expiry / dedup / unknown action ignored / payload malformed.

### Slice 4 — Author classifier

- `src/lib/release/pr-author-classifier.ts`: `classifyPrAuthor({login, email?}) → ClassifiedKind`.
- Reglas declarativas (extensibles):
  - `login.endsWith('[bot]')` y email matches `*@anthropic.com` → `claude`
  - login/email matches `*codex*` o `*openai*` → `codex`
  - login/email matches `*cursor*` → `cursor`
  - login en CODEOWNERS humano list → `human`
  - else → `bot_other`
- Tests: 8 escenarios + edge cases.

### Slice 5 — Reliability signals + subsystem `Platform PR`

- `platform.pr.stale_open` (kind=`drift`, severity warning >7d, error >14d): cuenta PRs `open` sin `synchronize` ni `review_submitted` en N días.
- `platform.pr.review_sla` (kind=`lag`, severity warning >48h, error >7d): cuenta PRs `ready_for_review` sin `review_submitted` post-`review_requested`.
- `platform.pr.multi_agent_collision` (kind=`drift`, severity warning si count>0, error si >3): cuenta `head_branch` con eventos de ≥2 `actor_classified_kind` distintos en últimos 24h. Steady=0.
- Wire-up subsystem nuevo `Platform PR` en `getReliabilityOverview`.
- 5 tests por signal.

### Slice 6 — Dashboard `/admin/operations/multi-agent-activity`

- Server page con `requireServerSession` + capability `platform.pr.read` (NUEVA).
- KPI tiles: PRs abiertos por kind (Claude / Codex / Cursor / Humano).
- Tabla "PRs activos últimas 24h" con columnas `pr_number, title, head_branch, actor_kind, last_event, age`.
- Banner condicional si `multi_agent_collision.count > 0` con CTA "Ver branches en colisión".
- Empty state honesto cuando data <24h.
- Microcopy es-CL en `src/lib/copy/multi-agent-activity.ts`.
- Tokens visuales canónicos (Vuexy + Greenhouse design tokens).

### Slice 7 — Auto-trigger ultrareview opcional (FLAG OFF default)

- Flag `home_rollout_flags` key `pr_auto_ultrareview_enabled` (extender CHECK constraint).
- Cuando flag enabled y PR opened/synchronized toca paths IRREVERSIBLE (reusar `IRREVERSIBLE_DOMAINS` de `src/lib/release/preflight/release-batch-policy.ts`), comentar PR sugiriendo `/ultrareview`.
- NO ejecuta ultrareview directo (skill es user-triggered y billed).
- Tests: 4 escenarios (flag off, flag on no-irreversible, flag on irreversible, flag on already-commented).

### Slice 8 — Spec + doc + close

- Delta `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`: nuevo endpoint PR events.
- Delta `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`: nuevo subsystem `Platform PR` + 3 signals.
- Delta `MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`: sección observabilidad runtime.
- Doc funcional `multi-agent-coordination-dashboard.md`.
- Capability `platform.pr.read` + opcional `platform.pr.auto_ultrareview_manage` en catalog.
- CLAUDE.md hard rules: NUNCA escribir UPDATE/DELETE en `pr_lifecycle_events` + NUNCA loggear PR title/email full sin redaction.
- TASK lifecycle close.

## Out of Scope

- NO sincroniza GitHub Issues a `docs/issues/` (eso es task separada si emerge).
- NO ejecuta ultrareview automático (solo sugiere via comment).
- NO modifica branches ni cierra PRs desde el receiver.
- NO migra/backfill PRs históricos pre-receiver (data nace cuando webhook empieza).
- NO incluye `pull_request_target` events (security risk — fork PRs corren código external).
- NO sincroniza con HubSpot ni con tabla `members` para resolver `actor_login` → `member_id` (V1.1 candidate si emerge necesidad).

## Detailed Spec

### Author classification examples

| login | email | classified_kind | razón |
|---|---|---|---|
| `claude-bot[bot]` | `noreply@anthropic.com` | `claude` | bot pattern + anthropic domain |
| `julio-codex` | `julio+codex@efeonce.org` | `codex` | login contains codex |
| `cursor-agent[bot]` | `*@cursor.sh` | `cursor` | login + email pattern |
| `jreyes` | `julio.reyes@efeonce.org` | `human` | en CODEOWNERS |
| `dependabot[bot]` | `*@github.com` | `bot_other` | bot pero no agente AI |

### Multi-agent collision example

```
head_branch: feature/payroll-honorarios
events últimos 24h:
  - opened by claude-bot
  - synchronize by codex-cli
  - review_submitted by jreyes (humano)

→ collision: [claude, codex, human] simultáneos
→ signal warning: 1 collision activa
```

### IRREVERSIBLE paths reuse

Slice 7 importa `IRREVERSIBLE_DOMAINS` desde `src/lib/release/preflight/release-batch-policy.ts` (TASK-850). NUNCA duplica el array. Si emerge necesidad de paths PR-specific, extender el array existente o agregar una capa filter encima.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] GH App tiene permission `Pull requests: Read-only` activa.
- [ ] Receiver `/api/webhooks/github/pull-request-events` valida HMAC + dedupea por `X-GitHub-Delivery`.
- [ ] Tabla `pr_lifecycle_events` creada con anti-update/delete triggers.
- [ ] Classifier `classifyPrAuthor` clasifica los 5 kinds correctamente.
- [ ] 3 signals registrados en subsystem `Platform PR`.
- [ ] Dashboard `/admin/operations/multi-agent-activity` muestra PRs activos + collision banner condicional.
- [ ] Capability `platform.pr.read` seedeada y enforced.
- [ ] Auto-ultrareview comment OPT-IN (flag default OFF).
- [ ] Cero PII en `pr_lifecycle_events` (no email full, title sanitized).
- [ ] Tests Vitest verdes.
- [ ] CLAUDE.md hard rules canonizadas.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/release/github-pr-webhook-handler src/lib/release/pr-author-classifier src/lib/sync/projections/pr-lifecycle-events src/lib/reliability/queries/pr-`
- `pnpm migrate:up`
- Live: abrir 1 PR test desde Claude + 1 sync desde Codex en mismo branch → verificar collision signal warning.

## Closing Protocol

- [ ] `Lifecycle` sync
- [ ] archivo en `complete/`
- [ ] `docs/tasks/README.md` sync
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-857 (helpers compartidos), TASK-850 (IRREVERSIBLE_DOMAINS reuse)
- [ ] Spec deltas agregados (Webhooks, Reliability, MultiAgent)
- [ ] Doc funcional `multi-agent-coordination-dashboard.md` creado
- [ ] CLAUDE.md hard rules canonizadas

## Follow-ups

- Resolver `actor_login` → `member_id` cuando emerja necesidad (JOIN con `greenhouse_core.members.github_login` si esa columna existe).
- Slack/Teams notification cuando collision warning emerge (extender Notification Hub).
- Métricas DORA *lead time for changes* a partir de `opened → merged` (cross-task con TASK-859).
- Auto-asignar reviewers según paths cambiados (CODEOWNERS dinámico).

## Open Questions

- Patterns exactos de email/login para classifier — Discovery debe inspeccionar histórico real de PRs de los 3 agentes en `efeoncepro/greenhouse-eo`.
- ¿Permission `Pull requests` ya está en el GH App o hay que pedirla? Verificar via `az ad app federated-credential list` equivalente para GH App o desde admin web del App.
- Truncation policy del PR title (200 chars OK?) — operador puede preferir 80 para tablas compactas.
- Threshold de `multi_agent_collision` (>0 warning, >3 error) puede ser muy agresivo en steady state real — tunear post-30d.
