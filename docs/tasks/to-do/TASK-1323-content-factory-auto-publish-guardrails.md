# TASK-1323 — AI Content Factory Auto-Publish con Guardrails

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-019`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Domain: `public-site|growth|ai|content`
- Blocked by: `TASK-1123` (Slice C — primer draft real escrito y leído de vuelta por el bridge)
- Branch: `task/TASK-1323-content-factory-auto-publish-guardrails`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar un lane **opt-in y gobernado** donde un draft generado por la AI Content
Factory (TASK-1123) pueda pasar de `private` a `published` en `efeoncepro.com`
**sin intervención humana**, únicamente cuando cruza un conjunto duro de guardrails
(validación `pass`, media resuelta, SEO completo, escaneo `public-data-only`,
guardia anti-duplicado, cost/rate cap) y con el feature flag encendido. Es una
**excepción documentada** al invariante canónico de la Content Factory ("la AI
produce drafts, el humano aprueba el publish"), por lo que requiere ADR propio,
capability dedicada, defense-in-depth de ≥7 capas, audit append-only, reliability
signal y kill-switch.

## Why This Task Exists

TASK-1123 cierra el loop `idea → draft Gutenberg estructurado → escrito como
`private``. El operador pidió explícitamente (2026-07-03) que la automatización
llegue hasta **publish automático con guardrails**, no solo hasta draft. Ese
comportamiento está en el *Out of Scope* declarado de TASK-1123 ("Publicar
contenido en WordPress", "AI autonomous publish") por diseño: publicar en un sitio
público real es alto blast-radius y no debe colarse dentro de la task del Agent
Kit. Esta task es el hogar correcto: aísla el riesgo, le pone su propia capability,
su ADR de excepción y sus guardrails, y la secuencia **después** de que la
escritura de draft esté probada.

El punto no es "que la AI publique cuando quiera". Es que **el auto-publish sea la
consecuencia determinista de cruzar guardrails explícitos y auditables**, con la
libertad semántica en la generación (TASK-1123) y el determinismo en la capa final
de seguridad (esta task).

## Goal

- Definir `public_site.content.publish` como capability dedicada (nunca reusar
  `public_site.admin` ni un rol coarse).
- Escribir el ADR de excepción `GREENHOUSE_PUBLIC_SITE_AUTOPUBLISH_DECISION_V1.md`
  que documenta por qué, cuándo y con qué gates la AI puede publicar sin humano.
- Implementar el command idempotente `autoPublishContentFactoryDraft` que transita
  `private → published` solo vía bridge firmado y solo si TODOS los guardrails pasan.
- Implementar los guardrails como defense-in-depth (≥7 capas independientes).
- Feature flag `PUBLIC_SITE_AUTOPUBLISH_ENABLED` default OFF + shadow mode previo.
- Audit append-only de cada auto-publish + reliability signal + kill-switch + rollback (unpublish).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (state-machine + CHECK + audit; flag default-OFF + shadow + flip)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (registrar el flag nuevo)
- ADR nuevo a crear: `docs/architecture/GREENHOUSE_PUBLIC_SITE_AUTOPUBLISH_DECISION_V1.md`

Reglas obligatorias:

- **Excepción documentada, no default:** el invariante base sigue siendo drafts +
  aprobación humana. Esta task NO lo deroga; abre una compuerta estrecha, opt-in y
  auditada. El ADR debe declararlo explícito.
- **Guardrails duros o no publica:** si CUALQUIER guardrail no pasa, el resultado
  es `blocked_to_human_review`, nunca publish silencioso ni degradado a publish.
- **Solo Greenhouse-owned:** auto-publish solo sobre posts creados por la Content
  Factory con ownership metadata; nunca sobre contenido existente/legacy.
- **Bridge firmado only:** la transición `private → published` pasa por el bridge
  con HMAC + Application Password; nunca WP-CLI crudo ni `_elementor_data`.
- **Full API Parity:** command server-side primero; CLI/UI/Nexa/MCP son consumers.
- **No secretos en prompts/docs/logs/final answers.**

## Normative Docs

- `.claude/skills/efeonce-public-site-wordpress/SKILL.md` + `references/content-factory-gutenberg.md`
- `.claude/skills/greenhouse-secret-hygiene/SKILL.md`
- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/tasks/in-progress/TASK-1123-greenhouse-ai-content-factory-agent-kit.md`
- `src/lib/public-site/content-factory/` (primitives base a reutilizar)
- `src/lib/public-site/bridge-signing.ts`

## Dependencies & Impact

### Depends on

- **TASK-1123 Slice C** — el bridge desplegado y el primer `post_draft_gutenberg`
  real escrito + leído de vuelta. Sin esto, auto-publish no tiene base probada.
