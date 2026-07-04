# TASK-1330 — AI Visibility Report Short Links Capability

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|public-site|api`
- Blocked by: `TASK-1329 complete local; TASK-1325 hub live`
- Branch: `task/TASK-1330-ai-visibility-report-short-links-capability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear una capability gobernada de short links para los informes publicos del AI Visibility Grader. El objetivo es que el share del reporte use URLs estables y cortas tipo `https://think.efeoncepro.com/s/<code>` en vez de exponer rutas largas tokenizadas, manteniendo Greenhouse como source of truth y Think como renderer/redirector tonto.

## Why This Task Exists

TASK-1329 agrego una experiencia shareable premium al informe publico, pero solo puede hacer un acortamiento transicional en el hub (`/r/<token>`). Un short link real necesita persistencia, generacion idempotente, expiracion/revocacion, auditoria y resolucion server-side para no convertir el token publico del reporte en copy largo ni en logica ad hoc del frontend.

## Goal

- Generar un alias corto, no enumerable y persistente para cada `grader_reports` publicable.
- Resolver el alias desde Greenhouse/Think sin filtrar el token largo en el mensaje compartido.
- Exponer un contrato consumible por correo, HubSpot handoff y share widget del hub.
- Mantener compatibilidad con URLs existentes `/brand-visibility/r/<token>`.
- Registrar uso, expiracion, revocacion y senales operativas proporcionales al riesgo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md`
- `docs/tasks/complete/TASK-1280-growth-ai-visibility-public-report-model-contract.md`
- `docs/tasks/complete/TASK-1324-ai-visibility-report-email-link-repoint-public-hub.md`
- `docs/tasks/complete/TASK-1329-ai-visibility-report-visual-editorial-polish.md`

Reglas obligatorias:

- Greenhouse es el source of truth del alias y su resolucion; `efeonce-think` no inventa ni persiste codigos.
- No tocar scoring, probes, `ReportArtifactModel`, grader run execution ni `executeClaimedGraderRun`.
- No reemplazar el token reader existente; el short link es capa aditiva sobre el snapshot publico inmutable.
- El codigo corto tambien es una credencial publica: debe ser de alta entropia, no enumerable, revocable y rate-limited.
- No usar un SaaS externo de URL shortener en V1.
- No exponer raw prompts, raw provider answers, full citation URLs, internal findings ni tokens largos en el texto visible del share.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `migrations/20260425010847591_task-631-quote-short-links.sql` — precedente de short-code format y revocacion para quote share.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.grader_reports` — snapshot publico inmutable de TASK-1239.
- `GET /api/public/growth/ai-visibility/report/[token]` — endpoint publico actual del informe.
- `src/lib/growth/ai-visibility/hubspot/report-link.ts` — fuente unica actual para report URL en correo + HubSpot.
- Repo externo `/Users/jreye/Documents/efeonce-think` — consumidor del URL corto en el share widget y futuro redirect `/s/[code]`.

### Blocks / Impacts

- Desbloquea compartir informes con URLs mas limpias, persuasivas y seguras.
- Puede alimentar correo, HubSpot `report_url`, share widget del informe y futuras analytics de share.
- Reduce dependencia del token largo en copy publico sin romper links existentes.

### Files owned

- `migrations/*_task-1330-ai-visibility-report-short-links.sql`
- `src/lib/growth/ai-visibility/report/short-link.ts`
- `src/lib/growth/ai-visibility/hubspot/report-link.ts`
- `src/app/api/public/growth/ai-visibility/report/short-link/[code]/route.ts`
- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts`
- `src/app/api/admin/growth/ai-visibility/runs/[runId]/report/publish/route.ts`
- `src/types/db.ts` / generated DB types if migration changes schema
- `[repo externo] /Users/jreye/Documents/efeonce-think/src/pages/s/[code].astro`
- `[repo externo] /Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`

## Current Repo State

### Already exists

- Public report snapshots use `greenhouse_growth.grader_reports.report_token` as the public auth credential.
- `buildPublicReportUrl(reportToken)` points to `https://think.efeoncepro.com/brand-visibility/r/<token>` by default.
- TASK-1329 added a share dock in Think and a temporary local route-shortening path `/r/<token>` for less noisy copy.
- Quote share has a prior short-link table in `greenhouse_commercial.quote_short_links` with 7-12 char format, expiry and revocation.

### Gap