- **TASK-1116** — `greenhouse-wp-bridge` desplegado con endpoint de publish/status.
- Secret refs: `PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF`,
  `PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF`.
- Entitlements: `capabilities_registry` + `entitlements-catalog.ts` + `runtime.ts`.

### Blocks / Impacts

- Primer publish autónomo real en `efeoncepro.com`.
- Futuro lane de auto-publish para landings (fuera de scope aquí — solo posts).
- Reporting de attribution HubSpot/UTM del contenido auto-publicado.

### Files owned

- `docs/architecture/GREENHOUSE_PUBLIC_SITE_AUTOPUBLISH_DECISION_V1.md` (new)
- `src/lib/public-site/content-factory/auto-publish.ts` (new)
- `src/lib/public-site/content-factory/publish-guardrails.ts` (new)
- `src/lib/reliability/queries/public-site-autopublish-*.ts` (new)
- `scripts/public-website/content-factory-auto-publish.ts` (new)
- `migrations/<ts>_task-1323-autopublish-audit-and-capability.sql` (new)
- `wp-content/plugins/greenhouse-wp-bridge/**` (publish/status endpoint) en `/Users/jreye/Documents/efeonce-public-site-runtime`

## Current Repo State

### Already exists

- Loop completo hasta draft (TASK-1123): planner, validator, composition profile,
  smoke-plan, bridge signing HMAC, contratos `contentFactory*.v1`.
- Bridge draft-only foundation con status `draft|private` y writes gated por
  `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED`.
- Patrón canónico flag default-OFF + shadow + flip (`GREENHOUSE_CANONICAL_PATTERNS_V1.md`).
- Patrón audit append-only + reliability signal (TASK-700/765/773).

### Gap

- No existe capability `public_site.content.publish`.
- No existe command que transite `private → published` (el bridge hoy es draft-only).
- No existen los guardrails de publish (validación pass, media resuelta, public-data scan, anti-duplicado, cost cap).
- No existe audit table ni reliability signal de auto-publish.
- No existe el ADR de excepción.
- No existe kill-switch ni shadow mode.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (el agente que toma la task lo llena)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ADR de excepción + capability

- Escribir `GREENHOUSE_PUBLIC_SITE_AUTOPUBLISH_DECISION_V1.md`: por qué se abre la
  compuerta, qué guardrails la gobiernan, quién puede activarla, rollback y kill-switch.
- Seedear capability `public_site.content.publish` en `capabilities_registry`
  (migración) + `entitlements-catalog.ts` + grant a ≥1 rol real en `runtime.ts` +
  coverage test (regla capability⇒grant del CLAUDE.md).

### Slice 2 — Guardrails primitive

- `publish-guardrails.ts`: función pura `evaluatePublishGuardrails(draft, context)`
  → `{ decision: 'allow' | 'block', findings: [...] }`. Guardrails:
  1. `validation.status === 'pass'` (warning/block ⇒ block).
  2. Media resuelta: sin slots de media vacíos, sin IDs inventados.
  3. SEO completo: title, description, slug kebab-case, indexPolicy explícito.
  4. `public-data-only` scan: sin dato interno/cliente/PII en el copy.
  5. Anti-duplicado: similaridad vs posts existentes bajo umbral.
  6. Cost/rate cap: máximo N auto-publishes por período.
- Tests de propiedad: cada guardrail rechaza su caso de falla.

### Slice 3 — Publish command + bridge endpoint

- `auto-publish.ts`: command idempotente `autoPublishContentFactoryDraft({ manifestId })`
  que (a) corre guardrails, (b) si `allow` llama al bridge `POST .../publish`
  firmado que transita `private → published`, (c) hace readback del status, (d)
  escribe audit row. Idempotente por `manifestId` (re-run no re-publica).
- Runtime: endpoint de publish/status en `greenhouse-wp-bridge` con revalidación
  server-side de ownership + status actual antes de publicar.
- Flag `PUBLIC_SITE_AUTOPUBLISH_ENABLED` default OFF; con OFF el command corre en
  **shadow mode** (evalúa guardrails, escribe "would-publish" al audit, NO publica).

### Slice 4 — Audit + reliability + kill-switch

- Migración: tabla append-only `greenhouse_core.content_autopublish_audit` con
  anti-UPDATE/anti-DELETE trigger (manifestId, decision, guardrail findings, status, actor, timestamp).
- Reliability signals: `public_site.autopublish.failed` (steady=0) y
  `public_site.autopublish.published_count` (visibilidad de volumen). Wire a `getReliabilityOverview`.
- Kill-switch: apagar `PUBLIC_SITE_AUTOPUBLISH_ENABLED` detiene todo publish sin deploy.
- Rollback command: `unpublishContentFactoryPost({ manifestId })` (published → private).

### Slice 5 — Rollout escalonado + evidencia

- Fase shadow: N ciclos con flag OFF, revisar "would-publish" audit vs juicio humano.
- Fase disposable: flag ON solo para slug `greenhouse-autopublish-smoke-*`, publicar
  y despublicar (readback + rollback verificados).
- Fase real: flag ON para posts reales solo tras sign-off del operador.
- Registrar el flag en `FEATURE_FLAG_STATE_LEDGER.md` (gate `pnpm docs:closure-check`).

## Out of Scope

- Auto-publish de landings Elementor/Ohio (solo posts Gutenberg aquí).
- Auto-publish de contenido existente/legacy (solo Greenhouse-owned drafts nuevos).
- UI de portal para configurar guardrails (V1 es command + flag; UI = follow-up).
- Cambiar el invariante base de la Content Factory (drafts + aprobación humana) —
  esta task abre una excepción opt-in, no lo deroga.
- Publicar en cualquier destino distinto de `efeoncepro.com`.

## Detailed Spec

### Contrato del command

```ts
type AutoPublishResultV1 = {
  contractVersion: 'contentFactoryAutoPublish.v1'
  manifestId: string
  decision: 'published' | 'blocked_to_human_review' | 'shadow_would_publish'
  guardrails: Array<{ code: string; status: 'pass' | 'block'; message: string }>
  publishedUrl?: string
  auditId: string
}
```

### Guardrails como defense-in-depth (mapeo a 4-pilar)

| Capa | Guardrail | Pilar |
|---|---|---|
| DB | CHECK status transitions + audit append-only trigger | Robustness |
| App | `evaluatePublishGuardrails` (6 checks) | Safety |
| App | Capability `public_site.content.publish` | Safety |
| App | Idempotencia por `manifestId` | Robustness |
| Flag | `PUBLIC_SITE_AUTOPUBLISH_ENABLED` default OFF + shadow | Safety |
| Signal | `public_site.autopublish.failed` steady=0 | Resilience |
| Audit | `content_autopublish_audit` append-only | Resilience |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ADR + capability) → Slice 2 (guardrails) → Slice 3 (command + bridge, shadow) → Slice 4 (audit + signal + kill-switch) → Slice 5 (rollout escalonado).
- Ningún publish real (flag ON) antes de completar Slices 1–4 + fase shadow verificada.
- TASK-1123 Slice C (draft write probado) es precondición dura de arrancar Slice 3.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigation | Signal |
|---|---|---|---|---|
| AI publica contenido erróneo en sitio público | WordPress público | media | guardrails duros + shadow mode + rollback unpublish | `autopublish.failed`, revisión audit |
| Filtración de dato interno/cliente en copy público | Security/brand | media | guardrail `public-data-only` scan + regla brief public-data-only | guardrail block, audit |
| Publish duplicado/idéntico | SEO/brand | media | guardrail anti-duplicado + idempotencia manifestId | guardrail block |
| Runaway publish (loop genera y publica en masa) | WordPress/cost | baja | cost/rate cap + kill-switch flag | `published_count`, cap alert |
| Bridge publica pero readback falla (estado inconsistente) | Integración | media | readback obligatorio + degradación honesta + audit | `autopublish.failed` |
| Excepción se vuelve default sin control | Governance | media | ADR explícito + flag default OFF + capability dedicada | review docs |

### Feature flags / cutover

- `PUBLIC_SITE_AUTOPUBLISH_ENABLED` — default OFF. OFF = shadow mode (evalúa, no publica).
- `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED` debe estar ON para publish real.
- Cutover: shadow → disposable slug → real, cada fase con sign-off.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert ADR/migration capability (append-only: deprecar capability, no borrar) | <15 min | si |
| Slice 2 | remove guardrails primitive (no consumer aún) | <10 min | si |
| Slice 3 | flag OFF (shadow) + revert command/bridge endpoint | <15 min | si |
| Slice 4 | flag OFF; audit table queda (append-only, no se borra) | <10 min | si |
| Slice 5 | flag OFF (kill-switch) + `unpublishContentFactoryPost` de lo publicado | <15 min | si |

### Production verification sequence

1. `pnpm exec tsc --noEmit` + `pnpm exec vitest run src/lib/public-site/content-factory`.
2. Migración aplicada verificada por `information_schema` (audit table + trigger + capability).
3. Coverage test capability⇒grant verde.
4. Fase shadow: audit "would-publish" coincide con juicio humano en N ciclos.
5. Fase disposable: publish + readback + unpublish de slug disposable, sin residuo.
6. Solo tras sign-off: flag ON para posts reales.

### Out-of-band coordination required