- There is no durable alias for AI Visibility public reports.
- Think cannot generate a real short code without becoming a second source of truth.
- Email, HubSpot and share copy still depend on the long token route unless this backend capability exists.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.grader_reports` + new `greenhouse_growth.grader_report_short_links`
- Consumidores afectados: `public report API`, `email`, `HubSpot handoff`, `efeonce-think`, future share analytics
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `GET /api/public/growth/ai-visibility/report/[token]`, `buildPublicReportUrl(reportToken)`
- Contrato nuevo o modificado: short-link command/reader + public resolve endpoint + optional `shareShortUrl` in public report payload/header
- Backward compatibility: `compatible`
- Full API parity: capability lives in server-side command/reader; UI/email/HubSpot consume generated URLs, never build aliases ad hoc.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_reports`, new `greenhouse_growth.grader_report_short_links`
- Invariantes que no se pueden romper:
  - `grader_reports` remains append-only; short-link creation never mutates `public_report_json`.
  - one active canonical short link per report unless explicit rotation is requested.
  - short codes are high-entropy, non-sequential, case-sensitive base62 and collision-retried in a transaction.
  - revoked or expired codes never resolve to a live report.
- Tenant/space boundary: public report token/code is the access boundary; internal generation remains gated by existing publish/admin/report commands.
- Idempotency/concurrency: `ensureAiVisibilityReportShortLink(reportId)` returns the existing active link or creates one with unique-code retry under transaction.
- Audit/outbox/history: table stores `created_at`, `created_by_source`, `expires_at`, `revoked_at`, `last_used_at`, `use_count`; add reliability signal for resolve failures/expired/revoked.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `read-only` until route/helper integration is enabled in staging
- Backfill plan: none by default; create on demand for new shares/reports. Optional backfill for recent publicable reports only after staging proof.
- Rollback path: keep existing long URLs as fallback; disable short-link consumption in helper/Think; revert route if needed.
- External coordination: Think route `/s/[code]`, Vercel env host config, staged smoke with one public report token.

### Security and access

- Auth/access gate: public high-entropy short code + existing public report token behind server-side resolution; admin generation via existing report publish capability.
- Sensitive data posture: report token is treated as sensitive public credential; do not expose raw long token in share message when short code exists.
- Error contract: 404 for unknown, 410 for expired/revoked, no raw DB errors; capture with growth/ai visibility domain.
- Abuse/rate-limit posture: rate limit public resolve endpoint by IP/code; log only bounded metadata.

### Runtime evidence

- Local checks: unit tests for code generation, idempotency, collision retry, expiry/revocation, URL builder fallback.
- DB/runtime checks: migration apply + psql smoke for unique constraints and active-index behavior.
- Integration checks: staging resolve `/s/<code>` -> report render, email/HubSpot URL uses short link when available.
- Reliability signals/logs: `growth.ai_visibility.short_link_resolve`, `growth.ai_visibility.short_link_expired`, `growth.ai_visibility.short_link_revoked`.
- Production verification sequence: create one short link for a staging/prod-safe report, open public short URL, confirm redirect/render, confirm no raw token visible in share copy.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive, no en la UI.
- [ ] Modelada como aggregate/recurso/command, no como click-handler acoplado a la pantalla.
- [ ] Read expuesto como reader/recurso canónico; write como command con autorizacion, idempotencia, errores sanitizados y observabilidad.
- [ ] Capability + grant en el MISMO PR si se introduce gate dedicado; si reusa `growth.ai_visibility.report.publish`, documentar el reuso.
- [ ] Camino programático declarado: Product API/public endpoint + command/reader server-side.
- [ ] Write apto para `propose → confirm → execute` si se expone a Nexa/MCP en el futuro.
- [ ] Un primitive, muchos consumers: correo, HubSpot, Think y futuros agents consumen el mismo contrato.
- [ ] Parity check = SÍ: la capability tiene contrato gobernado a nivel capability.

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

### Slice 1 — Schema + short-code primitive

- Additive migration for `greenhouse_growth.grader_report_short_links`.
- High-entropy code generator and collision retry.
- Reader/command pair:
  - `ensureAiVisibilityReportShortLink({ reportId | reportToken })`
  - `resolveAiVisibilityReportShortLink(shortCode)`
  - optional `revokeAiVisibilityReportShortLink(shortCode, reason)`.
- Unit tests for generation, idempotency, expiry, revocation and unknown-code handling.

### Slice 2 — Public resolve contract

- Public route that resolves a short code to the report destination without leaking DB internals.
- Canonical status: 302/307 to the hub report path or JSON contract for Think to redirect; choose one in Discovery based on host ownership.
- Rate-limit and reliability signals for resolve attempts.
- Preserve old `/brand-visibility/r/<token>` path.

### Slice 3 — URL builder + consumers

- Extend `buildPublicReportUrl` or add `buildPublicReportShortUrl` so email and HubSpot can prefer short links when available.
- Public report endpoint may include `shareShortUrl` when the alias exists, without making the UI derive it.
- Think share widget consumes `shareShortUrl` if present and falls back to `/r/<token>`.
- Add no-leak checks for share copy and report HTML.

### Slice 4 — Runtime proof + documentation

- Staging smoke with a real report snapshot.
- Update ADR/manual/handoff/changelog.
- If backfill is desired, ship a dry-run first and require explicit operator confirmation before apply.