- Aprobación explícita del operador antes de flag ON real.
- Confirmación de bridge publish endpoint desplegado (TASK-1116).
- Ventana de write mínima para las fases disposable/real.

## Backend/Data Contract

- **Rigor:** `backend-critical` (write path a sitio público real, auto-publish).
- **Source of truth:** el post en WordPress (`efeoncepro.com`) es SoT del contenido
  publicado; `content_autopublish_audit` (PG) es SoT del historial de decisiones de
  auto-publish. El `manifestId` liga draft ↔ audit ↔ post.
- **Contract surface:** command `autoPublishContentFactoryDraft` +
  `unpublishContentFactoryPost` (Product API interna); bridge `POST .../publish`
  y `GET .../status` (integración). CLI y futura UI/Nexa son consumers.
- **Data invariants:** solo `private → published` (nunca skip de estados);
  auto-publish solo sobre Greenhouse-owned con ownership metadata; audit append-only;
  guardrails `allow` obligatorio para publicar; el publish **preserva el `post_author`
  del draft** (requisito del operador: autor visible = usuario WordPress de Julio
  Reyes, no el usuario de servicio del bridge — ver TASK-1123 §"Autoría del post").
  El publish NUNCA reescribe `post_author` al usuario de servicio.
- **Tenant/access boundary:** capability `public_site.content.publish`; no cross-tenant
  (público, single-site); server-only.
- **Idempotency/concurrency:** idempotente por `manifestId`; re-run con post ya
  `published` es no-op + audit "already_published"; lock por `manifestId` para evitar
  doble publish concurrente.
- **Migration/backfill/rollback:** migración additiva (audit table + trigger +
  capability seed); sin backfill; rollback por flag OFF + unpublish command.
- **Sensitive data/error posture:** `redactErrorForResponse` en respuestas; nunca
  HMAC/Application Password en logs; `captureWithDomain(err, 'integrations.wordpress'|'content', ...)`.
- **Audit/signal posture:** `content_autopublish_audit` append-only con
  anti-UPDATE/DELETE trigger; signals `public_site.autopublish.failed` (steady=0) y
  `public_site.autopublish.published_count`.
- **Runtime evidence:** shadow-mode audit rows + disposable publish/unpublish readback
  antes de cerrar; nunca "tests verdes" como única prueba de un write path público.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR `GREENHOUSE_PUBLIC_SITE_AUTOPUBLISH_DECISION_V1.md` existe y declara la excepción, guardrails, activación, rollback y kill-switch.
- [ ] Capability `public_site.content.publish` existe en registry + catálogo TS + grant a ≥1 rol real + coverage test verde.
- [ ] `evaluatePublishGuardrails` implementa los 6 guardrails con tests de falla por cada uno.
- [ ] `autoPublishContentFactoryDraft` es idempotente por `manifestId` y solo publica con guardrails `allow`.
- [ ] Con flag OFF, el command corre en shadow mode y NO publica.
- [ ] Tabla `content_autopublish_audit` es append-only (anti-UPDATE/DELETE trigger verificado por `information_schema`/prueba).
- [ ] Signals `public_site.autopublish.failed` y `published_count` visibles en `/admin/operations`.
- [ ] Kill-switch (flag OFF) detiene todo publish sin deploy; `unpublishContentFactoryPost` revierte published → private.
- [ ] Flag registrado en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Evidencia de fase shadow + disposable publish/unpublish adjunta antes de flag ON real.

## Verification

- `pnpm ops:lint --changed`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/public-site/content-factory`
- `pnpm docs:closure-check` (incluye feature-flags-audit --strict)
- `pnpm migrate:up` + verificación DDL por `information_schema`
- `pnpm public-website:content-factory:auto-publish -- --shadow` (evidencia shadow)

## Closing Protocol

- Mover a `complete/`, `Lifecycle: complete`, actualizar `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, `EPIC-019`.
- Actualizar: skills `efeonce-public-site-wordpress` (Codex + Claude), `project_context.md`, `Handoff.md`, `changelog.md`, `FEATURE_FLAG_STATE_LEDGER.md`.
- Invocar `greenhouse-documentation-governor` + `greenhouse-qa-release-auditor`.
- Adjuntar evidencia de shadow + disposable + estado del flag.

## Follow-ups / Open Questions

1. ¿El grant de `public_site.content.publish` va a `efeonce_admin` solo, o también a un rol marketing dedicado?
2. ¿Umbral de similaridad del guardrail anti-duplicado — heurístico o embedding-based?
3. ¿El cost/rate cap se define por período fijo o rolling window?
4. ¿Auto-publish notifica a un canal (Teams/email) en cada publish real, para trazabilidad humana post-hoc?
5. ¿El scan `public-data-only` es reglas + LLM, o solo reglas en V1?