## Out of Scope

- No scoring/model/probe changes.
- No changes to `executeClaimedGraderRun`.
- No external SaaS URL shortener.
- No bulk backfill of historical reports without a separate explicit apply plan.
- No UI redesign; Think only consumes the resulting contract.

## Detailed Spec

Suggested schema shape:

```sql
CREATE TABLE greenhouse_growth.grader_report_short_links (
  short_code text PRIMARY KEY,
  report_id text NOT NULL REFERENCES greenhouse_growth.grader_reports(report_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_source text NOT NULL DEFAULT 'system',
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  CONSTRAINT grader_report_short_code_format CHECK (short_code ~ '^[a-zA-Z0-9]{10,14}$')
);
```

Prefer storing `report_id`, not duplicating the raw report token in the alias table. Resolve server-side by joining to `grader_reports`; the browser should only see the short URL until the final report route needs the token internally or the hub can fetch by short code.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema + primitive) -> Slice 2 (public resolve) -> Slice 3 (consumers) -> Slice 4 (runtime proof/docs).
- Slice 3 must not ship before Slice 2 can resolve real codes and long-link fallback is verified.
- Any historical backfill is after Slice 4 and requires separate operator confirmation.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Codigo corto enumerable o muy corto | public report | low | base62 10-14 chars + random crypto + rate limit | spikes in `short_link_resolve` failures |
| Revoked/expired links siguen resolviendo | public report | medium | explicit 410 contract + tests + resolver checks | `short_link_revoked`/`short_link_expired` mismatches |
| Email/HubSpot pierde fallback al link largo | integrations | medium | helper fallback to `buildPublicReportUrl` long path if no short link | email smoke broken |
| Think crea codigos fuera de Greenhouse | public-site | low | Think only consumes `shareShortUrl`; no persistence in Astro | code review / contract test |
| Raw token aparece en copy shareable | public-site | medium | no-leak test over visible HTML and generated message | no-leak check failure |

### Feature flags / cutover

- Prefer feature flag or env-gated preference such as `GROWTH_AI_VISIBILITY_SHORT_LINKS_ENABLED` default OFF for consumers.
- Schema/primitive can deploy with no traffic.
- Turn ON in staging after resolve smoke; production only after explicit release confirmation.
- Revert: flag OFF -> consumers use long canonical URL; resolver route can remain inert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | leave additive table unused or revert migration before prod if not applied | <10 min | si |
| Slice 2 | disable route via flag/rate-limit fallback; unknown codes 404 | <5 min | si |
| Slice 3 | flag OFF or helper fallback to long URL | <5 min | si |
| Slice 4 | docs revert / no runtime impact | <5 min | si |

### Production verification sequence

1. Create or ensure one short link for a safe public report snapshot.
2. Open the short URL and verify it reaches the same public report.
3. Confirm old long URL still works.
4. Confirm share copy uses short URL and does not show raw long token.
5. Confirm expired/revoked/unknown code contracts return sanitized states.

### Out-of-band coordination required

- Think route `/s/[code]` or Greenhouse redirect route final decision.
- Vercel deploy coordination for Greenhouse and Think if both change.
- Explicit production release confirmation before enabling short-link preference in public share/email.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como se que termino?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse_growth.grader_report_short_links` exists as additive schema with high-entropy code constraint, expiry/revocation fields and usage metadata.
- [ ] `ensureAiVisibilityReportShortLink` is idempotent per report and collision-safe.
- [ ] `resolveAiVisibilityReportShortLink` returns only active, non-expired aliases and never leaks raw DB errors.
- [ ] Public short URL resolves to the same report as `/brand-visibility/r/<token>`.
- [ ] Existing long report URLs continue working.
- [ ] Email, HubSpot and Think can consume a server-provided `shareShortUrl` or short URL builder; all have long-link fallback.
- [ ] Generated share copy contains a short URL and no placeholder tokens.
- [ ] No raw prompts, raw provider answers, full citation URLs, internal findings or long report token appear in visible HTML.
- [ ] Rate-limit/abuse posture and reliability signals are implemented or explicitly deferred with rationale.
- [ ] Docs, lifecycle, handoff and changelog are synchronized.

## Verification

- `pnpm task:lint --task TASK-1330`
- `pnpm ops:lint --changed`
- Unit tests for short-code primitive and URL builder.
- Migration apply/check in local or staging DB.
- Route contract tests for active/unknown/expired/revoked codes.
- Think smoke for `/s/<code>` or equivalent short route after integration.
- No-leak check over report HTML and generated share text.

## Closing Protocol

- [ ] `Lifecycle` synchronized with real status.
- [ ] File moved to correct lifecycle folder.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] `changelog.md` updated if behavior ships.
- [ ] Architecture/manual docs updated if the route/contract becomes canonical.
- [ ] Production rollout state documented; no prod enablement without explicit confirmation.
